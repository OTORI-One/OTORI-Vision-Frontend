pub mod utxo;
pub mod cache;

// Conditionally import the right implementation
#[cfg(target_arch = "wasm32")]
pub mod mock;

#[cfg(target_arch = "wasm32")]
pub use mock::*;

#[cfg(not(target_arch = "wasm32"))]
pub mod rpc;

#[cfg(not(target_arch = "wasm32"))]
pub use rpc::*;
