import { ensurePortfolioDataLoaded } from '../portfolioLoader';
import { shouldUseMockData } from '../../lib/hybridModeUtils';

// Mock hybridModeUtils
jest.mock('../../lib/hybridModeUtils', () => ({
  shouldUseMockData: jest.fn()
}));

describe('portfolioLoader', () => {
  let localStorageMock: { getItem: jest.Mock; setItem: jest.Mock; clear: jest.Mock };
  let dispatchEventMock: jest.Mock;
  let consoleErrorMock: jest.Mock;

  beforeEach(() => {
    localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn()
    };
    dispatchEventMock = jest.fn();
    consoleErrorMock = jest.fn();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Mock dispatchEvent
    window.dispatchEvent = dispatchEventMock;

    // Mock console.error
    console.error = consoleErrorMock;

    // Reset shouldUseMockData mock
    (shouldUseMockData as jest.Mock).mockReset();
  });

  it('should add portfolio data to localStorage if empty', () => {
    // Setup
    localStorageMock.getItem.mockReturnValue(null);
    (shouldUseMockData as jest.Mock).mockReturnValue(true);

    // Execute
    ensurePortfolioDataLoaded();

    // Verify
    expect(localStorageMock.getItem).toHaveBeenCalledWith('ovt-portfolio-positions');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('ovt-portfolio-positions', expect.any(String));
    expect(localStorageMock.setItem).toHaveBeenCalledWith('ovt_positions', expect.any(String));
    
    // Verify data structure
    const setItemCall = localStorageMock.setItem.mock.calls[0];
    const savedData = JSON.parse(setItemCall[1]);
    expect(Array.isArray(savedData)).toBe(true);
    expect(savedData.length).toBeGreaterThan(0);
    
    // Verify event dispatch
    expect(dispatchEventMock).toHaveBeenCalled();
  });

  it('should not add portfolio data if it already exists', () => {
    // Setup
    const existingData = JSON.stringify([
      {
        name: 'Test Position',
        value: 100000,
        description: 'Test Description'
      }
    ]);
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'ovt-portfolio-positions') {
        return existingData;
      }
      return null;
    });
    (shouldUseMockData as jest.Mock).mockReturnValue(true);

    // Execute
    ensurePortfolioDataLoaded();

    // Verify
    expect(localStorageMock.getItem).toHaveBeenCalledWith('ovt-portfolio-positions');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('ovt_positions', existingData);
    expect(dispatchEventMock).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', () => {
    // Setup
    localStorageMock.getItem.mockImplementation(() => {
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