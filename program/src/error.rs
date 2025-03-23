use arch_program::{
    program_error::ProgramError,
    msg,
};

use thiserror::Error;

#[derive(Error, Debug)]
pub enum OVTError {
    #[error("Invalid treasury key")]
    InvalidTreasuryKey,

    #[error("Invalid NAV update")]
    InvalidNAVUpdate,

    #[error("Invalid supply change")]
    InvalidSupplyChange,

    #[error("Invalid instruction data")]
    InvalidInstructionData,

    #[error("Invalid account data")]
    InvalidAccountData,

    #[error("Invalid authority")]
    InvalidAuthority,

    #[error("Invalid program state")]
    InvalidProgramState,

    #[error("Invalid Bitcoin transaction")]
    InvalidBitcoinTransaction,

    #[error("Network error")]
    NetworkError,

    #[error("Insufficient funds")]
    InsufficientFunds,

    #[error("Operation in progress")]
    OperationInProgress,

    #[error("Operation timeout")]
    OperationTimeout,

    #[error("Invalid signature")]
    InvalidSignature,

    #[error("Invalid block height")]
    InvalidBlockHeight,

    #[error("Invalid UTXO")]
    InvalidUTXO,
}

impl From<OVTError> for ProgramError {
    fn from(e: OVTError) -> Self {
        msg!("OVT Error: {}", e);
        ProgramError::Custom(e as u32)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_conversion() {
        let err = OVTError::InvalidTreasuryKey;
        let program_err: ProgramError = err.into();
        assert!(matches!(program_err, ProgramError::Custom(_)));
    }

    #[test]
    fn test_error_messages() {
        let err = OVTError::InvalidNAVUpdate;
        assert_eq!(err.to_string(), "Invalid NAV update");

        let err = OVTError::InvalidSupplyChange;
        assert_eq!(err.to_string(), "Invalid supply change");
    }
} 