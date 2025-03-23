import { shouldUseMockData } from '../lib/hybridModeUtils';
import mockPortfolioData from '../mock-data/portfolio-positions.json';

/**
 * Ensures portfolio data is loaded in localStorage
 * This utility extracts the ensurePortfolioDataLoaded function from the portfolio page
 * to allow proper usage across the application
 */
export function ensurePortfolioDataLoaded() {
  if (typeof window === 'undefined') return; // Skip on server-side
  
  console.log('Ensuring portfolio data is loaded...');
  
  try {
    // Check if data already exists in localStorage
    const existingData = localStorage.getItem('ovt-portfolio-positions');
    
    // Only initialize if no data exists and we should use mock data
    if (!existingData && shouldUseMockData('portfolio')) {
      console.log('Portfolio data not found in localStorage, injecting mock data...');
      
      // Add missing address field to each portfolio item if needed
      const portfolioPositions = (mockPortfolioData as any[]).map(position => ({
        ...position,
        address: position.address || `mock-address-${position.name.replace(/\s+/g, '-').toLowerCase()}`,
        current: position.value, // Initialize current value if not present
        change: position.change || 0, // Initialize change percentage if not present
        lastSpikeDay: position.lastSpikeDay || 0 // Initialize lastSpikeDay if not present
      }));
      
      // Store in localStorage
      localStorage.setItem('ovt-portfolio-positions', JSON.stringify(portfolioPositions));
      
      // Also store in the alternate 'ovt_positions' key for compatibility with both implementations
      localStorage.setItem('ovt_positions', JSON.stringify(portfolioPositions));
      
      console.log('Mock portfolio data injected into localStorage');
      
      // Force a refresh if needed
      window.dispatchEvent(new Event('storage'));
    } else if (existingData) {
      console.log('Portfolio data already exists in localStorage');
      
      // Ensure we have data in the alternate key as well for compatibility
      if (!localStorage.getItem('ovt_positions')) {
        localStorage.setItem('ovt_positions', existingData);
      }
    } else {
      console.log('Using real portfolio data, will be fetched when needed');
    }
  } catch (err) {
    console.error('Failed to inject portfolio data:', err);
  }
} 