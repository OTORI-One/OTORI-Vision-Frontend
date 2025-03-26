# OTORI Vision Token Price Movement Algorithm

This document outlines the sophisticated price movement algorithm implemented for the OTORI Vision Token (OVT) portfolio positions.

## Overview

The price movement algorithm provides a realistic simulation of investment position value changes with the following characteristics:

- Overall positive trend (+5-10% monthly, configurable)
- Daily fluctuations (-3% to +5%)
- Random "super spikes" (+/- 25-50%) every 5-14 days

## Implementation Details

### Core Algorithm Components

1. **Daily Price Changes** (`generateDailyPriceChange`)
   - Generates daily fluctuations between -3% and +5%
   - Implements a configurable positive bias to create an overall upward trend
   - Uses a normal-like distribution via Box-Muller transform
   - Positive bias can be enabled or disabled as needed

2. **Super Spikes** (`generateSuperSpike`, `shouldTriggerSuperSpike`)
   - Generates extreme price movements between +25% to +50% (positive spikes) and -25% to -50% (negative spikes)
   - Distribution is weighted with 70% chance of positive spikes and 30% chance of negative spikes
   - Triggers based on a probability system that aims for 5-14 days between spikes
   - Increases probability the longer it's been since the last spike
   - Prevents consecutive spike days
   - Records spike days to prevent excessive volatility

3. **Price Movement Application** (`applyPriceMovement`)
   - Applies price changes to portfolio positions
   - Updates current value, change percentage, and token price
   - Ensures values never go negative (minimum value of 1)
   - Tracks spike days for future reference

4. **Portfolio Simulation** (`simulatePortfolioPriceMovements`)
   - Processes all positions in the portfolio
   - Applies appropriate price changes to each position
   - Maintains data consistency across all positions
   - Allows configuring the positive bias for the simulation

### Simulation Features

- **Monthly Returns**: Expected monthly return maintains a moderate positive trend of approximately 5-7% (when positive bias enabled)
- **Market Patterns**: Implements realistic crypto market behavior patterns with extreme volatility
- **Spike Frequency**: Configurable spike frequency to simulate both funding events and market crashes
- **Visual Indicators**: Special indicators for recent spike events

## Technical Implementation

The algorithm uses several mathematical techniques:

- **Box-Muller Transform**: For generating normal-like distributions
- **Probability-based Events**: For triggering spikes with natural frequency
- **Weighted Randomization**: For creating asymmetric distribution of positive vs. negative spikes
- **Volatility Modeling**: For simulating realistic market movements

## Centralized Price Service (Current Implementation)

As of our latest update, we've moved from the client-side price simulation to a centralized price service architecture:

### Price Service Features

1. **WebSocket-Based Real-Time Updates**: Provides real-time price data to all connected clients
2. **Centralized Price Calculation**: Ensures consistent price data across all clients
3. **Reduced Client-Side Processing**: Moves computation to the server, improving client performance
4. **Concurrent User Support**: Multiple users see the same consistent price data
5. **Real-Time Price Changes**: Updates propagate instantly to all connected clients

### Technical Components

1. **Backend Price Service** (`backend/api/services/priceService.js`)
   - Implements the core price movement algorithm on the server
   - Broadcasts price updates to all connected clients via WebSockets
   - Maintains price data integrity and persistence

2. **Price API Routes** (`backend/api/routes/priceRoutes.js`)
   - Provides HTTP endpoints for price data retrieval
   - Manages WebSocket connections for real-time updates

3. **Frontend Integration** (`frontend/src/hooks/useOVTPrice.ts`, `frontend/src/services/priceService.ts`)
   - Connects to the WebSocket service for real-time price updates
   - Provides a clean React hook interface for components
   - Maintains connection state and error handling

### Setup and Configuration

The centralized price service is automatically set up when deploying the application, using:

```bash
# Setup the centralized price API service
./backend/setup-price-api.sh
```

## Usage

### Integration with Portfolio Components

The price data is accessed through:

1. **React Hook**: `useOVTPrice` for component integration (replaced previous `usePortfolioPrices`)
2. **WebSocket Connection**: Automatic real-time updates from the server
3. **Price Service**: Backend service that maintains consistent price calculation

### Configuration Environment Variables

```
NEXT_PUBLIC_PRICE_API_URL=http://localhost:3030/api/price
```

## Performance Metrics

The algorithm is calibrated to produce the following metrics:

- **Volatility**: Annualized volatility of approximately 30-50% (similar to crypto markets)
- **Sharpe Ratio**: Target Sharpe ratio of 0.8-1.2 (with positive bias enabled)
- **Maximum Drawdown**: Can reach 40-60% during extreme negative spike sequences
- **Win Rate**: Approximately 55-60% positive days (with positive bias)

## Extension Points

The algorithm can be extended in several ways:

1. **External Price Feeds**: Integration with real Bitcoin price feeds
2. **Additional Market Factors**: Correlation with market sentiment indicators
3. **Position-specific Parameters**: Different volatility profiles per position
4. **Advanced Simulation**: Monte Carlo simulations for risk analysis
5. **Market Regime Modeling**: Add support for bull/bear market regime shifts
6. **Enhanced WebSocket Infrastructure**: Scale WebSocket connections for larger user bases
7. **Fault Tolerance**: Implement recovery mechanisms for service interruptions

## Implementation Files

### Server-side (Centralized)
- `backend/api/services/priceService.js` - Core price service implementation
- `backend/api/routes/priceRoutes.js` - API routes for price data
- `backend/api/index.js` - Server setup and WebSocket initialization

### Client-side
- `frontend/src/services/priceService.ts` - WebSocket client and service integration
- `frontend/src/hooks/useOVTPrice.ts` - React hook for component integration

### Legacy (Pre-Centralization)
- `src/utils/priceMovement.ts` - Previous client-side algorithm implementation
- `src/hooks/usePortfolioPrices.ts` - Previous React hook for component integration
- `src/utils/portfolioLoader.ts` - Data loading utilities
- `scripts/simulatePriceMovements.ts` - Simulation script for testing

---

For more information on the OTORI Vision Project, please refer to the main documentation. 