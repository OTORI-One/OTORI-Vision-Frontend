import { renderHook, act } from '@testing-library/react';
import { useOVTClient } from '../useOVTClient';
import { useBitcoinPrice } from '../useBitcoinPrice';

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

// Mock environment variables
process.env.NEXT_PUBLIC_MOCK_MODE = 'true';
process.env.NEXT_PUBLIC_OVT_RUNE_ID = 'test-rune-id-123';

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
      tokenDistribution: {
        totalSupply: 21000000,
        distributed: 1000000, // 1M OVT tokens (updated from 5M)
        runeId: 'OTORI-OVT-TESTNET-2023',
        runeSymbol: 'OVT',
        distributionEvents: []
      },
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

  it('calculates NAV correctly with distributed tokens', async () => {
    // Mock the token distribution
    const mockTokenDistribution = {
      totalSupply: 21000000,
      distributed: 1000000, // 1M OVT distributed
      runeId: 'OTORI-OVT-TESTNET-2023',
      runeSymbol: 'OVT',
      distributionEvents: []
    };

    // Mock the portfolio data
    const mockData = [{
      name: 'Test Project',
      value: 1000000,
      description: 'Test Description',
      tokenAmount: 1000,
      pricePerToken: 1000,
      address: 'tb1p3yauf7efk5p3v6h67k7e88hu6hs9z2wfpvf0wjeyfvf2w73zua4qw2zkfc',
      current: 1100000, // Current value in sats
      change: 10
    }];

    // Set up the hook with mocked data
    const { result } = renderHook(() => useOVTClient());

    // Wait for initial render
    await act(async () => {
      // Update the mock token distribution
      result.current.setTokenDistribution(mockTokenDistribution);
      // Update the portfolio positions
      result.current.setPortfolioPositions(mockData);
    });

    // Wait for NAV calculation to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Get the latest NAV data
    const navData = result.current.navData;

    // Calculate expected values
    // NAV per token = Total Portfolio Value / Number of Distributed Tokens
    const totalPortfolioValue = mockData[0].current; // 1.1M sats
    const expectedValuePerToken = Math.floor(totalPortfolioValue / mockTokenDistribution.distributed);
    const expectedTotalValue = expectedValuePerToken * mockTokenDistribution.distributed;
    
    expect(navData.totalValueSats).toBe(expectedTotalValue);
    expect(parseFloat(navData.changePercentage)).toBeGreaterThan(0);
  });

  it('calculates NAV correctly with mock data', async () => {
    // Mock the token distribution with 100% distribution
    const mockTokenDistribution = {
      totalSupply: 21000000,
      distributed: 21000000, // All tokens distributed
      runeId: 'OTORI-OVT-TESTNET-2023',
      runeSymbol: 'OVT',
      distributionEvents: []
    };

    // Mock portfolio data
    const mockData = [{
      name: 'Test Project',
      value: 1000000,
      description: 'Test Description',
      tokenAmount: 1000,
      pricePerToken: 1000,
      address: 'tb1p3yauf7efk5p3v6h67k7e88hu6hs9z2wfpvf0wjeyfvf2w73zua4qw2zkfc',
      current: 1100000,
      change: 10
    }];

    const { result } = renderHook(() => useOVTClient());

    // Set up the hook with mocked data
    await act(async () => {
      result.current.setTokenDistribution(mockTokenDistribution);
      result.current.setPortfolioPositions(mockData);
    });

    // Wait for NAV calculation to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Calculate expected values
    const totalPortfolioValue = mockData[0].current;
    const expectedValuePerToken = Math.floor(totalPortfolioValue / mockTokenDistribution.distributed);
    const expectedTotalValue = expectedValuePerToken * mockTokenDistribution.distributed;

    expect(result.current.navData.totalValueSats).toBe(expectedTotalValue);
    expect(parseFloat(result.current.navData.changePercentage)).toBeGreaterThan(0);
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