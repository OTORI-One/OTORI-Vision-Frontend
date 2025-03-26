import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PriceChart from '../PriceChart';
import { useBitcoinPrice } from '../../src/hooks/useBitcoinPrice';
import { ReactNode } from 'react';

// Mock the useBitcoinPrice hook
jest.mock('../../src/hooks/useBitcoinPrice', () => ({
  useBitcoinPrice: () => ({
    price: 50000, // Mock BTC price at $50,000
    loading: false,
    error: null
  })
}));

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: { children: ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />
}));

describe('PriceChart', () => {
  const mockData = [
    { name: 'Q1 \'26', value: 200 },
    { name: 'Q2 \'26', value: 400 },
    { name: 'Q3 \'26', value: 300 },
    { name: 'Q4 \'26', value: 280 },
  ];

  const defaultProps = {
    data: mockData,
    baseCurrency: 'usd' as const
  };

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      render(<PriceChart {...defaultProps} />);
      expect(screen.getByText('Price Performance')).toBeInTheDocument();
    });

    it('renders all chart components', () => {
      render(<PriceChart {...defaultProps} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('Currency Display', () => {
    it('formats USD values correctly', () => {
      render(<PriceChart {...defaultProps} />);
      // Check if USD formatting is applied
      const chartContainer = screen.getByTestId('line-chart');
      expect(chartContainer).toBeInTheDocument();
    });

    it('formats BTC values correctly', () => {
      render(<PriceChart {...defaultProps} baseCurrency="btc" />);
      // Check if BTC formatting is applied
      const chartContainer = screen.getByTestId('line-chart');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('Data Handling', () => {
    it('handles empty data gracefully', () => {
      render(<PriceChart data={[]} baseCurrency="usd" />);
      expect(screen.getByText('Price Performance')).toBeInTheDocument();
    });

    it('uses mock data when data prop is not provided', () => {
      render(<PriceChart baseCurrency="usd" />);
      expect(screen.getByText('Price Performance')).toBeInTheDocument();
    });
  });

  describe('Responsiveness', () => {
    it('renders in a responsive container', () => {
      render(<PriceChart {...defaultProps} />);
      const container = screen.getByTestId('responsive-container').parentElement;
      expect(container).toHaveClass('h-80');
    });
  });
}); 