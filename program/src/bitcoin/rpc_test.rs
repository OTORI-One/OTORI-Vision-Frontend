#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;
    use mockito::{mock, server_url};
    use bitcoin::consensus::encode;
    use bitcoin::hashes::hex::FromHex;
    use std::str::FromStr;
    use std::time::Duration;

    fn setup_test_client() -> BitcoinRpcClient {
        let config = BitcoinRpcConfig {
            endpoint: server_url().replace("http://", ""),
            port: 8332,
            username: "testuser".to_string(),
            password: "testpass".to_string(),
        };
        BitcoinRpcClient::new(config).unwrap()
    }

    #[tokio::test]
    async fn test_get_transaction() {
        let client = setup_test_client();
        let txid = "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b";
        
        // Mock response for getrawtransaction
        let mock_response = r#"{
            "result": "0100000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "error": null,
            "id": "1"
        }"#;

        mock("POST", "/")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(mock_response)
            .create();

        let result = client.get_transaction(txid).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_utxo_status() {
        let client = setup_test_client();
        let utxo = UtxoMeta {
            txid: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b".to_string(),
            vout: 0,
            amount_sats: 5000000000,
        };

        // Mock response for getrawtransaction
        mock("POST", "/")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{
                "result": "0100000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                "error": null,
                "id": "1"
            }"#)
            .create();

        // Mock response for gettxconfirmations
        mock("POST", "/")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{
                "result": 6,
                "error": null,
                "id": "1"
            }"#)
            .create();

        // Mock response for gettxout
        mock("POST", "/")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{
                "result": true,
                "error": null,
                "id": "1"
            }"#)
            .create();

        let result = client.get_utxo_status(&utxo).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), UtxoStatus::Active);
    }

    #[tokio::test]
    async fn test_get_best_block_hash() {
        let client = setup_test_client();
        
        // Mock response for getbestblockhash
        mock("POST", "/")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{
                "result": "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
                "error": null,
                "id": "1"
            }"#)
            .create();

        let result = client.get_best_block_hash().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_retry_logic() {
        let client = setup_test_client();
        let txid = "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b";

        // First two calls fail, third succeeds
        mock("POST", "/")
            .with_status(500)
            .times(2)
            .create();

        mock("POST", "/")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{
                "result": "0100000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                "error": null,
                "id": "1"
            }"#)
            .create();

        let result = client.get_transaction(txid).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_auth_error() {
        let client = setup_test_client();
        let txid = "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b";

        mock("POST", "/")
            .with_status(401)
            .create();

        let result = client.get_transaction(txid).await;
        assert!(matches!(result, Err(BitcoinRpcError::AuthError)));
    }
} 