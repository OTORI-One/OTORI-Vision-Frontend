#!/bin/bash

# Script to distribute OVT runes from treasury to LP wallet
# This script actually transfers OVT tokens from treasury to LP wallet

# Configuration (update these values with your actual addresses)
TREASURY_ADDRESS="${NEXT_PUBLIC_TREASURY_ADDRESS:-tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd}"  # Use default or override
LP_ADDRESS="${NEXT_PUBLIC_LP_ADDRESS:-tb1p3vn6wc0dlud3tvckv95datu3stq4qycz7vj9mzpclfkrv9rh8jqsjrw38f}"  # Replace with actual LP address
OVT_RUNE_ID="${NEXT_PUBLIC_OVT_RUNE_ID:-240249:101}"  # Replace with actual rune ID
FEE_RATE=1  # sat/vB
DISTRIBUTION_AMOUNT=1000000  # Send 1M tokens (supply is 2.1M as verified on signet.ordinals.com)
ORD_CONFIG="${HOME}/.ord/ord.yaml"  # Default config path
DRY_RUN=true  # Set to false to execute the transaction
IMPORT_WIF=""  # WIF private key for the treasury address (only if needed)
UTXO_WITH_RUNES=""  # Specific UTXO containing the runes (txid:vout format)
USE_MANUAL_TX=false  # Whether to use manual tx creation instead of ord wallet
WALLET_NAME=""  # Specific wallet to use with bitcoin-cli and ord
DEBUG_MODE=false  # Whether to enable debug mode for more verbose output

# Ensure bitcoin-cli and ord are available
command -v bitcoin-cli >/dev/null 2>&1 || { echo "bitcoin-cli not found, please install Bitcoin Core"; exit 1; }
command -v ord >/dev/null 2>&1 || { echo "ord not found, please install ord"; exit 1; }

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-dry-run)
            DRY_RUN=false
            shift
            ;;
        --amount=*)
            DISTRIBUTION_AMOUNT="${1#*=}"
            shift
            ;;
        --treasury=*)
            TREASURY_ADDRESS="${1#*=}"
            shift
            ;;
        --lp=*)
            LP_ADDRESS="${1#*=}"
            shift
            ;;
        --rune=*)
            OVT_RUNE_ID="${1#*=}"
            shift
            ;;
        --config=*)
            ORD_CONFIG="${1#*=}"
            shift
            ;;
        --import-wif=*)
            IMPORT_WIF="${1#*=}"
            shift
            ;;
        --utxo=*)
            UTXO_WITH_RUNES="${1#*=}"
            shift
            ;;
        --manual-tx)
            USE_MANUAL_TX=true
            shift
            ;;
        --wallet=*)
            WALLET_NAME="${1#*=}"
            shift
            ;;
        --debug)
            DEBUG_MODE=true
            shift
            ;;
        --help)
            echo "Usage: ./distribute-to-lp.sh [options]"
            echo ""
            echo "Options:"
            echo "  --no-dry-run             Actually send the transaction (default is dry-run)"
            echo "  --amount=AMOUNT          Amount of OVT to distribute (default: 1000000)"
            echo "  --treasury=ADDRESS       Treasury wallet address"
            echo "  --lp=ADDRESS             LP wallet address"
            echo "  --rune=ID                Rune ID (default: OTORI)"
            echo "  --config=PATH            Path to ord config file (default: ~/.ord/ord.yaml)"
            echo "  --import-wif=KEY         WIF private key for the treasury address (if needed)"
            echo "  --utxo=TXID:VOUT         Specific UTXO containing the runes"
            echo "  --manual-tx              Use manual transaction creation method"
            echo "  --wallet=NAME            Specify Bitcoin Core wallet name to use"
            echo "  --debug                  Enable debug mode for more verbose output"
            echo "  --help                   Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Verify addresses are provided
if [ "$TREASURY_ADDRESS" = "<TREASURY_WALLET_ADDRESS_HERE>" ]; then
    echo "ERROR: Treasury address not set. Use --treasury=ADDRESS"
    exit 1
fi

if [ "$LP_ADDRESS" = "<LP_WALLET_ADDRESS_HERE>" ]; then
    echo "ERROR: LP address not set. Use --lp=ADDRESS"
    exit 1
fi

# Verify config file exists
if [ ! -f "$ORD_CONFIG" ]; then
    echo "WARNING: Config file not found at $ORD_CONFIG"
    echo "Attempting to continue, but commands may fail"
fi

echo "=========================================================="
echo "OVT Distribution to LP Wallet"
echo "=========================================================="
echo "Treasury Address: $TREASURY_ADDRESS"
echo "LP Address: $LP_ADDRESS"
echo "Rune ID: $OVT_RUNE_ID"
echo "Distribution Amount: $DISTRIBUTION_AMOUNT OVT"
echo "Fee Rate: $FEE_RATE sat/vB"
echo "Config Path: $ORD_CONFIG"
if [ -n "$WALLET_NAME" ]; then
    echo "Bitcoin Core Wallet: $WALLET_NAME"
fi
echo "Mode: $([ "$DRY_RUN" = true ] && echo 'DRY RUN (no transaction)' || echo 'LIVE (will create transaction)')"
if [ "$USE_MANUAL_TX" = true ]; then
    echo "Transaction Method: Manual Transaction Creation"
    if [ -z "$UTXO_WITH_RUNES" ]; then
        echo "WARNING: Manual transaction mode requires --utxo=TXID:VOUT parameter"
    else
        echo "Using UTXO: $UTXO_WITH_RUNES"
    fi
else
    echo "Transaction Method: Ord Wallet"
fi
if [ "$DEBUG_MODE" = true ]; then
    echo "Debug Mode: Enabled (more verbose output)"
fi
echo ""

# Import WIF private key if provided
import_wif_key() {
    if [ -n "$IMPORT_WIF" ]; then
        echo "Attempting to import private key for treasury address..."
        if [ "$DRY_RUN" = false ]; then
            if ord --config "$ORD_CONFIG" --signet wallet import "$IMPORT_WIF"; then
                echo "Successfully imported private key"
            else
                echo "Failed to import private key"
                exit 1
            fi
        else
            echo "DRY RUN: Would import private key (skipping)"
        fi
    fi
}

# Check if ord wallet is initialized
check_ord_wallet() {
    echo "Checking if ord wallet is initialized..."
    if ! ord --config "$ORD_CONFIG" --signet wallet balance &>/dev/null; then
        echo "ERROR: ord wallet not initialized or not accessible"
        echo "Run 'ord --config \"$ORD_CONFIG\" --signet wallet create' first to create a wallet"
        exit 1
    fi
    echo "ord wallet is accessible"
}

# List available Bitcoin Core wallets
list_bitcoin_wallets() {
    echo "Listing available Bitcoin Core wallets..."
    local wallet_list=$(bitcoin-cli -signet listwallets 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "Available wallets: $wallet_list"
    else
        echo "Failed to list wallets or Bitcoin Core not running"
        echo "Make sure Bitcoin Core is running with -signet flag"
    fi
}

# Dump addresses from Bitcoin Core wallets
dump_wallet_addresses() {
    if [ "$DEBUG_MODE" = true ]; then
        echo "Dumping addresses from all Bitcoin Core wallets..."
        
        # Get the list of wallets
        local wallets=$(bitcoin-cli -signet listwallets | grep -o '"[^"]*"' | sed 's/"//g')
        
        for wallet in $wallets; do
            # Skip wallets with slashes (usually not valid wallet names)
            if [[ "$wallet" == *"/"* ]]; then
                continue
            fi
            
            echo "Addresses in wallet '$wallet':"
            local addresses=$(bitcoin-cli -signet -rpcwallet="$wallet" listreceivedbyaddress 0 true | grep -o '"address": "[^"]*"' | cut -d'"' -f4)
            
            # Check if the treasury address is in this wallet
            if echo "$addresses" | grep -q "$TREASURY_ADDRESS"; then
                echo "!!! TREASURY ADDRESS FOUND IN WALLET: $wallet !!!"
            fi
            
            # Display all addresses
            echo "$addresses"
    echo ""
            
            # Check UTXOs for this wallet
            echo "Checking UTXOs in wallet '$wallet'..."
            local utxos=$(bitcoin-cli -signet -rpcwallet="$wallet" listunspent)
            echo "$utxos" | grep -E "txid|vout|address|amount" | sed 's/^ *//'
    echo ""
        done
    fi
}

# Check if the wallet controls the treasury address
check_wallet_control() {
    echo "Checking if ord wallet controls the treasury address..."
    local addresses=$(ord --config "$ORD_CONFIG" --signet wallet addresses 2>/dev/null)
    if ! echo "$addresses" | grep -q "$TREASURY_ADDRESS"; then
        echo "WARNING: Ord wallet does not control the treasury address"
        echo "You need to either:"
        echo "1. Import the private key for the treasury address using --import-wif=KEY"
        echo "2. Use manual transaction creation with --manual-tx flag and provide the UTXO"
        if [ -z "$IMPORT_WIF" ] && [ "$USE_MANUAL_TX" = false ]; then
            echo "ERROR: Cannot proceed without wallet control or manual mode"
            exit 1
        fi
    else
        echo "Ord wallet controls the treasury address"
    fi
}

# Identify which Bitcoin Core wallet controls the treasury
identify_controlling_wallet() {
    echo "Identifying which Bitcoin Core wallet controls the treasury address..."
    
    # Get the list of wallets
    local wallets=$(bitcoin-cli -signet listwallets | grep -o '"[^"]*"' | sed 's/"//g')
    local treasury_wallet=""
    local found_utxo=false
    
    for wallet in $wallets; do
        # Skip wallets with slashes (usually not valid wallet names)
        if [[ "$wallet" == *"/"* ]]; then
            continue
        fi
        
        # Check if this wallet has the treasury address
        local has_address=false
        local addresses=$(bitcoin-cli -signet -rpcwallet="$wallet" listreceivedbyaddress 0 true | grep -o '"address": "[^"]*"' | cut -d'"' -f4)
        
        if echo "$addresses" | grep -q "$TREASURY_ADDRESS"; then
            has_address=true
            treasury_wallet="$wallet"
            echo "Found treasury address in wallet: $wallet"
            
            # Check if the wallet has the UTXO with runes
            if [ -n "$UTXO_WITH_RUNES" ]; then
                local txid=${UTXO_WITH_RUNES%:*}
                local vout=${UTXO_WITH_RUNES#*:}
                
                local utxos=$(bitcoin-cli -signet -rpcwallet="$wallet" listunspent)
                if echo "$utxos" | grep -q "$txid"; then
                    echo "Found the specified UTXO in wallet: $wallet"
                    found_utxo=true
                    # Auto-set the wallet name if not already set
                    if [ -z "$WALLET_NAME" ]; then
                        WALLET_NAME="$wallet"
                        echo "Auto-setting wallet to: $WALLET_NAME"
                    fi
                fi
            fi
        fi
    done
    
    if [ -z "$treasury_wallet" ]; then
        echo "WARNING: No Bitcoin Core wallet controls the treasury address"
        echo "The runes may have been created with a different wallet or imported differently"
    else
        echo "Treasury address is controlled by wallet: $treasury_wallet"
        if [ "$found_utxo" = false ] && [ -n "$UTXO_WITH_RUNES" ]; then
            echo "WARNING: The specified UTXO was not found in any loaded wallet"
            echo "This may cause signing failures when trying to spend the UTXO"
        fi
    fi
}

# Check treasury balance via explorer API
check_explorer_balance() {
    echo "Checking treasury rune balance via explorer API..."
    echo "NOTE: This is informational only. The script is not integrated with explorer API for validation."
    echo "Please verify at https://signet.ordinals.com/address/$TREASURY_ADDRESS"
    echo "According to the explorer, the treasury should have 2,100,000 OTORI•VISION•TOKEN"
}

# Check if treasury has enough runes (via ord wallet)
check_treasury_balance() {
    echo "Checking treasury rune balance via ord wallet..."
    local balance=$(ord --config "$ORD_CONFIG" --signet wallet balance --rune $OVT_RUNE_ID 2>/dev/null | grep -oP '\d+' || echo "0")
    
    if [ -z "$balance" ] || [ "$balance" -lt "$DISTRIBUTION_AMOUNT" ]; then
        echo "WARNING: Ord wallet shows $balance OVT runes (less than $DISTRIBUTION_AMOUNT needed)"
        echo "However, this may be because the wallet doesn't control the treasury address."
        
        if [ "$USE_MANUAL_TX" = true ]; then
            echo "Proceeding with manual transaction mode (balance check skipped)"
            return 0
        elif [ -n "$IMPORT_WIF" ]; then
            echo "WIF key provided, will attempt to import before proceeding"
            return 0
        else
            echo "ERROR: Insufficient runes and no alternative method provided"
            echo "Please verify treasury balance at https://signet.ordinals.com/address/$TREASURY_ADDRESS"
            echo "If treasury has enough runes, use --import-wif or --manual-tx options"
            exit 1
        fi
    fi
    
    echo "Treasury (via ord wallet) has $balance OVT runes available"
}

# Check rune indexing in ord
check_ord_rune_indexing() {
    echo "Checking if ord has properly indexed runes..."
    
    # List runes in ord
    local runes_output=$(ord --config "$ORD_CONFIG" --signet runes 2>/dev/null || echo "Failed to list runes")
    echo "Runes in ord:"
    echo "$runes_output"
    
    # Check specifically for the OVT rune
    if echo "$runes_output" | grep -q "$OVT_RUNE_ID"; then
        echo "OVT rune is indexed in ord"
    else
        echo "WARNING: OVT rune not found in ord index"
        echo "This may indicate that ord's index is not up to date"
        echo "Try running 'ord --signet index run' to update the index"
    fi
}

# Function to send runes using ord wallet
send_runes_via_wallet() {
    echo "Sending runes using ord wallet..."
    local cmd="ord --config \"$ORD_CONFIG\" --signet wallet send --fee-rate $FEE_RATE $LP_ADDRESS $OVT_RUNE_ID:$DISTRIBUTION_AMOUNT"
    
    echo "Executing command: $cmd"
    if [ "$DRY_RUN" = false ]; then
        eval $cmd
        if [ $? -eq 0 ]; then
            echo "SUCCESSFULLY sent $DISTRIBUTION_AMOUNT OVT runes to LP wallet"
            echo "The NAV calculation should now use this distributed amount for calculations"
        else
            echo "ERROR: Failed to send runes"
            exit 1
        fi
    else
        echo "DRY RUN: Would execute: $cmd"
        echo "Use --no-dry-run to actually send the transaction"
    fi
}

# Function to create manual transaction for sending runes
send_runes_via_manual_tx() {
    if [ -z "$UTXO_WITH_RUNES" ]; then
        echo "ERROR: Manual transaction mode requires --utxo=TXID:VOUT parameter"
        echo "Please specify the UTXO that contains the runes you want to send"
        exit 1
    fi
    
    echo "Creating manual transaction to send runes..."
    
    # Split the UTXO into txid and vout
    local txid=${UTXO_WITH_RUNES%:*}
    local vout=${UTXO_WITH_RUNES#*:}
    
    echo "Using UTXO: $txid:$vout"

    # Check if we need to use the wallet option    
    local wallet_option=""
    if [ -n "$WALLET_NAME" ]; then
        wallet_option="-rpcwallet=$WALLET_NAME"
        echo "Using Bitcoin Core wallet: $WALLET_NAME"
    fi
    
    if [ "$DRY_RUN" = false ]; then
        # The ord command does not support --outpoint directly, so we need to use a different approach
        echo "Attempting to spend the UTXO with runes using Bitcoin Core..."
        
        # Store the utxo info for reference
        echo "Getting UTXO details..."
        bitcoin-cli -signet $wallet_option gettxout $txid $vout > /tmp/utxo_info.json
        
        if [ $? -ne 0 ]; then
            echo "ERROR: Failed to get UTXO details. Make sure the UTXO exists and is unspent."
            cat /tmp/utxo_info.json
            rm -f /tmp/utxo_info.json
            exit 1
        fi
        
        # Get the value of the UTXO
        local utxo_value=$(cat /tmp/utxo_info.json | grep -o '"value": [0-9.]*' | cut -d' ' -f2)
        local scriptPubKey=$(cat /tmp/utxo_info.json | grep -o '"scriptPubKey": ".*"' | cut -d'"' -f4 2>/dev/null || echo "")
        
        echo "UTXO value: $utxo_value BTC"
        echo "scriptPubKey: $scriptPubKey"
        
        # Calculate output amount (UTXO value minus fee)
        # Using a simple estimate for fee: 250 vbytes * fee_rate
        local fee_estimate=0.00000250
        local output_amount=$(echo "$utxo_value - $fee_estimate" | bc -l)
        
        echo "Fee estimate: $fee_estimate BTC"
        echo "Output amount: $output_amount BTC"
        
        # Create raw transaction
        echo "Creating raw transaction with rune transfer..."
        
        # Create inputs JSON file with proper format
        echo "[{\"txid\":\"$txid\",\"vout\":$vout}]" > /tmp/inputs.json
        
        # Create outputs JSON file with proper format - we need to make sure it's properly formatted
        # The output needs quotes around the decimal number
        echo "{\"$LP_ADDRESS\":$output_amount}" > /tmp/outputs.json
        
        echo "Inputs JSON:"
        cat /tmp/inputs.json
        echo "Outputs JSON:"
        cat /tmp/outputs.json
        
        # Create raw transaction
        echo "Running createrawtransaction..."
        bitcoin-cli -signet $wallet_option createrawtransaction $(cat /tmp/inputs.json) "$(cat /tmp/outputs.json)" > /tmp/raw_tx.hex
        
        if [ $? -ne 0 ]; then
            echo "ERROR: Failed to create raw transaction"
            echo "Trying alternative approach with direct argument format..."
            
            # Try alternative approach with direct arguments
            local outputs_arg="{\\\"$LP_ADDRESS\\\":$output_amount}"
            bitcoin-cli -signet $wallet_option createrawtransaction "[{\"txid\":\"$txid\",\"vout\":$vout}]" "$outputs_arg" > /tmp/raw_tx.hex
            
            if [ $? -ne 0 ]; then
                echo "ERROR: Both transaction creation methods failed"
                rm -f /tmp/utxo_info.json /tmp/inputs.json /tmp/outputs.json
                exit 1
            fi
        fi
        
        # Display the raw transaction
        echo "Raw transaction created:"
        cat /tmp/raw_tx.hex
        
        # Sign raw transaction
        echo "Signing raw transaction..."
        bitcoin-cli -signet $wallet_option signrawtransactionwithwallet $(cat /tmp/raw_tx.hex) > /tmp/signed_tx.json
        
        if [ $? -ne 0 ]; then
            echo "ERROR: Failed to sign transaction. Make sure the wallet has the private key for the input."
            rm -f /tmp/utxo_info.json /tmp/inputs.json /tmp/outputs.json /tmp/raw_tx.hex /tmp/signed_tx.json
            exit 1
        fi
        
        # Extract signed hex
        local signed_tx=$(cat /tmp/signed_tx.json | grep -o '"hex": ".*"' | cut -d'"' -f4)
        
        if [ -z "$signed_tx" ]; then
            echo "ERROR: Failed to extract signed transaction hex"
            cat /tmp/signed_tx.json
            rm -f /tmp/utxo_info.json /tmp/inputs.json /tmp/outputs.json /tmp/raw_tx.hex /tmp/signed_tx.json
            exit 1
        fi
        
        # Broadcast transaction
        echo "Broadcasting transaction..."
        local txid_result=$(bitcoin-cli -signet $wallet_option sendrawtransaction "$signed_tx")
        
        if [ $? -ne 0 ]; then
            echo "ERROR: Failed to broadcast transaction"
            rm -f /tmp/utxo_info.json /tmp/inputs.json /tmp/outputs.json /tmp/raw_tx.hex /tmp/signed_tx.json
            exit 1
        fi
        
        echo "SUCCESSFULLY sent transaction: $txid_result"
        echo "Sent OVT runes to LP wallet"
        echo "Note: This transaction sends the Bitcoin in the UTXO, and the runes will move with it"
        echo "The NAV calculation should now use this distributed amount for calculations"
        
        # Clean up
        rm -f /tmp/utxo_info.json /tmp/inputs.json /tmp/outputs.json /tmp/raw_tx.hex /tmp/signed_tx.json
    else
        echo "DRY RUN: Would send a transaction from the UTXO containing runes"
        echo "Parameters:"
        echo "- From UTXO: $txid:$vout"
        echo "- To Address: $LP_ADDRESS"
        echo "- Rune Amount: All runes in the UTXO (should be 2,100,000 OVT)"
        echo "Note: Runes are sent by sending the Bitcoin in the UTXO that contains them"
        echo "Use --no-dry-run to execute the transaction"
    fi
}

# Function to try loading all wallets
try_load_wallets() {
    echo "Attempting to load Bitcoin Core wallets..."
    
    # List of wallets to try loading
    local wallets=("ovt-LP-wallet" "ord" "ovt_ord_wallet" "ovt_runes_wallet")
    
    # Check if Bitcoin Core is running
    if ! bitcoin-cli -signet getblockchaininfo &>/dev/null; then
        echo "ERROR: Bitcoin Core not running or not accessible"
        echo "Make sure Bitcoin Core is running with -signet flag"
        return 1
    fi
    
    # Current loaded wallets
    local current_wallets=$(bitcoin-cli -signet listwallets)
    echo "Currently loaded wallets: $current_wallets"
    
    # Try to load each wallet
    for wallet in "${wallets[@]}"; do
        if ! echo "$current_wallets" | grep -q "\"$wallet\""; then
            echo "Loading wallet: $wallet"
            if bitcoin-cli -signet loadwallet "$wallet" &>/dev/null; then
                echo "Successfully loaded wallet: $wallet"
            else
                echo "Failed to load wallet: $wallet (might not exist)"
            fi
        else
            echo "Wallet already loaded: $wallet"
        fi
    done
    
    # Display loaded wallets
    local after_wallets=$(bitcoin-cli -signet listwallets)
    echo "Loaded wallets after operation: $after_wallets"
}

# Main execution flow
check_ord_wallet
list_bitcoin_wallets
try_load_wallets
check_wallet_control
check_explorer_balance
identify_controlling_wallet
check_ord_rune_indexing
dump_wallet_addresses

if [ -n "$IMPORT_WIF" ]; then
    import_wif_key
fi

check_treasury_balance

if [ "$USE_MANUAL_TX" = true ]; then
    send_runes_via_manual_tx
else
    send_runes_via_wallet
fi

echo ""
echo "Script completed." 