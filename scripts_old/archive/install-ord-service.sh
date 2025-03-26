#!/bin/bash

# Install Ord Server as a systemd service
# --------------------------------------
# This script installs the ord server as a system service that starts automatically

echo "Installing Ord Server as a systemd service"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "This script must be run as root. Please use sudo."
  exit 1
fi

# Path to this script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_FILE="${SCRIPT_DIR}/ord-server.service"

# Check if service file exists
if [ ! -f "$SERVICE_FILE" ]; then
  echo "ERROR: Service file $SERVICE_FILE not found!"
  exit 1
fi

# Check if ord is installed
if ! command -v ord &> /dev/null; then
  echo "ERROR: ord command not found. Please install ord first."
  exit 1
fi

# Get the actual path to the ord binary
ORD_PATH=$(which ord)
echo "Found ord at: $ORD_PATH"

# Update the path in the service file if needed
sed -i "s|ExecStart=/usr/local/bin/ord|ExecStart=$ORD_PATH|g" "$SERVICE_FILE"

# Copy the service file to systemd directory
echo "Copying service file to /etc/systemd/system/"
cp "$SERVICE_FILE" /etc/systemd/system/ord-server.service

# Reload systemd to recognize the new service
echo "Reloading systemd daemon..."
systemctl daemon-reload

# Enable the service to start on boot
echo "Enabling ord-server service to start on boot..."
systemctl enable ord-server.service

# Start the service
echo "Starting ord-server service..."
systemctl start ord-server.service

# Check if the service is running
sleep 3
if systemctl is-active --quiet ord-server.service; then
  echo "✅ Ord server service is now running!"
  echo "You can check its status with: systemctl status ord-server.service"
  echo "View logs with: journalctl -u ord-server.service -f"
else
  echo "❌ Failed to start ord-server service."
  echo "Check status with: systemctl status ord-server.service"
  echo "Check logs with: journalctl -u ord-server.service"
fi

echo ""
echo "Now you can use the create-ovt-direct.sh script to create your OVT rune!" 