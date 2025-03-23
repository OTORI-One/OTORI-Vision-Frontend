import { renderHook, act } from '@testing-library/react';
import { useOVTClient } from '../useOVTClient';
import { useTradingModule } from '../useTradingModule';

// Mock hooks
jest.mock('../useBitcoinPrice', () => ({
  useBitcoinPrice: () => ({ price: 50000, isLoading: false, error: null })
}));

jest.mock('@omnisat/lasereyes', () => ({
  useLaserEyes: () => ({ isEnabled: false, toggle: jest.fn(), address: 'test-address' })
}));

describe('Integration: useOVTClient and useTradingModule', () => {
  // Backup original methods for restoration
  const originalLocalStorage = { ...localStorage };
  const originalFetch = global.fetch;
  
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
    // Restore original methods
    global.fetch = originalFetch;
    
    // Restore localStorage methods we may have overridden
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true
    });
  });

  it('integrates portfolio management with trading', async () => {
    // Mock API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('rune/info')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            rune: {
              id: 'test-rune-id',
              number: 101,
              rune: 'OTORI•VISION•TOKEN',
              supply: {
                circulating: 2100000,
                maximum: 2100000,
                minted: 2100000,
                supply: "2.1M"
              },
              timestamp: 1677721600,
              etching: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
              divisibility: 0,
              spacers: 2,
              symbol: 'OVT'
            }
          })
        });
      }
      if (url.includes('rune/balances')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            balances: [
              { address: 'addr1', amount: 100, isDistributed: true },
              { address: 'addr2', amount: 200, isDistributed: true }
            ]
          })
        });
      }
      if (url.includes('distribution')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            totalSupply: 2100000,
            treasuryHeld: 1680000,
            lpHeld: 210000,
            distributed: 210000,
            percentDistributed: 10,
            percentInLP: 10,
            treasuryAddresses: ['treasury-address'],
            lpAddresses: ['lp-address'],
            distributionEvents: []
          })
        });
      }
      if (url.includes('market_price')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ price: 50000 })
        });
      }
      if (url.includes('execute_trade')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            txid: 'test-tx',
            type: 'buy',
            amount: 100,
            price: 50000,
            timestamp: Date.now(),
            status: 'pending'
          })
        });
      }
      if (url.includes('estimate_price_impact')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ estimatedPrice: 49500 })
        });
      }
      if (url.includes('lp-info')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            lpInfo: {
              address: 'tb1p3vn6wc0dlud3tvckv95datu3stq4qycz7vj9mzpclfkrv9rh8jqsjrw38f',
              liquidity: {
                ovt: 1000000,
                btcSats: 250000000,
                impactMultiplier: 0.00001
              },
              pricing: {
                currentPriceSats: 250,
                lastTradeTime: Date.now() - 3600000,
                dailyVolume: 15000,
                weeklyVolume: 45000
              },
              transactions: [
                {
                  txid: 'mock_trade_1',
                  type: 'buy',
                  amount: 5000,
                  priceSats: 245,
                  timestamp: Date.now() - 3600000
                }
              ]
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    let ovtResult: any;
    let tradingResult: any;

    await act(async () => {
      ovtResult = renderHook(() => useOVTClient());
      tradingResult = renderHook(() => useTradingModule());
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initial effects
    });

    // Get market price
    let marketPrice: number | undefined;
    await act(async () => {
      marketPrice = await tradingResult.result.current.getMarketPrice();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for state updates
    });

    expect(marketPrice).toBeDefined();
    expect(marketPrice).toBe(50000);

    // Execute a buy order
    await act(async () => {
      await tradingResult.result.current.buyOVT(100);
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for state updates
    });

    expect(tradingResult.result.current.tradeHistory).toHaveLength(1);
    expect(tradingResult.result.current.tradeHistory[0].type).toBe('buy');
    expect(tradingResult.result.current.tradeHistory[0].amount).toBe(100);

    // Verify portfolio update
    expect(ovtResult.result.current.navData.totalValueSats).toBeGreaterThan(0);
  });

  it('handles errors gracefully across both hooks', async () => {
    // Mock API error
    (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve({
      ok: false,
      statusText: 'API Error'
    }));

    let tradingResult: any;
    await act(async () => {
      tradingResult = renderHook(() => useTradingModule());
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initial effects
    });

    // Attempt to execute a trade
    await act(async () => {
      try {
        await tradingResult.result.current.buyOVT(100);
      } catch (error) {
        // Expected error
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for state updates
    });

    expect(tradingResult.result.current.error).toBeDefined();
    expect(tradingResult.result.current.tradeHistory).toHaveLength(0);
  });

  it('maintains consistent state between hooks', async () => {
    // Mock the localStorage methods for this test
    const originalLocalStorage = window.localStorage;
    const mockLocalStorage = {
      getItem: jest.fn((key) => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn(),
    };
    
    // Replace localStorage for this test
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
    
    try {
      // Mock successful API responses
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('estimate_price_impact')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ estimatedPrice: 49500 })
          });
        }
        if (url.includes('execute_trade')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              txid: 'test-tx',
              type: 'BUY',
              amount: 100,
              price: 50000,
              timestamp: Date.now(),
              status: 'pending'
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      let ovtResult: any;
      let tradingResult: any;

      await act(async () => {
        ovtResult = renderHook(() => useOVTClient());
        tradingResult = renderHook(() => useTradingModule());
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for initial effects
      });

      // Set currency preference
      await act(async () => {
        ovtResult.result.current.handleCurrencyChange('btc');
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for state updates
      });

      expect(ovtResult.result.current.baseCurrency).toBe('btc');

      // Execute trades
      await act(async () => {
        await tradingResult.result.current.buyOVT(100);
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait longer for state updates
      });

      expect(tradingResult.result.current.tradeHistory).toHaveLength(1);
      
      // Check that localStorage.setItem was called
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      // Check specifically for tradeHistory calls
      const tradeHistoryCalls = mockLocalStorage.setItem.mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].includes('trade')
      );
      
      // At least one call should be related to trade history
      expect(tradeHistoryCalls.length).toBeGreaterThan(0);
    } finally {
      // Restore original localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    }
  });
}); 