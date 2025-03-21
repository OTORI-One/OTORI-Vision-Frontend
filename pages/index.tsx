import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { ArrowUpIcon, CurrencyDollarIcon, CircleStackIcon } from '@heroicons/react/24/outline';
import WalletConnector from '../components/WalletConnector';
import NAVVisualization from '../components/NAVVisualization';
import PriceChart from '../components/PriceChart';
import ChartToggle from '../components/ChartToggle';
import { useOVTClient, SATS_PER_BTC } from '../src/hooks/useOVTClient';
import AdminDashboard from '../components/admin/AdminDashboard';
import { useBitcoinPrice } from '../src/hooks/useBitcoinPrice';
import { useLaserEyes } from '@omnisat/lasereyes';
import Layout from '../components/Layout';
import { useTradingModule } from '../src/hooks/useTradingModule';
import { isAdminWallet } from '../src/utils/adminUtils';

export default function Dashboard() {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<'price' | 'nav'>('nav');
  const [buyAmount, setBuyAmount] = useState<string>('');
  const [sellAmount, setSellAmount] = useState<string>('');
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { 
    isLoading, 
    error, 
    navData, 
    formatValue,
    baseCurrency,
    setBaseCurrency
  } = useOVTClient();
  const { price: btcPrice } = useBitcoinPrice();
  const { network } = useLaserEyes();
  
  // Use the trading hook
  const { buyOVT, sellOVT, getMarketPrice } = useTradingModule();

  // State to track if the connected wallet is an admin
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  // Check if wallet is admin
  useEffect(() => {
    if (connectedAddress) {
      const adminStatus = isAdminWallet(connectedAddress);
      console.log('Index page - Connected address is admin?', adminStatus);
      setIsAdmin(adminStatus);
    } else {
      setIsAdmin(false);
    }
  }, [connectedAddress]);

  // Calculate OVT price based on NAV
  const ovtPrice = useMemo(() => {
    if (!navData || !navData.totalValue) return 0;
    
    // Use the raw sats value directly from navData instead of parsing the formatted string
    const satsValue = navData.totalValueSats;
    console.log('NAV in sats:', satsValue);
    
    // Get token data from mock-data/token-data.json
    const tokenSupply = 500000; // Hardcoded from token-data.json
    console.log('Token supply:', tokenSupply);
    
    // Calculate price per token in sats
    const pricePerOVT = Math.floor(satsValue / tokenSupply);
    console.log('Calculated price per OVT:', pricePerOVT, 'sats');
    
    return pricePerOVT;
  }, [navData]);

  // Use the NAV value directly from navData
  const formattedNAV = useMemo(() => {
    if (!navData || !navData.totalValue) return "Loading...";
    return navData.totalValue;
  }, [navData]);

  // Format currency values
  const formatCurrency = (value: number) => {
    console.log(`Dashboard formatting ${value} with currency ${baseCurrency}`);
    return formatValue(value);
  };

  // Add effect to track currency changes
  useEffect(() => {
    console.log('Dashboard: baseCurrency changed to', baseCurrency);
  }, [baseCurrency]);
  
  // Listen for global currency changes
  useEffect(() => {
    const handleCurrencyChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('Dashboard: Detected currency change event:', customEvent.detail);
      // Force re-render by updating a state variable
      setActiveChart(prev => prev); // This will trigger a re-render without changing the value
    };
    
    window.addEventListener('currency-changed', handleCurrencyChange);
    return () => {
      window.removeEventListener('currency-changed', handleCurrencyChange);
    };
  }, []);

  // Handle wallet connection
  const handleConnectWallet = (address: string) => {
    setConnectedAddress(address);
    console.log('Connected wallet address:', address);
  };
  
  const handleDisconnectWallet = () => {
    setConnectedAddress(null);
    console.log('Wallet disconnected');
  };

  // Handle buy action
  const handleBuy = async () => {
    if (!buyAmount || parseFloat(buyAmount) <= 0) return;
    
    try {
      setIsSubmitting(true);
      setSuccessMessage(null);
      
      const amount = parseFloat(buyAmount);
      const result = await buyOVT(amount);
      
      setBuyAmount('');
      setSuccessMessage(`Successfully purchased ${amount} OVT tokens!`);
    } catch (error) {
      console.error('Error buying tokens:', error);
      setNetworkError(error instanceof Error ? error.message : 'Error processing your purchase');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle sell action
  const handleSell = async () => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) return;
    
    try {
      setIsSubmitting(true);
      setSuccessMessage(null);
      
      const amount = parseFloat(sellAmount);
      const result = await sellOVT(amount);
      
      setSellAmount('');
      setSuccessMessage(`Successfully sold ${amount} OVT tokens!`);
    } catch (error) {
      console.error('Error selling tokens:', error);
      setNetworkError(error instanceof Error ? error.message : 'Error processing your sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="Dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}
        
        {networkError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {networkError}
          </div>
        )}
        
        {/* Main content */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* NAV Card */}
          <div className="bg-white p-4 rounded-lg shadow col-span-1 lg:col-span-8">
            <h2 className="text-lg font-medium text-gray-900">Net Asset Value</h2>
            <div className="flex items-center mt-1">
              <p className="text-3xl font-bold currency-dependent" data-currency={baseCurrency}>{formattedNAV}</p>
              {navData && (
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  parseFloat(navData.changePercentage) >= 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {navData.changePercentage}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-2 currency-dependent" data-currency={baseCurrency}>
              {baseCurrency === 'btc' ? 'BTC' : 'USD'} value of all assets
            </p>
            
            {/* Chart Toggle */}
            <div className="mt-2">
              <ChartToggle 
                activeChart={activeChart} 
                onToggle={setActiveChart} 
              />
            </div>
            
            {/* Charts - contained within a fixed height container */}
            <div className="mt-2 h-[300px] overflow-hidden">
              {activeChart === 'nav' ? (
                <NAVVisualization 
                  data={navData?.portfolioItems || []} 
                  totalValue={navData?.totalValue || "0"} 
                  changePercentage={navData?.changePercentage || "0%"} 
                  baseCurrency={baseCurrency} 
                />
              ) : (
                <PriceChart 
                  data={[
                    { name: 'Q1', value: ovtPrice * 0.8 },
                    { name: 'Q2', value: ovtPrice * 0.9 },
                    { name: 'Q3', value: ovtPrice * 0.95 },
                    { name: 'Current', value: ovtPrice }
                  ]} 
                  baseCurrency={baseCurrency} 
                />
              )}
            </div>
          </div>
          
          {/* Trading Cards - on the right side */}
          <div className="lg:col-span-4 grid grid-cols-1 gap-4">
            {/* Buy OVT Card */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-700">Buy OVT</h2>
              <div className="mt-2">
                <p className="text-2xl font-bold currency-dependent" data-currency={baseCurrency}>{formatCurrency(ovtPrice)}</p>
                <p className="text-sm text-gray-500">per OVT</p>
                <div className="mt-3 space-y-3">
                  <input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="1"
                    disabled={!connectedAddress}
                  />
                  <button 
                    disabled={isLoading || isSubmitting || !buyAmount || !connectedAddress}
                    onClick={handleBuy}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {!connectedAddress ? 'Connect Wallet to Buy' : isSubmitting ? 'Processing...' : 'Buy OVT'}
                  </button>
                  <div className="text-xs text-gray-500 text-right">
                    <a href="/trade" className="text-blue-600 hover:underline">Advanced trading options →</a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sell OVT Card */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-700">Sell OVT</h2>
              <div className="mt-2">
                <p className="text-2xl font-bold currency-dependent" data-currency={baseCurrency}>{formatCurrency(ovtPrice)}</p>
                <p className="text-sm text-gray-500">per OVT</p>
                <div className="mt-3 space-y-3">
                  <input
                    type="number"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="1"
                    disabled={!connectedAddress}
                  />
                  <button 
                    disabled={isLoading || isSubmitting || !sellAmount || !connectedAddress}
                    onClick={handleSell}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {!connectedAddress ? 'Connect Wallet to Sell' : isSubmitting ? 'Processing...' : 'Sell OVT'}
                  </button>
                  <div className="text-xs text-gray-500 text-right">
                    <a href="/trade" className="text-blue-600 hover:underline">Advanced trading options →</a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Portfolio Summary */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-700">Your Portfolio</h2>
              <p className="text-sm text-gray-500 mt-2">View your complete portfolio and trading history</p>
              <div className="mt-3">
                <a 
                  href="/portfolio" 
                  className="inline-flex items-center w-full justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  View Portfolio
                </a>
              </div>
            </div>
          </div>
          
          {/* Admin Dashboard (only shown to connected admin wallets) */}
          {connectedAddress && isAdmin && (
            <div className="col-span-1 lg:col-span-12 mt-2">
              <AdminDashboard />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 