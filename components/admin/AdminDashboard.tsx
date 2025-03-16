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
    const adminStatus = address ? isAdminWallet(address) : false;
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
            {/* Fund Metrics Summary */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">OVT Fund Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-500">Total Value</p>
                  <p className="text-xl font-bold">{navData?.totalValue || "Loading..."}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-500">Change</p>
                  <p className={`text-xl font-bold ${
                    parseFloat(navData?.changePercentage || "0") >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {navData?.changePercentage || "0%"}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-500">Data Source</p>
                  <p className="text-xl font-bold">
                    {navData?.dataSource?.isMock ? "Simulated Data" : "Real Contract Data"}
                  </p>
                </div>
              </div>
            </div>
            
            {/* OVT Rune Information */}
            <div className="p-6 bg-white border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">OVT Rune Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="text-base">Not Etched</p>
                    <p className="text-sm text-gray-500">Bitcoin Rune representing the OTORI Vision Token</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Initial Supply</p>
                    <p className="text-base">500,000</p>
                  </div>
                </div>
                <div>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-500">Current Supply</p>
                    <p className="text-base">500,000</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Minting</p>
                    <p className="text-base">Enabled</p>
                    <p className="text-sm font-medium text-gray-500 mt-2">Minting Events</p>
                    <p className="text-base">0</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Admin View Content */}
            <div className="p-6">
              {activeView === AdminView.POSITIONS && (
                <PositionManagement onActionRequiringMultiSig={handleActionRequiringMultiSig} />
              )}
              
              {activeView === AdminView.MINT && (
                <TokenMinting onActionRequiringMultiSig={handleActionRequiringMultiSig} />
              )}
              
              {activeView === AdminView.RUNE_MINT && (
                <RuneMinting />
              )}
              
              {activeView === AdminView.HISTORY && (
                <TransactionHistory />
              )}
            </div>
            
            {/* Multi-Sig Modal */}
            {isMultiSigModalOpen && pendingAction && (
              <MultiSigApproval
                isOpen={isMultiSigModalOpen}
                onClose={handleMultiSigCancel}
                onComplete={handleMultiSigComplete}
                action={pendingAction}
              />
            )}
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