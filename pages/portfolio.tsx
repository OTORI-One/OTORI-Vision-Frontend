import React from 'react';
import Layout from '../components/Layout';
import { useOVTClient } from '../src/hooks/useOVTClient';
import { useLaserEyes } from '@omnisat/lasereyes';
import { getDataSourceIndicator } from '../src/lib/hybridModeUtils';
import DataSourceIndicator from '../src/components/DataSourceIndicator';
import mockPortfolioData from '../src/mock-data/portfolio-positions.json';

// Function to ensure portfolio data is loaded in localStorage
export function ensurePortfolioDataLoaded() {
  if (typeof window === 'undefined') return; // Skip on server-side
  
  try {
    // Check if data already exists in localStorage
    const existingData = localStorage.getItem('ovt-portfolio-positions');
    
    if (!existingData) {
      console.log('Portfolio data not found in localStorage, injecting mock data...');
      
      // Add missing address field to each portfolio item
      const portfolioPositions = mockPortfolioData.map(position => ({
        ...position,
        address: `mock-address-${position.name.replace(/\s+/g, '-').toLowerCase()}`
      }));
      
      // Store in localStorage
      localStorage.setItem('ovt-portfolio-positions', JSON.stringify(portfolioPositions));
      console.log('Mock portfolio data injected into localStorage');
      
      // Force a refresh if needed
      window.dispatchEvent(new Event('storage'));
    } else {
      console.log('Portfolio data already exists in localStorage');
    }
  } catch (err) {
    console.error('Failed to inject portfolio data:', err);
  }
}

export default function PortfolioPage() {
  const { 
    isLoading,
    error,
    navData,
    formatValue,
    baseCurrency
  } = useOVTClient();
  
  const { address: walletAddress } = useLaserEyes();
  const isConnected = !!walletAddress;
  
  // Get data source indicator
  const portfolioDataSource = getDataSourceIndicator('portfolio');
  
  // Display loading state
  if (isLoading) {
    return (
      <Layout title="OTORI VisionPortfolio">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-500">Loading portfolio data...</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Display error state
  if (error) {
    return (
      <Layout title="OTORI Viion Portfolio">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-red-500">Error loading portfolio: {error}</p>
          </div>
        </div>
      </Layout>
    );
  }
  
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
          <DataSourceIndicator 
            isMock={portfolioDataSource.isMock}
            label={portfolioDataSource.label}
            color={portfolioDataSource.color} 
          />
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
              <h2 className="text-lg font-medium text-gray-900 mb-4">Portfolio Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Total Value</p>
                  <p className="text-2xl font-bold">{navData?.totalValue || "0"}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Performance</p>
                  <p className="text-2xl font-bold">{navData?.changePercentage || "0%"}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Holdings</p>
                  <p className="text-2xl font-bold">{navData?.portfolioItems?.length || 0} positions</p>
                </div>
              </div>
            </div>
            
            {/* Portfolio Items */}
            {navData?.portfolioItems && navData.portfolioItems.length > 0 ? (
              navData.portfolioItems.map((item, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.change >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {item.change >= 0 ? '+' : ''}
                      {String(item.change).includes('%') 
                        ? String(item.change) 
                        : `${item.change}%`}
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
                        <p className="text-base">{item.tokenAmount} OVT</p>
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