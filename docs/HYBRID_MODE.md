# OTORI Vision Token (OVT) Hybrid Mode

## Overview

The OTORI Vision Token (OVT) application supports a hybrid mode that combines real contract interactions with predefined mock data. This approach allows for a consistent and engaging experience for testers during the incentive program while still interacting with the real deployed contract on Arch Network's testnet.

## Configuration

Hybrid mode is configured through environment variables in the `.env.local` file:

```env
# Set to 'false' to use only real data, 'true' for mock mode, or 'hybrid' for hybrid mode
NEXT_PUBLIC_MOCK_MODE=hybrid

# Granular toggles for hybrid mode (only used when NEXT_PUBLIC_MOCK_MODE=hybrid)
# Set to 'mock' to use mock data or 'real' to use real contract data
NEXT_PUBLIC_PORTFOLIO_DATA_SOURCE=mock
NEXT_PUBLIC_TRANSACTION_DATA_SOURCE=real
NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE=real
```

## Implementation Details

### 1. Hybrid Mode Utilities

The hybrid mode implementation is centered around the `hybridModeUtils.ts` file, which provides utilities for:

- Determining the current mode from environment variables
- Deciding which data sources to use for different parts of the application
- Merging real and mock data when appropriate
- Providing UI indicators for data sources

### 2. Data Source Indicators

The application includes visual indicators to clearly show users which data is real vs. simulated:

- Green indicators for real contract data
- Amber indicators for simulated data
- Red indicators for fallback data (when network errors occur)

These indicators are implemented using the `DataSourceIndicator` component.

### 3. Resilience to Network Issues

The hybrid mode implementation includes fallback mechanisms to handle network issues:

- If real data fetching fails, the application can fall back to mock data
- Clear visual indicators show when fallback data is being used
- Error states are properly managed and communicated to users

### 4. Data Consistency

To maintain data consistency between mock and real data:

- Mock data follows the same structure as real data
- Type safety is enforced throughout the application
- Data transformations are applied consistently

## Usage Scenarios

### 1. Development and Testing

During development and testing, you can use different configurations:

- `NEXT_PUBLIC_MOCK_MODE=true` - Use only mock data (fastest for development)
- `NEXT_PUBLIC_MOCK_MODE=false` - Use only real contract data (for production testing)
- `NEXT_PUBLIC_MOCK_MODE=hybrid` - Use a mix of real and mock data (for incentive program)

### 2. Incentive Program

For the incentive program, the recommended configuration is:

```env
NEXT_PUBLIC_MOCK_MODE=hybrid
NEXT_PUBLIC_PORTFOLIO_DATA_SOURCE=mock
NEXT_PUBLIC_TRANSACTION_DATA_SOURCE=real
NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE=real
```

This configuration:
- Uses predefined portfolio positions for consistent visualization
- Uses real transaction data to show actual contract interactions
- Uses real token supply data to reflect the current state of the contract

## Transition Path

The hybrid mode is designed as a temporary solution for the incentive program. The transition path to eventually using only real data involves:

1. Gradually shifting data sources from mock to real:
   ```env
   # Phase 1: Start with mostly mock data
   NEXT_PUBLIC_PORTFOLIO_DATA_SOURCE=mock
   NEXT_PUBLIC_TRANSACTION_DATA_SOURCE=mock
   NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE=real
   
   # Phase 2: Introduce real transaction data
   NEXT_PUBLIC_PORTFOLIO_DATA_SOURCE=mock
   NEXT_PUBLIC_TRANSACTION_DATA_SOURCE=real
   NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE=real
   
   # Phase 3: Use real portfolio data
   NEXT_PUBLIC_PORTFOLIO_DATA_SOURCE=real
   NEXT_PUBLIC_TRANSACTION_DATA_SOURCE=real
   NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE=real
   
   # Final phase: Disable hybrid mode entirely
   NEXT_PUBLIC_MOCK_MODE=false
   ```

2. Monitoring and addressing any issues that arise during the transition
3. Eventually removing the hybrid mode code once it's no longer needed

## Security Considerations

The hybrid mode implementation includes several security measures:

- Clear separation between mock and real data
- Visual indicators to prevent confusion
- Mock data never affects real contract decisions
- Type safety throughout the implementation

## Troubleshooting

If you encounter issues with the hybrid mode:

1. Check the browser console for error messages
2. Verify the environment variables are set correctly
3. Try switching to full mock mode to isolate if the issue is with the contract or the application
4. Check network connectivity to the Arch Network endpoint

## Future Improvements

Potential improvements to the hybrid mode include:

- More sophisticated data merging strategies
- Additional granular toggles for specific features
- Enhanced visual indicators for different data sources
- Improved error handling and recovery mechanisms 