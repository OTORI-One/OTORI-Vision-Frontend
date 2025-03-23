use arch_program::{
    account::AccountInfo,
    program_error::ProgramError,
    pubkey::Pubkey,
    msg,
    entrypoint,
    entrypoint::ProgramResult,
    program_pack::{Pack, Sealed},
    system_instruction,
};

use borsh::{BorshDeserialize, BorshSerialize};
use bitcoin::PublicKey;

use crate::{
    error::OVTError,
    instructions::OVTInstruction,
    state::OVTState,
    utils::{create_program_account, initialize_account},
    bitcoin::rpc::BitcoinRpcConfig,
};

// Program ID constant
pub const OVT_PROGRAM_ID: &str = "ovt1111111111111111111111111111111111111111";

// Define account seeds
pub const OVT_STATE_SEED: &[u8] = b"ovt_state";
pub const TREASURY_SEED: &[u8] = b"treasury";

// Network configuration
#[cfg(feature = "testnet")]
pub fn get_network_config() -> BitcoinRpcConfig {
    msg!("Using testnet4 configuration");
    BitcoinRpcConfig::testnet4()
}

#[cfg(not(feature = "testnet"))]
pub fn get_network_config() -> BitcoinRpcConfig {
    msg!("Using regtest configuration");
    BitcoinRpcConfig::regtest()
}

// Program entrypoint
entrypoint!(process_instruction);

/// Program entrypoint implementation
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("OVT program entrypoint");
    
    let instruction = OVTInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    
    // Create program context
    let context = Context {
        program_id: *program_id,
        accounts,
        network_config: get_network_config(),
    };
    
    // Process instruction
    match instruction {
        OVTInstruction::Initialize { treasury_pubkey_bytes } => {
            process_initialize(&context, treasury_pubkey_bytes)
        }
        OVTInstruction::UpdateNAV { btc_price_sats } => {
            process_update_nav(&context, btc_price_sats)
        }
        OVTInstruction::BuybackBurn { payment_txid, payment_amount_sats } => {
            process_buyback_burn(&context, &payment_txid, payment_amount_sats)
        }
    }
}

// Context struct for instruction processing
pub struct Context<'a> {
    pub program_id: Pubkey,
    pub accounts: &'a [AccountInfo<'a>],
    pub network_config: BitcoinRpcConfig,
}

impl<'a> Context<'a> {
    pub fn get(&self, index: usize) -> Result<&AccountInfo<'a>, ProgramError> {
        self.accounts
            .get(index)
            .ok_or(ProgramError::NotEnoughAccountKeys)
    }

    pub fn validate_network(&self) -> ProgramResult {
        #[cfg(feature = "testnet")]
        {
            msg!("Validating network: expecting testnet4");
            if self.network_config.network != "testnet4" {
                msg!("Network validation failed: expected testnet4, got {}", self.network_config.network);
                return Err(ProgramError::Custom(1)); // Invalid network
            }
        }

        #[cfg(not(feature = "testnet"))]
        {
            msg!("Validating network: expecting regtest");
            if self.network_config.network != "regtest" {
                msg!("Network validation failed: expected regtest, got {}", self.network_config.network);
                return Err(ProgramError::Custom(1)); // Invalid network
            }
        }

        Ok(())
    }
}

// Instruction processing functions
fn process_initialize(
    ctx: &Context,
    treasury_pubkey_bytes: [u8; 33],
) -> ProgramResult {
    let state_info = ctx.get(0)?;
    let authority_info = ctx.get(1)?;
    let system_program = ctx.get(2)?;

    if !authority_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Create and initialize state account
    create_program_account(
        &ctx.program_id,
        state_info,
        authority_info,
        std::mem::size_of::<OVTState>() as u64,
        system_program,
    )?;

    // Initialize new state
    let state = OVTState::new(treasury_pubkey_bytes);
    initialize_account(&ctx.program_id, state_info, &state)?;

    msg!("OVT program initialized");
    Ok(())
}

fn process_update_nav(
    ctx: &Context,
    btc_price_sats: u64,
) -> ProgramResult {
    let state_info = ctx.get(0)?;
    let authority_info = ctx.get(1)?;
    let clock_info = ctx.get(2)?;

    if !authority_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    msg!("Starting NAV update process...");
    let mut state: OVTState = state_info.get_data()?;
    
    // Validate the NAV update
    state.validate_nav_update(btc_price_sats)?;
    
    // Update state
    state.update_nav(btc_price_sats, clock_info)?;
    state_info.set_data(&state)?;

    msg!("NAV updated successfully");
    Ok(())
}

fn process_buyback_burn(
    ctx: &Context,
    payment_txid: &str,
    payment_amount_sats: u64,
) -> ProgramResult {
    let state_info = ctx.get(0)?;
    let authority_info = ctx.get(1)?;

    if !authority_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut state: OVTState = state_info.get_data()?;
    
    // Validate treasury and perform buyback burn
    state.validate_treasury()?;
    state.process_buyback_burn(payment_amount_sats)?;
    
    state_info.set_data(&state)?;
    
    msg!("Buyback burn processed successfully");
    Ok(())
} 