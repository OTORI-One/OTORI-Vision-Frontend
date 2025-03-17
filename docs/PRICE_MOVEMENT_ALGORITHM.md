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

## Usage

### Integration with Portfolio Components

The algorithm is integrated into the portfolio visualization through:

1. **React Hook**: `usePortfolioPrices` for component integration
2. **LocalStorage**: Data persistence between sessions
3. **Automatic Updates**: Regular price updates at configurable intervals
4. **Configurable Bias**: Ability to toggle the positive bias in price movements

### Simulation Script

A simulation script is provided for testing and visualization:

```bash
# Basic simulation (30 days)
npx ts-node scripts/simulatePriceMovements.ts

# Extended simulation (90 days)
npx ts-node scripts/simulatePriceMovements.ts --days=90

# Detailed output
npx ts-node scripts/simulatePriceMovements.ts --verbose

# Generate chart data (CSV format)
npx ts-node scripts/simulatePriceMovements.ts --chart > price_data.csv

# Disable positive bias
npx ts-node scripts/simulatePriceMovements.ts --no-positive-bias
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

## Implementation Files

- `src/utils/priceMovement.ts` - Core algorithm implementation
- `src/hooks/usePortfolioPrices.ts` - React hook for component integration
- `src/utils/portfolioLoader.ts` - Data loading utilities
- `scripts/simulatePriceMovements.ts` - Simulation script for testing

---

For more information on the OTORI Vision Project, please refer to the main documentation. 