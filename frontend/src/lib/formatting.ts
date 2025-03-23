// Constants for numeric handling
export const SATS_PER_BTC = 100000000;

/**
 * Format a value in sats to a human-readable string based on display mode
 * @param sats The value in sats
 * @param displayMode The display mode ('btc' or 'usd')
 * @param btcPrice The current Bitcoin price in USD (only needed for 'usd' mode)
 * @returns Formatted string
 */
export const formatValue = (sats: number, displayMode: 'btc' | 'usd' = 'btc', btcPrice?: number | null): string => {
  console.log(`formatValue called with sats: ${sats}, mode: ${displayMode}, btcPrice: ${btcPrice}`);
  
  if (displayMode === 'usd' && btcPrice) {
    const usdValue = (sats / SATS_PER_BTC) * btcPrice;
    // USD formatting
    if (usdValue >= 1000000) {
      return `$${(usdValue / 1000000).toFixed(2)}M`; // Above 1M: 2 decimals with M
    }
    if (usdValue >= 1000) {
      return `$${(usdValue / 1000).toFixed(1)}k`; // Below 1M: 1 decimal with k
    }
    if (usdValue < 100) {
      return `$${usdValue.toFixed(2)}`; // Below 100: 2 decimals
    }
    return `$${Math.round(usdValue)}`; // Below 1000: no decimals
  }

  // BTC display mode
  if (sats >= 10000000) { // 0.1 BTC or more
    return `₿${(sats / SATS_PER_BTC).toFixed(2)}`; // Show as BTC with 2 decimals
  }
  
  // Show as sats with k/M notation
  if (sats >= 1000000) {
    return `${(sats / 1000000).toFixed(2)}M sats`; // Millions
  }
  if (sats >= 1000) {
    return `${(sats / 1000).toFixed(1)}k sats`; // Thousands
  }
  
  // Small values
  return `${Math.floor(sats)} sats`;
};

/**
 * Format token amounts consistently across the application
 * @param value The token amount as a string
 * @returns Formatted token amount string
 */
export const formatTokenAmount = (value: string): string => {
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(numericValue)) return '0 tokens';
  
  if (numericValue >= 1000000) {
    return `${(numericValue / 1000000).toFixed(2)}M tokens`;
  }
  if (numericValue >= 1000) {
    return `${Math.floor(numericValue / 1000)}k tokens`;
  }
  return `${Math.floor(numericValue)} tokens`;
};

/**
 * Format a date to a standard string format
 * @param date The date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}; 