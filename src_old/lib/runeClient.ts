import axios from 'axios';

// Constants for the OVT rune
export const OVT_RUNE_ID = '240249:101';
export const OVT_RUNE_SYMBOL = 'OTORI•VISION•TOKEN';
export const OVT_RUNE_DECIMALS = 2;
export const OVT_TOTAL_SUPPLY = 2100000; // 2.1M tokens with 2 decimal places
export const OVT_TREASURY_ADDRESS = 'tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd';
export const OVT_TRANSACTION_ID = 'e75ce796378927a5c152e8ee469c4ca3cf19a921f1e444fb88a22aaf035782fb';

// OVT Rune constant
export const OVT_RUNE = {
  id: '240249:101',
  symbol: 'OTORI•VISION•TOKEN',
  treasuryAddress: 'tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd',
  lpAddress: 'tb1p3vn6wc0dlud3tvckv95datu3stq4qycz7vj9mzpclfkrv9rh8jqsjrw38f', // LP wallet address
};

export interface RuneClientConfig {
  baseUrl: string;
  mockData: boolean;
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
  private baseUrl: string;
  private mockData: boolean;

  /**
   * Create a new RuneClient
   * @param config Configuration options
   */
  constructor(config: RuneClientConfig) {
    this.baseUrl = config.baseUrl;
    this.mockData = config.mockData;
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
   * Generate mock rune balances data
   * @param runeId Rune ID to generate data for
   * @returns Mock balances data
   */
  private generateMockBalances(runeId: string): RuneBalance[] {
    return [
      {
        address: OVT_RUNE.treasuryAddress,
        amount: 1680000, // 80% of total supply
        isTreasury: true,
        isLP: false
      },
      {
        address: OVT_RUNE.lpAddress,
        amount: 210000, // 10% of total supply
        isTreasury: false,
        isLP: true
      },
      {
        address: 'tb1pexampleaddress1',
        amount: 105000, // 5% of total supply
        isTreasury: false,
        isLP: false
      },
      {
        address: 'tb1pexampleaddress2',
        amount: 105000, // 5% of total supply
        isTreasury: false,
        isLP: false
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
      treasuryHeld: 1680000, // 80%
      lpHeld: 210000, // 10%
      distributed: 210000, // 10% (excluding LP wallet)
      percentDistributed: 10,
      percentInLP: 10,
      treasuryAddresses: [OVT_RUNE.treasuryAddress],
      lpAddresses: [OVT_RUNE.lpAddress],
      distributionEvents: [
        {
          txid: 'lpallocation1',
          amount: 210000,
          timestamp: Date.now() - 259200000, // 3 days ago
          recipient: OVT_RUNE.lpAddress,
          type: 'lp_allocation'
        },
        {
          txid: 'mockdistribution1',
          amount: 105000,
          timestamp: Date.now() - 86400000, // Yesterday
          recipient: 'tb1pexampleaddress1',
          type: 'user_distribution'
        },
        {
          txid: 'mockdistribution2',
          amount: 105000,
          timestamp: Date.now() - 172800000, // 2 days ago
          recipient: 'tb1pexampleaddress2',
          type: 'user_distribution'
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
        ovt: 210000,
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
   * Get info for a specific rune
   * @param runeId ID of the rune to get info for
   * @returns Rune info
   */
  async getRuneInfo(runeId: string = OVT_RUNE.id): Promise<RuneInfo> {
    try {
      if (this.mockData) {
        return {
          id: runeId,
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
          symbol: OVT_RUNE.symbol
        };
      }
      const response = await axios.get(`${this.baseUrl}/rune/${runeId}`);
      return response.data.rune;
    } catch (error) {
      console.error(`Error getting info for rune ${runeId}`, error);
      throw error;
    }
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
   * Get distribution statistics for a specific rune
   * @param runeId ID of the rune to get distribution stats for
   * @returns Distribution statistics
   */
  async getDistributionStats(runeId: string = OVT_RUNE.id): Promise<DistributionStats> {
    try {
      if (this.mockData) {
        return this.generateMockDistribution(runeId);
      }
      const response = await axios.get(`${this.baseUrl}/rune/${runeId}/distribution`);
      return response.data.distributionStats;
    } catch (error) {
      console.error(`Error getting distribution stats for rune ${runeId}`, error);
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
   * Prepare PSBTs for distributing tokens to LP wallet
   * @param amount Amount of tokens to distribute
   * @returns Array of PSBT strings
   */
  async prepareLPDistributionPSBTs(amount: number): Promise<string[]> {
    try {
      if (this.mockData) {
        // Mock PSBT generation
        return ['mockPSBT1', 'mockPSBT2'];
      }
      const response = await axios.post(`${this.baseUrl}/rune/prepare-lp-distribution`, {
        runeId: OVT_RUNE.id,
        amount,
        lpAddress: OVT_RUNE.lpAddress
      });
      return response.data.psbts;
    } catch (error) {
      console.error(`Error preparing LP distribution PSBTs`, error);
      throw error;
    }
  }

  /**
   * Execute a PSBT for LP distribution
   * @param psbt The PSBT string to execute
   * @returns Transaction ID
   */
  async executeLPDistributionPSBT(psbt: string): Promise<string> {
    try {
      if (this.mockData) {
        // Mock transaction ID
        return 'mock_txid_' + Math.random().toString(36).substring(2, 15);
      }
      const response = await axios.post(`${this.baseUrl}/rune/execute-psbt`, {
        psbt
      });
      return response.data.txid;
    } catch (error) {
      console.error(`Error executing LP distribution PSBT`, error);
      throw error;
    }
  }
} 