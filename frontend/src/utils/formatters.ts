/**
 * Formatting utility functions for currency, numbers and percentages
 */

// Constants for numeric handling
export const SATS_PER_BTC = 100000000;

/**
 * Format a number to a specified number of decimal places with optional thousands separator
 * @param value The number to format
 * @param decimals Number of decimal places (default: 2)
 * @param useThousandsSeparator Whether to use thousands separator (default: true)
 * @returns Formatted number string
 */
export function formatNumber(
  value: number, 
  decimals = 2, 
  useThousandsSeparator = true
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: useThousandsSeparator
  };
  
  return new Intl.NumberFormat('en-US', options).format(value);
}

/**
 * Format a value as currency with $ symbol and optional decimals
 * @param value The value to format as currency
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number, 
  decimals = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  };
  
  return new Intl.NumberFormat('en-US', options).format(value);
}

/**
 * Format a number as a percentage with % symbol
 * @param value The value to format as percentage
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number, 
  decimals = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Format a number as BTC with BTC symbol and satoshi precision
 * @param value The value to format as BTC
 * @param showSymbol Whether to include the BTC symbol (default: true)
 * @returns Formatted BTC string
 */
export function formatBitcoin(
  value: number, 
  showSymbol = true
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  
  const formatted = formatNumber(value, 8, true);
  return showSymbol ? `₿${formatted}` : formatted;
}

/**
 * Format a value in sats to either BTC or USD display format
 * Follows the frontend guidelines for displaying Bitcoin and USD values
 * 
 * @param sats The value in satoshis
 * @param displayMode Whether to show as 'btc' or 'usd'
 * @param btcPrice Current Bitcoin price in USD (required for USD display)
 * @returns Formatted string with appropriate units
 */
export function formatSats(
  sats: number, 
  displayMode: 'btc' | 'usd' = 'btc', 
  btcPrice: number | null = null
): string {
  if (sats === null || sats === undefined || isNaN(sats)) {
    return '-';
  }

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
}

/**
 * Format a date to a readable string
 * @param date The date to format
 * @param includeTime Whether to include time (default: false)
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | number | string,
  includeTime = false
): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'object' ? date : new Date(date);
  
  if (includeTime) {
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
} 