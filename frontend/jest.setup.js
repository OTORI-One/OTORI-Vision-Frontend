/**
 * Jest setup file
 * 
 * This file is loaded automatically by Jest before running tests.
 * It sets up the testing environment and global variables.
 */

// Import jest-dom for DOM element assertions
require('@testing-library/jest-dom');

// Extend the timeout for async tests that might take longer
jest.setTimeout(10000);

// Silence console errors during tests by default
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string') {
    // Silence React act() warnings
    if (args[0].includes('Warning: An update to') && 
        args[0].includes('inside a test was not wrapped in act')) {
      return;
    }
    // Silence expected API fetch errors in tests
    if (args[0].includes('Error fetching portfolio positions')) {
      return;
    }
  }
  originalConsoleError(...args);
};

// Clean up after tests
afterEach(() => {
  jest.clearAllMocks();
});

// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Explicitly initialize expect extensions
import { expect } from '@jest/globals';
import matchers from '@testing-library/jest-dom/matchers';

// This fixes issues with expect.extend
expect.extend(matchers);

// Mock local storage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Add global fetch polyfill for Node environment
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    statusText: 'OK',
  })
);

// Mock axios for API calls
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ 
    data: {},
    status: 200,
    statusText: 'OK',
  })),
  post: jest.fn(() => Promise.resolve({
    data: {},
    status: 200,
    statusText: 'OK',
  })),
  create: jest.fn().mockReturnValue({
    get: jest.fn(() => Promise.resolve({ 
      data: {},
      status: 200,
      statusText: 'OK',
    })),
    post: jest.fn(() => Promise.resolve({
      data: {},
      status: 200,
      statusText: 'OK',
    }))
  })
}));

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: {},
      asPath: '',
      push: jest.fn(),
      replace: jest.fn(),
    }
  },
}))

// Mock Bitcoin price hook
jest.mock('@/hooks/useBitcoinPrice', () => ({
  useBitcoinPrice: () => ({
    price: 40000,
    loading: false,
    error: null
  })
}))

// Mock Headless UI Dialog components
jest.mock('@headlessui/react', () => {
  const Fragment = ({ children }) => children;

  const Dialog = function Dialog({ children, className, onClose, ...props }) {
    return (
      <div role="dialog" aria-modal="true" className={className} {...props}>
        {children}
      </div>
    );
  };

  Dialog.Panel = function Panel({ children, className, ...props }) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  };

  Dialog.Title = function Title({ children, as: Component = 'h3', ...props }) {
    return <Component {...props}>{children}</Component>;
  };

  const Transition = {
    Root: function Root({ show, appear, children }) {
      return show ? children : null;
    },
    Child: function Child({ children, ...props }) {
      return children;
    }
  };

  Transition.Root = function TransitionRoot({ show, as: Component = Fragment, children }) {
    return show ? <Component>{children}</Component> : null;
  };

  return {
    Dialog,
    Transition,
    Fragment
  };
});

// Mock HeroIcons
jest.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: () => <span data-testid="close-icon">X</span>,
  ArrowTopRightOnSquareIcon: () => <span data-testid="external-link-icon">↗</span>,
  KeyIcon: () => <span data-testid="key-icon">🔑</span>,
  CheckCircleIcon: () => <span data-testid="check-circle-icon">✓</span>,
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockImplementation(function (callback, options) {
  return {
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  };
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver
window.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// TextEncoder/TextDecoder polyfill
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock window.crypto for tests
const crypto = require('crypto');
Object.defineProperty(global.self, 'crypto', {
  value: {
    getRandomValues: arr => crypto.randomBytes(arr.length)
  }
}); 