# ORD Commands for OTORI

This document contains correct command syntax for using the `ord` tool with Bitcoin Core v28.1.0 on Signet.

## Actual Command Syntax

Based on the actual `--help` output for ord commands:

```bash
# Mint a rune
ord wallet mint --fee-rate <FEE_RATE> --rune <RUNE> [--postage <POSTAGE>] [--destination <DESTINATION>]

# Create an inscription
ord wallet inscribe --fee-rate <FEE_RATE> --file <FILE> [--destination <DESTINATION>] [--dry-run]

# Batch create inscriptions and runes
ord wallet batch --fee-rate <FEE_RATE> --batch <BATCH_FILE> [--dry-run]
```

## Connection Issues

We've encountered persistent connection issues with ord commands:
- Error: `error sending request for url (http://127.0.0.1/blockcount)`
- Problem: Ord ignores port specification and tries to connect to default port 80

## Server Mode

Ord can be run in server mode, but requires port 80 by default which needs root privileges:

```bash
# Start on non-privileged port
ord --signet server --http-port 8080

# Then in another terminal
ord --server-url http://127.0.0.1:8080 wallet balance
```

## Working Commands

```bash
# List all wallets in Bitcoin Core
ord --signet --bitcoin-rpc-username=bitcoin --bitcoin-rpc-password=bitcoin --bitcoin-rpc-url=http://127.0.0.1:38332 wallets

# Create a new ord wallet
ord --signet --bitcoin-rpc-username=bitcoin --bitcoin-rpc-password=bitcoin --bitcoin-rpc-url=http://127.0.0.1:38332 wallet create
```

## Batch File Example

The batch file format appears to be correct based on the documentation:

```yaml
# Batch file for creating OVT rune with logo
# Mode for separate outputs
mode: separate-outputs

# Postage for each inscription
postage: 10000

# Rune to etch
etching:
  rune: OTORI•VISION•TOKEN
  divisibility: 2
  premine: 500000.00
  supply: 500000.00
  symbol: ⊙
  terms:
    amount: 100000.00
    cap: 10

# Destination for the rune
destination: tb1p7pjgu34lprrtj24gq203zyyjjju34e9ftaarstjas2877zxuar2q5ru9yz

# Inscriptions to include
inscriptions:
  - file: ./OTORI-bird-LIVE.webp
    metadata:
      title: OTORI Vision Token
      description: OTORI Vision Token (OVT) - The governance token for the OTORI ecosystem
```

## Command Reference

### Main Commands

```bash
# Get general help
ord --help

# Get help for wallet subcommand
ord wallet --help

# Get help for specific wallet subcommands
ord wallet inscribe --help
ord wallet etch --help
ord wallet batch --help
```

### Correct Usage of Commands

Ord has separate commands for different operations:

```bash
# For inscriptions (NFTs) - requires a file
ord --signet wallet inscribe --fee-rate 1 --file ./OTORI-bird-LIVE.webp --dry-run

# For etching a rune (token) - separate command
ord --signet wallet etch --fee-rate 1 --rune OTORI•VISION•TOKEN --supply 500000 --divisibility 2 --destination tb1p7pjgu34lprrtj24gq203zyyjjju34e9ftaarstjas2877zxuar2q5ru9yz --dry-run

# For batch operations (can combine runes and inscriptions)
ord --signet wallet batch --fee-rate 1 --batch ./ovt-rune-batch.yaml --dry-run
```

### Wallet Management

```bash
# Create a wallet
ord --signet wallet create

# List wallets
ord --signet wallets

# Get wallet balance
ord --signet wallet balance

# Get a receiving address
ord --signet wallet receive
```

## Known Issues

1. Connection issues with wallet commands:
   - Error: `error sending request for url (http://127.0.0.1/blockcount)`
   - Problem: Ord ignores port specification and tries to connect to default port 80
   - Possible cause: Version incompatibility between ord v0.22.2 and Bitcoin Core v28.1.0

2. Batch processing with logo inscriptions:
   - We've been unable to successfully run the batch command to etch a rune with logo
   - Alternative: Create the rune first with `wallet etch`, then separately create an inscription for the logo with `wallet inscribe`

## Troubleshooting Steps

1. Check Bitcoin Core status:
```bash
bitcoin-cli -signet getblockchaininfo
```

2. Verify wallet exists and has funds:
```bash
bitcoin-cli -signet listwallets
bitcoin-cli -signet -rpcwallet=ord getbalance
```

3. Get proper command usage:
```bash
# Check exact parameters for commands
ord wallet etch --help
ord wallet inscribe --help
ord wallet batch --help
```

## Alternative Approaches

1. Two-step process: Create the rune first, then create the inscription separately
2. Running an older or newer version of `ord` that might be compatible with Bitcoin Core v28.1.0
3. Run ord in server mode and use a second instance to interact with it

## Batch File Format

```yaml
# Batch file for etching OVT rune with logo
# Mode for separate outputs
mode: separate-outputs

# Postage for each inscription
postage: 10000

# Rune to etch
etching:
  rune: OTORI•VISION•TOKEN
  divisibility: 2
  premine: 500000.00
  supply: 500000.00
  symbol: ⊙
  terms:
    amount: 100000.00
    cap: 10

# Destination for the rune
destination: tb1p7pjgu34lprrtj24gq203zyyjjju34e9ftaarstjas2877zxuar2q5ru9yz

# Inscriptions to include
inscriptions:
  - file: ./OTORI-bird-LIVE.webp
    metadata:
      title: OTORI Vision Token
      description: OTORI Vision Token (OVT) - The governance token for the OTORI ecosystem