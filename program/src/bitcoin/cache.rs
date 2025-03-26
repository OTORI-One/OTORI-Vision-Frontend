use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};
use crate::bitcoin::utxo::{UtxoMeta, UtxoStatus};
use crate::bitcoin::rpc::{BitcoinRpcClient, BitcoinRpcError};

/// Configuration for the UTXO cache
#[derive(Debug, Clone)]
pub struct UtxoCacheConfig {
    /// Maximum number of UTXOs to cache
    pub max_size: usize,
    /// Time after which a cached entry should be refreshed
    pub refresh_interval: Duration,
    /// Maximum time to keep invalid/spent UTXOs in cache
    pub invalid_ttl: Duration,
}

impl Default for UtxoCacheConfig {
    fn default() -> Self {
        Self {
            max_size: 1000,
            refresh_interval: Duration::from_secs(60),
            invalid_ttl: Duration::from_secs(3600),
        }
    }
}

/// Cached UTXO entry containing metadata and timing information
#[derive(Debug, Clone)]
struct CacheEntry {
    utxo: UtxoMeta,
    status: UtxoStatus,
    last_updated: SystemTime,
    last_accessed: SystemTime,
}

impl CacheEntry {
    fn new(utxo: UtxoMeta, status: UtxoStatus) -> Self {
        Self {
            utxo,
            status,
            last_updated: SystemTime::now(),
            last_accessed: SystemTime::now(),
        }
    }

    fn needs_refresh(&self, config: &UtxoCacheConfig) -> bool {
        let now = SystemTime::now();
        match self.status {
            UtxoStatus::Active | UtxoStatus::Pending => {
                now.duration_since(self.last_updated).unwrap() >= config.refresh_interval
            }
            UtxoStatus::Invalid | UtxoStatus::Spent => {
                now.duration_since(self.last_updated).unwrap() >= config.invalid_ttl
            }
        }
    }

    fn access(&mut self) {
        self.last_accessed = SystemTime::now();
    }

    fn update(&mut self, status: UtxoStatus) {
        self.status = status;
        self.last_updated = SystemTime::now();
    }
}

#[derive(Debug)]
pub struct UtxoCache {
    config: UtxoCacheConfig,
    cache: Arc<Mutex<HashMap<[u8; 32], CacheEntry>>>,
}

impl Default for UtxoCache {
    fn default() -> Self {
        Self {
            config: UtxoCacheConfig::default(),
            cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Clone for UtxoCache {
    fn clone(&self) -> Self {
        Self::new(self.config.clone())
    }
}

impl UtxoCache {
    pub fn new(config: UtxoCacheConfig) -> Self {
        Self {
            config,
            cache: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Get UTXO status from cache, refreshing from RPC if needed
    pub async fn get_utxo_status(
        &self,
        rpc: &BitcoinRpcClient,
        utxo: &UtxoMeta,
    ) -> Result<UtxoStatus, BitcoinRpcError> {
        let mut cache = self.cache.lock().unwrap();
        
        // Convert txid string to bytes for HashMap key
        let key = utxo.txid_to_bytes()
            .map_err(|_| BitcoinRpcError::InvalidResponse("Invalid txid format".to_string()))?;
        
        // Try to get from cache first
        if let Some(entry) = cache.get_mut(&key) {
            entry.access();
            
            // Return cached value if it doesn't need refresh
            if !entry.needs_refresh(&self.config) {
                return Ok(entry.status);
            }
        }
        
        // Fetch fresh status from RPC
        let status = rpc.get_utxo_status(utxo).await?;
        
        // Update cache
        if cache.len() >= self.config.max_size {
            // Remove oldest entry if at capacity
            if let Some(oldest_key) = cache.iter()
                .min_by_key(|(_, entry)| entry.last_accessed)
                .map(|(k, _)| *k)
            {
                cache.remove(&oldest_key);
            }
        }
        
        cache.insert(key, CacheEntry::new(utxo.clone(), status));
        Ok(status)
    }

    /// Invalidate cache entries affected by a reorg
    pub async fn handle_reorg(&self, _height: u32) {
        let mut cache = self.cache.lock().unwrap();
        cache.clear();
    }

    /// Remove spent or invalid UTXOs that have exceeded their TTL
    pub async fn cleanup(&self) {
        let mut cache = self.cache.lock().unwrap();
        let config = &self.config;
        
        let to_remove: Vec<[u8; 32]> = cache
            .iter()
            .filter(|(_, entry)| {
                matches!(entry.status, UtxoStatus::Spent | UtxoStatus::Invalid) 
                    && SystemTime::now().duration_since(entry.last_updated).unwrap() >= config.invalid_ttl
            })
            .map(|(key, _)| *key)
            .collect();
            
        for key in to_remove {
            cache.remove(&key);
        }
    }

    /// Get cache statistics
    pub async fn get_stats(&self) -> CacheStats {
        let cache = self.cache.lock().unwrap();
        CacheStats {
            total_entries: cache.len(),
            hits: 0, // TODO: Implement hit/miss tracking
            misses: 0,
        }
    }
}

/// Statistics about the cache
#[derive(Debug, Clone, Copy)]
pub struct CacheStats {
    pub total_entries: usize,
    pub hits: usize,
    pub misses: usize,
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;
    use std::time::Duration;
    
    #[tokio::test]
    async fn test_cache_basic_operations() {
        let config = UtxoCacheConfig {
            max_size: 2,
            refresh_interval: Duration::from_secs(1),
            invalid_ttl: Duration::from_secs(2),
        };
        
        let cache = UtxoCache::new(config);
        
        // Create test UTXOs with valid hex strings
        let utxo1 = UtxoMeta::new(
            "a000000000000000000000000000000000000000000000000000000000000000".to_string(),
            0,
            1000,
        );
        
        let utxo2 = UtxoMeta::new(
            "b000000000000000000000000000000000000000000000000000000000000000".to_string(),
            1,
            2000,
        );
        
        // Add to cache using txid_to_bytes()
        let key1 = utxo1.txid_to_bytes().unwrap();
        cache.cache.lock().unwrap().insert(
            key1,
            CacheEntry::new(utxo1.clone(), UtxoStatus::Active),
        );
        
        let key2 = utxo2.txid_to_bytes().unwrap();
        cache.cache.lock().unwrap().insert(
            key2,
            CacheEntry::new(utxo2.clone(), UtxoStatus::Pending),
        );
        
        // Verify cache size
        let stats = cache.get_stats().await;
        assert_eq!(stats.total_entries, 2);
    }

    #[tokio::test]
    async fn test_cache_eviction() {
        let config = UtxoCacheConfig {
            max_size: 10,
            refresh_interval: Duration::from_millis(50),
            invalid_ttl: Duration::from_millis(100),
        };
        
        let cache = UtxoCache::new(config);
        
        // Add spent and invalid UTXOs with valid hex strings
        let utxo1 = UtxoMeta::new(
            "c000000000000000000000000000000000000000000000000000000000000000".to_string(),
            0,
            1000,
        );
        
        let utxo2 = UtxoMeta::new(
            "d000000000000000000000000000000000000000000000000000000000000000".to_string(),
            1,
            2000,
        );
        
        let key1 = utxo1.txid_to_bytes().unwrap();
        cache.cache.lock().unwrap().insert(
            key1,
            CacheEntry::new(utxo1.clone(), UtxoStatus::Spent),
        );
        
        let key2 = utxo2.txid_to_bytes().unwrap();
        cache.cache.lock().unwrap().insert(
            key2,
            CacheEntry::new(utxo2.clone(), UtxoStatus::Invalid),
        );
        
        // Wait for TTL to expire
        tokio::time::sleep(Duration::from_millis(150)).await;
        
        // Run cleanup
        cache.cleanup().await;
        
        // Verify entries were removed
        let stats = cache.get_stats().await;
        assert_eq!(stats.total_entries, 0);
    }
} 