import mockPortfolioData from '../mock-data/portfolio-positions.json';

/**
 * Ensures portfolio data is loaded in localStorage
 * This utility extracts the ensurePortfolioDataLoaded function from the portfolio page
 * to allow proper usage across the application
 */
export function ensurePortfolioDataLoaded() {
  if (typeof window === 'undefined') return; // Skip on server-side
  
  try {
    // Check if data already exists in localStorage
    const existingData = localStorage.getItem('ovt-portfolio-positions');
    
    if (!existingData) {
      console.log('Portfolio data not found in localStorage, injecting mock data...');
      
      // Add missing address field to each portfolio item if needed
      const portfolioPositions = (mockPortfolioData as any[]).map(position => ({
        ...position,
        address: position.address || `mock-address-${position.name.replace(/\s+/g, '-').toLowerCase()}`
      }));
      
      // Add lastSpikeDay if not present
      const updatedPositions = portfolioPositions.map(position => ({
        ...position,
        lastSpikeDay: position.lastSpikeDay || 0
      }));
      
      // Store in localStorage
      localStorage.setItem('ovt-portfolio-positions', JSON.stringify(updatedPositions));
      console.log('Mock portfolio data injected into localStorage');
      
      // Force a refresh if needed
      window.dispatchEvent(new Event('storage'));
    } else {
      console.log('Portfolio data already exists in localStorage');
    }
  } catch (err) {
    console.error('Failed to inject portfolio data:', err);
  }
} 