import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { ThemeProvider } from '../components/ThemeProvider';
import { Portfolio as OVTPortfolio } from '../src/hooks/useOVTClient';

// Local interface to avoid type conflicts
interface TestPortfolio {
  name: string;
  value: number;      // in sats
  current: number;    // in sats
  change: number;     // percentage
  description: string;
  transactionId?: string;
  tokenAmount: number;
  pricePerToken: number;
  address: string;
}

// Mock Bitcoin price provider
export const mockBitcoinPrice: BitcoinPrice = {
  price: 50000,
  lastUpdated: new Date().toISOString(),
};

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <ThemeProvider>
        {children}
      </ThemeProvider>
    );
  };
  return render(ui, { wrapper: Wrapper, ...options });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Test data generators
export const generateMockPortfolio = (overrides: Partial<TestPortfolio> = {}): TestPortfolio => ({
  name: 'Test Portfolio',
  value: 1000000, // in sats
  current: 1200000, // in sats (with some growth)
  change: 20, // 20% growth
  description: 'Test portfolio description',
  tokenAmount: 1000, // Number of tokens
  pricePerToken: 1000, // Price per token in sats
  address: 'test-address-123',
  ...overrides,
});

export const generateMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  txid: '0x123...abc',
  type: 'DEPOSIT',
  amount: '1.5',
  asset: 'BTC',
  status: 'CONFIRMED',
  timestamp: new Date().toISOString(),
  ...overrides,
});

// Mock API responses
export const mockApiResponses = {
  success: {
    status: 200,
    json: () => Promise.resolve({ success: true, data: {} }),
  },
  error: {
    status: 400,
    json: () => Promise.resolve({ success: false, error: 'Test error' }),
  },
};

// Mock wallet utilities
export const mockWallet: MockWallet = {
  connect: jest.fn().mockResolvedValue({ address: '0x123...abc' }),
  disconnect: jest.fn().mockResolvedValue(undefined),
  signMessage: jest.fn().mockResolvedValue('0xsignature'),
};

// Integration test helpers
export const waitForTxConfirmation = async (txid: string): Promise<boolean> => {
  // Mock implementation that resolves after 1 second
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return true;
};

export const setupTestDatabase = async (): Promise<{ 
  portfolios: TestPortfolio[],
  transactions: Transaction[],
}> => {
  // Mock implementation for setting up test database
  const testData = {
    portfolios: [generateMockPortfolio()],
    transactions: [generateMockTransaction()],
  };
  return testData;
};

export const generateMockTokenData = (overrides = {}) => ({
  name: 'Test Project',
  initial: 1000000,
  current: 2000000,
  change: 100,
  description: 'Test Description',
  ...overrides
})

export const mockModalProps = {
  isOpen: true,
  onClose: jest.fn(),
  tokenData: generateMockTokenData()
} 

interface AdminKey {
  publicKey: string;
  label: string; // e.g., "Admin 1", "Admin 2"
  isActive: boolean;
  }
  export const generateMockAdminKeys = (): AdminKey[] => [
  { publicKey: '0x111...111', label: 'Admin 1', isActive: true },
  { publicKey: '0x222...222', label: 'Admin 2', isActive: true },
  { publicKey: '0x333...333', label: 'Admin 3', isActive: true },
  { publicKey: '0x444...444', label: 'Admin 4', isActive: true },
  { publicKey: '0x555...555', label: 'Admin 5', isActive: true },
  ];
  export const generateMockAdminAction = (overrides = {}) => ({
  id: 'action-123',
  type: 'MINT_TOKENS',
  description: 'Mint 1000 OVT tokens',
  requiredSignatures: 3,
  currentSignatures: [],
  status: 'PENDING',
  createdAt: new Date().toISOString(),
  ...overrides
  });
  // Enhanced wallet mock with admin simulation
  export const mockAdminWallet = {
    ...mockWallet,
    currentAdminKey: '0x111...111',
    // Simulate switching between admin keys
    switchAdmin: jest.fn().mockImplementation((adminKey: string) => {
      mockAdminWallet.currentAdminKey = adminKey;
      return Promise.resolve(true);
    }),
    // Enhanced sign message to use current admin key
    signMessage: jest.fn().mockImplementation((message: string) => {
      return Promise.resolve(`${mockAdminWallet.currentAdminKey}_signature`);
    })
  };
