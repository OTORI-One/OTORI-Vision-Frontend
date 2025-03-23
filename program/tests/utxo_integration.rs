use arch_program::pubkey::Pubkey;
use program::bitcoin::{
    BitcoinRpcClient, 
    BitcoinRpcConfig, 
    UtxoMeta, 
    UtxoStatus,
    UtxoCacheConfig,
    BitcoinRpcError,
};
use bitcoin::{Transaction, TxOut, Amount, ScriptBuf};
use std::time::Duration;
use std::num::NonZeroUsize;
use tokio::time::sleep;
use futures::future;
use std::sync::Arc;

// Import mock implementation
use program::bitcoin::mock::{MockBitcoinNode, MockBitcoinRpcClient};

// Helper to create a test mock client
fn setup_mock_client() -> (Arc<MockBitcoinNode>, MockBitcoinRpcClient) {
    let node = Arc::new(MockBitcoinNode::new());
    let config = BitcoinRpcConfig {
        endpoint: "mock".to_string(),
        port: 0,
        username: "mock".to_string(),
        password: "mock".to_string(),
    };
    let client = MockBitcoinRpcClient::new(config, node.clone());
    (node, client)
}

#[tokio::test]
async fn test_utxo_lifecycle() {
    let (node, client) = setup_mock_client();
    
    // Create test UTXO
    let txid = "a000000000000000000000000000000000000000000000000000000000000000";
    let outputs = vec![TxOut {
        value: Amount::from_sat(10000),
        script_pubkey: ScriptBuf::new(),
    }];
    
    // Add transaction to mock node
    node.add_transaction(txid, 0, outputs, true);
    
    let utxo = UtxoMeta::new(txid.to_string(), 0, 10000);

    // Test initial state (should be Pending)
    let status = client.get_utxo_status(&utxo).await.unwrap();
    assert_eq!(status, UtxoStatus::Pending, "New UTXO should be Pending");

    // Test spent state
    node.spend_utxo(txid, 0);
    let status = client.get_utxo_status(&utxo).await.unwrap();
    assert_eq!(status, UtxoStatus::Spent, "UTXO should be marked as spent");
}

#[tokio::test]
async fn test_network_errors() {
    let (node, client) = setup_mock_client();
    
    // Test with non-existent transaction
    let utxo = UtxoMeta::new(
        "a000000000000000000000000000000000000000000000000000000000000000".to_string(),
        0,
        10000,
    );

    // Should return Invalid status for non-existent transaction
    let status = client.get_utxo_status(&utxo).await.unwrap();
    assert_eq!(status, UtxoStatus::Invalid, "Non-existent UTXO should be Invalid");

    // Test with invalid transaction
    let outputs = vec![TxOut {
        value: Amount::from_sat(10000),
        script_pubkey: ScriptBuf::new(),
    }];
    node.add_transaction(&utxo.txid, 0, outputs, false);
    
    let result = client.get_transaction(&utxo.txid).await;
    assert!(result.is_err(), "Should fail with invalid transaction format");
}

#[tokio::test]
async fn test_reorg_handling() {
    let (node, client) = setup_mock_client();
    
    // Create test UTXOs
    let txid1 = "b000000000000000000000000000000000000000000000000000000000000000";
    let txid2 = "c000000000000000000000000000000000000000000000000000000000000000";
    
    let outputs = vec![TxOut {
        value: Amount::from_sat(10000),
        script_pubkey: ScriptBuf::new(),
    }];
    
    // Add transactions with 6 confirmations
    node.add_transaction(txid1, 6, outputs.clone(), true);
    node.add_transaction(txid2, 6, outputs.clone(), true);
    
    let utxo1 = UtxoMeta::new(txid1.to_string(), 0, 10000);
    let utxo2 = UtxoMeta::new(txid2.to_string(), 1, 20000);

    // Verify initial active status
    let status1 = client.get_utxo_status(&utxo1).await.unwrap();
    let status2 = client.get_utxo_status(&utxo2).await.unwrap();
    assert_eq!(status1, UtxoStatus::Active);
    assert_eq!(status2, UtxoStatus::Active);

    // Simulate reorg by marking transactions as invalid
    node.add_transaction(txid1, 0, outputs.clone(), false);
    node.add_transaction(txid2, 0, outputs.clone(), false);

    // Verify status changes
    let new_status1 = client.get_utxo_status(&utxo1).await.unwrap();
    let new_status2 = client.get_utxo_status(&utxo2).await.unwrap();
    assert_eq!(new_status1, UtxoStatus::Invalid);
    assert_eq!(new_status2, UtxoStatus::Invalid);
}

#[tokio::test]
async fn test_concurrent_access() {
    let (node, client) = setup_mock_client();
    let client = Arc::new(client);

    // Create test UTXO
    let txid = "a000000000000000000000000000000000000000000000000000000000000000";
    let outputs = vec![TxOut {
        value: Amount::from_sat(10000),
        script_pubkey: ScriptBuf::new(),
    }];
    
    // Add transaction to mock node
    node.add_transaction(txid, 6, outputs, true);
    
    let utxo = UtxoMeta::new(txid.to_string(), 0, 10000);

    // Spawn multiple tasks to access UTXO status concurrently
    let mut handles = vec![];
    for _ in 0..10 {
        let client = client.clone();
        let utxo = utxo.clone();
        handles.push(tokio::spawn(async move {
            client.get_utxo_status(&utxo).await.unwrap()
        }));
    }

    // Wait for all tasks and verify they got consistent results
    let results = future::join_all(handles).await;
    let first_status = results[0].as_ref().unwrap();
    for result in &results[1..] {
        assert_eq!(result.as_ref().unwrap(), first_status, "All concurrent accesses should return same status");
    }
} 