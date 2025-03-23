import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import TokenMinting from '../admin/TokenMinting';
import { render, mockAdminWallet, generateMockAdminAction } from '../../test-utils/test-utils';

// Mock useOVTClient hook
const mockUseOVTClient = {
  isLoading: false,
};

jest.mock('../../src/hooks/useOVTClient', () => ({
  useOVTClient: () => mockUseOVTClient,
}));

describe('TokenMinting', () => {
  const mockOnActionRequiringMultiSig = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset loading state before each test
    mockUseOVTClient.isLoading = false;
  });

  const renderComponent = () => {
    return render(
      <TokenMinting 
        onActionRequiringMultiSig={mockOnActionRequiringMultiSig} 
      />
    );
  };

  describe('Component Rendering', () => {
    it('renders the component with all required elements', () => {
      renderComponent();

      // Verify form elements are present
      expect(screen.getByLabelText(/amount to mint/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/minting reason/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /mint tokens/i })).toBeInTheDocument();
      
      // Verify warning message about multisig requirement
      expect(screen.getByText(/token minting requires 3-of-5 admin signatures/i)).toBeInTheDocument();
    });

    it('initially renders with disabled submit button', () => {
      renderComponent();
      const submitButton = screen.getByRole('button', { name: /mint tokens/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('enables submit button when both fields are filled', async () => {
      renderComponent();
      
      const amountInput = screen.getByLabelText(/amount to mint/i);
      const reasonInput = screen.getByLabelText(/minting reason/i);
      const submitButton = screen.getByRole('button', { name: /mint tokens/i });

      await act(async () => {
        await userEvent.type(amountInput, '1000');
        await userEvent.type(reasonInput, 'Test minting reason');
      });

      expect(submitButton).toBeEnabled();
    });

    it('validates amount input to be positive', async () => {
      renderComponent();
      
      const amountInput = screen.getByLabelText(/amount to mint/i) as HTMLInputElement;
      
      await act(async () => {
        await userEvent.type(amountInput, '-100');
      });

      // In a real browser, HTML5 validation would prevent negative values
      // In tests, we verify the input has the correct attributes
      expect(amountInput).toHaveAttribute('min', '1');
      expect(amountInput).toHaveAttribute('type', 'number');
      
      // Verify the form validation state
      const submitButton = screen.getByRole('button', { name: /mint tokens/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Submission', () => {
    it('calls onActionRequiringMultiSig with correct action data when form is submitted', async () => {
      renderComponent();
      
      const amountInput = screen.getByLabelText(/amount to mint/i);
      const reasonInput = screen.getByLabelText(/minting reason/i);
      const submitButton = screen.getByRole('button', { name: /mint tokens/i });

      await act(async () => {
        await userEvent.type(amountInput, '1000');
        await userEvent.type(reasonInput, 'Test minting reason');
        await userEvent.click(submitButton);
      });

      expect(mockOnActionRequiringMultiSig).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MINT_TOKENS',
          description: expect.stringContaining('Mint 1000 OTORI VISION TOKEN'),
          data: expect.objectContaining({
            amount: 1000,
            reason: 'Test minting reason',
            symbol: 'OTORI·VISION·TOKEN',
          }),
        })
      );
    });

    it('prevents form submission when loading', async () => {
      mockUseOVTClient.isLoading = true;
      renderComponent();
      
      const amountInput = screen.getByLabelText(/amount to mint/i);
      const reasonInput = screen.getByLabelText(/minting reason/i);
      const submitButton = screen.getByRole('button', { name: /processing/i });

      await act(async () => {
        await userEvent.type(amountInput, '1000');
        await userEvent.type(reasonInput, 'Test minting reason');
      });

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Processing...');
    });
  });

  describe('Error Handling', () => {
    it('handles non-numeric amount input', async () => {
      renderComponent();
      
      const amountInput = screen.getByLabelText(/amount to mint/i);
      
      await act(async () => {
        await userEvent.type(amountInput, 'abc');
      });

      // Number input should prevent non-numeric input
      expect(amountInput).toHaveValue(null);
    });

    it('prevents submission with empty fields', async () => {
      renderComponent();
      
      const submitButton = screen.getByRole('button', { name: /mint tokens/i });
      expect(submitButton).toBeDisabled();
      
      await act(async () => {
        await userEvent.click(submitButton);
      });

      expect(mockOnActionRequiringMultiSig).not.toHaveBeenCalled();
    });
  });

  describe('Integration with MultiSig', () => {
    it('creates action with correct multisig requirements', async () => {
      renderComponent();
      
      const amountInput = screen.getByLabelText(/amount to mint/i);
      const reasonInput = screen.getByLabelText(/minting reason/i);
      const submitButton = screen.getByRole('button', { name: /mint tokens/i });
      
      await act(async () => {
        await userEvent.type(amountInput, '1000');
        await userEvent.type(reasonInput, 'Test minting reason');
        await userEvent.click(submitButton);
      });

      // Verify the action was created with proper description and data
      expect(mockOnActionRequiringMultiSig).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MINT_TOKENS',
          description: expect.stringContaining('Mint 1000 OTORI VISION TOKEN'),
          data: expect.objectContaining({
            amount: 1000,
            reason: 'Test minting reason',
            symbol: 'OTORI·VISION·TOKEN',
            timestamp: expect.any(Number),
          }),
        })
      );
    });
  });
}); 