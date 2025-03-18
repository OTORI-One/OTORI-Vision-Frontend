import { ensurePortfolioDataLoaded } from '../portfolioLoader';
import mockPortfolioData from '../../mock-data/portfolio-positions.json';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
  };
})();

// Mock window events
const addEventListenerMock = jest.fn();
const dispatchEventMock = jest.fn();

// Mock console logs
const consoleLogMock = jest.fn();
const consoleErrorMock = jest.fn();

describe('portfolioLoader', () => {
  beforeAll(() => {
    // Setup mocks
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    window.addEventListener = addEventListenerMock;
    window.dispatchEvent = dispatchEventMock;
    
    // Save original console methods
    global.console.log = consoleLogMock;
    global.console.error = consoleErrorMock;
  });
  
  beforeEach(() => {
    // Clear mocks between tests
    jest.clearAllMocks();
    localStorageMock.clear();
  });
  
  it('should add portfolio data to localStorage if empty', () => {
    // Setup
    localStorageMock.getItem.mockReturnValueOnce(null);
    
    // Execute
    ensurePortfolioDataLoaded();
    
    // Verify
    expect(localStorageMock.getItem).toHaveBeenCalledWith('ovt-portfolio-positions');
    expect(localStorageMock.setItem).toHaveBeenCalled();
    
    // Verify data structure
    const setItemCall = localStorageMock.setItem.mock.calls[0];
    const key = setItemCall[0];
    const valueStr = setItemCall[1];
    const value = JSON.parse(valueStr);
    
    expect(key).toBe('ovt-portfolio-positions');
    expect(Array.isArray(value)).toBe(true);
    
    // Check that all items have the required properties
    value.forEach((item: any) => {
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('value');
      expect(item).toHaveProperty('current');
      expect(item).toHaveProperty('transactionId');
      expect(item).toHaveProperty('address');
      expect(item).toHaveProperty('lastSpikeDay');
    });
    
    // Verify event dispatched
    expect(dispatchEventMock).toHaveBeenCalled();
    const event = dispatchEventMock.mock.calls[0][0];
    expect(event.type).toBe('storage');
  });
  
  it('should not add portfolio data if it already exists', () => {
    // Setup - localStorage already has data
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockPortfolioData));
    
    // Execute
    ensurePortfolioDataLoaded();
    
    // Verify
    expect(localStorageMock.getItem).toHaveBeenCalledWith('ovt-portfolio-positions');
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(dispatchEventMock).not.toHaveBeenCalled();
    
    // Verify log
    expect(consoleLogMock).toHaveBeenCalledWith('Portfolio data already exists in localStorage');
  });
  
  it('should handle errors gracefully', () => {
    // Setup - force an error
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error('Test error');
    });
    
    // Execute
    ensurePortfolioDataLoaded();
    
    // Verify error handling
    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Failed to inject portfolio data:',
      expect.any(Error)
    );
  });
}); 