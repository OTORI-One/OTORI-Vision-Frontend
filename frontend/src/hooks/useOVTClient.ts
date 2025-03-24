import { useState, useCallback, useEffect, useMemo } from 'react';
import { ArchClient } from '../lib/archClient';
import { RuneClient, OVT_RUNE_ID, OVT_FALLBACK_DISTRIBUTED } from '../lib/runeClient';
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
import { SATS_PER_BTC, formatCurrencyValue } from '../lib/formatting';
import { 
  simulatePortfolioPriceMovements, 
  PortfolioPosition,
  getGlobalNAVReference
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
const runeClient = new RuneClient({
  baseUrl: process.env.NEXT_PUBLIC_RUNES_API_ENDPOINT || 'http://localhost:3030',
  mockData: process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
});
const archClient = new ArchClient({
  programId: process.env.NEXT_PUBLIC_PROGRAM_ID || '',
  treasuryAddress: process.env.NEXT_PUBLIC_TREASURY_ADDRESS || 'tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd',
  endpoint: process.env.NEXT_PUBLIC_ARCH_ENDPOINT || 'http://localhost:8000'
});

// Helper function to format values consistently
const formatValue = (value: number, displayMode: 'btc' | 'usd' = 'btc', btcPrice?: number | null): string => {
  // Reduce logging for better performance
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) { // Only log ~1% of calls
    console.log(`formatValue called with value: ${value}, mode: ${displayMode}, btcPrice: ${btcPrice}`);
  }
  
  try {
    if (!Number.isFinite(value) || value < 0) {
      value = 0;
    }
    
    // Ensure we're using the correct BTC price for USD conversion
    const effectiveBtcPrice = btcPrice || 50000; // Default to 50k for tests
    
    if (displayMode === 'usd') {
      // Format USD value - calculate the USD value first
      return formatCurrencyValue(value, 'usd');
    } else {
      // Format BTC value
      return formatCurrencyValue(value, 'btc');
    }
  } catch (error) {
    console.error('Error in formatValue:', error);
    return displayMode === 'usd' ? '$0.00' : '₿0.00';
  }
};

// Add global store for currency and price to maintain consistency across page navigations
let globalBaseCurrency: 'btc' | 'usd' = 'usd';
let globalOVTPrice: number = getGlobalNAVReference();

// Function to update the global OVT price
export const updateGlobalOVTPrice = (price: number): void => {
  if (Number.isFinite(price) && price > 0) {
    globalOVTPrice = price;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ovt-global-price', price.toString());
      } catch (e) {
        console.error('Failed to save OVT price to localStorage:', e);
      }
    }
  }
};

// Function to get the global OVT price
export const getGlobalOVTPrice = (): number => {
  if (typeof window !== 'undefined') {
    try {
      const savedPrice = localStorage.getItem('ovt-global-price');
      if (savedPrice) {
        const parsedPrice = parseFloat(savedPrice);
        if (Number.isFinite(parsedPrice) && parsedPrice > 0) {
          globalOVTPrice = parsedPrice;
        }
      }
    } catch (e) {
      console.error('Failed to load OVT price from localStorage:', e);
    }
  }
  return globalOVTPrice;
};

export function useOVTClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseCurrency, setBaseCurrency] = useState<'btc' | 'usd' | undefined>(globalBaseCurrency);
  
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
  
  // Get the global OVT price
  const initialOVTPrice = getGlobalOVTPrice();
  
  // Add centralized OVT price state
  const [ovtPrice, setOvtPrice] = useState<number>(initialOVTPrice);
  
  // Formatted OVT price for consistent display
  const formattedOvtPrice = useMemo(() => {
    // Make sure we have a non-zero value
    const valueToFormat = Math.max(ovtPrice || 0, 1);
    
    // Format the value based on currency
    if (baseCurrency === 'usd' && btcPrice) {
      const usdValue = (valueToFormat / SATS_PER_BTC) * btcPrice;
      
      // USD formatting - use standard rules
      if (usdValue >= 1000000) {
        return `$${(usdValue / 1000000).toFixed(2)}M`; 
      }
      if (usdValue >= 1000) {
        return `$${(usdValue / 1000).toFixed(1)}k`; 
      }
      if (usdValue < 100) {
        return `$${usdValue.toFixed(2)}`; 
      }
      return `$${Math.round(usdValue)}`;
    } else {
      // BTC formatting
      return formatValue(valueToFormat, 'btc');
    }
  }, [ovtPrice, baseCurrency, btcPrice]);

  const [navData, setNavData] = useState<NAVData>({
    totalValue: formatValue(getGlobalNAVReference(), 'usd'),
    totalValueSats: getGlobalNAVReference(),
    changePercentage: '0%',
    portfolioItems: [],
    tokenDistribution: {
      totalSupply: 2100000,
      distributed: 2100000,
      runeId: OVT_RUNE_ID,
      runeSymbol: 'OVT',
      distributionEvents: []
    }
  });

  // Initialize currency from localStorage after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ovt-currency-preference');
        const currency = saved === 'btc' ? 'btc' : 'usd';
        globalBaseCurrency = currency;
        setBaseCurrency(currency);
        
        // Initialize price from localStorage
        const savedPrice = localStorage.getItem('ovt-global-price');
        if (savedPrice) {
          const parsedPrice = parseFloat(savedPrice);
          if (Number.isFinite(parsedPrice) && parsedPrice > 0) {
            setOvtPrice(parsedPrice);
          }
        }
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    }
  }, []);

  // Initialize portfolio positions with mock data
  useEffect(() => {
    try {
      console.log('Initializing portfolio positions with mock data');
      
      // Check if mockPortfolioData is valid
      if (!Array.isArray(mockPortfolioData) || mockPortfolioData.length === 0) {
        console.error('Mock portfolio data is invalid:', mockPortfolioData);
        // Create some fallback data to prevent errors
        const fallbackPositions = [
          {
            name: "Polymorphic Labs",
            value: 150000000,
            current: 150000000,
            change: 0,
            description: "Encryption Layer",
            tokenAmount: 500000,
            pricePerToken: 300,
            address: "mock-address-polymorphic-labs"
          }
        ];
        setPortfolioPositions(fallbackPositions as Portfolio[]);
        return;
      }
      
      // Map positions with address field
      const positions = mockPortfolioData.map(position => ({
        ...position,
        address: `mock-address-${position.name.replace(/\s+/g, '-').toLowerCase()}`
      })) as Portfolio[];
      
      // Ensure all positions have valid values
      const validatedPositions = positions.map(pos => ({
        ...pos,
        value: pos.value > 0 ? pos.value : 10000000, // Fallback to 10M sats (0.1 BTC)
        current: pos.current > 0 ? pos.current : pos.value > 0 ? pos.value : 10000000,
        tokenAmount: pos.tokenAmount > 0 ? pos.tokenAmount : 100000,
        pricePerToken: pos.pricePerToken > 0 ? pos.pricePerToken : 100
      }));
      
      // Apply initial price movement to create realistic growth
      const simulatedPositions = simulatePortfolioPriceMovements(validatedPositions);
      
      // Ensure required description field is set for all positions
      const finalPositions = simulatedPositions.map(pos => ({
        ...pos,
        description: pos.description || getProjectDescription(pos.name)
      })) as Portfolio[];
      
      console.log('Setting initial portfolio positions:', finalPositions.length);
      setPortfolioPositions(finalPositions);
      
    } catch (error) {
      console.error('Error initializing portfolio positions:', error);
      // Create some fallback data to prevent errors
      const fallbackPositions = [
        {
          name: "Fallback Position",
          value: 100000000,
          current: 100000000,
          change: 0,
          description: "Fallback position for error recovery",
          tokenAmount: 100000,
          pricePerToken: 1000,
          address: "mock-address-fallback"
        }
      ];
      setPortfolioPositions(fallbackPositions as Portfolio[]);
    }
  }, []);

  // Simulate price movements for mock data
  useEffect(() => {
    if (!shouldUseMockData('portfolio')) {
      return; // Only simulate prices for mock data
    }
    
    // Listen for portfolio updates from usePortfolioPrices hook
    const handlePortfolioUpdate = (e: CustomEvent) => {
      if (e.detail && e.detail.positions) {
        setPortfolioPositions(e.detail.positions);
        setLastPriceUpdateTime(Date.now());
      }
    };
    
    // Add listener for portfolio updates
    window.addEventListener('portfolio-updated', handlePortfolioUpdate as EventListener);
    
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
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('portfolio-updated', handlePortfolioUpdate as EventListener);
    };
  }, []);

  // Currency change handler
  const handleCurrencyChange = useCallback((currency: 'btc' | 'usd') => {
    // Update global currency
    globalBaseCurrency = currency;
    setBaseCurrency(currency);
    
    try {
      localStorage.setItem('ovt-currency-preference', currency);
    } catch (e) {
      console.error('Failed to save currency preference:', e);
    }
    
    // Instead of calling fetchNAV, just update the display currency of existing data
    setNavData(prev => ({
      ...prev,
      totalValue: formatValue(prev.totalValueSats, currency, btcPrice)
    }));
    
    // Dispatch a custom event that other components can listen for
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('currency-changed', { 
        detail: { currency } 
      }));
    }
  }, [btcPrice]);

  // Get transaction history from blockchain
  const getTransactionHistory = useCallback(async () => {
    try {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      // For now, return empty array as transaction history requires additional implementation
      console.log('Transaction history for address:', address);
      return [];
      
      // Implementation placeholder for when getTransactionInfo is added to RuneClient
      // const txInfo = await runeClient.getTransactionInfo(address);
      // return txInfo ? [txInfo] : [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }, [address]);

  // Fetch NAV data - memoize to prevent unnecessary re-creation
  const fetchNAV = useCallback(async (currency: 'btc' | 'usd' = 'usd') => {
    const currencyToUse = currency || baseCurrency || 'usd';
    setIsLoading(true);
    setError(null);

    try {
      // Defensive check for null portfolioPositions
      if (!portfolioPositions || !Array.isArray(portfolioPositions)) {
        throw new Error('Portfolio positions are not available');
      }
      
      // Use stored portfolio positions instead of loading from mock data
      const portfolioItems = portfolioPositions.map(position => ({
        ...position,
        address: position.address || `mock-address-${position.name.replace(/\s+/g, '-').toLowerCase()}`
      }));

      // Log portfolio items to help debug
      console.log('Portfolio items for NAV calculation:', portfolioItems.length);
      
      // Calculate total value from portfolio items - this should be the current value
      // Add a minimum fallback value to avoid zero values
      const fallbackValue = getGlobalNAVReference(); // Use the global NAV reference as fallback
      console.log('NAV fallback value:', fallbackValue);
      
      // Sum up current values with better error handling
      let totalCurrentValue = 0;
      try {
        if (portfolioItems.length > 0) {
          totalCurrentValue = portfolioItems.reduce((sum, item) => {
            const current = item.current || item.value || 0; 
            return sum + current;
          }, 0);
        }
      } catch (err) {
        console.error('Error summing portfolio values:', err);
      }
      
      console.log('Calculated total current value:', totalCurrentValue);
      
      // Ensure we have a minimum value
      if (totalCurrentValue <= 0) {
        console.log('Using fallback NAV value:', fallbackValue);
        totalCurrentValue = fallbackValue;
      }
      
      // Calculate OVT price as a separate value based on NAV and distributed tokens
      // This makes OVT price distinct from the NAV value
      const distributedTokens = OVT_FALLBACK_DISTRIBUTED;
      
      // Fixed calculation to avoid NaN - ensure division by non-zero value
      const calculatedOvtPrice = distributedTokens > 0 
        ? Math.floor((totalCurrentValue * 0.65) / distributedTokens) 
        : 219; // Fallback to a default price if calculation fails
      
      // Set the OVT price in sats - formatting happens later based on currency
      setOvtPrice(calculatedOvtPrice);
      updateGlobalOVTPrice(calculatedOvtPrice);
      
      // Log for debugging
      console.log(`OVT price calculated: ${calculatedOvtPrice} sats, NAV: ${totalCurrentValue} sats`);
      
      // Calculate initial total value with error handling
      let totalInitialValue = fallbackValue;
      try {
        if (portfolioItems.length > 0) {
          const calculatedInitial = portfolioItems.reduce((sum, item) => sum + (item.value || 0), 0);
          if (calculatedInitial > 0) {
            totalInitialValue = calculatedInitial;
          }
        }
      } catch (err) {
        console.error('Error calculating initial value:', err);
      }
      
      // Calculate portfolio growth percentage from initial to current
      const portfolioGrowthPercentage = totalInitialValue > 0 
        ? ((totalCurrentValue - totalInitialValue) / totalInitialValue) * 100
        : 0;

      // Apply consistent formatting for growth percentage
      const formattedChangePercentage = portfolioGrowthPercentage.toFixed(2) + '%';

      // Define fallback rune data to always have valid values
      const fallbackRuneData = {
        id: 'test-rune-id',
        symbol: 'OVT',
        supply: {
          total: 2100000,
          distributed: 2100000, // All tokens distributed now
          treasury: 0, // Treasury transferred to LP
          percentDistributed: 100 // 100% distributed
        },
        events: []
      };

      // Get real rune data with fallback for tests
      let runeData;
      try {
        // Use mock data directly - but with less logging
        runeData = fallbackRuneData;
      } catch (err) {
        // Reduced logging verbosity
        runeData = fallbackRuneData;
      }
      
      // Set NAV data with all the calculated values
      const currencyToUse = baseCurrency || 'btc';
      
      // Format the NAV value correctly based on currency
      let formattedNAV;
      if (currencyToUse === 'usd' && btcPrice) {
        const usdValue = (totalCurrentValue / SATS_PER_BTC) * btcPrice;
        
        // USD formatting - use standard rules
        if (usdValue >= 1000000) {
          formattedNAV = `$${(usdValue / 1000000).toFixed(2)}M`; 
        } else if (usdValue >= 1000) {
          formattedNAV = `$${(usdValue / 1000).toFixed(1)}k`; 
        } else if (usdValue < 100) {
          formattedNAV = `$${usdValue.toFixed(2)}`; 
        } else {
          formattedNAV = `$${Math.round(usdValue)}`;
        }
      } else {
        formattedNAV = formatValue(totalCurrentValue, 'btc');
      }
      
      // Set NAV data with all the calculated values
      setNavData({
        totalValue: formattedNAV,
        totalValueSats: totalCurrentValue,
        changePercentage: formattedChangePercentage,
        portfolioItems,
        tokenDistribution: {
          totalSupply: fallbackRuneData.supply.total,
          distributed: fallbackRuneData.supply.distributed,
          runeId: fallbackRuneData.id,
          runeSymbol: fallbackRuneData.symbol,
          distributionEvents: []
        }
      });
    } catch (error) {
      console.error('Error fetching NAV data:', error);
      setError('Failed to fetch portfolio data');
      
      // Even on error, set default NAV data to prevent UI issues
      setNavData({
        totalValue: formatValue(getGlobalNAVReference(), currencyToUse, btcPrice),
        totalValueSats: getGlobalNAVReference(),
        changePercentage: `0.00%`,
        portfolioItems: [],
        tokenDistribution: {
          totalSupply: 2100000,
          distributed: 2100000,
          runeId: OVT_RUNE_ID,
          runeSymbol: 'OVT',
          distributionEvents: []
        }
      });
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
  const formatValueWithMode = useCallback((value: number, displayMode?: 'btc' | 'usd') => {
    if (!Number.isFinite(value) || value < 0) {
      value = 0;
    }
    
    try {
      const mode = displayMode || baseCurrency || 'usd';
      // For USD mode, always use the memoized BTC price
      return formatValue(value, mode, btcPrice);
    } catch (error) {
      console.error('Error in formatValueWithMode:', error);
      return (displayMode || baseCurrency) === 'usd' ? '$0.00' : '₿0.00';
    }
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

  // Get circulating supply of OVT tokens
  const getCirculatingSupply = useCallback(async (): Promise<number> => {
    try {
      return await runeClient.getCirculatingSupply();
    } catch (error) {
      console.error('Error getting circulating supply:', error);
      return OVT_FALLBACK_DISTRIBUTED; // Fallback to 1M OVT as per the first TGE plan
    }
  }, []);

  return {
    isLoading,
    error,
    navData,
    baseCurrency: baseCurrency || 'usd',
    btcPrice,
    portfolioPositions,
    lastPriceUpdateTime,
    formatValue: useCallback((value: number, mode?: 'btc' | 'usd') => {
      return formatValue(value, mode || baseCurrency || 'usd', btcPrice);
    }, [baseCurrency, btcPrice]),
    getTransactionHistory,
    fetchNAV,
    handleCurrencyChange,
    setBaseCurrency: handleCurrencyChange,
    archClient,
    setPortfolioPositions,
    addPosition,
    getPositions,
    getCirculatingSupply,
    ovtPrice,
    formattedOvtPrice
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
