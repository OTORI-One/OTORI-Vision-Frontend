#!/bin/bash

# OTORI Vision Token (OVT) Creation Script - Direct Command
# -------------------------------------------------------
# This script creates OVT rune by connecting to a running ord server

# Configuration
BATCH_FILE="./ovt-rune-batch.yaml"
SERVER_URL="http://127.0.0.1:8080"
TEMP_COOKIE_FILE="/tmp/ord_server_cookie"
FEE_RATE=1
DRY_RUN=true

# Display help
function show_help {
    echo "Usage: ./create-ovt-direct.sh [options]"
    echo ""
    echo "Options:"
    echo "  --no-dry-run       Actually send the transaction (default is dry-run)"
    echo "  --server URL       URL of the ord server (default: http://127.0.0.1:8080)"
    echo "  --help             Show this help"
    echo ""
    echo "Examples:"
    echo "  ./create-ovt-direct.sh                  # Run in dry-run mode (no transaction sent)"
    echo "  ./create-ovt-direct.sh --no-dry-run     # Create the rune and inscription for real"
    echo ""
}

# Cleanup function for temp files
function cleanup {
    # Remove temporary cookie file if it exists
    [ -f "$TEMP_COOKIE_FILE" ] && rm -f "$TEMP_COOKIE_FILE"
}

# Set up trap to clean up on exit
trap cleanup EXIT INT TERM

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-dry-run)
            DRY_RUN=false
            shift
            ;;
        --server)
            SERVER_URL="$2"
            shift 2
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

# Test if server is running
echo "Testing connection to ord server at $SERVER_URL..."
curl -s "$SERVER_URL/status" > /dev/null
if [ $? -ne 0 ]; then
    echo "ERROR: Could not connect to ord server at $SERVER_URL"
    echo "Make sure the ord server is running and accessible."
    exit 1
fi
echo "Server is running!"

# Create a temporary cookie file for authentication
echo "Creating temporary cookie file for authentication..."
echo "ord:$(openssl rand -hex 16)" > "$TEMP_COOKIE_FILE"
chmod 600 "$TEMP_COOKIE_FILE"

# Create the OVT
echo ""
echo "Creating OTORI Vision Token (OVT) with logo..."
echo "--------------------------------------------"
echo "Using batch file: $BATCH_FILE"
echo "Fee rate: $FEE_RATE sat/vB"
echo "Mode: $([ "$DRY_RUN" = true ] && echo 'DRY RUN (no transaction)' || echo 'LIVE (will create transaction)')"
echo ""

# Try with explict RPC URL
CMD="ord --signet --bitcoin-rpc-url=$SERVER_URL --cookie-file=$TEMP_COOKIE_FILE wallet batch --fee-rate $FEE_RATE --batch \"$BATCH_FILE\""

# Add dry-run if needed
if [ "$DRY_RUN" = true ]; then
    CMD="$CMD --dry-run"
fi

# Execute the command
echo "Executing command:"
echo "$CMD"
echo ""
echo "Running in 3 seconds... Press Ctrl+C to cancel"
sleep 3

# Run the command
eval "$CMD"

echo ""
echo "Command completed." 