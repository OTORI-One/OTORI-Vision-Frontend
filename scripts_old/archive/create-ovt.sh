#!/bin/bash

# OTORI Vision Token (OVT) Creation Script
# ---------------------------------------
# This script creates both the OVT rune and its logo inscription using a batch command

# Configuration
BATCH_FILE="./ovt-rune-batch.yaml"
SERVER_PORT=8080
FEE_RATE=1
DRY_RUN=true
SERVER_PID=""
TEMP_COOKIE_FILE="/tmp/ord_server_cookie"

# Display help
function show_help {
    echo "Usage: ./create-ovt.sh [options]"
    echo ""
    echo "Options:"
    echo "  --no-dry-run       Actually send the transaction (default is dry-run)"
    echo "  --port NUMBER      Use specific port for ord server (default: 8080)"
    echo "  --help             Show this help"
    echo ""
    echo "Examples:"
    echo "  ./create-ovt.sh                  # Run in dry-run mode (no transaction sent)"
    echo "  ./create-ovt.sh --no-dry-run     # Create the rune and inscription for real"
    echo ""
}

# Function to clean up on exit
function cleanup {
    if [ -n "$SERVER_PID" ]; then
        echo "Stopping ord server (PID: $SERVER_PID)..."
        kill $SERVER_PID
    fi
    # Clean up cookie file
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
        --port)
            SERVER_PORT=$2
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

# Create a temporary cookie file for authentication with the server
echo "Creating temporary cookie file for server authentication..."
echo "ord:$(openssl rand -hex 16)" > "$TEMP_COOKIE_FILE"
chmod 600 "$TEMP_COOKIE_FILE"

# Step 1: Start ord server
echo "Starting ord server on port $SERVER_PORT..."
ord --signet server --http-port $SERVER_PORT &
SERVER_PID=$!

# Give the server time to start
echo "Waiting for server to start..."
sleep 3

# Test server connection
echo "Testing connection to ord server..."
curl -s "http://127.0.0.1:$SERVER_PORT/status" > /dev/null
if [ $? -ne 0 ]; then
    echo "ERROR: Could not connect to ord server on port $SERVER_PORT"
    exit 1
fi
echo "Server is running!"
echo ""

# Create the OVT
echo "Creating OTORI Vision Token (OVT) with logo..."
echo "--------------------------------------------"
echo "Using batch file: $BATCH_FILE"
echo "Fee rate: $FEE_RATE sat/vB"
echo "Mode: $([ "$DRY_RUN" = true ] && echo 'DRY RUN (no transaction)' || echo 'LIVE (will create transaction)')"
echo ""

# Build the command with explicit connection to our running server
BATCH_CMD="ord --signet --bitcoin-rpc-url=http://127.0.0.1:$SERVER_PORT --cookie-file=$TEMP_COOKIE_FILE wallet batch --fee-rate $FEE_RATE --batch \"$BATCH_FILE\""

# Add dry-run if needed
if [ "$DRY_RUN" = true ]; then
    BATCH_CMD="$BATCH_CMD --dry-run"
fi

# Execute the batch command
echo "Executing batch command:"
echo "$BATCH_CMD"
echo ""
echo "Running in 3 seconds... Press Ctrl+C to cancel"
sleep 3

# Run the command
eval "$BATCH_CMD"

echo ""
echo "Batch processing completed." 