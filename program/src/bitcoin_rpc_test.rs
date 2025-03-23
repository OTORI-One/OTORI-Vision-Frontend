#![cfg(all(test, not(target_arch = "wasm32")))]

use bitcoin::{
    Transaction, 
    TxIn, 
    TxOut, 
    Script,
    absolute::LockTime,
    transaction::Version,
    Amount,
    Sequence,
};
use crate::bitcoin::utxo::{UtxoMeta, UtxoStatus};
use tokio::test;
use std::num::NonZeroUsize;

use crate::bitcoin_rpc::{BitcoinRpcClient, BitcoinRpcConfig, BitcoinRpcError};

// Test configuration using regtest environment
fn get_test_config() -> BitcoinRpcConfig {
    BitcoinRpcConfig {
        bitcoin_endpoint: "http://127.0.0.1:18443".to_string(),
        electrs_endpoint: "http://127.0.0.1:3002".to_string(),
        auth: Some(("bitcoin".to_string(), "bitcoinpass".to_string())),
        network: "regtest".to_string(),
        min_confirmations: 1,
    }
}

async fn setup_test_client() -> BitcoinRpcClient {
    BitcoinRpcClient::new(get_test_config())
}

async fn generate_blocks(count: u32) -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let auth = base64::encode("bitcoin:bitcoinpass".as_bytes());
    
    let response = client
        .post("http://127.0.0.1:18443")
        .header("Authorization", format!("Basic {}", auth))
        .json(&serde_json::json!({
            "jsonrpc": "2.0",
            "id": "test",
            "method": "generatetoaddress",
            "params": [
                count,
                "bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080" // Standard regtest address
            ]
        }))
        .send()
        .await?;
        
    if !response.status().is_success() {
        return Err("Failed to generate blocks".into());
    }
    
    Ok(())
}

#[tokio::test]
async fn test_get_transaction() {
    let client = setup_test_client().await;
    
    // Create a test transaction
    let tx = Transaction {
        version: Version(2),
        lock_time: LockTime::ZERO,
        input: vec![TxIn {
            previous_output: Default::default(),
            script_sig: Script::new(),
            sequence: Sequence::MAX,
            witness: vec![],
        }],
        output: vec![TxOut {
            value: Amount::from_sat(100000),
            script_pubkey: Script::new(),
        }],
    };
    
    // Broadcast transaction
    let txid = client.broadcast_transaction(&tx).await.unwrap();
    
    // Test fetching the transaction
    let result = client.get_transaction(&txid).await;
    assert!(result.is_ok());
    
    // Test non-existent transaction
    let result = client.get_transaction("nonexistent_tx").await;
    assert!(matches!(result, Err(BitcoinRpcError::TxNotFound(_))));
}

#[tokio::test]
async fn test_utxo_validation() {
    let client = setup_test_client().await;
    
    // Create and broadcast a test transaction
    let tx = Transaction {
        version: Version(2),
        lock_time: LockTime::ZERO,
        input: vec![TxIn {
            previous_output: Default::default(),
            script_sig: Script::new(),
            sequence: Sequence::MAX,
            witness: vec![],
        }],
        output: vec![TxOut {
            value: Amount::from_sat(100000),
            script_pubkey: Script::new(),
        }],
    };
    
    let txid = client.broadcast_transaction(&tx).await.unwrap();
    
    let test_utxo = UtxoMeta {
        txid: txid.clone(),
        vout: 0,
        amount: 100000,
        script_pubkey: "test_script".to_string(),
        confirmations: 0,
    };
    
    // Test unconfirmed UTXO
    let status = client.get_utxo_status(&test_utxo).await.unwrap();
    assert_eq!(status, UtxoStatus::Pending);
    
    // Generate a block to confirm the transaction
    generate_blocks(1).await.unwrap();
    
    // Test confirmed UTXO
    let status = client.get_utxo_status(&test_utxo).await.unwrap();
    assert_eq!(status, UtxoStatus::Active);
}

#[tokio::test]
async fn test_confirmations() {
    let client = setup_test_client().await;
    
    // Create and broadcast a test transaction
    let tx = Transaction {
        version: Version(2),
        lock_time: LockTime::ZERO,
        input: vec![TxIn {
            previous_output: Default::default(),
            script_sig: Script::new(),
            sequence: Sequence::MAX,
            witness: vec![],
        }],
        output: vec![TxOut {
            value: Amount::from_sat(100000),
            script_pubkey: Script::new(),
        }],
    };
    
    let txid = client.broadcast_transaction(&tx).await.unwrap();
    
    // Test unconfirmed transaction
    let confirmations = client.get_confirmations(&txid).await.unwrap();
    assert_eq!(confirmations, 0);
    
    // Generate blocks
    generate_blocks(3).await.unwrap();
    
    // Test confirmed transaction
    let confirmations = client.get_confirmations(&txid).await.unwrap();
    assert!(confirmations >= 3);
}

#[tokio::test]
async fn test_error_handling() {
    let client = setup_test_client().await;
    
    // Test UTXO validation with insufficient confirmations
    let test_utxo = UtxoMeta {
        txid: "unconfirmed_tx".to_string(),
        vout: 0,
        amount: 100000,
        script_pubkey: "test_script".to_string(),
        confirmations: 0,
    };
    
    let result = client.validate_utxo(&test_utxo).await;
    assert!(matches!(result, Err(BitcoinRpcError::InsufficientConfirmations { .. })));
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::bitcoin::cache::UtxoCacheConfig;
    use std::time::Duration;

    #[tokio::test]
    async fn test_cached_utxo_status() {
        let config = BitcoinRpcConfig::default();
        let cache_config = UtxoCacheConfig {
            max_size: NonZeroUsize::new(100).unwrap(),
            refresh_interval: Duration::from_secs(1),
            invalid_ttl: Duration::from_secs(2),
        };
        
        let client = BitcoinRpcClient::with_cache_config(config, cache_config);
        
        // Create test UTXO
        let utxo = UtxoMeta::new(
            "test_txid_for_cache".to_string(),
            0,
            10000,
        );
        
        // First call should cache the result
        let status1 = client.get_utxo_status(&utxo).await.unwrap();
        
        // Second call should return cached result
        let status2 = client.get_utxo_status(&utxo).await.unwrap();
        assert_eq!(status1, status2);
        
        // Wait for cache to expire
        tokio::time::sleep(Duration::from_secs(2)).await;
        
        // This call should refresh the cache
        let status3 = client.get_utxo_status(&utxo).await.unwrap();
        
        // Verify cache stats
        let stats = client.get_cache_stats().await;
        assert_eq!(stats.total_entries, 1);
    }

    #[tokio::test]
    async fn test_cache_reorg_handling() {
        let config = BitcoinRpcConfig::default();
        let cache_config = UtxoCacheConfig {
            max_size: NonZeroUsize::new(100).unwrap(),
            refresh_interval: Duration::from_secs(1),
            invalid_ttl: Duration::from_secs(2),
        };
        
        let client = BitcoinRpcClient::with_cache_config(config, cache_config);
        
        // Create and cache some UTXOs
        let utxo1 = UtxoMeta::new(
            "test_txid_1".to_string(),
            0,
            10000,
        );
        
        let utxo2 = UtxoMeta::new(
            "test_txid_2".to_string(),
            1,
            20000,
        );
        
        // Cache the UTXOs
        client.get_utxo_status(&utxo1).await.unwrap();
        client.get_utxo_status(&utxo2).await.unwrap();
        
        // Verify cache has entries
        let stats_before = client.get_cache_stats().await;
        assert_eq!(stats_before.total_entries, 2);
        
        // Simulate reorg
        client.handle_reorg(100).await;
        
        // Verify cache was cleared
        let stats_after = client.get_cache_stats().await;
        assert_eq!(stats_after.total_entries, 0);
    }
} 