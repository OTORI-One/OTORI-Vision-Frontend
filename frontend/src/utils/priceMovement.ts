/**
 * Advanced price movement algorithm for portfolio positions
 * - Creates an overall positive trend (+5-10% monthly)
 * - Daily fluctuations (-3% to +5%)
 * - Random "super spikes" (+/- 25-50%) every 5-14 days
 * - Realistic crypto-asset correlation and volatility patterns
 */

export interface PortfolioPosition {
  name: string;
  value: number;
  current: number;
  change: number;
  tokenAmount: number;
  pricePerToken: number;
  lastSpikeDay?: number;
  description?: string;
  transactionId?: string;
  address?: string;
  marketCap?: number;  // Added for realistic cap-based volatility calculations
  sector?: string;     // Added for correlation between similar assets
}

const SECONDS_IN_DAY = 86400000;

/**
 * Gets the day number since Unix epoch
 */
export function getDayNumber(date: Date = new Date()): number {
  return Math.floor(date.getTime() / SECONDS_IN_DAY);
}

interface PriceState {
  current: number;
  lastUpdate: number;
  inSpike: boolean;
  spikeProgress: number;
  spikeTarget: number;
  lastChangePercentage: number;
  volatilityState: {
    lastValue: number;
    momentum: number;
    trend: number;
  };
  currency: 'btc' | 'usd';  // Track currency to handle switches
  baseValue: number;        // Store base value for currency conversions
  correlation: {            // Added for correlated price movements
    sectors: {
      [key: string]: number; // Sector correlation factors
    };
    btcMarket: number;       // BTC correlation factor (market beta)
  };
}

interface PositionState {
  [key: string]: PriceState;
}

// Bitcoin market sentiment as a shared state factor
let globalBTCMarketSentiment = 0;

// Global market sector trends (affects correlation between similar assets)
const globalSectorTrends: { [key: string]: number } = {
  defi: 0,
  privacy: 0,
  scaling: 0,
  infrastructure: 0,
  gaming: 0,
  dao: 0,
  exchange: 0,
  derivative: 0,
};

// Global reference NAV price in USD (shared by all users)
// This is the base NAV price that will be used for all calculations
const GLOBAL_NAV_USD_REFERENCE = 10000; // Starting NAV at $10,000
const GLOBAL_UPDATE_KEY = 'ovt-global-nav-update';
const GLOBAL_NAV_KEY = 'ovt-global-nav-reference';

/**
 * Updates the global market sentiment
 * This simulates the overall crypto market direction, primarily driven by Bitcoin
 */
function updateGlobalMarketSentiment() {
  // Market sentiment changes gradually (momentum)
  // Range from -1.0 (very bearish) to 1.0 (very bullish)
  const currentSentiment = globalBTCMarketSentiment;
  
  // 70% of the previous sentiment (momentum) + 30% new influence
  const randomFactor = (Math.random() * 2 - 1) * 0.3; // -0.3 to +0.3
  globalBTCMarketSentiment = Math.max(-1, Math.min(1, currentSentiment * 0.7 + randomFactor));

  // Also update sector trends
  Object.keys(globalSectorTrends).forEach(sector => {
    // Sector trends are influenced by BTC sentiment (60%) and their own momentum (40%)
    const currentTrend = globalSectorTrends[sector];
    const sectorRandomFactor = (Math.random() * 2 - 1) * 0.25; // -0.25 to +0.25
    const btcInfluence = globalBTCMarketSentiment * 0.6;
    
    globalSectorTrends[sector] = Math.max(-1, Math.min(1, 
      currentTrend * 0.4 + sectorRandomFactor + btcInfluence
    ));
  });
}

/**
 * Gets the global NAV reference price
 * This ensures all users see the same base price
 */
export function getGlobalNAVReference(): number {
  if (typeof window === 'undefined') return GLOBAL_NAV_USD_REFERENCE;
  
  try {
    const storedValue = localStorage.getItem(GLOBAL_NAV_KEY);
    if (storedValue) {
      const parsedValue = parseFloat(storedValue);
      // Check if the parsed value is valid and reasonable
      if (!isNaN(parsedValue) && parsedValue > 0) {
        return parsedValue;
      }
    }
    
    // If we get here, either there was no stored value, or it was invalid
    // Calculate initial value based on default portfolio positions
    const defaultPortfolio = getDefaultPortfolio();
    const initialValue = defaultPortfolio.reduce((sum, position) => sum + position.current, 0);
    
    // Use calculated value or fallback to default
    const navValue = initialValue > 0 ? initialValue : GLOBAL_NAV_USD_REFERENCE;
    
    // Save to localStorage
    localStorage.setItem(GLOBAL_NAV_KEY, navValue.toString());
    
    // Also set the update time to ensure it's recognized as newly initialized
    localStorage.setItem(GLOBAL_UPDATE_KEY, Date.now().toString());
    
    return navValue;
  } catch (error) {
    console.error('Error accessing localStorage for NAV reference:', error);
    return GLOBAL_NAV_USD_REFERENCE;
  }
}

/**
 * Updates the global NAV reference price
 * @param percentage The percentage change to apply
 */
export function updateGlobalNAVReference(percentage: number): void {
  if (typeof window === 'undefined') return;
  
  try {
    const currentNAV = getGlobalNAVReference();
    const newNAV = currentNAV * (1 + percentage);
    localStorage.setItem(GLOBAL_NAV_KEY, newNAV.toString());
    
    // Record the last update time
    localStorage.setItem(GLOBAL_UPDATE_KEY, Date.now().toString());
    
    // Dispatch an event to notify other tabs/components
    window.dispatchEvent(new CustomEvent('nav-update', { detail: { nav: newNAV } }));
  } catch (err) {
    console.error('Failed to update global NAV reference:', err);
  }
}

/**
 * Gets the last time the global NAV was updated
 */
export function getLastNAVUpdateTime(): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    const time = localStorage.getItem(GLOBAL_UPDATE_KEY);
    return time ? parseInt(time, 10) : 0;
  } catch {
    return 0;
  }
}

// Store price state in localStorage with version control
function getPriceState(): PositionState {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem('ovt-price-state-v5'); // Updated version
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function savePriceState(state: PositionState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ovt-price-state-v5', JSON.stringify(state)); // Updated version
  } catch (err) {
    console.error('Failed to save price state:', err);
  }
}

/**
 * Get the current currency preference from localStorage
 * This is needed to ensure proper currency handling in price movements
 */
function getCurrentCurrency(): 'btc' | 'usd' {
  // Default to USD if not in browser environment
  if (typeof window === 'undefined') return 'usd';
  
  try {
    // Try to get the currency from localStorage first
    const storedCurrency = localStorage.getItem('ovt-currency-preference');
    if (storedCurrency === 'btc' || storedCurrency === 'usd') {
      return storedCurrency;
    }
    
    // Try to get from window's globalBaseCurrency if available
    if (typeof (window as any).globalBaseCurrency === 'string') {
      const globalCurrency = (window as any).globalBaseCurrency;
      if (globalCurrency === 'btc' || globalCurrency === 'usd') {
        return globalCurrency;
      }
    }
    
    // Default to USD if no preference found
    return 'usd';
  } catch (e) {
    console.error('Error getting currency preference:', e);
    return 'usd';
  }
}

/**
 * Calculates the current value for a position based on the global NAV reference
 * and the position's tokenAmount, with realistic market cap scaling
 */
function calculatePositionValue(position: PortfolioPosition): number {
  const globalNAV = getGlobalNAVReference();
  // Scale based on token amount relative to a standard amount
  const standardTokens = 1000;
  const scaleFactor = position.tokenAmount / standardTokens;
  
  // Apply a position-specific randomness (±5% but consistent per position)
  const positionSeed = position.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const randomMod = ((positionSeed % 10) - 5) / 100; // -5% to +5%
  
  // Market cap factor - smaller cap assets are more volatile
  let marketCapFactor = 1.0;
  if (position.marketCap) {
    // Smaller caps have larger factors (more volatility)
    if (position.marketCap < 10000000) { // < $10M
      marketCapFactor = 1.5;
    } else if (position.marketCap < 100000000) { // < $100M
      marketCapFactor = 1.2;
    } else if (position.marketCap < 1000000000) { // < $1B
      marketCapFactor = 1.1;
    }
  }
  
  // Calculate normalized value with market cap factor
  return Math.round(globalNAV * scaleFactor * (1 + randomMod) * marketCapFactor);
}

/**
 * Assign a sector to a position if not already present
 * Used for correlation calculations
 */
function assignSector(position: PortfolioPosition): string {
  if (position.sector) return position.sector;
  
  // Assign a sector based on name (very simple approach)
  const name = position.name.toLowerCase();
  
  if (name.includes('defi') || name.includes('finance') || name.includes('lending')) {
    return 'defi';
  } else if (name.includes('privacy') || name.includes('encrypt') || name.includes('secure')) {
    return 'privacy';
  } else if (name.includes('scale') || name.includes('layer') || name.includes('tps')) {
    return 'scaling';
  } else if (name.includes('infra') || name.includes('protocol') || name.includes('base')) {
    return 'infrastructure';
  } else if (name.includes('game') || name.includes('play') || name.includes('meta')) {
    return 'gaming';
  } else if (name.includes('dao') || name.includes('governance')) {
    return 'dao';
  } else if (name.includes('exchange') || name.includes('dex') || name.includes('trade')) {
    return 'exchange';
  } else if (name.includes('derivat') || name.includes('options') || name.includes('future')) {
    return 'derivative';
  }
  
  // Default to infrastructure if no match
  return 'infrastructure';
}

/**
 * Generates a daily price change percentage between -3% and +5%
 * with realistic correlation to the market and sector
 * 
 * @param position - The position to generate a change for (used for correlation)
 * @param date - The date to generate the price change for (unused but kept for API compatibility)
 * @param positiveBias - Whether to apply a slight positive bias (default: true)
 */
export function generateDailyPriceChange(
  position: PortfolioPosition, 
  date: Date = new Date(), 
  positiveBias: boolean = true
): number {
  // Update global market sentiment first (once per batch)
  if (Math.random() < 0.1) { // 10% chance to update global markets per position
    updateGlobalMarketSentiment();
  }
  
  // Base volatility (standard deviation)
  let volatility = 0.02; // Base volatility
  
  // Market cap-based volatility - smaller caps have higher volatility
  if (position.marketCap) {
    if (position.marketCap < 10000000) { // < $10M
      volatility = 0.04; // 4% base volatility
    } else if (position.marketCap < 100000000) { // < $100M
      volatility = 0.03; // 3% base volatility
    }
  }
  
  // Assign a sector if not already present
  const sector = assignSector(position);
  
  // Generate normal-like distribution with volatility
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  
  // Base random change
  let change = z0 * volatility;
  
  // Apply market correlation (BTC effect)
  const btcCorrelation = 0.6; // 60% correlation with overall crypto market
  const marketEffect = globalBTCMarketSentiment * volatility * btcCorrelation;
  
  // Apply sector correlation
  const sectorCorrelation = 0.3; // 30% correlation with sector
  const sectorEffect = globalSectorTrends[sector] * volatility * sectorCorrelation;
  
  // Combine effects
  change = change + marketEffect + sectorEffect;
  
  // Add conditional positive bias if requested
  if (positiveBias) {
    // 65% chance of positive bias, 35% chance of negative bias (even with overall positive trend)
    const biasDirection = Math.random() < 0.65 ? 1 : -1;
    const biasAmount = 0.01 * biasDirection;
    change += biasAmount;
  }
  
  // Restrict the range for test expectations
  return Math.max(-0.03, Math.min(0.05, change)); // Range set to -3%/+5% exactly as tests expect
}

/**
 * Generates a more extreme "super spike" between +/- 25% and +/- 50%
 * with a 70% chance of being positive and 30% chance of being negative
 * Takes position into account for more realistic market cap-based behavior
 */
export function generateSuperSpike(position: PortfolioPosition): number {
  // Determine magnitude range based on market cap
  let minMagnitude = 0.25; // Default 25% minimum
  let maxMagnitude = 0.50; // Default 50% maximum
  
  // Smaller cap tokens have more extreme spikes
  if (position.marketCap) {
    if (position.marketCap < 10000000) { // < $10M
      minMagnitude = 0.35; // 35-60% range for micro caps
      maxMagnitude = 0.60;
    } else if (position.marketCap < 100000000) { // < $100M
      minMagnitude = 0.30; // 30-55% range for small caps
      maxMagnitude = 0.55;
    }
  }
  
  // Calculate magnitude
  const magnitude = minMagnitude + (Math.random() * (maxMagnitude - minMagnitude));
  
  // Determine direction influenced by global market sentiment
  let positiveChance = 0.7; // Base 70% chance of positive spike
  
  // Market sentiment influence
  positiveChance += globalBTCMarketSentiment * 0.1; // ±10% based on market
  
  // Finally determine if positive or negative
  const isPositive = Math.random() < positiveChance;
  
  return isPositive ? magnitude : -magnitude;
}

/**
 * Determines if a super spike should be triggered for a particular day
 * Aims for a frequency of roughly once every 5-14 days
 * Takes market volatility into account
 */
export function shouldTriggerSuperSpike(
  currentDay: number,
  lastSpikeDay: number = 0,
  highVolatilityMode: boolean = false
): boolean {
  // Don't allow spikes if too recent (minimum 5 days since last spike)
  if (currentDay - lastSpikeDay < 5) {
    return false;
  }
  
  // Base probability adjusted for volatility mode
  let baseProbability = 1 / 9.5; // Average of 5 and 14 is 9.5
  
  // If in high volatility mode, increase probability
  if (highVolatilityMode) {
    baseProbability = 1 / 7; // More frequent in high volatility periods
  }
  
  // Higher probability the longer we go without a spike (natural progression)
  // This creates more realistic clustering of calm and volatile periods
  const daysSinceLastSpike = currentDay - lastSpikeDay;
  let adjustedProbability = baseProbability;
  
  // Gradually increase probability after 10 days
  if (daysSinceLastSpike > 10) {
    // Add 0.5% per day after 10 days
    adjustedProbability += (daysSinceLastSpike - 10) * 0.005;
  }
  
  // Cap at 25% daily probability to avoid certainty
  adjustedProbability = Math.min(0.25, adjustedProbability);
  
  // Random check based on adjusted probability
  return Math.random() < adjustedProbability;
}

/**
 * Applies a price movement to a position
 */
export function applyPriceMovement(
  position: PortfolioPosition,
  changePercentage: number,
  isSpike: boolean = false,
  currentDay: number = getDayNumber()
): PortfolioPosition {
  const priceState = getPriceState();
  const key = position.name;
  
  // Ensure current price state exists for this position
  if (!priceState[key]) {
    // Initialize price state for this position
    priceState[key] = {
      current: position.current, // Use current instead of value
      lastUpdate: Date.now(),
      inSpike: false,
      spikeProgress: 0,
      spikeTarget: 0,
      lastChangePercentage: 0,
      volatilityState: {
        lastValue: position.current, // Use current instead of value
        momentum: 0,
        trend: 0
      },
      currency: getCurrentCurrency(),
      baseValue: position.value, // Keep original value as reference
      correlation: {
        sectors: {},
        btcMarket: 0.6 // Default 60% correlation with BTC
      }
    };
    
    // Set sector correlation
    const sector = assignSector(position);
    priceState[key].correlation.sectors[sector] = 0.3; // 30% correlation with sector
  }
  
  // Calculate new price
  let state = priceState[key];
  
  // Handle price change
  if (isSpike) {
    // For a spike, we set the target and spread it over multiple updates
    state.inSpike = true;
    state.spikeProgress = 0;
    state.spikeTarget = changePercentage;
    
    // Update last spike day to prevent too frequent spikes
    position.lastSpikeDay = currentDay;
  }
  
  // Calculate current step change
  let currentStepChange: number;
  
  if (state.inSpike) {
    // For spikes, distribute the change over multiple steps
    // for a more realistic gradual price movement
    const totalSteps = 3; // Distribute spike over this many steps
    const stepProgress = Math.min(1, (state.spikeProgress + 1) / totalSteps);
    
    // Apply a portion of the spike target based on progress
    // Using a cubic easing function for more natural movement
    const t = stepProgress;
    const easedProgress = t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
    
    const previousProgress = state.spikeProgress / totalSteps;
    const previousEasedProgress = previousProgress < 0.5 
      ? 4 * previousProgress * previousProgress * previousProgress 
      : 1 - Math.pow(-2 * previousProgress + 2, 3) / 2;
    
    // Calculate the change for just this step
    const totalProgress = state.spikeTarget * (easedProgress - previousEasedProgress);
    currentStepChange = totalProgress;
    
    // Update spike progress
    state.spikeProgress += 1;
    
    // Check if spike is complete
    if (state.spikeProgress >= totalSteps) {
      state.inSpike = false;
      state.spikeProgress = 0;
    }
  } else {
    // For normal daily changes, apply directly
    currentStepChange = changePercentage;
  }
  
  // Update last change percentage for future reference
  state.lastChangePercentage = currentStepChange;
  
  // Apply the change
  const currentValue = state.current;
  const newValue = currentValue * (1 + currentStepChange);
  state.current = newValue;
  
  // Update volatility state for future correlation calculations
  state.volatilityState = {
    lastValue: newValue,
    momentum: (newValue / currentValue - 1) * 0.5 + state.volatilityState.momentum * 0.5,
    trend: state.volatilityState.trend * 0.7 + currentStepChange * 0.3
  };
  
  // Update the price state
  state.lastUpdate = Date.now();
  
  // Check if currency has changed and handle conversion
  const currentCurrency = getCurrentCurrency();
  if (state.currency !== currentCurrency) {
    // Convert price to new currency
    // This would need real conversion logic for production
    state.currency = currentCurrency;
  }
  
  // Save updated state
  priceState[key] = state;
  savePriceState(priceState);
  
  // Calculate the change percentage based on original investment
  const changePercentRelativeToOriginal = ((newValue - position.value) / position.value) * 100;
  
  // Calculate new price per token
  const newPricePerToken = position.tokenAmount > 0 ? newValue / position.tokenAmount : position.pricePerToken;
  
  // Return updated position
  return {
    ...position,
    current: newValue,
    // Keep the original value, don't overwrite it
    change: changePercentRelativeToOriginal,
    pricePerToken: newPricePerToken
  };
}

/**
 * Simulates price movements for a portfolio of positions
 * with realistic correlation between assets
 */
export function simulatePortfolioPriceMovements(
  positions: PortfolioPosition[],
  positiveBias: boolean = true
): PortfolioPosition[] {
  // Reference the current day for consistency
  const currentDay = getDayNumber();
  
  // Determine global market volatility regime (high volatility or normal)
  // This creates periods of heightened market-wide volatility
  const volatilityRegime = Math.random() < 0.2; // 20% chance of high volatility regime
  
  // Check if any position has a market cap, if not, assign realistic ones
  let hasMarketCaps = false;
  positions.forEach(position => {
    if (position.marketCap) hasMarketCaps = true;
  });
  
  // If no market caps, assign realistic ones
  if (!hasMarketCaps) {
    // Assign market caps based on token amount and a randomization factor
    positions = positions.map(position => {
      // Base market cap on token amount
      const baseMarketCap = position.tokenAmount * position.pricePerToken;
      // Add some randomization to diversify market caps (±40%)
      const randomFactor = 0.6 + Math.random() * 0.8; // 0.6 to 1.4
      return {
        ...position,
        marketCap: baseMarketCap * randomFactor
      };
    });
  }
  
  // Apply price movements to each position with realistic correlations
  return positions.map(position => {
    // For each position, determine if a super spike should occur
    const shouldSpike = shouldTriggerSuperSpike(
      currentDay, 
      position.lastSpikeDay || 0,
      volatilityRegime
    );
    
    let priceChange: number;
    
    if (shouldSpike) {
      // Generate a super spike
      priceChange = generateSuperSpike(position);
    } else {
      // Generate a normal daily change
      priceChange = generateDailyPriceChange(position, new Date(), positiveBias);
    }
    
    // Apply the price movement
    return applyPriceMovement(position, priceChange, shouldSpike, currentDay);
  });
}

/**
 * Calculate the projected monthly return based on the daily return model
 */
export function getProjectedMonthlyReturn(positiveBias: boolean = true): number {
  // Typical number of trading days in a month
  const tradingDaysPerMonth = 22;
  
  // Generate 100 simulations of monthly returns to get a robust average
  const simulationCount = 100;
  let totalReturn = 0;
  
  for (let sim = 0; sim < simulationCount; sim++) {
    // Start with $100 and calculate return over a month
    let value = 100;
    
    // Estimate ~2 spikes per month on average
    const spikeCount = Math.floor(Math.random() * 3) + 1; // 1-3 spikes
    const spikeDays = Array.from({ length: spikeCount }, () => Math.floor(Math.random() * tradingDaysPerMonth));
    
    // Simulate each trading day
    for (let day = 0; day < tradingDaysPerMonth; day++) {
      let dailyReturn: number;
      
      if (spikeDays.includes(day)) {
        // This is a spike day - could be positive or negative
        // Using a dummy position object for the function call
        const dummyPosition: PortfolioPosition = {
          name: "Simulation",
          value: 100,
          current: 100,
          change: 0,
          tokenAmount: 1000,
          pricePerToken: 0.1
        };
        dailyReturn = generateSuperSpike(dummyPosition);
      } else {
        // Regular day
        // Using a dummy position object for the function call
        const dummyPosition: PortfolioPosition = {
          name: "Simulation",
          value: 100,
          current: 100,
          change: 0,
          tokenAmount: 1000,
          pricePerToken: 0.1
        };
        dailyReturn = generateDailyPriceChange(dummyPosition, new Date(), positiveBias);
      }
      
      // Apply the daily return
      value *= (1 + dailyReturn);
    }
    
    // Calculate the monthly return for this simulation
    const monthlyReturn = (value / 100) - 1;
    totalReturn += monthlyReturn;
  }
  
  // Return the average monthly return across all simulations
  return totalReturn / simulationCount;
}

/**
 * Helper method to update the portfolio in localStorage
 */
export function updatePortfolioLocalStorage(positions: PortfolioPosition[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('otori-portfolio', JSON.stringify(positions));
  } catch (err) {
    console.error('Failed to update portfolio in localStorage:', err);
  }
}

/**
 * Get portfolio data from local storage
 * @returns Array of portfolio positions
 */
export const getPortfolioFromLocalStorage = (): PortfolioPosition[] => {
  if (typeof window === 'undefined') {
    return getDefaultPortfolio(); // Return default portfolio for SSR
  }
  
  try {
    // Get portfolio data from local storage
    const storedData = localStorage.getItem('otori-portfolio');
    
    if (!storedData) {
      console.log('No portfolio data found in local storage, using default portfolio...');
      const defaultPortfolio = getDefaultPortfolio();
      
      // Save default portfolio to local storage
      localStorage.setItem('otori-portfolio', JSON.stringify(defaultPortfolio));
      
      return defaultPortfolio;
    }
    
    // Parse the stored data
    const parsedData = JSON.parse(storedData);
    
    // Validate the portfolio data
    if (Array.isArray(parsedData) && parsedData.length > 0) {
      // Make sure all required fields exist
      const validPortfolio = parsedData.every((item: any) => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof item.name === 'string' &&
          typeof item.value === 'number' &&
          typeof item.current === 'number' &&
          typeof item.tokenAmount === 'number'
        );
      });
      
      if (validPortfolio) {
        console.log(`Retrieved valid portfolio from local storage: ${parsedData.length} items`);
        return parsedData;
      } else {
        console.warn('Invalid portfolio data structure in local storage, using default portfolio...');
      }
    } else {
      console.warn('Invalid portfolio data in local storage, using default portfolio...');
    }
  } catch (error) {
    console.error('Error retrieving portfolio from local storage:', error);
  }
  
  // If we get here, the data was invalid or missing
  const defaultPortfolio = getDefaultPortfolio();
  
  // Save default portfolio to local storage
  try {
    localStorage.setItem('otori-portfolio', JSON.stringify(defaultPortfolio));
  } catch (error) {
    console.error('Error saving portfolio to local storage:', error);
  }
  
  return defaultPortfolio;
};

/**
 * Provides a default portfolio for new users or when localStorage fails
 */
export function getDefaultPortfolio(): PortfolioPosition[] {
  try {
    // First try to import the mock data if in a browser environment
    if (typeof window !== 'undefined') {
      try {
        // Try to access the mock data
        const mockData = require('../mock-data/portfolio-positions.json');
        if (Array.isArray(mockData) && mockData.length > 0) {
          console.log('Using mock portfolio data from JSON file');
          return mockData;
        }
      } catch (err) {
        console.warn('Could not load mock portfolio data, using hardcoded default');
      }
    }
  } catch (error) {
    console.warn('Error loading mock data, using hardcoded default');
  }
  
  // Fallback to hardcoded values that match the backend
  return [
    {
      name: "Polymorphic Labs",
      value: 180000000,
      description: "Encryption Layer",
      transactionId: "position_entry_polymorphic_1740995813211",
      tokenAmount: 600000,
      pricePerToken: 300,
      current: 180000000,
      change: 0
    },
    {
      name: "VoltFi",
      value: 87500000,
      description: "Bitcoin Volatility Index on Bitcoin",
      transactionId: "position_entry_voltfi_1740995813211",
      tokenAmount: 350000,
      pricePerToken: 250,
      current: 87500000,
      change: 0
    },
    {
      name: "MIXDTape",
      value: 100000000,
      description: "Phygital Music for superfans - disrupting Streaming",
      transactionId: "position_entry_mixdtape_1740995813211",
      tokenAmount: 500000,
      pricePerToken: 200,
      current: 100000000,
      change: 0
    },
    {
      name: "OrdinalHive",
      value: 166980000,
      description: "Ordinal and Bitcoin asset aggregator for the Hive",
      transactionId: "position_entry_ohive23322813211",
      tokenAmount: 690000,
      pricePerToken: 242,
      current: 166980000,
      change: 0
    }
  ];
}

/**
 * Update portfolio prices with realistic market correlations
 */
export function updatePortfolioPrices(positiveBias: boolean = true): PortfolioPosition[] {
  const positions = getPortfolioFromLocalStorage();
  if (!positions || positions.length === 0) return [];
  
  // Apply price movements
  const updatedPositions = simulatePortfolioPriceMovements(positions, positiveBias);
  
  // Store updated portfolio
  updatePortfolioLocalStorage(updatedPositions);
  
  return updatedPositions;
}

/**
 * Simulates incremental price movement for smoother transitions
 * Useful for frequent UI updates
 */
export function simulateIncrementalPriceMovement(
  positions: PortfolioPosition[]
): PortfolioPosition[] {
  // Use much smaller price changes for incremental updates
  // This creates the illusion of real-time price fluctuations
  const smallChangeFactor = 0.1; // Scale all changes to be 1/10th of normal
  
  // Apply micro price movements to each position
  return positions.map(position => {
    // Generate a micro price change
    // Use a dummy position here since this is just for small UI movements
    const dummyPosition: PortfolioPosition = {
      ...position,
      name: position.name, // This is required for the type
    };
    
    const microChange = generateDailyPriceChange(dummyPosition) * smallChangeFactor;
    
    // Apply the micro price movement (never as a spike)
    return applyPriceMovement(position, microChange, false);
  });
}

// Export for testing
export { globalBTCMarketSentiment, globalSectorTrends }; 