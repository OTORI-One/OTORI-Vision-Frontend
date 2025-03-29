/**
 * Trading API Routes for OTORI Vision
 * 
 * This module provides trading simulation endpoints for OTORI Vision Token.
 */

const express = require('express');
const router = express.Router();
const tradingService = require('../services/tradingService');

/**
 * @route GET /api/trading/orderbook
 * @description Get the current order book
 * @access Public
 */
router.get('/orderbook', (req, res) => {
  try {
    const orderbook = tradingService.getOrderbook();
    
    res.json({
      success: true,
      orderbook,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching orderbook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orderbook'
    });
  }
});

/**
 * @route GET /api/trading/trades
 * @description Get recent trades
 * @access Public
 */
router.get('/trades', (req, res) => {
  try {
    const trades = tradingService.getRecentTrades();
    
    res.json({
      success: true,
      trades,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching recent trades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent trades'
    });
  }
});

/**
 * @route GET /api/trading/liquidity
 * @description Get current liquidity information
 * @access Public
 */
router.get('/liquidity', (req, res) => {
  const liquidity = {
    ovtLiquidity: 1000000,
    btcLiquidity: 30000000, // 0.3 BTC in sats
    totalValueLocked: 330000000, // 3.3 BTC in sats
    lastUpdate: Date.now()
  };
  
  res.json({
    success: true,
    liquidity,
    timestamp: Date.now()
  });
});

/**
 * @route GET /api/trading/user-trades
 * @description Get trades for a specific user
 * @access Restricted
 */
router.get('/user-trades', (req, res) => {
  const { address } = req.query;
  
  if (!address) {
    return res.status(400).json({
      success: false,
      error: 'Wallet address required'
    });
  }
  
  // Simple mock user trades
  const userTrades = [
    { id: '101', price: 310000, amount: 2000, timestamp: Date.now() - 3600000, type: 'buy', status: 'completed' },
    { id: '102', price: 305000, amount: 1500, timestamp: Date.now() - 7200000, type: 'sell', status: 'completed' }
  ];
  
  res.json({
    success: true,
    userTrades,
    timestamp: Date.now()
  });
});

/**
 * @route POST /api/trading/market-order
 * @description Execute a market order
 * @access Restricted
 */
router.post('/market-order', (req, res) => {
  const { type, amount, address } = req.body;
  
  if (!type || !amount || !address) {
    return res.status(400).json({
      success: false,
      error: 'Type, amount and address are required'
    });
  }
  
  // Simple mock market order execution
  const order = {
    id: `order-${Date.now()}`,
    type,
    amount: parseFloat(amount),
    price: type === 'buy' ? 315000 : 305000, // Slightly worse price for market orders
    status: 'completed',
    timestamp: Date.now(),
    address
  };
  
  res.json({
    success: true,
    order,
    timestamp: Date.now()
  });
});

/**
 * @route POST /api/trading/limit-order
 * @description Place a limit order
 * @access Restricted
 */
router.post('/limit-order', (req, res) => {
  const { type, amount, price, address } = req.body;
  
  if (!type || !amount || !price || !address) {
    return res.status(400).json({
      success: false,
      error: 'Type, amount, price and address are required'
    });
  }
  
  // Simple mock limit order placement
  const order = {
    id: `order-${Date.now()}`,
    type,
    amount: parseFloat(amount),
    price: parseFloat(price),
    status: 'open',
    timestamp: Date.now(),
    address
  };
  
  res.json({
    success: true,
    order,
    timestamp: Date.now()
  });
});

/**
 * @route GET /api/trading/price-impact
 * @description Calculate price impact for a trade
 * @access Public
 */
router.get('/price-impact', (req, res) => {
  const { amount, type } = req.query;
  
  if (!amount || !type) {
    return res.status(400).json({
      success: false,
      error: 'Amount and type (buy/sell) are required'
    });
  }
  
  const amountValue = parseFloat(amount);
  
  // Simple mock price impact calculation
  const basePrice = type === 'buy' ? 310000 : 300000;
  const impact = Math.min(amountValue / 100000, 0.05); // Maximum 5% impact
  const priceWithImpact = type === 'buy' 
    ? basePrice * (1 + impact) 
    : basePrice * (1 - impact);
  
  res.json({
    success: true,
    basePrice,
    priceWithImpact: Math.round(priceWithImpact),
    priceImpact: `${(impact * 100).toFixed(2)}%`,
    timestamp: Date.now()
  });
});

module.exports = router; 