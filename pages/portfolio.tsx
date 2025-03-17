import React, { useEffect } from 'react';
import Layout from '../components/Layout';
import { useOVTClient } from '../src/hooks/useOVTClient';
import { useLaserEyes } from '@omnisat/lasereyes';
import { getDataSourceIndicator } from '../src/lib/hybridModeUtils';
import DataSourceIndicator from '../src/components/DataSourceIndicator';
import { usePortfolioPrices } from '../src/hooks/usePortfolioPrices';
import { ensurePortfolioDataLoaded } from '../src/utils/portfolioLoader';

export default function PortfolioPage() {
  const { 
    error: clientError,
    formatValue,
    baseCurrency
  } = useOVTClient();
  
  // Use our price movement hook for dynamic portfolio pricing
  const {
    positions,
    isLoading,
    totalValue,
    totalChange,
    lastUpdated,
    updatePrices
  } = usePortfolioPrices({
    updateInterval: 30000, // Update every 30 seconds for more dynamic experience
    autoUpdate: true
  });
  
  const { address: walletAddress } = useLaserEyes();
  const isConnected = !!walletAddress;

  // Ensure portfolio data is loaded
  useEffect(() => {
    ensurePortfolioDataLoaded();
  }, []);

  // Get data source indicator
  const portfolioDataSource = getDataSourceIndicator('portfolio');
  
  // Display loading state
  if (isLoading) {
    return (
      <Layout title="OTORI Vision Portfolio">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-500">Loading portfolio data...</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Display error state
  if (clientError) {
    return (
      <Layout title="OTORI Vision Portfolio">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-red-500">Error loading portfolio: {clientError}</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Format the total change percentage for display
  const formattedTotalChange = totalChange.toFixed(2);
  const isPositiveChange = totalChange >= 0;

  return (
    <Layout title="OTORI Vision Portfolio">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OTORI Vision Portfolio</h1>
            <p className="mt-2 text-sm text-gray-500">
              The OTORI holdings and portfolio performance
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => updatePrices()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Refresh Prices
            </button>
            <DataSourceIndicator 
              isMock={portfolioDataSource.isMock}
              label={portfolioDataSource.label}
              color={portfolioDataSource.color} 
            />
          </div>
        </div>
        
        {!isConnected ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <p className="text-lg text-gray-700 mb-4">Please connect your wallet to view your portfolio</p>
            <p className="text-sm text-gray-500">You need to connect your wallet to access your portfolio information</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Portfolio Summary Card */}
            <div className="bg-white p-6 rounded-lg shadow col-span-1 lg:col-span-3">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-medium text-gray-900">Portfolio Overview</h2>
                <div className="text-xs text-gray-500">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Total Value</p>
                  <p className="text-2xl font-bold">{formatValue(totalValue)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Performance</p>
                  <p className={`text-2xl font-bold ${
                    isPositiveChange ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isPositiveChange ? '+' : ''}{formattedTotalChange}%
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Holdings</p>
                  <p className="text-2xl font-bold">{positions?.length || 0} positions</p>
                </div>
              </div>
            </div>
            
            {/* Portfolio Items */}
            {positions && positions.length > 0 ? (
              positions.map((item, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.change >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.change >= 0 ? '+' : ''}
                      {item.change}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{item.description}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Current Value</p>
                      <p className="text-lg font-semibold">{formatValue(item.current)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Initial Value</p>
                      <p className="text-lg font-semibold">{formatValue(item.value)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Token Amount</p>
                        <p className="text-base">{item.tokenAmount.toLocaleString()} tokens</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Price Per Token</p>
                        <p className="text-base">{formatValue(item.pricePerToken)}</p>
                      </div>
                    </div>
                  </div>
                  {item.transactionId && (
                    <div className="mt-4 text-xs text-gray-500">
                      <p>TX: {item.transactionId.slice(0, 10)}...{item.transactionId.slice(-10)}</p>
                    </div>
                  )}
                  
                  {/* Show spike indicator if it's a recent spike (within last day) */}
                  {item.lastSpikeDay && 
                   (getDayNumber() - item.lastSpikeDay < 1) && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <div className="bg-yellow-50 rounded p-2 text-sm text-yellow-800 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        FUNDING EVENT DETECTED
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-white p-6 rounded-lg shadow col-span-1 lg:col-span-3 text-center">
                <p className="text-gray-500 mb-2">No portfolio positions found</p>
                <p className="text-sm text-gray-400">Visit the Trade section to acquire OVT tokens</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

// Helper function to get current day number
function getDayNumber(): number {
  return Math.floor(Date.now() / 86400000);
} 