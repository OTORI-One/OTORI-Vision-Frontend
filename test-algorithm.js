/**
 * Simple test script for the price movement algorithm
 * Using plain JavaScript to avoid module system issues
 */

console.log("Script starting...");

// Mock portfolio position for testing
const testPosition = {
  name: "OVT Token",
  value: 1000000,
  current: 1000000,
  change: 0,
  tokenAmount: 1000,
  pricePerToken: 1000,
  lastSpikeDay: 0
};

// Simple implementation of core algorithm functions
function generateDailyPriceChange(date, positiveBias = true) {
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
  
  // Clamp values to desired range
  return Math.max(-0.03, Math.min(0.05, change));
}

function generateSuperSpike() {
  // Generate magnitude between 0.25 (25%) and 0.50 (50%)
  const magnitude = 0.25 + (Math.random() * 0.25);
  
  // Determine direction (70% positive, 30% negative)
  const isPositive = Math.random() < 0.7;
  
  // Return signed magnitude
  return isPositive ? magnitude : -magnitude;
}

function shouldTriggerSuperSpike(currentDay, lastSpikeDay = 0) {
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

function applyPriceMovement(position, changePercentage, isSpike = false, currentDay = Math.floor(Date.now() / 86400000)) {
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

// Helper function to format value as currency
function formatValue(value) {
  return '$' + (value / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parse command line arguments
const args = process.argv.slice(2);
const daysToSimulate = parseInt(args.find(arg => arg.startsWith('--days='))?.split('=')[1] || '30');
const verbose = args.includes('--verbose');
const positiveBias = !args.includes('--no-positive-bias'); // Use positive bias unless explicitly disabled

console.log(`Args: ${args.join(', ')}`);
console.log(`Days to simulate: ${daysToSimulate}`);
console.log(`Verbose: ${verbose}`);
console.log(`Positive bias: ${positiveBias}`);

// Initialize testing position
let position = { ...testPosition };
console.log(`\n=== Price Movement Algorithm Test ===`);
console.log(`Simulating ${daysToSimulate} days with${positiveBias ? '' : 'out'} positive bias`);
console.log(`Initial position: ${position.name} = ${formatValue(position.current)}`);

// Track price history and spikes
const priceHistory = [position.current];
const spikeEvents = [];

// Simulate each day
for (let day = 1; day <= daysToSimulate; day++) {
  const lastSpikeDay = position.lastSpikeDay || 0;
  const shouldSpike = shouldTriggerSuperSpike(day, lastSpikeDay);
  
  // Generate appropriate price change
  const changePercentage = shouldSpike 
    ? generateSuperSpike() 
    : generateDailyPriceChange(new Date(), positiveBias);
  
  // Apply the price movement
  const previousValue = position.current;
  position = applyPriceMovement(position, changePercentage, shouldSpike, day);
  
  // Track values
  priceHistory.push(position.current);
  
  // Track spikes
  if (shouldSpike) {
    spikeEvents.push({ 
      day, 
      change: changePercentage * 100
    });
    
    if (verbose) {
      console.log(`  Day ${day}: SPIKE! ${changePercentage >= 0 ? '+' : ''}${(changePercentage * 100).toFixed(2)}%`);
    }
  } else if (verbose) {
    const dailyChange = ((position.current - previousValue) / previousValue) * 100;
    console.log(`  Day ${day}: ${formatValue(position.current)} (${dailyChange >= 0 ? '+' : ''}${dailyChange.toFixed(2)}%)`);
  }
}

// Calculate statistics
const initialValue = testPosition.current;
const finalValue = position.current;
const overallReturn = ((finalValue - initialValue) / initialValue) * 100;

// Calculate volatility from daily returns
const dailyReturns = [];
for (let i = 1; i < priceHistory.length; i++) {
  const dailyReturn = (priceHistory[i] - priceHistory[i-1]) / priceHistory[i-1];
  dailyReturns.push(dailyReturn);
}

const meanReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length;
const stdDev = Math.sqrt(variance);
const annualizedVolatility = stdDev * Math.sqrt(365) * 100;
const sharpeRatio = meanReturn / stdDev * Math.sqrt(365);

// Print results
console.log(`\n=== Results after ${daysToSimulate} days ===`);
console.log(`Final value: ${formatValue(finalValue)}`);
console.log(`Overall return: ${overallReturn >= 0 ? '+' : ''}${overallReturn.toFixed(2)}%`);
console.log(`Number of spikes: ${spikeEvents.length}`);
console.log(`Annualized volatility: ${annualizedVolatility.toFixed(2)}%`);
console.log(`Sharpe ratio: ${sharpeRatio.toFixed(2)}`);
console.log(`\nTest completed successfully!`); 