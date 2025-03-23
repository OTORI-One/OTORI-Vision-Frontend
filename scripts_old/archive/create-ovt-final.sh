#!/bin/bash

# OTORI Vision Token (OVT) Creation Script - Final Version
# ------------------------------------------------------
# This script creates the OVT rune using direct commands

# Configuration
BATCH_FILE="./ovt-rune-batch.yaml"
FEE_RATE=1
DRY_RUN=true

# Display help
function show_help {
    echo "Usage: ./create-ovt-final.sh [options]"
    echo ""
    echo "Options:"
    echo "  --no-dry-run       Actually send the transaction (default is dry-run)"
    echo "  --help             Show this help"
    echo ""
    echo "Examples:"
    echo "  ./create-ovt-final.sh                  # Run in dry-run mode (no transaction sent)"
    echo "  ./create-ovt-final.sh --no-dry-run     # Create the rune for real"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-dry-run)
            DRY_RUN=false
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check if batch file exists
if [ ! -f "$BATCH_FILE" ]; then
    echo "ERROR: Batch file $BATCH_FILE not found!"
    exit 1
fi

# Verify Bitcoin Core is running
echo "Checking Bitcoin Core status..."
bitcoin-cli -signet getblockchaininfo > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "ERROR: Bitcoin Core doesn't seem to be running or accessible."
    echo "Make sure Bitcoin Core is running in signet mode and properly configured."
    exit 1
fi

# Check ord wallet exists and has funds
echo "Checking ord wallet balance..."
ORD_BALANCE=$(bitcoin-cli -signet -rpcwallet=ord getbalance)
if (( $(echo "$ORD_BALANCE <= 0" | bc -l) )); then
    echo "ERROR: The ord wallet has no funds. Please fund the wallet first."
    echo "Current balance: $ORD_BALANCE BTC"
    exit 1
fi
echo "ord wallet balance: $ORD_BALANCE BTC"

# Extract settings from batch file for individual commands
RUNE_NAME=$(grep -A5 "etching:" "$BATCH_FILE" | grep "rune:" | cut -d':' -f2 | tr -d ' ')
DIVISIBILITY=$(grep -A5 "etching:" "$BATCH_FILE" | grep "divisibility:" | cut -d':' -f2 | tr -d ' ')
SUPPLY=$(grep -A5 "etching:" "$BATCH_FILE" | grep "supply:" | cut -d':' -f2 | tr -d ' ')
SYMBOL=$(grep -A5 "etching:" "$BATCH_FILE" | grep "symbol:" | cut -d':' -f2 | tr -d ' ')
DESTINATION=$(grep "destination:" "$BATCH_FILE" | head -1 | cut -d':' -f2 | tr -d ' ')

echo "Extracted settings from batch file:"
echo "Rune name: $RUNE_NAME"
echo "Divisibility: $DIVISIBILITY"
echo "Supply: $SUPPLY"
echo "Symbol: $SYMBOL"
echo "Destination: $DESTINATION"
echo ""

# Create the OVT Rune
echo "Creating OTORI Vision Token (OVT)..."
echo "----------------------------------------------------"
echo "Fee rate: $FEE_RATE sat/vB"
echo "Mode: $([ "$DRY_RUN" = true ] && echo 'DRY RUN (no transaction)' || echo 'LIVE (will create transaction)')"
echo ""

# Build the rune creation command
MINT_CMD="ord --signet wallet mint --fee-rate $FEE_RATE --rune $RUNE_NAME --divisibility $DIVISIBILITY --supply $SUPPLY --symbol $SYMBOL --destination $DESTINATION"

# Execute the command
if [ "$DRY_RUN" = true ]; then
    echo "RUNNING IN DRY-RUN MODE (no transaction will be sent)"
    echo ""
    echo "Would execute:"
    echo "$MINT_CMD"
else
    echo "EXECUTING COMMAND (transaction will be sent):"
    echo ""
    echo "Executing in 3 seconds... Press Ctrl+C to cancel"
    echo "$MINT_CMD"
    sleep 3
    echo "Running rune creation..."
    eval "$MINT_CMD"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "Rune creation successful!"
    else
        echo ""
        echo "Rune creation failed. Please check the error message."
    fi
fi

echo ""
echo "Script completed." 