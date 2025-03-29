import React, { useState, useEffect } from 'react';
import TradingInterface from './TradingInterface';
import { useOVTPrice } from '../src/hooks/useOVTPrice';
import { useCurrencyToggle } from '../src/hooks/useCurrencyToggle';
import priceService from '../src/services/priceService';

interface TradingContentProps {
  isConnected: boolean;
  connectedAddress: string | null;
  walletAddress?: string;
  laserEyesWallets: string[];
  tradingDataSource: {
    isMock: boolean;
    label: string;
    color: string;
  };
}

const SATS_PER_BTC = 100000000;
const BTC_TO_USD = 50000; // Fixed exchange rate for demo

const TradingContent: React.FC<TradingContentProps> = ({
  isConnected,
  connectedAddress,
  walletAddress,
  laserEyesWallets,
  tradingDataSource
}) => {
  // Replace useOVTClient with direct API call through priceService
  const [navData, setNavData] = useState<any>({
    totalValueSats: 0,
    totalValueUSD: 0,
    formattedTotalValueSats: '₿0.00',
    formattedTotalValueUSD: '$0.00',
    changePercentage: 0
  });
  
  const [loading, setLoading] = useState(true);
  
  // Fetch NAV data directly from API
  useEffect(() => {
    const fetchNavData = async () => {
      try {
        setLoading(true);
        const data = await priceService.getNAVData();
        setNavData(data);
      } catch (error) {
        console.error('Error fetching NAV data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNavData();
    
    // Refresh NAV every 60 seconds
    const intervalId = setInterval(fetchNavData, 60000);
    return () => clearInterval(intervalId);
  }, []);
  
  const { price: ovtPrice, btcPriceFormatted, usdPriceFormatted } = useOVTPrice();
  const { currency } = useCurrencyToggle();
  
  // Get formatted NAV based on currency
  const formattedTotalValue = currency === 'usd' 
    ? navData.formattedTotalValueUSD 
    : navData.formattedTotalValueSats;
  
  // Get change percentage from NAV data
  const changePercentage = navData.changePercentage.toFixed(2);
  const isPositive = parseFloat(changePercentage) >= 0;
  
  return (
    <>
      {/* NAV and Price Information */}
      <div className="bg-white border border-primary rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 className="text-sm font-medium text-primary">Net Asset Value</h3>
            <p className="text-2xl font-bold text-primary">
              {formattedTotalValue}
            </p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isPositive
                ? 'bg-success bg-opacity-10 text-success' 
                : 'bg-error bg-opacity-10 text-error'
            }`}>
              {isPositive ? '+' : ''}{changePercentage}%
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-primary">OVT Price</h3>
            <p className="text-2xl font-bold text-primary">
              {currency === 'btc' ? btcPriceFormatted : usdPriceFormatted}
            </p>
            <p className="text-xs text-primary opacity-75">per token</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-primary">Data Source</h3>
            <div className="flex items-center mt-2">
              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                tradingDataSource.isMock ? 'bg-warning' : 'bg-success'
              }`}></span>
              <span className="text-sm text-primary">{tradingDataSource.label}</span>
            </div>
          </div>
        </div>
      </div>
      
      {!isConnected ? (
        <div className="bg-white border border-primary p-6 rounded-lg shadow-sm text-center">
          <p className="text-lg text-primary mb-4">Please connect your wallet to start trading</p>
          <p className="text-sm text-primary opacity-75">You need to connect your wallet to access trading functionality</p>
        </div>
      ) : !walletAddress || !laserEyesWallets.includes(walletAddress) ? (
        <div className="bg-white border border-primary p-6 rounded-lg shadow-sm text-center">
          <p className="text-lg text-primary mb-4">Trading Access Restricted</p>
          <p className="text-sm text-primary opacity-75">
            Only authorized users can access the trading interface.
            If you believe you should have access, please contact support.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-primary p-6 rounded-lg shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-primary">Market Overview</h2>
            <p className="text-sm text-primary opacity-75">
              Trade OVT tokens using market or limit orders. Please note that all trades are simulated 
              on the testnet and do not involve real value.
            </p>
            <div className="mt-2 text-xs text-primary opacity-50 flex items-center">
              <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                tradingDataSource.isMock ? 'bg-warning' : 'bg-success'
              }`}></span>
              <span>Using {tradingDataSource.label}</span>
            </div>
          </div>
          
          <div className="border-t border-primary border-opacity-20 pt-6">
            <TradingInterface />
          </div>
        </div>
      )}
    </>
  );
};

export default TradingContent; 