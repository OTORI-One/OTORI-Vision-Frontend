#!/bin/bash

# Script to distribute OVT runes from treasury to LP wallet
# This script prepares the LP wallet with enough OVT tokens to handle user trading

# Configuration (update these values with your actual addresses)
TREASURY_ADDRESS="${TREASURY_ADDRESS:-tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd}"  # Use default or override
LP_ADDRESS="${LP_ADDRESS:-<LP_WALLET_ADDRESS_HERE>}"  # Replace with actual LP address
OVT_RUNE_ID="${OVT_RUNE_ID:-OTORI}"  # Replace with actual rune ID
FEE_RATE=1  # sat/vB
DISTRIBUTION_AMOUNT=210000  # 10% of supply (if total is 2,100,000)
DRY_RUN=true  # Set to false to execute the transaction

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
        --help)
            echo "Usage: ./distribute-to-lp.sh [options]"
            echo ""
            echo "Options:"
            echo "  --no-dry-run             Actually send the transaction (default is dry-run)"
            echo "  --amount=AMOUNT          Amount of OVT to distribute (default: 210000)"
            echo "  --treasury=ADDRESS       Treasury wallet address"
            echo "  --lp=ADDRESS             LP wallet address"
            echo "  --rune=ID                Rune ID (default: OTORI)"
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

echo "=========================================================="
echo "OVT Distribution to LP Wallet"
echo "=========================================================="
echo "Treasury Address: $TREASURY_ADDRESS"
echo "LP Address: $LP_ADDRESS"
echo "Rune ID: $OVT_RUNE_ID"
echo "Distribution Amount: $DISTRIBUTION_AMOUNT OVT"
echo "Fee Rate: $FEE_RATE sat/vB"
echo "Mode: $([ "$DRY_RUN" = true ] && echo 'DRY RUN (no transaction)' || echo 'LIVE (will create transaction)')"
echo ""

# Create the transfer command - we'll use ord's wallet balance command
TRANSFER_CMD="ord --signet wallet balance --rune $OVT_RUNE_ID --amount $DISTRIBUTION_AMOUNT --outpoint <UTXO> --fee-rate $FEE_RATE --destination $LP_ADDRESS"

echo "Checking for available UTXOs in treasury wallet..."
# In actual implementation, you would need to get the specific UTXO holding the runes
# This is a placeholder for the actual command to identify the correct UTXO

if [ "$DRY_RUN" = true ]; then
    echo "RUNNING IN DRY-RUN MODE (no transaction will be sent)"
    echo ""
    echo "Would execute a command similar to:"
    echo "$TRANSFER_CMD"
    echo ""
    echo "Note: In actual execution, you need to specify the exact UTXO holding the runes"
else
    echo "EXECUTING COMMAND (transaction will be sent):"
    echo ""
    echo "Executing in 3 seconds... Press Ctrl+C to cancel"
    echo "Note: In actual execution, you need to specify the exact UTXO holding the runes"
    sleep 3
    
    # This is a placeholder - in reality you would:
    # 1. Find the specific UTXO with the runes
    # 2. Create a transaction sending those runes to the LP address
    echo "This script requires implementation of the actual transfer mechanism"
    echo "based on your specific rune UTXO management system"
    
    # Example of what this might look like using bitcoin-cli for transferring runes
    # Replace with actual implementation that works with your rune setup
    # bitcoin-cli -signet -rpcwallet=treasury sendtoaddress "$LP_ADDRESS" 0.0000546 "" "" true true null "unset" null false "$OVT_RUNE_ID=$DISTRIBUTION_AMOUNT"
fi

echo ""
echo "Script completed." 