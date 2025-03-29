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
const DEFAULT_OVT_CIRCULATING_SUPPLY = 1000000; // 1M tokens for testnet
const OVT_TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || 'tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd';
const OVT_TREASURY_ADDRESS_2 = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_2 || 'tb1plpfgtre7sxxrrwjdpy4357qj2nr7ek06xqpdryxr4lzt5tck6x3qz07zd3';
const OVT_RUNE_ID = process.env.NEXT_PUBLIC_OVT_RUNE_ID || '240249:101';

// Data structure to store current price state
let priceState = {
  positions: {},
  ovtPrice: 0,
  btcPrice: DEFAULT_BTC_PRICE,
  lastUpdate: 0,
  ovtCirculatingSupply: DEFAULT_OVT_CIRCULATING_SUPPLY,
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
    
    // Setup periodic OVT supply update
    setInterval(updateOVTCirculatingSupply, 2 * 60 * 60 * 1000); // Every 2 hours
    
    // Initial OVT supply update
    updateOVTCirculatingSupply();
    
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
  
  // Calculate OVT price based on total NAV and circulating supply
  calculateOVTPrice();
  
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
    
    // 3. Update OVT price based on NAV and circulating supply
    calculateOVTPrice();
    
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

// Update OVT circulating supply from the Runes API
async function updateOVTCirculatingSupply() {
  try {
    console.log('Updating OVT circulating supply...');
    
    // Try to fetch circulating supply from the Runes API
    try {
      // The Runes API should be running on the same server or accessible locally
      const response = await axios.get('http://localhost:3030/ovt/distribution', {
        timeout: 5000
      });
      
      if (response.data && response.data.success && response.data.distributionStats) {
        const { totalSupply, treasuryHeld } = response.data.distributionStats;
        
        // Circulating supply is total supply minus tokens held in treasury
        const circulatingSupply = totalSupply - treasuryHeld;
        
        // Update state with on-chain data
        priceState.ovtCirculatingSupply = circulatingSupply > 0 ? circulatingSupply : DEFAULT_OVT_CIRCULATING_SUPPLY;
        console.log(`Updated OVT circulating supply: ${priceState.ovtCirculatingSupply}`);
        
        // Recalculate OVT price with the updated supply
        calculateOVTPrice();
        
        // Save data
        savePriceData();
        
        return true;
      } else {
        console.log('Invalid response from Runes API, using default or previous supply');
      }
    } catch (error) {
      console.error('Error fetching OVT distribution data:', error);
      console.log('Using default or previous supply value');
    }
    
    // If we couldn't fetch from the API, ensure we have at least the default value
    if (!priceState.ovtCirculatingSupply) {
      priceState.ovtCirculatingSupply = DEFAULT_OVT_CIRCULATING_SUPPLY;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating OVT circulating supply:', error);
    return false;
  }
}

// Calculate OVT price based on NAV and circulating supply
function calculateOVTPrice() {
  try {
    // 1. Calculate total NAV in sats
    const totalNAVSats = Object.values(priceState.positions)
      .reduce((sum, position) => {
        // Ensure we're adding valid numbers to prevent overflow
        const current = typeof position.current === 'number' && isFinite(position.current) ? position.current : 0;
        return sum + current;
      }, 0);
    
    // 2. Ensure total NAV is within reasonable bounds (max 100 million BTC in sats)
    const maxNAV = 100 * 1000000 * SATS_PER_BTC; // 100M BTC in sats
    const validatedNAV = Math.min(Math.max(totalNAVSats, 0), maxNAV);
    
    // 3. Ensure we have a valid circulating supply (fallback to default if needed)
    const circulatingSupply = priceState.ovtCirculatingSupply || DEFAULT_OVT_CIRCULATING_SUPPLY;
    
    // 4. Ensure supply is positive to avoid division by zero
    if (circulatingSupply <= 0) {
      console.error('Invalid circulating supply:', circulatingSupply);
      return priceState.ovtPrice || 0; // Return existing price or 0
    }
    
    // 5. Calculate OVT price in sats with validation
    const ovtPriceInSats = validatedNAV / circulatingSupply;
    
    // 6. Ensure the price is within reasonable bounds (max 1M sats per token)
    const maxPrice = 1000000; // 1M sats = 0.01 BTC
    const validatedPrice = Math.min(Math.max(ovtPriceInSats, 0), maxPrice);
    
    // 7. Update state
    priceState.ovtPrice = validatedPrice;
    
    console.log(`Calculated OVT price: ${validatedPrice} sats (NAV: ${validatedNAV} sats / Supply: ${circulatingSupply})`);
    
    return validatedPrice;
  } catch (error) {
    console.error('Error calculating OVT price:', error);
    // Return existing price or a default value
    return priceState.ovtPrice || 100000; // Default to 100k sats (0.001 BTC) if calculation fails
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
  try {
    // Try to load the mock-data from the frontend
    const mockDataPath = path.join(__dirname, '../../../frontend/src/mock-data/portfolio-positions.json');
    if (fs.existsSync(mockDataPath)) {
      const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
      console.log(`Loaded portfolio positions from mock data: ${mockData.length} positions found`);
      return mockData;
    }
  } catch (error) {
    console.error('Error loading mock portfolio data:', error);
    console.log('Falling back to hardcoded portfolio positions');
  }
  
  // Fallback to default hardcoded portfolio positions if mock data can't be loaded
  return [
    {
      name: "Polymorphic Labs",
      value: 180000000,
      description: "Encryption Layer",
      current: 180000000,
      change: 0,
      tokenAmount: 600000,
      pricePerToken: 300
    },
    {
      name: "VoltFi",
      value: 87500000,
      description: "Bitcoin Volatility Index on Bitcoin",
      current: 87500000,
      change: 0,
      tokenAmount: 350000,
      pricePerToken: 250
    },
    {
      name: "MIXDTape",
      value: 100000000,
      description: "Phygital Music for superfans - disrupting Streaming",
      current: 100000000,
      change: 0,
      tokenAmount: 500000,
      pricePerToken: 200
    },
    {
      name: "OrdinalHive",
      value: 166980000,
      description: "Ordinal and Bitcoin asset aggregator for the Hive",
      current: 166980000,
      change: 0,
      tokenAmount: 690000,
      pricePerToken: 242
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
    lastUpdate: priceState.lastUpdate,
    circulatingSupply: priceState.ovtCirculatingSupply
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
    circulatingSupply: priceState.ovtCirculatingSupply,
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
  updatePrices,
  updateOVTCirculatingSupply
}; 