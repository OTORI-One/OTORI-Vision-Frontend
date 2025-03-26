/**
 * Price Service for OTORI Vision
 * 
 * This service manages centralized price data for OVT and portfolio positions.
 * It ensures consistent pricing data across all clients and accurate 24-hour change calculations.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Constants
const PRICE_DATA_FILE = path.join(__dirname, '../../data/price-data.json');
const BTC_PRICE_FILE = path.join(__dirname, '../../data/btc-price.json');
const SATS_PER_BTC = 100000000;
const UPDATE_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds 
const DEFAULT_BTC_PRICE = 60000;

// Data structure to store current price state
let priceState = {
  positions: {},
  ovtPrice: 0,
  btcPrice: DEFAULT_BTC_PRICE,
  lastUpdate: 0,
  priceHistory: {
    daily: {}, // Daily closing prices by position name
    hourly: {} // Hourly data points for more granular analysis
  }
};

// Initialize module
function initialize() {
  try {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Load price data from file if exists
    if (fs.existsSync(PRICE_DATA_FILE)) {
      const data = fs.readFileSync(PRICE_DATA_FILE, 'utf8');
      priceState = JSON.parse(data);
      console.log('Loaded price data from file');
    } else {
      console.log('No saved price data found, using default values');
      // Initialize with default data
      initializeDefaultPriceData();
    }
    
    // Setup periodic updates
    setInterval(updatePrices, UPDATE_INTERVAL);
    
    // Initial update
    updatePrices();
    
    // Setup periodic save
    setInterval(savePriceData, 30 * 60 * 1000); // Save every 30 minutes
    
    return true;
  } catch (error) {
    console.error('Error initializing price service:', error);
    return false;
  }
}

// Initialize with default data
function initializeDefaultPriceData() {
  // Default portfolio positions - matching the client-side defaults
  const defaultPositions = getDefaultPortfolio();
  
  // Initialize price state with default positions
  defaultPositions.forEach(position => {
    priceState.positions[position.name] = {
      current: position.current,
      value: position.value,
      change: position.change,
      pricePerToken: position.pricePerToken,
      tokenAmount: position.tokenAmount,
      description: position.description,
      lastUpdate: Date.now(),
      lastSpikeDay: 0,
      volatilityState: {
        lastValue: position.current,
        momentum: 0,
        trend: 0
      }
    };
  });
  
  // Set OVT price as the first position's price per token
  priceState.ovtPrice = defaultPositions[0].pricePerToken;
  
  // Initialize price history with current values
  priceState.priceHistory.daily = Object.fromEntries(
    defaultPositions.map(p => [
      p.name, 
      { 
        [getDayKey(new Date())]: p.current 
      }
    ])
  );
  
  priceState.priceHistory.hourly = Object.fromEntries(
    defaultPositions.map(p => [
      p.name, 
      { 
        [getHourKey(new Date())]: p.current 
      }
    ])
  );
  
  priceState.lastUpdate = Date.now();
  
  // Save the initialized data
  savePriceData();
}

// Update price data periodically
async function updatePrices() {
  try {
    console.log('Updating price data...');
    
    // 1. Update Bitcoin price
    await updateBitcoinPrice();
    
    // 2. Update position prices with simulated movements
    Object.keys(priceState.positions).forEach(positionName => {
      const position = priceState.positions[positionName];
      const updatedPosition = simulatePriceMovement(position);
      priceState.positions[positionName] = updatedPosition;
      
      // Update historical data
      updatePriceHistory(positionName, updatedPosition.current);
    });
    
    // 3. If OVT is a position, update the OVT price
    if (priceState.positions['Bitcoin']) {
      priceState.ovtPrice = priceState.positions['Bitcoin'].pricePerToken;
    }
    
    // 4. Update last update timestamp
    priceState.lastUpdate = Date.now();
    
    // 5. Save the updated data
    savePriceData();
    
    console.log('Price data updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating prices:', error);
    return false;
  }
}

// Save price data to file
function savePriceData() {
  try {
    fs.writeFileSync(PRICE_DATA_FILE, JSON.stringify(priceState, null, 2));
    console.log('Price data saved to file');
    return true;
  } catch (error) {
    console.error('Error saving price data:', error);
    return false;
  }
}

// Update price history for a position
function updatePriceHistory(positionName, currentValue) {
  const now = new Date();
  const dayKey = getDayKey(now);
  const hourKey = getHourKey(now);
  
  // Ensure the position exists in history
  if (!priceState.priceHistory.daily[positionName]) {
    priceState.priceHistory.daily[positionName] = {};
  }
  
  if (!priceState.priceHistory.hourly[positionName]) {
    priceState.priceHistory.hourly[positionName] = {};
  }
  
  // Update daily data
  priceState.priceHistory.daily[positionName][dayKey] = currentValue;
  
  // Update hourly data
  priceState.priceHistory.hourly[positionName][hourKey] = currentValue;
  
  // Cleanup old data (keep only last 30 days and 7 days of hourly data)
  cleanupHistoricalData();
}

// Cleanup old historical data
function cleanupHistoricalData() {
  const MAX_DAILY_DAYS = 30;
  const MAX_HOURLY_DAYS = 7;
  
  const now = new Date();
  const dailyCutoff = new Date(now);
  dailyCutoff.setDate(dailyCutoff.getDate() - MAX_DAILY_DAYS);
  
  const hourlyCutoff = new Date(now);
  hourlyCutoff.setDate(hourlyCutoff.getDate() - MAX_HOURLY_DAYS);
  
  // Clean daily data
  Object.keys(priceState.priceHistory.daily).forEach(positionName => {
    const positionData = priceState.priceHistory.daily[positionName];
    Object.keys(positionData).forEach(dateKey => {
      const [year, month, day] = dateKey.split('-').map(n => parseInt(n));
      const entryDate = new Date(year, month - 1, day);
      if (entryDate < dailyCutoff) {
        delete positionData[dateKey];
      }
    });
  });
  
  // Clean hourly data
  Object.keys(priceState.priceHistory.hourly).forEach(positionName => {
    const positionData = priceState.priceHistory.hourly[positionName];
    Object.keys(positionData).forEach(dateTimeKey => {
      const [dateKey, hour] = dateTimeKey.split('T');
      const [year, month, day] = dateKey.split('-').map(n => parseInt(n));
      const entryDate = new Date(year, month - 1, day, parseInt(hour));
      if (entryDate < hourlyCutoff) {
        delete positionData[dateTimeKey];
      }
    });
  });
}

// Format date as YYYY-MM-DD
function getDayKey(date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// Format date as YYYY-MM-DDThh
function getHourKey(date) {
  return `${getDayKey(date)}T${date.getHours().toString().padStart(2, '0')}`;
}

// Update Bitcoin price from CoinGecko
async function updateBitcoinPrice() {
  try {
    // Check if we need to update (cache for 1 hour)
    const now = Date.now();
    const btcPriceData = fs.existsSync(BTC_PRICE_FILE) 
      ? JSON.parse(fs.readFileSync(BTC_PRICE_FILE, 'utf8')) 
      : { price: DEFAULT_BTC_PRICE, timestamp: 0 };
    
    if (now - btcPriceData.timestamp < 60 * 60 * 1000) {
      console.log('Using cached Bitcoin price:', btcPriceData.price);
      priceState.btcPrice = btcPriceData.price;
      return btcPriceData.price;
    }
    
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      { timeout: 5000 }
    );
    
    if (response.data && response.data.bitcoin && response.data.bitcoin.usd) {
      const price = response.data.bitcoin.usd;
      
      // Update price state
      priceState.btcPrice = price;
      
      // Save to cache file
      fs.writeFileSync(
        BTC_PRICE_FILE, 
        JSON.stringify({ price, timestamp: now })
      );
      
      console.log('Updated Bitcoin price:', price);
      return price;
    } else {
      throw new Error('Invalid response format from CoinGecko');
    }
  } catch (error) {
    console.error('Error fetching Bitcoin price:', error);
    // Use the existing price or default
    return priceState.btcPrice || DEFAULT_BTC_PRICE;
  }
}

// Calculate 24-hour change percentage for a position
function calculate24HourChange(positionName) {
  try {
    const position = priceState.positions[positionName];
    if (!position) return 0;
    
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayKey = getDayKey(now);
    const yesterdayKey = getDayKey(yesterday);
    
    const todayValue = position.current;
    const yesterdayValue = priceState.priceHistory.daily[positionName]?.[yesterdayKey];
    
    if (!yesterdayValue) return 0;
    
    return ((todayValue - yesterdayValue) / yesterdayValue) * 100;
  } catch (error) {
    console.error('Error calculating 24-hour change:', error);
    return 0;
  }
}

// Simulate price movement for a position
function simulatePriceMovement(position) {
  try {
    // Generate random daily change between -3% and +5% with positive bias
    const generateDailyChange = () => {
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      
      // Base volatility
      const volatility = 0.02;
      
      // Create a change with slight positive bias (0.5% positive bias on average)
      let change = z0 * volatility + 0.005;
      
      // Restrict to the expected range
      return Math.max(-0.03, Math.min(0.05, change));
    };
    
    // Determine if this should be a super spike day (rare large movement)
    const shouldGenerateSuperSpike = () => {
      const lastSpikeDay = position.lastSpikeDay || 0;
      const currentDay = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
      
      // Don't allow spikes if too recent (minimum 5 days since last spike)
      if (currentDay - lastSpikeDay < 5) {
        return false;
      }
      
      // Base probability (1 in 10 days on average)
      const baseProbability = 1 / 10;
      
      // Higher probability the longer we go without a spike
      const daysSinceLastSpike = currentDay - lastSpikeDay;
      let adjustedProbability = baseProbability;
      
      // Gradually increase probability after 10 days
      if (daysSinceLastSpike > 10) {
        // Add 0.5% per day after 10 days
        adjustedProbability += (daysSinceLastSpike - 10) * 0.005;
      }
      
      // Cap at 25% daily probability
      adjustedProbability = Math.min(0.25, adjustedProbability);
      
      // Random check based on adjusted probability
      return Math.random() < adjustedProbability;
    };
    
    // Generate a super spike between +25% and +50% (positive) or -25% and -50% (negative)
    const generateSuperSpike = () => {
      const minMagnitude = 0.25;
      const maxMagnitude = 0.50;
      
      // Calculate magnitude
      const magnitude = minMagnitude + (Math.random() * (maxMagnitude - minMagnitude));
      
      // 70% chance of positive spike, 30% chance of negative
      const isPositive = Math.random() < 0.7;
      
      return isPositive ? magnitude : -magnitude;
    };
    
    // Calculate current day number for tracking spikes
    const currentDay = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    
    // Determine if we should create a spike
    const isSpike = shouldGenerateSuperSpike();
    
    // Generate change percentage based on whether it's a spike day
    const changePercentage = isSpike ? generateSuperSpike() : generateDailyChange();
    
    // Apply change to position
    const currentValue = position.current;
    const newValue = currentValue * (1 + changePercentage);
    
    // Calculate the change percentage based on original investment
    const changePercentRelativeToOriginal = ((newValue - position.value) / position.value) * 100;
    
    // Calculate new price per token
    const newPricePerToken = position.tokenAmount > 0 
      ? newValue / position.tokenAmount 
      : position.pricePerToken;
    
    // Return updated position
    return {
      ...position,
      current: newValue,
      // Keep the original value unchanged
      change: changePercentRelativeToOriginal,
      pricePerToken: newPricePerToken,
      lastUpdate: Date.now(),
      lastSpikeDay: isSpike ? currentDay : (position.lastSpikeDay || 0)
    };
  } catch (error) {
    console.error('Error simulating price movement:', error);
    return position;
  }
}

// Get default portfolio for initialization
function getDefaultPortfolio() {
  return [
    {
      name: "Bitcoin",
      value: 500000,
      current: 550000,
      change: 10.0,
      tokenAmount: 1.5,
      pricePerToken: 336666.67,
      description: "Digital Gold",
      marketCap: 750000000000,
      sector: "currency"
    },
    {
      name: "Lightning Network",
      value: 300000,
      current: 315000,
      change: 5.0,
      tokenAmount: 10000,
      pricePerToken: 31.5,
      description: "Layer 2 Scaling Solution",
      marketCap: 400000000,
      sector: "scaling"
    },
    {
      name: "Liquid Network",
      value: 200000,
      current: 190000,
      change: -5.0,
      tokenAmount: 1000,
      pricePerToken: 190,
      description: "Bitcoin Sidechain",
      marketCap: 250000000,
      sector: "scaling"
    },
    {
      name: "Rootstock",
      value: 150000,
      current: 165000,
      change: 10.0,
      tokenAmount: 5000,
      pricePerToken: 33,
      description: "Smart Contracts on Bitcoin",
      marketCap: 180000000,
      sector: "infrastructure"
    },
    {
      name: "RGB Protocol",
      value: 100000,
      current: 120000,
      change: 20.0,
      tokenAmount: 10000,
      pricePerToken: 12,
      description: "Smart Assets on Bitcoin",
      marketCap: 75000000,
      sector: "defi"
    }
  ];
}

// API methods for route handlers

/**
 * Get all portfolio positions with current prices
 */
function getAllPositions() {
  return Object.entries(priceState.positions).map(([name, position]) => ({
    name,
    value: position.value,
    current: position.current,
    change: position.change,
    pricePerToken: position.pricePerToken,
    tokenAmount: position.tokenAmount,
    description: position.description,
    dailyChange: calculate24HourChange(name)
  }));
}

/**
 * Get the current OVT price data
 */
function getOVTPrice() {
  return {
    price: priceState.ovtPrice,
    btcPriceSats: priceState.ovtPrice,
    btcPriceFormatted: `${Math.floor(priceState.ovtPrice)} sats`,
    usdPrice: (priceState.ovtPrice / SATS_PER_BTC) * priceState.btcPrice,
    usdPriceFormatted: `$${((priceState.ovtPrice / SATS_PER_BTC) * priceState.btcPrice).toFixed(2)}`,
    dailyChange: calculate24HourChange('Bitcoin'),
    lastUpdate: priceState.lastUpdate
  };
}

/**
 * Get the current Bitcoin price
 */
function getBitcoinPrice() {
  return {
    price: priceState.btcPrice,
    formatted: `$${priceState.btcPrice.toLocaleString()}`,
    lastUpdate: priceState.lastUpdate
  };
}

/**
 * Get price history for a specific position
 */
function getPriceHistory(positionName, timeframe = 'daily') {
  if (!priceState.priceHistory[timeframe] || !priceState.priceHistory[timeframe][positionName]) {
    return [];
  }
  
  const historyData = priceState.priceHistory[timeframe][positionName];
  return Object.entries(historyData).map(([dateKey, value]) => ({
    date: dateKey,
    value
  })).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get NAV data
 */
function getNAVData() {
  // Sum all position current values
  const totalValueSats = Object.values(priceState.positions)
    .reduce((sum, position) => sum + position.current, 0);
  
  // Convert to USD
  const totalValueUSD = (totalValueSats / SATS_PER_BTC) * priceState.btcPrice;
  
  // Calculate overall change percentage
  const totalOriginalValue = Object.values(priceState.positions)
    .reduce((sum, position) => sum + position.value, 0);
  
  const overallChangePercentage = ((totalValueSats - totalOriginalValue) / totalOriginalValue) * 100;
  
  // Format the values
  let formattedTotalValueSats;
  if (totalValueSats >= 10000000) { // 0.1 BTC or more
    formattedTotalValueSats = `₿${(totalValueSats / SATS_PER_BTC).toFixed(2)}`;
  } else if (totalValueSats >= 1000000) {
    formattedTotalValueSats = `${(totalValueSats / 1000000).toFixed(2)}M sats`;
  } else if (totalValueSats >= 1000) {
    formattedTotalValueSats = `${(totalValueSats / 1000).toFixed(1)}k sats`;
  } else {
    formattedTotalValueSats = `${Math.floor(totalValueSats)} sats`;
  }
  
  let formattedTotalValueUSD;
  if (totalValueUSD >= 1000000) {
    formattedTotalValueUSD = `$${(totalValueUSD / 1000000).toFixed(2)}M`;
  } else if (totalValueUSD >= 1000) {
    formattedTotalValueUSD = `$${(totalValueUSD / 1000).toFixed(1)}k`;
  } else {
    formattedTotalValueUSD = `$${Math.floor(totalValueUSD)}`;
  }
  
  return {
    totalValueSats,
    totalValueUSD,
    formattedTotalValueSats,
    formattedTotalValueUSD,
    changePercentage: overallChangePercentage,
    btcPrice: priceState.btcPrice,
    ovtPrice: priceState.ovtPrice,
    lastUpdate: priceState.lastUpdate
  };
}

module.exports = {
  initialize,
  getAllPositions,
  getOVTPrice,
  getBitcoinPrice,
  getPriceHistory,
  getNAVData,
  updatePrices
}; 