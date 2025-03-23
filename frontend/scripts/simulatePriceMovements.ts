/**
 * Simulation script for the price movement algorithm
 * 
 * This script simulates price movements for a set of portfolio positions over a period of days.
 * It can be used to test and visualize the behavior of the algorithm.
 * 
 * Usage:
 *   npx ts-node scripts/simulatePriceMovements.ts [--days=N] [--verbose] [--chart] [--no-positive-bias]
 * 
 * Options:
 *   --days=N       Number of days to simulate (default: 30)
 *   --verbose      Display detailed output for each day
 *   --chart        Output CSV data for charting
 *   --no-positive-bias  Disable the positive bias in daily returns
 */

import mockPortfolioData from '../src/mock-data/portfolio-positions.json';
import { 
  PortfolioPosition, 
  generateDailyPriceChange, 
  generateSuperSpike, 
  shouldTriggerSuperSpike, 
  applyPriceMovement 
} from '../src/utils/priceMovement';

// Parse command line arguments
const args = process.argv.slice(2);
const daysToSimulate = parseInt(args.find(arg => arg.startsWith('--days='))?.split('=')[1] || '30');
const verbose = args.includes('--verbose');
const generateChart = args.includes('--chart');
const positiveBias = !args.includes('--no-positive-bias'); // Use positive bias unless explicitly disabled

// Initialize with the mock portfolio data
let currentPositions = [...mockPortfolioData] as PortfolioPosition[];

// Helper function to format value as currency
function formatValue(value: number): string {
  return '$' + (value / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Print initial state
console.log(`\n=== OTORI Vision Token Price Simulation ===`);
console.log(`Simulating ${daysToSimulate} days of price movements with${positiveBias ? '' : 'out'} positive bias`);
console.log(`Initial Portfolio Total: ${formatValue(currentPositions.reduce((sum: number, pos: PortfolioPosition) => sum + pos.current, 0))}`);

if (verbose) {
  console.log('\nInitial Positions:');
  currentPositions.forEach(pos => {
    console.log(`- ${pos.name}: ${formatValue(pos.current)} (${pos.tokenAmount} tokens at ${formatValue(pos.pricePerToken)} each)`);
  });
}

// Arrays to track daily values for each position and spikes
const dailyValues: { [key: string]: number[] } = {};
const spikeEvents: { day: number, position: string, change: number }[] = [];

currentPositions.forEach(pos => {
  dailyValues[pos.name] = [pos.current];
});

// Run the simulation
const dayValues: number[] = [currentPositions.reduce((sum: number, pos: PortfolioPosition) => sum + pos.current, 0)];

// CSV header if requested
if (generateChart) {
  const headers = ['Day', ...currentPositions.map(p => p.name), 'Total'];
  console.log(headers.join(','));
  console.log(['0', ...currentPositions.map(p => p.current), dayValues[0]].join(','));
}

// Simulate each day
for (let day = 1; day <= daysToSimulate; day++) {
  if (verbose) console.log(`\n--- Day ${day} ---`);
  
  // Save the previous day's positions for comparison
  const previousPositions = [...currentPositions];
  
  // Apply price movements for each position
  currentPositions = currentPositions.map(position => {
    const lastSpikeDay = position.lastSpikeDay || 0;
    const shouldSpike = shouldTriggerSuperSpike(day, lastSpikeDay);
    
    // Generate appropriate price change
    const changePercentage = shouldSpike 
      ? generateSuperSpike() 
      : generateDailyPriceChange(new Date(), positiveBias);
    
    // Apply the price movement
    const updatedPosition = applyPriceMovement(position, changePercentage, shouldSpike, day);
    
    // Track values
    dailyValues[position.name].push(updatedPosition.current);
    
    // Track spikes
    if (shouldSpike) {
      spikeEvents.push({ 
        day, 
        position: position.name, 
        change: changePercentage * 100
      });
      
      if (verbose) {
        console.log(`  📈 SPIKE! ${position.name}: ${changePercentage >= 0 ? '+' : ''}${(changePercentage * 100).toFixed(2)}%`);
      }
    }
    
    // Print the day's changes in verbose mode
    if (verbose) {
      const prevPosition = previousPositions.find(p => p.name === position.name);
      const change = ((updatedPosition.current - prevPosition!.current) / prevPosition!.current) * 100;
      console.log(`  ${position.name}: ${formatValue(updatedPosition.current)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)`);
    }
    
    return updatedPosition;
  });
  
  // Calculate the day's total value
  const dayTotal = currentPositions.reduce((sum: number, pos: PortfolioPosition) => sum + pos.current, 0);
  dayValues.push(dayTotal);
  
  // Output for charting
  if (generateChart) {
    const values = [day.toString(), ...currentPositions.map(p => p.current.toString()), dayTotal.toString()];
    console.log(values.join(','));
  }
}

// Calculate final statistics
const initialTotal = mockPortfolioData.reduce((sum: number, pos: any) => sum + pos.current, 0);
const finalTotal = currentPositions.reduce((sum: number, pos: PortfolioPosition) => sum + pos.current, 0);
const overallReturn = ((finalTotal - initialTotal) / initialTotal) * 100;

// Calculate volatility (standard deviation of daily returns)
const dailyReturns: number[] = [];
for (let i = 1; i < dayValues.length; i++) {
  const dailyReturn = (dayValues[i] - dayValues[i-1]) / dayValues[i-1];
  dailyReturns.push(dailyReturn);
}

const meanReturn = dailyReturns.reduce((sum: number, r: number) => sum + r, 0) / dailyReturns.length;
const variance = dailyReturns.reduce((sum: number, r: number) => sum + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length;
const stdDev = Math.sqrt(variance);
const annualizedVolatility = stdDev * Math.sqrt(365) * 100;
const sharpeRatio = meanReturn / stdDev * Math.sqrt(365);

// Print final state
console.log(`\n=== Simulation Results ===`);
console.log(`Final Portfolio Total: ${formatValue(finalTotal)}`);
console.log(`Overall Return: ${overallReturn >= 0 ? '+' : ''}${overallReturn.toFixed(2)}%`);
console.log(`Annualized Volatility: ${annualizedVolatility.toFixed(2)}%`);
console.log(`Sharpe Ratio: ${sharpeRatio.toFixed(2)}`);

console.log(`\nSpike Events: ${spikeEvents.length}`);
if (verbose && spikeEvents.length > 0) {
  console.log('  Day | Position | Change');
  console.log('  --- | -------- | ------');
  spikeEvents.forEach(({day, position, change}) => {
    console.log(`  ${day.toString().padStart(3)} | ${position.padEnd(10)} | ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
  });
}

console.log(`\nSimulation complete. ${daysToSimulate} days simulated.`); 