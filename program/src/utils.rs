use arch_program::{
    program_error::ProgramError,
    account::AccountInfo,
    pubkey::Pubkey,
    msg,
};
use borsh::BorshSerialize;

pub fn create_program_account(
    _program_id: &Pubkey,
    _account: &AccountInfo,
    _payer: &AccountInfo,
    _size: u64,
    _system_program: &AccountInfo,
) -> Result<(), ProgramError> {
    // In a real implementation, this would create an account
    // For testing, we'll assume the account already exists
    Ok(())
}

pub fn initialize_account<T: BorshSerialize>(
    _program_id: &Pubkey,
    account: &AccountInfo,
    data: &T,
) -> Result<(), ProgramError> {
    // Initialize the account with the provided data
    let data_bytes = borsh::to_vec(data).map_err(|_| ProgramError::InvalidArgument)?;
    
    // Get account data
    let mut account_data = account.try_borrow_mut_data()?;
    
    // Check if there's enough space
    if account_data.len() < data_bytes.len() {
        msg!("Account data buffer too small");
        return Err(ProgramError::AccountDataTooSmall);
    }
    
    // Copy data into the account
    account_data[..data_bytes.len()].copy_from_slice(&data_bytes);
    
    Ok(())
} 