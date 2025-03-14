import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import PositionManagement from '../admin/PositionManagement';
import { useOVTClient } from '../../src/hooks/useOVTClient';
import { ArchClient } from '../../src/lib/archClient';

// Mock ArchClient instead of the hook
jest.mock('../../src/lib/archClient', () => {
  return {
    ArchClient: jest.fn().mockImplementation(() => ({
      getCurrentNAV: jest.fn().mockResolvedValue({
        value: 3375000000, // ₿33.75
        portfolioItems: [
          {
            name: 'Polymorphic Labs',
            value: 500000000,
            change: 420,
          },
          {
            name: 'VoltFi',
            value: 150000000,
            change: 250,
          }
        ]
      }),
      getTransactionHistory: jest.fn().mockResolvedValue([]),
      buyOVT: jest.fn().mockResolvedValue({ success: true }),
      sellOVT: jest.fn().mockResolvedValue({ success: true })
    }))
  };
});

// Mock useOVTClient hook
jest.mock('../../src/hooks/useOVTClient', () => {
  const mockClient = {
    addPosition: jest.fn(),
    getPositions: () => [],
    formatValue: (value: number) => `₿${(value / 100000000).toFixed(2)}`,
    isLoading: false,
    error: null,
    mockMode: true
  };

  return {
    useOVTClient: () => mockClient,
    __esModule: true,
    default: mockClient
  };
});

describe('PositionManagement', () => {
  const mockOnActionRequiringMultiSig = jest.fn();

  const defaultProps = {
    onActionRequiringMultiSig: mockOnActionRequiringMultiSig,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the position management form', () => {
    render(<PositionManagement {...defaultProps} />);
    
    // Check if form fields are present
    expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Investment Amount (BTC)')).toBeInTheDocument();
    expect(screen.getByLabelText('Price per Token (sats)')).toBeInTheDocument();
    expect(screen.getByLabelText('Token Amount (Calculated)')).toBeInTheDocument();
  });

  it('handles form input changes and validates currency spent calculations', async () => {
    render(<PositionManagement {...defaultProps} />);
    
    const projectNameInput = screen.getByLabelText('Project Name');
    const amountInput = screen.getByLabelText('Investment Amount (BTC)') as HTMLInputElement;
    const priceInput = screen.getByLabelText('Price per Token (sats)') as HTMLInputElement;
    const tokenAmountInput = screen.getByLabelText('Token Amount (Calculated)') as HTMLInputElement;
    
    await act(async () => {
      fireEvent.change(projectNameInput, { target: { value: 'Test Project' } });
      fireEvent.change(amountInput, { target: { value: '1' } });
      fireEvent.change(priceInput, { target: { value: '333' } });
    });

    // Wait for all state updates to complete
    await waitFor(() => {
      expect(projectNameInput).toHaveValue('Test Project');
      expect(amountInput.value).toBe('1');
      expect(priceInput.value).toBe('333');
      expect(tokenAmountInput.value).toBe('300300'); // 1 BTC = 100M sats, divided by 333 sats per token
    });
  });

  it('submits position form with proper data processing', async () => {
    render(<PositionManagement {...defaultProps} />);
    
    // Fill out the form
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'Test Project' } });
      fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test Description' } });
      fireEvent.change(screen.getByLabelText('Investment Amount (BTC)'), { target: { value: '1' } });
      fireEvent.change(screen.getByLabelText('Price per Token (sats)'), { target: { value: '100' } });
    });
    
    // Submit the form
    const submitButton = screen.getByText('Add Position');
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    // Wait for validation and submission
    await waitFor(() => {
      expect(mockOnActionRequiringMultiSig).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ADD_POSITION',
          description: 'Add position for Test Project',
          data: {
            name: 'Test Project',
            description: 'Test Description',
            value: 100000000, // 1 BTC in sats
            tokenAmount: 1000000, // 100M sats / 100 sats per token
            pricePerToken: 100,
            address: 'bc1p...'
          }
        })
      );
    });
  });

  it('validates required fields and shows error messages', async () => {
    render(<PositionManagement {...defaultProps} />);
    
    // Try to submit without filling required fields
    const submitButton = screen.getByText('Add Position');
    
    // Use await act for the form submission
    await act(async () => {
      fireEvent.submit(submitButton.closest('form')!);
    });
    
    // Check for error message in the error div
    await waitFor(() => {
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveTextContent('Project name is required');
    });
    
    // Check that the multisig action was not triggered
    expect(mockOnActionRequiringMultiSig).not.toHaveBeenCalled();
  });

  it('clears error when user starts typing', async () => {
    render(<PositionManagement {...defaultProps} />);
    
    // Submit empty form to trigger error
    const submitButton = screen.getByText('Add Position');
    
    // Use await act for the form submission
    await act(async () => {
      fireEvent.submit(submitButton.closest('form')!);
    });
    
    // Check for error message
    await waitFor(() => {
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveTextContent('Project name is required');
    });
    
    // Start typing in project name
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'Test Project' } });
    });
    
    // Check that error message is cleared
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('formats large satoshi amounts as BTC', async () => {
    render(<PositionManagement {...defaultProps} />);
    
    // Enter values that result in > 10M sats
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Investment Amount (BTC)'), { target: { value: '1' } });
      fireEvent.change(screen.getByLabelText('Price per Token (sats)'), { target: { value: '333' } });
    });
    
    // Check for token amount calculation with proper formatting
    await waitFor(() => {
      const tokenAmountInput = screen.getByLabelText('Token Amount (Calculated)');
      expect(tokenAmountInput).toHaveValue('300300');
      expect(screen.getByText('300.30k tokens')).toBeInTheDocument();
    });
  });
}); 