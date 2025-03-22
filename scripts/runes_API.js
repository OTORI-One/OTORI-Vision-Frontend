// Simple Express server on your ord Pi
const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

// OVT rune constants
const OVT_RUNE_ID = '240249:101';
const OVT_RUNE_SYMBOL = 'OTORI•VISION•TOKEN';
const OVT_TREASURY_ADDRESS = 'tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd';
// LP Wallet address - this will be used to track liquidity
const LP_ADDRESS = 'tb1p3vn6wc0dlud3tvckv95datu3stq4qycz7vj9mzpclfkrv9rh8jqsjrw38f';

// Helper function to execute ord commands and handle errors
const execOrdCommand = (command) => {
  try {
    return { success: true, result: execSync(command).toString() };
  } catch (error) {
    console.error(`Error executing command: ${command}`, error);
    return { success: false, error: error.toString() };
  }
};

// Endpoint to etch a new rune
app.post('/etch-rune', (req, res) => {
  const { symbol, supply, decimals } = req.body;
  try {
    // Execute the ord command
    const result = execSync(`ord --signet wallet etch rune ${symbol} ${supply} --decimals ${decimals}`);
    res.json({ success: true, result: result.toString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.toString() });
  }
});

// Endpoint to mint more of an existing rune
app.post('/mint-rune', (req, res) => {
  const { id, amount } = req.body;
  try {
    const result = execSync(`ord --signet wallet mint rune ${id} ${amount}`);
    res.json({ success: true, result: result.toString() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.toString() });
  }
});

// Endpoint to get information about a rune
app.get('/rune/:id', (req, res) => {
  const runeId = req.params.id || OVT_RUNE_ID;
  
  const result = execOrdCommand(`ord --signet rune ${runeId}`);
  
  if (result.success) {
    res.json({ success: true, runeInfo: result.result });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// Endpoint to get balances for a rune
app.get('/rune/:id/balances', (req, res) => {
  const runeId = req.params.id || OVT_RUNE_ID;
  
  // In a production environment, this would use the ord balances command
  // For now, we'll return simulated balances with LP wallet
  const balances = [
    {
      address: OVT_TREASURY_ADDRESS,
      amount: 1680000, // 80% of total supply
      isTreasury: true,
      isLP: false
    },
    {
      address: LP_ADDRESS,
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
  
  res.json({ success: true, balances });
});

// Endpoint to get distribution stats for a rune
app.get('/rune/:id/distribution', (req, res) => {
  const runeId = req.params.id || OVT_RUNE_ID;
  
  // In a production environment, this would calculate from the actual balances
  // For now, we'll return simulated distribution stats including LP
  const distributionStats = {
    totalSupply: 2100000,
    treasuryHeld: 1680000, // 80%
    lpHeld: 210000, // 10%
    distributed: 210000, // 10% (excluding LP wallet)
    percentDistributed: 10,
    percentInLP: 10,
    treasuryAddresses: [OVT_TREASURY_ADDRESS],
    lpAddresses: [LP_ADDRESS],
    distributionEvents: [
      {
        txid: 'lpallocation1',
        amount: 210000,
        timestamp: Date.now() - 259200000, // 3 days ago
        recipient: LP_ADDRESS,
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
  
  res.json({ success: true, distributionStats });
});

// Add a new endpoint for LP specific information
app.get('/rune/:id/lp-info', (req, res) => {
  const runeId = req.params.id || OVT_RUNE_ID;
  
  // Calculate pricing info based on simulated liquidity
  const lpInfo = {
    address: LP_ADDRESS,
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
  
  res.json({ success: true, lpInfo });
});

// Endpoint to send tokens to an address (distribute)
app.post('/distribute', (req, res) => {
  const { recipient, amount } = req.body;
  
  if (!recipient || !amount) {
    return res.status(400).json({ success: false, error: 'Missing recipient or amount' });
  }
  
  // In a production environment, this would execute the actual ord command
  // For development, we'll simulate success
  res.json({ 
    success: true, 
    transaction: {
      txid: `mockdistribution_${Date.now()}`,
      amount,
      recipient,
      timestamp: Date.now()
    }
  });
});

// Endpoint to register a treasury address
app.post('/treasury-address', (req, res) => {
  const { address } = req.body;
  
  if (!address) {
    return res.status(400).json({ success: false, error: 'Missing address' });
  }
  
  // In a production environment, this would update a persistent config
  // For development, we'll simulate success
  res.json({ 
    success: true, 
    treasuryAddress: address,
    timestamp: Date.now()
  });
});

app.listen(3030, () => console.log('Rune API server running on port 3030'));