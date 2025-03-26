import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { ThemeProvider } from '../components/ThemeProvider'

// Mock Bitcoin price provider
const mockBitcoinPrice = {
  price: 40000,
  loading: false,
  error: null,
}

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <ThemeProvider>
        {children}
      </ThemeProvider>
    )
  }
  
  return render(ui, { wrapper: AllTheProviders, ...options })
}

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Test data generators
export const generateMockPortfolio = () => ({
  positions: [
    {
      name: "Test Project 1",
      amount: 1000000,
      pricePerToken: 100,
      currencySpent: 100000000,
      transactionId: "txid123",
      entryTimestamp: 1677649200,
      type: "PostTGE",
      status: "Active"
    }
  ],
  totalValue: 100000000,
  nav: 2000000
})

export const generateMockTransaction = () => ({
  txid: "0x" + "1".repeat(64),
  timestamp: Date.now(),
  amount: 1000000,
  type: "mint",
  status: "confirmed"
})

// Mock API responses
export const mockApiResponse = {
  success: (data: any) => Promise.resolve({ ok: true, json: () => Promise.resolve(data) }),
  error: (error: string) => Promise.resolve({ ok: false, json: () => Promise.resolve({ error }) })
}

// Test wallet utilities
export const mockWallet = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  signMessage: jest.fn(),
  publicKey: "0x" + "1".repeat(40),
  isConnected: true
}

// Integration test helpers
export const waitForTransaction = async (txid: string) => {
  // Simulate transaction confirmation delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  return { status: "confirmed" }
}

export const setupTestDatabase = async () => {
  // Setup test data
  return {
    cleanup: async () => {
      // Cleanup test data
    }
  }
} 
