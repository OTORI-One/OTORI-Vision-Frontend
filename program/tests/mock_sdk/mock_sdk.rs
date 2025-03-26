use borsh::{BorshDeserialize, BorshSerialize};
use std::convert::From;
use std::io;
use std::cell::RefCell;
use std::collections::HashMap;
use std::fmt;
use std::sync::{Arc, Mutex};
use bitcoin::hashes::{sha256, Hash};
use std::sync::atomic::{AtomicU64, Ordering};
use borsh::io::{Error as BorshError, Write as BorshWrite, Read as BorshRead, ErrorKind};
use bitcoin::{Transaction, Script, ScriptBuf, Amount};
use program::state::NetworkStatus;

// Import program types for mock implementation
pub mod program_types {
    pub use ::program::{OVTInstruction, OVTState};
    pub use ::program::state::NetworkStatus;
    use borsh::BorshDeserialize;
    
    // Mock implementation of process_instruction that works with our mock types
    pub fn process_instruction(ctx: &super::ProgramContext, data: &[u8]) -> Result<(), super::ProgramError> {
        // Parse the instruction data
        let instruction = match OVTInstruction::try_from_slice(data) {
            Ok(instruction) => instruction,
            Err(_) => return Err(super::ProgramError::InvalidInstructionData),
        };
        
        // Process the instruction based on its variant
        match instruction {
            OVTInstruction::Initialize { treasury_pubkey_bytes } => {
                // Mock implementation for Initialize
                if ctx.accounts.len() < 3 {
                    return Err(super::ProgramError::NotEnoughAccountKeys);
                }
                
                let state_account = &ctx.accounts[0];
                if !state_account.is_writable {
                    return Err(super::ProgramError::InvalidArgument);
                }
                
                let admin_account = &ctx.accounts[1];
                if !admin_account.is_signer {
                    return Err(super::ProgramError::MissingRequiredSignature);
                }
                
                // Initialize state
                let state = OVTState {
                    nav_sats: 0,
                    treasury_pubkey_bytes,
                    total_supply: 0,
                    last_nav_update: 0,
                    network_status: NetworkStatus::Syncing,
                    last_sync_height: 0,
                };
                
                state_account.set_data(&state).map_err(|_| super::ProgramError::AccountDataTooSmall)?;
                
                Ok(())
            },
            OVTInstruction::UpdateNAV { btc_price_sats } => {
                // Mock implementation for UpdateNAV
                if ctx.accounts.len() < 2 {
                    return Err(super::ProgramError::NotEnoughAccountKeys);
                }
                
                let state_account = &ctx.accounts[0];
                if !state_account.is_writable {
                    return Err(super::ProgramError::InvalidArgument);
                }
                
                let admin_account = &ctx.accounts[1];
                if !admin_account.is_signer {
                    return Err(super::ProgramError::MissingRequiredSignature);
                }
                
                // Update state
                let mut state: OVTState = borsh::from_slice(&state_account.data.borrow())
                    .map_err(|_| super::ProgramError::InvalidAccountData)?;
                
                state.nav_sats = btc_price_sats;
                state.last_nav_update = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as u64;
                
                state_account.set_data(&state).map_err(|_| super::ProgramError::AccountDataTooSmall)?;
                
                Ok(())
            },
            // Add other instruction handlers as needed
            _ => Err(super::ProgramError::InvalidInstructionData),
        }
    }
}

// Define core types and traits for the mock SDK
pub struct ProgramContext {
    pub accounts: Vec<AccountInfo>,
    pub program_id: Pubkey,
}

pub struct AccountMeta {
    pub pubkey: Pubkey,
    pub is_signer: bool,
    pub is_writable: bool,
}

impl AccountMeta {
    pub fn new(pubkey: Pubkey, is_signer: bool) -> Self {
        Self {
            pubkey,
            is_signer,
            is_writable: true,
        }
    }

    pub fn new_readonly(pubkey: Pubkey, is_signer: bool) -> Self {
        Self {
            pubkey,
            is_signer,
            is_writable: false,
        }
    }
}

pub trait Program {
    fn process_instruction(ctx: &ProgramContext, data: &[u8]) -> ProgramResult;
}

// Re-export common types at the root level
pub use self::account_info::AccountInfo;
pub use self::pubkey::Pubkey;

// Define ProgramResult at the root level
pub type ProgramResult = Result<(), ProgramError>;

// Define a macro for logging
#[macro_export]
macro_rules! msg {
    ($($arg:tt)*) => {
        println!($($arg)*);
    };
}

pub mod pubkey {
    use super::*;

    #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
    pub struct Pubkey(pub [u8; 32]);

    impl Pubkey {
        pub fn new() -> Self {
            Self([0; 32])
        }

        pub fn new_unique() -> Self {
            let input = format!("test_key_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos());
            let hash = sha256::Hash::hash(input.as_bytes());
            let mut bytes = [0u8; 32];
            bytes.copy_from_slice(&hash[..]);
            Self(bytes)
        }
    }

    impl BorshSerialize for Pubkey {
        fn serialize<W: BorshWrite>(&self, writer: &mut W) -> Result<(), BorshError> {
            writer.write_all(&self.0).map_err(|_| BorshError::new(ErrorKind::InvalidData, "Failed to write pubkey"))
        }
    }

    impl BorshDeserialize for Pubkey {
        fn deserialize(buf: &mut &[u8]) -> Result<Self, BorshError> {
            if buf.len() < 32 {
                return Err(BorshError::new(ErrorKind::InvalidData, "Insufficient bytes for pubkey"));
            }
            let mut bytes = [0u8; 32];
            bytes.copy_from_slice(&buf[..32]);
            *buf = &buf[32..];
            Ok(Self(bytes))
        }

        fn deserialize_reader<R: BorshRead>(reader: &mut R) -> Result<Self, BorshError> {
            let mut bytes = [0u8; 32];
            reader.read_exact(&mut bytes).map_err(|_| BorshError::new(ErrorKind::InvalidData, "Failed to read pubkey"))?;
            Ok(Self(bytes))
        }
    }
}

pub mod account_info {
    use super::*;
    use super::pubkey::Pubkey;

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct UtxoMeta {
        txid: [u8; 32],
        vout: u32,
    }

    impl UtxoMeta {
        pub fn new(txid: [u8; 32], vout: u32) -> Self {
            Self { txid, vout }
        }

        pub fn from_slice(data: &[u8]) -> Self {
            let mut txid = [0u8; 32];
            txid.copy_from_slice(&data[0..32]);
            let vout = u32::from_le_bytes([data[32], data[33], data[34], data[35]]);
            Self { txid, vout }
        }

        pub fn txid(&self) -> &[u8; 32] {
            &self.txid
        }

        pub fn vout(&self) -> u32 {
            self.vout
        }
    }

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum UtxoStatus {
        Active,
        Pending,
        Spent,
        Invalid,
    }

    #[derive(Debug, Clone)]
    pub struct AccountInfo {
        pub key: Pubkey,
        pub is_signer: bool,
        pub is_writable: bool,
        pub lamports: Arc<RefCell<u64>>,
        pub data: Arc<RefCell<Vec<u8>>>,
        pub owner: Arc<RefCell<Pubkey>>,
        pub utxo: UtxoMeta,
    }

    impl AccountInfo {
        pub fn new(
            key: Pubkey,
            is_signer: bool,
            is_writable: bool,
            lamports: u64,
            data: Vec<u8>,
            owner: Pubkey,
            utxo: UtxoMeta,
        ) -> Self {
            Self {
                key,
                is_signer,
                is_writable,
                lamports: Arc::new(RefCell::new(lamports)),
                data: Arc::new(RefCell::new(data)),
                owner: Arc::new(RefCell::new(owner)),
                utxo,
            }
        }

        pub fn set_data<T: BorshSerialize>(&self, data: &T) -> Result<(), io::Error> {
            let serialized = borsh::to_vec(data).map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
            *self.data.borrow_mut() = serialized;
            Ok(())
        }
    }
}

// Define program error type
#[derive(Debug)]
pub enum ProgramError {
    InvalidArgument,
    InvalidInstructionData,
    InvalidAccountData,
    AccountDataTooSmall,
    InsufficientFunds,
    IncorrectProgramId,
    MissingRequiredSignature,
    AccountAlreadyInitialized,
    UninitializedAccount,
    NotEnoughAccountKeys,
    AccountBorrowFailed,
    Custom(u32),
    InvalidAccountOwner,
    ArithmeticOverflow,
    UnsupportedSysvar,
    IllegalOwner,
}

impl fmt::Display for ProgramError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ProgramError::InvalidArgument => write!(f, "InvalidArgument"),
            ProgramError::InvalidInstructionData => write!(f, "InvalidInstructionData"),
            ProgramError::InvalidAccountData => write!(f, "InvalidAccountData"),
            ProgramError::AccountDataTooSmall => write!(f, "AccountDataTooSmall"),
            ProgramError::InsufficientFunds => write!(f, "InsufficientFunds"),
            ProgramError::IncorrectProgramId => write!(f, "IncorrectProgramId"),
            ProgramError::MissingRequiredSignature => write!(f, "MissingRequiredSignature"),
            ProgramError::AccountAlreadyInitialized => write!(f, "AccountAlreadyInitialized"),
            ProgramError::UninitializedAccount => write!(f, "UninitializedAccount"),
            ProgramError::NotEnoughAccountKeys => write!(f, "NotEnoughAccountKeys"),
            ProgramError::AccountBorrowFailed => write!(f, "AccountBorrowFailed"),
            ProgramError::Custom(code) => write!(f, "Custom error: {}", code),
            ProgramError::InvalidAccountOwner => write!(f, "InvalidAccountOwner"),
            ProgramError::ArithmeticOverflow => write!(f, "ArithmeticOverflow"),
            ProgramError::UnsupportedSysvar => write!(f, "UnsupportedSysvar"),
            ProgramError::IllegalOwner => write!(f, "IllegalOwner"),
        }
    }
}

impl std::error::Error for ProgramError {}

impl From<String> for ProgramError {
    fn from(_: String) -> Self {
        ProgramError::Custom(1)
    }
}

// Mock token account state
#[derive(Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct TokenAccount {
    pub mint: pubkey::Pubkey,
    pub owner: pubkey::Pubkey,
    pub amount: u64,
    pub delegated_amount: u64,
    pub close_authority: Option<pubkey::Pubkey>,
}

pub mod test_utils {
    use super::*;
    use super::account_info::{AccountInfo, UtxoMeta};
    use super::pubkey::Pubkey;
    use bitcoin::Transaction;

    // Function to get a script pubkey for an account
    pub fn get_account_script_pubkey(_account: &AccountInfo) -> ScriptBuf {
        // Mock implementation
        ScriptBuf::new()
    }

    #[derive(Debug)]
    pub struct TestClient {
        pub accounts: Arc<Mutex<HashMap<Pubkey, AccountInfo>>>,
        pub admin_accounts: HashMap<Pubkey, bool>,
        pub action_signatures: HashMap<String, Vec<String>>,
        pub action_descriptions: HashMap<String, String>,
        next_pubkey: u64,
    }

    impl TestClient {
        pub fn new() -> Self {
            Self {
                accounts: Arc::new(Mutex::new(HashMap::new())),
                admin_accounts: HashMap::new(),
                action_signatures: HashMap::new(),
                action_descriptions: HashMap::new(),
                next_pubkey: 1,
            }
        }

        pub fn create_account(&mut self, owner: Pubkey) -> Result<AccountInfo, ProgramError> {
            let key = Pubkey::new_unique();
            let account = AccountInfo {
                key,
                is_signer: true,
                is_writable: true,
                lamports: Arc::new(RefCell::new(1000000)),
                data: Arc::new(RefCell::new(Vec::new())),
                owner: Arc::new(RefCell::new(owner)),
                utxo: UtxoMeta::from_slice(&[0; 36]),
            };
            
            let mut accounts = self.accounts.lock().unwrap();
            accounts.insert(key, account.clone());
            
            Ok(account)
        }

        pub fn create_admin_account(&mut self, owner: Pubkey) -> Result<AccountInfo, ProgramError> {
            let account = self.create_account(owner)?;
            self.admin_accounts.insert(account.key, true);
            Ok(account)
        }

        pub fn is_admin(&self, key: &Pubkey) -> bool {
            self.admin_accounts.get(key).copied().unwrap_or(false)
        }

        pub fn sign_action(&mut self, signer: &Pubkey, action_type: String, description: String, signature: String) -> Result<(), ProgramError> {
            if !self.is_admin(signer) {
                return Err(ProgramError::MissingRequiredSignature);
            }
            
            self.action_descriptions.insert(action_type.clone(), description);
            
            let signatures = self.action_signatures.entry(action_type).or_insert_with(Vec::new);
            signatures.push(signature);
            
            Ok(())
        }

        pub fn verify_action(&self, action_type: &str, signatures: &[String]) -> Result<bool, ProgramError> {
            if signatures.len() < 3 {
                return Ok(false);
            }
            
            let stored_signatures = self.action_signatures.get(action_type);
            if let Some(stored) = stored_signatures {
                let mut count = 0;
                for sig in signatures {
                    if stored.contains(sig) {
                        count += 1;
                    }
                }
                return Ok(count >= 3);
            }
            
            Ok(false)
        }

        pub fn process_transaction(&self, program_id: Pubkey, account_metas: Vec<AccountMeta>, instruction_data: Vec<u8>) -> Result<(), ProgramError> {
            let mut accounts = Vec::new();
            let account_map = self.accounts.lock().unwrap();
            
            for meta in account_metas {
                if let Some(account) = account_map.get(&meta.pubkey) {
                    accounts.push(AccountInfo {
                        key: account.key,
                        is_signer: meta.is_signer,
                        is_writable: meta.is_writable,
                        lamports: account.lamports.clone(),
                        data: account.data.clone(),
                        owner: account.owner.clone(),
                        utxo: account.utxo,
                    });
                } else {
                    return Err(ProgramError::InvalidArgument);
                }
            }
            
            // Create a context for our mock program
            let ctx = ProgramContext {
                accounts,
                program_id,
            };
            
            // Call our mock implementation of process_instruction
            program_types::process_instruction(&ctx, &instruction_data)
        }

        pub fn get_account_data<T: BorshDeserialize>(&self, key: &Pubkey) -> Result<T, ProgramError> {
            let accounts = self.accounts.lock().unwrap();
            let account = accounts.get(key).ok_or(ProgramError::InvalidArgument)?;
            let data = account.data.borrow();
            
            T::try_from_slice(&data).map_err(|_| ProgramError::InvalidAccountData)
        }

        pub fn create_utxo(&self, txid: [u8; 32], vout: u32) -> UtxoMeta {
            UtxoMeta::new(txid, vout)
        }

        pub fn set_account_utxo(&self, key: &Pubkey, utxo: UtxoMeta) -> Result<(), ProgramError> {
            let mut accounts = self.accounts.lock().unwrap();
            let account = accounts.get_mut(key).ok_or(ProgramError::InvalidArgument)?;
            account.utxo = utxo;
            Ok(())
        }

        pub fn get_account_utxo(&self, key: &Pubkey) -> Result<UtxoMeta, ProgramError> {
            let accounts = self.accounts.lock().unwrap();
            let account = accounts.get(key).ok_or(ProgramError::InvalidArgument)?;
            Ok(account.utxo)
        }
    }
}

pub mod helper {
    use super::*;
    use super::account_info::AccountInfo;
    use super::test_utils::get_account_script_pubkey;
    use bitcoin::Amount;

    pub fn add_state_transition(_tx: &mut Transaction, _account: &AccountInfo) -> Result<(), ProgramError> {
        // Mock implementation for testing
        Ok(())
    }

    pub fn verify_bitcoin_transaction(_tx: &Transaction, _amount: u64) -> Result<bool, ProgramError> {
        // Mock implementation for testing
        Ok(true)
    }
}

pub fn process_transaction(
    client: &test_utils::TestClient,
    instruction_data: &[u8],
    accounts: &[Pubkey],
    signers: &[Pubkey],
) -> Result<(), ProgramError> {
    let accounts_map = client.accounts.lock().unwrap();
    let mut account_infos: Vec<AccountInfo> = Vec::new();

    for account in accounts {
        if let Some(acc) = accounts_map.get(account) {
            account_infos.push(AccountInfo {
                key: acc.key,
                is_signer: signers.contains(&acc.key),
                is_writable: acc.is_writable,
                lamports: Arc::clone(&acc.lamports),
                data: Arc::clone(&acc.data),
                owner: Arc::clone(&acc.owner),
                utxo: acc.utxo.clone(),
            });
        }
    }

    let ctx = ProgramContext {
        accounts: account_infos,
        program_id: accounts[0],
    };

    program_types::process_instruction(&ctx, instruction_data)
} 