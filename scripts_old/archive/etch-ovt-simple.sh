#!/bin/bash

# Direct script to etch OVT rune with explicit parameters
# Usage: ./etch-ovt-direct.sh [--test]

# Default values
FEE_RATE=1
TEST_MODE=false
BATCH_FILE="./ovt-rune-batch.yaml"
RPC_URL="http://[::1]:38332"
COOKIE_FILE="$HOME/.bitcoin/signet/.cookie"

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --test)
      TEST_MODE=true
      shift
      ;;
    --fee-rate=*)
      FEE_RATE="${arg#*=}"
      shift
      ;;
    *)
      # Unknown option
      ;;
  esac
done

# Build the command with explicit parameters
CMD="ord --signet --bitcoin-rpc-url=\"$RPC_URL\" --cookie-file=\"$COOKIE_FILE\" wallet batch --fee-rate $FEE_RATE --batch \"$BATCH_FILE\""

# Add dry-run if test mode is enabled
if [ "$TEST_MODE" = true ]; then
  CMD="$CMD --dry-run"
  echo "TEST MODE: This is a dry run. No transactions will be broadcast."
fi

echo "Executing: $CMD"

if [ "$TEST_MODE" = true ]; then
  # Execute directly in test mode
  eval $CMD
else
  # Ask for confirmation before broadcasting
  echo "This will etch the OVT rune and broadcast the transaction."
  read -p "Are you sure you want to continue? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    eval $CMD
  else
    echo "Operation cancelled."
    exit 1
  fi
fi