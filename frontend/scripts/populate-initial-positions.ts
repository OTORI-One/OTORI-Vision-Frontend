// Mock implementation of the OVT client for the script
const fs = require('fs');
const path = require('path');

interface Portfolio {
  name: string;
  value: number;      // in sats
  current: number;    // in sats
  change: number;     // percentage
  description: string;
  transactionId?: string;
  tokenAmount: number;
  pricePerToken: number;
}

// In-memory storage for positions
let portfolioPositions: Portfolio[] = [];

// Mock client implementation
const mockClient = {
  addPosition: async (position: Omit<Portfolio, 'current' | 'change'>) => {
    const newPosition: Portfolio = {
      ...position,
      current: position.value, // Initially, current value equals initial value
      change: 0
    };
    portfolioPositions.push(newPosition);
    return newPosition;
  },
  getPositions: () => portfolioPositions,
  formatValue: (sats: number, mode: 'btc' | 'usd' = 'btc') => {
    if (sats >= 10000000) {
      return `₿${(sats / 100000000).toFixed(2)}`;
    }
    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(1)}M sats`;
    }
    if (sats >= 1000) {
      return `${(sats / 1000).toFixed(0)}k sats`;
    }
    return `${sats} sats`;
  }
};

// Initial portfolio data with transaction IDs
const INITIAL_PORTFOLIO_ITEMS: any[] = [
  {
    name: 'Polymorphic Labs',
    value: 150000000,      // 1.5 BTC initial investment
    description: 'Encryption Layer',
    transactionId: 'position_entry_polymorphic_' + Date.now(),
    tokenAmount: 500000,  // 500k tokens
    pricePerToken: 300,     // 300 sat per token
  },
  {
    name: 'VoltFi',
    value: 87500000,      // 0.875 BTC initial investment
    description: 'Bitcoin Volatility Index on Bitcoin',
    transactionId: 'position_entry_voltfi_' + Date.now(),
    tokenAmount: 350000,  // 350k tokens
    pricePerToken: 250,     // 250 sat per token
  },
  {
    name: 'MIXDTape',
    value: 100000000,      // 1 BTC initial investment
    description: 'Phygital Music for superfans - disrupting Streaming',
    transactionId: 'position_entry_mixdtape_' + Date.now(),
    tokenAmount: 500000,  // 500k tokens
    pricePerToken: 200,     // 200 sat per token
  },
  {
    name: 'OrdinalHive',
    value: 294000000,
    description: 'The Bitcoin asset aggregator from OGs for OGs',
    transactionId: 'position_entry_ordinalhive_' + Date.now(),
    tokenAmount: 500000,
    pricePerToken: 420,
    change: 0
  }
];

// Function to populate positions
async function populatePositions() {
  console.log('Starting to populate initial positions...');

  // Clear existing positions
  portfolioPositions = [];
  console.log('Cleared existing positions');

  for (const position of INITIAL_PORTFOLIO_ITEMS) {
    try {
      const newPosition = await mockClient.addPosition(position);
      console.log(`✅ Added position: ${position.name}`);
      console.log(`   Initial value: ${mockClient.formatValue(position.value)}`);
      console.log(`   Current value: ${mockClient.formatValue(newPosition.current)}`);
      console.log(`   Token amount: ${position.tokenAmount}`);
      console.log(`   Price per token: ${mockClient.formatValue(position.pricePerToken)}`);
      console.log('---');
    } catch (err) {
      console.error(`❌ Failed to add position ${position.name}:`, err);
    }
  }

  // Save positions to a JSON file
  const mockDataDir = path.join(__dirname, '..', 'src', 'mock-data');
  if (!fs.existsSync(mockDataDir)) {
    fs.mkdirSync(mockDataDir, { recursive: true });
  }

  const mockDataPath = path.join(mockDataDir, 'portfolio-positions.json');
  
  // Remove existing file if it exists
  if (fs.existsSync(mockDataPath)) {
    fs.unlinkSync(mockDataPath);
    console.log('Removed existing portfolio-positions.json file');
  }

  // Write new data
  fs.writeFileSync(mockDataPath, JSON.stringify(portfolioPositions, null, 2));
  console.log(`\nSaved portfolio positions to: ${mockDataPath}`);

  // Display final portfolio state
  console.log('\nFinal Portfolio State:');
  console.log(JSON.stringify(portfolioPositions, null, 2));
}

// Run the script
populatePositions().catch(console.error);

// Add this at the end of the file to make it a module
export {}; 