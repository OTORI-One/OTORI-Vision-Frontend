import { useState, useCallback, useEffect } from 'react';
import { ArchClient } from '../lib/archClient';
import { RuneClient } from '../lib/runeClient';
import { useBitcoinPrice } from '../hooks/useBitcoinPrice';
import { useLaserEyes } from '@omnisat/lasereyes';
import { formatValue, SATS_PER_BTC } from '../lib/formatting';

// Export constants for backward compatibility
export { SATS_PER_BTC };

// Import mock portfolio data
import mockPortfolioData from '../mock-data/portfolio-positions.json';

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

export function useOVTClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseCurrency, setBaseCurrency] = useState<'btc' | 'usd' | undefined>(undefined);
  const { price: btcPrice } = useBitcoinPrice();
  const { address } = useLaserEyes();
  const [portfolioPositions, setPortfolioPositions] = useState<Portfolio[]>(
    mockPortfolioData.map(position => ({
      ...position,
      address: `mock-address-${position.name.replace(/\s+/g, '-').toLowerCase()}`
    }))
  );

  const [navData, setNavData] = useState<NAVData>(() => ({
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
  }));

  // Initialize currency from localStorage after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ovt-currency-preference');
      setBaseCurrency(saved === 'btc' ? 'btc' : 'usd');
    }
  }, []);

  // Currency change handler
  const handleCurrencyChange = useCallback((currency: 'btc' | 'usd') => {
    setBaseCurrency(currency);
    localStorage.setItem('ovt-currency-preference', currency);
    fetchNAV(currency);
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

      // Calculate total value from portfolio items
      const totalValue = portfolioItems.reduce((sum, item) => sum + item.value, 0);
      
      // Calculate portfolio growth
      const previousTotal = portfolioItems.reduce((sum, item) => sum + (item.current || item.value), 0);
      const portfolioGrowthPercentage = ((totalValue - previousTotal) / previousTotal) * 100;

      // Get real rune data
      const runeData = await runeClient.getRuneInfo();
      
      setNavData({
        totalValue: formatValue(totalValue, currencyToUse, btcPrice),
        totalValueSats: totalValue,
        changePercentage: `${portfolioGrowthPercentage.toFixed(2)}%`,
        portfolioItems,
        tokenDistribution: {
          totalSupply: runeData.supply.total,
          distributed: runeData.supply.distributed,
          runeId: runeData.id,
          runeSymbol: runeData.symbol,
          distributionEvents: runeData.events || []
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
  }, [fetchNAV, baseCurrency]);

  return {
    isLoading,
    error,
    navData,
    baseCurrency,
    btcPrice,
    handleCurrencyChange,
    getTransactionHistory,
    formatValue: (value: number) => formatValue(value, baseCurrency || 'usd', btcPrice),
    runeClient,
    archClient,
    setPortfolioPositions,
    portfolioPositions
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
