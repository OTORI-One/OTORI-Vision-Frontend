import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PortfolioPosition, 
  updatePortfolioPrices, 
  getPortfolioFromLocalStorage,
  simulateIncrementalPriceMovement,
  simulatePortfolioPriceMovements,
  updateGlobalNAVReference
} from '../utils/priceMovement';
import { Portfolio } from './useOVTClient';
import { ensurePortfolioDataLoaded } from '../utils/portfolioLoader';

interface PortfolioPricesOptions {
  /** Update interval in milliseconds */
  updateInterval?: number;
  /** Incremental update interval in milliseconds */
  incrementalInterval?: number;
  /** Whether to update prices automatically */
  autoUpdate?: boolean;
  /** Whether to simulate updates even when not visible */
  updateInBackground?: boolean;
}

// Add a custom event when portfolio prices change
const triggerPortfolioUpdate = (positions: Portfolio[]) => {
  if (typeof window !== 'undefined') {
    // Create a custom event with the updated portfolio data
    const event = new CustomEvent('portfolio-updated', { 
      detail: { positions }
    });
    window.dispatchEvent(event);
    
    // Also trigger a NAV update to ensure dashboard is updated
    const navEvent = new CustomEvent('nav-update');
    window.dispatchEvent(navEvent);
  }
};

/**
 * Hook for managing portfolio position prices with sophisticated movements
 * 
 * Features:
 * - Automatic price updates at regular intervals
 * - Continuous incremental updates for realistic market feel
 * - Manual trigger for updates
 * - Intelligent background handling
 */
export function usePortfolioPrices(options: PortfolioPricesOptions = {}) {
  const {
    updateInterval = 60000, // Major update every minute
    incrementalInterval = 3000, // Small updates every 3 seconds
    autoUpdate = true,
    updateInBackground = true // Default changed to true for better experience
  } = options;

  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const incrementalUpdatesRef = useRef<NodeJS.Timeout | null>(null);

  // Function to trigger a full price update
  const updatePrices = useCallback(() => {
    try {
      // Get updated positions with new prices
      const updatedPositions = updatePortfolioPrices();
      
      // Update state
      setPositions(updatedPositions);
      setLastUpdated(new Date());
      setIsLoading(false);
      
      // Trigger portfolio update
      triggerPortfolioUpdate(updatedPositions.map(pos => pos as Portfolio));
      
      return updatedPositions;
    } catch (error) {
      console.error('Error updating portfolio prices:', error);
      // If there's an error, try to at least get the current data
      const currentPositions = getPortfolioFromLocalStorage();
      setPositions(currentPositions);
      setIsLoading(false);
      return currentPositions;
    }
  }, []);

  // Function to perform small incremental updates
  const updateIncrementally = useCallback(() => {
    if (document.hidden && !updateInBackground) return;
    
    try {
      setPositions(prevPositions => {
        if (!prevPositions.length) return prevPositions;
        
        // Apply small incremental movements to create a "live" feeling
        const updatedPositions = simulateIncrementalPriceMovement([...prevPositions]);
        return updatedPositions;
      });
    } catch (error) {
      console.error('Error during incremental update:', error);
    }
  }, [updateInBackground]);

  // Initial load
  useEffect(() => {
    const loadInitialData = () => {
      const currentPositions = getPortfolioFromLocalStorage();
      
      if (currentPositions.length > 0) {
        setPositions(currentPositions);
        setIsLoading(false);
      } else {
        // If no positions yet, just clear loading state
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Setup automatic full updates
  useEffect(() => {
    if (!autoUpdate) return;

    let intervalId: NodeJS.Timeout | null = null;

    const startUpdates = () => {
      // Clear any existing interval
      if (intervalId) clearInterval(intervalId);
      
      // Set up new interval for major updates
      intervalId = setInterval(() => {
        // Check if we should update when in background
        if (!updateInBackground && document.hidden) {
          return;
        }
        
        updatePrices();
      }, updateInterval);
    };

    const stopUpdates = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Start the updates
    startUpdates();

    // Handle visibility changes (pause when tab not visible)
    const handleVisibilityChange = () => {
      if (document.hidden && !updateInBackground) {
        // Pause updates when tab hidden
        stopUpdates();
      } else {
        // Resume updates when tab visible again
        // Also do an immediate update
        updatePrices();
        startUpdates();
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopUpdates();
    };
  }, [autoUpdate, updateInterval, updateInBackground, updatePrices]);

  // Setup continuous incremental updates for a more dynamic feel
  useEffect(() => {
    if (!autoUpdate) return;
    
    // Start incremental updates
    const startIncrementalUpdates = () => {
      if (incrementalUpdatesRef.current) {
        clearInterval(incrementalUpdatesRef.current);
      }
      
      incrementalUpdatesRef.current = setInterval(() => {
        updateIncrementally();
      }, incrementalInterval);
    };
    
    // Stop incremental updates
    const stopIncrementalUpdates = () => {
      if (incrementalUpdatesRef.current) {
        clearInterval(incrementalUpdatesRef.current);
        incrementalUpdatesRef.current = null;
      }
    };
    
    // Start updates
    startIncrementalUpdates();
    
    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden && !updateInBackground) {
        stopIncrementalUpdates();
      } else {
        startIncrementalUpdates();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopIncrementalUpdates();
    };
  }, [autoUpdate, incrementalInterval, updateInBackground, updateIncrementally]);

  // Handle localStorage changes from other components/tabs
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedPositions = getPortfolioFromLocalStorage();
      setPositions(updatedPositions);
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Listen for currency changes and update prices
  useEffect(() => {
    const handleCurrencyChange = () => {
      // When currency changes, update prices to reflect the new currency
      updatePrices();
    };
    
    // Add listener for currency change events
    window.addEventListener('currency-changed', handleCurrencyChange);
    
    return () => {
      window.removeEventListener('currency-changed', handleCurrencyChange);
    };
  }, [updatePrices]);

  return {
    positions,
    isLoading,
    lastUpdated,
    updatePrices,
    totalValue: positions.reduce((sum, pos) => sum + pos.current, 0),
    totalChange: positions.length > 0 
      ? positions.reduce((sum, pos) => sum + (pos.current - pos.value), 0) / 
        positions.reduce((sum, pos) => sum + pos.value, 0) * 100
      : 0
  };
} 