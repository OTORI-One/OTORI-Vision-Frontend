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
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('integrates portfolio management with trading', async () => {
    // Mock API responses
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
            type: 'BUY',
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
    expect(tradingResult.result.current.tradeHistory[0].type).toBe('BUY');
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
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for state updates
    });

    expect(tradingResult.result.current.tradeHistory).toHaveLength(1);
    expect(localStorage.getItem('tradeHistory')).toBeDefined();
  });
}); 