#!/bin/bash

# Script to test ord commands using the server approach
# This script starts an ord server and then connects to it

echo "OTORI Vision Token - ORD Server Test Script"
echo "=========================================="
echo ""

# Configuration
SERVER_PORT=8080
SERVER_PID=""

# Function to clean up on exit
function cleanup {
    if [ -n "$SERVER_PID" ]; then
        echo "Stopping ord server (PID: $SERVER_PID)..."
        kill $SERVER_PID
    fi
}

# Set up trap to clean up on exit
trap cleanup EXIT INT TERM

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

# Step 2: Use direct server endpoints (no RPC)
echo "Testing direct server API endpoints..."
echo ""

# Check server status
echo "Getting server status..."
curl -s "http://127.0.0.1:$SERVER_PORT/status" | jq .
echo ""

# Get balance (using direct endpoint rather than RPC)
echo "Getting wallet info via direct endpoint..."
curl -s "http://127.0.0.1:$SERVER_PORT/wallet" | jq .
echo ""

# Print common ord commands
echo "=========================================="
echo "COMMON COMMANDS TO RUN MANUALLY:"
echo "=========================================="
echo ""
echo "1. List runestones (in another terminal):"
echo "   ord --signet wallet runics"
echo ""
echo "2. Mint a test rune (in another terminal):"
echo "   ord --signet wallet mint --fee-rate 1 --rune \"TEST•TOKEN\""
echo ""
echo "3. Get a receive address (in another terminal):"
echo "   ord --signet wallet receive"
echo ""
echo "4. Create the OTORI Vision Token rune:"
echo "   ord --signet wallet mint --fee-rate 1 --rune \"OTORI•VISION•TOKEN\" --divisibility 2 --supply 500000 --symbol ⊙ --destination tb1p7pjgu34lprrtj24gq203zyyjjju34e9ftaarstjas2877zxuar2q5ru9yz"
echo ""
echo "Script completed. Server will continue running."
echo "Press Ctrl+C to stop the server."
echo ""

# Wait for user to manually stop the script with Ctrl+C
wait $SERVER_PID 