// Use TypeScript import syntax to avoid scope issues
import * as fs from 'fs';
import * as path from 'path';

// Constants
const INITIAL_SUPPLY = 500000; // 500k OVT tokens
const TOKEN_PRICE_USD = 1; // $1 per token
const SATS_PER_BTC = 100000000;
const MOCK_DATA_DIR = path.join(__dirname, '..', 'src', 'mock-data');
const POSITIONS_FILE = path.join(MOCK_DATA_DIR, 'portfolio-positions.json');
const TOKEN_DATA_FILE = path.join(MOCK_DATA_DIR, 'token-data.json');

// Current BTC price in USD (this would normally come from an API)
const BTC_PRICE_USD = 95000; // Example current BTC price

async function mintInitialOVT() {
  try {
    // Calculate token values in sats
    const satsPerUSD = SATS_PER_BTC / BTC_PRICE_USD;
    const totalValueSats = Math.floor(INITIAL_SUPPLY * TOKEN_PRICE_USD * satsPerUSD);
    
    console.log('Minting initial OVT tokens:');
    console.log(`Supply: ${INITIAL_SUPPLY} OVT`);
    console.log(`Price per token: $${TOKEN_PRICE_USD}`);
    console.log(`Total value in sats: ${totalValueSats}`);
    console.log(`Total value in BTC: ${totalValueSats / SATS_PER_BTC}`);
    console.log(`Total value in USD: $${INITIAL_SUPPLY * TOKEN_PRICE_USD}`);

    // Create mock-data directory if it doesn't exist
    if (!fs.existsSync(MOCK_DATA_DIR)) {
      fs.mkdirSync(MOCK_DATA_DIR, { recursive: true });
    }

    // Create token data entry
    const tokenData = {
      totalSupply: INITIAL_SUPPLY,
      pricePerToken: Math.floor(satsPerUSD), // Price per token in sats
      mintTimestamp: Date.now(),
      transactions: [{
        txid: `mint_${Date.now()}`,
        type: 'mint',
        amount: INITIAL_SUPPLY,
        timestamp: Date.now(),
        status: 'confirmed',
        details: {
          reason: 'Initial OVT token mint'
        }
      }]
    };

    // Save token data
    fs.writeFileSync(TOKEN_DATA_FILE, JSON.stringify(tokenData, null, 2));
    console.log('Saved token data to:', TOKEN_DATA_FILE);

  } catch (error) {
    console.error('Error minting initial OVT:', error);
    process.exit(1);
  }
}

// Run the script
mintInitialOVT(); 
