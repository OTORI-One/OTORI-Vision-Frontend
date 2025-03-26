/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TokenExplorerModal from '../TokenExplorerModal';
import { jest, describe, it, expect } from '@jest/globals';

// Mock the currency toggle hook
jest.mock('../../src/hooks/useCurrencyToggle', () => ({
  useCurrencyToggle: () => ({
    currency: 'usd',
    formatValue: (value) => {
      if (value === undefined || value === null) {
        return '$0.00';
      }
      return `$${value.toFixed(2)}`;
    },
    toggleCurrency: jest.fn(),
  }),
  Currency: {
    USD: 'usd',
    BTC: 'btc',
  }
}));

describe('TokenExplorerModal', () => {
  const mockToken = {
    name: 'Bitcoin',
    description: 'Digital gold',
    initialInvestment: 50000,
    currentValue: 65000,
    growth: 30,
    tokenAmount: 1.5,
    pricePerToken: 43333.33,
    formatted: {
      initialInvestment: '$50,000.00',
      currentValue: '$65,000.00',
      growth: '+30.00%',
      pricePerToken: '$43,333.33'
    }
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    token: mockToken
  };

  it('renders correctly when open', () => {
    render(<TokenExplorerModal {...defaultProps} />);
    
    // Verify project name as title
    expect(screen.getByTestId('token-name')).toHaveTextContent('Bitcoin');
    
    // Verify token data is displayed
    expect(screen.getByText('Initial Investment:')).toBeInTheDocument();
    expect(screen.getByText('Current Value:')).toBeInTheDocument();
    expect(screen.getByText('Change:')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<TokenExplorerModal {...defaultProps} />);
    
    const closeButton = screen.getByTestId('close-modal');
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    render(<TokenExplorerModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByTestId('token-explorer-modal')).not.toBeInTheDocument();
  });

  it('displays token details correctly', () => {
    render(<TokenExplorerModal {...defaultProps} />);
    
    // Check token details section
    expect(screen.getByText('Token Details')).toBeInTheDocument();
    expect(screen.getByText('Holdings:')).toBeInTheDocument();
    expect(screen.getByText('1.5 tokens')).toBeInTheDocument();
    expect(screen.getByText('Price per Token:')).toBeInTheDocument();
  });

  it('displays transaction history', () => {
    render(<TokenExplorerModal {...defaultProps} />);
    
    // Check transaction history section
    expect(screen.getByText('Transaction History')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Purchase')).toBeInTheDocument();
  });

  it('displays positive growth correctly', () => {
    render(<TokenExplorerModal {...defaultProps} />);
    
    // Check for positive growth display
    const changeText = screen.getByText('Change:').nextElementSibling;
    expect(changeText).toHaveClass('text-success');
    expect(changeText).toHaveTextContent('+30.00%');
  });
  
  it('displays negative growth correctly', () => {
    const negativeGrowthToken = {
      ...mockToken,
      growth: -15,
      formatted: {
        ...mockToken.formatted,
        growth: '-15.00%'
      }
    };
    
    render(
      <TokenExplorerModal
        {...defaultProps}
        token={negativeGrowthToken}
      />
    );
    
    // Check for negative growth display
    const changeText = screen.getByText('Change:').nextElementSibling;
    expect(changeText).toHaveClass('text-error');
    expect(changeText).toHaveTextContent('-15.00%');
  });
}); 