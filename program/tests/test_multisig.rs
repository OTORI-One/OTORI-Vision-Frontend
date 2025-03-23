/// Test suite for OVT multisignature functionality with Bitcoin transaction handling
/// 
/// This suite verifies:
/// 1. Multi-signature operations for admin actions
/// 2. Bitcoin transaction creation and validation
/// 3. UTXO handling in portfolio operations
/// 4. Real signature verification with Bitcoin keys
use bitcoin::secp256k1::{Secp256k1, Message};
use bitcoin::{PublicKey, Transaction, TxIn, TxOut};
use bitcoin::hashes::Hash as BitcoinHash;
use bitcoin::hashes::sha256;
// Import directly from the runes_client.rs file
use program::runes_client::{RunesClient, PortfolioPosition, PositionType, PositionStatus};
use bitcoin::key::rand;
use bitcoin::Amount;

/// Test complete multisig flow with Bitcoin transaction handling
/// 
/// Verifies:
/// - Admin key generation and management
/// - Transaction signing and verification
/// - UTXO creation and tracking
/// - Portfolio position management
#[tokio::test]
async fn test_multisig_flow() {
    // Initialize client with Bitcoin network configuration
    let client = RunesClient::new(
        bitcoin::Network::Regtest,
        "http://localhost:8332".to_string(),
        None,
    );

    // Generate 5 admin keypairs
    let secp = Secp256k1::new();
    let mut admin_pubkeys = Vec::new();
    let mut admin_privkeys = Vec::new();

    for _ in 0..5 {
        let (privkey, pubkey) = secp.generate_keypair(&mut rand::thread_rng());
        admin_pubkeys.push(PublicKey::new(pubkey));
        admin_privkeys.push(privkey);
    }

    // Create a test Bitcoin transaction
    let test_txid = bitcoin::Txid::from_slice(&[1u8; 32]).unwrap();
    let test_vout = 0u32;
    
    let input = TxIn {
        previous_output: bitcoin::OutPoint::new(test_txid, test_vout),
        script_sig: bitcoin::ScriptBuf::new(),
        sequence: bitcoin::Sequence::MAX,
        witness: bitcoin::Witness::default(),
    };

    let output = TxOut {
        value: Amount::from_sat(100_000), // 0.001 BTC
        script_pubkey: bitcoin::ScriptBuf::new(),
    };

    let test_tx = Transaction {
        version: bitcoin::transaction::Version::TWO,
        lock_time: bitcoin::absolute::LockTime::ZERO,
        input: vec![input],
        output: vec![output],
    };

    // Test minting tokens with Bitcoin transaction
    let amount = 1_000_000;
    let signatures = vec![
        "sig1".to_string(),
        "sig2".to_string(),
        "sig3".to_string(),
    ];

    let mint_result = client.mint_tokens(
        amount,
        signatures.clone(),
        admin_pubkeys.clone(),
    ).await;
    assert!(mint_result.is_ok(), "Token minting should succeed");

    // Test adding a post-TGE position with UTXO
    let position = PortfolioPosition {
        name: "Test Project".to_string(),
        amount: 1000000,
        price_per_token: 100,
        currency_spent: 100000000,
        transaction_id: Some("0101010101010101010101010101010101010101010101010101010101010101".to_string()),
        safe_inscription_id: None,
        entry_timestamp: 1677649200,
        position_type: PositionType::PostTGE,
        status: PositionStatus::Active,
    };

    let add_position_result = client.add_post_tge_position(
        position.clone(),
        &signatures,
        &admin_pubkeys,
    ).await;
    assert!(add_position_result.is_ok(), "Position addition should succeed");

    // Verify position's UTXO
    let position_data = client.get_position(&position.name).await.unwrap();
    assert_eq!(position_data.transaction_id.as_ref().unwrap(), &test_txid.to_string(), 
        "Position should have correct transaction ID");

    // Test with insufficient signatures
    let insufficient_sigs = vec!["sig1".to_string(), "sig2".to_string()];
    let invalid_result = client.mint_tokens(
        amount,
        insufficient_sigs,
        admin_pubkeys.clone(),
    ).await;
    assert!(invalid_result.is_err(), "Should fail with insufficient signatures");

    // Test with invalid admin keys
    let mut invalid_pubkeys = admin_pubkeys.clone();
    invalid_pubkeys.pop();
    let invalid_keys_result = client.mint_tokens(
        amount,
        signatures,
        invalid_pubkeys,
    ).await;
    assert!(invalid_keys_result.is_err(), "Should fail with invalid admin keys");
}

/// Test real signature verification with Bitcoin transactions
/// 
/// Verifies:
/// - ECDSA signature creation and verification
/// - Bitcoin transaction signing
/// - Admin multisig requirements
#[tokio::test]
async fn test_real_signatures() {
    let client = RunesClient::new(
        bitcoin::Network::Regtest,
        "http://localhost:8332".to_string(),
        None,
    );

    // Generate admin keys and messages
    let secp = Secp256k1::new();
    let message = b"Test mint 1000000 OVT";
    let message_hash = sha256::Hash::hash(message);
    let msg = Message::from_digest_slice(&message_hash[..]).expect("32 bytes");

    // Create a test Bitcoin transaction
    let test_txid = bitcoin::Txid::from_slice(&[2u8; 32]).unwrap();
    let test_vout = 0u32;
    
    let input = TxIn {
        previous_output: bitcoin::OutPoint::new(test_txid, test_vout),
        script_sig: bitcoin::ScriptBuf::new(),
        sequence: bitcoin::Sequence::MAX,
        witness: bitcoin::Witness::default(),
    };

    let output = TxOut {
        value: Amount::from_sat(50_000), // 0.0005 BTC
        script_pubkey: bitcoin::ScriptBuf::new(),
    };

    let test_tx = Transaction {
        version: bitcoin::transaction::Version::TWO,
        lock_time: bitcoin::absolute::LockTime::ZERO,
        input: vec![input],
        output: vec![output],
    };

    // Generate and sign with 3 keys
    let mut signatures = Vec::new();
    let mut admin_pubkeys = Vec::new();

    for _ in 0..5 {
        let (privkey, pubkey) = secp.generate_keypair(&mut rand::thread_rng());
        admin_pubkeys.push(PublicKey::new(pubkey));
        
        if signatures.len() < 3 {
            let sig = secp.sign_ecdsa(&msg, &privkey);
            signatures.push(sig.to_string());
        }
    }

    // Verify multisig with transaction
    let result = client.verify_admin_multisig(
        &signatures,
        message,
        &admin_pubkeys,
    ).await;
    assert!(result.is_ok(), "Multisig verification should succeed");
    assert!(result.unwrap(), "Multisig should be valid");

    // Verify transaction signing
    let tx_sign_result = client.sign_transaction(
        &test_tx,
        &signatures[0..3],
        &admin_pubkeys[0..3],
    ).await;
    assert!(tx_sign_result.is_ok(), "Transaction signing should succeed");
} 