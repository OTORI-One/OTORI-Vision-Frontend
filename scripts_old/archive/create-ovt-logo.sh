#!/bin/bash

# OTORI Vision Token (OVT) Logo Inscription Script
# -----------------------------------------------
# This script inscribes the OTORI logo for the OVT rune

# Configuration
LOGO_FILE="./OTORI-bird-LIVE.webp"
OVT_DESTINATION="tb1p7pjgu34lprrtj24gq203zyyjjju34e9ftaarstjas2877zxuar2q5ru9yz"
FEE_RATE=1
DRY_RUN=true

# Display help
function show_help {
    echo "Usage: ./create-ovt-logo.sh [options]"
    echo ""
    echo "Options:"
    echo "  --no-dry-run       Actually send the transaction (default is dry-run)"
    echo "  --help             Show this help"
    echo ""
    echo "Examples:"
    echo "  ./create-ovt-logo.sh                # Run in dry-run mode (no transaction sent)"
    echo "  ./create-ovt-logo.sh --no-dry-run   # Create the inscription for real"
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

# Check if logo file exists
if [ ! -f "$LOGO_FILE" ]; then
    echo "ERROR: Logo file $LOGO_FILE doesn't exist."
    echo "Make sure the file path is correct."
    exit 1
fi

# Create the inscription
echo ""
echo "Creating OTORI Vision Token (OVT) Logo Inscription..."
echo "-------------------------------------------------"
echo "Logo file:      $LOGO_FILE"
echo "Destination:    $OVT_DESTINATION"
echo "Fee rate:       $FEE_RATE sat/vB"
echo "Mode:           $([ "$DRY_RUN" = true ] && echo 'DRY RUN (no transaction)' || echo 'LIVE (will create transaction)')"
echo ""

# Build command
CMD="ord --signet wallet inscribe --fee-rate $FEE_RATE --file \"$LOGO_FILE\" --destination $OVT_DESTINATION"

# Add dry-run if needed
if [ "$DRY_RUN" = true ]; then
    echo "RUNNING IN DRY-RUN MODE (no transaction will be sent)"
    # Check if --dry-run is supported
    if ord wallet inscribe --help | grep -q "\-\-dry-run"; then
        CMD="$CMD --dry-run"
        echo "Executing: $CMD"
        eval "$CMD"
    else
        # Just echo the command if --dry-run isn't supported
        echo "Command that would be executed:"
        echo "$CMD"
        echo ""
        echo "To execute for real, run with --no-dry-run option"
    fi
    exit 0
fi

# Execute command (non-dry-run mode)
echo "EXECUTING COMMAND (transaction will be sent):"
echo "$CMD"
echo ""
echo "Executing in 3 seconds... Press Ctrl+C to cancel"
sleep 3

# Execute the command
eval "$CMD" 