use arch_program::{
    account::AccountMeta,
    instruction::Instruction,
    pubkey::Pubkey,
    program_error::ProgramError,
};

use borsh::{BorshDeserialize, BorshSerialize};

pub const OVT_PROGRAM_ID: &str = "aa00000000000000000000000000000000000000000000000000000000000000";

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum OVTInstruction {
    /// Initialize the OVT program state
    /// 
    /// Accounts expected:
    /// 0. `[writable]` The state account to initialize
    /// 1. `[signer]` The authority account that pays for the initialization
    /// 2. `[]` The system program
    Initialize {
        treasury_pubkey_bytes: [u8; 33],
    },

    /// Update the NAV value
    /// 
    /// Accounts expected:
    /// 0. `[writable]` The state account
    /// 1. `[signer]` The authority account
    /// 2. `[]` The clock sysvar
    UpdateNAV {
        btc_price_sats: u64,
    },

    /// Process a buyback and burn operation
    /// 
    /// Accounts expected:
    /// 0. `[writable]` The state account
    /// 1. `[signer]` The authority account
    BuybackBurn {
        payment_txid: String,
        payment_amount_sats: u64,
    },
}

impl OVTInstruction {
    fn program_id() -> Pubkey {
        let program_id_bytes = hex::decode(OVT_PROGRAM_ID).expect("Invalid program ID");
        Pubkey::try_from_slice(&program_id_bytes).expect("Invalid program ID bytes")
    }

    pub fn initialize(treasury_pubkey_bytes: [u8; 33]) -> Instruction {
        let data = borsh::to_vec(&OVTInstruction::Initialize { treasury_pubkey_bytes })
            .expect("Failed to serialize instruction");

        Instruction {
            program_id: Self::program_id(),
            accounts: vec![
                AccountMeta::new(Pubkey::new_unique(), false), // state account
                AccountMeta::new(Pubkey::new_unique(), true),  // authority
                AccountMeta::new(Pubkey::system_program(), false), // system program
            ],
            data,
        }
    }

    pub fn update_nav(btc_price_sats: u64) -> Instruction {
        let data = borsh::to_vec(&OVTInstruction::UpdateNAV { btc_price_sats })
            .expect("Failed to serialize instruction");

        Instruction {
            program_id: Self::program_id(),
            accounts: vec![
                AccountMeta::new(Pubkey::new_unique(), false), // state account
                AccountMeta::new(Pubkey::new_unique(), true),  // authority
                AccountMeta::new_readonly(Pubkey::new_unique(), false), // clock sysvar
            ],
            data,
        }
    }

    pub fn buyback_burn(payment_txid: String, payment_amount_sats: u64) -> Instruction {
        let data = borsh::to_vec(&OVTInstruction::BuybackBurn {
            payment_txid,
            payment_amount_sats,
        })
        .expect("Failed to serialize instruction");

        Instruction {
            program_id: Self::program_id(),
            accounts: vec![
                AccountMeta::new(Pubkey::new_unique(), false), // state account
                AccountMeta::new(Pubkey::new_unique(), true),  // authority
            ],
            data,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instruction_creation() {
        let treasury_pubkey_bytes = [0u8; 33];

        // Test Initialize instruction
        let init_ix = OVTInstruction::initialize(treasury_pubkey_bytes);
        assert_eq!(init_ix.accounts.len(), 3);

        // Test UpdateNAV instruction
        let update_nav_ix = OVTInstruction::update_nav(1_000_000);
        assert_eq!(update_nav_ix.accounts.len(), 3);

        // Test BuybackBurn instruction
        let buyback_burn_ix = OVTInstruction::buyback_burn("txid123".to_string(), 1_000_000);
        assert_eq!(buyback_burn_ix.accounts.len(), 2);
    }
} 