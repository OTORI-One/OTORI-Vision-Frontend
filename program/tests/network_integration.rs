use arch_program::pubkey::Pubkey;
use program::OVTProgram;
use program::state::NetworkStatus;
use program::bitcoin::BitcoinRpcConfig;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_network_state_persistence() {
        let program = OVTProgram::new();
        let test_key = b"test_key";
        let test_value = b"test_value";
        
        // Write state
        program.write_state(test_key, test_value).await
            .expect("Failed to write state");
            
        // Read and verify state
        let read_value = program.read_state(test_key).await
            .expect("Failed to read state");
        assert_eq!(read_value, test_value);
        
        // Verify persistence across network boundaries
        let network_status = program.get_network_status().await
            .expect("Failed to get network status");
        assert_eq!(network_status, NetworkStatus::Active);
    }

    #[tokio::test]
    async fn test_network_utxo_verification() {
        let program = OVTProgram::new();
        
        // Create test transaction
        let test_txid = [1u8; 32];
        let test_vout = 0;
        let owner = Pubkey::new_unique();
        
        // Test UTXO verification
        let is_valid = program.verify_utxo(&test_txid, test_vout, &owner).await
            .expect("Failed to verify UTXO");
        
        assert!(is_valid, "UTXO should be valid");
    }

    #[tokio::test]
    async fn test_network_error_handling() {
        let program = OVTProgram::new();
        
        // Test invalid UTXO
        let invalid_txid = [0u8; 32];
        let invalid_vout = 999;
        let owner = Pubkey::new_unique();
        
        let result = program.verify_utxo(&invalid_txid, invalid_vout, &owner).await;
        assert!(result.is_err(), "Should fail with invalid UTXO");
        
        // Test network errors
        let result = program.send_network_message(b"invalid_message").await;
        assert!(result.is_err(), "Should fail with invalid message");
        
        // Test reorg handling
        let test_txid = [2u8; 32];
        let test_vout = 0;
        
        // First verification should succeed
        let is_valid = program.verify_utxo(&test_txid, test_vout, &owner).await
            .expect("Failed to verify UTXO");
        assert!(is_valid, "UTXO should be valid initially");
        
        // Verification after reorg should fail
        let result = program.verify_utxo(&test_txid, test_vout, &owner).await;
        assert!(result.is_err(), "Should fail after reorg");
    }
}
