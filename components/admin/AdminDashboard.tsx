import { useState, useEffect } from 'react';
import MultiSigApproval from './MultiSigApproval';
import PositionManagement from './PositionManagement';
import TokenMinting from './TokenMinting';
import RuneMinting from './RuneMinting';
import TransactionHistory from './TransactionHistory';
import { useOVTClient } from '../../src/hooks/useOVTClient';
import { isAdminWallet, ADMIN_WALLETS } from '../../src/utils/adminUtils';
import { useLaserEyes, XVERSE, UNISAT } from '@omnisat/lasereyes';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { getDataSourceIndicator } from '../../src/lib/hybridModeUtils';

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
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(true);
  const { isLoading, error, navData, formatValue } = useOVTClient();
  const { address, connect, disconnect, network } = useLaserEyes();

  // Get data source indicator for portfolio
  const portfolioDataSource = getDataSourceIndicator('portfolio');

  const addDebugLog = (message: string) => {
    console.log('[AdminDashboard]', message);
    setDebugLogs(prev => [...prev, message]);
  };

  // Check if current wallet is an admin with delay to prevent race conditions
  useEffect(() => {
    addDebugLog(`Current address: ${address || 'No address'}`);
    addDebugLog(`Network: ${network || 'Unknown'}`);
    
    // Set loading to true when address changes
    setIsLocalLoading(true);
    
    // Small delay to ensure other components have processed the wallet connection
    const timer = setTimeout(() => {
      if (!address) {
        addDebugLog('No wallet address detected, admin status is false');
        setIsAdmin(false);
        setIsLocalLoading(false);
        return;
      }
      
      // List admin wallets for debugging
      addDebugLog(`Admin wallets (${ADMIN_WALLETS.length}): ${ADMIN_WALLETS.join(', ')}`);
      
      // Check admin status with our improved logging
      const adminStatus = isAdminWallet(address);
      addDebugLog(`Admin status check result: ${adminStatus}`);
      setIsAdmin(adminStatus);
      setIsLocalLoading(false);
    }, 500); // 500ms delay
    
    return () => clearTimeout(timer);
  }, [address, network]);

  // Listen for wallet connection events from WalletConnector
  useEffect(() => {
    const handleWalletConnection = (e: CustomEvent) => {
      addDebugLog(`[AdminDashboard] Detected wallet connection event: ${e.detail.address}`);
      // This is just for logging, the LaserEyes hook should handle the actual state update
    };
    
    window.addEventListener('wallet-connected', handleWalletConnection as EventListener);
    return () => {
      window.removeEventListener('wallet-connected', handleWalletConnection as EventListener);
    };
  }, []);

  // Custom wallet connection handlers that utilize the LaserEyes hook
  const handleConnectWallet = async (walletType: 'xverse' | 'unisat') => {
    try {
      addDebugLog(`Attempting to connect ${walletType} wallet...`);
      if (walletType === 'xverse') {
        await connect(XVERSE);
      } else {
        await connect(UNISAT);
      }
    } catch (err) {
      addDebugLog(`Error connecting wallet: ${err}`);
    }
  };
  
  const handleDisconnectWallet = () => {
    addDebugLog('Disconnecting wallet...');
    disconnect();
  };

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

  // Return loading indicator while checking admin status
  if (isLocalLoading) {
    return (
      <div className="w-full bg-white shadow-md rounded-lg p-6 font-sans text-gray-800">
        <div className="flex items-center justify-center p-12">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="text-gray-500">Verifying admin status...</div>
          </div>
        </div>
      </div>
    );
  }

  // Return the admin dashboard or access denied message based on admin status
  return (
    <div className="w-full bg-white shadow-md rounded-lg p-6 font-sans text-gray-800">
      {/* Back Button */}
      <div className="mb-4">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
      
      {/* Debug Info */}
      <div className="mb-4 p-2 bg-gray-100 rounded">
        <p className="text-xs">Debug - isAdmin: {String(isAdmin)}</p>
        <p className="text-xs">Debug - Address: {address || 'No address'}</p>
        <p className="text-xs">Debug - Active View: {activeView}</p>
        <p className="text-xs">Debug - Network: {network || 'Unknown'}</p>
        
        {/* Manual wallet connection if no address detected */}
        {!address && (
          <div className="mt-2">
            <p className="text-xs mb-1">No wallet connected. Try connecting manually:</p>
            <div className="flex space-x-2">
              <button 
                onClick={() => handleConnectWallet('xverse')}
                className="text-xs px-2 py-1 bg-blue-500 text-white rounded"
              >
                Connect Xverse
              </button>
              <button 
                onClick={() => handleConnectWallet('unisat')}
                className="text-xs px-2 py-1 bg-orange-500 text-white rounded"
              >
                Connect Unisat
              </button>
            </div>
          </div>
        )}
        
        {/* Disconnect button if address detected */}
        {address && (
          <div className="mt-2">
            <button 
              onClick={handleDisconnectWallet}
              className="text-xs px-2 py-1 bg-gray-500 text-white rounded"
            >
              Disconnect Wallet
            </button>
          </div>
        )}
        
        {/* Debug Logs */}
        <div className="mt-2">
          <p className="text-xs font-semibold">Debug Logs:</p>
          <div className="max-h-24 overflow-y-auto text-xs">
            {debugLogs.map((log, index) => (
              <div key={index} className="text-xs">{log}</div>
            ))}
          </div>
        </div>
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
                    {portfolioDataSource.isMock ? "Simulated Data" : "Real Contract Data"}
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
              {address && (
                <p className="text-sm text-red-700 mt-2">
                  Your current address "{address}" is not in the admin whitelist.
                </p>
              )}
              {!address && (
                <p className="text-sm text-red-700 mt-2">
                  You need to connect a wallet to access the admin dashboard.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 