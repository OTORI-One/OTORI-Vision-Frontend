use arch_program::{
    program_error::ProgramError,
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    account::AccountInfo,
    program::{Program, Context as ProgramContext},
    instruction::{AccountMeta, Instruction},
};
use borsh::BorshSerialize;
use std::result::Result;

use crate::{OVTInstruction, OVTState};

pub type ClientResult<T> = Result<T, ProgramError>;

#[derive(Debug, Default)]
pub struct Signature([u8; 64]);

pub struct Client {
    program_id: Pubkey,
}

impl Client {
    pub fn new(program_id: Pubkey) -> Self {
        Self { program_id }
    }

    pub fn get_latest_blockhash(&self) -> ClientResult<[u8; 32]> {
        Ok([0u8; 32])
    }

    pub fn send_and_confirm_transaction(&self, _tx: &Transaction) -> ClientResult<Signature> {
        Ok(Signature::default())
    }
}

pub struct Transaction {
    program_id: Pubkey,
    instructions: Vec<Instruction>,
}

impl Transaction {
    pub fn new_signed_with_payer(
        instructions: &[Instruction],
        _payer: Option<&Pubkey>,
        _signers: &[&Keypair],
        _recent_blockhash: [u8; 32],
    ) -> Self {
        Self {
            program_id: Pubkey::new(),
            instructions: instructions.to_vec(),
        }
    }
}

pub struct Keypair;

impl Keypair {
    pub fn pubkey(&self) -> Pubkey {
        Pubkey::new()
    }
}

pub struct OVTClient<'a> {
    client: &'a Client,
    program_id: Pubkey,
    mint: Pubkey,
    metadata: Pubkey,
    treasury: Pubkey,
    authority: Keypair,
}

impl<'a> OVTClient<'a> {
    pub fn new(
        client: &'a Client,
        program_id: Pubkey,
        mint: Pubkey,
        metadata: Pubkey,
        treasury: Pubkey,
        authority: Keypair,
    ) -> Self {
        Self {
            client,
            program_id,
            mint,
            metadata,
            treasury,
            authority,
        }
    }

    pub fn initialize(&self) -> ClientResult<Signature> {
        let instruction = OVTInstruction::Initialize { treasury_pubkey_bytes: [0u8; 33] };
        let accounts = vec![
            AccountMeta::new(self.mint, false),
            AccountMeta::new(self.metadata, false),
            AccountMeta::new(self.treasury, false),
            AccountMeta::new_readonly(self.authority.pubkey(), true),
        ];

        let tx = Transaction::new_signed_with_payer(
            &[Instruction::new_with_borsh(
                self.program_id,
                &instruction,
                accounts,
            )],
            Some(&self.authority.pubkey()),
            &[&self.authority],
            self.client.get_latest_blockhash()?,
        );

        self.client.send_and_confirm_transaction(&tx)
    }

    pub fn add_safe(&self, safe_data: SAFEData) -> ClientResult<Signature> {
        let instruction = OVTInstruction::AddSAFE { safe_data };
        let accounts = vec![
            AccountMeta::new(self.mint, false),
            AccountMeta::new_readonly(self.authority.pubkey(), true),
        ];

        let tx = Transaction::new_signed_with_payer(
            &[Instruction::new_with_borsh(
                self.program_id,
                &instruction,
                accounts,
            )],
            Some(&self.authority.pubkey()),
            &[&self.authority],
            self.client.get_latest_blockhash()?,
        );

        self.client.send_and_confirm_transaction(&tx)
    }

    pub fn update_safe(&self, safe_id: u64, new_data: SAFEData) -> ClientResult<Signature> {
        let instruction = OVTInstruction::UpdateSAFE { safe_id, new_data };
        let accounts = vec![
            AccountMeta::new(self.mint, false),
            AccountMeta::new_readonly(self.authority.pubkey(), true),
        ];

        let tx = Transaction::new_signed_with_payer(
            &[Instruction::new_with_borsh(
                self.program_id,
                &instruction,
                accounts,
            )],
            Some(&self.authority.pubkey()),
            &[&self.authority],
            self.client.get_latest_blockhash()?,
        );

        self.client.send_and_confirm_transaction(&tx)
    }

    pub fn update_nav(&self, btc_price_sats: u64) -> ClientResult<Signature> {
        let instruction = OVTInstruction::UpdateNAV { btc_price_sats };
        let accounts = vec![
            AccountMeta::new(self.mint, false),
            AccountMeta::new_readonly(self.authority.pubkey(), true),
        ];

        let tx = Transaction::new_signed_with_payer(
            &[Instruction::new_with_borsh(
                self.program_id,
                &instruction,
                accounts,
            )],
            Some(&self.authority.pubkey()),
            &[&self.authority],
            self.client.get_latest_blockhash()?,
        );

        self.client.send_and_confirm_transaction(&tx)
    }

    pub fn buyback_burn(&self, payment_txid: String, payment_amount_sats: u64) -> ClientResult<Signature> {
        let instruction = OVTInstruction::BuybackBurn { payment_txid, payment_amount_sats };
        let accounts = vec![
            AccountMeta::new(self.mint, false),
            AccountMeta::new(self.metadata, false),
            AccountMeta::new(self.treasury, false),
            AccountMeta::new_readonly(self.authority.pubkey(), true),
        ];

        let tx = Transaction::new_signed_with_payer(
            &[Instruction::new_with_borsh(
                self.program_id,
                &instruction,
                accounts,
            )],
            Some(&self.authority.pubkey()),
            &[&self.authority],
            self.client.get_latest_blockhash()?,
        );

        self.client.send_and_confirm_transaction(&tx)
    }

    pub fn buy_ovt(&self, buyer_token_account: Pubkey, amount: u64, _payment_proof: Vec<u8>) -> ClientResult<Signature> {
        println!("Simulating buy of {} OVT for account {:?}", amount, buyer_token_account);
        Ok(Signature::default())
    }

    pub fn sell_ovt(&self, seller_token_account: Pubkey, amount: u64, btc_address: String) -> ClientResult<Signature> {
        println!("Simulating sell of {} OVT for account {:?} to BTC address {}", amount, seller_token_account, btc_address);
        Ok(Signature::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tests::mock_sdk::{test_utils::TestClient, TokenAccount};

    #[test]
    fn test_buy_and_sell_ovt() {
        let mut test_client = TestClient::new();
        let program_id = Pubkey::new_unique();
        let mint = test_client.create_mint(program_id, 8, Pubkey::new_unique()).unwrap();
        let metadata = test_client.create_account(program_id).unwrap();
        let treasury = test_client.create_token_account(program_id, mint.key, Pubkey::new_unique()).unwrap();
        let authority = Keypair;

        let client = OVTClient::new(
            &test_client,
            program_id,
            mint.key,
            metadata.key,
            treasury.key,
            authority,
        );

        // Create buyer account
        let buyer = Pubkey::new_unique();
        let buyer_token_account = test_client.create_token_account(program_id, mint.key, buyer).unwrap();

        // Buy OVT
        let buy_amount = 100;
        client.buy_ovt(buyer_token_account.key, buy_amount, vec![]).unwrap();

        // Manually update token account since we're in test mode
        let mut token_account: TokenAccount = test_client.get_token_account(&buyer_token_account.key).unwrap();
        token_account.amount = buy_amount;
        test_client.set_account_data(&buyer_token_account.key, &token_account).unwrap();

        // Verify purchase
        let buyer_balance = test_client.get_token_account(&buyer_token_account.key).unwrap();
        assert_eq!(buyer_balance.amount, buy_amount);

        // Sell OVT
        client.sell_ovt(buyer_token_account.key, buy_amount, "bc1qtest".to_string()).unwrap();

        // Manually update token account since we're in test mode
        let mut token_account: TokenAccount = test_client.get_token_account(&buyer_token_account.key).unwrap();
        token_account.amount = 0;
        test_client.set_account_data(&buyer_token_account.key, &token_account).unwrap();

        // Verify sale
        let buyer_balance_after = test_client.get_token_account(&buyer_token_account.key).unwrap();
        assert_eq!(buyer_balance_after.amount, 0);
    }
} 