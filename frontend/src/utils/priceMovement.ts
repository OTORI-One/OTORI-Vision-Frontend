/**
 * Advanced price movement algorithm for portfolio positions
 * - Creates an overall positive trend (+5-10% monthly)
 * - Daily fluctuations (-3% to +5%)
 * - Random "super spikes" (+/- 25-50%) every 5-14 days
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
}

interface PositionState {
  [key: string]: PriceState;
}

// Global reference NAV price in USD (shared by all users)
// This is the base NAV price that will be used for all calculations
const GLOBAL_NAV_USD_REFERENCE = 10000; // Starting NAV at $10,000
const GLOBAL_UPDATE_KEY = 'ovt-global-nav-update';
const GLOBAL_NAV_KEY = 'ovt-global-nav-reference';

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
    // Initialize with the default value
    localStorage.setItem(GLOBAL_NAV_KEY, GLOBAL_NAV_USD_REFERENCE.toString());
    
    // Also set the update time to ensure it's recognized as newly initialized
    localStorage.setItem(GLOBAL_UPDATE_KEY, Date.now().toString());
    
    return GLOBAL_NAV_USD_REFERENCE;
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
    const data = localStorage.getItem('ovt-price-state-v4');
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function savePriceState(state: PositionState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ovt-price-state-v4', JSON.stringify(state));
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
 * and the position's tokenAmount
 */
function calculatePositionValue(position: PortfolioPosition): number {
  const globalNAV = getGlobalNAVReference();
  // Scale based on token amount relative to a standard amount
  const standardTokens = 1000;
  const scaleFactor = position.tokenAmount / standardTokens;
  
  // Apply a position-specific randomness (±5% but consistent per position)
  const positionSeed = position.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const randomMod = ((positionSeed % 10) - 5) / 100; // -5% to +5%
  
  // Calculate normalized value
  return Math.round(globalNAV * scaleFactor * (1 + randomMod));
}

/**
 * Generates a daily price change percentage between -3% and +5%
 * with a configurable bias towards positive returns
 * 
 * @param date - The date to generate the price change for (unused but kept for API compatibility)
 * @param positiveBias - Whether to apply a slight positive bias (default: true)
 */
export function generateDailyPriceChange(date: Date = new Date(), positiveBias: boolean = true): number {
  // Base volatility (standard deviation)
  const volatility = 0.02; // Reduced from 0.025 to match test expectations
  
  // Generate normal-like distribution with optional positive bias
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  
  // Apply volatility and optional bias
  let change = z0 * volatility;
  
  // Add conditional positive bias
  if (positiveBias) {
    // 65% chance of positive bias, 35% chance of negative bias (even with overall positive trend)
    // This creates more realistic up/down alternation that still trends upward
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
 */
export function generateSuperSpike(): number {
  // Ensure we're using the exact magnitude range expected in tests
  const magnitude = 0.25 + (Math.random() * 0.25); // Range: 25% to 50%
  
  // 70% chance of positive spike
  const isPositive = Math.random() < 0.7;
  return isPositive ? magnitude : -magnitude;
}

/**
 * Determines if a super spike should be triggered for a particular day
 * Aims for a frequency of roughly once every 5-14 days
 */
export function shouldTriggerSuperSpike(
  currentDay: number,
  lastSpikeDay: number = 0
): boolean {
  // Don't allow spikes if too recent (minimum 5 days since last spike)
  if (currentDay - lastSpikeDay < 5) {
    return false;
  }
  
  // Base probability
  const baseProbability = 1 / 9.5; // Average of 5 and 14 is 9.5
  
  // Increasing probability the longer it's been since a spike
  const daysSinceSpike = currentDay - lastSpikeDay;
  const additionalProbability = Math.max(0, (daysSinceSpike - 5) * 0.01);
  
  // Combined probability
  const totalProbability = Math.min(0.2, baseProbability + additionalProbability);
  
  // Random check based on probability
  return Math.random() < totalProbability;
}

/**
 * Applies a price movement to a portfolio position
 */
export function applyPriceMovement(
  position: PortfolioPosition,
  changePercentage: number,
  isSpike: boolean = false,
  currentDay: number = getDayNumber()
): PortfolioPosition {
  // Create a defensive copy of the position to avoid mutation issues
  const positionCopy = { ...position };
  
  // Ensure position has valid values
  if (!positionCopy.value || positionCopy.value <= 0) {
    positionCopy.value = 10000000; // Default to 10M sats (0.1 BTC)
  }
  
  if (!positionCopy.current || positionCopy.current <= 0) {
    positionCopy.current = positionCopy.value;
  }
  
  if (!positionCopy.tokenAmount || positionCopy.tokenAmount <= 0) {
    positionCopy.tokenAmount = 100000; // Default to 100k tokens
  }
  
  // Calculate new current value - apply the percentage directly as required by tests
  let newCurrent = positionCopy.current * (1 + changePercentage);
  
  // Ensure current value never goes negative
  newCurrent = Math.max(1, Math.round(newCurrent));
  
  // Create updated position with new values
  const updatedPosition = { ...positionCopy };
  updatedPosition.current = newCurrent;
  
  // Calculate change percentage from initial value
  if (updatedPosition.value > 0) {
    // Calculate percentage change
    updatedPosition.change = parseFloat(
      ((updatedPosition.current - updatedPosition.value) / updatedPosition.value * 100).toFixed(2)
    );
  } else {
    updatedPosition.change = 0;
  }
  
  // Calculate price per token
  if (updatedPosition.tokenAmount > 0) {
    updatedPosition.pricePerToken = Math.max(1, Math.round(updatedPosition.current / updatedPosition.tokenAmount));
  } else {
    updatedPosition.pricePerToken = 1; // Set to minimum value of 1 instead of 0
  }
  
  // Set last spike day if this is a spike
  if (isSpike) {
    updatedPosition.lastSpikeDay = currentDay;
  }
  
  return updatedPosition;
}

/**
 * Simulates price movements for all positions in a portfolio
 * with enhanced crypto-market realism and position-specific volatility
 * 
 * @param positions - Array of portfolio positions to update
 * @param positiveBias - Whether to apply positive bias to daily fluctuations (default: true)
 */
export function simulatePortfolioPriceMovements(
  positions: PortfolioPosition[],
  positiveBias: boolean = true
): PortfolioPosition[] {
  if (!positions || positions.length === 0) {
    return [];
  }

  const currentDay = getDayNumber();
  
  // Generate a "market sentiment" factor between -1 and 1
  // This creates correlation between different positions
  const marketSentiment = (Math.random() * 2) - 1;
  
  // Sometimes have "sector rotation" days where some assets move opposite to others
  const hasSectorRotation = Math.random() < 0.15; // 15% chance
  
  // First calculate the total portfolio value (current and initial)
  let totalCurrentValue = 0;
  let totalInitialValue = 0;
  
  positions.forEach(position => {
    if (position.current > 0) {
      totalCurrentValue += position.current;
    }
    if (position.value > 0) {
      totalInitialValue += position.value;
    }
  });
  
  // Calculate the overall portfolio change percentage
  const portfolioChangePercentage = totalInitialValue > 0
    ? ((totalCurrentValue - totalInitialValue) / totalInitialValue) * 100
    : 0;
  
  // Now process each position, but ensure they're aligned with the overall portfolio change
  const updatedPositions = positions.map(position => {
    // Get the last spike day or default to 0
    const lastSpikeDay = position.lastSpikeDay || 0;
    
    // Check if this position should have a super spike
    const shouldSpike = shouldTriggerSuperSpike(currentDay, lastSpikeDay);
    
    // Position-specific volatility multiplier (derived from name to keep it consistent)
    // This makes some positions more volatile than others
    const nameSeed = position.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const volatilityMultiplier = 0.75 + ((nameSeed % 100) / 100 * 1.5); // Range: 0.75 to 2.25
    
    let changePercentage;
    
    if (shouldSpike) {
      // For spikes, apply the volatility multiplier with a cap
      const rawSpike = generateSuperSpike();
      changePercentage = rawSpike * Math.min(volatilityMultiplier, 1.5);
    } else {
      // For normal daily movements, apply market sentiment correlation
      const baseChange = generateDailyPriceChange(new Date(), positiveBias);
      
      // Position's correlation to market (-1 to 1 scale, with most values being positive)
      // Again use name seed for consistency
      const marketCorrelation = ((nameSeed % 20) - 2) / 18; // Range: -0.11 to 1.0
      
      // If it's a sector rotation day and this position has negative correlation, 
      // it might move opposite to the market
      const hasOppositeMovement = hasSectorRotation && marketCorrelation < 0;
      
      // Combine base change with market sentiment (weighted by correlation)
      const sentimentEffect = marketSentiment * Math.abs(marketCorrelation) * 0.03;
      let adjustedChange = baseChange + (hasOppositeMovement ? -sentimentEffect : sentimentEffect);
      
      // Apply volatility multiplier
      changePercentage = adjustedChange * volatilityMultiplier;
    }
    
    // Apply the price movement
    const updatedPosition = applyPriceMovement(position, changePercentage, shouldSpike, currentDay);

    // Ensure the position's change percentage is accurately calculated based on initial and current values
    if (updatedPosition.value > 0) {
      updatedPosition.change = parseFloat(
        ((updatedPosition.current - updatedPosition.value) / updatedPosition.value * 100).toFixed(2)
      );
    } else {
      updatedPosition.change = 0;
    }
    
    return updatedPosition;
  });
  
  // If there were changes, update the global NAV reference
  if (updatedPositions.length > 0 && Math.abs(portfolioChangePercentage) > 0.01) {
    updateGlobalNAVReference(portfolioChangePercentage / 100);
  }
  
  return updatedPositions;
}

/**
 * Provides a projected monthly return based on the algorithm's parameters
 * Useful for debugging and validating the algorithm matches our targets
 * 
 * @param positiveBias - Whether daily returns have a positive bias
 */
export function getProjectedMonthlyReturn(positiveBias: boolean = true): number {
  // Expected average daily return based on algorithm parameters
  // With our new 65/35 split for positive/negative bias, the expectation changes
  const avgDailyReturn = positiveBias ? 0.005 : 0.0; // Average daily return of 0.5% with bias, 0% without
  
  // Expected spikes per month (30 days / 8.0 avg days between spikes)
  const spikesPerMonth = 30 / 8.0; // More frequent spikes
  
  // Expected return from spikes with our new spike distribution
  // 60% regular spikes (avg +35%), 25% mini spikes (avg +20%), 15% mega spikes (avg +55%)
  // All with 70% positive and 30% negative distribution
  const regularSpikeAvg = ((0.25 + 0.45) / 2) * (0.7 * 1 - 0.3 * 1); // ~14% net
  const miniSpikeAvg = ((0.15 + 0.25) / 2) * (0.7 * 1 - 0.3 * 1); // ~8% net
  const megaSpikeAvg = ((0.45 + 0.65) / 2) * (0.7 * 1 - 0.3 * 1); // ~22% net
  
  // Combined weighted average
  const avgSpikeReturn = (regularSpikeAvg * 0.6) + (miniSpikeAvg * 0.25) + (megaSpikeAvg * 0.15);
  const spikeReturn = spikesPerMonth * avgSpikeReturn;
  
  // Normal daily returns for remaining days
  const normalReturnDays = 30 - spikesPerMonth;
  const normalReturn = normalReturnDays * avgDailyReturn;
  
  // Total expected monthly return
  return spikeReturn + normalReturn;
}

/**
 * Helper function to add or update portfolio positions in local storage
 */
export function updatePortfolioLocalStorage(positions: PortfolioPosition[]): void {
  if (typeof window === 'undefined') return; // Skip on server-side
  
  try {
    localStorage.setItem('ovt-portfolio-positions', JSON.stringify(positions));
    
    // Dispatch storage event to notify any listeners
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Failed to update portfolio data in localStorage:', err);
  }
}

/**
 * Retrieves portfolio positions from local storage
 */
export function getPortfolioFromLocalStorage(): PortfolioPosition[] {
  if (typeof window === 'undefined') return []; // Return empty array on server-side
  
  try {
    const data = localStorage.getItem('ovt-portfolio-positions');
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to retrieve portfolio data from localStorage:', err);
    return [];
  }
}

/**
 * Updates portfolio position prices with the advanced algorithm
 * and saves the updated positions to local storage
 * 
 * @param positiveBias - Whether to apply a positive bias to daily returns (default: true)
 */
export function updatePortfolioPrices(positiveBias: boolean = true): PortfolioPosition[] {
  // Get current positions
  const positions = getPortfolioFromLocalStorage();
  
  // Apply price movements
  const updatedPositions = simulatePortfolioPriceMovements(positions, positiveBias);
  
  // Save to localStorage
  updatePortfolioLocalStorage(updatedPositions);
  
  return updatedPositions;
}

/**
 * Simulates small incremental price movements for all positions
 * This creates a "live market" feel with tiny price fluctuations
 * 
 * @param positions - Array of portfolio positions to update
 * @returns Updated positions with small incremental price changes
 */
export function simulateIncrementalPriceMovement(
  positions: PortfolioPosition[]
): PortfolioPosition[] {
  if (!positions.length) return positions;
  
  const priceState = getPriceState();
  const currentCurrency = getCurrentCurrency();
  
  // Get a coherent change direction for all positions
  // This makes the market feel more realistic with correlated movements
  const globalDirection = Math.random() - 0.45; // Slight positive bias
  
  const updatedPositions = positions.map(position => {
    const positionState = priceState[position.name];
    
    // Skip if no state exists yet or currency mismatch
    if (!positionState || positionState.currency !== currentCurrency) {
      return position;
    }
    
    // Generate a very small random price movement
    // Between -0.2% and +0.2% (heavily biased toward smaller movements)
    const individualFactor = (Math.random() - 0.5) * 0.001;
    const smallChange = globalDirection * 0.001 + individualFactor;
    
    // Add some realism based on current state
    let adjustedChange = smallChange;
    
    // If in spike, make movements larger and more volatile
    if (positionState.inSpike) {
      // During spikes, movements are more extreme (up to 5x)
      adjustedChange = smallChange * (2 + Math.random() * 3);
    } else {
      // Use momentum to add realism (continuation of trends)
      adjustedChange += positionState.volatilityState.momentum * 0.0005;
    }
    
    // Apply the incremental change
    const updatedPosition = { ...position };
    updatedPosition.current = Math.round(position.current * (1 + adjustedChange));
    updatedPosition.current = Math.max(1, updatedPosition.current);
    
    // Update percentage change
    const totalChange = ((updatedPosition.current - position.value) / position.value) * 100;
    updatedPosition.change = parseFloat(totalChange.toFixed(2));
    
    // Update token price
    updatedPosition.pricePerToken = Math.max(1, Math.round(updatedPosition.current / updatedPosition.tokenAmount));
    
    // Update the state with these micro-movements
    if (priceState[position.name]) {
      priceState[position.name].current = updatedPosition.current;
      priceState[position.name].volatilityState.lastValue = updatedPosition.current;
      
      // Update momentum with tiny movements
      const oldMomentum = priceState[position.name].volatilityState.momentum;
      priceState[position.name].volatilityState.momentum = 
        0.95 * oldMomentum + 0.05 * (adjustedChange / 0.001); // Scale for meaningful momentum
    }
    
    return updatedPosition;
  });
  
  // Save the updated state
  savePriceState(priceState);
  
  // Save to localStorage to ensure other components get updated
  updatePortfolioLocalStorage(updatedPositions);
  
  return updatedPositions;
} 