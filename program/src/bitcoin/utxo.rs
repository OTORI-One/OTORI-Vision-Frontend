use arch_program::{
    program_error::ProgramError,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    account::AccountInfo,
    msg,
};

use bitcoin::{
    Transaction, 
    ScriptBuf,
    PublicKey,
    Address,
    Network,
    Amount,
    transaction::Version,
    absolute::LockTime,
    TxIn,
    TxOut,
    Script,
    BlockHash,
    Block,
    Txid,
};

use borsh::{BorshDeserialize, BorshSerialize};
use super::rpc::{BitcoinRpcClient, BitcoinRpcError};
use hex::{FromHex, ToHex};
use std::io::{self, Read, Cursor};

// ByteReader trait for handling byte reading operations
trait ByteReader {
    fn read_exact_vec(&mut self, len: usize) -> Result<Vec<u8>, ProgramError>;
}

impl<R: Read> ByteReader for R {
    fn read_exact_vec(&mut self, len: usize) -> Result<Vec<u8>, ProgramError> {
        let mut buffer = vec![0u8; len];
        self.read_exact(&mut buffer)
            .map_err(|_| ProgramError::InvalidInstructionData)?;
        Ok(buffer)
    }
}

// Error codes for custom errors
const ERR_UTXO_VALIDATION: u32 = 1000;
const ERR_TX_FETCH: u32 = 1001;
const ERR_INVALID_VOUT: u32 = 1002;
const ERR_PAYMENT_MISMATCH: u32 = 1003;
const ERR_INVALID_DESTINATION: u32 = 1004;
const ERR_INSUFFICIENT_CONF: u32 = 1005;
const ERR_UTXO_PENDING: u32 = 1006;
const ERR_UTXO_SPENT: u32 = 1007;
const ERR_UTXO_INVALID: u32 = 1008;
const ERR_INSUFFICIENT_CONFIRMATIONS: u32 = 1009;
const ERR_UTXO_STATUS: u32 = 1010;
const ERR_REORG_DETECTED: u32 = 1011;

#[derive(Debug, Clone, PartialEq, Eq, Hash, BorshSerialize, BorshDeserialize)]
pub struct UtxoMeta {
    pub txid: String,
    pub vout: u32,
    pub amount_sats: u64,
    pub script_pubkey: String,
    pub confirmations: u64,
    pub block_height: Option<u32>,  // Height of the block containing the transaction
    pub block_hash: Option<String>, // Hash of the block containing the transaction
}

impl UtxoMeta {
    /// Creates a new UTXO metadata instance
    pub fn new(txid: String, vout: u32, amount_sats: u64) -> Self {
        Self { 
            txid, 
            vout, 
            amount_sats,
            confirmations: 0,
            script_pubkey: String::new(),
            block_height: None,
            block_hash: None,
        }
    }

    /// Update block information
    pub fn update_block_info(&mut self, height: u32, hash: String) {
        self.block_height = Some(height);
        self.block_hash = Some(hash);
    }

    /// Check if this UTXO might have been affected by a reorg
    pub fn needs_revalidation(&self, current_block_hash: &str) -> bool {
        match &self.block_hash {
            Some(hash) => hash != current_block_hash,
            None => self.confirmations > 0 // If we have confirmations but no block hash, revalidate
        }
    }

    /// Convert the string txid to bytes for system-level operations
    pub fn txid_to_bytes(&self) -> Result<[u8; 32], ProgramError> {
        Vec::from_hex(&self.txid)
            .map_err(|_| ProgramError::InvalidArgument)?
            .try_into()
            .map_err(|_| ProgramError::InvalidArgument)
    }

    /// Create a UtxoMeta from system-level byte representation
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, ProgramError> {
        let mut cursor = Cursor::new(bytes);
        
        // Read txid (64 chars = 32 bytes in hex)
        let txid_bytes = cursor.read_exact_vec(64)?;
        let txid = String::from_utf8(txid_bytes)
            .map_err(|_| ProgramError::InvalidInstructionData)?;

        // Read vout (4 bytes)
        let vout_bytes = cursor.read_exact_vec(4)?;
        let vout = u32::from_le_bytes(vout_bytes.try_into().unwrap());

        // Read amount_sats (8 bytes)
        let amount_bytes = cursor.read_exact_vec(8)?;
        let amount_sats = u64::from_le_bytes(amount_bytes.try_into().unwrap());
        
        Ok(Self {
            txid,
            vout,
            amount_sats,
            confirmations: 0,  // Default to 0 confirmations when deserializing
            script_pubkey: String::new(),  // Empty script pubkey when deserializing
            block_height: None,
            block_hash: None,
        })
    }

    /// Get a reference to the string txid (for RPC calls)
    pub fn txid_str(&self) -> &str {
        &self.txid
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, BorshSerialize, BorshDeserialize)]
pub enum UtxoStatus {
    Active,
    Pending,
    Spent,
    Invalid,
}

#[derive(Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct TreasuryPayment {
    pub txid: String,
    pub amount_sats: u64,
    pub utxo: UtxoMeta,
}

// OVT-specific UTXO verification
pub async fn verify_treasury_payment(
    rpc: &BitcoinRpcClient,
    payment: &mut TreasuryPayment,
    treasury_pubkey: &PublicKey,
) -> Result<(), ProgramError> {
    // Validate UTXO first
    validate_utxo(rpc, &mut payment.utxo).await?;

    // Fetch transaction
    let tx = rpc.get_transaction(&payment.txid)
        .await
        .map_err(|e| match e {
            BitcoinRpcError::TxNotFound(_) => ProgramError::Custom(ERR_TX_FETCH),
            _ => ProgramError::Custom(ERR_TX_FETCH),
        })?;

    // Verify output index exists
    let output = tx.output.get(payment.utxo.vout as usize)
        .ok_or(ProgramError::Custom(ERR_INVALID_VOUT))?;

    // Verify payment amount
    if output.value.to_sat() != payment.amount_sats {
        msg!("Payment amount mismatch: expected {} sats, got {} sats",
            payment.amount_sats, output.value.to_sat());
        return Err(ProgramError::Custom(ERR_PAYMENT_MISMATCH));
    }

    // Verify destination
    let expected_script = get_treasury_script_pubkey(treasury_pubkey)?;
    if output.script_pubkey != expected_script {
        msg!("Invalid payment destination");
        return Err(ProgramError::Custom(ERR_INVALID_DESTINATION));
    }

    Ok(())
}

// OVT-specific script generation for treasury
pub fn get_treasury_script_pubkey(pubkey: &PublicKey) -> Result<ScriptBuf, ProgramError> {
    // Create a P2WPKH script directly
    use bitcoin::hashes::Hash as HashTrait;
    let pubkey_hash = bitcoin::hashes::hash160::Hash::hash(&pubkey.to_bytes());
    // Convert hash160::Hash to WPubkeyHash
    let wpubkey_hash = bitcoin::key::WPubkeyHash::from_slice(pubkey_hash.as_ref())
        .map_err(|_| ProgramError::InvalidArgument)?;
    let script = ScriptBuf::new_p2wpkh(&wpubkey_hash);
    Ok(script)
}

// Helper to create Bitcoin transactions
pub fn create_transaction(inputs: Vec<TxIn>, outputs: Vec<TxOut>) -> Transaction {
    Transaction {
        version: Version(2),
        lock_time: LockTime::ZERO,
        input: inputs,
        output: outputs,
    }
}

pub fn verify_utxo_ownership(
    _utxo_info: &AccountInfo,
    _program_id: &Pubkey,
) -> ProgramResult {
    // Mock implementation for testing
    Ok(())
}

pub async fn validate_utxo(
    rpc: &BitcoinRpcClient,
    utxo: &mut UtxoMeta,
) -> Result<(), ProgramError> {
    // Get current block info
    let best_block_hash = rpc.get_best_block_hash().await
        .map_err(|_| ProgramError::Custom(ERR_UTXO_VALIDATION))?;
    
    // Check for reorgs if we have previous block info
    if utxo.needs_revalidation(&best_block_hash.to_string()) {
        msg!("Chain reorganization detected, revalidating UTXO");
        // Reset confirmation count to force full revalidation
        utxo.confirmations = 0;
        utxo.block_height = None;
        utxo.block_hash = None;
    }

    // Update confirmations and block info
    let (confirmations, height, hash) = rpc.get_tx_block_info(utxo.txid_str()).await
        .map_err(|_| ProgramError::Custom(ERR_UTXO_VALIDATION))?;
    
    utxo.confirmations = confirmations;
    if confirmations > 0 {
        utxo.update_block_info(height, hash);
    }

    let status = rpc.get_utxo_status(utxo)
        .await
        .map_err(|_| ProgramError::Custom(ERR_UTXO_VALIDATION))?;

    match status {
        UtxoStatus::Active => {
            if utxo.confirmations < 6 {
                msg!("Insufficient confirmations: {}", utxo.confirmations);
                return Err(ProgramError::Custom(ERR_INSUFFICIENT_CONFIRMATIONS));
            }
        }
        UtxoStatus::Pending => {
            msg!("UTXO is still pending");
            return Err(ProgramError::Custom(ERR_UTXO_STATUS));
        }
        UtxoStatus::Spent => {
            msg!("UTXO is already spent");
            return Err(ProgramError::Custom(ERR_UTXO_STATUS));
        }
        UtxoStatus::Invalid => {
            msg!("UTXO is invalid");
            return Err(ProgramError::Custom(ERR_UTXO_STATUS));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_TXID: &str = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const TEST_VOUT: u32 = 1;
    const TEST_AMOUNT: u64 = 100000;
    const TEST_BLOCK_HEIGHT: u32 = 100;
    const TEST_BLOCK_HASH: &str = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";
    const TEST_NEW_BLOCK_HASH: &str = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce27f";

    #[test]
    fn test_utxo_string_to_bytes_conversion() {
        // Create test UTXO
        let utxo = UtxoMeta::new(TEST_TXID.to_string(), TEST_VOUT, TEST_AMOUNT);

        // Convert to bytes
        let mut bytes = Vec::new();
        bytes.extend_from_slice(TEST_TXID.as_bytes());
        bytes.extend_from_slice(&TEST_VOUT.to_le_bytes());
        bytes.extend_from_slice(&TEST_AMOUNT.to_le_bytes());

        // Create UTXO from bytes
        let converted = UtxoMeta::from_bytes(&bytes).expect("Failed to create UtxoMeta from bytes");

        // Verify fields
        assert_eq!(converted.txid, TEST_TXID);
        assert_eq!(converted.vout, TEST_VOUT);
        assert_eq!(converted.amount_sats, TEST_AMOUNT);
    }

    #[test]
    fn test_utxo_bytes_to_string_conversion() {
        // Create bytes directly
        let mut bytes = Vec::new();
        bytes.extend_from_slice(TEST_TXID.as_bytes());
        bytes.extend_from_slice(&TEST_VOUT.to_le_bytes());
        bytes.extend_from_slice(&TEST_AMOUNT.to_le_bytes());

        // Create UTXO from bytes
        let utxo = UtxoMeta::from_bytes(&bytes).expect("Failed to create UtxoMeta from bytes");

        // Verify string representation
        assert_eq!(utxo.txid, TEST_TXID);
        assert_eq!(utxo.vout, TEST_VOUT);
        assert_eq!(utxo.amount_sats, TEST_AMOUNT);
    }

    #[test]
    fn test_utxo_roundtrip_conversion() {
        // Create original UTXO
        let original = UtxoMeta::new(TEST_TXID.to_string(), TEST_VOUT, TEST_AMOUNT);

        // Convert to bytes
        let mut bytes = Vec::new();
        bytes.extend_from_slice(TEST_TXID.as_bytes());
        bytes.extend_from_slice(&TEST_VOUT.to_le_bytes());
        bytes.extend_from_slice(&TEST_AMOUNT.to_le_bytes());

        // Convert back to UTXO
        let converted = UtxoMeta::from_bytes(&bytes).expect("Failed to create UtxoMeta from bytes");

        // Verify roundtrip
        assert_eq!(original.txid, converted.txid);
        assert_eq!(original.vout, converted.vout);
        assert_eq!(original.amount_sats, converted.amount_sats);
    }

    #[test]
    fn test_invalid_txid_handling() {
        // Test with invalid hex string
        let mut invalid_bytes = Vec::new();
        invalid_bytes.extend_from_slice("invalid_txid".as_bytes());
        invalid_bytes.extend_from_slice(&TEST_VOUT.to_le_bytes());
        invalid_bytes.extend_from_slice(&TEST_AMOUNT.to_le_bytes());

        assert!(UtxoMeta::from_bytes(&invalid_bytes).is_err());

        // Test with short txid
        let mut short_bytes = Vec::new();
        short_bytes.extend_from_slice("1234".as_bytes());
        short_bytes.extend_from_slice(&TEST_VOUT.to_le_bytes());
        short_bytes.extend_from_slice(&TEST_AMOUNT.to_le_bytes());

        assert!(UtxoMeta::from_bytes(&short_bytes).is_err());
    }

    #[test]
    fn test_utxo_status_serialization() {
        let status = UtxoStatus::Active;
        let serialized = borsh::to_vec(&status).expect("Failed to serialize");
        let deserialized: UtxoStatus = borsh::from_slice(&serialized).expect("Failed to deserialize");
        assert_eq!(status, deserialized);
    }

    #[test]
    fn test_utxo_meta_serialization() {
        let utxo = UtxoMeta::new(TEST_TXID.to_string(), TEST_VOUT, TEST_AMOUNT);
        let serialized = borsh::to_vec(&utxo).expect("Failed to serialize");
        let deserialized: UtxoMeta = borsh::from_slice(&serialized).expect("Failed to deserialize");
        
        assert_eq!(utxo.txid, deserialized.txid);
        assert_eq!(utxo.vout, deserialized.vout);
        assert_eq!(utxo.amount_sats, deserialized.amount_sats);
    }

    #[test]
    fn test_utxo_confirmation_tracking() {
        // Create test UTXO
        let mut utxo = UtxoMeta::new(TEST_TXID.to_string(), TEST_VOUT, TEST_AMOUNT);
        
        // Initial confirmations should be 0
        assert_eq!(utxo.confirmations, 0);
        
        // Update confirmations
        utxo.confirmations = 3;
        assert_eq!(utxo.confirmations, 3);
        
        // Test serialization of confirmations
        let serialized = borsh::to_vec(&utxo).expect("Failed to serialize");
        let deserialized: UtxoMeta = borsh::from_slice(&serialized).expect("Failed to deserialize");
        assert_eq!(deserialized.confirmations, 3);
    }

    #[test]
    fn test_reorg_detection() {
        let mut utxo = UtxoMeta::new(TEST_TXID.to_string(), TEST_VOUT, TEST_AMOUNT);
        
        // Initially no reorg needed (no block info)
        assert!(!utxo.needs_revalidation(TEST_BLOCK_HASH));
        
        // Update block info
        utxo.update_block_info(TEST_BLOCK_HEIGHT, TEST_BLOCK_HASH.to_string());
        utxo.confirmations = 3;
        
        // Same block hash - no reorg
        assert!(!utxo.needs_revalidation(TEST_BLOCK_HASH));
        
        // Different block hash - reorg needed
        assert!(utxo.needs_revalidation(TEST_NEW_BLOCK_HASH));
    }

    #[test]
    fn test_block_info_serialization() {
        let mut utxo = UtxoMeta::new(TEST_TXID.to_string(), TEST_VOUT, TEST_AMOUNT);
        utxo.update_block_info(TEST_BLOCK_HEIGHT, TEST_BLOCK_HASH.to_string());
        
        let serialized = borsh::to_vec(&utxo).expect("Failed to serialize");
        let deserialized: UtxoMeta = borsh::from_slice(&serialized).expect("Failed to deserialize");
        
        assert_eq!(deserialized.block_height, Some(TEST_BLOCK_HEIGHT));
        assert_eq!(deserialized.block_hash.as_deref(), Some(TEST_BLOCK_HASH));
    }
} 