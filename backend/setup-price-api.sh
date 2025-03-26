#!/bin/bash

# Setup script for OTORI Vision centralized price API
# This script sets up the required packages and directories on the WebPi

echo "Setting up OTORI Vision centralized price API on WebPi..."

# Create data directory
echo "Creating data directory..."
mkdir -p /home/otori/OTORI-Vision/backend/data

# Create services and routes directories
echo "Creating API structure directories..."
mkdir -p /home/otori/OTORI-Vision/backend/api/services
mkdir -p /home/otori/OTORI-Vision/backend/api/routes

# Install required packages
echo "Installing required Node.js packages..."
cd /home/otori/OTORI-Vision/backend
npm install axios cors express dotenv
npm install -D nodemon

# Copy price service files
echo "Copying price service files..."
cp api/services/priceService.js /home/otori/OTORI-Vision/backend/api/services/
cp api/routes/priceRoutes.js /home/otori/OTORI-Vision/backend/api/routes/
cp api/index.js /home/otori/OTORI-Vision/backend/api/

# Update PM2 configuration to include the new API endpoint
echo "Updating PM2 configuration..."
pm2 stop otori-backend || true
pm2 start api/index.js --name otori-price-api --watch

echo "Setting environment variable for frontend to use the new API..."
echo "NEXT_PUBLIC_PRICE_API_URL=http://localhost:3030/api/price" >> /home/otori/OTORI-Vision/frontend/.env.local

echo "Setup complete! The centralized price API is now running on http://localhost:3030/api/price"
echo "You may need to restart your frontend application to pick up the new environment variable."
echo "Run 'pm2 restart all' to restart all services." 