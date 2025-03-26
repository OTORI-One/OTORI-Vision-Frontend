// Backend API entry point
// This file serves as the main entry point for the backend API services

const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3030;

// Import API routes
const runesAPI = require('./runes_API');
const priceRoutes = require('./routes/priceRoutes');

// Middleware
app.use(express.json());

// CORS middleware
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

// Home route for API documentation
app.get('/', (req, res) => {
  const endpoints = [
    {
      path: '/',
      method: 'GET',
      description: 'API documentation',
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

  res.json({ endpoints });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`OTORI Vision API server running on port ${PORT}`);
  });
}

// Export for potential programmatic usage
module.exports = {
  app,
  runesAPI
}; 