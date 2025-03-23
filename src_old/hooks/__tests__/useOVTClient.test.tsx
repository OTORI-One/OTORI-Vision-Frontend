import { renderHook, act } from '@testing-library/react';
import { useOVTClient } from '../useOVTClient';
import { useBitcoinPrice } from '../useBitcoinPrice';
import { RuneClient } from '../../lib/runeClient';
import { ArchClient } from '../../lib/archClient';
import React from 'react';

// Mock the useBitcoinPrice hook with a dedicated variable to make it easier to reference
const mockBitcoinPrice = { price: 50000, isLoading: false, error: null };

// Important: hoist mock before any imports in the tests
jest.mock('../useBitcoinPrice', () => ({
  __esModule: true, // This is important for ES module compatibility
  useBitcoinPrice: jest.fn(() => mockBitcoinPrice)
}));

// Mock LaserEyes hook
jest.mock('@omnisat/lasereyes', () => ({
  useLaserEyes: () => ({ isEnabled: false, toggle: jest.fn(), address: 'test-address' })
}));

// Mock RuneClient with realistic mock data based on PRD
jest.mock('../../lib/runeClient', () => {
  return {
    RuneClient: jest.fn().mockImplementation(() => ({
      getRuneInfo: jest.fn().mockResolvedValue({
        id: 'test-rune-id',
        symbol: 'OVT',
        supply: {
          total: 21000000,
          distributed: 1000000,
          treasury: 20000000,
          percentDistributed: 4.76
        },
        events: []
      }),
      getRuneBalances: jest.fn().mockResolvedValue([
        { address: 'treasury-address', amount: 20000000, isDistributed: false },
        { address: 'user1-address', amount: 500000, isDistributed: true },
        { address: 'user2-address', amount: 500000, isDistributed: true }
      ]),
      getTransactionInfo: jest.fn().mockResolvedValue({
        txid: 'test-tx-id',
        type: 'buy',
        amount: 1000,
        timestamp: Date.now(),
        status: 'confirmed',
        details: { price: 1000 }
      }),
      addTreasuryAddress: jest.fn(),
      removeTreasuryAddress: jest.fn(),
      isTreasuryAddress: jest.fn().mockImplementation(addr => addr === 'treasury-address')
    }))
  };
});

// Mock ArchClient
jest.mock('../../lib/archClient', () => {
  return {
    ArchClient: jest.fn().mockImplementation(() => ({
      getCurrentNAV: jest.fn().mockResolvedValue({
        value: 0,
        portfolioItems: []
      })
    }))
  };
});

describe('useOVTClient', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('initializes with correct default values', async () => {
    let result: any;
    await act(async () => {
      result = renderHook(() => useOVTClient());
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initial effects
    });

    expect(result.result.current.isLoading).toBe(false);
    expect(result.result.current.error).toBeNull();
    expect(result.result.current.navData).toEqual({
      totalValue: '$168.8k', // Expected mock portfolio total value
      totalValueSats: 337500000, // Expected mock portfolio total in sats
      changePercentage: '0.00%',
      portfolioItems: [
        {
          name: 'Polymorphic Labs',
          value: 150000000,
          current: 150000000,
          change: 0,
          description: 'Encryption Layer',
          tokenAmount: 500000,
          pricePerToken: 300,
          address: 'mock-address-polymorphic-labs',
          transactionId: 'position_entry_polymorphic_1740995813211'
        },
        {
          name: 'VoltFi',
          value: 87500000,
          current: 87500000,
          change: 0,
          description: 'Bitcoin Volatility Index on Bitcoin',
          tokenAmount: 350000,
          pricePerToken: 250,
          address: 'mock-address-voltfi',
          transactionId: 'position_entry_voltfi_1740995813211'
        },
        {
          name: 'MIXDTape',
          value: 100000000,
          current: 100000000,
          change: 0,
          description: 'Phygital Music for superfans - disrupting Streaming',
          tokenAmount: 500000,
          pricePerToken: 200,
          address: 'mock-address-mixdtape',
          transactionId: 'position_entry_mixdtape_1740995813211'
        }
      ],
      tokenDistribution: {
        totalSupply: 21000000,
        distributed: 1000000,
        runeId: 'test-rune-id',
        runeSymbol: 'OVT',
        distributionEvents: []
      }
    });
  });

  it('handles currency change', async () => {
    // Mock successful API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('rune/info')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'test-rune-id',
            supply: { total: 1000000, distributed: 100000, treasury: 900000 },
            decimals: 8,
            symbol: 'TEST',
            name: 'Test Rune',
            events: []
          })
        });
      }
      if (url.includes('rune/balances')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { address: 'addr1', amount: 100, isDistributed: true },
            { address: 'addr2', amount: 200, isDistributed: true }
          ])
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    let result: any;
    await act(async () => {
      result = renderHook(() => useOVTClient());
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initial effects
    });

    await act(async () => {
      result.result.current.handleCurrencyChange('btc');
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for state updates
    });

    expect(result.result.current.baseCurrency).toBe('btc');
    expect(localStorage.getItem('ovt-currency-preference')).toBe('btc');
  });

  it('handles API errors gracefully', async () => {
    // Store original implementation
    const originalPositionsSetter = jest.requireMock('../useOVTClient').setPortfolioPositions;
    
    // Create a function that will cause an error when trying to reduce portfolio positions
    const mockSetPortfolioPositions = jest.fn().mockImplementation(() => {
      throw new Error('Simulated error in portfolio processing');
    });
    
    // Apply our mocked function
    const { result } = renderHook(() => useOVTClient());
    
    // Force an error by setting portfolioPositions to null
    await act(async () => {
      // This should directly reference the hook's setPortfolioPositions
      result.current.setPortfolioPositions(null as any); // Force TS to accept null
      
      // Now trigger fetchNAV which will try to use the null portfolioPositions
      result.current.handleCurrencyChange('usd');
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for state updates
    });

    expect(result.current.error).toBe('Failed to fetch portfolio data');
  });

  it('updates portfolio positions', async () => {
    let result: any;
    await act(async () => {
      result = renderHook(() => useOVTClient());
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initial effects
    });

    const newPositions = [
      {
        name: 'Test Position',
        value: 1000000,
        current: 1000000,
        change: 0,
        description: 'Test Description',
        tokenAmount: 100,
        pricePerToken: 10000,
        address: 'test-address'
      }
    ];

    await act(async () => {
      result.result.current.setPortfolioPositions(newPositions);
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for state updates
    });

    expect(result.result.current.portfolioPositions).toEqual(newPositions);
  });

  it('formats values correctly with k notation', () => {
    const { result } = renderHook(() => useOVTClient());
    
    // Test BTC formatting when baseCurrency is btc
    act(() => {
      result.current.handleCurrencyChange('btc');
    });
    expect(result.current.formatValue(100000000)).toBe('₿1.00');
    expect(result.current.formatValue(1000000000)).toBe('₿10.00');
    expect(result.current.formatValue(1500)).toBe('1.5k sats');
    
    // Test USD formatting when baseCurrency is usd
    act(() => {
      result.current.handleCurrencyChange('usd');
    });
    expect(result.current.formatValue(100000000)).toBe('$50.0k'); // 1 BTC = $50k
    expect(result.current.formatValue(1000000)).toBe('$500'); // 0.01 BTC = $500
    expect(result.current.formatValue(200000)).toBe('$100'); // 0.002 BTC = $100
  });

  it('fetches NAV data on mount', async () => {
    const { result } = renderHook(() => useOVTClient());

    // Wait for initial data fetch
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Check that the rune data matches our mock
    expect(result.current.navData.tokenDistribution.totalSupply).toBe(21000000);
    expect(result.current.navData.tokenDistribution.distributed).toBe(1000000);
    expect(result.current.navData.tokenDistribution.runeId).toBe('test-rune-id');
    expect(result.current.navData.tokenDistribution.runeSymbol).toBe('OVT');
  });

  it('handles Bitcoin price changes correctly', async () => {
    // Get a reference to the mock implementation
    const useBitcoinPriceMock = require('../useBitcoinPrice').useBitcoinPrice;
    
    // Initial render
    const { result, rerender } = renderHook(() => useOVTClient());
    
    // Set currency to USD and let the hook use the initial mock price (50000)
    await act(async () => {
      result.current.handleCurrencyChange('usd');
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // Check formatting with 50k price
    expect(result.current.formatValue(100000000)).toBe('$50.0k');
    
    // Update the mock to return a new price
    const newMockPrice = { price: 60000, isLoading: false, error: null };
    // Need to update the global mockBitcoinPrice for future renders
    Object.assign(mockBitcoinPrice, newMockPrice);
    useBitcoinPriceMock.mockReturnValue(newMockPrice);
    
    // Re-render with the new price
    await act(async () => {
      // Need to explicitly cause a re-render here
      rerender();
      // Then trigger the fetch with a currency change
      result.current.handleCurrencyChange('usd');
      await new Promise(resolve => setTimeout(resolve, 200)); // Longer timeout
    });
    
    // Check if values are updated with new BTC price
    expect(result.current.formatValue(100000000)).toBe('$60.0k'); // 1 BTC = $60k
  });
}); 