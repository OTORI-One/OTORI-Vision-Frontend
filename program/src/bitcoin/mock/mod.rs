use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use bitcoin::{
    Transaction, 
    TxIn, 
    TxOut, 
    Script,
    absolute::LockTime,
    transaction::Version,
    Amount,
};
use crate::bitcoin::utxo::{UtxoMeta, UtxoStatus};

use crate::bitcoin::rpc::{BitcoinRpcClient, BitcoinRpcConfig, BitcoinRpcError};

#[derive(Debug, Clone)]
struct MockTransaction {
    confirmations: u32,
    outputs: Vec<TxOut>,
    is_valid: bool,
}

pub struct MockBitcoinNode {
    transactions: Arc<Mutex<HashMap<String, MockTransaction>>>,
    utxo_set: Arc<Mutex<HashMap<(String, u32), bool>>>, // (txid, vout) -> is_spent
}

impl Default for MockBitcoinNode {
    fn default() -> Self {
        Self::new()
    }
}

impl MockBitcoinNode {
    pub fn new() -> Self {
        Self {
            transactions: Arc::new(Mutex::new(HashMap::new())),
            utxo_set: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn add_transaction(&self, txid: &str, confirmations: u32, outputs: Vec<TxOut>, is_valid: bool) {
        let mut txs = self.transactions.lock().unwrap();
        let mut utxos = self.utxo_set.lock().unwrap();
        
        // Get existing transaction to check if this is a reorg
        let is_reorg = txs.get(txid)
            .map(|tx| tx.is_valid && !is_valid)
            .unwrap_or(false);

        // Store outputs length before moving outputs
        let outputs_len = outputs.len();

        // Update transaction first
        txs.insert(txid.to_string(), MockTransaction {
            confirmations,
            outputs,
            is_valid,
        });

        // Update UTXOs based on transaction validity and reorg status
        for vout in 0..outputs_len {
            let utxo_key = (txid.to_string(), vout as u32);
            
            if is_reorg || !is_valid {
                // Remove UTXOs for invalid transactions or during reorgs
                utxos.remove(&utxo_key);
            } else {
                // For valid transactions, add UTXOs if they don't exist
                if !utxos.contains_key(&utxo_key) {
                    utxos.insert(utxo_key, false);
                }
            }
        }
    }

    pub fn spend_utxo(&self, txid: &str, vout: u32) {
        let mut utxos = self.utxo_set.lock().unwrap();
        utxos.insert((txid.to_string(), vout), true);
    }

    pub fn is_utxo_spent(&self, txid: &str, vout: u32) -> Option<bool> {
        let utxos = self.utxo_set.lock().unwrap();
        utxos.get(&(txid.to_string(), vout)).copied()
    }

    pub fn get_transaction(&self, txid: &str) -> Option<MockTransaction> {
        let txs = self.transactions.lock().unwrap();
        txs.get(txid).cloned()
    }
}

pub struct MockBitcoinRpcClient {
    node: Arc<MockBitcoinNode>,
    config: BitcoinRpcConfig,
}

impl MockBitcoinRpcClient {
    pub fn new(config: BitcoinRpcConfig, node: Arc<MockBitcoinNode>) -> Self {
        Self { node, config }
    }

    pub async fn get_transaction(&self, txid: &str) -> Result<Transaction, BitcoinRpcError> {
        match self.node.get_transaction(txid) {
            Some(mock_tx) if mock_tx.is_valid => {
                Ok(Transaction {
                    version: Version(2),
                    lock_time: LockTime::ZERO,
                    input: vec![],
                    output: mock_tx.outputs,
                })
            }
            Some(_) => Err(BitcoinRpcError::InvalidResponse("Invalid transaction format".to_string())),
            None => Err(BitcoinRpcError::TxNotFound(txid.to_string())),
        }
    }

    pub async fn get_utxo_status(&self, utxo: &UtxoMeta) -> Result<UtxoStatus, BitcoinRpcError> {
        // First check if transaction exists
        match self.node.get_transaction(&utxo.txid) {
            Some(tx) => {
                // If transaction exists but is invalid, return Invalid
                if !tx.is_valid {
                    return Ok(UtxoStatus::Invalid);
                }

                // For valid transactions, check UTXO status
                match self.node.is_utxo_spent(&utxo.txid, utxo.vout) {
                    Some(true) => Ok(UtxoStatus::Spent),
                    Some(false) => {
                        if tx.confirmations == 0 {
                            Ok(UtxoStatus::Pending)
                        } else {
                            Ok(UtxoStatus::Active)
                        }
                    },
                    None => Ok(UtxoStatus::Invalid), // UTXO not found
                }
            },
            None => Ok(UtxoStatus::Invalid), // Transaction not found
        }
    }

    pub async fn get_confirmations(&self, txid: &str) -> Result<u32, BitcoinRpcError> {
        Ok(self.node.get_transaction(txid)
            .map(|tx| tx.confirmations)
            .unwrap_or(0))
    }

    pub async fn validate_utxo(&self, utxo: &UtxoMeta) -> Result<(), BitcoinRpcError> {
        let status = self.get_utxo_status(utxo).await?;
        
        match status {
            UtxoStatus::Active => Ok(()),
            UtxoStatus::Pending => {
                let confirmations = self.get_confirmations(&utxo.txid).await?;
                Err(BitcoinRpcError::InvalidResponse(
                    format!("Insufficient confirmations: {} required", confirmations)
                ))
            },
            UtxoStatus::Spent => Err(BitcoinRpcError::InvalidResponse("UTXO is spent".to_string())),
            UtxoStatus::Invalid => Err(BitcoinRpcError::InvalidResponse("Invalid UTXO".to_string())),
        }
    }

    pub async fn broadcast_transaction(&self, tx: &Transaction) -> Result<String, BitcoinRpcError> {
        if tx.input.is_empty() || tx.output.is_empty() {
            return Err(BitcoinRpcError::InvalidResponse("Invalid transaction format".to_string()));
        }
        Ok("mock_txid".to_string())
    }
} 