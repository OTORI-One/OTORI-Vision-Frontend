// Mock implementation for WebAssembly target
use crate::bitcoin::utxo::{UtxoMeta, UtxoStatus};
use bitcoin::{Transaction, BlockHash, Block};
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct BitcoinRpcConfig {
    pub endpoint: String,
    pub port: u16,
    pub username: String,
    pub password: String,
}

#[derive(Debug, thiserror::Error)]
pub enum BitcoinRpcError {
    #[error("Not implemented in WebAssembly")]
    NotImplemented,
}

#[derive(Debug, Clone)]
pub struct BitcoinRpcClient {
    endpoint: String,
    port: u16,
    username: String,
    password: String,
}

impl BitcoinRpcClient {
    pub fn new(config: BitcoinRpcConfig) -> Self {
        Self {
            endpoint: config.endpoint,
            port: config.port,
            username: config.username,
            password: config.password,
        }
    }

    // Mock implementations that return errors
    pub async fn get_transaction(&self, _txid: &str) -> Result<Transaction, BitcoinRpcError> {
        Err(BitcoinRpcError::NotImplemented)
    }

    pub async fn get_utxo_status(&self, _utxo: &UtxoMeta) -> Result<UtxoStatus, BitcoinRpcError> {
        Err(BitcoinRpcError::NotImplemented)
    }

    pub async fn update_utxo_confirmations(&self, _utxo: &mut UtxoMeta) -> Result<u64, BitcoinRpcError> {
        Err(BitcoinRpcError::NotImplemented)
    }

    pub async fn get_confirmations(&self, _txid: &str) -> Result<u32, BitcoinRpcError> {
        Err(BitcoinRpcError::NotImplemented)
    }

    pub async fn get_best_block_hash(&self) -> Result<BlockHash, BitcoinRpcError> {
        Err(BitcoinRpcError::NotImplemented)
    }

    pub async fn get_block(&self, _hash: &BlockHash) -> Result<Block, BitcoinRpcError> {
        Err(BitcoinRpcError::NotImplemented)
    }

    pub async fn get_tx_block_info(&self, _txid: &str) -> Result<(u64, u32, String), BitcoinRpcError> {
        Err(BitcoinRpcError::NotImplemented)
    }
}
