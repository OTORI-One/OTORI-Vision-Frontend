use arch_program::{
    account::AccountInfo,
    program_error::ProgramError,
    pubkey::Pubkey,
    msg,
    program_pack::{Pack, Sealed},
};

use borsh::{BorshDeserialize, BorshSerialize};
use std::{rc::Rc, cell::RefCell};

// Define the Program trait
pub trait Program {
    fn process_instruction(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> Result<(), ProgramError>;
}

use crate::error::OVTError;
use crate::instructions::OVTInstruction;
use crate::utils::{create_program_account, initialize_account};

#[derive(BorshSerialize, BorshDeserialize)]
pub struct OVTProgram;

impl OVTProgram {
    pub fn new() -> Self {
        Self
    }
}

impl Default for OVTProgram {
    fn default() -> Self {
        Self::new()
    }
}

/// Program state storing NAV and treasury data
#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct OVTState {
    /// Current NAV in satoshis
    pub nav_sats: u64,
    /// Treasury Bitcoin public key bytes
    pub treasury_pubkey_bytes: [u8; 33],
    /// Total OVT supply (tracked from Runes)
    pub total_supply: u64,
    /// Last NAV update timestamp
    pub last_nav_update: u64,
    /// Network status
    pub network_status: NetworkStatus,
    /// Last synced Bitcoin block height
    pub last_sync_height: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum NetworkStatus {
    Syncing,
    Active,
    Error(String),
}

impl Sealed for OVTState {}

impl Pack for OVTState {
    const LEN: usize = std::mem::size_of::<Self>();

    fn pack_into_slice(&self, dst: &mut [u8]) {
        let data = borsh::to_vec(self).unwrap();
        dst[..data.len()].copy_from_slice(&data);
    }

    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        borsh::from_slice(src).map_err(|_| ProgramError::InvalidAccountData)
    }
}

impl OVTState {
    pub fn new(treasury_pubkey_bytes: [u8; 33]) -> Self {
        Self {
            nav_sats: 0,
            treasury_pubkey_bytes,
            total_supply: 0,
            last_nav_update: 0,
            network_status: NetworkStatus::Syncing,
            last_sync_height: 0,
        }
    }

    pub fn validate_nav_update(&self, new_nav_sats: u64) -> Result<(), ProgramError> {
        // Prevent zero NAV
        if new_nav_sats == 0 {
            return Err(OVTError::InvalidNAVUpdate.into());
        }

        // If this is the first update, allow any value
        if self.nav_sats == 0 {
            return Ok(());
        }

        // Calculate percentage change
        let change = if new_nav_sats > self.nav_sats {
            // For increases: Calculate percentage increase
            (new_nav_sats - self.nav_sats) * 100 / self.nav_sats
        } else {
            // For decreases: Calculate percentage decrease
            (self.nav_sats - new_nav_sats) * 100 / self.nav_sats
        };

        // For increases: limit to 400% (5x)
        // For decreases: limit to 80% (0.2x)
        if (new_nav_sats > self.nav_sats && change > 400) || 
           (new_nav_sats < self.nav_sats && change > 80) {
            return Err(OVTError::InvalidNAVUpdate.into());
        }

        Ok(())
    }

    pub fn update_nav(
        &mut self,
        btc_price_sats: u64,
        clock_info: &AccountInfo,
    ) -> Result<(), ProgramError> {
        // Get current timestamp from clock sysvar
        let clock_data = clock_info.try_borrow_data().map_err(|_| ProgramError::AccountBorrowFailed)?;
        let current_time = u64::from_le_bytes(clock_data[..8].try_into().map_err(|_| ProgramError::InvalidAccountData)?);

        // Ensure sufficient time has passed since last update (15 seconds minimum)
        if current_time - self.last_nav_update < 15 {
            return Err(OVTError::OperationTimeout.into());
        }

        // Validate the NAV update
        self.validate_nav_update(btc_price_sats)?;

        self.nav_sats = btc_price_sats;
        self.last_nav_update = current_time;
        Ok(())
    }

    pub fn process_buyback_burn(
        &mut self,
        payment_amount_sats: u64,
    ) -> Result<(), ProgramError> {
        // Verify payment amount is reasonable
        if payment_amount_sats == 0 || payment_amount_sats > 1_000_000_000 {
            return Err(OVTError::InvalidBitcoinTransaction.into());
        }

        // Calculate tokens to burn based on NAV
        let tokens_to_burn = (payment_amount_sats * self.total_supply) / self.nav_sats;
        if tokens_to_burn == 0 {
            return Err(OVTError::InsufficientFunds.into());
        }

        // Update total supply
        self.total_supply = self.total_supply.checked_sub(tokens_to_burn)
            .ok_or(OVTError::InvalidSupplyChange)?;

        Ok(())
    }
}

impl Program for OVTProgram {
    fn process_instruction(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> Result<(), ProgramError> {
        let instruction = OVTInstruction::try_from_slice(data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;
        
        match instruction {
            OVTInstruction::Initialize { treasury_pubkey_bytes } => {
                let state_info = accounts.get(0).ok_or(ProgramError::NotEnoughAccountKeys)?;
                let authority_info = accounts.get(1).ok_or(ProgramError::NotEnoughAccountKeys)?;
                let system_program = accounts.get(2).ok_or(ProgramError::NotEnoughAccountKeys)?;

                if !authority_info.is_signer {
                    return Err(ProgramError::MissingRequiredSignature);
                }

                // Create and initialize state account
                create_program_account(
                    program_id,
                    state_info,
                    authority_info,
                    OVTState::LEN as u64,
                    system_program,
                )?;

                // Initialize new state
                let state = OVTState::new(treasury_pubkey_bytes);
                let mut data = state_info.try_borrow_mut_data().map_err(|_| ProgramError::AccountBorrowFailed)?;
                Pack::pack_into_slice(&state, &mut data);
                Ok(())
            }
            OVTInstruction::UpdateNAV { btc_price_sats } => {
                let state_info = accounts.get(0).ok_or(ProgramError::NotEnoughAccountKeys)?;
                let authority_info = accounts.get(1).ok_or(ProgramError::NotEnoughAccountKeys)?;
                let clock_info = accounts.get(2).ok_or(ProgramError::NotEnoughAccountKeys)?;

                if !authority_info.is_signer {
                    return Err(ProgramError::MissingRequiredSignature);
                }

                let mut data = state_info.try_borrow_mut_data().map_err(|_| ProgramError::AccountBorrowFailed)?;
                let mut state: OVTState = Pack::unpack_from_slice(&data)?;
                state.update_nav(btc_price_sats, clock_info)?;
                Pack::pack_into_slice(&state, &mut data);
                Ok(())
            }
            OVTInstruction::BuybackBurn { payment_txid: _, payment_amount_sats } => {
                let state_info = accounts.get(0).ok_or(ProgramError::NotEnoughAccountKeys)?;
                let authority_info = accounts.get(1).ok_or(ProgramError::NotEnoughAccountKeys)?;

                if !authority_info.is_signer {
                    return Err(ProgramError::MissingRequiredSignature);
                }

                let mut data = state_info.try_borrow_mut_data().map_err(|_| ProgramError::AccountBorrowFailed)?;
                let mut state: OVTState = Pack::unpack_from_slice(&data)?;
                state.process_buyback_burn(payment_amount_sats)?;
                Pack::pack_into_slice(&state, &mut data);
                Ok(())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use arch_program::utxo::UtxoMeta;
    use std::{rc::Rc, cell::RefCell};
    
    // Static values for tests using static variables instead of LazyLock
    static mut TEST_NAV_SATS: u64 = 1_000_000;
    static mut TEST_SUPPLY: u64 = 1_000_000_000;
    
    // Helper function to create test account info
    fn create_test_account_info(data: &mut [u8]) -> AccountInfo {
        let key = Pubkey::new_unique();
        let owner = Pubkey::new_unique();
        let lamports = Rc::new(RefCell::new(100_000));
        let data = Rc::new(RefCell::new(data.to_vec()));
        
        AccountInfo {
            key: &key,
            is_signer: false,
            is_writable: true,
            lamports,
            data,
            owner: &owner,
            executable: false,
            rent_epoch: 0,
        }
    }

    #[test]
    fn test_nav_validation() {
        let mut state = OVTState {
            nav_sats: 1_000_000,
            treasury_pubkey_bytes: [0; 33],
            total_supply: 1_000_000,
            last_nav_update: 0,
            network_status: NetworkStatus::Syncing,
            last_sync_height: 0,
        };

        // First update at t = 16 (valid: enough time passed)
        let mut clock_data = 16u64.to_le_bytes();
        let clock_info = create_test_account_info(&mut clock_data);
        assert!(state.update_nav(2_000_000, &clock_info).is_ok()); // 100% increase - within 400% limit

        // Second update at t = 20 (invalid: too soon after first update)
        let mut clock_data = 20u64.to_le_bytes();
        let clock_info = create_test_account_info(&mut clock_data);
        assert!(state.update_nav(500_000, &clock_info).is_err()); // Should fail due to 15-second minimum delay

        // Third update at t = 32 (valid: enough time passed)
        let mut clock_data = 32u64.to_le_bytes();
        let clock_info = create_test_account_info(&mut clock_data);
        assert!(state.update_nav(8_000_000, &clock_info).is_ok()); // 300% increase - within 400% limit

        // Fourth update at t = 48 (valid time, invalid amount - too large increase)
        let mut clock_data = 48u64.to_le_bytes();
        let clock_info = create_test_account_info(&mut clock_data);
        assert!(state.update_nav(50_000_000, &clock_info).is_err()); // 525% increase - exceeds 400% limit

        // Fifth update at t = 64 (valid time, invalid amount - too large decrease)
        let mut clock_data = 64u64.to_le_bytes();
        let clock_info = create_test_account_info(&mut clock_data);
        assert!(state.update_nav(1_000_000, &clock_info).is_err()); // 87.5% decrease - exceeds 80% limit

        // Sixth update at t = 80 (valid time, valid amount - acceptable decrease)
        let mut clock_data = 80u64.to_le_bytes();
        let clock_info = create_test_account_info(&mut clock_data);
        assert!(state.update_nav(2_000_000, &clock_info).is_ok()); // 75% decrease - within 80% limit
    }

    #[test]
    fn test_supply_validation() {
        let mut state = OVTState {
            nav_sats: 1_000_000,
            treasury_pubkey_bytes: [0; 33],
            total_supply: 1_000_000,
            last_nav_update: 0,
            network_status: NetworkStatus::Syncing,
            last_sync_height: 0,
        };

        // Test valid changes
        assert!(state.process_buyback_burn(100_000).is_ok()); // 10% decrease
        assert!(state.process_buyback_burn(50_000).is_ok()); // 5% decrease

        // Test invalid changes
        assert!(state.process_buyback_burn(2_000_000).is_err()); // Too large
        assert!(state.process_buyback_burn(0).is_err()); // Zero amount
    }
} 