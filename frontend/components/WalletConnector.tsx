import { useState, useCallback, useEffect } from 'react';
import { UNISAT, XVERSE, useLaserEyes, ProviderType } from '@omnisat/lasereyes';

interface WalletConnectorProps {
  onConnect: (address: string) => void;
  onDisconnect: () => void;
  connectedAddress?: string;
}

export default function WalletConnector({ onConnect, onDisconnect, connectedAddress }: WalletConnectorProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { connect, disconnect, address, network } = useLaserEyes();

  // Event emitter for wallet connections
  useEffect(() => {
    if (address) {
      console.log('Wallet connected:', address);
      // Dispatch a custom event that other components can listen for
      const event = new CustomEvent('wallet-connected', { detail: { address } });
      window.dispatchEvent(event);
      
      // Call onConnect directly if address changes from the connectedAddress
      if (address !== connectedAddress) {
        console.log('Address changed or newly connected, calling onConnect with:', address);
        onConnect(address);
      }
    }
  }, [address, connectedAddress, onConnect]);

  const handleConnect = useCallback(async (wallet: ProviderType) => {
    setIsConnecting(true);
    setError(null);

    try {
      console.log('Attempting to connect with wallet:', wallet);
      await connect(wallet);
      
      if (address) {
        console.log('Successfully connected to wallet');
        console.log('Current network:', network);
        console.log('Current address:', address);
        onConnect(address);
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      console.error('Error details:', {
        message: err.message,
        network: network,
        wallet: wallet
      });
      
      if (err.message?.includes('User canceled') || err.message?.includes('user rejected')) {
        console.log('User cancelled connection');
        return;
      }
      
      if (err.message?.includes('not installed')) {
        setError(`${wallet} wallet is not installed. Please install it first.`);
      } else if (err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('testnet')) {
        setError('Please switch to Bitcoin Testnet 4 in your wallet settings');
      } else {
        setError('Connection failed. Please try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [connect, address, network, onConnect]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    onDisconnect();
    setError(null);
  }, [disconnect, onDisconnect]);

  if (connectedAddress) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">
            {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
          </span>
          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
            Testnet 4
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleConnect(XVERSE)}
          disabled={isConnecting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          <span>{isConnecting ? 'Connecting...' : 'Connect Xverse'}</span>
          {isConnecting && (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          )}
        </button>
        
        <button
          onClick={() => handleConnect(UNISAT)}
          disabled={isConnecting}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          <span>{isConnecting ? 'Connecting...' : 'Connect Unisat'}</span>
          {isConnecting && (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          )}
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">
            {error}
          </p>
          {error.toLowerCase().includes('testnet') && (
            <div className="mt-2 space-y-2 text-sm text-red-500">
              <p>To switch to Bitcoin Testnet 4:</p>
              <ol className="list-decimal list-inside space-y-1 pl-2">
                <li>Open your Xverse wallet</li>
                <li>Click the settings gear icon</li>
                <li>Select "Network"</li>
                <li>Choose "Testnet 4"</li>
                <li>Wait for the network switch to complete</li>
                <li>Try connecting again</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}