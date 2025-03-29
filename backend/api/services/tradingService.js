/**
 * Trading Service for OTORI Vision
 * 
 * This service handles trading operations, order matching, and liquidity management.
 */

// Mock orderbook
const orderbook = {
  bids: [
    { id: 'bid1', price: 300000, amount: 10000, address: 'mock-address-1' },
    { id: 'bid2', price: 290000, amount: 15000, address: 'mock-address-2' },
    { id: 'bid3', price: 280000, amount: 20000, address: 'mock-address-3' }
  ],
  asks: [
    { id: 'ask1', price: 310000, amount: 8000, address: 'mock-address-4' },
    { id: 'ask2', price: 320000, amount: 12000, address: 'mock-address-5' },
    { id: 'ask3', price: 330000, amount: 18000, address: 'mock-address-6' }
  ],
  lastUpdate: Date.now()
};

// Mock trades
const recentTrades = [];

/**
 * Match orders in the orderbook
 * @returns {Array} Matched orders
 */
function matchOrders() {
  // Placeholder for order matching logic
  // In a real implementation, this would match bids and asks
  // For now, just return an empty array
  return [];
}

/**
 * Get the current orderbook
 * @returns {Object} Current orderbook
 */
function getOrderbook() {
  return orderbook;
}

/**
 * Get recent trades
 * @returns {Array} Recent trades
 */
function getRecentTrades() {
  return recentTrades;
}

/**
 * Place a new order
 * @param {Object} order Order details
 * @returns {Object} Placed order
 */
function placeOrder(order) {
  const { type, price, amount, address } = order;
  
  if (!type || !price || !amount || !address) {
    throw new Error('Invalid order parameters');
  }
  
  const newOrder = {
    id: `order-${Date.now()}`,
    type,
    price,
    amount,
    address,
    status: 'open',
    timestamp: Date.now()
  };
  
  // Add to appropriate side of orderbook
  if (type === 'buy') {
    orderbook.bids.push(newOrder);
    orderbook.bids.sort((a, b) => b.price - a.price); // Sort by descending price
  } else {
    orderbook.asks.push(newOrder);
    orderbook.asks.sort((a, b) => a.price - b.price); // Sort by ascending price
  }
  
  // Update last update timestamp
  orderbook.lastUpdate = Date.now();
  
  return newOrder;
}

/**
 * Get a user's orders
 * @param {string} address User's wallet address
 * @returns {Array} User's orders
 */
function getUserOrders(address) {
  if (!address) {
    throw new Error('Address is required');
  }
  
  const bids = orderbook.bids.filter(order => order.address === address);
  const asks = orderbook.asks.filter(order => order.address === address);
  
  return [...bids, ...asks];
}

module.exports = {
  matchOrders,
  getOrderbook,
  getRecentTrades,
  placeOrder,
  getUserOrders
}; 