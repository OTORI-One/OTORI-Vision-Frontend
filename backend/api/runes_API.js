// Simple Express server for OTORI Vision Token (OVT) runes management
const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

// Add CORS support
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});



// OVT rune constants
const OVT_RUNE_ID = process.env.NEXT_PUBLIC_OVT_RUNE_ID || '240249:101';
const OVT_RUNE_SYMBOL = 'OTORI•VISION•TOKEN';
const OVT_TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || 'tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd';
const LP_ADDRESS = process.env.NEXT_PUBLIC_LP_ADDRESS || 'tb1p3vn6wc0dlud3tvckv95datu3stq4qycz7vj9mzpclfkrv9rh8jqsjrw38f';

// Import util.promisify for exec
const util = require('util');
const { exec } = require('child_process');
const execAsync = util.promisify(exec);

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
    // Based on the actual ord wallet balance output format
    console.log(`Parsing balance output: ${output}`);
    
    // Simple case: if there are no runes, return empty array
    if (!output.includes(OVT_RUNE_ID)) {
      return [];
    }
    
    // Extract rune balances from the output
    const balances = [];
    const lines = output.split('\n').filter(line => line.trim() && line.includes(OVT_RUNE_ID));
    
    for (const line of lines) {
      // Based on actual ord output format, try to extract amount
      const amount = parseInt(line.match(/(\d+)/)?.[0] || '0');
      
      // For now, assume all balance belongs to treasury
      // In a real implementation, we'd need to determine the actual address
      balances.push({
        address: OVT_TREASURY_ADDRESS,
        amount,
        isTreasury: true,
        isLP: false
      });
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
    // Use the correct command for wallet transactions
    const result = execOrdCommand(`wallet transactions`);
    if (!result.success) return [];
    
    // Parse the transaction output and filter for rune transactions
    const transactions = result.result
      .split('\n')
      .filter(line => line.includes(runeId))
      .map(line => {
        // Assuming format based on actual ord wallet transactions output
        // Adjust parsing logic based on actual output format
        const parts = line.split(/\s+/).filter(Boolean);
        if (parts.length < 3) return null;
        
        return {
          txid: parts[0],
          type: parts[1].toLowerCase(),
          amount: parseInt(parts[2]) || 0,
          timestamp: parts[3] ? new Date(parts[3]).getTime() : Date.now()
        };
      })
      .filter(Boolean);
    
    return transactions;
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return [];
  }
};

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

// Helper function to get wallet balance in sats
async function getWalletBalance(address) {
  try {
    // For wallet balance, we need to use bitcoin-cli instead of ord
    // This is a placeholder - in a real implementation, we would use:
    // const bitcoinCliCmd = `bitcoin-cli -signet -rpcwallet=ovt_runes_wallet getaddressbalance "${address}"`;
    // or with listunspent for more detailed data
    
    // For now, let's still use ord wallet balance but improve parsing
    const result = execOrdCommand(`wallet balance`);
    if (result.success) {
      // Parse the balance from BTC to sats
      // Assuming the balance is in BTC format (e.g., "0.00123456 BTC")
      const btcMatch = result.result.match(/([0-9.]+)\s*BTC/i);
      if (btcMatch) {
        const btcBalance = parseFloat(btcMatch[1]);
        return Math.floor(btcBalance * 100000000); // Convert BTC to sats
      }
      
      // Fallback to direct parsing if no "BTC" format is found
      const btcBalance = parseFloat(result.result);
      if (!isNaN(btcBalance)) {
        return Math.floor(btcBalance * 100000000);
      }
    }
    console.log("Could not parse wallet balance, returning 0");
    return 0;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return 0;
  }
}

// Home route documentation should be updated to reflect the new endpoints
app.get('/', (req, res) => {
  const endpoints = [
    {
      path: '/',
      method: 'GET',
      description: 'API documentation',
    },
    {
      path: '/health',
      method: 'GET',
      description: 'Check API health and dependencies',
    },
    {
      path: '/ovt/info',
      method: 'GET',
      description: 'Get information about the OVT (OTORI Vision Token) rune',
    },
    {
      path: '/ovt/balances',
      method: 'GET',
      description: 'Get balances for the OVT rune',
    },
    {
      path: '/ovt/distribution',
      method: 'GET',
      description: 'Get distribution statistics for the OVT rune',
    },
    {
      path: '/ovt/lp-info',
      method: 'GET',
      description: 'Get LP wallet information for the OVT rune',
    },
    {
      path: '/ovt/prepare-lp-distribution',
      method: 'POST',
      description: 'Prepare PSBTs for LP distribution',
      body: {
        amount: 'Amount of OVT to distribute',
        lpAddress: 'LP wallet address (optional, defaults to configured address)'
      }
    }
  ];

  // Format the response as HTML for better readability in browsers
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OTORI Vision Runes API</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
          h1 { color: #333; }
          h2 { color: #555; margin-top: 2rem; }
          .endpoint { background: #f5f5f5; padding: 1rem; margin-bottom: 1rem; border-radius: 4px; }
          .method { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: bold; margin-right: 0.5rem; }
          .get { background: #61affe; color: white; }
          .post { background: #49cc90; color: white; }
          .params { margin-top: 0.5rem; }
          .param { margin-left: 1rem; color: #555; }
          footer { margin-top: 2rem; color: #777; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <h1>OTORI Vision Runes API</h1>
        <p>API for managing OVT (OTORI Vision Token) runes on Bitcoin Signet.</p>
        
        <h2>Configuration</h2>
        <p>Rune ID: ${OVT_RUNE_ID}</p>
        <p>Treasury Address: ${OVT_TREASURY_ADDRESS}</p>
        <p>LP Address: ${LP_ADDRESS}</p>
        
        <h2>Available Endpoints</h2>
    `;
    
    endpoints.forEach(endpoint => {
      html += `
        <div class="endpoint">
          <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
          <strong>${endpoint.path}</strong>
          <div>${endpoint.description}</div>
      `;
      
      if (endpoint.params) {
        html += `<div class="params">Parameters:</div>`;
        for (const [key, value] of Object.entries(endpoint.params)) {
          html += `<div class="param"><strong>${key}</strong>: ${value}</div>`;
        }
      }
      
      if (endpoint.body) {
        html += `<div class="params">Request Body:</div>`;
        for (const [key, value] of Object.entries(endpoint.body)) {
          html += `<div class="param"><strong>${key}</strong>: ${value}</div>`;
        }
      }
      
      html += `</div>`;
    });
    
    html += `
        <footer>
          OTORI Vision Runes API v1.0 | Running on port ${process.env.PORT || 3030}
        </footer>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } else {
    // Return JSON if not explicitly requesting HTML
    res.json({
      name: 'OTORI Vision Runes API',
      version: '1.0',
      description: 'API for managing OVT (OTORI Vision Token) runes on Bitcoin Signet',
      configuration: {
        runeId: OVT_RUNE_ID,
        treasuryAddress: OVT_TREASURY_ADDRESS,
        lpAddress: LP_ADDRESS
      },
      endpoints
    });
  }
});

// Replace the rune/:id endpoint with a dedicated OVT info endpoint
app.get('/ovt/info', (req, res) => {
  try {
    // Return hard-coded info about our OVT rune
    // This avoids the need to query all runes
    return res.json({
      success: true,
      runeInfo: {
        id: OVT_RUNE_ID,
        symbol: OVT_RUNE_SYMBOL,
        treasuryAddress: OVT_TREASURY_ADDRESS,
        lpAddress: LP_ADDRESS
      }
    });
  } catch (error) {
    console.error('Error getting OVT info:', error);
    res.status(500).json({
      success: false,
      error: error.toString()
    });
  }
});

// Update the other endpoints to use the OVT prefix instead of rune/:id
app.get('/ovt/balances', async (req, res) => {
  const result = execOrdCommand(`wallet balance`);
  
  if (result.success) {
    const balances = parseRuneBalances(result.result);
    res.json({ success: true, balances });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

app.get('/ovt/distribution', async (req, res) => {
  const result = execOrdCommand(`wallet balance`);
  
  if (result.success) {
    const balances = parseRuneBalances(result.result);
    const distributionStats = calculateDistributionStats(balances);
    const transactions = await getTransactionHistory(OVT_RUNE_ID);
    
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

app.get('/ovt/lp-info', async (req, res) => {
  try {
    // Get LP balance
    const balanceResult = execOrdCommand(`wallet balance`);
    if (!balanceResult.success) throw new Error('Failed to get balances');
    
    const balances = parseRuneBalances(balanceResult.result);
    const lpBalance = balances.find(b => b.isLP)?.amount || 0;
    const btcSats = await getWalletBalance(LP_ADDRESS);
    
    // Get recent transactions for volume calculation
    const transactions = await getTransactionHistory(OVT_RUNE_ID);
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

app.post('/ovt/prepare-lp-distribution', async (req, res) => {
  try {
    const amount = req.body.amount || 0;
    const lpAddress = req.body.lpAddress || LP_ADDRESS;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid amount specified' 
      });
    }
    
    console.log(`Preparing PSBT for distributing ${amount} of ${OVT_RUNE_ID} to LP address ${lpAddress}`);
    
    // In a real implementation, we would use bitcoin-cli to create a PSBT
    // This would require using proper RPC commands to the Bitcoin Core node
    
    // Example of a more realistic approach using Bitcoin Core RPC:
    // 1. Create a transaction with createrawtransaction
    // 2. Convert to PSBT with converttopsbt
    // 3. Add inputs with walletprocesspsbt
    
    // For now, returning a dummy PSBT as before
    const dummyPSBT = `cHNidP8BAHECAAAAAfUbVEKkUNXZbVFS3uB7z6X4wYQ3r8BwkyM2qX49CD2xAAAAAAD/////AgDh9QUAAAAAIgAgPU1kBB9KxCYkWxV7k2JP5gQVz8w/DNSE0UIRbVEIQEQB1AEAAAAAFgAU3AxdYMxkdq5YdZXKhQMb2jPMBsIAAAAAAAEA3gIAAAAAAQF2xNJVrnHvWW7yP2xj5chMSCHGQsibjEBG1DHp4HQYHgEAAAAA/v///wKghgEAAAAAACIAIIab5mIiJnE/LrxLlnFM7dKKLJ9anXA2u8BiQZIXQ3KbJbwNAAAAAAAWABRYhfmKkJ3MLp3hIBvAdgUkZ5XKpwJHMEQCIB7Kn9ikm0jrDHhUdK5JTCblI7PJWBUmKQOyJQnI8zLrAiAuBd8dDuSm2cMLZFcKDQ3MYrCSQimHfmiK8Rh1Yp4H8QEhA7dYnQPU0nNdEFdO3YcQB9pXdBIQIqiFeh8tCJRyzx1SrgAAAA==`;
    
    res.json({
      success: true,
      psbts: [dummyPSBT],
      message: 'PSBT created for LP distribution'
    });
  } catch (error) {
    console.error('Error preparing LP distribution PSBT:', error);
    res.status(500).json({ 
      success: false, 
      error: error.toString() 
    });
  }
});

// Keep the existing endpoints for backward compatibility (temporarily)
app.get('/rune/:id', (req, res) => {
  res.redirect('/ovt/info');
});

app.get('/rune/:id/balances', (req, res) => {
  res.redirect('/ovt/balances');
});

app.get('/rune/:id/distribution', (req, res) => {
  res.redirect('/ovt/distribution');
});

app.get('/rune/:id/lp-info', (req, res) => {
  res.redirect('/ovt/lp-info');
});

// Update the prepare-lp-distribution endpoint to handle the request directly rather than redirecting
app.post('/rune/prepare-lp-distribution', async (req, res) => {
  try {
    const amount = req.body.amount || 0;
    const lpAddress = req.body.lpAddress || LP_ADDRESS;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid amount specified' 
      });
    }
    
    console.log(`Preparing PSBT for distributing ${amount} of ${OVT_RUNE_ID} to LP address ${lpAddress}`);
    
    // For now, returning a dummy PSBT
    const dummyPSBT = `cHNidP8BAHECAAAAAfUbVEKkUNXZbVFS3uB7z6X4wYQ3r8BwkyM2qX49CD2xAAAAAAD/////AgDh9QUAAAAAIgAgPU1kBB9KxCYkWxV7k2JP5gQVz8w/DNSE0UIRbVEIQEQB1AEAAAAAFgAU3AxdYMxkdq5YdZXKhQMb2jPMBsIAAAAAAAEA3gIAAAAAAQF2xNJVrnHvWW7yP2xj5chMSCHGQsibjEBG1DHp4HQYHgEAAAAA/v///wKghgEAAAAAACIAIIab5mIiJnE/LrxLlnFM7dKKLJ9anXA2u8BiQZIXQ3KbJbwNAAAAAAAWABRYhfmKkJ3MLp3hIBvAdgUkZ5XKpwJHMEQCIB7Kn9ikm0jrDHhUdK5JTCblI7PJWBUmKQOyJQnI8zLrAiAuBd8dDuSm2cMLZFcKDQ3MYrCSQimHfmiK8Rh1Yp4H8QEhA7dYnQPU0nNdEFdO3YcQB9pXdBIQIqiFeh8tCJRyzx1SrgAAAA==`;
    
    res.json({
      success: true,
      psbts: [dummyPSBT],
      message: 'PSBT created for LP distribution'
    });
  } catch (error) {
    console.error('Error preparing LP distribution PSBT:', error);
    res.status(500).json({ 
      success: false, 
      error: error.toString() 
    });
  }
});

// Add functions to validate ord and bitcoin-cli before the server starts
function checkOrdInstallation() {
  try {
    const result = execSync('which ord').toString().trim();
    console.log(`Found ord at: ${result}`);
    return true;
  } catch (error) {
    console.error('ord is not installed or not in PATH');
    return false;
  }
}

function checkBitcoinCliInstallation() {
  try {
    const result = execSync('which bitcoin-cli').toString().trim();
    console.log(`Found bitcoin-cli at: ${result}`);
    return true;
  } catch (error) {
    console.error('bitcoin-cli is not installed or not in PATH');
    return false;
  }
}

function checkOrdConfig() {
  try {
    // Check if ord config exists
    const configExists = fs.existsSync(path.join(process.env.HOME, '.ord', 'ord.yaml'));
    if (!configExists) {
      console.error('ord config file not found at ~/.ord/ord.yaml');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking ord config:', error);
    return false;
  }
}

// Add health check endpoint
app.get('/health', (req, res) => {
  // Check all required dependencies
  const ordInstalled = checkOrdInstallation();
  const bitcoinCliInstalled = checkBitcoinCliInstallation();
  const ordConfigExists = checkOrdConfig();
  
  // Get Bitcoin and ord version info for diagnostics
  let bitcoinVersion = 'Not available';
  let ordVersion = 'Not available';
  
  try {
    bitcoinVersion = execSync('bitcoin-cli -version').toString().trim();
  } catch (error) {
    console.error('Could not get bitcoin-cli version');
  }
  
  try {
    ordVersion = execSync('ord --version').toString().trim();
  } catch (error) {
    console.error('Could not get ord version');
  }
  
  const status = ordInstalled && bitcoinCliInstalled && ordConfigExists ? 'healthy' : 'unhealthy';
  
  res.json({
    status,
    timestamp: new Date().toISOString(),
    configuration: {
      runeId: OVT_RUNE_ID,
      treasuryAddress: OVT_TREASURY_ADDRESS,
      lpAddress: LP_ADDRESS
    },
    dependencies: {
      ord: {
        installed: ordInstalled,
        version: ordVersion,
        configExists: ordConfigExists
      },
      bitcoinCli: {
        installed: bitcoinCliInstalled,
        version: bitcoinVersion
      }
    }
  });
});

// Add global error handling middleware (place this before module.exports)
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Start the server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3030;
  const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces
  
  // Check if we can connect to bitcoind and ord before starting
  console.log("Checking dependencies...");
  const ordInstalled = checkOrdInstallation();
  const bitcoinCliInstalled = checkBitcoinCliInstallation();
  const ordConfigExists = checkOrdConfig();
  
  if (!ordInstalled || !bitcoinCliInstalled || !ordConfigExists) {
    console.error("Some dependencies are missing. Check the logs above for details.");
    console.error("Starting the server anyway, but some functions may not work correctly.");
  }
  
  app.listen(PORT, HOST, () => {
    console.log(`OTORI Vision Runes API running on http://${HOST}:${PORT}`);
    console.log(`IMPORTANT: If this server is exposed to the internet, ensure proper security measures are in place.`);
    console.log(`OVT Rune ID: ${OVT_RUNE_ID}`);
    console.log(`Treasury Address: ${OVT_TREASURY_ADDRESS}`);
    console.log(`LP Address: ${LP_ADDRESS}`);
  });
}
// Simple IP-based rate limiting
const rateLimit = {};
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute

app.use((req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  
  // Initialize or clean up old entries
  if (!rateLimit[ip] || Date.now() - rateLimit[ip].timestamp > RATE_LIMIT_WINDOW) {
    rateLimit[ip] = {
      count: 0,
      timestamp: Date.now()
    };
  }
  
  // Increment request count
  rateLimit[ip].count++;
  
  // Check if rate limit exceeded
  if (rateLimit[ip].count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.'
    });
  }
  
  next();
});
// Export the Express app for use in other modules
module.exports = app;