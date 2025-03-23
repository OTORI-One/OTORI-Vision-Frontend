import { render, screen, fireEvent } from '@testing-library/react';
import ChartToggle from '../ChartToggle';

describe('ChartToggle', () => {
  const mockOnToggle = jest.fn();

  beforeEach(() => {
    mockOnToggle.mockClear();
  });

  describe('Component Rendering', () => {
    it('renders both toggle buttons', () => {
      render(<ChartToggle activeChart="price" onToggle={mockOnToggle} />);
      
      expect(screen.getByText('Price Chart')).toBeInTheDocument();
      expect(screen.getByText('NAV Breakdown')).toBeInTheDocument();
    });

    it('applies correct styling to active price chart button', () => {
      render(<ChartToggle activeChart="price" onToggle={mockOnToggle} />);
      
      const priceButton = screen.getByText('Price Chart').closest('button');
      const navButton = screen.getByText('NAV Breakdown').closest('button');
      
      expect(priceButton).toHaveClass('bg-blue-600', 'text-white');
      expect(navButton).not.toHaveClass('bg-blue-600', 'text-white');
    });

    it('applies correct styling to active nav chart button', () => {
      render(<ChartToggle activeChart="nav" onToggle={mockOnToggle} />);
      
      const priceButton = screen.getByText('Price Chart').closest('button');
      const navButton = screen.getByText('NAV Breakdown').closest('button');
      
      expect(navButton).toHaveClass('bg-blue-600', 'text-white');
      expect(priceButton).not.toHaveClass('bg-blue-600', 'text-white');
    });
  });

  describe('User Interactions', () => {
    it('calls onToggle with "price" when price chart button is clicked', () => {
      render(<ChartToggle activeChart="nav" onToggle={mockOnToggle} />);
      
      fireEvent.click(screen.getByText('Price Chart'));
      
      expect(mockOnToggle).toHaveBeenCalledWith('price');
    });

    it('calls onToggle with "nav" when nav breakdown button is clicked', () => {
      render(<ChartToggle activeChart="price" onToggle={mockOnToggle} />);
      
      fireEvent.click(screen.getByText('NAV Breakdown'));
      
      expect(mockOnToggle).toHaveBeenCalledWith('nav');
    });

    it('does not call onToggle when clicking already active button', () => {
      render(<ChartToggle activeChart="price" onToggle={mockOnToggle} />);
      
      fireEvent.click(screen.getByText('Price Chart'));
      
      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('renders buttons with proper roles and attributes', () => {
      render(<ChartToggle activeChart="price" onToggle={mockOnToggle} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);

      // Verify that buttons have proper aria-pressed attributes for toggle state
      const priceButton = screen.getByText('Price Chart');
      const navButton = screen.getByText('NAV Breakdown');
      
      expect(priceButton).toHaveAttribute('aria-pressed', 'true');
      expect(navButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('updates aria-pressed when active button changes', () => {
      const { rerender } = render(
        <ChartToggle activeChart="price" onToggle={mockOnToggle} />
      );
      
      const priceButton = screen.getByText('Price Chart');
      const navButton = screen.getByText('NAV Breakdown');
      
      expect(priceButton).toHaveAttribute('aria-pressed', 'true');
      expect(navButton).toHaveAttribute('aria-pressed', 'false');
      
      // Rerender with nav as active
      rerender(<ChartToggle activeChart="nav" onToggle={mockOnToggle} />);
      
      expect(priceButton).toHaveAttribute('aria-pressed', 'false');
      expect(navButton).toHaveAttribute('aria-pressed', 'true');
    });
  });
}); 