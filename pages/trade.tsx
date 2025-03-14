import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import TradingInterface from '../components/TradingInterface';
import { useOVTClient } from '../src/hooks/useOVTClient';
import { useLaserEyes } from '@omnisat/lasereyes';
import { getDataSourceIndicator } from '../src/lib/hybridModeUtils';

export default function TradePage() {
  const { baseCurrency } = useOVTClient();
  const { address: walletAddress, network } = useLaserEyes();
  const isConnected = !!walletAddress;
  
  // Get authorized wallets from the lasereyes hook
  const [laserEyesWallets, setLaserEyesWallets] = useState<string[]>([]);
  
  // Get data source indicator for trading
  const tradingDataSource = getDataSourceIndicator('trading');
  
  // In a real app, this would be fetched from an API or configuration
  useEffect(() => {
    // For development, we'll allow any connected wallet to trade
    // In production, you would restrict this to specific wallets
    if (walletAddress) {
      setLaserEyesWallets([walletAddress]);
    }
  }, [walletAddress]);
  
  return (
    <Layout title="Trade OVT">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Trading Portal</h1>
          <p className="mt-2 text-sm text-gray-500">
            Buy and sell OVT tokens on the Bitcoin testnet
          </p>
        </div>
        
        {!isConnected ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-lg text-gray-700 mb-4">Please connect your wallet to start trading</p>
            <p className="text-sm text-gray-500">You need to connect your wallet to access trading functionality</p>
          </div>
        ) : !walletAddress || !laserEyesWallets.includes(walletAddress) ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-lg text-gray-700 mb-4">Trading Access Restricted</p>
            <p className="text-sm text-gray-500">
              Only authorized users can access the trading interface.
              If you believe you should have access, please contact support.
            </p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900">Market Overview</h2>
              <p className="text-sm text-gray-500">
                Trade OVT tokens using market or limit orders. Please note that all trades are simulated 
                on the testnet and do not involve real value.
              </p>
              <div className="mt-2 text-xs text-gray-400 flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                  tradingDataSource.isMock ? 'bg-amber-500' : 'bg-green-500'
                }`}></span>
                <span>Using {tradingDataSource.label}</span>
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-6">
              <TradingInterface />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 