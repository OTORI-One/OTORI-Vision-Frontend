export const OVT_RUNE = {
  id: '240249:101',
  symbol: 'OVT'
};

interface Transaction {
  txid: string;
  type: string;
  amount: number;
  price: number;
  timestamp: number;
  status: string;
}

// Advanced price impact calculation based on the real backend implementation
const calculatePriceImpact = (lpBalance: number, btcSats: number, amount: number, isBuy: boolean): number => {
  try {
    // Base liquidity parameters
    const liquidityOVT = lpBalance || 2000000; // Default if no liquidity data
    const liquidityBTC = btcSats || 140000000; // Default to ~1.4 BTC in sats
    
    // Price impact is inversely proportional to liquidity depth
    // Higher numbers mean more price impact per trade
    if (liquidityOVT <= 0 || liquidityBTC <= 0) {
      return isBuy ? 1.1 : 0.9; // Max 10% impact if no liquidity
    }
    
    // Calculate the base price from the liquidity pool
    const basePrice = liquidityBTC / liquidityOVT;
    
    // Calculate impact based on trade size relative to liquidity
    // Uses a square root formula to create a curve that increases with trade size
    const impactPercentage = Math.min(
      Math.sqrt(amount / liquidityOVT) * 0.1, // Maximum 10% impact
      0.1
    );
    
    // Apply impact direction based on buy/sell
    return isBuy 
      ? basePrice * (1 + impactPercentage)  // Buy price goes up
      : basePrice * (1 - impactPercentage); // Sell price goes down
  } catch (error) {
    console.error('Error calculating price impact:', error);
    return isBuy ? 750 : 650; // Default fallback values
  }
};

// Mock data for tests
const mockRuneInfo = {
  id: '240249:101',
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
  symbol: 'OVT'
};

const mockRuneBalances = [
  { address: 'treasury-address', amount: 2000000, isDistributed: false },
  { address: 'user1-address', amount: 50000, isDistributed: true },
  { address: 'user2-address', amount: 50000, isDistributed: true }
];

const mockDistributionStats = {
  totalSupply: 2100000,
  distributed: 100000,
  treasuryHeld: 2000000,
  percentDistributed: 4.76,
  distributionEvents: [
    {
      amount: 50000,
      recipient: 'user1-address',
      timestamp: 1677721600,
      txid: 'tx1'
    },
    {
      amount: 50000,
      recipient: 'user2-address',
      timestamp: 1677721700,
      txid: 'tx2'
    }
  ]
};

const mockLPInfo = {
  totalLiquidity: 50000000,
  pricePerToken: 700,
  poolAddress: 'pool-address',
  liquidity: {
    ovt: 2000000,
    btcSats: 140000000,
    impactMultiplier: 0.002,
    liquidityScore: "500.00"
  },
  pricing: {
    currentPriceSats: 700,
    lastTradeTime: Date.now() - 3600000, // 1 hour ago
    dailyVolume: 150000,
    weeklyVolume: 750000,
    estimatedPriceImpact: {
      small: "0.0020", // Impact for 1k OVT trade
      medium: "0.0200", // Impact for 10k OVT trade
      large: "0.2000"  // Impact for 100k OVT trade
    }
  },
  liquidityProviders: [
    {
      address: 'lp1-address',
      contribution: 30000000
    },
    {
      address: 'lp2-address',
      contribution: 20000000
    }
  ]
};

const mockTransactionHistory = [
  {
    txid: 'tx1',
    type: 'buy',
    amount: 1000,
    price: 680,
    timestamp: 1677721600,
    status: 'confirmed'
  },
  {
    txid: 'tx2',
    type: 'sell',
    amount: 500,
    price: 690,
    timestamp: 1677721700,
    status: 'confirmed'
  },
  {
    txid: 'tx3',
    type: 'buy',
    amount: 2000,
    price: 695,
    timestamp: 1677721800,
    status: 'confirmed'
  }
];

export class RuneClient {
  private baseUrl: string;
  private mockData: boolean;

  constructor(config: { baseUrl: string; mockData: boolean }) {
    this.baseUrl = config.baseUrl;
    this.mockData = true; // Always use mock data in tests
  }

  async checkConnectivity(): Promise<boolean> {
    return true;
  }

  async getRuneInfo(runeId: string = OVT_RUNE.id): Promise<any> {
    return mockRuneInfo;
  }

  async getRuneBalances(runeId: string = OVT_RUNE.id): Promise<any[]> {
    return mockRuneBalances;
  }

  async getDistributionStats(runeId: string = OVT_RUNE.id): Promise<any> {
    return mockDistributionStats;
  }

  async getLPInfo(runeId: string = OVT_RUNE.id): Promise<any> {
    return mockLPInfo;
  }

  async getTransactionHistory(runeId: string = OVT_RUNE.id): Promise<Transaction[]> {
    return mockTransactionHistory;
  }

  async getTransactionInfo(txid: string): Promise<Transaction> {
    return mockTransactionHistory.find((tx: Transaction) => tx.txid === txid) || 
      {
        txid,
        type: 'buy',
        amount: 1000,
        price: 700,
        timestamp: Date.now(),
        status: 'confirmed'
      };
  }

  // Real price impact calculation based on liquidity depth
  async estimatePriceImpact(amount: number, isBuy: boolean): Promise<number> {
    // Use the LP info to calculate price impact
    const lpInfo = await this.getLPInfo();
    return calculatePriceImpact(
      lpInfo.liquidity.ovt,
      lpInfo.liquidity.btcSats,
      amount,
      isBuy
    );
  }
}

export default RuneClient; 