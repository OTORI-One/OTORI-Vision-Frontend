// Mock data for rune API endpoints

export const mockRuneInfo = {
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

export const mockRuneBalances = [
  { address: 'treasury-address', amount: 2000000, isDistributed: false },
  { address: 'user1-address', amount: 50000, isDistributed: true },
  { address: 'user2-address', amount: 50000, isDistributed: true }
];

export const mockDistributionStats = {
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

export const mockLPInfo = {
  totalLiquidity: 50000000,
  pricePerToken: 700,
  priceImpact: {
    buy: {
      small: 1.005,  // 0.5% for small trades
      medium: 1.02,   // 2% for medium trades
      large: 1.08     // 8% for large trades
    },
    sell: {
      small: 0.995,   // 0.5% for small trades
      medium: 0.98,   // 2% for medium trades
      large: 0.92     // 8% for large trades
    }
  },
  poolAddress: 'pool-address',
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

// Mock data for transaction endpoints
export const mockTransactionHistory = [
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