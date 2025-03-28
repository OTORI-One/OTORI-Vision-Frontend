Navigation: Reference → Program → Account Structure

For a comprehensive guide on working with accounts, see the Account Guide.

Accounts are a fundamental data structure in Arch that store state and are owned by [programs]. Each account has a unique address ([pubkey]) and contains data that can be modified by its owner program.

Account Structure
```rust
#[derive(Clone)]
#[repr(C)]
pub struct AccountInfo<'a> {
    pub key: &'a Pubkey, // address of the account
    pub utxo: &'a UtxoMeta, // utxo has this account key in script_pubkey
    pub data: Rc<RefCell<&'a mut [u8]>>, 
    pub owner: &'a Pubkey, 
    pub is_signer: bool,
    pub is_writable: bool,
    pub is_executable: bool, // true: program; false: data account
}
AccountMeta
#[derive(Debug, PartialEq, Eq, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
#[repr(C)]
pub struct AccountMeta {
    pub pubkey: Pubkey,
    pub is_signer: bool,
    pub is_writable: bool,
}
```

(account.rs)[https://github.com/Arch-Network/arch-examples/blob/main/program/src/account.rs]