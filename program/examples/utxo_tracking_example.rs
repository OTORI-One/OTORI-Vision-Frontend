use program::bitcoin::{
    BitcoinRpcClient, BitcoinRpcConfig, 
    UtxoMeta, UtxoStatus,
    UtxoTracker, UtxoTracking
};
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize Bitcoin RPC client configuration
    let config = BitcoinRpcConfig {
        endpoint: "localhost".to_string(),
        port: 8332,
        username: "user".to_string(),
        password: "password".to_string(),
    };
    
    // Create RPC client using the proper constructor
    let rpc_client = Arc::new(BitcoinRpcClient::new(config));
    
    // Create UTXO tracker with 6 confirmations required
    let mut tracker = UtxoTracker::new(rpc_client.clone(), 6);
    
    // Create test UTXO with proper fields
    let utxo = UtxoMeta::new(
        "a000000000000000000000000000000000000000000000000000000000000000".to_string(),
        0,
        100_000,
    );
    
    // Add UTXO with Pending status
    tracker.add_utxo(utxo.clone(), UtxoStatus::Pending).await;
    println!("Added UTXO to tracker");
    
    // Update confirmations for tracked UTXOs
    tracker.update_confirmations().await;
    println!("Updated UTXO confirmations");
    
    // Get all UTXOs and calculate total value
    let all_utxos = tracker.get_all_utxos().await;
    let total_value: u64 = all_utxos.iter().map(|(meta, _)| meta.amount_sats).sum();
    println!("Total value of UTXOs: {} sats", total_value);
    
    // Mark UTXO as spent using the txid string
    tracker.mark_utxo_spent(&utxo.txid).await;
    println!("Marked UTXO as spent");
    
    Ok(())
} 