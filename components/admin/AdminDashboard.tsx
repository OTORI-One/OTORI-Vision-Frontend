import { useState, useEffect } from 'react';
import MultiSigApproval from './MultiSigApproval';
import PositionManagement from './PositionManagement';
import TokenMinting from './TokenMinting';
import RuneMinting from './RuneMinting';
import TransactionHistory from './TransactionHistory';
import { useOVTClient } from '../../src/hooks/useOVTClient';
import { isAdminWallet } from '../../src/utils/adminUtils';
import { useLaserEyes } from '@omnisat/lasereyes';

enum AdminView {
  POSITIONS = 'positions',
  MINT = 'mint',
  RUNE_MINT = 'rune_mint',
  HISTORY = 'history',
}

export default function AdminDashboard() {
  const [activeView, setActiveView] = useState<AdminView>(AdminView.POSITIONS);
  const [isMultiSigModalOpen, setIsMultiSigModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { isLoading, error, navData, formatValue } = useOVTClient();
  const { address } = useLaserEyes();

  // Check if current wallet is an admin
  useEffect(() => {
    console.log('AdminDashboard - Current address:', address);
    console.log('Address type:', typeof address, 'Address length:', address?.length || 0);
    
    // Explicit check that address exists and is non-empty
    if (!address || address.trim() === '') {
      console.log('AdminDashboard - No valid address detected, setting isAdmin to false');
      setIsAdmin(false);
      return;
    }
    
    // Check admin status
    const adminStatus = isAdminWallet(address);
    console.log('AdminDashboard - Admin status check result:', adminStatus);
    console.log('AdminDashboard - Is admin?', adminStatus);
    setIsAdmin(adminStatus);
  }, [address]);

  const handleActionRequiringMultiSig = (action: any) => {
    setPendingAction(action);
    setIsMultiSigModalOpen(true);
  };

  const handleMultiSigComplete = async (signatures: string[]) => {
    if (!pendingAction) return;
    
    try {
      // Execute the action with collected signatures
      await pendingAction.execute(signatures);
      
      // Reset the pending action and close the modal
      setPendingAction(null);
      setIsMultiSigModalOpen(false);
    } catch (error) {
      console.error('Error executing multi-sig action:', error);
      // Here you might want to set an error state and display it to the user
    }
  };

  const handleMultiSigCancel = () => {
    setPendingAction(null);
    setIsMultiSigModalOpen(false);
  };

  // Return the admin dashboard or access denied message based on admin status
  return (
    <div className="w-full bg-white shadow-md rounded-lg p-6 font-sans text-gray-800">
      {/* Back Button */}
      <div className="mb-4">
        <a href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Dashboard</span>
        </a>
      </div>
      
      {/* Debug Info */}
      <div className="mb-4 p-2 bg-gray-100 rounded">
        <p className="text-xs">Debug - isAdmin: {String(isAdmin)}</p>
        <p className="text-xs">Debug - Address: {address || 'No address'}</p>
        <p className="text-xs">Debug - Active View: {activeView}</p>
      </div>
      
      {/* Changed from hardcoded "true" to use isAdmin state */}
      {isAdmin ? (
        <>
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-xl font-semibold text-gray-900">Admin Dashboard</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage OVT Fund operations and view system metrics
            </p>
          </div>
          
          {/* Admin Navigation */}
          <div className="border-b border-gray-200 mt-4">
            <nav className="flex py-2 space-x-4 overflow-x-auto">
              <button
                onClick={() => setActiveView(AdminView.POSITIONS)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === AdminView.POSITIONS
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Position Management
              </button>
              <button
                onClick={() => setActiveView(AdminView.MINT)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === AdminView.MINT
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Token Minting
              </button>
              <button
                onClick={() => setActiveView(AdminView.RUNE_MINT)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === AdminView.RUNE_MINT
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Rune Minting
              </button>
              <button
                onClick={() => setActiveView(AdminView.HISTORY)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeView === AdminView.HISTORY
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Transaction History
              </button>
            </nav>
          </div>
          
          <div className="mt-6">
            {/* Simple test rendering to debug component issues */}
            <div className="p-6">
              <h3 className="text-lg font-semibold">Admin Component Test</h3>
              <p className="mb-4">Current Active View: {activeView}</p>
              
              {activeView === AdminView.POSITIONS && (
                <div className="p-4 bg-blue-50 rounded">
                  <p>Position Management Component Would Render Here</p>
                </div>
              )}
              
              {activeView === AdminView.MINT && (
                <div className="p-4 bg-green-50 rounded">
                  <p>Token Minting Component Would Render Here</p>
                </div>
              )}
              
              {activeView === AdminView.RUNE_MINT && (
                <div className="p-4 bg-yellow-50 rounded">
                  <p>Rune Minting Component Would Render Here</p>
                </div>
              )}
              
              {activeView === AdminView.HISTORY && (
                <div className="p-4 bg-purple-50 rounded">
                  <p>Transaction History Component Would Render Here</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Access denied. This dashboard is only accessible to admin wallets.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 