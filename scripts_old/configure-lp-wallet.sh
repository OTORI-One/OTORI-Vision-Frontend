#!/bin/bash

# Script to configure the LP wallet in the system
# This updates the necessary config files and environment variables

# Configuration
LP_ADDRESS="${LP_ADDRESS:-<LP_WALLET_ADDRESS_HERE>}"  # Replace with actual LP address
ENV_FILE=".env.local"  # Environment file to update/create
API_CONFIG_FILE="scripts/runes_API.js"  # API config to update

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --lp=*)
            LP_ADDRESS="${1#*=}"
            shift
            ;;
        --env=*)
            ENV_FILE="${1#*=}"
            shift
            ;;
        --api-config=*)
            API_CONFIG_FILE="${1#*=}"
            shift
            ;;
        --help)
            echo "Usage: ./configure-lp-wallet.sh [options]"
            echo ""
            echo "Options:"
            echo "  --lp=ADDRESS             LP wallet address"
            echo "  --env=FILE               Environment file to update (default: .env.local)"
            echo "  --api-config=FILE        API config file to update (default: scripts/runes_API.js)"
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

# Verify LP address is provided
if [ "$LP_ADDRESS" = "<LP_WALLET_ADDRESS_HERE>" ]; then
    echo "ERROR: LP address not set. Use --lp=ADDRESS"
    exit 1
fi

echo "=========================================================="
echo "LP Wallet Configuration"
echo "=========================================================="
echo "LP Address: $LP_ADDRESS"
echo "Environment File: $ENV_FILE"
echo "API Config File: $API_CONFIG_FILE"
echo ""

# Update or create environment file
echo "Updating environment configuration..."
touch "$ENV_FILE"

# Check if LP_WALLET_ADDRESS already exists in the env file
if grep -q "^LP_WALLET_ADDRESS=" "$ENV_FILE"; then
    # Replace existing LP_WALLET_ADDRESS
    sed -i "s|^LP_WALLET_ADDRESS=.*|LP_WALLET_ADDRESS=$LP_ADDRESS|" "$ENV_FILE"
else
    # Add LP_WALLET_ADDRESS
    echo "LP_WALLET_ADDRESS=$LP_ADDRESS" >> "$ENV_FILE"
fi

# Make sure hybrid mode is enabled
if grep -q "^NEXT_PUBLIC_MOCK_MODE=" "$ENV_FILE"; then
    sed -i "s|^NEXT_PUBLIC_MOCK_MODE=.*|NEXT_PUBLIC_MOCK_MODE=hybrid|" "$ENV_FILE"
else
    echo "NEXT_PUBLIC_MOCK_MODE=hybrid" >> "$ENV_FILE"
fi

# Ensure trading data source is configured
if grep -q "^NEXT_PUBLIC_TRADING_DATA_SOURCE=" "$ENV_FILE"; then
    sed -i "s|^NEXT_PUBLIC_TRADING_DATA_SOURCE=.*|NEXT_PUBLIC_TRADING_DATA_SOURCE=mock|" "$ENV_FILE"
else
    echo "NEXT_PUBLIC_TRADING_DATA_SOURCE=mock" >> "$ENV_FILE"
fi

echo "Environment file updated with LP wallet address and hybrid mode settings."
echo ""

# Update API configuration if file exists
if [ -f "$API_CONFIG_FILE" ]; then
    echo "Updating API configuration..."
    
    # This is a simple search and replace for common patterns in the API config
    # For a real implementation, you might want a more robust approach
    
    # Look for LP_ADDRESS constant
    if grep -q "LP_ADDRESS" "$API_CONFIG_FILE"; then
        sed -i "s|const LP_ADDRESS = .*|const LP_ADDRESS = '$LP_ADDRESS';|" "$API_CONFIG_FILE"
        echo "Updated LP_ADDRESS in API config."
    else
        echo "WARNING: LP_ADDRESS constant not found in API config. Manual update may be required."
    fi
    
    # Look for balances mock data section and update
    if grep -q "balances =" "$API_CONFIG_FILE"; then
        echo "Found balances section in API config. To update the LP wallet address in mock data,"
        echo "you may need to manually edit $API_CONFIG_FILE."
    fi
    
    echo "API configuration updates attempted. Please verify changes."
else
    echo "API config file not found: $API_CONFIG_FILE"
    echo "Skipping API configuration updates."
fi

echo ""
echo "LP wallet configuration completed."
echo "Remember to restart your application for changes to take effect." 