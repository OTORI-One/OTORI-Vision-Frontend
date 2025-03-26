import { ensurePortfolioDataLoaded, PORTFOLIO_STORAGE_KEY, PORTFOLIO_STORAGE_ALT_KEY } from '../portfolioLoader';
import { shouldUseMockData } from '../../lib/hybridModeUtils';

// Mock hybridModeUtils
jest.mock('../../lib/hybridModeUtils', () => ({
  shouldUseMockData: jest.fn()
}));

// Mock the import of mockPortfolioData
jest.mock('../../../src/mock-data/portfolio-positions.json', () => [
  { name: 'Test Position', value: 100000, description: 'Test Description' }
]);

describe('portfolioLoader', () => {
  // Setup before each test
  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Mock implementation for localStorage
    const origLocalStorage = global.localStorage;
    const mockLocalStorage = {
      getItem: jest.fn().mockImplementation(key => null),
      setItem: jest.fn(),
      clear: jest.fn()
    };
    
    // Replace localStorage
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
    
    // Replace window.dispatchEvent
    window.dispatchEvent = jest.fn();
    
    // Mock console methods
    console.error = jest.fn();
    console.log = jest.fn();
    
    // Default shouldUseMockData to return true
    (shouldUseMockData as jest.Mock).mockImplementation(() => true);
  });

  it('should add portfolio data to localStorage if empty', () => {
    // Execute
    ensurePortfolioDataLoaded();
    
    // Check localStorage.getItem was called
    expect(localStorage.getItem).toHaveBeenCalledWith(PORTFOLIO_STORAGE_KEY);
    
    // Check localStorage.setItem was called for both keys
    expect(localStorage.setItem).toHaveBeenCalledWith(PORTFOLIO_STORAGE_KEY, expect.any(String));
    expect(localStorage.setItem).toHaveBeenCalledWith(PORTFOLIO_STORAGE_ALT_KEY, expect.any(String));
    
    // Check window.dispatchEvent was called
    expect(window.dispatchEvent).toHaveBeenCalled();
  });

  it('should not add portfolio data if it already exists', () => {
    // Setup localStorage.getItem to return existing data
    const existingData = JSON.stringify([{ name: 'Existing', value: 200 }]);
    (localStorage.getItem as jest.Mock).mockImplementation(key => {
      if (key === PORTFOLIO_STORAGE_KEY) return existingData;
      return null;
    });
    
    // Execute
    ensurePortfolioDataLoaded();
    
    // Verify localStorage.getItem was called
    expect(localStorage.getItem).toHaveBeenCalledWith(PORTFOLIO_STORAGE_KEY);
    
    // Verify we didn't try to add new data, just copy to alt key
    expect(localStorage.setItem).toHaveBeenCalledWith(PORTFOLIO_STORAGE_ALT_KEY, existingData);
    expect(localStorage.setItem).not.toHaveBeenCalledWith(PORTFOLIO_STORAGE_KEY, expect.any(String));
    
    // Verify dispatchEvent wasn't called
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', () => {
    // Setup localStorage.getItem to throw an error
    (localStorage.getItem as jest.Mock).mockImplementation(() => {
      throw new Error('Test error');
    });
    
    // Execute
    ensurePortfolioDataLoaded();
    
    // Verify error logged
    expect(console.error).toHaveBeenCalledWith(
      'Failed to inject portfolio data:',
      expect.any(Error)
    );
  });
}); 