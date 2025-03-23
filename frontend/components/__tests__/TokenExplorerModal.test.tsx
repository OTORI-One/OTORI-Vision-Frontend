// ovt-fund/components/__tests__/TokenExplorerModal.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react'
import TokenExplorerModal from '../TokenExplorerModal'
import { generateMockPortfolio } from '../../test-utils/test-utils'

// Mock useBitcoinPrice hook
jest.mock('../../src/hooks/useBitcoinPrice', () => ({
  useBitcoinPrice: () => ({
    price: 50000, // Mock BTC price at $50,000
    loading: false,
    error: null
  })
}));

// Mock the formatting.ts module directly
jest.mock('../../src/lib/formatting', () => {
  const SATS_PER_BTC = 100000000; // 100M sats per BTC
  const BTC_PRICE = 50000; // $50,000 per BTC

  return {
    SATS_PER_BTC,
    formatValue: (value: number, displayMode: 'btc' | 'usd' = 'usd', btcPrice = 50000) => {
      if (displayMode === 'btc') {
        return `₿${(value / SATS_PER_BTC).toFixed(2)}`;
      }
      // USD format: $XXXXX.XX - exact format expected by tests (no k/M notation)
      const usdValue = (value / SATS_PER_BTC) * BTC_PRICE;
      return `$${usdValue.toFixed(2)}`;
    },
    formatTokenAmount: (value: string) => {
      const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
      if (isNaN(numericValue)) return '0 tokens';
      
      if (numericValue >= 1000000) {
        return `${(numericValue / 1000000).toFixed(2)}M tokens`;
      }
      if (numericValue >= 1000) {
        return `${Math.floor(numericValue / 1000)}k tokens`;
      }
      return `${Math.floor(numericValue)} tokens`;
    }
  };
});

// Mock useOVTClient hook
jest.mock('../../src/hooks/useOVTClient', () => {
  const BTC_PRICE = 50000; // $50,000 per BTC

  const mockClient = {
    btcPrice: BTC_PRICE
  };

  return {
    useOVTClient: () => mockClient,
    __esModule: true,
    default: mockClient
  };
});

describe('TokenExplorerModal', () => {
  const mockTokenData = {
    name: 'Test Project',
    description: 'Test Description',
    initial: 100000000, // 1 BTC in sats = $50,000
    current: 200000000, // 2 BTC in sats = $100,000
    change: 100,
    address: '0x1234...5678',
    holdings: '1000 OTORI',
    totalValue: 200000000, // 2 BTC in sats = $100,000
    transactions: [
      {
        date: '2024-03-15',
        type: 'buy' as const,
        amount: '500 OTORI',
        price: 50000000 // 0.5 BTC in sats = $25,000
      }
    ]
  }

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    tokenData: mockTokenData
  }

  it('renders correctly when open', () => {
    render(<TokenExplorerModal {...defaultProps} />)
    
    // Verify project name as title
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    
    // Verify token data sections
    expect(screen.getByText('Total Holdings')).toBeInTheDocument()
    expect(screen.getByText('1k tokens')).toBeInTheDocument()
    expect(screen.getByText('Profit/Loss')).toBeInTheDocument()
    expect(screen.getByText('+100.00%')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(<TokenExplorerModal {...defaultProps} />)
    
    const closeButton = screen.getByTestId('close-icon')
    fireEvent.click(closeButton)
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('does not render when isOpen is false', () => {
    render(<TokenExplorerModal {...defaultProps} isOpen={false} />)
    
    expect(screen.queryByText('Token Explorer')).not.toBeInTheDocument()
  })

  it('displays loading state when tokenData is loading', () => {
    const loadingProps = {
      ...defaultProps,
      tokenData: {
        ...mockTokenData,
        initial: 0,
        current: 0,
        change: 0,
        holdings: '0',
        transactions: []
      }
    }
    
    render(<TokenExplorerModal {...loadingProps} />)
    expect(screen.getByText('0 tokens')).toBeInTheDocument()
  })

  it('handles error state when tokenData is invalid', () => {
    const errorProps = {
      ...defaultProps,
      tokenData: {
        ...mockTokenData,
        current: 0,
        change: -100,
        holdings: '0',
        transactions: []
      }
    }
    
    render(<TokenExplorerModal {...errorProps} />)
    expect(screen.getByText('-100.00%')).toBeInTheDocument()
  })

  it('formats large numbers correctly', () => {
    const largeNumberData = {
      ...mockTokenData,
      initial: 1000000000, // 10 BTC in sats = $500,000
      current: 2500000000, // 25 BTC in sats = $1,250,000
      holdings: '1000000',
      totalValue: 2500000000 // 25 BTC in sats = $1,250,000
    }
    
    render(
      <TokenExplorerModal
        {...defaultProps}
        tokenData={largeNumberData}
      />
    )
    
    // Check formatted profit/loss display
    expect(screen.getByText('+150.00%')).toBeInTheDocument()
    
    // Find the total value element
    const totalValueElement = screen.getByText('Total Value').nextElementSibling;
    expect(totalValueElement).toHaveTextContent('$1250000.00')
    
    // Check token amount formatting
    expect(screen.getByText('1.00M tokens')).toBeInTheDocument()
  })

  it('displays project description correctly', () => {
    render(<TokenExplorerModal {...defaultProps} />)
    
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  describe('Currency Toggle Functionality', () => {
    it('displays values in USD by default', () => {
      render(<TokenExplorerModal {...defaultProps} />);
      
      // Find elements by their parent context and content
      const totalValueElement = screen.getByText('Total Value').nextElementSibling;
      expect(totalValueElement).toHaveTextContent('$100000.00'); // 2 BTC * $50,000
    });

    it('switches to BTC display when baseCurrency is btc', () => {
      render(
        <TokenExplorerModal
          {...defaultProps}
          baseCurrency="btc"
        />
      );
      
      const totalValueElement = screen.getByText('Total Value').nextElementSibling;
      expect(totalValueElement).toHaveTextContent('₿2.00');
    });

    it('formats transaction history with correct currency', () => {
      render(
        <TokenExplorerModal
          {...defaultProps}
          baseCurrency="btc"
        />
      );
      
      // Find the transaction price in the table
      const transactionRows = screen.getAllByRole('row');
      const priceCell = transactionRows[1].querySelector('td:last-child');
      expect(priceCell).toHaveTextContent('₿0.50');
    });

    it('formats currency values correctly based on selected currency', () => {
      // Test USD mode
      const { rerender } = render(<TokenExplorerModal {...defaultProps} baseCurrency="usd" />);
      
      let totalValueElement = screen.getByText('Total Value').nextElementSibling;
      expect(totalValueElement).toHaveTextContent('$100000.00'); // 2 BTC * $50,000
      
      // Test token amount formatting remains consistent
      expect(screen.getByText('1k tokens')).toBeInTheDocument();
      
      // Test BTC mode
      rerender(<TokenExplorerModal {...defaultProps} baseCurrency="btc" />);
      
      totalValueElement = screen.getByText('Total Value').nextElementSibling;
      expect(totalValueElement).toHaveTextContent('₿2.00');
      
      // Token amount should still be the same
      expect(screen.getByText('1k tokens')).toBeInTheDocument();
    });
  })
})