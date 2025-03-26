import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import TradingInterface from '../TradingInterface';

// Mock the hooks
jest.mock('../../src/hooks/useOVTClient', () => ({
  useOVTClient: () => ({
    formatValue: (value) => `${value} sats`,
    baseCurrency: 'btc',
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
  })
}));

jest.mock('../../src/hooks/useTradingModule', () => ({
  useTradingModule: () => ({
    buyOVT: jest.fn().mockResolvedValue({
      txid: 'mock-tx-123',
      type: 'buy',
      amount: 100,
      price: 700,
      timestamp: Date.now(),
      status: 'confirmed'
    }),
    sellOVT: jest.fn().mockResolvedValue({
      txid: 'mock-tx-456',
      type: 'sell',
      amount: 50,
      price: 690,
      timestamp: Date.now(),
      status: 'confirmed'
    }),
    getOrderBook: jest.fn().mockResolvedValue({
      bids: [{ price: 680, amount: 1000 }, { price: 670, amount: 2000 }],
      asks: [{ price: 710, amount: 1000 }, { price: 720, amount: 2000 }]
    }),
    getMarketPrice: jest.fn().mockResolvedValue(700),
    estimatePriceImpact: jest.fn().mockImplementation((amount, isBuy) => 
      isBuy ? 700 + Math.floor(amount / 100) : 700 - Math.floor(amount / 100)
    ),
    isLoading: false,
    error: null
  })
}));

describe('TradingInterface Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders both Buy and Sell panels', () => {
    render(<TradingInterface />);
    
    expect(screen.getByText('Buy OVT')).toBeInTheDocument();
    expect(screen.getByText('Sell OVT')).toBeInTheDocument();
  });

  test('displays current market price', () => {
    render(<TradingInterface />);
    
    expect(screen.getByText(/per OVT/i)).toBeInTheDocument();
  });

  test('updates buy amount and shows price impact', async () => {
    render(<TradingInterface />);
    
    const buyInput = screen.getByLabelText('Buy Amount');
    await userEvent.type(buyInput, '100');
    
    expect(screen.getByText(/Price Impact/i)).toBeInTheDocument();
  });

  test('updates sell amount and shows expected return', async () => {
    render(<TradingInterface />);
    
    const sellInput = screen.getByLabelText('Sell Amount');
    await userEvent.type(sellInput, '50');
    
    expect(screen.getByText(/Expected Return/i)).toBeInTheDocument();
  });

  test('handles buy order submission', async () => {
    const { useTradingModule } = require('../../src/hooks/useTradingModule');
    const mockBuyOVT = useTradingModule().buyOVT;
    
    render(<TradingInterface />);
    
    const buyInput = screen.getByLabelText('Buy Amount');
    await userEvent.type(buyInput, '100');
    
    const buyButton = screen.getByRole('button', { name: /buy ovt/i });
    await userEvent.click(buyButton);
    
    expect(mockBuyOVT).toHaveBeenCalledWith(100, expect.any(Number));
    await waitFor(() => {
      expect(screen.getByText(/Transaction Confirmed/i)).toBeInTheDocument();
    });
  });

  test('handles sell order submission', async () => {
    const { useTradingModule } = require('../../src/hooks/useTradingModule');
    const mockSellOVT = useTradingModule().sellOVT;
    
    render(<TradingInterface />);
    
    const sellInput = screen.getByLabelText('Sell Amount');
    await userEvent.type(sellInput, '50');
    
    const sellButton = screen.getByRole('button', { name: /sell ovt/i });
    await userEvent.click(sellButton);
    
    expect(mockSellOVT).toHaveBeenCalledWith(50, expect.any(Number));
    await waitFor(() => {
      expect(screen.getByText(/Transaction Confirmed/i)).toBeInTheDocument();
    });
  });

  test('toggles between market and limit order types', async () => {
    render(<TradingInterface />);
    
    const marketLimitSwitch = screen.getByRole('switch', { name: /order type/i });
    await userEvent.click(marketLimitSwitch);
    
    expect(screen.getByText(/Limit Price/i)).toBeInTheDocument();
    
    // Test entering a limit price
    const limitPriceInput = screen.getByLabelText('Limit Price');
    await userEvent.type(limitPriceInput, '650');
    
    expect(screen.getByText(/Price: 650 sats\/OVT/i)).toBeInTheDocument();
  });

  test('displays validation errors for invalid inputs', async () => {
    render(<TradingInterface />);
    
    const buyInput = screen.getByLabelText('Buy Amount');
    await userEvent.type(buyInput, '-50');
    
    expect(screen.getByText(/Amount must be positive/i)).toBeInTheDocument();
  });

  test('shows loading state during transaction', async () => {
    const { useTradingModule } = require('../../src/hooks/useTradingModule');
    // Override the mock to delay resolution
    useTradingModule().buyOVT.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            txid: 'mock-tx-123',
            type: 'buy',
            amount: 100,
            price: 700,
            timestamp: Date.now(),
            status: 'confirmed'
          });
        }, 100);
      });
    });
    
    render(<TradingInterface />);
    
    const buyInput = screen.getByLabelText('Buy Amount');
    await userEvent.type(buyInput, '100');
    
    const buyButton = screen.getByRole('button', { name: /buy ovt/i });
    await userEvent.click(buyButton);
    
    expect(screen.getByText(/Processing/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/Transaction Confirmed/i)).toBeInTheDocument();
    });
  });

  test('displays data source indicator', () => {
    render(<TradingInterface />);
    
    expect(screen.getByText(/Test Data/i)).toBeInTheDocument();
  });
}); 