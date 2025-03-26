use arch_program::program_error::ProgramError;
use bitcoin::{Transaction, Amount, BlockHash, Block};
use crate::bitcoin::utxo::{UtxoMeta, UtxoStatus};
use crate::bitcoin::cache::{UtxoCache, UtxoCacheConfig, CacheStats};
#[cfg(not(target_arch = "wasm32"))]
use reqwest::{Client, ClientBuilder};
use serde::{Deserialize, Serialize};
use std::time::Duration;
#[cfg(not(target_arch = "wasm32"))]
use tokio::time::sleep;
use std::sync::Arc;

const MAX_RETRIES: u32 = 3;
const RETRY_DELAY_MS: u64 = 1000;
const REQUEST_TIMEOUT_SECS: u64 = 30;

#[derive(Debug, Clone)]
pub struct BitcoinRpcClient {
    endpoint: String,
    port: u16,
    username: String,
    password: String,
    #[cfg(not(target_arch = "wasm32"))]
    http_client: Client,
    cache: UtxoCache,
}

#[derive(Debug, Clone)]
pub struct BitcoinRpcConfig {
    pub endpoint: String,
    pub port: u16,
    pub username: String,
    pub password: String,
}

#[derive(Debug, thiserror::Error)]
pub enum BitcoinRpcError {
    #[error("RPC connection failed: {0}")]
    ConnectionFailed(String),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
    #[error("Transaction not found: {0}")]
    TxNotFound(String),
    #[error("Network error: {0}")]
    NetworkError(String),
    #[error("Timeout error")]
    Timeout,
    #[error("Invalid credentials")]
    AuthError,
}

#[derive(Debug, Serialize)]
struct JsonRpcRequest<T> {
    jsonrpc: String,
    id: String,
    method: String,
    params: T,
}

#[derive(Debug, Deserialize)]
struct JsonRpcResponse<T> {
    result: Option<T>,
    error: Option<JsonRpcError>,
}

#[derive(Debug, Deserialize)]
struct JsonRpcError {
    code: i32,
    message: String,
}

impl BitcoinRpcClient {
    pub fn new(config: BitcoinRpcConfig) -> Self {
        let http_client = reqwest::Client::new();
        Self {
            endpoint: config.endpoint,
            port: config.port,
            username: config.username,
            password: config.password,
            #[cfg(not(target_arch = "wasm32"))]
            http_client,
            cache: Default::default(),
        }
    }

    async fn make_rpc_call<T, R>(&self, method: &str, params: T) -> Result<R, BitcoinRpcError>
    where
        T: Serialize,
        R: for<'de> Deserialize<'de>,
    {
        let request = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: "1".to_string(),
            method: method.to_string(),
            params,
        };

        let mut retries = 0;
        while retries < MAX_RETRIES {
            match self.execute_rpc_call::<T, R>(&request).await {
                Ok(response) => return Ok(response),
                Err(e) => {
                    if retries == MAX_RETRIES - 1 {
                        return Err(e);
                    }
                    retries += 1;
                    sleep(Duration::from_millis(RETRY_DELAY_MS)).await;
                }
            }
        }
        Err(BitcoinRpcError::NetworkError("Max retries exceeded".to_string()))
    }

    async fn execute_rpc_call<T, R>(&self, request: &JsonRpcRequest<T>) -> Result<R, BitcoinRpcError>
    where
        T: Serialize,
        R: for<'de> Deserialize<'de>,
    {
        let url = format!("http://{}:{}", self.endpoint, self.port);
        let response = self.http_client
            .post(&url)
            .basic_auth(&self.username, Some(&self.password))
            .json(request)
            .send()
            .await
            .map_err(|e| BitcoinRpcError::ConnectionFailed(e.to_string()))?;

        if response.status() == reqwest::StatusCode::UNAUTHORIZED {
            return Err(BitcoinRpcError::AuthError);
        }

        let rpc_response: JsonRpcResponse<R> = response
            .json()
            .await
            .map_err(|e| BitcoinRpcError::InvalidResponse(e.to_string()))?;

        match (rpc_response.result, rpc_response.error) {
            (Some(result), None) => Ok(result),
            (None, Some(error)) => Err(BitcoinRpcError::InvalidResponse(error.message)),
            _ => Err(BitcoinRpcError::InvalidResponse("Invalid JSON-RPC response".to_string())),
        }
    }

    pub async fn get_transaction(&self, txid: &str) -> Result<Transaction, BitcoinRpcError> {
        let params = vec![txid];
        self.make_rpc_call("getrawtransaction", params).await
    }

    pub async fn get_utxo_status(&self, utxo: &UtxoMeta) -> Result<UtxoStatus, BitcoinRpcError> {
        let tx = self.get_transaction(utxo.txid_str()).await?;
        let confirmations = self.get_confirmations(utxo.txid_str()).await?;
        
        if confirmations == 0 {
            return Ok(UtxoStatus::Pending);
        }

        // Check if the UTXO exists (is unspent)
        let params = vec![utxo.txid_str().to_string(), utxo.vout.to_string()];
        let utxo_exists: bool = self.make_rpc_call("gettxout", params).await?;
        
        if !utxo_exists {
            Ok(UtxoStatus::Spent)
        } else {
            Ok(UtxoStatus::Active)
        }
    }

    pub async fn update_utxo_confirmations(&self, utxo: &mut UtxoMeta) -> Result<u64, BitcoinRpcError> {
        let confirmations = self.get_confirmations(utxo.txid_str()).await? as u64;
        utxo.confirmations = confirmations;
        Ok(confirmations)
    }

    pub async fn get_confirmations(&self, txid: &str) -> Result<u32, BitcoinRpcError> {
        let tx: bitcoin::Transaction = self.get_transaction(txid).await?;
        let params = vec![tx.compute_txid().to_string()];
        let confirmations: u32 = self.make_rpc_call("gettxconfirmations", params).await?;
        Ok(confirmations)
    }

    pub async fn get_best_block_hash(&self) -> Result<BlockHash, BitcoinRpcError> {
        self.make_rpc_call("getbestblockhash", Vec::<String>::new()).await
    }

    pub async fn get_block(&self, hash: &BlockHash) -> Result<Block, BitcoinRpcError> {
        let params = vec![hash.to_string()];
        self.make_rpc_call("getblock", params).await
    }

    /// Get transaction block information including confirmations, height, and hash
    pub async fn get_tx_block_info(&self, txid: &str) -> Result<(u64, u32, String), BitcoinRpcError> {
        #[derive(Debug, Deserialize)]
        struct TxInfo {
            confirmations: u64,
            blockhash: String,
            blockheight: u32,
        }

        let params = vec![txid, "1"]; // "1" for verbose output
        let tx_info: TxInfo = self.make_rpc_call("getrawtransaction", params).await?;
        
        Ok((tx_info.confirmations, tx_info.blockheight, tx_info.blockhash))
    }

    /// Set cache configuration
    pub fn set_cache_config(&mut self, config: UtxoCacheConfig) {
        self.cache = UtxoCache::new(config);
    }

    /// Get cache statistics
    pub async fn get_cache_stats(&self) -> CacheStats {
        self.cache.get_stats().await
    }

    /// Manually trigger cache cleanup
    pub async fn cleanup_cache(&self) {
        self.cache.cleanup().await;
    }

    /// Handle reorg by invalidating affected cache entries
    pub async fn handle_reorg(&self, height: u32) {
        self.cache.handle_reorg(height).await;
    }
} 