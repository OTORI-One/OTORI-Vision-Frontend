import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PortfolioChart from '../PortfolioChart';
import { Currency } from '../../src/hooks/useCurrencyToggle';

// Mock the hooks
jest.mock('../../src/hooks/useCurrencyToggle', () => ({
  useCurrencyToggle: () => ({
    currency: 'usd' as Currency,
    formatValue: (value: number) => `$${value.toFixed(2)}`,
  }),
}));

jest.mock('../../src/hooks/useNAV', () => ({
  useNAV: () => ({
    nav: {
      totalValue: 1000000,
      changePercentage: 5.25,
      portfolioItems: [
        {
          name: 'Bitcoin',
          value: 500000,
          current: 550000,
          change: 10.0,
          description: 'BTC',
          tokenAmount: 1.5,
          pricePerToken: 36666.67,
        },
        {
          name: 'Ethereum',
          value: 300000,
          current: 315000,
          change: 5.0,
          description: 'ETH',
          tokenAmount: 100,
          pricePerToken: 3150,
        },
        {
          name: 'Solana',
          value: 200000,
          current: 190000,
          change: -5.0,
          description: 'SOL',
          tokenAmount: 1000,
          pricePerToken: 190,
        },
      ],
    },
    loading: false,
    refreshNAV: jest.fn(),
  }),
}));

// Mock recharts components
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    BarChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="bar-chart">{children}</div>
    ),
    Bar: ({ children, dataKey, name, onClick }: { children?: React.ReactNode, dataKey: string, name: string, onClick?: any }) => (
      <div 
        data-testid={`bar-${dataKey}`} 
        className={name}
        onClick={() => onClick && onClick({
          payload: {
            name: 'Bitcoin',
            value: 500000,
            current: 550000,
            growth: 50000,
            change: 10.0,
            description: 'BTC',
            tokenAmount: 1.5,
            pricePerToken: 36666.67
          }
        })}
      >
        {children}
      </div>
    ),
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: ({ content }: { content: any }) => (
      <div data-testid="tooltip">
        {content && content({ 
          active: true, 
          payload: [{ 
            payload: { 
              name: 'Bitcoin', 
              value: 500000, 
              current: 550000, 
              growth: 50000, 
              change: 10.0,
              description: 'BTC',
              tokenAmount: 1.5,
              pricePerToken: 36666.67
            } 
          }], 
          label: 'Bitcoin' 
        })}
      </div>
    ),
    Cell: ({ fill }: { fill: string }) => <div data-testid="cell" style={{ backgroundColor: fill }} />,
  };
});

// Mock the modal
jest.mock('../TokenExplorerModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, tokenData }: any) => (
    isOpen ? (
      <div data-testid="token-explorer-modal">
        <button onClick={onClose} data-testid="close-modal">Close</button>
        <div data-testid="token-name">{tokenData.name}</div>
      </div>
    ) : null
  ),
}));

const defaultProps = {
  data: [
    {
      name: 'Bitcoin',
      value: 500000,
      current: 550000,
      change: 10.0,
      description: 'BTC',
      tokenAmount: 1.5,
      pricePerToken: 36666.67,
    },
    {
      name: 'Ethereum',
      value: 300000,
      current: 315000,
      change: 5.0,
      description: 'ETH',
      tokenAmount: 100,
      pricePerToken: 3150,
    },
  ],
  totalValue: '$865,000.00',
  changePercentage: '+6.25%',
  baseCurrency: 'usd' as Currency,
};

describe('PortfolioChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the chart with provided data', () => {
    render(<PortfolioChart {...defaultProps} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-value')).toBeInTheDocument();
    expect(screen.getByTestId('bar-growth')).toBeInTheDocument();
  });

  it('displays the tooltip with correct data', () => {
    render(<PortfolioChart {...defaultProps} />);
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Bitcoin');
    expect(tooltip).toHaveTextContent('Initial');
    expect(tooltip).toHaveTextContent('Current');
  });

  it('opens the token explorer modal when a bar is clicked', () => {
    render(<PortfolioChart {...defaultProps} />);
    // Simulate clicking on a bar by triggering the click handler
    const valueBar = screen.getByTestId('bar-value');
    fireEvent.click(valueBar);
    expect(screen.getByTestId('token-explorer-modal')).toBeInTheDocument();
    expect(screen.getByTestId('token-name')).toHaveTextContent('Bitcoin');
  });

  it('closes the modal when close button is clicked', () => {
    render(<PortfolioChart {...defaultProps} />);
    // Open the modal
    const valueBar = screen.getByTestId('bar-value');
    fireEvent.click(valueBar);
    expect(screen.getByTestId('token-explorer-modal')).toBeInTheDocument();
    
    // Close the modal
    const closeButton = screen.getByTestId('close-modal');
    fireEvent.click(closeButton);
    
    // Modal should be closed
    expect(screen.queryByTestId('token-explorer-modal')).not.toBeInTheDocument();
  });
}); 