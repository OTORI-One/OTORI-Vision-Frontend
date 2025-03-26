// Simple Express server for OTORI Vision Token (OVT) runes management
const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

// OVT rune constants
const OVT_RUNE_ID = process.env.NEXT_PUBLIC_OVT_RUNE_ID || '240249:101';
const OVT_RUNE_SYMBOL = 'OTORI•VISION•TOKEN';
const OVT_TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || 'tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd';
const LP_ADDRESS = process.env.NEXT_PUBLIC_LP_ADDRESS || 'tb1p3vn6wc0dlud3tvckv95datu3stq4qycz7vj9mzpclfkrv9rh8jqsjrw38f';

// Enhanced helper function to execute ord commands with proper configuration
const execOrdCommand = (command) => {
  try {
    // Ensure all ord commands use the correct configuration
    const fullCommand = `ord --config ~/.ord/ord.yaml --signet ${command}`;
    console.log(`Executing: ${fullCommand}`);
    const result = execSync(fullCommand).toString();
    console.log(`Command result: ${result}`);
    return { success: true, result };
  } catch (error) {
    console.error(`Error executing command: ${command}`, error);
    return { success: false, error: error.toString() };
  }
};

// Helper function to parse rune balance output
const parseRuneBalances = (output) => {
  try {
    // Example output format:
    // address1: amount1 SYMBOL
    // address2: amount2 SYMBOL
    const balances = [];
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const [address, amountWithSymbol] = line.split(':').map(s => s.trim());
      if (address && amountWithSymbol) {
        const amount = parseInt(amountWithSymbol.split(' ')[0]);
        balances.push({
          address,
          amount,
          isTreasury: address === OVT_TREASURY_ADDRESS,
          isLP: address === LP_ADDRESS
        });
      }
    }
    return balances;
  } catch (error) {
    console.error('Error parsing rune balances:', error);
    return [];
  }
};

// Helper function to calculate distribution stats
const calculateDistributionStats = (balances) => {
  const totalSupply = balances.reduce((sum, b) => sum + b.amount, 0);
  const treasuryHeld = balances.find(b => b.isTreasury)?.amount || 0;
  const lpHeld = balances.find(b => b.isLP)?.amount || 0;
  const distributed = totalSupply - treasuryHeld;
  
  return {
    totalSupply,
    treasuryHeld,
    lpHeld,
    distributed,
    percentDistributed: (distributed / totalSupply * 100).toFixed(2),
    percentInLP: (lpHeld / totalSupply * 100).toFixed(2),
    treasuryAddresses: [OVT_TREASURY_ADDRESS],
    lpAddresses: [LP_ADDRESS]
  };
};

// Helper function to get transaction history
const getTransactionHistory = async (runeId) => {
  try {
    const result = execOrdCommand(`wallet transactions`);
    if (!result.success) return [];
    
    // Parse the transaction output and filter for rune transactions
    const transactions = result.result
      .split('\n')
      .filter(line => line.includes(runeId))
      .map(line => {
        // Parse transaction details
        const [txid, type, amount, timestamp] = line.split(' ');
        return {
          txid,
          type: type.toLowerCase(),
          amount: parseInt(amount),
          timestamp: new Date(timestamp).getTime()
        };
      });
    
    return transactions;
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return [];
  }
};

// Endpoint to get information about a rune
app.get('/rune/:id', (req, res) => {
  const runeId = req.params.id || OVT_RUNE_ID;
  const result = execOrdCommand(`rune ${runeId}`);
  
  if (result.success) {
    res.json({ success: true, runeInfo: result.result });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// Endpoint to get balances for a rune
app.get('/rune/:id/balances', async (req, res) => {
  const runeId = req.params.id || OVT_RUNE_ID;
  const result = execOrdCommand(`wallet balances`);
  
  if (result.success) {
    const balances = parseRuneBalances(result.result);
    res.json({ success: true, balances });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// Endpoint to get distribution stats for a rune
app.get('/rune/:id/distribution', async (req, res) => {
  const runeId = req.params.id || OVT_RUNE_ID;
  const result = execOrdCommand(`wallet balances`);
  
  if (result.success) {
    const balances = parseRuneBalances(result.result);
    const distributionStats = calculateDistributionStats(balances);
    const transactions = await getTransactionHistory(runeId);
    
    res.json({ 
      success: true, 
      distributionStats: {
        ...distributionStats,
        distributionEvents: transactions
      }
    });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// Helper function to calculate price impact multiplier based on liquidity depth
const calculatePriceImpact = (lpBalance, btcSats) => {
  try {
    // Price impact is inversely proportional to liquidity depth
    // The more liquidity (OVT tokens and BTC), the less impact a trade will have
    
    // Base formula: impact = 1 / (sqrt(lpBalance * btcSats))
    // We normalize it to keep the impact in a reasonable range (0.00001 - 0.01)
    // Higher numbers mean more price impact per trade
    
    if (!lpBalance || !btcSats || lpBalance <= 0 || btcSats <= 0) {
      return 0.01; // Maximum impact if no liquidity
    }
    
    const liquidityDepth = Math.sqrt(lpBalance * btcSats);
    const baseImpact = 1 / liquidityDepth;
    
    // Normalize to a reasonable range
    const normalizedImpact = Math.min(Math.max(baseImpact * 10000, 0.00001), 0.01);
    
    return normalizedImpact;
  } catch (error) {
    console.error('Error calculating price impact:', error);
    return 0.01; // Default to maximum impact on error
  }
};

// Add a new endpoint for LP specific information
app.get('/rune/:id/lp-info', async (req, res) => {
  const runeId = req.params.id || OVT_RUNE_ID;
  
  try {
    // Get LP balance
    const balanceResult = execOrdCommand(`wallet balances`);
    if (!balanceResult.success) throw new Error('Failed to get balances');
    
    const balances = parseRuneBalances(balanceResult.result);
    const lpBalance = balances.find(b => b.isLP)?.amount || 0;
    const btcSats = await getWalletBalance(LP_ADDRESS);
    
    // Get recent transactions for volume calculation
    const transactions = await getTransactionHistory(runeId);
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    // Calculate volumes
    const dailyVolume = transactions
      .filter(t => t.timestamp > oneDayAgo)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const weeklyVolume = transactions
      .filter(t => t.timestamp > sevenDaysAgo)
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Get last trade
    const lastTrade = transactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .find(t => t.type === 'buy' || t.type === 'sell');
    
    // Calculate price impact based on current liquidity
    const impactMultiplier = calculatePriceImpact(lpBalance, btcSats);
    
    const lpInfo = {
      address: LP_ADDRESS,
      liquidity: {
        ovt: lpBalance,
        btcSats,
        impactMultiplier,
        liquidityScore: (1 / impactMultiplier).toFixed(2) // Higher score means better liquidity
      },
      pricing: {
        currentPriceSats: lastTrade?.priceSats || 250, // Default if no trades
        lastTradeTime: lastTrade?.timestamp || now,
        dailyVolume,
        weeklyVolume,
        estimatedPriceImpact: {
          small: (impactMultiplier * 1000).toFixed(4), // Impact for 1k OVT trade
          medium: (impactMultiplier * 10000).toFixed(4), // Impact for 10k OVT trade
          large: (impactMultiplier * 100000).toFixed(4) // Impact for 100k OVT trade
        }
      },
      transactions: transactions.slice(0, 10) // Last 10 transactions
    };
    
    res.json({ success: true, lpInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.toString() });
  }
});

// Helper function to get wallet balance in sats
async function getWalletBalance(address) {
  try {
    const result = execOrdCommand(`wallet balance`);
    if (result.success) {
      // Parse the balance from BTC to sats
      const btcBalance = parseFloat(result.result);
      return Math.floor(btcBalance * 100000000);
    }
    return 0;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return 0;
  }
}

// Endpoint to send tokens to an address (distribute)
app.post('/distribute', (req, res) => {
  const { recipient, amount } = req.body;
  
  if (!recipient || !amount) {
    return res.status(400).json({ success: false, error: 'Missing recipient or amount' });
  }
  
  const result = execOrdCommand(`wallet send ${recipient} ${amount}${OVT_RUNE_ID}`);
  
  if (result.success) {
    res.json({ 
      success: true, 
      transaction: {
        txid: result.result.trim(),
        amount,
        recipient,
        timestamp: Date.now()
      }
    });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

app.listen(3030, () => console.log('Rune API server running on port 3030'));