import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TradingInterface } from '../TradingInterface';

// Mock @headlessui/react Switch component
jest.mock('@headlessui/react', () => ({
  Switch: ({ checked, onChange, className, children }) => (
    <button
      data-testid="mock-switch"
      className={className}
      onClick={() => onChange(!checked)}
    >
      {children}
    </button>
  )
}));

// Mock the hooks
jest.mock('../../src/hooks/useOVTClient', () => ({
  useOVTClient: () => ({
    formatValue: (value) => `${value} sats`,
    baseCurrency: 'btc',
    btcPrice: 50000,
    dataSourceIndicator: {
      trading: {
        isMock: true,
        label: 'Test Data',
        color: 'blue'
      }
    },
    isLoading: false,
    error: null,
    navData: {
      totalValueSats: 371000000,
      portfolioItems: []
    }
  }),
  SATS_PER_BTC: 100000000
}));

jest.mock('../../src/hooks/useTradingModule', () => ({
  useTradingModule: () => ({
    buyOVT: jest.fn().mockResolvedValue({
      txid: 'mock-tx-123',
      status: 'confirmed',
    }),
    sellOVT: jest.fn().mockResolvedValue({
      txid: 'mock-tx-456',
      status: 'confirmed',
    }),
    getMarketPrice: jest.fn().mockResolvedValue(700),
    estimatePriceImpact: jest.fn().mockResolvedValue(700),
    isLoading: false,
    error: null,
    dataSourceIndicator: {
      isMock: true,
      label: 'Test Data',
      color: 'blue'
    }
  })
}));

// Simplified test suite
describe('TradingInterface Component', () => {
  test('renders component', () => {
    render(<TradingInterface />);
    expect(screen.getByText('Trading Interface')).toBeInTheDocument();
  });
}); 