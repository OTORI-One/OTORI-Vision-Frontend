use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use async_trait::async_trait;
use super::utxo::{UtxoMeta, UtxoStatus};
use crate::bitcoin::rpc::BitcoinRpcClient;
use arch_program::msg;

/// Trait defining the interface for UTXO tracking
#[async_trait]
pub trait UtxoTracking {
    /// Add a new UTXO to the tracker with the specified status
    async fn add_utxo(&mut self, utxo: UtxoMeta, status: UtxoStatus);
    
    /// Get the current status of a UTXO by its txid
    async fn get_utxo_status(&self, txid: &str) -> Option<UtxoStatus>;
    
    /// Mark a UTXO as spent
    async fn mark_utxo_spent(&mut self, txid: &str);
    
    /// Update the confirmation status of all tracked UTXOs
    async fn update_confirmations(&mut self);
    
    /// Handle chain reorganization by checking if any active UTXOs are no longer valid
    async fn handle_chain_reorg(&mut self);
}

/// Implementation of UTXO tracker that maintains state of all UTXOs
#[derive(Clone)]
pub struct UtxoTracker {
    /// Map of txid to (UtxoMeta, UtxoStatus)
    utxos: Arc<Mutex<HashMap<String, (UtxoMeta, UtxoStatus)>>>,
    /// Bitcoin RPC client for interacting with the Bitcoin network
    rpc_client: Arc<BitcoinRpcClient>,
    /// Minimum confirmations required for a UTXO to be considered active
    min_confirmations: u32,
}

impl UtxoTracker {
    /// Create a new UTXO tracker with the specified RPC client
    pub fn new(rpc_client: Arc<BitcoinRpcClient>, min_confirmations: u32) -> Self {
        Self {
            utxos: Arc::new(Mutex::new(HashMap::new())),
            rpc_client,
            min_confirmations,
        }
    }
    
    /// Get a list of all tracked UTXOs
    pub async fn get_all_utxos(&self) -> Vec<(UtxoMeta, UtxoStatus)> {
        let utxos = self.utxos.lock().unwrap();
        utxos.values().cloned().collect()
    }
    
    /// Get all UTXOs with a specific status
    pub async fn get_utxos_by_status(&self, status: UtxoStatus) -> Vec<UtxoMeta> {
        let utxos = self.utxos.lock().unwrap();
        utxos.values()
            .filter(|(_, s)| *s == status)
            .map(|(meta, _)| meta.clone())
            .collect()
    }
    
    /// Get the total value of all UTXOs with a specific status
    pub async fn get_total_value_by_status(&self, status: UtxoStatus) -> u64 {
        let utxos = self.utxos.lock().unwrap();
        utxos.values()
            .filter(|(_, s)| *s == status)
            .map(|(meta, _)| meta.amount_sats)
            .sum()
    }
}

#[async_trait]
impl UtxoTracking for UtxoTracker {
    async fn add_utxo(&mut self, utxo: UtxoMeta, status: UtxoStatus) {
        let txid = utxo.txid.clone(); // Clone before move
        let mut utxos = self.utxos.lock().unwrap();
        utxos.insert(utxo.txid.clone(), (utxo, status));
        msg!("Added UTXO with txid: {}", txid);
    }
    
    async fn get_utxo_status(&self, txid: &str) -> Option<UtxoStatus> {
        let utxos = self.utxos.lock().unwrap();
        utxos.get(txid).map(|(_, status)| status.clone())
    }
    
    async fn mark_utxo_spent(&mut self, txid: &str) {
        let mut utxos = self.utxos.lock().unwrap();
        if let Some((_, status)) = utxos.get_mut(txid) {
            *status = UtxoStatus::Spent;
            msg!("Marked UTXO as spent: {}", txid);
        }
    }
    
    async fn update_confirmations(&mut self) {
        let mut utxos_to_update = Vec::new();
        
        // First, collect UTXOs that need updating to avoid holding the lock during RPC calls
        {
            let utxos = self.utxos.lock().unwrap();
            for (txid, (_, status)) in utxos.iter() {
                if *status == UtxoStatus::Pending {
                    utxos_to_update.push(txid.clone());
                }
            }
        }
        
        // Now update each UTXO's confirmation status
        for txid in utxos_to_update {
            match self.rpc_client.get_confirmations(&txid).await {
                Ok(confirmations) => {
                    let mut utxos = self.utxos.lock().unwrap();
                    if let Some((utxo, status)) = utxos.get_mut(&txid) {
                        // Update the confirmations in the UtxoMeta
                        utxo.confirmations = confirmations as u64;
                        
                        // Update status if needed
                        if *status == UtxoStatus::Pending && confirmations >= self.min_confirmations {
                            *status = UtxoStatus::Active;
                            msg!("UTXO {} is now active with {} confirmations", txid, confirmations);
                        }
                    }
                },
                Err(e) => {
                    msg!("Failed to get confirmations for UTXO {}: {:?}", txid, e);
                }
            }
        }
    }
    
    async fn handle_chain_reorg(&mut self) {
        let mut utxos_to_check = Vec::new();
        let mut utxo_data = Vec::new();
        
        // Collect active UTXOs to check
        {
            let utxos = self.utxos.lock().unwrap();
            for (txid, (utxo, status)) in utxos.iter() {
                if *status == UtxoStatus::Active {
                    utxos_to_check.push(txid.clone());
                    utxo_data.push(utxo.clone());
                }
            }
        }
        
        // Check each active UTXO's status
        for (txid, utxo) in utxos_to_check.into_iter().zip(utxo_data) {
            // Get the new status first
            let new_status = match self.rpc_client.get_utxo_status(&utxo).await {
                Ok(status) => status,
                Err(e) => {
                    msg!("Failed to check status for UTXO {}: {:?}", txid, e);
                    UtxoStatus::Invalid
                }
            };
            
            // Then update the status if needed
            if new_status != UtxoStatus::Active {
                let mut utxos = self.utxos.lock().unwrap();
                if let Some((_, status)) = utxos.get_mut(&txid) {
                    *status = new_status;
                    msg!("UTXO {} status changed to {:?} due to chain reorganization", txid, new_status);
                }
            }
        }
    }
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_utxo_tracker() {
        // ... existing test code ...
    }
    
    // ... other test functions ...
} 