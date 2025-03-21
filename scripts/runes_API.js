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
  // For now, we'll return simulated balances
  const balances = [
    {
      address: OVT_TREASURY_ADDRESS,
      amount: 1890000, // 90% of total supply
      isTreasury: true
    },
    {
      address: 'tb1pexampleaddress1',
      amount: 105000, // 5% of total supply
      isTreasury: false
    },
    {
      address: 'tb1pexampleaddress2',
      amount: 105000, // 5% of total supply
      isTreasury: false
    }
  ];
  
  res.json({ success: true, balances });
});

// Endpoint to get distribution stats for a rune
app.get('/rune/:id/distribution', (req, res) => {
  const runeId = req.params.id || OVT_RUNE_ID;
  
  // In a production environment, this would calculate from the actual balances
  // For now, we'll return simulated distribution stats
  const distributionStats = {
    totalSupply: 2100000,
    treasuryHeld: 1890000,
    distributed: 210000,
    percentDistributed: 10,
    treasuryAddresses: [OVT_TREASURY_ADDRESS],
    distributionEvents: [
      {
        txid: 'mockdistribution1',
        amount: 105000,
        timestamp: Date.now() - 86400000, // Yesterday
        recipient: 'tb1pexampleaddress1'
      },
      {
        txid: 'mockdistribution2',
        amount: 105000,
        timestamp: Date.now() - 172800000, // 2 days ago
        recipient: 'tb1pexampleaddress2'
      }
    ]
  };
  
  res.json({ success: true, distributionStats });
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