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

/**
 * Generates a daily price change percentage between -3% and +5%
 * with a configurable bias towards positive returns
 * 
 * @param date - The date to generate the price change for (unused but kept for API compatibility)
 * @param positiveBias - Whether to apply a slight positive bias (default: true)
 */
export function generateDailyPriceChange(date: Date = new Date(), positiveBias: boolean = true): number {
  // Base volatility (standard deviation)
  const volatility = 0.02; 
  
  // Generate normal-like distribution with optional positive bias
  // (Box-Muller transform)
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  
  // Apply volatility and optional bias
  let change = z0 * volatility;
  
  // Add a slight positive bias if enabled
  if (positiveBias) {
    change += 0.01; // Shift by +1% for positive bias
  }
  
  // Clamp values to our desired range
  return Math.max(-0.03, Math.min(0.05, change));
}

/**
 * Generates a more extreme "super spike" between +/- 25% and +/- 50%
 * with a 70% chance of being positive and 30% chance of being negative
 */
export function generateSuperSpike(): number {
  // Generate magnitude between 0.25 (25%) and 0.50 (50%)
  const magnitude = 0.25 + (Math.random() * 0.25);
  
  // Determine direction (70% positive, 30% negative)
  const isPositive = Math.random() < 0.7;
  
  // Return signed magnitude
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
  
  // Base probability (adjusted to aim for the 5-14 day range)
  const baseProbability = 1 / 9.5; // Average of 5 and 14 is 9.5
  
  // Increasing probability the longer it's been since a spike
  const daysSinceSpike = currentDay - lastSpikeDay;
  const additionalProbability = Math.max(0, (daysSinceSpike - 5) * 0.01);
  
  // Combined probability (capped to avoid too frequent spikes)
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
  const updatedPosition = { ...position };
  
  // Calculate new current value
  const multiplier = 1 + changePercentage;
  updatedPosition.current = Math.round(position.current * multiplier);
  
  // Ensure current value is never negative
  updatedPosition.current = Math.max(1, updatedPosition.current);
  
  // Calculate percentage change from original value
  const totalChange = ((updatedPosition.current - position.value) / position.value) * 100;
  updatedPosition.change = parseFloat(totalChange.toFixed(2));
  
  // Update token price (ensure it's at least 1)
  updatedPosition.pricePerToken = Math.max(1, Math.round(updatedPosition.current / updatedPosition.tokenAmount));
  
  // Record spike day if this was a spike
  if (isSpike) {
    updatedPosition.lastSpikeDay = currentDay;
  }
  
  return updatedPosition;
}

/**
 * Simulates price movements for all positions in a portfolio
 * 
 * @param positions - Array of portfolio positions to update
 * @param positiveBias - Whether to apply positive bias to daily fluctuations (default: true)
 */
export function simulatePortfolioPriceMovements(
  positions: PortfolioPosition[],
  positiveBias: boolean = true
): PortfolioPosition[] {
  const currentDay = getDayNumber();
  
  return positions.map(position => {
    // Get the last spike day or default to 0
    const lastSpikeDay = position.lastSpikeDay || 0;
    
    // Check if this position should have a super spike
    const shouldSpike = shouldTriggerSuperSpike(currentDay, lastSpikeDay);
    
    // Generate appropriate price change
    const changePercentage = shouldSpike 
      ? generateSuperSpike() 
      : generateDailyPriceChange(new Date(), positiveBias);
    
    // Apply the price movement
    return applyPriceMovement(position, changePercentage, shouldSpike, currentDay);
  });
}

/**
 * Provides a projected monthly return based on the algorithm's parameters
 * Useful for debugging and validating the algorithm matches our targets
 * 
 * @param positiveBias - Whether daily returns have a positive bias
 */
export function getProjectedMonthlyReturn(positiveBias: boolean = true): number {
  // Expected average daily return based on algorithm parameters
  const avgDailyReturn = positiveBias ? 0.01 : 0.0; // Average daily return of 1% with bias, 0% without
  
  // Expected spikes per month (30 days / 9.5 avg days between spikes)
  const spikesPerMonth = 30 / 9.5;
  
  // Expected return from spikes
  // 70% positive spikes (avg +37.5%) and 30% negative spikes (avg -37.5%)
  const avgSpikeReturn = (0.7 * 0.375) - (0.3 * 0.375); // Net positive of about 15%
  const spikeReturn = spikesPerMonth * avgSpikeReturn;
  
  // Normal daily returns for remaining days
  const normalReturnDays = 30 - spikesPerMonth;
  const normalReturn = normalReturnDays * avgDailyReturn;
  
  // Total expected monthly return (compounding would be more accurate
  // but this simplified approach is close enough for our purposes)
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