# OTORI Vision Centralized Price Service

This document explains the implementation and deployment of the centralized price service for OTORI Vision, which resolves the price inconsistency issues across different clients.

## Overview

The centralized price service addresses three critical issues observed in the application:

1. **Inconsistent Price Data**: Different browser instances were calculating and displaying different prices.
2. **24hr Change Percentage Not Updating**: The daily change percentage was not being accurately tracked.
3. **Different Bitcoin Exchange Rates**: Different BTC/USD conversion rates were being used.

By moving the price calculation to a centralized server, we ensure all clients receive the same pricing data.

## Architecture

The solution follows a client-server architecture:

1. **Backend (WebPi)**:
   - Stores and manages the price data in JSON files
   - Runs price movement simulations
   - Provides consistent pricing via REST API endpoints
   - Maintains historical price data for accurate 24hr change calculation
   - Uses a single centralized Bitcoin price source

2. **Frontend**:
   - Uses new hooks to fetch data from the price API
   - Falls back to mock data when needed in hybrid mode
   - Caches pricing data for optimal performance
   - Maintains the same UI while switching to server-sourced data

## Implementation Details

### Backend Components

1. **Price Service** (`api/services/priceService.js`):
   - Manages price data storage and retrieval
   - Implements price movement simulations based on the original algorithm
   - Provides price history tracking for accurate 24hr changes
   - Maintains a consistent Bitcoin exchange rate for all clients

2. **Price Routes** (`api/routes/priceRoutes.js`):
   - Exposes RESTful API endpoints for accessing price data
   - Provides endpoints for portfolio positions, OVT price, NAV, and history
   - Includes an admin endpoint for triggering manual price updates

3. **Data Storage** (`data/`):
   - `price-data.json`: Stores the full price state including history
   - `btc-price.json`: Stores the Bitcoin price cache

### Frontend Components

1. **Price Service** (`src/services/priceService.ts`):
   - Provides TypeScript interfaces for price data
   - Handles API communication and error handling
   - Implements client-side caching for optimal performance

2. **Hooks**:
   - `useOVTPrice`: Fetches OVT price data from the API
   - `usePortfolio`: Fetches portfolio positions from the API

## API Endpoints

The price service provides the following API endpoints:

- `GET /api/price/portfolio`: Get all portfolio positions with current prices
- `GET /api/price/ovt`: Get current OVT price data
- `GET /api/price/bitcoin`: Get current Bitcoin price
- `GET /api/price/history/:positionName`: Get price history for a specific position
- `GET /api/price/nav`: Get NAV data including total value and changes
- `POST /api/price/update`: Trigger a manual price update (admin only)

## Deployment Instructions

To deploy the centralized price service on the WebPi:

1. **Set up the directory structure**:
   ```bash
   # Create required directories
   mkdir -p OTORI-Vision/backend/data
   mkdir -p OTORI-Vision/backend/api/services
   mkdir -p OTORI-Vision/backend/api/routes
   ```

2. **Transfer the new backend files**:
   - Copy `api/services/priceService.js` to WebPi
   - Copy `api/routes/priceRoutes.js` to WebPi
   - Update `api/index.js` on WebPi

3. **Install required packages**:
   ```bash
   cd OTORI-Vision/backend
   npm install axios cors express dotenv
   npm install -D nodemon
   ```

4. **Start the service with PM2**:
   ```bash
   pm2 start api/index.js --name otori-price-api --watch
   ```

5. **Update the frontend environment variables**:
   ```bash
   # Add to .env.local
   NEXT_PUBLIC_PRICE_API_URL=http://localhost:3030/api/price
   ```

6. **Restart the frontend**:
   ```bash
   pm2 restart otori-frontend
   ```

## Automatic Setup

For convenience, a setup script is provided:

```bash
# Make the script executable
chmod +x setup-price-api.sh

# Run the script
./setup-price-api.sh
```

## Advantages of Centralized Price Service

1. **Consistency**: All clients see the same prices and NAV values.
2. **Accuracy**: Historical tracking enables precise 24hr change calculations.
3. **Efficiency**: Reduced client-side calculations improve performance.
4. **Resilience**: Service continues to work even after browser refreshes.
5. **Realism**: Price movements more closely simulate real market behavior.
6. **Maintainability**: Easier to update price algorithms in one place.

## Testing

After deployment, verify the service is working correctly:

1. **Check API endpoints**:
   ```bash
   curl http://localhost:3030/api/price/ovt
   curl http://localhost:3030/api/price/portfolio
   ```

2. **Open multiple browsers**:
   - Verify all browsers display the same OVT price
   - Verify the 24hr change percentage is consistent
   - Verify Bitcoin exchange rates are identical

## Future Enhancements

1. **Database Storage**: Replace JSON files with a proper database for improved reliability.
2. **Authentication**: Add API authentication for admin endpoints.
3. **WebSockets**: Implement real-time price updates via WebSockets.
4. **External Price Feeds**: Integrate with real crypto price APIs when available.
5. **Caching Layer**: Add Redis or similar caching for high-performance applications.

## Troubleshooting

If you encounter issues:

1. **Check PM2 logs**:
   ```bash
   pm2 logs otori-price-api
   ```

2. **Verify data directory permissions**:
   ```bash
   ls -la OTORI-Vision/backend/data
   ```

3. **Test API endpoints manually**:
   ```bash
   curl http://localhost:3030/api/price/ovt
   ```

4. **Restart services**:
   ```bash
   pm2 restart all
   ```

5. **Clear frontend cache**: Press Ctrl+F5 in browsers to force-refresh. 