import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from '../admin/AdminDashboard';
import { useOVTClient } from '../../src/hooks/useOVTClient';
import { useLaserEyes } from '@omnisat/lasereyes';
import * as adminUtils from '../../src/utils/adminUtils';

// Mock the hooks
jest.mock('../../src/hooks/useOVTClient', () => ({
  useOVTClient: jest.fn(() => ({
    isLoading: false,
    error: null
  }))
}));

jest.mock('@omnisat/lasereyes', () => ({
  useLaserEyes: jest.fn(() => ({
    address: '0x1234...5678',
    isConnected: true
  }))
}));

// Mock the admin utils
jest.mock('../../src/utils/adminUtils', () => ({
  isAdminWallet: jest.fn((address: string) => address === '0x1234...5678')
}));

// Create a shared mock execute function
const mockExecute = jest.fn().mockResolvedValue(true);

// Mock the child components
jest.mock('../admin/PositionManagement', () => ({
  __esModule: true,
  default: ({ onActionRequiringMultiSig }: any) => (
    <div 
      data-testid="position-management"
      onClick={() => onActionRequiringMultiSig({
        type: 'add_position',
        description: 'Add new position',
        execute: mockExecute
      })}
    >
      Position Management
    </div>
  )
}));

jest.mock('../admin/TokenMinting', () => ({
  __esModule: true,
  default: () => <div data-testid="token-minting">Token Minting</div>
}));

jest.mock('../admin/TransactionHistory', () => ({
  __esModule: true,
  default: () => <div data-testid="transaction-history">Transaction History</div>
}));

jest.mock('../admin/MultiSigApproval', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, onComplete, action }: any) => (
    isOpen ? (
      <div data-testid="multisig-modal">
        <button onClick={() => onComplete(['sig1', 'sig2', 'sig3'])}>Complete</button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

describe('AdminDashboard', () => {
  const mockUseLaserEyes = useLaserEyes as jest.Mock;
  const mockUseOVTClient = useOVTClient as jest.Mock;
  const mockIsAdminWallet = adminUtils.isAdminWallet as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock values for admin access
    mockUseLaserEyes.mockReturnValue({
      address: '0x1234...5678',
      isConnected: true
    });
    mockIsAdminWallet.mockReturnValue(true);
    mockUseOVTClient.mockReturnValue({
      isLoading: false,
      error: null
    });
  });

  describe('Access Control', () => {
    it('renders access denied message for non-admin wallets', () => {
      mockIsAdminWallet.mockReturnValue(false);
      render(<AdminDashboard />);
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });

    it('renders dashboard for admin wallets', () => {
      render(<AdminDashboard />);
      expect(screen.getByText('Portfolio Positions')).toBeInTheDocument();
      expect(screen.getByText('Mint Tokens')).toBeInTheDocument();
      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('shows position management by default', () => {
      render(<AdminDashboard />);
      expect(screen.getByTestId('position-management')).toBeInTheDocument();
    });

    it('switches to token minting view', () => {
      render(<AdminDashboard />);
      fireEvent.click(screen.getByText('Mint Tokens'));
      expect(screen.getByTestId('token-minting')).toBeInTheDocument();
    });

    it('switches to transaction history view', () => {
      render(<AdminDashboard />);
      fireEvent.click(screen.getByText('Transaction History'));
      expect(screen.getByTestId('transaction-history')).toBeInTheDocument();
    });

    it('applies correct styling to active navigation item', () => {
      render(<AdminDashboard />);
      
      const positionsButton = screen.getByText('Portfolio Positions');
      expect(positionsButton).toHaveClass('bg-blue-600', 'text-white');
      
      fireEvent.click(screen.getByText('Mint Tokens'));
      expect(positionsButton).not.toHaveClass('bg-blue-600', 'text-white');
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading spinner when loading', () => {
      mockUseOVTClient.mockReturnValue({
        isLoading: true,
        error: null
      });
      render(<AdminDashboard />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows error message when there is an error', () => {
      mockUseOVTClient.mockReturnValue({
        isLoading: false,
        error: 'Failed to load data'
      });
      render(<AdminDashboard />);
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });
  });

  describe('MultiSig Integration', () => {
    it('opens multisig modal when action requires signatures', async () => {
      render(<AdminDashboard />);
      
      // Trigger an action that requires multisig
      const dashboard = screen.getByTestId('position-management');
      fireEvent.click(dashboard);

      // Wait for the modal to appear
      await waitFor(() => {
        expect(screen.getByTestId('multisig-modal')).toBeInTheDocument();
      });
    });

    it('handles multisig completion', async () => {
      render(<AdminDashboard />);
      
      // Trigger an action that requires multisig
      const dashboard = screen.getByTestId('position-management');
      fireEvent.click(dashboard);

      // Wait for the modal and complete button to appear
      await waitFor(() => {
        const completeButton = screen.getByText('Complete');
        fireEvent.click(completeButton);
      });

      // Verify that the action was executed with signatures
      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalledWith(['sig1', 'sig2', 'sig3']);
      });
    });

    it('closes modal on successful multisig completion', async () => {
      render(<AdminDashboard />);
      
      // Trigger an action that requires multisig
      const dashboard = screen.getByTestId('position-management');
      fireEvent.click(dashboard);

      // Wait for the modal to appear and click close
      await waitFor(() => {
        const closeButton = screen.getByText('Close');
        fireEvent.click(closeButton);
      });

      // Verify modal is closed
      await waitFor(() => {
        expect(screen.queryByTestId('multisig-modal')).not.toBeInTheDocument();
      });
    });
  });
}); 