/**
 * Jest setup file
 * 
 * This file is loaded automatically by Jest before running tests.
 * It sets up the testing environment and global variables.
 */

import '@testing-library/jest-dom';

// Extend the timeout for async tests that might take longer
jest.setTimeout(10000);

// Silence console errors during tests by default
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('Warning: An update to') && args[0]?.includes?.('inside a test was not wrapped in act')) {
    return; // Silence React act() warnings
  }
  if (args[0]?.includes?.('Error fetching portfolio positions')) {
    return; // Silence expected API fetch errors in tests
  }
  originalConsoleError(...args);
};

// Clean up after tests
afterEach(() => {
  jest.clearAllMocks();
}); 