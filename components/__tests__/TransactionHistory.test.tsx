import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TransactionHistory from '../admin/TransactionHistory';
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/outline';

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  ArrowDownIcon: () => <div data-testid="arrow-down-icon" />,
  ArrowUpIcon: () => <div data-testid="arrow-up-icon" />
}));

const SATS_PER_BTC = 100000000;

// Mock useOVTClient hook
const mockGetTransactionHistory = jest.fn();
const mockFormatValue = (value: number, currency: 'btc' | 'usd' = 'btc') => {
  if (currency === 'btc') {
    const sats = Math.floor(value * SATS_PER_BTC);
    // For values >= 0.1 BTC (10M sats), display in BTC with 2 decimals
    if (sats >= 10000000) {
      return `₿${(sats / SATS_PER_BTC).toFixed(2)}`;
    }
    // For values >= 1M sats, use 'M' notation with two decimals
    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(2)}M sats`;
    }
    // For values >= 1k sats, use 'k' notation with no decimals
    if (sats >= 1000) {
      return `${Math.floor(sats / 1000)}k sats`;
    }
    // Show full number for values < 1k sats
    return `${sats} sats`;
  }
  // USD formatting (keeping it simple for tests)
  return `$${value.toLocaleString()}`;
};

const mockUseOVTClient: {
  getTransactionHistory: jest.Mock;
  isLoading: boolean;
  error: string | null;
  formatValue: (value: number, currency?: 'btc' | 'usd') => string;
} = {
  getTransactionHistory: mockGetTransactionHistory,
  isLoading: false,
  error: null,
  formatValue: mockFormatValue
};

jest.mock('../../src/hooks/useOVTClient', () => ({
  useOVTClient: () => mockUseOVTClient
}));

describe('TransactionHistory', () => {
  const mockTransactions = [
    {
      txid: 'tx1',
      type: 'mint',
      amount: 1000,
      timestamp: 1677649200000, // 2023-03-01
      status: 'confirmed',
      details: {
        reason: 'Initial mint',
        signatures: ['sig1', 'sig2', 'sig3']
      }
    },
    {
      txid: 'tx2',
      type: 'position_entry',
      amount: 0.5,
      timestamp: 1677735600000, // 2023-03-02
      status: 'pending',
      details: {
        position: 'Project X',
        currency: 'BTC'
      }
    }
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGetTransactionHistory.mockResolvedValue(mockTransactions);
    mockUseOVTClient.isLoading = false;
    mockUseOVTClient.error = null;
  });

  it('renders transaction list correctly', async () => {
    await act(async () => {
      render(<TransactionHistory />);
    });
    
    // Wait for transactions to load and check items
    await waitFor(() => {
      // Check for the reason text
      expect(screen.getByText(/Initial mint/i)).toBeInTheDocument();
      // Check for the amount text
      expect(screen.getByText(/Amount: 1,000 OVT/)).toBeInTheDocument();
      // Check for signatures text
      expect(screen.getByText(/Signatures: 3\/3/)).toBeInTheDocument();
    });
  });

  it('handles loading state', async () => {
    mockUseOVTClient.isLoading = true;
    
    render(<TransactionHistory />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    mockUseOVTClient.error = 'Failed to fetch transactions';
    
    render(<TransactionHistory />);
    
    expect(screen.getByText('Failed to fetch transactions')).toBeInTheDocument();
  });

  it('filters transactions correctly', async () => {
    await act(async () => {
      render(<TransactionHistory />);
    });
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText(/Initial mint/i)).toBeInTheDocument();
    });
    
    // Filter by mint transactions
    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mint' } });
    });
    
    // Should show mint transaction but not position entry
    expect(screen.getByText(/Initial mint/i)).toBeInTheDocument();
    // 0.5 BTC = 50M sats, which should display as ₿0.50
    expect(screen.queryByText('Amount: ₿0.50')).not.toBeInTheDocument();
  });

  it('formats different transaction types correctly', async () => {
    await act(async () => {
      render(<TransactionHistory />);
    });
    
    // Wait for transactions to load
    await waitFor(() => {
      // Check mint transaction amount (OVT)
      expect(screen.getByText('Amount: 1,000 OVT')).toBeInTheDocument();
      // Check position entry amount (BTC)
      // 0.5 BTC = 50M sats, which should display as ₿0.50
      expect(screen.getByText('Amount: ₿0.50')).toBeInTheDocument();
    });
  });

  it('displays correct status indicators', async () => {
    await act(async () => {
      render(<TransactionHistory />);
    });
    
    // Wait for transactions to load
    await waitFor(() => {
      expect(screen.getByText('confirmed')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });
    
    const confirmedStatus = screen.getByText('confirmed');
    const pendingStatus = screen.getByText('pending');
    
    // The status color classes are on the span element itself
    expect(confirmedStatus).toHaveClass('text-green-600');
    expect(pendingStatus).toHaveClass('text-yellow-600');
  });
}); 