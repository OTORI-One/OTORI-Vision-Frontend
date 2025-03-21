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
### Full and actual 'ord' command syntax

````bash
Usage: ord [OPTIONS] <COMMAND>

Commands:
  balances  List all rune balances
  decode    Decode a transaction
  env       Start a regtest ord and bitcoind instance
  epochs    List the first satoshis of each reward epoch
  find      Find a satoshi's current location
  index     Index commands
  list      List the satoshis in an output
  parse     Parse a satoshi from ordinal notation
  runes     List all runes
  server    Run the explorer server
  settings  Display settings
  subsidy   Display information about a block's subsidy
  supply    Display Bitcoin supply information
  teleburn  Generate teleburn addresses
  traits    Display satoshi traits
  verify    Verify BIP322 signature
  wallet    Wallet commands
  wallets   List all Bitcoin Core wallets
  help      Print this message or the help of the given subcommand(s)

Options:
      --bitcoin-data-dir <BITCOIN_DATA_DIR>
          Load Bitcoin Core data dir from <BITCOIN_DATA_DIR>.
      --bitcoin-rpc-password <BITCOIN_RPC_PASSWORD>
          Authenticate to Bitcoin Core RPC with <BITCOIN_RPC_PASSWORD>.
      --bitcoin-rpc-url <BITCOIN_RPC_URL>
          Connect to Bitcoin Core RPC at <BITCOIN_RPC_URL>.
      --bitcoin-rpc-username <BITCOIN_RPC_USERNAME>
          Authenticate to Bitcoin Core RPC as <BITCOIN_RPC_USERNAME>.
      --bitcoin-rpc-limit <BITCOIN_RPC_LIMIT>
          Max <N> requests in flight. [default: 12]
      --chain <CHAIN_ARGUMENT>
          Use <CHAIN>. [default: mainnet] [possible values: mainnet, regtest, signet, testnet, testnet4]
      --commit-interval <COMMIT_INTERVAL>
          Commit to index every <COMMIT_INTERVAL> blocks. [default: 5000]
      --savepoint-interval <SAVEPOINT_INTERVAL>
          Create a savepoint every <SAVEPOINT_INTERVAL> blocks. [default: 10]
      --max-savepoints <MAX_SAVEPOINTS>
          Store maximum <MAX_SAVEPOINTS> blocks. [default: 2]
      --config <CONFIG>
          Load configuration from <CONFIG>.
      --config-dir <CONFIG_DIR>
          Load configuration from <CONFIG_DIR>.
      --cookie-file <COOKIE_FILE>
          Load Bitcoin Core RPC cookie file from <COOKIE_FILE>.
      --data-dir <DATA_DIR>
          Store index in <DATA_DIR>.
      --height-limit <HEIGHT_LIMIT>
          Limit index to <HEIGHT_LIMIT> blocks.
      --index <INDEX>
          Use index at <INDEX>.
      --index-addresses
          Track unspent output addresses.
      --index-cache-size <INDEX_CACHE_SIZE>
          Set index cache size to <INDEX_CACHE_SIZE> bytes. [default: 1/4 available RAM]
      --index-runes
          Track location of runes.
      --index-sats
          Track location of all satoshis.
      --index-transactions
          Store transactions in index.
      --integration-test
          Run in integration test mode.
  -f, --format <FORMAT>
          Specify output format. [default: json] [possible values: json, yaml, minify]
  -n, --no-index-inscriptions
          Do not index inscriptions.
      --server-password <SERVER_PASSWORD>
          Require basic HTTP authentication with <SERVER_PASSWORD>. Credentials are sent in cleartext. Consider using authentication in conjunction with HTTPS.
      --server-username <SERVER_USERNAME>
          Require basic HTTP authentication with <SERVER_USERNAME>. Credentials are sent in cleartext. Consider using authentication in conjunction with HTTPS.
  -r, --regtest
          Use regtest. Equivalent to `--chain regtest`.
  -s, --signet
          Use signet. Equivalent to `--chain signet`.
  -t, --testnet
          Use testnet. Equivalent to `--chain testnet`.
      --testnet4
          Use testnet4. Equivalent to `--chain testnet4`.
  -h, --help
          Print help
  -V, --version
          Print version
````

## Full 'wallet' command syntax
```bash
Wallet commands

Usage: ord wallet [OPTIONS] <COMMAND>

Commands:
  addresses     Get wallet addresses
  balance       Get wallet balance
  batch         Create inscriptions and runes
  burn          Burn an inscription
  cardinals     List unspent cardinal outputs in wallet
  create        Create new wallet
  dump          Dump wallet descriptors
  inscribe      Create inscription
  inscriptions  List wallet inscriptions
  label         Export output labels
  mint          Mint a rune
  offer         Offer commands
  outputs       List all unspent outputs in wallet
  pending       List pending etchings
  receive       Generate receive address
  restore       Restore wallet
  resume        Resume pending etchings
  runics        List unspent runic outputs in wallet
  sats          List wallet satoshis
  send          Send sat or inscription
  sign          Sign message
  split         Split outputs
  transactions  See wallet transactions
  help          Print this message or the help of the given subcommand(s)

Options:
      --name <NAME>              Use wallet named <WALLET>. [default: ord]
      --no-sync                  Do not update index.
      --server-url <SERVER_URL>  Use ord running at <SERVER_URL>. [default: http://localhost:80]

```

## Full 'wallet inscribe' command syntax
```bash
Create inscription

Usage: ord wallet inscribe [OPTIONS] --fee-rate <FEE_RATE> <--delegate <DELEGATE>|--file <FILE>>

Options:
      --commit-fee-rate <COMMIT_FEE_RATE>
          Use <COMMIT_FEE_RATE> sats/vbyte for commit transaction.
          Defaults to <FEE_RATE> if unset.
      --compress
          Compress inscription content with brotli.
      --fee-rate <FEE_RATE>
          Use fee rate of <FEE_RATE> sats/vB.
      --dry-run
          Don't sign or broadcast transactions.
      --no-backup
          Do not back up recovery key.
      --no-limit
          Allow transactions larger than MAX_STANDARD_TX_WEIGHT of 400,000 weight units and OP_RETURNs greater than 83 bytes. Transactions over this limit are nonstandard and will not be relayed by bitcoind in its default configuration. Do not use this flag unless you understand the implications.
      --cbor-metadata <CBOR_METADATA>
          Include CBOR in file at <METADATA> as inscription metadata
      --delegate <DELEGATE>
          Delegate inscription content to <DELEGATE>.
      --destination <DESTINATION>
          Send inscription to <DESTINATION>.
      --file <FILE>
          Inscribe sat with contents of <FILE>. May be omitted if `--delegate` is supplied.
      --json-metadata <JSON_METADATA>
          Include JSON in file at <METADATA> converted to CBOR as inscription metadata
      --metaprotocol <METAPROTOCOL>
          Set inscription metaprotocol to <METAPROTOCOL>.
      --parent <PARENT>
          Make inscription a child of <PARENT>.
      --postage <AMOUNT>
          Include <AMOUNT> postage with inscription. [default: 10000sat]
      --reinscribe
          Allow reinscription.
      --sat <SAT>
          Inscribe <SAT>.
      --satpoint <SATPOINT>
          Inscribe <SATPOINT>.
      --gallery <INSCRIPTION_ID>
          Include <INSCRIPTION_ID> in gallery.
  -h, --help
          Print help
```

## Full 'wallet batch' command syntax

````bash
Create inscriptions and runes

Usage: ord wallet batch [OPTIONS] --fee-rate <FEE_RATE> --batch <BATCH_FILE>

Options:
      --commit-fee-rate <COMMIT_FEE_RATE>
          Use <COMMIT_FEE_RATE> sats/vbyte for commit transaction.
          Defaults to <FEE_RATE> if unset.
      --compress
          Compress inscription content with brotli.
      --fee-rate <FEE_RATE>
          Use fee rate of <FEE_RATE> sats/vB.
      --dry-run
          Don't sign or broadcast transactions.
      --no-backup
          Do not back up recovery key.
      --no-limit
          Allow transactions larger than MAX_STANDARD_TX_WEIGHT of 400,000 weight units and OP_RETURNs greater than 83 bytes. Transactions over this limit are nonstandard and will not be relayed by bitcoind in its default configuration. Do not use this flag unless you understand the implications.
      --batch <BATCH_FILE>
          Inscribe multiple inscriptions and rune defined in YAML <BATCH_FILE>.
  -h, --help
          Print help
````

## Full 'wallet mint' command syntax
````bash
Mint a rune

Usage: ord wallet mint [OPTIONS] --fee-rate <FEE_RATE> --rune <RUNE>

Options:
      --fee-rate <FEE_RATE>        Use <FEE_RATE> sats/vbyte for mint transaction.
      --rune <RUNE>                Mint <RUNE>. May contain `.` or `•`as spacers.
      --postage <POSTAGE>          Include <AMOUNT> postage with mint output. [default: 10000sat]
      --destination <DESTINATION>  Send minted runes to <DESTINATION>.
  -h, --help                       Print help
````

## Connection Issues

We've encountered persistent connection issues with ord commands:
- Error: `error sending request for url (http://127.0.0.1/blockcount)`
- Problem: Ord ignores port specification and tries to connect to default port 80
- Error: `cookie file /home/BTCPi/.bitcoin/.cookie does not exist` - This occurs when trying to connect to the ord server using RPC URL.

## Server Mode

Ord can be run in server mode, but requires port 80 by default which needs root privileges:

```bash
# Start on non-privileged port
ord --signet server --http-port 8080
```

To connect to the server from another terminal, use Bitcoin RPC parameters:

```bash
# Create a temporary cookie file for authentication
echo "ord:$(openssl rand -hex 16)" > /tmp/ord_server_cookie
chmod 600 /tmp/ord_server_cookie

# Use the cookie file with the RPC URL
ord --signet --bitcoin-rpc-url=http://127.0.0.1:8080 --cookie-file=/tmp/ord_server_cookie wallet balance
```

## Working Commands

```bash
# List all wallets in Bitcoin Core
ord --signet --bitcoin-rpc-username=bitcoin --bitcoin-rpc-password=bitcoin --bitcoin-rpc-url=http://127.0.0.1:38332 wallets

# Create a new ord wallet
ord --signet --bitcoin-rpc-username=bitcoin --bitcoin-rpc-password=bitcoin --bitcoin-rpc-url=http://127.0.0.1:38332 wallet create
```

## Alternative Approaches

Since we're having issues with the batch command connecting to Bitcoin Core, we could try:

1. Two-step process:
   ```bash
   # Step 1: Create the rune with mint
   ord --signet wallet mint --fee-rate 1 --rune OTORI•VISION•TOKEN --destination tb1p7pjgu34lprrtj24gq203zyyjjju34e9ftaarstjas2877zxuar2q5ru9yz --dry-run
   
   # Step 2: Create the logo inscription separately
   ord --signet wallet inscribe --fee-rate 1 --file ./OTORI-bird-LIVE.webp --destination tb1p7pjgu34lprrtj24gq203zyyjjju34e9ftaarstjas2877zxuar2q5ru9yz --dry-run
   ```

2. Running ord in server mode:
   ```bash
   # Terminal 1: Start ord server
   ord --signet server --http-port 8080
   
   # Terminal 2: Create temporary cookie file
   echo "ord:$(openssl rand -hex 16)" > /tmp/ord_server_cookie
   chmod 600 /tmp/ord_server_cookie

   # Terminal 2: Use batch command with RPC URL and cookie file
   ord --signet --bitcoin-rpc-url=http://127.0.0.1:8080 --cookie-file=/tmp/ord_server_cookie wallet batch --fee-rate 1 --batch ./ovt-rune-batch.yaml --dry-run
   ```

3. Try a different version of ord that might be compatible with Bitcoin Core v28.1.0

## Recommended Approach: Server Mode with Sudo

Based on our troubleshooting, the most reliable approach appears to be using server mode with sudo permissions to access port 80:

```bash
# Step 1: Start ord server as root (in a separate terminal)
sudo ord --signet server

# Step 2: Create temporary cookie file
echo "ord:$(openssl rand -hex 16)" > /tmp/ord_server_cookie
chmod 600 /tmp/ord_server_cookie

# Step 3: Once the server is running, execute the batch command in another terminal
ord --signet --bitcoin-rpc-url=http://127.0.0.1:80 --cookie-file=/tmp/ord_server_cookie wallet batch --fee-rate 1 --batch /home/danmercurius/Coding/OTORI-Frontend/OTORI-Vision-Frontend/scripts/ovt-rune-batch.yaml --dry-run
```

If you need to avoid using sudo, use the non-privileged port approach:
```bash
# Step 1: Start ord server on non-privileged port
ord --signet server --http-port 8080

# Step 2: Create temporary cookie file
echo "ord:$(openssl rand -hex 16)" > /tmp/ord_server_cookie
chmod 600 /tmp/ord_server_cookie

# Step 3: Use batch command with non-privileged port
ord --signet --bitcoin-rpc-url=http://127.0.0.1:8080 --cookie-file=/tmp/ord_server_cookie wallet batch --fee-rate 1 --batch /home/danmercurius/Coding/OTORI-Frontend/OTORI-Vision-Frontend/scripts/ovt-rune-batch.yaml --dry-run
```

## Important Note on Cookie Files

When connecting to an ord server using `--bitcoin-rpc-url`, you need to also provide a valid cookie file with `--cookie-file`. This cookie file needs to be created manually when using the ord server. Without this, you'll get the error:
```
error: cookie file `/home/BTCPi/.bitcoin/.cookie` does not exist
```

## Batch File Example

The batch file format appears to be correct based on the documentation:

```yaml
Example `batch.yaml`
--------------------

```yaml
{{#include ../../../batch.yaml}}
```
# example batch file

```yml

# inscription modes:
# - `same-sat`: inscribe on the same sat
# - `satpoints`: inscribe on the first sat of specified satpoint's output
# - `separate-outputs`: inscribe on separate postage-sized outputs
# - `shared-output`: inscribe on a single output separated by postage
mode: separate-outputs

# parent inscriptions:
parents:
- 6ac5cacb768794f4fd7a78bf00f2074891fce68bd65c4ff36e77177237aacacai0

# postage for each inscription:
postage: 12345

# allow reinscribing
reinscribe: true

# sat to inscribe on, can only be used with `same-sat`:
# sat: 5000000000

# rune to etch (optional)
etching:
  # rune name
  rune: THE•BEST•RUNE
  # allow subdividing super-unit into `10^divisibility` sub-units
  divisibility: 2
  # premine
  premine: 1000.00
  # total supply, must be equal to `premine + terms.cap * terms.amount`
  supply: 10000.00
  # currency symbol
  symbol: $
  # mint terms (optional)
  terms:
    # amount per mint
    amount: 100.00
    # maximum number of mints
    cap: 90
    # mint start and end absolute block height (optional)
    height:
      start: 840000
      end: 850000
    # mint start and end block height relative to etching height (optional)
    offset:
      start: 1000
      end: 9000
  # future runes protocol changes may be opt-in. this may be for a variety of
  # reasons, including that they make light client validation harder, or simply
  # because they are too degenerate.
  #
  # setting `turbo` to `true` opts in to these future protocol changes,
  # whatever they may be.
  turbo: true

# inscriptions to inscribe
inscriptions:
  # path to inscription content
- file: mango.avif
  # inscription to delegate content to (optional)
  delegate: 6ac5cacb768794f4fd7a78bf00f2074891fce68bd65c4ff36e77177237aacacai0
  # destination (optional, if no destination is specified a new wallet change address will be used)
  destination: bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4
  # inscription metadata (optional)
  metadata:
    title: Delicious Mangos
    description: >
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam semper,
      ligula ornare laoreet tincidunt, odio nisi euismod tortor, vel blandit
      metus est et odio. Nullam venenatis, urna et molestie vestibulum, orci
      mi efficitur risus, eu malesuada diam lorem sed velit. Nam fermentum
      dolor et luctus euismod.

- file: token.json
  # inscription metaprotocol (optional)
  metaprotocol: DOPEPROTOCOL-42069

- file: tulip.png
  destination: bc1pdqrcrxa8vx6gy75mfdfj84puhxffh4fq46h3gkp6jxdd0vjcsdyspfxcv6
  metadata:
    author: Satoshi Nakamoto

- file: gallery.png
  # gallery items
  gallery:
  - a4676e57277b70171d69dc6ad2781485b491fe0ff5870f6f6b01999e7180b29ei0
  - a4676e57277b70171d69dc6ad2781485b491fe0ff5870f6f6b01999e7180b29ei3
  ```
  

# FINAL WORKING COMMANDS for ORD (20th March 2025)

### 1. Basic Commands with Config Flag
```bash
# Check wallet balance
ord --config ~/.ord/ord.yaml --signet wallet balance

# List wallet addresses
ord --config ~/.ord/ord.yaml --signet wallet addresses

# List inscriptions
ord --config ~/.ord/ord.yaml --signet wallet inscriptions

# Check specific address
ord --config ~/.ord/ord.yaml --signet wallet balance --address tb1p3rjwdglnrfgu54lh7mqvsnzhw523u03ahwesjasa2m66krx4sxzs4l2h72

# Send inscription
ord --config ~/.ord/ord.yaml --signet wallet send --fee-rate 1 [address] [inscription-id]
```

### 2. More Elegant Solution: Create a Script
Create a file `ord_wallet.sh`:

```bash
#!/bin/bash

CONFIG="$HOME/.ord/ord.yaml"
NETWORK="--signet"

function ord_wallet {
  ord --config "$CONFIG" $NETWORK wallet "$@"
}

# Example usage:
# ./ord_wallet.sh balance
# ./ord_wallet.sh addresses
# ./ord_wallet.sh inscriptions
# ./ord_wallet.sh balance --address tb1p3rjwdglnrfgu54lh7mqvsnzhw523u03ahwesjasa2m66krx4sxzs4l2h72

ord_wallet "$@"
```

Make it executable:
```bash
chmod +x ord_wallet.sh
```

### 3. Using the Script
```bash
# Check balance
./ord_wallet.sh balance

# List addresses
./ord_wallet.sh addresses

# List inscriptions
./ord_wallet.sh inscriptions

# Check specific address
./ord_wallet.sh balance --address tb1p3rjwdglnrfgu54lh7mqvsnzhw523u03ahwesjasa2m66krx4sxzs4l2h72
```

### 4. Advanced Script for Multiple Wallets
Create `check_wallets.sh`:

```bash
#!/bin/bash

CONFIG="$HOME/.ord/ord.yaml"
NETWORK="--signet"
WALLETS=("ovt-LP-wallet" "ord" "ovt_ord_wallet" "ovt_runes_wallet")
ADDRESS="tb1p3rjwdglnrfgu54lh7mqvsnzhw523u03ahwesjasa2m66krx4sxzs4l2h72"

for wallet in "${WALLETS[@]}"; do
  echo "Checking wallet: $wallet"
  bitcoin-cli -signet loadwallet "$wallet" > /dev/null
  ord --config "$CONFIG" $NETWORK --bitcoin-rpc-wallet "$wallet" wallet addresses | grep -q "$ADDRESS"
  if [ $? -eq 0 ]; then
    echo "Address found in wallet: $wallet"
    exit 0
  fi
done

echo "Address not found in any wallet"
exit 1
```

### 5. Using the Advanced Script
```bash
# Make executable
chmod +x check_wallets.sh

# Run the check
./check_wallets.sh
```

### Key Benefits
1. **Consistency**: All commands use the same configuration
2. **Reusability**: Scripts can be used across different projects
3. **Error Handling**: Better control over error messages and exit codes
4. **Maintainability**: Easier to update configuration in one place

Let me know if you'd like any modifications to these scripts!
