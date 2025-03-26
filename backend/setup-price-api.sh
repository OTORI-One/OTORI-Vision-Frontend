#!/bin/bash

# Setup script for OTORI Vision centralized price API
# This script sets up the required packages and directories on the WebPi

echo "Setting up OTORI Vision centralized price API on WebPi..."

# Define the correct paths for the WebPi
BACKEND_PATH="/home/otori-pi/OTORI-Vision-Frontend/backend"
FRONTEND_PATH="/home/otori-pi/OTORI-Vision-Frontend/frontend"

# Create data directory
echo "Creating data directory..."
mkdir -p $BACKEND_PATH/data

# Create services and routes directories
echo "Creating API structure directories..."
mkdir -p $BACKEND_PATH/api/services
mkdir -p $BACKEND_PATH/api/routes

# Install required packages
echo "Installing required Node.js packages..."
cd $BACKEND_PATH
npm install axios cors express dotenv
npm install -D nodemon

# Copy price service files
echo "Copying price service files..."
cp api/services/priceService.js $BACKEND_PATH/api/services/
cp api/routes/priceRoutes.js $BACKEND_PATH/api/routes/
cp api/index.js $BACKEND_PATH/api/

# Update PM2 configuration to include the new API endpoint
echo "Updating PM2 configuration..."
pm2 stop otori-backend || true
pm2 start $BACKEND_PATH/api/index.js --name otori-price-api --watch

echo "Setting environment variable for frontend to use the new API..."
echo "NEXT_PUBLIC_PRICE_API_URL=http://localhost:3030/api/price" >> $FRONTEND_PATH/.env.local

echo "Setup complete! The centralized price API is now running on http://localhost:3030/api/price"
echo "You may need to restart your frontend application to pick up the new environment variable."
echo "Run 'pm2 restart all' to restart all services." 