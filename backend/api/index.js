/**
 * OTORI Vision API Server
 * Provides centralized services for price feeds, trading simulation, and runes API
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Initialize express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3030;

// Import API routes
const runesAPI = require('./runes_API');
const priceRoutes = require('./routes/priceRoutes');
const tradingRoutes = require('./routes/tradingRoutes');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use(cors());
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

// Data directory initialization
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory:', dataDir);
}

// Mount API routes
app.use('/api/price', priceRoutes);
app.use('/api/trading', tradingRoutes);

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Home route for API documentation
app.get('/', (req, res) => {
  const endpoints = [
    {
      path: '/',
      method: 'GET',
      description: 'API documentation',
    },
    {
      path: '/api/health',
      method: 'GET',
      description: 'Health check endpoint',
    },
    {
      path: '/api/price/portfolio',
      method: 'GET',
      description: 'Get portfolio positions with current prices',
    },
    {
      path: '/api/price/ovt',
      method: 'GET',
      description: 'Get current OVT price data',
    },
    {
      path: '/api/price/bitcoin',
      method: 'GET',
      description: 'Get current Bitcoin price',
    },
    {
      path: '/api/price/history/:positionName',
      method: 'GET',
      description: 'Get price history for a specific position',
    },
    {
      path: '/api/price/nav',
      method: 'GET',
      description: 'Get NAV data including total value and changes',
    },
    {
      path: '/api/price/update',
      method: 'POST',
      description: 'Trigger a manual price update (admin only)',
    },
    {
      path: '/api/trading/orderbook',
      method: 'GET',
      description: 'Get current order book data',
    },
    {
      path: '/api/trading/trades',
      method: 'GET',
      description: 'Get recent trades data',
    },
    {
      path: '/api/trading/liquidity',
      method: 'GET',
      description: 'Get current liquidity data',
    },
    {
      path: '/api/trading/user-trades',
      method: 'GET',
      description: 'Get trades for a specific user',
    },
    {
      path: '/api/trading/market-order',
      method: 'POST',
      description: 'Execute a market order',
    },
    {
      path: '/api/trading/limit-order',
      method: 'POST',
      description: 'Place a limit order',
    },
    {
      path: '/api/trading/price-impact',
      method: 'GET',
      description: 'Calculate price impact for a trade',
    }
  ];

  // Format the response as HTML for better readability in browsers
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OTORI Vision API</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          tr:hover { background-color: #f5f5f5; }
          code { background-color: #f0f0f0; padding: 2px 4px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>OTORI Vision API Endpoints</h1>
        <table>
          <tr>
            <th>Path</th>
            <th>Method</th>
            <th>Description</th>
          </tr>
    `;
    
    endpoints.forEach(endpoint => {
      html += `
        <tr>
          <td><code>${endpoint.path}</code></td>
          <td>${endpoint.method}</td>
          <td>${endpoint.description}</td>
        </tr>
      `;
    });
    
    html += `
        </table>
        <p>For more detailed API documentation, visit <a href="/api-docs">API Documentation</a>.</p>
      </body>
      </html>
    `;
    
    return res.send(html);
  }

  res.json({
    name: 'OTORI Vision API',
    version: '1.0.0',
    endpoints
  });
});

// Start server
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`OTORI Vision API server running on port ${PORT}`);
  });
  
  // Set up a periodic task to match orders (every minute)
  setInterval(() => {
    try {
      const tradingService = require('./services/tradingService');
      const matches = tradingService.matchOrders();
      if (matches.length > 0) {
        console.log(`Matched ${matches.length} orders`);
      }
    } catch (error) {
      console.error('Error in order matching task:', error);
    }
  }, 60000);
}

// Export for potential programmatic usage
module.exports = {
  app,
  server,
  runesAPI
}; 