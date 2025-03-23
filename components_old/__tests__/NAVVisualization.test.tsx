import { render, screen, fireEvent } from '@testing-library/react';
import NAVVisualization from '../NAVVisualization';

// Mock Recharts to avoid ResponsiveContainer issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  BarChart: ({ children, onClick }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ dataKey, name, onClick }: any) => (
    <button 
      data-testid={`bar-${dataKey}`} 
      aria-label={name}
      onClick={() => onClick({
        name: 'Test Project',
        initial: 1000000,
        current: 2000000,
        growth: 1000000,
        total: 2000000,
        change: 100,
        description: 'Test Description',
        tokenAmount: 1000,
        pricePerToken: 1000,
        value: 1000000,
        address: 'bc1p...'
      })}
    >
      {name}
    </button>
  ),
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

// Mock ArchClient
jest.mock('../../src/lib/archClient', () => {
  return {
    ArchClient: jest.fn().mockImplementation(() => ({
      getCurrentNAV: jest.fn().mockResolvedValue({
        value: 200000000, // 2 BTC in sats
        portfolioItems: [{
          name: 'Test Project',
          value: 100000000,
          change: 100,
        }]
      }),
      getTransactionHistory: jest.fn().mockResolvedValue([])
    }))
  };
});

const mockData = [
  {
    name: 'Test Project',
    initial: 1000000,
    current: 2000000,
    growth: 1000000,
    total: 2000000,
    change: 100,
    description: 'Test Description',
    tokenAmount: 1000,
    pricePerToken: 1000,
    value: 1000000,
    address: 'bc1p...'
  }
];

// The mock is now handled globally in jest.setup.js
// No need to mock here as it's already mocked

describe('NAVVisualization', () => {
  const defaultProps = {
    data: mockData,
    totalValue: '₿2.00',
    changePercentage: '+100%',
    baseCurrency: 'btc' as const
  };

  it('renders without crashing', () => {
    render(<NAVVisualization {...defaultProps} />);
    expect(screen.getByText('OTORI Net Asset Value - Tracked by $OVT')).toBeInTheDocument();
  });

  it('displays total value and change percentage', () => {
    render(<NAVVisualization {...defaultProps} />);
    expect(screen.getByText('₿2.00')).toBeInTheDocument();
    expect(screen.getByText('+100%')).toBeInTheDocument();
  });

  it('shows project data in chart', () => {
    render(<NAVVisualization {...defaultProps} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Initial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Growth' })).toBeInTheDocument();
  });

  it('opens TokenExplorerModal on bar click', async () => {
    render(<NAVVisualization {...defaultProps} />);
    const initialBar = screen.getByRole('button', { name: 'Initial' });
    fireEvent.click(initialBar);
    
    // Wait for modal to appear and verify its content
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });
}); 