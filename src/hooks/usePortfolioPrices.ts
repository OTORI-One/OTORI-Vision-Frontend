import { useState, useEffect, useCallback } from 'react';
import { 
  PortfolioPosition, 
  updatePortfolioPrices, 
  getPortfolioFromLocalStorage 
} from '../utils/priceMovement';

interface PortfolioPricesOptions {
  /** Update interval in milliseconds */
  updateInterval?: number;
  /** Whether to update prices automatically */
  autoUpdate?: boolean;
  /** Whether to simulate updates even when not visible */
  updateInBackground?: boolean;
}

/**
 * Hook for managing portfolio position prices with sophisticated movements
 * 
 * Features:
 * - Automatic price updates at regular intervals
 * - Manual trigger for updates
 * - Intelligent background handling
 */
export function usePortfolioPrices(options: PortfolioPricesOptions = {}) {
  const {
    updateInterval = 60000, // Default: update every minute
    autoUpdate = true,     // Default: automatically update
    updateInBackground = false // Default: pause updates when tab not visible
  } = options;

  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Function to trigger a price update
  const updatePrices = useCallback(() => {
    try {
      // Get updated positions with new prices
      const updatedPositions = updatePortfolioPrices();
      
      // Update state
      setPositions(updatedPositions);
      setLastUpdated(new Date());
      setIsLoading(false);
      
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

  // Setup automatic updates
  useEffect(() => {
    if (!autoUpdate) return;

    let intervalId: NodeJS.Timeout | null = null;

    const startUpdates = () => {
      // Clear any existing interval
      if (intervalId) clearInterval(intervalId);
      
      // Set up new interval
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