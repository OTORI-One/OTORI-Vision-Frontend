use bitcoin::{
    Transaction, 
    TxOut, 
    ScriptBuf,
    absolute::LockTime,
    transaction::Version,
    Amount,
};
use arch_program::program_error::ProgramError;
use crate::bitcoin::utxo::{UtxoMeta, UtxoStatus};
use crate::bitcoin::cache::{UtxoCache, UtxoCacheConfig};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[cfg(all(feature = "client", not(target_arch = "wasm32")))]
use {
    reqwest::{Client, StatusCode},
    bitcoincore_rpc::RpcApi,
};

#[derive(Error, Debug)]
pub enum BitcoinRpcError {
    #[cfg(all(feature = "client", not(target_arch = "wasm32")))]
    #[error("HTTP client error: {0}")]
    HttpClient(#[from] reqwest::Error),
    #[error("Bitcoin RPC error: {0}")]
    RpcError(String),
    #[error("Invalid response format")]
    InvalidResponse,
    #[error("UTXO not found")]
    UtxoNotFound,
    #[error("RPC connection failed: {0}")]
    ConnectionFailed(String),
    #[error("Transaction not found: {0}")]
    TxNotFound(String),
    #[error("Insufficient confirmations: required {required}, got {actual}")]
    InsufficientConfirmations { required: u32, actual: u32 },
}

impl From<BitcoinRpcError> for ProgramError {
    fn from(e: BitcoinRpcError) -> Self {
        ProgramError::Custom(e.to_string())
    }
}

#[derive(Debug, Clone)]
pub struct BitcoinRpcConfig {
    pub bitcoin_endpoint: String,
    pub electrs_endpoint: String,
    pub auth: Option<(String, String)>,
    pub network: String,
    pub min_confirmations: u32,
}

impl Default for BitcoinRpcConfig {
    fn default() -> Self {
        Self {
            bitcoin_endpoint: "http://127.0.0.1:18332".to_string(),
            electrs_endpoint: "http://127.0.0.1:3002".to_string(),
            auth: Some(("bitcoin".to_string(), "bitcoinpass".to_string())),
            network: "testnet4".to_string(),
            min_confirmations: 1,
        }
    }
}

impl BitcoinRpcConfig {
    pub fn testnet4() -> Self {
        Self {
            bitcoin_endpoint: "http://127.0.0.1:18332".to_string(),
            electrs_endpoint: "http://127.0.0.1:3002".to_string(),
            auth: Some(("bitcoin".to_string(), "bitcoinpass".to_string())),
            network: "testnet4".to_string(),
            min_confirmations: 1,
        }
    }

    pub fn regtest() -> Self {
        Self {
            bitcoin_endpoint: "http://127.0.0.1:18443".to_string(),
            electrs_endpoint: "http://127.0.0.1:3002".to_string(),
            auth: Some(("bitcoin".to_string(), "bitcoinpass".to_string())),
            network: "regtest".to_string(),
            min_confirmations: 1,
        }
    }
}

#[derive(Debug, Deserialize)]
struct ElectrsTransaction {
    txid: String,
    confirmations: u32,
    vout: Vec<ElectrsOutput>,
}

#[derive(Debug, Deserialize)]
struct ElectrsOutput {
    value: u64,
    scriptpubkey: String,
}

#[derive(Debug, Clone)]
pub struct BitcoinRpcClient {
    config: BitcoinRpcConfig,
    #[cfg(all(feature = "client", not(target_arch = "wasm32")))]
    http_client: Client,
    cache: UtxoCache,
}

impl BitcoinRpcClient {
    pub fn new(config: BitcoinRpcConfig) -> Self {
        #[cfg(all(feature = "client", not(target_arch = "wasm32")))]
        let http_client = Client::new();
        
        Self {
            config,
            #[cfg(all(feature = "client", not(target_arch = "wasm32")))]
            http_client,
            cache: UtxoCache::new(UtxoCacheConfig::default()),
        }
    }

    pub fn with_cache_config(config: BitcoinRpcConfig, cache_config: UtxoCacheConfig) -> Self {
        #[cfg(all(feature = "client", not(target_arch = "wasm32")))]
        let http_client = Client::new();
        
        Self {
            config,
            #[cfg(all(feature = "client", not(target_arch = "wasm32")))]
            http_client,
            cache: UtxoCache::new(cache_config),
        }
    }

    #[cfg(all(feature = "client", not(target_arch = "wasm32")))]
    pub async fn get_transaction(&self, txid: &str) -> Result<Transaction, BitcoinRpcError> {
        let url = format!("{}/tx/{}", self.config.electrs_endpoint, txid);
        
        let response = self.http_client
            .get(&url)
            .send()
            .await
            .map_err(|e| BitcoinRpcError::ConnectionFailed(e.to_string()))?;
            
        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Err(BitcoinRpcError::TxNotFound(txid.to_string()));
        }
        
        let tx: ElectrsTransaction = response
            .json()
            .await
            .map_err(|e| BitcoinRpcError::InvalidResponse)?;
            
        // Convert Electrs transaction to arch_bitcoin::Transaction
        Ok(Transaction {
            version: Version(2),
            lock_time: LockTime::ZERO,
            input: vec![], // We don't need inputs for our use case
            output: tx.vout.into_iter().map(|out| TxOut {
                value: Amount::from_sat(out.value),
                script_pubkey: ScriptBuf::from_bytes(&hex::decode(&out.scriptpubkey)
                    .map_err(|_| BitcoinRpcError::InvalidResponse)?),
            }).collect(),
        })
    }

    #[cfg(all(feature = "client", not(target_arch = "wasm32")))]
    pub async fn get_utxo_status(&self, utxo: &UtxoMeta) -> Result<UtxoStatus, BitcoinRpcError> {
        // Try to get from cache first
        if let Ok(status) = self.cache.get_utxo_status(self, utxo).await {
            return Ok(status);
        }
        
        // If not in cache or needs refresh, fetch from RPC
        let url = format!("{}/tx/{}/outspend/{}", self.config.electrs_endpoint, utxo.txid, utxo.vout);
        
        let response = self.http_client
            .get(&url)
            .send()
            .await
            .map_err(|e| BitcoinRpcError::ConnectionFailed(e.to_string()))?;
            
        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(UtxoStatus::Invalid);
        }
        
        #[derive(Deserialize)]
        struct OutspendStatus {
            spent: bool,
            confirmations: Option<u32>,
        }
        
        let status: OutspendStatus = response
            .json()
            .await
            .map_err(|e| BitcoinRpcError::InvalidResponse)?;
            
        let utxo_status = if status.spent {
            UtxoStatus::Spent
        } else {
            match status.confirmations {
                Some(conf) if conf >= self.config.min_confirmations => UtxoStatus::Active,
                Some(_) | None => UtxoStatus::Pending,
            }
        };

        Ok(utxo_status)
    }

    #[cfg(all(feature = "client", not(target_arch = "wasm32")))]
    pub async fn get_confirmations(&self, txid: &str) -> Result<u32, BitcoinRpcError> {
        let url = format!("{}/tx/{}/status", self.config.electrs_endpoint, txid);
        
        let response = self.http_client
            .get(&url)
            .send()
            .await
            .map_err(|e| BitcoinRpcError::ConnectionFailed(e.to_string()))?;
            
        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(0);
        }
        
        #[derive(Deserialize)]
        struct TxStatus {
            confirmed: bool,
            block_height: Option<u32>,
        }
        
        let status: TxStatus = response
            .json()
            .await
            .map_err(|e| BitcoinRpcError::InvalidResponse)?;
            
        if !status.confirmed {
            Ok(0)
        } else {
            // Get current block height from Bitcoin Core
            let url = format!("{}/blocks/tip/height", self.config.electrs_endpoint);
            let current_height: u32 = self.http_client
                .get(&url)
                .send()
                .await
                .map_err(|e| BitcoinRpcError::ConnectionFailed(e.to_string()))?
                .json()
                .await
                .map_err(|e| BitcoinRpcError::InvalidResponse)?;
                
            Ok(current_height - status.block_height.unwrap_or(current_height) + 1)
        }
    }

    #[cfg(all(feature = "client", not(target_arch = "wasm32")))]
    pub async fn validate_utxo(&self, utxo: &UtxoMeta) -> Result<(), BitcoinRpcError> {
        let status = self.get_utxo_status(utxo).await?;
        
        match status {
            UtxoStatus::Active => Ok(()),
            UtxoStatus::Pending => {
                let confirmations = self.get_confirmations(&utxo.txid).await?;
                Err(BitcoinRpcError::InsufficientConfirmations {
                    required: self.config.min_confirmations,
                    actual: confirmations,
                })
            },
            UtxoStatus::Spent => Err(BitcoinRpcError::RpcError("UTXO is spent".to_string())),
            UtxoStatus::Invalid => Err(BitcoinRpcError::RpcError("Invalid UTXO".to_string())),
        }
    }

    #[cfg(all(feature = "client", not(target_arch = "wasm32")))]
    pub async fn broadcast_transaction(&self, tx: &Transaction) -> Result<String, BitcoinRpcError> {
        let tx_hex = hex::encode(tx.serialize().as_ref());
        let url = format!("{}/tx", self.config.electrs_endpoint);
        
        let response = self.http_client
            .post(&url)
            .body(tx_hex)
            .send()
            .await
            .map_err(|e| BitcoinRpcError::ConnectionFailed(e.to_string()))?;
            
        if !response.status().is_success() {
            return Err(BitcoinRpcError::RpcError("Failed to broadcast transaction".to_string()));
        }
        
        let txid: String = response
            .text()
            .await
            .map_err(|_| BitcoinRpcError::RpcError("Invalid response format".to_string()))?;
            
        Ok(txid)
    }

    /// Get cache statistics
    #[cfg(all(feature = "client", not(target_arch = "wasm32")))]
    pub async fn get_cache_stats(&self) -> CacheStats {
        self.cache.get_stats().await
    }

    /// Manually trigger cache cleanup
    #[cfg(all(feature = "client", not(target_arch = "wasm32")))]
    pub async fn cleanup_cache(&self) {
        self.cache.cleanup().await;
    }

    /// Handle reorg by invalidating affected cache entries
    #[cfg(all(feature = "client", not(target_arch = "wasm32")))]
    pub async fn handle_reorg(&self, height: u32) {
        self.cache.handle_reorg(height).await;
    }
} 