import { useState, useCallback, useEffect, useMemo } from 'react';
import { ArchClient } from '../lib/archClient';
import { useBitcoinPrice } from '../hooks/useBitcoinPrice';
import { useLaserEyes } from '@omnisat/lasereyes';
import { 
  shouldUseMockData, 
  getDataSourceIndicator,
  mergePortfolioData,
  getTokenSupplyData,
  getHybridModeConfig
} from '../lib/hybridModeUtils';
import { formatValue, SATS_PER_BTC } from '../lib/formatting';

// Export constants for backward compatibility
export { SATS_PER_BTC };

export interface Portfolio {
  name: string;
  value: number;      // in sats
  current: number;    // in sats
  change: number;     // percentage
  description: string;
  transactionId?: string;  // Reference to the position entry transaction
  tokenAmount: number;     // Number of tokens
  pricePerToken: number;   // Price per token in sats
  address: string;         // Bitcoin address holding the position
}

interface NAVData {
  totalValue: string;         // Formatted string for display
  totalValueSats: number;     // Raw value in sats
  changePercentage: string;
  portfolioItems: Portfolio[];
  dataSource?: {              // Indicator for data source in hybrid mode
    isMock: boolean;
    label: string;
    color: string;
  };
}

interface Transaction {
  txid: string;
  type: 'mint' | 'burn' | 'transfer' | 'position_entry' | 'position_exit';
  amount: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  details: {
    reason?: string;
    position?: string;
    signatures?: string[];
    currency?: string;
  };
}

// Update ArchClient interface to include required methods
interface ArchClientResponse {
  portfolioItems: {
    name: string;
    value: number;
    current: number;
    change: number;
    description: string;
    transactionId?: string;
    tokenAmount: number;
    pricePerToken: number;
    address: string;
  }[];
}

// Extend ArchClient type
interface ArchClientType {
  getCurrentNAV(): Promise<ArchClientResponse>;
  addPosition(position: Portfolio): Promise<Portfolio>;
}

// Initialize the Arch client
const archClient = new ArchClient({
  programId: process.env.NEXT_PUBLIC_PROGRAM_ID || '',
  treasuryAddress: process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '',
  endpoint: process.env.NEXT_PUBLIC_ARCH_ENDPOINT || 'http://localhost:8000',
});

// Create a centralized currency formatter that will be used by all components
export const createCurrencyFormatter = (btcPrice: number | null) => {
  // Return a function that formats values according to the specified currency
  return (sats: number, displayMode: 'btc' | 'usd' = 'btc'): string => {
    console.log(`[GLOBAL] Formatting ${sats} sats in ${displayMode} mode with BTC price: ${btcPrice}`);
    
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
};

// Import mock data
import mockPortfolioData from '../mock-data/portfolio-positions.json';
import mockTokenData from '../mock-data/token-data.json';

// Store positions in memory for development
let portfolioPositions: Portfolio[] = [];

// Store transactions in memory for development
let mockTransactions: Transaction[] = [];

// Load initial positions from JSON file in mock mode
if (shouldUseMockData('portfolio')) {
  try {
    console.log('Mock portfolio data enabled, loading portfolio positions...');
    // Add missing address field to each portfolio item
    portfolioPositions = (mockPortfolioData as Omit<Portfolio, 'address'>[]).map(position => ({
      ...position,
      address: `mock-address-${position.name.replace(/\s+/g, '-').toLowerCase()}`
    }));
    
    // Create transaction entries for each position
    mockTransactions = portfolioPositions.map(position => ({
      txid: position.transactionId || `position_${Date.now()}`,
      type: 'position_entry' as const,
      amount: position.value,
      timestamp: Date.now(),
      status: 'confirmed' as const,
      details: {
        position: position.name,
        currency: 'BTC'
      }
    }));

    // Add OVT mint transaction if it exists
    if (mockTokenData && mockTokenData.transactions) {
      // Convert mock token transactions to the correct type
      const typedTransactions: Transaction[] = mockTokenData.transactions.map(tx => ({
        ...tx,
        type: tx.type as 'mint' | 'burn' | 'transfer' | 'position_entry' | 'position_exit',
        status: tx.status as 'pending' | 'confirmed' | 'failed'
      }));
      mockTransactions.push(...typedTransactions);
    }

    console.log('Loaded portfolio positions:', portfolioPositions);
    console.log('Created mock transactions:', mockTransactions);
  } catch (err) {
    console.warn('Failed to load mock portfolio positions:', err);
    portfolioPositions = [];
    mockTransactions = [];
  }
} else {
  console.log('Using real portfolio data. Mock mode not enabled for portfolio data.');
}

export function useOVTClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Initialize from localStorage if available, but use useState with undefined initially
  // to prevent hydration mismatch
  const [baseCurrency, setBaseCurrency] = useState<'btc' | 'usd' | undefined>(undefined);
  const { price: btcPrice } = useBitcoinPrice();
  const { address } = useLaserEyes();
  const hybridConfig = getHybridModeConfig();
  const mockMode = hybridConfig.mode;
  const [navData, setNavData] = useState<NAVData>(() => ({
    totalValue: '$0.00',
    totalValueSats: 0,
    changePercentage: '0%',
    portfolioItems: [],
    dataSource: getDataSourceIndicator('portfolio')
  }));

  // Initialize currency from localStorage after mount to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ovt-currency-preference');
      console.log('Initializing currency from localStorage:', saved);
      setBaseCurrency(saved === 'btc' ? 'btc' : 'usd');
    }
  }, []);

  // Simple currency change handler
  const handleCurrencyChange = useCallback((currency: 'btc' | 'usd') => {
    console.log('Currency changing from', baseCurrency, 'to', currency);
    setBaseCurrency(currency);
    
    // Force a re-fetch of NAV data with the new currency
    fetchNAV(currency);
  }, [baseCurrency]);

  // Get transaction history
  const getTransactionHistory = useCallback(async () => {
    if (shouldUseMockData('transaction')) {
      console.log('Using mock transaction data');
      return mockTransactions;
    }
    
    try {
      // Fetch from Arch Network
      if (archClient) {
        // Get the user's wallet address
        const walletAddress = address || '';
        
        // If we have a wallet address, fetch transactions from the contract
        if (walletAddress) {
          console.log('Fetching transactions for wallet:', walletAddress);
          
          try {
            // First try to get actual transaction history from the contract
            const contractTransactions = await archClient.getTransactionHistory(walletAddress);
            
            // Map contract transactions to our internal format
            const mappedTransactions = contractTransactions.map(tx => ({
              txid: tx.txid,
              type: tx.type.toLowerCase() as 'mint' | 'burn' | 'transfer' | 'position_entry' | 'position_exit',
              amount: tx.amount,
              timestamp: tx.timestamp,
              status: tx.confirmations > 0 ? 'confirmed' as const : 'pending' as const,
              details: {
                reason: tx.metadata?.reason,
                position: tx.metadata?.position,
                signatures: tx.metadata?.signatures,
                currency: tx.metadata?.currency || 'OVT'
              }
            }));
            
            if (mappedTransactions.length > 0) {
              console.log('Found transactions from contract:', mappedTransactions.length);
              return mappedTransactions;
            }
            
            // If no transactions found, try to derive from portfolio data
            console.log('No transactions found, deriving from portfolio data');
          } catch (err) {
            console.error('Error fetching transaction history from contract:', err);
          }
          
          // Fallback: Get portfolio items to extract position entries
          try {
            console.log('Fetching portfolio data to derive position entries');
            const portfolioData = await archClient.getCurrentNAV();
            console.log('Portfolio data received:', portfolioData);
            
            // Convert portfolio items to position entry transactions
            if (portfolioData && portfolioData.portfolioItems && portfolioData.portfolioItems.length > 0) {
              console.log('Creating position entries from portfolio items:', portfolioData.portfolioItems.length);
              
              const positionEntries = portfolioData.portfolioItems.map((item: any) => {
                console.log('Processing portfolio item:', item);
                return {
                  txid: `position-${item.name}-${Date.now()}`,
                  type: 'position_entry' as const,
                  amount: item.tokenAmount || item.value || 0,
                  timestamp: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time within last week
                  status: 'confirmed' as const,
                  details: {
                    position: item.name,
                    currency: 'OVT'
                  }
                };
              });
              
              console.log('Position entries derived from portfolio:', positionEntries.length);
              return positionEntries;
            } else {
              console.log('No portfolio items found to derive position entries');
            }
          } catch (err) {
            console.error('Error deriving transactions from portfolio data:', err);
          }
        }
      }
      
      // If we reach here, we couldn't get any transactions
      console.log('No transactions found and could not derive from portfolio');
      return []; // Return empty array if no client or wallet
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      // Fallback to mock data if there's an error and we're in hybrid mode
      if (mockMode === 'hybrid') {
        console.log('Falling back to mock transaction data due to error');
        return mockTransactions;
      }
      return [];
    }
  }, [archClient, address, mockMode]);

  // Fetch NAV data periodically
  const fetchNAV = useCallback(async (currency: 'btc' | 'usd' = 'usd') => {
    // Only proceed if baseCurrency is defined (client-side)
    if (!baseCurrency && typeof window !== 'undefined') {
      console.log('Currency not yet initialized, using default:', currency);
    }
    
    // Use the passed currency or the current baseCurrency (if defined)
    const currencyToUse = currency || baseCurrency || 'usd';
    console.log('Fetching NAV with currency:', currencyToUse);
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if we should use mock data for portfolio
      if (shouldUseMockData('portfolio')) {
        // Use mock data calculations
        console.log('Using mock portfolio data');
        
        // Calculate total value in sats and growth with random fluctuations
        // Add random fluctuation between -2% and +2% to simulate market movement
        const fluctuation = 1 + (Math.random() * 0.04 - 0.02); // Random value between 0.98 and 1.02
        
        // Update current values with fluctuation for all positions
        const updatedPositions = portfolioPositions.map(position => {
          const currentValue = Math.floor(position.value * 1.1 * fluctuation); // Base 10% growth + fluctuation
          const change = ((currentValue - position.value) / position.value) * 100;
          return {
            ...position,
            current: currentValue,
            change: Number(change.toFixed(1))
          };
        });
        
        // Calculate totals with updated positions
        const totalValueSats = updatedPositions.reduce((sum, item) => sum + item.current, 0);
        const totalInitialSats = updatedPositions.reduce((sum, item) => sum + item.value, 0);
        const changePercentage = ((totalValueSats - totalInitialSats) / totalInitialSats) * 100;
        
        console.log('Mock NAV calculated - total:', totalValueSats, 'sats, currency:', currencyToUse);
        
        setNavData({
          totalValue: formatValue(totalValueSats, currencyToUse, btcPrice),
          totalValueSats,
          changePercentage: `${changePercentage.toFixed(2)}%`,
          portfolioItems: updatedPositions,
          dataSource: getDataSourceIndicator('portfolio')
        });
      } else {
        // Fetch real data from Arch Network
        try {
          console.log('Fetching portfolio data from Arch Network');
          // Make the actual API call instead of throwing an error
          const navResponse = await archClient.getCurrentNAV();
          console.log('Received NAV data from Arch Network:', navResponse);
          
          // Check if we have portfolio items
          if (navResponse && navResponse.portfolioItems && navResponse.portfolioItems.length > 0) {
            console.log('Portfolio items found:', navResponse.portfolioItems.length);
            
            // Map API response to our Portfolio type, adding missing properties
            const mappedPortfolioItems: Portfolio[] = navResponse.portfolioItems.map(item => {
              // Get project name
              const name = item.name || '';
              // Get project description from our helper function
              const description = getProjectDescription(name);
              
              return {
                name: name,
                value: item.value || 0,
                current: item.value || 0, // Use value as current since NAVUpdate doesn't have current
                change: item.change || 0,
                description: description,
                // Generate missing properties with sensible defaults
                transactionId: `tx-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                tokenAmount: Math.floor(item.value / 300) || 0, // Estimate token amount (value / average price)
                pricePerToken: 300, // Default price per token
                address: `address-${name.toLowerCase().replace(/\s+/g, '-')}`
              };
            });
            
            // Calculate total value
            const totalValueSats = mappedPortfolioItems.reduce(
              (sum, item) => sum + item.current, 
              0
            );
            
            // Calculate total initial value
            const totalInitialSats = mappedPortfolioItems.reduce(
              (sum, item) => sum + item.value, 
              0
            );
            
            // Calculate change percentage
            const changePercentage = totalInitialSats > 0 
              ? ((totalValueSats - totalInitialSats) / totalInitialSats) * 100 
              : 0;
            
            setNavData({
              totalValue: formatValue(totalValueSats, currencyToUse, btcPrice),
              totalValueSats,
              changePercentage: `${changePercentage.toFixed(2)}%`,
              portfolioItems: mappedPortfolioItems,
              dataSource: {
                isMock: false,
                label: 'Real Data',
                color: 'green'
              }
            });
          } else {
            console.log('No portfolio items found in NAV response, using fallback');
            throw new Error('No portfolio items found');
          }
        } catch (error) {
          console.error('Error fetching from Arch Network:', error);
          
          // If real data fetch fails in hybrid mode, fall back to mock data
          // This provides resilience against network issues
          if (portfolioPositions.length > 0) {
            console.log('Falling back to mock data due to network error');
            
            // Add random fluctuation between -2% and +2% to simulate market movement
            const fluctuation = 1 + (Math.random() * 0.04 - 0.02); // Random value between 0.98 and 1.02
            
            const totalValueSats = portfolioPositions.reduce((sum: number, item: Portfolio) => {
              const growthMultiplier = 1.1 * fluctuation; // 10% growth + fluctuation
              const currentValue = Math.floor(item.value * growthMultiplier);
              return sum + currentValue;
            }, 0);
            
            const totalInitialSats = portfolioPositions.reduce((sum: number, item: Portfolio) => sum + item.value, 0);
            const changePercentage = ((totalValueSats - totalInitialSats) / totalInitialSats) * 100;

            const updatedPositions = portfolioPositions.map(position => {
              const growthMultiplier = 1.1 * fluctuation; // 10% growth + fluctuation
              const currentValue = Math.floor(position.value * growthMultiplier);
              const change = ((currentValue - position.value) / position.value) * 100;
              return {
                ...position,
                current: currentValue,
                change: Number(change.toFixed(1))
              };
            });

            setNavData({
              totalValue: formatValue(totalValueSats, currencyToUse, btcPrice),
              totalValueSats,
              changePercentage: `${changePercentage.toFixed(2)}%`,
              portfolioItems: updatedPositions,
              dataSource: {
                isMock: true,
                label: 'Fallback Data (Network Error)',
                color: 'red'
              }
            });
          } else {
            setError('Failed to fetch portfolio data and no fallback data available');
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch NAV:', err);
      setError('Failed to fetch portfolio data');
    } finally {
      setIsLoading(false);
    }
  }, [baseCurrency, btcPrice]);
  
  // Fetch NAV data periodically
  useEffect(() => {
    console.log('useEffect for NAV data running, currency:', baseCurrency);
    
    // Initial fetch with current currency mode
    fetchNAV(baseCurrency);
    
    // Set up interval for regular updates
    const interval = setInterval(() => {
      console.log('Interval update with currency:', baseCurrency);
      fetchNAV(baseCurrency);
    }, 60000); // Update every minute to show fluctuations
    
    return () => {
      console.log('Cleaning up NAV data interval');
      clearInterval(interval);
    };
  }, [baseCurrency, fetchNAV]); // Depend on baseCurrency and fetchNAV

  // Add position entry
  const addPosition = useCallback(async (position: Omit<Portfolio, 'current' | 'change'>) => {
    const newPosition: Portfolio = {
      ...position,
      current: Math.floor(position.value * 1.1), // Add 10% growth
      change: 10 // 10% growth
    };

    if (shouldUseMockData('portfolio')) {
      portfolioPositions.push(newPosition);
      return newPosition;
    }

    // In production, this would be stored on-chain
    try {
      // Cast archClient to ArchClientType to satisfy TypeScript
      return await (archClient as unknown as ArchClientType).addPosition(newPosition);
    } catch (error) {
      console.error('Error adding position:', error);
      throw error;
    }
  }, []);

  return {
    isLoading,
    error,
    navData,
    baseCurrency: baseCurrency || 'usd', // Provide a default for server-side rendering
    setBaseCurrency: handleCurrencyChange,
    formatValue: useCallback((sats: number, displayMode?: 'btc' | 'usd') => 
      formatValue(sats, displayMode || baseCurrency || 'usd', btcPrice), 
    [baseCurrency, btcPrice]),
    currencyFormatter: useCallback((sats: number, mode?: 'btc' | 'usd') => 
      formatValue(sats, mode || baseCurrency || 'usd', btcPrice), 
    [baseCurrency, btcPrice]),
    addPosition,
    getPositions: () => portfolioPositions,
    getTransactionHistory,
    dataSourceIndicator: {
      portfolio: getDataSourceIndicator('portfolio'),
      transaction: getDataSourceIndicator('transaction'),
      tokenSupply: getDataSourceIndicator('tokenSupply')
    },
    btcPrice // Expose the Bitcoin price directly
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
