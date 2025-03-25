import { useState, useEffect, useCallback, useRef } from 'react';
import mockPortfolioPositions from '../mock-data/portfolio-positions.json';
import { 
  PortfolioPosition,
  updatePortfolioLocalStorage,
  getDayNumber
} from '../utils/priceMovement';

const LOCAL_STORAGE_KEY = 'otori-portfolio-data';
const LAST_UPDATE_KEY = 'otori-portfolio-last-update';
const RESET_COUNTER_KEY = 'otori-portfolio-reset-counter';

/**
 * Custom hook for managing portfolio positions
 * Provides a centralized way to access, update, and manage portfolio data
 */
export function usePortfolio() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const microIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize portfolio on mount
  useEffect(() => {
    try {
      setLoading(true);
      
      // Check if we need to reset data periodically to prevent exponential growth
      const resetCounter = localStorage.getItem(RESET_COUNTER_KEY);
      const shouldReset = !resetCounter || parseInt(resetCounter, 10) > 10;
      
      // Try to load from localStorage first
      const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      const lastUpdateTime = localStorage.getItem(LAST_UPDATE_KEY);
      
      if (storedData && !shouldReset) {
        try {
          const parsedData = JSON.parse(storedData);
          
          // Validate the data structure
          if (Array.isArray(parsedData) && parsedData.length > 0 && 
              parsedData.every(item => 
                typeof item === 'object' && 
                'name' in item && 
                'value' in item && 
                'current' in item
              )) {
            console.log('Using portfolio data from localStorage');
            
            // Ensure values aren't excessively large (sanity check)
            if (parsedData.some((pos: PortfolioPosition) => pos.current > 1000000000)) {
              console.warn('Portfolio values have grown too large, resetting to initial values');
              resetToMockData();
              return;
            }
            
            setPositions(parsedData);
            
            // Keep track of last update time
            if (lastUpdateTime) {
              lastUpdateRef.current = parseInt(lastUpdateTime, 10);
            }
            
            // Increment reset counter
            const newCounter = resetCounter ? parseInt(resetCounter, 10) + 1 : 1;
            localStorage.setItem(RESET_COUNTER_KEY, newCounter.toString());
            
            setLoading(false);
            return;
          }
        } catch (parseError) {
          console.error('Error parsing portfolio data from localStorage:', parseError);
        }
      }
      
      // If localStorage data is not available, invalid, or reset needed
      resetToMockData();
      
    } catch (err) {
      console.error('Error initializing portfolio data:', err);
      setError('Failed to load portfolio data');
      setLoading(false);
    }
  }, []);
  
  // Reset to mock data
  const resetToMockData = useCallback(() => {
    console.log('Using mock portfolio data');
    
    // Use mock data without simulation to ensure consistent initial values
    setPositions(mockPortfolioPositions as PortfolioPosition[]);
    
    // Save to localStorage for future use
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mockPortfolioPositions));
    localStorage.setItem(LAST_UPDATE_KEY, Date.now().toString());
    localStorage.setItem(RESET_COUNTER_KEY, '1');
    lastUpdateRef.current = Date.now();
    
    setLoading(false);
  }, []);
  
  // Simulate price movements (controlled, smaller changes)
  const simulatePriceMovement = useCallback((positiveBias = true) => {
    return (prevPositions: PortfolioPosition[]): PortfolioPosition[] => {
      // Apply a small random change to each position (±0.5% normally, ±2% for spikes)
      return prevPositions.map(position => {
        // Calculate day number for consistency in spike generation
        const currentDay = getDayNumber();
        const lastSpikeDay = position.lastSpikeDay || 0;
        
        // Determine if this should be a spike (less frequent, roughly every 7-14 days)
        const daysSinceLastSpike = currentDay - lastSpikeDay;
        const shouldSpike = daysSinceLastSpike > 7 && Math.random() < 0.02; // 2% chance after 7 days
        
        // Generate change percentage
        let changePercentage;
        if (shouldSpike) {
          // Generate a spike (±2-5%)
          const magnitude = 0.02 + (Math.random() * 0.03);
          // 70% chance of positive spike if positiveBias is true
          const isPositive = Math.random() < (positiveBias ? 0.7 : 0.5);
          changePercentage = isPositive ? magnitude : -magnitude;
          position.lastSpikeDay = currentDay; // Update last spike day
        } else {
          // Normal daily change (±0.5%)
          changePercentage = (Math.random() * 0.01) - 0.005;
          // Apply slight positive bias if enabled
          if (positiveBias && Math.random() < 0.6) {
            changePercentage = Math.abs(changePercentage);
          }
        }
        
        // Apply the change to current value only
        const newCurrent = position.current * (1 + changePercentage);
        
        // Calculate new price per token
        const newPricePerToken = position.tokenAmount > 0 ? 
          newCurrent / position.tokenAmount : 
          position.pricePerToken;
        
        // Calculate change percentage relative to original value
        const totalChangePercent = ((newCurrent - position.value) / position.value) * 100;
        
        // Return updated position
        return {
          ...position,
          current: newCurrent,
          pricePerToken: newPricePerToken,
          change: parseFloat(totalChangePercent.toFixed(2)) // Store total change as percentage, rounded
        };
      });
    };
  }, []);
  
  // Set up periodic price movement simulations
  useEffect(() => {
    if (positions.length === 0) return;
    
    // Function to update with larger price movements
    const updatePrices = () => {
      try {
        setPositions(prevPositions => {
          const updatedPositions = simulatePriceMovement(true)(prevPositions);
          
          // Sanity check - if any position has grown too large, reset
          if (updatedPositions.some(pos => pos.current > 1000000000)) {
            console.warn('Portfolio values have grown too large, resetting to initial values');
            resetToMockData();
            return mockPortfolioPositions as PortfolioPosition[];
          }
          
          // Save to localStorage
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPositions));
          localStorage.setItem(LAST_UPDATE_KEY, Date.now().toString());
          
          return updatedPositions;
        });
      } catch (error) {
        console.error('Error updating portfolio prices:', error);
      }
    };
    
    // Set interval for regular updates (every 30 seconds)
    intervalRef.current = setInterval(updatePrices, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [positions.length, simulatePriceMovement, resetToMockData]);
  
  // Set up micro-movements for more realistic feel
  useEffect(() => {
    if (positions.length === 0) return;
    
    // Function to apply small incremental updates
    const updateIncrementally = () => {
      try {
        setPositions(prevPositions => {
          // Apply very small changes (±0.1%)
          return prevPositions.map(position => {
            const microChange = (Math.random() * 0.002) - 0.001;
            const newCurrent = position.current * (1 + microChange);
            const newPricePerToken = position.tokenAmount > 0 ? 
              newCurrent / position.tokenAmount : 
              position.pricePerToken;
            
            // Calculate change percentage relative to original value
            const totalChangePercent = ((newCurrent - position.value) / position.value) * 100;
            
            return {
              ...position,
              current: newCurrent,
              pricePerToken: newPricePerToken,
              change: parseFloat(totalChangePercent.toFixed(2))
            };
          });
        });
      } catch (error) {
        console.error('Error updating incremental prices:', error);
      }
    };
    
    // Set interval for micro-updates (every 3 seconds)
    microIntervalRef.current = setInterval(updateIncrementally, 3000);
    
    return () => {
      if (microIntervalRef.current) {
        clearInterval(microIntervalRef.current);
        microIntervalRef.current = null;
      }
    };
  }, [positions.length]);
  
  // Add a new position
  const addPosition = useCallback((newPosition: PortfolioPosition) => {
    setPositions(prevPositions => {
      // Check if position with same name already exists
      const existingIndex = prevPositions.findIndex(p => p.name === newPosition.name);
      
      if (existingIndex >= 0) {
        // Replace existing position
        const updated = [...prevPositions];
        updated[existingIndex] = newPosition;
        return updated;
      } else {
        // Add new position
        return [...prevPositions, newPosition];
      }
    });
    
    return Promise.resolve(true);
  }, []);
  
  // Update a position
  const updatePosition = useCallback((positionName: string, updates: Partial<PortfolioPosition>) => {
    setPositions(prevPositions => {
      const index = prevPositions.findIndex(p => p.name === positionName);
      
      if (index >= 0) {
        const updated = [...prevPositions];
        updated[index] = { ...updated[index], ...updates };
        return updated;
      }
      
      return prevPositions;
    });
    
    return Promise.resolve(true);
  }, []);
  
  // Remove a position
  const removePosition = useCallback((positionName: string) => {
    setPositions(prevPositions => 
      prevPositions.filter(p => p.name !== positionName)
    );
    
    return Promise.resolve(true);
  }, []);
  
  // Get total portfolio value
  const getTotalValue = useCallback(() => {
    return positions.reduce((sum, position) => sum + position.current, 0);
  }, [positions]);
  
  // Calculate overall change percentage
  const getOverallChangePercentage = useCallback(() => {
    const totalInitial = positions.reduce((sum, position) => sum + position.value, 0);
    const totalCurrent = positions.reduce((sum, position) => sum + position.current, 0);
    
    if (totalInitial === 0) return 0;
    
    return parseFloat(((totalCurrent - totalInitial) / totalInitial * 100).toFixed(2));
  }, [positions]);
  
  // Reset portfolio data to initial mock data
  const resetPortfolio = useCallback(() => {
    resetToMockData();
    return Promise.resolve(true);
  }, [resetToMockData]);
  
  // Force an immediate price update
  const forceUpdate = useCallback(() => {
    if (positions.length === 0) return;
    
    const updatedPositions = simulatePriceMovement(true)(positions);
    setPositions(updatedPositions);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPositions));
    localStorage.setItem(LAST_UPDATE_KEY, Date.now().toString());
  }, [positions, simulatePriceMovement]);
  
  return {
    positions,
    loading,
    error,
    addPosition,
    updatePosition,
    removePosition,
    getTotalValue,
    getOverallChangePercentage,
    resetPortfolio,
    forceUpdate
  };
} 