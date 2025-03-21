import { useState, useCallback, useEffect, useMemo } from 'react';
import { ArchClient } from '../lib/archClient';
import { RuneClient } from '../lib/runeClient';
import { useBitcoinPrice } from '../hooks/useBitcoinPrice';
import { useLaserEyes } from '@omnisat/lasereyes';
import { 
  shouldUseMockData, 
  getDataSourceIndicator,
  mergePortfolioData,
  getTokenSupplyData,
  getHybridModeConfig
} from '../lib/hybridModeUtils';
import { ensurePortfolioDataLoaded } from '../utils/portfolioLoader';
import { SATS_PER_BTC } from '../lib/formatting';
import { 
  simulatePortfolioPriceMovements, 
  PortfolioPosition 
} from '../utils/priceMovement';

// Constants for numeric handling
export { SATS_PER_BTC };

// Import mock portfolio data
import mockPortfolioData from '../mock-data/portfolio-positions.json';

// Make Portfolio compatible with PortfolioPosition to support price movement simulation
export interface Portfolio extends PortfolioPosition {
  // Ensure description is required for Portfolio
  description: string;
}

export interface TokenDistribution {
  totalSupply: number;     // Total token supply
  distributed: number;     // Number of tokens distributed
  runeId: string;         // OVT rune identifier
  runeSymbol: string;     // OVT symbol (e.g., 'OVT')
  distributionEvents: {
    timestamp: number;
    amount: number;
    recipient: string;
    txid: string;
    runeTransactionId?: string;  // Rune-specific transaction ID
  }[];
}

interface NAVData {
  totalValue: string;         // Formatted string for display
  totalValueSats: number;     // Raw value in sats
  changePercentage: string;
  portfolioItems: Portfolio[];
  tokenDistribution: TokenDistribution;
}

// Initialize clients
const runeClient = new RuneClient();
const archClient = new ArchClient({
  programId: process.env.NEXT_PUBLIC_PROGRAM_ID || '',
  treasuryAddress: process.env.NEXT_PUBLIC_TREASURY_ADDRESS || 'tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd',
  endpoint: process.env.NEXT_PUBLIC_ARCH_ENDPOINT || 'http://localhost:8000'
});

// Helper function to format values consistently
const formatValue = (sats: number, displayMode: 'btc' | 'usd' = 'btc', btcPrice?: number | null): string => {
  // Reduce logging for better performance - only log in development and not for every call
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) { // Only log ~5% of calls
    console.log(`formatValue called with sats: ${sats}, mode: ${displayMode}, btcPrice: ${btcPrice}`);
  }
  
  if (displayMode === 'usd' && btcPrice) {
    const usdValue = (sats / SATS_PER_BTC) * btcPrice;
    // USD formatting
    if (usdValue >= 1000000) {
      return `$${(usdValue / 1000000).toFixed(2)}M`; // Above 1M: 2 decimals with M
    }
    if (usdValue >= 1000) {
      return `$${(usdValue / 1000).toFixed(1)}k`; // Below 1M: 1 decimal with k
    }
    if (usdValue < 100) {
      return `$${usdValue.toFixed(2)}`; // Below 100: 2 decimals
    }
    return `$${Math.round(usdValue)}`; // Below 1000: no decimals
  }

  // BTC display mode
  if (sats >= 10000000) { // 0.1 BTC or more
    return `₿${(sats / SATS_PER_BTC).toFixed(2)}`; // Show as BTC with 2 decimals
  }
  
  // Show as sats with k/M notation
  if (sats >= 1000000) {
    return `${(sats / 1000000).toFixed(2)}M sats`; // Millions
  }
  if (sats >= 1000) {
    return `${(sats / 1000).toFixed(1)}k sats`; // Thousands
  }
  
  // Small values
  return `${Math.floor(sats)} sats`;
};

export function useOVTClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseCurrency, setBaseCurrency] = useState<'btc' | 'usd' | undefined>(undefined);
  
  // Add a fallback for Bitcoin price in case useBitcoinPrice returns undefined during testing
  const bitcoinPriceHook = useBitcoinPrice() || { price: 50000, isLoading: false, error: null };
  
  // Memoize the bitcoin price and only update it when it changes by more than 1%
  // This prevents small fluctuations from causing re-renders
  const { price: rawBtcPrice } = bitcoinPriceHook;
  const btcPrice = useMemo(() => {
    // Initialize with the current value
    if (typeof rawBtcPrice !== 'number') return 50000;
    
    // Round to the nearest 100 to reduce fluctuations
    return Math.round(rawBtcPrice / 100) * 100;
  }, [rawBtcPrice]);
  
  const { address } = useLaserEyes();
  const [portfolioPositions, setPortfolioPositions] = useState<Portfolio[]>([]);
  const [lastPriceUpdateTime, setLastPriceUpdateTime] = useState<number>(Date.now());

  const [navData, setNavData] = useState<NAVData>({
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

  // Initialize currency from localStorage after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ovt-currency-preference');
      setBaseCurrency(saved === 'btc' ? 'btc' : 'usd');
    }
  }, []);

  // Initialize portfolio positions with mock data
  useEffect(() => {
    const positions = mockPortfolioData.map(position => ({
      ...position,
      address: `mock-address-${position.name.replace(/\s+/g, '-').toLowerCase()}`
    })) as Portfolio[];
    
    // Apply initial price movement to create realistic growth
    const simulatedPositions = simulatePortfolioPriceMovements(positions);
    
    // Ensure required description field is set for all positions
    const validPositions = simulatedPositions.map(pos => ({
      ...pos,
      description: pos.description || getProjectDescription(pos.name)
    })) as Portfolio[];
    
    setPortfolioPositions(validPositions);
  }, []);

  // Simulate price movements for mock data
  useEffect(() => {
    if (!shouldUseMockData('portfolio')) {
      return; // Only simulate prices for mock data
    }
    
    // Set up interval for regular price updates - longer interval for better performance
    const interval = setInterval(() => {
      setPortfolioPositions(prevPositions => {
        // Apply price movements
        const updatedPositions = simulatePortfolioPriceMovements(prevPositions);
        
        // Ensure required description field is set for all positions
        const validPositions = updatedPositions.map(pos => ({
          ...pos,
          description: pos.description || getProjectDescription(pos.name)
        })) as Portfolio[];
        
        setLastPriceUpdateTime(Date.now());
        return validPositions;
      });
    }, 45000 + Math.random() * 30000); // Longer interval (45-75 seconds) for better performance
    
    return () => clearInterval(interval);
  }, []);

  // Currency change handler
  const handleCurrencyChange = useCallback((currency: 'btc' | 'usd') => {
    setBaseCurrency(currency);
    localStorage.setItem('ovt-currency-preference', currency);
    fetchNAV(currency);
    
    // Dispatch a custom event that other components can listen for
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('currency-changed', { 
        detail: { currency } 
      }));
    }
  }, []);

  // Get transaction history from blockchain
  const getTransactionHistory = useCallback(async () => {
    try {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      // Get transaction info for the address
      const txInfo = await runeClient.getTransactionInfo(address);
      return txInfo ? [txInfo] : [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }, [address]);

  // Fetch NAV data
  const fetchNAV = useCallback(async (currency: 'btc' | 'usd' = 'usd') => {
    const currencyToUse = currency || baseCurrency || 'usd';
    setIsLoading(true);
    setError(null);

    try {
      // Use stored portfolio positions instead of loading from mock data
      const portfolioItems = portfolioPositions.map(position => ({
        ...position,
        address: position.address || `mock-address-${position.name.replace(/\s+/g, '-').toLowerCase()}`
      }));

      // Calculate total value from portfolio items - this should be the current value
      const totalCurrentValue = portfolioItems.reduce((sum, item) => sum + (item.current || item.value), 0);
      
      // Calculate initial total value
      const totalInitialValue = portfolioItems.reduce((sum, item) => sum + item.value, 0);
      
      // Calculate portfolio growth percentage from initial to current
      const portfolioGrowthPercentage = totalInitialValue > 0 
        ? ((totalCurrentValue - totalInitialValue) / totalInitialValue) * 100
        : 0;

      // Get real rune data with fallback for tests
      let runeData;
      try {
        runeData = await runeClient.getRuneInfo();
      } catch (err) {
        // Reduced logging verbosity
        console.warn('Using fallback rune data');
        runeData = {
          id: 'test-rune-id',
          symbol: 'OVT',
          supply: {
            total: 21000000,
            distributed: 1000000,
            treasury: 20000000,
            percentDistributed: 4.76
          },
          events: []
        };
      }
      
      setNavData({
        totalValue: formatValue(totalCurrentValue, currencyToUse, btcPrice),
        totalValueSats: totalCurrentValue,
        changePercentage: `${portfolioGrowthPercentage.toFixed(2)}%`,
        portfolioItems,
        tokenDistribution: {
          totalSupply: runeData?.supply?.total || 21000000,
          distributed: runeData?.supply?.distributed || 1000000,
          runeId: runeData?.id || 'test-rune-id',
          runeSymbol: runeData?.symbol || 'OVT',
          distributionEvents: runeData?.events || []
        }
      });
    } catch (error) {
      console.error('Error fetching NAV data:', error);
      setError('Failed to fetch portfolio data');
    } finally {
      setIsLoading(false);
    }
  }, [baseCurrency, btcPrice, portfolioPositions]);

  // Fetch NAV data on mount and when dependencies change
  useEffect(() => {
    if (baseCurrency) {
      fetchNAV(baseCurrency);
    }
  }, [fetchNAV, baseCurrency, lastPriceUpdateTime]);

  // Update the formatValue function to handle the current display mode
  // Add memoization to prevent excessive recalculations
  const formatValueWithMode = useCallback((sats: number, displayMode?: 'btc' | 'usd') => {
    const mode = displayMode || baseCurrency || 'usd';
    // For USD mode, always use the memoized BTC price
    return formatValue(sats, mode, btcPrice);
  }, [baseCurrency, btcPrice]);

  // Add position management functions
  const addPosition = useCallback(async (position: Omit<Portfolio, 'address' | 'current' | 'change'>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create a new position with generated values
      const newPosition: Portfolio = {
        ...position,
        address: `mock-address-${position.name.replace(/\s+/g, '-').toLowerCase()}`,
        current: position.value, // Initialize current value same as initial value
        change: 0 // Initialize with no change
      };
      
      // Add to existing positions
      setPortfolioPositions(prev => [...prev, newPosition]);
      
      return newPosition;
    } catch (error) {
      console.error('Error adding position:', error);
      setError('Failed to add position');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add getPositions function
  const getPositions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      return portfolioPositions;
    } catch (error) {
      console.error('Error getting positions:', error);
      setError('Failed to get positions');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [portfolioPositions]);

  return {
    isLoading,
    error,
    navData,
    baseCurrency: baseCurrency || 'usd',
    setBaseCurrency: handleCurrencyChange,
    formatValue: formatValueWithMode,
    getTransactionHistory,
    runeClient,
    archClient,
    setPortfolioPositions,
    portfolioPositions,
    btcPrice,
    addPosition,
    getPositions
  };
}

// Helper function to get project descriptions
function getProjectDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'Polymorphic Labs': 'Encryption Layer',
    'VoltFi': 'Bitcoin Volatility Index on Bitcoin',
    'MIXDTape': 'Phygital Music for superfans - disrupting Streaming',
  };
  return descriptions[name] || '';
} 
