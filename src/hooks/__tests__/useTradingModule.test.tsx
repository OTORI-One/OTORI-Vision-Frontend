import { renderHook, act } from '@testing-library/react-hooks';
import { useTradingModule } from '../useTradingModule';
import { OrderType, OrderStatus, Order, OrderBook } from '../../types/trading';

// Mock @omnisat/lasereyes
jest.mock('@omnisat/lasereyes', () => ({
  LaserEyes: {
    random: jest.fn(() => ({
      id: 'mock-id',
      value: 100000,
      status: 'confirmed'
    }))
  }
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock data
const mockOrder: Order = {
  id: 'mock-order-1',
  type: OrderType.BUY,
  amount: 1000,
  price: 100,
  status: OrderStatus.PENDING,
  timestamp: Date.now()
};

const mockOrderBook: OrderBook = {
  bids: [{ price: 100, amount: 1000 }],
  asks: [{ price: 101, amount: 1000 }]
};

describe('useTradingModule Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('should return the correct initial state', () => {
    const { result } = renderHook(() => useTradingModule());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.buyOVT).toBe('function');
    expect(typeof result.current.sellOVT).toBe('function');
    expect(typeof result.current.getOrderBook).toBe('function');
    expect(typeof result.current.getMarketPrice).toBe('function');
    expect(typeof result.current.estimatePriceImpact).toBe('function');
  });

  it('should estimate price impact for buy orders', async () => {
    const { result } = renderHook(() => useTradingModule());
    
    // Small order should have minimal impact
    let impactPrice = await result.current.estimatePriceImpact(10, true);
    expect(impactPrice).toBeGreaterThanOrEqual(700);
    expect(impactPrice).toBeLessThan(710);
    
    // Large order should have significant impact
    impactPrice = await result.current.estimatePriceImpact(1000, true);
    expect(impactPrice).toBeGreaterThan(710);
  });

  it('should estimate price impact for sell orders', async () => {
    const { result } = renderHook(() => useTradingModule());
    
    // Small order should have minimal impact
    let impactPrice = await result.current.estimatePriceImpact(10, false);
    expect(impactPrice).toBeLessThanOrEqual(700);
    expect(impactPrice).toBeGreaterThan(690);
    
    // Large order should have significant impact
    impactPrice = await result.current.estimatePriceImpact(1000, false);
    expect(impactPrice).toBeLessThan(690);
  });

  it('should execute buy orders and store them', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useTradingModule());
    
    let transaction;
    
    await act(async () => {
      transaction = await result.current.buyOVT(100);
    });
    
    expect(transaction).toBeDefined();
    expect(transaction?.type).toBe('buy');
    expect(transaction?.amount).toBe(100);
    expect(transaction?.status).toBe('confirmed');
    
    // Check if transaction was stored
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });

  it('should execute sell orders and store them', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useTradingModule());
    
    let transaction;
    
    await act(async () => {
      transaction = await result.current.sellOVT(50);
    });
    
    expect(transaction).toBeDefined();
    expect(transaction?.type).toBe('sell');
    expect(transaction?.amount).toBe(50);
    expect(transaction?.status).toBe('confirmed');
    
    // Check if transaction was stored
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });

  it('should return order book data', async () => {
    const { result } = renderHook(() => useTradingModule());
    
    let orderBook;
    
    await act(async () => {
      orderBook = await result.current.getOrderBook();
    });
    
    expect(orderBook).toBeDefined();
    expect(Array.isArray(orderBook?.bids)).toBe(true);
    expect(Array.isArray(orderBook?.asks)).toBe(true);
    expect(orderBook?.bids.length).toBeGreaterThan(0);
    expect(orderBook?.asks.length).toBeGreaterThan(0);
  });

  it('should handle errors gracefully', async () => {
    // Mock implementation that throws an error
    jest.spyOn(global, 'fetch').mockImplementationOnce(() => 
      Promise.reject(new Error('Network error'))
    );
    
    const { result } = renderHook(() => useTradingModule());
    
    let error = null;
    
    await act(async () => {
      try {
        await result.current.buyOVT(100);
      } catch (e) {
        error = e;
      }
    });
    
    expect(error).toBeDefined();
    expect(result.current.error).toBeDefined();
  });

  it('should track loading state during operations', async () => {
    // Create a delayed mock implementation
    jest.spyOn(global, 'fetch').mockImplementationOnce(() => 
      new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve({ price: 700 })
          } as Response);
        }, 100);
      })
    );
    
    const { result, waitForNextUpdate } = renderHook(() => useTradingModule());
    
    act(() => {
      result.current.getMarketPrice();
    });
    
    // Should be loading initially
    expect(result.current.isLoading).toBe(true);
    
    await waitForNextUpdate();
    
    // Loading should be false after operation completes
    expect(result.current.isLoading).toBe(false);
  });

  it('should place a buy order', async () => {
    const { result } = renderHook(() => useTradingModule());
    const order = { ...mockOrder };
    await result.current.placeOrder(order);
    expect(result.current.orders).toContainEqual(order);
  });

  it('should place a sell order', async () => {
    const { result } = renderHook(() => useTradingModule());
    const order = { ...mockOrder, type: OrderType.SELL };
    await result.current.placeOrder(order);
    expect(result.current.orders).toContainEqual(order);
  });

  it('should update order book', () => {
    const { result } = renderHook(() => useTradingModule());
    result.current.updateOrderBook(mockOrderBook);
    expect(result.current.orderBook).toEqual(mockOrderBook);
  });
}); 