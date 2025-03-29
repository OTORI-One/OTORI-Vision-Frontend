import React, { useState, useEffect } from 'react';
import { useCurrencyToggle } from '../src/hooks/useCurrencyToggle';
import priceService from '../src/services/priceService';
import { SATS_PER_BTC } from '../src/lib/formatting';

interface NAVDisplayProps {
  size?: 'sm' | 'md' | 'lg';
  showChange?: boolean;
}

export default function NAVDisplay({ size = 'md', showChange = true }: NAVDisplayProps) {
  const { currency, formatValue } = useCurrencyToggle();
  const [navData, setNavData] = useState({
    totalValueSats: 655190352, // 6.55 BTC default from server
    totalValueUSD: 324000, // Approx USD value with BTC at $49,000
    formattedTotalValueSats: '₿6.55',
    formattedTotalValueUSD: '$324,000',
    changePercentage: 7.59, // Default change percentage
    btcPrice: 49000,
    ovtPrice: 655,
    circulatingSupply: 1000000,
    lastUpdate: Date.now(),
    timestamp: Date.now()
  });
  
  // Fetch NAV data directly from the price service
  useEffect(() => {
    const fetchNAV = async () => {
      try {
        const data = await priceService.getNAVData();
        setNavData(data);
      } catch (error) {
        console.error('Error fetching NAV:', error);
        // Keep using default data on error
      }
    };
    
    // Initial fetch
    fetchNAV();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchNAV, 30000);
    
    // Cleanup
    return () => clearInterval(interval);
  }, []);
  
  // Format values based on current currency
  const formattedTotalValue = currency === 'usd' 
    ? navData.formattedTotalValueUSD 
    : navData.formattedTotalValueSats;
  
  // Format change percentage
  const changePercentage = navData.changePercentage.toFixed(2);
  const isPositive = navData.changePercentage >= 0;
  const formattedChangePercentage = `${isPositive ? '+' : ''}${changePercentage}%`;
  
  // Size classes
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };
  
  const valueSize = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl'
  };
  
  return (
    <div className="flex items-center">
      <div>
        <p className={`${sizes[size]} text-primary font-medium mb-0.5`}>
          Net Asset Value (NAV)
        </p>
        <div className="flex items-center">
          <p className={`${valueSize[size]} font-bold text-primary mr-2`}>
            {formattedTotalValue}
          </p>
          
          {showChange && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
              isPositive ? 'bg-success bg-opacity-10 text-success' : 'bg-error bg-opacity-10 text-error'
            }`}>
              {formattedChangePercentage}
            </span>
          )}
        </div>
      </div>
    </div>
  );
} 