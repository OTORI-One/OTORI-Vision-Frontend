/**
 * useHybridMode Hook
 * 
 * This hook provides utility functions to determine the data source mode
 * based on environment variables, for hybrid mode implementation.
 */

import { useMemo } from 'react';

type DataSourceType = 'token' | 'portfolio' | 'transaction';
type DataMode = 'real' | 'mock' | 'hybrid';

export function useHybridMode() {
  const isHybridMode = useMemo(() => {
    return process.env.NEXT_PUBLIC_MOCK_MODE === 'hybrid';
  }, []);

  const isMockMode = useMemo(() => {
    return process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
  }, []);

  const getDataSource = (type: DataSourceType): 'real' | 'mock' => {
    // If not in hybrid mode, respect the global setting
    if (!isHybridMode) {
      return isMockMode ? 'mock' : 'real';
    }

    // In hybrid mode, check the specific setting for this data type
    switch (type) {
      case 'token':
        return process.env.NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE === 'real' ? 'real' : 'mock';
      case 'portfolio':
        return process.env.NEXT_PUBLIC_PORTFOLIO_DATA_SOURCE === 'real' ? 'real' : 'mock';
      case 'transaction':
        return process.env.NEXT_PUBLIC_TRANSACTION_DATA_SOURCE === 'real' ? 'real' : 'mock';
      default:
        return isMockMode ? 'mock' : 'real';
    }
  };

  /**
   * Get indicator status for the UI
   * @param type Data source type
   * @param hasError Whether there's an error fetching data
   * @returns Status for the indicator: 'real' | 'mock' | 'error'
   */
  const getDataSourceIndicator = (
    type: DataSourceType,
    hasError: boolean = false
  ): 'real' | 'mock' | 'error' => {
    if (hasError) {
      return 'error';
    }
    return getDataSource(type);
  };

  return {
    isHybridMode,
    isMockMode,
    getDataSource,
    getDataSourceIndicator,
  };
} 