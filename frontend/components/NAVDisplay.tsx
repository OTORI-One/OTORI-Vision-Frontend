import React from 'react';
import { useCurrencyToggle } from '../src/hooks/useCurrencyToggle';
import { usePortfolio } from '../src/hooks/usePortfolio';

interface NAVDisplayProps {
  size?: 'sm' | 'md' | 'lg';
  showChange?: boolean;
}

const SATS_PER_BTC = 100000000;

export default function NAVDisplay({ size = 'md', showChange = true }: NAVDisplayProps) {
  const { currency, formatValue } = useCurrencyToggle();
  const { getTotalValue, getOverallChangePercentage } = usePortfolio();
  
  // Get total value from portfolio positions
  const totalValue = getTotalValue();
  
  // Format the total value according to the current currency
  const formattedTotalValue = formatValue(totalValue);
  
  // Get the change percentage
  const changePercentage = getOverallChangePercentage().toFixed(2);
  const isPositive = parseFloat(changePercentage) >= 0;
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