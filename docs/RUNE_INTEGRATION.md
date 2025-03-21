# OVT Rune Integration

This document describes the integration of the OTORI Vision Token (OVT) with Bitcoin's Runes protocol on signet.

## Overview

The OVT token is now implemented as a Bitcoin Rune on signet, which provides the following benefits:

1. **Direct Bitcoin integration**: OVT tokens exist directly on Bitcoin's signet as Runes
2. **Enhanced security**: Leverages Bitcoin's security for token operations
3. **Verifiable supply**: Token supply can be independently verified on-chain
4. **Permissionless transfers**: Tokens can be transferred peer-to-peer without intermediaries

## Components

The implementation consists of the following components:

1. **Etching Script**: `scripts/etch-ovt-rune.js` - Creates the initial OVT rune on signet [DEPRECATED] **MANUALLY ETCHED AND MINTED with 21M supply on 20th March.**
2. **Minting Script**: `scripts/mint-ovt-rune.js` - Mints additional OVT tokens as needed [DEPRECATED] **MANUALLY ETCHED AND MINTED on 20th March.**
3. **RuneInfo Component**: `src/components/RuneInfo.tsx` - Displays rune information
4. **API Endpoints**:
   - `/api/rune-info` - Fetches rune data from the Bitcoin node
   - `/api/mint-rune` - API for minting new tokens (requires signatures)
   - `/api/mock/rune-data` - Serves mock data in development/hybrid mode

## Configuration

The following environment variables can be used to configure the rune integration:

```
# Bitcoin Core CLI path (optional, defaults to 'bitcoin-cli')
BITCOIN_CLI_PATH=/usr/local/bin/bitcoin-cli

# Bitcoin network (required)
NEXT_PUBLIC_BITCOIN_NETWORK=signet

# Bitcoin wallet (optional, uses default wallet if not specified)
BITCOIN_WALLET=ovt-wallet

# Data source control
NEXT_PUBLIC_MOCK_MODE=hybrid
NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE=real
```

## Deployment Process

### 1. Prerequisites

- Bitcoin Core running on signet
- RPC access to Bitcoin Core configured
- Sufficient signet BTC in the wallet

### 2. Bitcoin Core Setup

Update your `bitcoin.conf` to enable RPC access and signet:

```
server=1
txindex=1
signet=1
rpcuser=<your-username>
rpcpassword=<your-password>
rpcbind=0.0.0.0
rpcallowip=127.0.0.1
```

Create a wallet (if not using the default):

```bash
bitcoin-cli -signet createwallet "ovt-wallet"
```

### 3. Create and Fund Addresses

Generate addresses for treasury operations:

```bash
bitcoin-cli -signet -rpcwallet=ovt-wallet getnewaddress "OVT Treasury"
```

Fund your signet wallet with test coins from a signet faucet or mining.

### 4. Etch the OVT Rune

Run the following command to etch the OVT rune:

```bash
cd OTORI-Vision-Frontend
node scripts/etch-ovt-rune.js --symbol OVT --supply 500000 --decimals 0
```

This will:
- Create a transaction on signet that etches a new rune
- Save the rune information to `src/mock-data/rune-data.json`
- Output the transaction ID of the etch transaction

### 5. Update Environment Variables

Update your `.env.local` file with the following:

```
NEXT_PUBLIC_MOCK_MODE=hybrid
NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE=real
NEXT_PUBLIC_BITCOIN_NETWORK=signet
BITCOIN_CLI_PATH=/usr/local/bin/bitcoin-cli  # Adjust path as needed
BITCOIN_WALLET=ovt-wallet                    # Adjust wallet name as needed
```

### 6. Deploy Frontend

Deploy the frontend with updated rune support:

```bash
cd OTORI-Vision-Frontend
npm run build
npm start
```

## Testing

### Unit Tests

Run the unit tests for the rune implementation:

```bash
npm test -- -t "RuneInfo"
```

### Manual Testing

1. **Verify Rune Info Display**
   - Navigate to the dashboard
   - Check that the RuneInfo component displays the correct OVT rune information
   - Verify that the status shows "Etched" if the rune was etched successfully

2. **Test Minting (Admin Only)**
   - Navigate to the admin panel
   - Try minting additional OVT tokens
   - Verify that signatures are required
   - Check that the minted tokens appear in the total supply

3. **Test Hybrid Mode**
   - Set `NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE=mock` temporarily
   - Verify that mock data is displayed instead of real data
   - Set `NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE=real` again
   - Verify that real data is displayed

## Troubleshooting

### Common Issues

1. **"Bitcoin CLI not found" error**
   - Ensure that `bitcoin-cli` is in your PATH or configure `BITCOIN_CLI_PATH`
   - Verify that Bitcoin Core is running

2. **"No suitable UTXOs found" error**
   - Fund your wallet with more signet BTC
   - Try using a different wallet

3. **"Rune with name OVT not found" error**
   - Verify that the rune was etched successfully
   - Check that you're on the correct network (signet)

4. **"Failed to fetch rune data from API" error**
   - Ensure Bitcoin Core is running and accessible
   - Check that RPC credentials are correct

### Logs

Logs for rune operations are stored in the `logs` directory:

- Etching logs: `logs/etch-ovt-rune-*.log`
- Minting logs: `logs/mint-ovt-rune-*.log`

Check these logs for detailed error information.

## Future Enhancements

1. **Direct Wallet Integration**: Allow connecting external Bitcoin wallets that support Runes
2. **Transaction History**: Add detailed transaction history for OVT tokens
3. **Burn Functionality**: Implement token burning for buyback operations
4. **Multi-signature Requirements**: Enhance security with threshold signatures for minting
5. **Real-time Updates**: Add WebSocket updates for token supply and transactions

## References

- [Bitcoin Runes Specification](https://github.com/casey/ord/blob/master/bip.mediawiki)
- [Bitcoin Core RPC API](https://developer.bitcoin.org/reference/rpc/)
- [Signet Documentation](https://en.bitcoin.it/wiki/Signet) 