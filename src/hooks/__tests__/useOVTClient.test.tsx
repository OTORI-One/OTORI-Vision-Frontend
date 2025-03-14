import { renderHook, act } from '@testing-library/react';
import { useOVTClient } from '../useOVTClient';
import { useBitcoinPrice } from '../useBitcoinPrice';

// Mock Bitcoin price hook
jest.mock('../useBitcoinPrice', () => ({
  useBitcoinPrice: jest.fn()
}));

// Mock environment variables
process.env.NEXT_PUBLIC_MOCK_MODE = 'true';

describe('useOVTClient', () => {
  beforeEach(() => {
    // Reset mocks
    (useBitcoinPrice as jest.Mock).mockReturnValue({
      price: 50000,
      loading: false,
      error: null
    });

    // Set mock mode for testing
    process.env.NEXT_PUBLIC_MOCK_MODE = 'true';
    
    // Reset mock data between tests
    jest.resetModules();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_MOCK_MODE = undefined;
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() => useOVTClient());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.navData).toEqual({
      totalValue: '$0.00',
      totalValueSats: 0,
      changePercentage: '0.00%',
      portfolioItems: [],
      dataSource: {
        isMock: true,
        label: 'Simulated Data',
        color: 'amber'
      }
    });
  });

  it('formats values correctly with k notation', () => {
    const { result } = renderHook(() => useOVTClient());
    
    // Test BTC formatting
    expect(result.current.formatValue(100000000, 'btc')).toBe('₿1.00');
    expect(result.current.formatValue(1000000000, 'btc')).toBe('₿10.00');
    expect(result.current.formatValue(1500, 'btc')).toBe('1.5k sats');
    
    // Test USD formatting with Bitcoin price at 50k
    expect(result.current.formatValue(100000000, 'usd')).toBe('$50.0k'); // 1 BTC = $50k
    expect(result.current.formatValue(1000000, 'usd')).toBe('$500'); // 0.01 BTC = $500
    expect(result.current.formatValue(200000, 'usd')).toBe('$100'); // 0.002 BTC = $100
    expect(result.current.formatValue(180000, 'usd')).toBe('$90.00'); // 0.0018 BTC = $90.00
    expect(result.current.formatValue(1000, 'usd')).toBe('$0.50'); // 1000 sats = $0.50
    expect(result.current.formatValue(100, 'usd')).toBe('$0.05'); // 100 sats = $0.05
  });

  it('calculates NAV correctly with mock data', async () => {
    // Mock portfolio data with required address field
    const mockData = [
      {
        name: 'Test Project',
        value: 1000000, // 0.01 BTC
        description: 'Test Description',
        tokenAmount: 1000,
        pricePerToken: 1000,
        address: 'tb1p3yauf7efk5p3v6h67k7e88hu6hs9z2wfpvf0wjeyfvf2w73zua4qw2zkfc'
      }
    ];

    // Reset modules and set up mock data before rendering hook
    jest.resetModules();
    
    // Mock the portfolio data import
    jest.mock('../../mock-data/portfolio-positions.json', () => mockData, { virtual: true });
    
    // Ensure mock mode is enabled
    process.env.NEXT_PUBLIC_MOCK_MODE = 'true';
    
    // Initialize portfolioPositions with mock data
    const { result, rerender } = renderHook(() => useOVTClient());
    
    // Add position and wait for NAV calculation
    await act(async () => {
      await result.current.addPosition(mockData[0]);
      // Wait for state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      // Force a rerender to trigger useEffect
      rerender();
      // Wait for NAV calculation
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Log current state for debugging
    console.log('Final NAV Data:', result.current.navData);
    console.log('Portfolio Items:', result.current.getPositions());
    
    // Verify portfolio has items
    expect(result.current.navData.portfolioItems.length).toBeGreaterThan(0);
    
    // Verify growth calculations
    const changePercentage = parseFloat(result.current.navData.changePercentage);
    expect(changePercentage).toBeGreaterThan(0);
    
    // Verify each portfolio item has correct growth calculation
    result.current.navData.portfolioItems.forEach(item => {
      expect(item.current).toBeGreaterThan(item.value);
      expect(item.change).toBeGreaterThan(0);
    });
  });

  it('handles Bitcoin price changes correctly', async () => {
    const { result, rerender } = renderHook(() => useOVTClient());
    
    // Change Bitcoin price to 60k
    (useBitcoinPrice as jest.Mock).mockReturnValue({
      price: 60000,
      loading: false,
      error: null
    });
    
    rerender();
    
    // Verify USD formatting updates with new BTC price
    expect(result.current.formatValue(100000000, 'usd')).toBe('$60.0k');
  });

  it('handles mock transaction history correctly', async () => {
    const { result } = renderHook(() => useOVTClient());
    
    const transactions = await result.current.getTransactionHistory();
    
    expect(Array.isArray(transactions)).toBe(true);
    transactions.forEach(tx => {
      expect(tx).toHaveProperty('txid');
      expect(tx).toHaveProperty('type');
      expect(tx).toHaveProperty('amount');
      expect(tx).toHaveProperty('timestamp');
      expect(tx).toHaveProperty('status');
      expect(tx).toHaveProperty('details');
    });
  });

  it('adds new positions correctly', async () => {
    const { result } = renderHook(() => useOVTClient());
    
    const newPosition = {
      name: 'Test Position',
      value: 100000000, // 1 BTC
      description: 'Test Description',
      tokenAmount: 1000,
      pricePerToken: 100000, // 0.001 BTC per token
      address: 'tb1p3yauf7efk5p3v6h67k7e88hu6hs9z2wfpvf0wjeyfvf2w73zua4qw2zkfc'
    };
    
    await act(async () => {
      await result.current.addPosition(newPosition);
    });
    
    const positions = result.current.getPositions();
    const addedPosition = positions.find(p => p.name === 'Test Position');
    
    expect(addedPosition).toBeDefined();
    expect(addedPosition?.value).toBe(100000000);
    expect(addedPosition?.tokenAmount).toBe(1000);
  });
}); 