import { renderHook, act } from '@testing-library/react';
import { useOVTClient } from '../useOVTClient';
import { useBitcoinPrice } from '../useBitcoinPrice';
import { RuneClient } from '../../lib/runeClient';
import { ArchClient } from '../../lib/archClient';

// Mock Bitcoin price hook
jest.mock('../useBitcoinPrice', () => ({
  useBitcoinPrice: jest.fn(() => ({
    price: 50000,
    loading: false,
    error: null
  }))
}));

// Mock LaserEyes hook
jest.mock('@omnisat/lasereyes', () => ({
  useLaserEyes: jest.fn(() => ({
    address: 'test-address',
    isConnected: true
  }))
}));

// Mock RuneClient
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
      getTransactionInfo: jest.fn().mockResolvedValue({
        txid: 'test-tx-id',
        type: 'buy',
        amount: 1000,
        timestamp: Date.now(),
        status: 'confirmed',
        details: { price: 1000 }
      })
    }))
  };
});

// Mock ArchClient
jest.mock('../../lib/archClient', () => {
  return {
    ArchClient: jest.fn().mockImplementation(() => ({
      getCurrentNAV: jest.fn().mockResolvedValue({
        value: 1000000,
        portfolioItems: []
      })
    }))
  };
});

describe('useOVTClient', () => {
  beforeEach(() => {
    // Reset mocks
    (useBitcoinPrice as jest.Mock).mockReturnValue({
      price: 50000,
      loading: false,
      error: null
    });
    
    // Reset localStorage
    localStorage.clear();
    
    // Reset mock data between tests
    jest.clearAllMocks();
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useOVTClient());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.navData).toEqual({
      totalValue: '$0.00',
      totalValueSats: 0,
      changePercentage: '0%',
      portfolioItems: [],
      tokenDistribution: {
        totalSupply: 0,
        distributed: 0,
        runeId: '',
        runeSymbol: '',
        distributionEvents: []
      }
    });
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

    expect(result.current.navData.tokenDistribution.totalSupply).toBe(21000000);
    expect(result.current.navData.tokenDistribution.distributed).toBe(1000000);
  });

  it('handles currency change correctly', async () => {
    const { result } = renderHook(() => useOVTClient());

    await act(async () => {
      result.current.handleCurrencyChange('btc');
    });

    expect(localStorage.getItem('ovt-currency-preference')).toBe('btc');
    
    await act(async () => {
      result.current.handleCurrencyChange('usd');
    });

    expect(localStorage.getItem('ovt-currency-preference')).toBe('usd');
  });

  it('fetches transaction history correctly', async () => {
    const { result } = renderHook(() => useOVTClient());

    const transactions = await act(async () => {
      return await result.current.getTransactionHistory();
    });

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toHaveProperty('txid', 'test-tx-id');
    expect(transactions[0]).toHaveProperty('type', 'buy');
  });

  it('handles Bitcoin price changes correctly', async () => {
    const { result, rerender } = renderHook(() => useOVTClient());
    
    // Set currency to USD
    act(() => {
      result.current.handleCurrencyChange('usd');
    });
    
    // Change Bitcoin price to 60k
    (useBitcoinPrice as jest.Mock).mockReturnValue({
      price: 60000,
      loading: false,
      error: null
    });
    
    rerender();
    
    // Verify USD formatting updates with new BTC price
    expect(result.current.formatValue(100000000)).toBe('$60.0k');
  });
}); 