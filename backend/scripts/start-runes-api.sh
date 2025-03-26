#!/bin/bash
# Startup script for the OTORI Vision Runes API server

# Navigate to the backend directory
cd "$(dirname "$0")/.."

# Default configuration
PORT=${PORT:-3030}
HOST=${HOST:-0.0.0.0}
NODE_ENV=${NODE_ENV:-production}

# Set up environment variables for the API
export PORT=$PORT
export HOST=$HOST
export NODE_ENV=$NODE_ENV

# These should be customized for your specific setup
export NEXT_PUBLIC_OVT_RUNE_ID=${NEXT_PUBLIC_OVT_RUNE_ID:-"240249:101"}
export NEXT_PUBLIC_TREASURY_ADDRESS=${NEXT_PUBLIC_TREASURY_ADDRESS:-"tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd"}
export NEXT_PUBLIC_LP_ADDRESS=${NEXT_PUBLIC_LP_ADDRESS:-"tb1p3vn6wc0dlud3tvckv95datu3stq4qycz7vj9mzpclfkrv9rh8jqsjrw38f"}

# Print configuration
echo "=== OTORI Vision Runes API Server ==="
echo "Starting server with the following configuration:"
echo "PORT: $PORT"
echo "HOST: $HOST"
echo "NODE_ENV: $NODE_ENV"
echo "OVT_RUNE_ID: $NEXT_PUBLIC_OVT_RUNE_ID"
echo "TREASURY_ADDRESS: $NEXT_PUBLIC_TREASURY_ADDRESS"
echo "LP_ADDRESS: $NEXT_PUBLIC_LP_ADDRESS"
echo "===================================="

# Start the server
echo "Starting Runes API server..."
node api/runes_API.js

# In case of error, print a message
if [ $? -ne 0 ]; then
  echo "Server terminated with an error."
  exit 1
fi 