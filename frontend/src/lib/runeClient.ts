import axios from 'axios';

// Constants for the OVT rune
export const OVT_RUNE_ID = '240249:101';
export const OVT_RUNE_SYMBOL = 'OTORI•VISION•TOKEN';
export const OVT_RUNE_TICKER = 'OVT'; // Short version for display
export const OVT_RUNE_DECIMALS = 2;
export const OVT_TOTAL_SUPPLY = 2100000; // 2.1M tokens with 2 decimal places
export const OVT_TREASURY_ADDRESS = 'tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd';
export const OVT_TRANSACTION_ID = 'e75ce796378927a5c152e8ee469c4ca3cf19a921f1e444fb88a22aaf035782fb';
export const OVT_LP_ADDRESS = 'tb1p3vn6wc0dlud3tvckv95datu3stq4qycz7vj9mzpclfkrv9rh8jqsjrw38f';
export const OVT_FALLBACK_DISTRIBUTED = 1000000; // 1M OVT as fallback for first TGE

// OVT Rune constant
export const OVT_RUNE = {
  id: '240249:101',
  symbol: 'OTORI•VISION•TOKEN',
  ticker: 'OVT',
  treasuryAddress: 'tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd',
  lpAddress: 'tb1p3vn6wc0dlud3tvckv95datu3stq4qycz7vj9mzpclfkrv9rh8jqsjrw38f', // LP wallet address
};

// Mock data for fallback when API is unavailable
const MOCK_RUNE_DATA = {
  id: OVT_RUNE_ID,
  symbol: OVT_RUNE_SYMBOL,
  ticker: OVT_RUNE_TICKER,
  name: 'OTORI Vision Token',
  description: 'Investment token for bitcoin-based portfolios',
  timestamp: Date.now(),
  divisibility: OVT_RUNE_DECIMALS,
  supply: {
    total: 2100000,
    circulating: OVT_FALLBACK_DISTRIBUTED,
    maximum: 2100000,
    distributed: OVT_FALLBACK_DISTRIBUTED, // Using 1M as fallback for first TGE
    treasury: 0,
    percentDistributed: Math.floor((OVT_FALLBACK_DISTRIBUTED / 2100000) * 100)
  }
};

const MOCK_DISTRIBUTION_STATS = {
  totalSupply: 2100000,
  distributed: OVT_FALLBACK_DISTRIBUTED, // Using 1M as fallback for first TGE
  treasuryHeld: 0, // Treasury has transferred funds to LP
  lpHeld: 2100000 - OVT_FALLBACK_DISTRIBUTED, // Remaining tokens in LP
  percentDistributed: Math.floor((OVT_FALLBACK_DISTRIBUTED / 2100000) * 100),
  percentInLP: Math.floor(((2100000 - OVT_FALLBACK_DISTRIBUTED) / 2100000) * 100),
  treasuryAddresses: [OVT_RUNE.treasuryAddress],
  lpAddresses: [OVT_RUNE.lpAddress],
  distributionEvents: [
    {
      timestamp: Date.now() - 86400000 * 3, // 3 days ago
      amount: 2100000,
      recipient: OVT_RUNE.lpAddress,
      txid: '7fe85de59430a8d6c180fdc66ff616f31a9ec9476fdbe3dda3482df4f26b86b0',
      type: 'lp_allocation'
    },
    {
      timestamp: Date.now() - 86400000 * 2, // 2 days ago
      amount: OVT_FALLBACK_DISTRIBUTED,
      recipient: 'multiple-recipients',
      txid: '8ae95df69430b7c6d181fec77fa617f42b8ed9587fcbe4eeb4592ef5a37c96c1',
      type: 'user_distribution'
    }
  ]
};

// Set up a cached response to avoid too many API calls
let cachedRuneInfo: any = null;
let cachedDistributionStats: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface RuneClientConfig {
  baseUrl: string;
  mockData?: boolean;
}

export interface RuneSupply {
  circulating: number;
  maximum: number;
  minted: number;
  supply: string;
}

export interface RuneEvent {
  txid: string;
  amount: number;
  timestamp: number;
  recipient: string;
  type?: 'lp_allocation' | 'user_distribution' | 'mint' | 'etch';
}

export interface RuneInfo {
  id: string;
  number: number;
  rune: string;
  supply: RuneSupply;
  timestamp: number;
  etching: string;
  deadline?: number;
  mintable?: boolean;
  divisibility: number;
  spacers: number;
  symbol: string;
  terms?: string;
}

export interface RuneBalance {
  address: string;
  amount: number;
  isTreasury?: boolean;
  isLP?: boolean;
}

export interface LPInfo {
  address: string;
  liquidity: {
    ovt: number;
    btcSats: number;
    impactMultiplier: number;
  };
  pricing: {
    currentPriceSats: number;
    lastTradeTime: number;
    dailyVolume: number;
    weeklyVolume: number;
  };
  transactions: Array<{
    txid: string;
    type: 'buy' | 'sell';
    amount: number;
    priceSats: number;
    timestamp: number;
  }>;
}

export interface DistributionStats {
  totalSupply: number;
  treasuryHeld: number;
  lpHeld: number;
  distributed: number;
  percentDistributed: number;
  percentInLP: number;
  treasuryAddresses: string[];
  lpAddresses: string[];
  distributionEvents: RuneEvent[];
}

/**
 * Client for interacting with Runes API
 */
export class RuneClient {
  // Make these public for testing
  public baseUrl: string;
  public mockData: boolean;
  private requestCount: number = 0;
  private maxRequests: number = 10; // Maximum number of requests per session
  private retryCount: number = 0;
  private maxRetries: number = 3;

  /**
   * Create a new RuneClient
   * @param config Configuration options
   */
  constructor(config: RuneClientConfig) {
    this.baseUrl = config.baseUrl;
    this.mockData = config.mockData ?? false; // Use nullish coalescing to handle undefined
  }

  /**
   * Check if the runes API is available
   * @returns True if connected
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      if (this.mockData) {
        return true;
      }
      const response = await axios.get(`${this.baseUrl}/status`);
      return response.data.status === 'ok';
    } catch (error) {
      console.error('Error checking API connectivity', error);
      return false;
    }
  }

  /**
   * Get information about a specific rune
   */
  async getRuneInfo(runeId: string) {
    // Use cached data if available and recent
    const now = Date.now();
    if (cachedRuneInfo && now - cacheTimestamp < CACHE_DURATION) {
      return cachedRuneInfo;
    }

    // Use mock data if configured or if we've exceeded our request limit
    if (this.mockData || this.requestCount >= this.maxRequests) {
      console.log('Using mock rune data');
      cachedRuneInfo = MOCK_RUNE_DATA;
      cacheTimestamp = now;
      return MOCK_RUNE_DATA;
    }

    try {
      this.requestCount++;
      
      // Add retry mechanism with exponential backoff
      const makeRequest = async (attempt: number): Promise<any> => {
        try {
          const response = await axios.get(`${this.baseUrl}/runes/${runeId}`, {
            timeout: 5000 // 5 second timeout
          });
          
          if (response.data) {
            // Cache the response
            cachedRuneInfo = response.data;
            cacheTimestamp = now;
            return response.data;
          }
          throw new Error('Invalid response format');
        } catch (error) {
          if (attempt < this.maxRetries) {
            // Exponential backoff: wait 2^attempt * 100ms
            const delay = Math.pow(2, attempt) * 100;
            await new Promise(resolve => setTimeout(resolve, delay));
            return makeRequest(attempt + 1);
          }
          throw error;
        }
      };
      
      return await makeRequest(0);
    } catch (error) {
      console.error('Error getting info for rune', runeId, error);
      
      // Fallback to mock data on error
      cachedRuneInfo = MOCK_RUNE_DATA;
      cacheTimestamp = now;
      return MOCK_RUNE_DATA;
    }
  }

  /**
   * Get distribution statistics for a rune
   */
  async getDistributionStats(runeId: string) {
    // Use cached data if available and recent
    const now = Date.now();
    if (cachedDistributionStats && now - cacheTimestamp < CACHE_DURATION) {
      return cachedDistributionStats;
    }

    // Use mock data if configured or if we've exceeded our request limit
    if (this.mockData || this.requestCount >= this.maxRequests) {
      console.log('Using mock distribution stats');
      cachedDistributionStats = MOCK_DISTRIBUTION_STATS;
      cacheTimestamp = now;
      return MOCK_DISTRIBUTION_STATS;
    }

    try {
      this.requestCount++;
      
      // Add retry mechanism with exponential backoff
      const makeRequest = async (attempt: number): Promise<any> => {
        try {
          const response = await axios.get(`${this.baseUrl}/runes/${runeId}/distribution`, {
            timeout: 5000 // 5 second timeout
          });
          
          if (response.data) {
            // Cache the response
            cachedDistributionStats = response.data;
            cacheTimestamp = now;
            return response.data;
          }
          throw new Error('Invalid response format');
        } catch (error) {
          if (attempt < this.maxRetries) {
            // Exponential backoff: wait 2^attempt * 100ms
            const delay = Math.pow(2, attempt) * 100;
            await new Promise(resolve => setTimeout(resolve, delay));
            return makeRequest(attempt + 1);
          }
          throw error;
        }
      };
      
      return await makeRequest(0);
    } catch (error) {
      console.error('Error getting distribution stats for rune', runeId, error);
      
      // Fallback to mock data on error
      cachedDistributionStats = MOCK_DISTRIBUTION_STATS;
      cacheTimestamp = now;
      return MOCK_DISTRIBUTION_STATS;
    }
  }

  /**
   * Generate mock rune balances data
   * @param runeId Rune ID to generate data for
   * @returns Mock balances data
   */
  private generateMockBalances(runeId: string): RuneBalance[] {
    return [
      {
        address: OVT_RUNE.treasuryAddress,
        amount: 0, // Treasury has transferred all funds to LP
        isTreasury: true,
        isLP: false
      },
      {
        address: OVT_RUNE.lpAddress,
        amount: 2100000, // Total amount sent to LP
        isTreasury: false,
        isLP: true
      }
    ];
  }

  /**
   * Generate mock rune distribution stats
   * @param runeId Rune ID to generate data for
   * @returns Mock distribution stats
   */
  private generateMockDistribution(runeId: string): DistributionStats {
    return {
      totalSupply: 2100000,
      treasuryHeld: 0, // Treasury has transferred funds to LP
      lpHeld: 2100000, // Total amount in LP wallet
      distributed: 2100000, // All tokens are now distributed
      percentDistributed: 100, // 100% distributed
      percentInLP: 100, // 100% of tokens are in LP wallet
      treasuryAddresses: [OVT_RUNE.treasuryAddress],
      lpAddresses: [OVT_RUNE.lpAddress],
      distributionEvents: [
        {
          txid: 'lpallocation1',
          amount: 2100000,
          timestamp: Date.now() - 259200000, // 3 days ago
          recipient: OVT_RUNE.lpAddress,
          type: 'lp_allocation'
        }
      ]
    };
  }

  /**
   * Generate mock LP info
   * @param runeId Rune ID to generate data for
   * @returns Mock LP info
   */
  private generateMockLPInfo(runeId: string): LPInfo {
    return {
      address: OVT_RUNE.lpAddress,
      liquidity: {
        ovt: 2100000,
        btcSats: 52500000, // 0.525 BTC
        impactMultiplier: 0.00001 // Price impact per OVT
      },
      pricing: {
        currentPriceSats: 250, // 250 sats per OVT
        lastTradeTime: Date.now() - 3600000, // 1 hour ago
        dailyVolume: 15000, // 15k OVT
        weeklyVolume: 45000 // 45k OVT
      },
      transactions: [
        {
          txid: 'mock_trade_1',
          type: 'buy',
          amount: 5000,
          priceSats: 245,
          timestamp: Date.now() - 3600000 // 1 hour ago
        },
        {
          txid: 'mock_trade_2',
          type: 'sell',
          amount: 2500,
          priceSats: 252,
          timestamp: Date.now() - 7200000 // 2 hours ago
        },
        {
          txid: 'mock_trade_3',
          type: 'buy',
          amount: 7500,
          priceSats: 248,
          timestamp: Date.now() - 14400000 // 4 hours ago
        }
      ]
    };
  }

  /**
   * Get balances for a specific rune
   * @param runeId ID of the rune to get balances for
   * @returns List of balances
   */
  async getRuneBalances(runeId: string = OVT_RUNE.id): Promise<RuneBalance[]> {
    try {
      if (this.mockData) {
        return this.generateMockBalances(runeId);
      }
      const response = await axios.get(`${this.baseUrl}/rune/${runeId}/balances`);
      return response.data.balances;
    } catch (error) {
      console.error(`Error getting balances for rune ${runeId}`, error);
      throw error;
    }
  }

  /**
   * Get LP information for a specific rune
   * @param runeId ID of the rune to get LP info for
   * @returns LP information
   */
  async getLPInfo(runeId: string = OVT_RUNE.id): Promise<LPInfo> {
    try {
      if (this.mockData) {
        return this.generateMockLPInfo(runeId);
      }
      const response = await axios.get(`${this.baseUrl}/rune/${runeId}/lp-info`);
      return response.data.lpInfo;
    } catch (error) {
      console.error(`Error getting LP info for rune ${runeId}`, error);
      throw error;
    }
  }

  /**
   * Calculate the number of PSBTs needed for a specific amount
   * @param amount Amount of tokens to distribute
   * @param recipientCount Number of recipients
   * @returns Number of PSBTs needed
   */
  calculatePSBTCount(amount: number, recipientCount: number): number {
    // Assuming each PSBT can handle up to 20 distribution transactions
    const transactionsPerPSBT = 20;
    return Math.ceil(recipientCount / transactionsPerPSBT);
  }

  /**
   * Estimate the testnet BTC needed for distribution
   * @param amount Amount of tokens to distribute
   * @param recipientCount Number of recipients
   * @returns Estimated testnet BTC needed in satoshis
   */
  estimateTestnetBTCNeeded(amount: number, recipientCount: number): number {
    // Assuming average fee of 1000 sats per transaction
    const avgFeePerTx = 1000;
    // Dust limit for change outputs
    const dustLimit = 546;
    
    // Calculate base requirements
    const baseFees = recipientCount * avgFeePerTx;
    const dustOutputs = recipientCount * dustLimit;
    
    // Add buffer for network fees and variance
    const buffer = baseFees * 0.2;
    
    return Math.ceil(baseFees + dustOutputs + buffer);
  }

  /**
   * Prepare PSBTs for rune distribution from the LP wallet
   * This also tracks the amount being prepared for distribution
   */
  async prepareLPDistributionPSBTs(amount: number): Promise<string[]> {
    // Use mock data if configured
    if (this.mockData) {
      console.log(`Preparing mock PSBTs for ${amount} tokens`);
      
      // Update the mock distribution stats to track this distribution
      const now = Date.now();
      
      // Update cached stats if they exist
      if (cachedDistributionStats) {
        cachedDistributionStats.distributed += amount;
        cachedDistributionStats.lpHeld -= amount;
        cachedDistributionStats.percentDistributed = Math.floor((cachedDistributionStats.distributed / cachedDistributionStats.totalSupply) * 100);
        cachedDistributionStats.percentInLP = Math.floor((cachedDistributionStats.lpHeld / cachedDistributionStats.totalSupply) * 100);
        
        // Add a new distribution event
        cachedDistributionStats.distributionEvents.push({
          timestamp: now,
          amount: amount,
          recipient: 'multiple-recipients',
          txid: `mock-psbt-${now.toString(16)}`,
          type: 'user_distribution'
        });
      }
      
      // Mock PSBTs with fake IDs
      const mockPsbtCount = this.calculatePSBTCount(amount, 10); // Assume 10 recipients
      return Array.from({ length: mockPsbtCount }, (_, i) => `mock-psbt-${now.toString(16)}-${i}`);
    }
    
    try {
      // In a real implementation, this would call the API to create PSBTs
      // and track the amount being distributed
      console.error('Real PSBT creation not implemented');
      throw new Error('Real PSBT creation not implemented yet');
    } catch (error) {
      console.error('Error preparing LP distribution PSBTs:', error);
      throw error;
    }
  }

  /**
   * Execute a PSBT for LP distribution
   * @param psbt The PSBT string to execute
   * @returns Transaction ID
   */
  async executeLPDistributionPSBT(psbt: string): Promise<string> {
    if (this.mockData) {
      return 'mock_txid_' + Date.now();
    }
    try {
      const response = await axios.post(`${this.baseUrl}/rune/${OVT_RUNE.id}/lp/execute`, { 
        psbt 
      });
      return response.data.txid;
    } catch (error) {
      console.error('Error executing LP distribution PSBT', error);
      throw error;
    }
  }

  /**
   * Calculate the price impact of a trade
   * @param amount Amount of OVT being traded
   * @param isBuy true if buying OVT, false if selling
   * @returns Price impact as a percentage (e.g., 0.05 for 5%)
   */
  async estimatePriceImpact(amount: number, isBuy: boolean): Promise<number> {
    if (this.mockData) {
      // Simple mock implementation based on square root function for realistic impact curve
      // Small trades have minimal impact, large trades have increasing impact
      const lpInfo = this.generateMockLPInfo(OVT_RUNE.id);
      const { ovt, btcSats, impactMultiplier } = lpInfo.liquidity;
      
      // Base impact calculation using mock data
      // The formula approximates AMM bonding curve behavior
      let impact = Math.sqrt(amount / ovt) * impactMultiplier * 100;
      
      // Buy impacts are slightly higher than sell impacts
      if (isBuy) {
        impact *= 1.2; // 20% higher impact for buys due to slippage
      }
      
      return Math.min(impact, 0.5); // Cap at 50% for mock data
    }
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/rune/${OVT_RUNE.id}/price-impact?amount=${amount}&isBuy=${isBuy}`
      );
      return response.data.impact;
    } catch (error) {
      console.error('Error calculating price impact', error);
      throw error;
    }
  }

  /**
   * Calculates the circulating supply based on PSBTs created from the LP wallet
   * This tracks tokens that have been sent for distribution from the LP wallet
   */
  async getCirculatingSupply(runeId: string = OVT_RUNE.id): Promise<number> {
    // Use cached distribution stats if available
    const now = Date.now();
    if (cachedDistributionStats && now - cacheTimestamp < CACHE_DURATION) {
      return cachedDistributionStats.distributed;
    }
    
    // Use mock data when configured
    if (this.mockData || this.requestCount >= this.maxRequests) {
      return OVT_FALLBACK_DISTRIBUTED; // Return the fallback value for first TGE
    }
    
    try {
      this.requestCount++;
      
      // Try to get real distribution data
      // This would typically come from tracking PSBTs and transfers from LP wallet
      // But for now we'll use the mock data as fallback
      const distributionStats = await this.getDistributionStats(runeId);
      
      // Return the distributed amount or fallback to 1M
      // This ensures we have a reasonable value even if the API fails
      return distributionStats.distributed || OVT_FALLBACK_DISTRIBUTED;
    } catch (error) {
      console.error('Error getting circulating supply', error);
      return OVT_FALLBACK_DISTRIBUTED; // Return the fallback value on error
    }
  }
} 