use arch_program::{
    program_error::ProgramError,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    account::AccountInfo,
    system::instruction as system_instruction,
    sysvar::rent,
    log::msg,
};
use borsh::BorshSerialize;

pub fn create_program_account(
    program_id: &Pubkey,
    account: &AccountInfo,
    payer: &AccountInfo,
    space: u64,
    system_program: &AccountInfo,
) -> ProgramResult {
    let rent = rent::get_minimum_balance(space);
    
    let create_account = system_instruction::create_account(
        payer.key,
        account.key,
        rent,
        space,
        program_id,
    );

    system_instruction::invoke(
        &create_account,
        &[payer.clone(), account.clone(), system_program.clone()],
    )
}

pub fn initialize_account<T: BorshSerialize>(
    program_id: &Pubkey,
    account: &AccountInfo,
    state: &T,
) -> ProgramResult {
    if account.owner != program_id {
        return Err(ProgramError::IllegalOwner);
    }

    account.set_data(state)
} 