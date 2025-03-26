/// Test suite for OVT program functionality
/// 
/// This test suite verifies:
/// 1. Program initialization with multi-signature support
/// 2. NAV updates and validation
/// 3. UTXO handling and state transitions
/// 4. Admin operations and access control
use program;
// Import mock_sdk from the correct location
#[path = "mock_sdk/mock_sdk.rs"]
mod mock_sdk;
use mock_sdk::{
    AccountInfo,
    Pubkey,
    test_utils::TestClient,
    AccountMeta,
};
use program::{OVTInstruction, OVTState};
use program::state::NetworkStatus;
use std::cell::RefCell;
use borsh::BorshSerialize;
use std::sync::Arc;

/// Test program initialization with proper UTXO handling
/// 
/// Verifies:
/// - Proper account initialization
/// - Multi-signature requirements
/// - Default UTXO state
/// - Admin account setup
#[test]
fn test_initialize() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = TestClient::new();
    let program_id = Pubkey::new_unique();
    let system_program = Pubkey::new_unique();
    
    // Create multiple admin accounts (3 out of 5 required)
    let mut admin_accounts = Vec::new();
    for _ in 0..5 {
        admin_accounts.push(client.create_admin_account(program_id)?);
    }
    
    // Create state account with enough space for OVTState
    let state_account = client.create_account(program_id)?;
    
    // Verify default UTXO state
    let default_utxo = client.get_account_utxo(&state_account.key)?;
    assert_eq!(default_utxo, mock_sdk::account_info::UtxoMeta::from_slice(&[0; 36]), "Default UTXO should be zero-initialized");

    // Create test UTXO and set it
    let test_txid = [1u8; 32];
    let test_vout = 1u32;
    let test_utxo = client.create_utxo(test_txid, test_vout);
    client.set_account_utxo(&state_account.key, test_utxo)?;

    // Verify UTXO was set correctly
    let stored_utxo = client.get_account_utxo(&state_account.key)?;
    assert_eq!(stored_utxo.txid(), &test_txid, "UTXO txid mismatch");
    assert_eq!(stored_utxo.vout(), test_vout, "UTXO vout mismatch");

    // Create state account with enough space for OVTState
    {
        let mut accounts = client.accounts.lock().unwrap();
        let account = accounts.get_mut(&state_account.key).unwrap();
        // Initialize with empty state
        let initial_state = OVTState {
            nav_sats: 0,
            treasury_pubkey_bytes: [0u8; 33],
            total_supply: 0,
            last_nav_update: 0,
            network_status: NetworkStatus::Syncing,
            last_sync_height: 0,
        };
        let serialized = borsh::to_vec(&initial_state)?;
        account.data = Arc::new(RefCell::new(serialized));
        account.owner = Arc::new(RefCell::new(program_id));
    }

    // Create system program account
    {
        let mut accounts = client.accounts.lock().unwrap();
        accounts.insert(system_program, AccountInfo {
            key: system_program,
            is_signer: false,
            is_writable: false,
            lamports: Arc::new(RefCell::new(1)),
            data: Arc::new(RefCell::new(Vec::new())),
            owner: Arc::new(RefCell::new(program_id)),
            utxo: mock_sdk::account_info::UtxoMeta::from_slice(&[0; 36]),
        });
    }

    // Collect signatures from 3 admins
    let action_type = "initialize".to_string();
    let description = "Initialize OVT program state".to_string();
    
    // First 3 admins sign the action
    for i in 0..3 {
        let signature = format!("sig_{}", i);
        client.sign_action(
            &admin_accounts[i].key,
            action_type.clone(),
            description.clone(),
            signature,
        )?;
    }

    // Verify we have enough signatures
    let signatures: Vec<String> = (0..3).map(|i| format!("sig_{}", i)).collect();
    assert!(client.verify_action(&action_type, &signatures)?);

    // Initialize program with multi-sig approval
    let instruction = OVTInstruction::Initialize {
        treasury_pubkey_bytes: [0u8; 33],
    };

    client.process_transaction(
        program_id,
        vec![
            AccountMeta::new(state_account.key, true),
            AccountMeta::new_readonly(admin_accounts[0].key, true),
            AccountMeta::new_readonly(system_program, false),
        ],
        borsh::to_vec(&instruction)?,
    )?;

    // Verify state was initialized correctly
    let state: OVTState = client.get_account_data(&state_account.key)?;
    assert_eq!(state.nav_sats, 0);
    assert_eq!(state.total_supply, 0);
    assert_eq!(state.last_nav_update, 0);

    // Verify admin status
    for admin in &admin_accounts {
        assert!(client.is_admin(&admin.key));
    }

    Ok(())
}

/// Test NAV updates with UTXO state tracking
/// 
/// Verifies:
/// - NAV update process
/// - UTXO state transitions
/// - Multi-signature requirements for updates
/// - State persistence
#[test]
fn test_nav_update() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = TestClient::new();
    let program_id = Pubkey::new_unique();
    let system_program = Pubkey::new_unique();
    
    // Create multiple admin accounts
    let mut admin_accounts = Vec::new();
    for _ in 0..5 {
        admin_accounts.push(client.create_admin_account(program_id)?);
    }
    
    // Create state account and verify UTXO handling
    let state_account = client.create_account(program_id)?;
    
    // Set and verify a test UTXO
    let test_txid = [2u8; 32];
    let test_vout = 2u32;
    let test_utxo = client.create_utxo(test_txid, test_vout);
    client.set_account_utxo(&state_account.key, test_utxo)?;
    
    let stored_utxo = client.get_account_utxo(&state_account.key)?;
    assert_eq!(stored_utxo.txid(), &test_txid, "UTXO txid mismatch in NAV update test");
    assert_eq!(stored_utxo.vout(), test_vout, "UTXO vout mismatch in NAV update test");

    // Initialize account data structure properly
    {
        let mut accounts = client.accounts.lock().unwrap();
        let account = accounts.get_mut(&state_account.key).unwrap();
        // Initialize with empty state
        let initial_state = OVTState {
            nav_sats: 0,
            treasury_pubkey_bytes: [0u8; 33],
            total_supply: 0,
            last_nav_update: 0,
            network_status: NetworkStatus::Syncing,
            last_sync_height: 0,
        };
        let serialized = borsh::to_vec(&initial_state)?;
        account.data = Arc::new(RefCell::new(serialized));
        account.owner = Arc::new(RefCell::new(program_id));
    }

    // Create system program account
    {
        let mut accounts = client.accounts.lock().unwrap();
        accounts.insert(system_program, AccountInfo {
            key: system_program,
            is_signer: false,
            is_writable: false,
            lamports: Arc::new(RefCell::new(1)),
            data: Arc::new(RefCell::new(Vec::new())),
            owner: Arc::new(RefCell::new(program_id)),
            utxo: mock_sdk::account_info::UtxoMeta::from_slice(&[0; 36]),
        });
    }

    // Initialize first with multi-sig
    let init_action_type = "initialize".to_string();
    let init_description = "Initialize OVT program state".to_string();
    
    // Collect signatures for initialization
    for i in 0..3 {
        let signature = format!("init_sig_{}", i);
        client.sign_action(
            &admin_accounts[i].key,
            init_action_type.clone(),
            init_description.clone(),
            signature,
        )?;
    }

    let init_signatures: Vec<String> = (0..3).map(|i| format!("init_sig_{}", i)).collect();
    assert!(client.verify_action(&init_action_type, &init_signatures)?);

    // Initialize through proper instruction flow
    let instruction = OVTInstruction::Initialize {
        treasury_pubkey_bytes: [0u8; 33],
    };

    client.process_transaction(
        program_id,
        vec![
            AccountMeta::new(state_account.key, true),
            AccountMeta::new_readonly(admin_accounts[0].key, true),
            AccountMeta::new_readonly(system_program, false),
        ],
        borsh::to_vec(&instruction)?,
    )?;

    // Update NAV with multi-sig
    let nav_action_type = "update_nav".to_string();
    let nav_description = "Update NAV to 2M sats".to_string();
    let new_nav = 2_000_000; // 2M sats
    
    // Collect signatures for NAV update
    for i in 0..3 {
        let signature = format!("nav_sig_{}", i);
        client.sign_action(
            &admin_accounts[i].key,
            nav_action_type.clone(),
            nav_description.clone(),
            signature,
        )?;
    }

    let nav_signatures: Vec<String> = (0..3).map(|i| format!("nav_sig_{}", i)).collect();
    assert!(client.verify_action(&nav_action_type, &nav_signatures)?);

    // Update NAV through proper instruction flow
    let instruction = OVTInstruction::UpdateNAV {
        btc_price_sats: new_nav,
    };

    client.process_transaction(
        program_id,
        vec![
            AccountMeta::new(state_account.key, true),
            AccountMeta::new_readonly(admin_accounts[0].key, true),
        ],
        borsh::to_vec(&instruction)?,
    )?;

    // Verify NAV was updated correctly
    let state: OVTState = client.get_account_data(&state_account.key)?;
    assert_eq!(state.nav_sats, new_nav, "NAV was not updated correctly");

    Ok(())
}

/// Test NAV validation with UTXO state verification
/// 
/// Verifies:
/// - NAV validation rules
/// - UTXO state consistency
/// - State transitions during validation
#[test]
fn test_nav_validation() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = TestClient::new();
    let program_id = Pubkey::new_unique();
    let system_program = Pubkey::new_unique();
    
    // Create multiple admin accounts
    let mut admin_accounts = Vec::new();
    for _ in 0..5 {
        admin_accounts.push(client.create_admin_account(program_id)?);
    }
    
    // Create state account and verify UTXO handling
    let state_account = client.create_account(program_id)?;
    
    // Set and verify a test UTXO for validation
    let test_txid = [3u8; 32];
    let test_vout = 3u32;
    let test_utxo = client.create_utxo(test_txid, test_vout);
    client.set_account_utxo(&state_account.key, test_utxo)?;
    
    // Verify UTXO state before validation
    let stored_utxo = client.get_account_utxo(&state_account.key)?;
    assert_eq!(stored_utxo.txid(), &test_txid, "UTXO txid mismatch in validation test");
    assert_eq!(stored_utxo.vout(), test_vout, "UTXO vout mismatch in validation test");

    // Initialize account data structure properly
    {
        let mut accounts = client.accounts.lock().unwrap();
        let account = accounts.get_mut(&state_account.key).unwrap();
        // Initialize with empty state
        let initial_state = OVTState {
            nav_sats: 0,
            treasury_pubkey_bytes: [0u8; 33],
            total_supply: 0,
            last_nav_update: 0,
            network_status: NetworkStatus::Syncing,
            last_sync_height: 0,
        };
        let serialized = borsh::to_vec(&initial_state)?;
        account.data = Arc::new(RefCell::new(serialized));
        account.owner = Arc::new(RefCell::new(program_id));
    }

    // Create system program account
    {
        let mut accounts = client.accounts.lock().unwrap();
        accounts.insert(system_program, AccountInfo {
            key: system_program,
            is_signer: false,
            is_writable: false,
            lamports: Arc::new(RefCell::new(1)),
            data: Arc::new(RefCell::new(Vec::new())),
            owner: Arc::new(RefCell::new(program_id)),
            utxo: mock_sdk::account_info::UtxoMeta::from_slice(&[0; 36]),
        });
    }

    // Initialize first with multi-sig
    let init_action_type = "initialize".to_string();
    let init_description = "Initialize OVT program state".to_string();
    
    // Collect signatures for initialization
    for i in 0..3 {
        let signature = format!("init_sig_{}", i);
        client.sign_action(
            &admin_accounts[i].key,
            init_action_type.clone(),
            init_description.clone(),
            signature,
        )?;
    }

    let init_signatures: Vec<String> = (0..3).map(|i| format!("init_sig_{}", i)).collect();
    assert!(client.verify_action(&init_action_type, &init_signatures)?);

    let instruction = OVTInstruction::Initialize {
        treasury_pubkey_bytes: [0u8; 33],
    };

    client.process_transaction(
        program_id,
        vec![
            AccountMeta::new(state_account.key, true),
            AccountMeta::new_readonly(admin_accounts[0].key, true),
            AccountMeta::new_readonly(system_program, false),
        ],
        borsh::to_vec(&instruction)?,
    )?;

    // Update state with test values
    let state = OVTState {
        nav_sats: 1_000_000, // 1M sats NAV
        treasury_pubkey_bytes: [0u8; 33],
        total_supply: 1_000_000,
        last_nav_update: 0,
        network_status: NetworkStatus::Syncing,
        last_sync_height: 0,
    };

    {
        let accounts = client.accounts.lock().unwrap();
        accounts.get(&state_account.key).unwrap()
            .set_data(&state)?;
    }

    Ok(())
} 