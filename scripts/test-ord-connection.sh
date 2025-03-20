#!/bin/bash

# Script to test basic ord commands with Bitcoin Core on signet
# This script focuses on establishing a reliable connection first

echo "OTORI Vision Token - Basic ORD Test Script"
echo "=========================================="
echo ""

# Set Bitcoin Core RPC credentials
RPC_USER="bitcoin"
RPC_PASS="bitcoin"
RPC_PORT="38332"
RPC_URL="http://127.0.0.1:${RPC_PORT}"

echo "Testing connection to Bitcoin Core on ${RPC_URL}..."
echo ""

# Use the proven working command to list wallets
echo "Listing wallets..."
ord --signet --bitcoin-rpc-username=${RPC_USER} --bitcoin-rpc-password=${RPC_PASS} --bitcoin-rpc-url=${RPC_URL} wallets

# Check wallet balance
echo ""
echo "Checking ord wallet balance..."
ord --signet --bitcoin-rpc-username=${RPC_USER} --bitcoin-rpc-password=${RPC_PASS} --bitcoin-rpc-url=${RPC_URL} wallet balance

# Get a receive address
echo ""
echo "Getting a receive address..."
ord --signet --bitcoin-rpc-username=${RPC_USER} --bitcoin-rpc-password=${RPC_PASS} --bitcoin-rpc-url=${RPC_URL} wallet receive

echo ""
echo "Testing complete!" 