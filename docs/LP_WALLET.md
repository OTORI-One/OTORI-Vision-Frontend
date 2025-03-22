# OTORI Liquidity Pool (LP) Wallet Documentation

This document explains the LP wallet functionality, how to use it, and how to distribute Runes tokens to it for trading simulation.

## Overview

The Liquidity Pool (LP) wallet is a specialized wallet that holds Runes tokens for simulating trading activities. It maintains a balance of both OTORI•VISION•TOKEN (OVT) and testnet Bitcoin to facilitate trades.

Key features:
- Holds a designated portion (typically 10%) of the total OVT supply
- Used for simulating buy/sell orders
- Maintains pricing information for OVT/BTC trading pair
- Tracks liquidity metrics

## LP Wallet Address

The LP wallet uses a designated Taproot address where the liquidity tokens are stored:

```
LP_ADDRESS="tb1plp_placeholder_address" # Replace with your actual LP wallet address
```

This address should be updated in the appropriate environment variables or configuration files before running the distribution scripts.

## Distribution Scripts

### `distribute_lp_runes.js`

This script automates the process of distributing Runes tokens to the LP wallet. It prepares PSBTs, handles wallet signing, and tracks distribution progress.

Usage:
```bash
# Basic usage with default values
node scripts/distribute_lp_runes.js

# Customized usage with environment variables
export API_BASE_URL="http://localhost:3030"
export RUNE_ID="240249:101"
export LP_ADDRESS="tb1pyour_actual_lp_address"
export AMOUNT="210000"
export BATCH_SIZE="50000"
node scripts/distribute_lp_runes.js
```

The script will:
1. Connect to the Runes API
2. Check current distribution statistics
3. Calculate how many tokens need to be distributed
4. Generate PSBTs for the distribution
5. Save the PSBTs to files
6. Estimate fees for the transactions
7. Guide you through signing and broadcasting

### `manage_lp_psbts.js`

This script helps with managing and processing PSBTs for the LP wallet. It provides various utilities for working with PSBTs.

Usage:
```bash
# Basic usage with default values
node scripts/manage_lp_psbts.js

# Customized usage with environment variables
export DATA_DIR="./my-psbts"
export BITCOIN_CLI_PATH="/path/to/bitcoin-cli"
export NETWORK="testnet"
export WALLET_NAME="lp_wallet"
node scripts/manage_lp_psbts.js
```

Features:
- List all PSBTs in the data directory
- Process specific PSBTs (analyze, sign, broadcast)
- Batch process all unsigned PSBTs
- Check wallet status

## API Endpoints

The following API endpoints are available for interacting with the LP wallet:

### `/rune/:id/balances`

Returns the balances of all addresses holding the specified rune, including the LP wallet.

Example response:
```json
{
  "success": true,
  "balances": [
    {
      "address": "tb1ptreasury...",
      "amount": 1680000,
      "isTreasury": true,
      "isLP": false
    },
    {
      "address": "tb1plp...",
      "amount": 210000,
      "isTreasury": false,
      "isLP": true
    },
    {
      "address": "tb1pexampleaddress1",
      "amount": 105000,
      "isTreasury": false,
      "isLP": false
    }
  ]
}
```

### `/rune/:id/distribution`

Returns distribution statistics for the rune, including LP wallet allocation.

Example response:
```json
{
  "success": true,
  "distributionStats": {
    "totalSupply": 2100000,
    "treasuryHeld": 1680000,
    "lpHeld": 210000,
    "distributed": 210000,
    "percentDistributed": 10,
    "percentInLP": 10,
    "treasuryAddresses": ["tb1ptreasury..."],
    "lpAddresses": ["tb1plp..."],
    "distributionEvents": [
      {
        "txid": "lpallocation1",
        "amount": 210000,
        "timestamp": 1621459200000,
        "recipient": "tb1plp...",
        "type": "lp_allocation"
      }
    ]
  }
}
```

### `/rune/:id/lp-info`

Returns detailed information about the LP wallet's liquidity and trading activity.

Example response:
```json
{
  "success": true,
  "lpInfo": {
    "address": "tb1plp...",
    "liquidity": {
      "ovt": 210000,
      "btcSats": 52500000,
      "impactMultiplier": 0.00001
    },
    "pricing": {
      "currentPriceSats": 250,
      "lastTradeTime": 1621459200000,
      "dailyVolume": 15000,
      "weeklyVolume": 45000
    },
    "transactions": [
      {
        "txid": "mock_trade_1",
        "type": "buy",
        "amount": 5000,
        "priceSats": 245,
        "timestamp": 1621459200000
      }
    ]
  }
}
```

## How to Set Up the LP Wallet

1. Create a new Bitcoin Core wallet (testnet):
   ```bash
   bitcoin-cli -testnet createwallet lp_wallet
   ```

2. Generate a new Taproot address:
   ```bash
   bitcoin-cli -testnet -rpcwallet=lp_wallet getnewaddress "" "bech32m"
   ```

3. Update the LP_ADDRESS constant in the appropriate files:
   - `OTORI-Vision-Frontend/scripts/runes_API.js`
   - `OTORI-Vision-Frontend/src/lib/runeClient.ts`
   - Environment variables for your deployment

4. Fund the wallet with testnet Bitcoin:
   - You'll need approximately 0.01 tBTC per 100,000 OVT tokens distributed
   - Use a testnet faucet to get testnet Bitcoin

5. Run the distribution script to allocate OVT tokens to the LP wallet:
   ```bash
   node scripts/distribute_lp_runes.js
   ```

## Testnet Bitcoin Requirements

For distributing OVT to the LP wallet, you'll need testnet Bitcoin to cover:

1. **Transaction fees**: Typically 1000 sats per transaction
2. **Dust outputs**: 546 sats per output
3. **Buffer**: Additional 20% for network fee fluctuations

The script `estimateTestnetBTCNeeded()` in the RuneClient class calculates these requirements based on the distribution amount and recipient count.

Example calculation for distributing 210,000 OVT to one LP wallet address:
- Base fee: 1,000 sats
- Dust output: 546 sats
- Buffer (20%): 200 sats
- **Total estimated requirement**: 1,746 sats (0.00001746 tBTC)

In practice, you should fund the treasury wallet with at least 0.001 tBTC to ensure smooth operation. 