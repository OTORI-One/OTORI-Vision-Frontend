/**
 * Hybrid Mode Utilities
 * 
 * This module provides utilities for merging real contract data with mock data
 * in the hybrid mode of the OTORI Vision Token (OVT) application.
 */

import mockPortfolioData from '../mock-data/portfolio-positions.json';
import mockTokenData from '../mock-data/token-data.json';
import { Portfolio } from '../hooks/useOVTClient';

// Type definitions for configuration
export type DataSource = 'mock' | 'real';
export type AppMode = 'mock' | 'real' | 'hybrid';
export type DataType = 'portfolio' | 'transaction' | 'tokenSupply' | 'trading';

// Interface for hybrid mode configuration
export interface HybridModeConfig {
  mode: AppMode;
  portfolioDataSource: DataSource;
  transactionDataSource: DataSource;
  tokenSupplyDataSource: DataSource;
  tradingDataSource: DataSource;
}

/**
 * Get the current hybrid mode configuration from environment variables
 */
export function getHybridModeConfig(): HybridModeConfig {
  const mockModeValue = process.env.NEXT_PUBLIC_MOCK_MODE || 'false';
  
  // Convert string environment variable to AppMode
  let mode: AppMode;
  if (mockModeValue === 'hybrid') {
    mode = 'hybrid';
  } else if (mockModeValue === 'true') {
    mode = 'mock';
  } else {
    mode = 'real';
  }
  
  // If not in hybrid mode, all sources match the main mode
  if (mode !== 'hybrid') {
    const dataSource: DataSource = mode === 'mock' ? 'mock' : 'real';
    return {
      mode,
      portfolioDataSource: dataSource,
      transactionDataSource: dataSource,
      tokenSupplyDataSource: dataSource,
      tradingDataSource: dataSource
    };
  }
  
  // In hybrid mode, use the granular toggles
  return {
    mode: 'hybrid',
    portfolioDataSource: (process.env.NEXT_PUBLIC_PORTFOLIO_DATA_SOURCE || 'real') as DataSource,
    transactionDataSource: (process.env.NEXT_PUBLIC_TRANSACTION_DATA_SOURCE || 'real') as DataSource,
    tokenSupplyDataSource: (process.env.NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE || 'real') as DataSource,
    tradingDataSource: (process.env.NEXT_PUBLIC_TRADING_DATA_SOURCE || 'mock') as DataSource
  };
}

/**
 * Merge portfolio data from real and mock sources
 * 
 * @param realData Portfolio data from the real contract
 * @returns Merged portfolio data
 */
export function mergePortfolioData(realData: Portfolio[]): Portfolio[] {
  const config = getHybridModeConfig();
  
  // If portfolio data is set to real, return real data
  if (config.portfolioDataSource === 'real') {
    return realData;
  }
  
  // If portfolio data is set to mock, return mock data
  return mockPortfolioData as Portfolio[];
}

/**
 * Get token supply data based on the current configuration
 * 
 * @param realSupply Supply data from the real contract
 * @returns Token supply based on configuration
 */
export function getTokenSupplyData(realSupply: number): number {
  const config = getHybridModeConfig();
  
  // If token supply is set to real, return real data
  if (config.tokenSupplyDataSource === 'real') {
    return realSupply;
  }
  
  // If token supply is set to mock, return mock data
  return mockTokenData.totalSupply;
}

/**
 * Check if a specific data source should use mock data
 * 
 * @param dataType The type of data to check
 * @returns True if mock data should be used, false otherwise
 */
export function shouldUseMockData(dataType: DataType): boolean {
  const config = getHybridModeConfig();
  
  // In hybrid mode, check the specific data type
  switch (dataType) {
    case 'portfolio':
      return config.portfolioDataSource === 'mock';
    case 'transaction':
      return config.transactionDataSource === 'mock';
    case 'tokenSupply':
      return config.tokenSupplyDataSource === 'mock';
    case 'trading':
      return config.tradingDataSource === 'mock';
    default:
      return false;
  }
}

/**
 * Create a data source indicator for UI display
 * 
 * @param dataType The type of data being displayed
 * @returns An object with information about the data source for UI display
 */
export function getDataSourceIndicator(dataType: DataType): {
  isMock: boolean;
  label: string;
  color: string;
} {
  const isMock = shouldUseMockData(dataType);
  
  return {
    isMock,
    label: isMock ? 'Simulated Data' : 'Real Contract Data',
    color: isMock ? 'amber' : 'green'
  };
} 