A pubkey, or public key, is a custom type that contains a 256-bit (32 bytes) integer derived from the private key.
```rust
#[derive(Clone, Debug, Eq, PartialEq, BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
pub struct Pubkey([u8; 32]);

```
pubkey.rs