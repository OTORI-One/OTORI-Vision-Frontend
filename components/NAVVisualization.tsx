import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import TokenExplorerModal from './TokenExplorerModal';
import { useOVTClient } from '../src/hooks/useOVTClient';
import { Portfolio } from '../src/hooks/useOVTClient';
import { useBitcoinPrice } from '../src/hooks/useBitcoinPrice';

// Constants for numeric handling
const SATS_PER_BTC = 100000000;

interface NAVData {
  name: string;
  value: number;      // Initial value in sats
  current: number;    // Current value in sats
  change: number;     // Percentage change
  description: string;
}

interface NAVVisualizationProps {
  data: Portfolio[];
  totalValue: string;
  changePercentage: string;
  baseCurrency?: 'usd' | 'btc';
}

// Use the centralized formatter from useOVTClient instead of this local one
export default function NAVVisualization({ data, totalValue, changePercentage, baseCurrency = 'usd' }: NAVVisualizationProps) {
  const [selectedToken, setSelectedToken] = useState<Portfolio | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formatValue, currencyFormatter } = useOVTClient();
  const { price: btcPrice } = useBitcoinPrice();
  
  // Log when currency changes to help with debugging
  useEffect(() => {
    console.log('NAVVisualization: baseCurrency changed to', baseCurrency);
  }, [baseCurrency]);

  // Listen for global currency changes
  useEffect(() => {
    const handleCurrencyChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('NAVVisualization: Detected currency change event:', customEvent.detail);
      // The component will re-render because the parent passes the new baseCurrency
    };
    
    window.addEventListener('currency-changed', handleCurrencyChange);
    return () => {
      window.removeEventListener('currency-changed', handleCurrencyChange);
    };
  }, []);

  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Keep values in sats and let formatValue handle the conversion
    return data.map(item => ({
      name: item.name,
      value: item.value,
      current: item.current,
      growth: item.current - item.value,
      change: item.change,
      description: item.description,
      tokenAmount: item.tokenAmount,
      pricePerToken: item.pricePerToken,
      address: item.address
    }));
  }, [data]);

  // Format Y axis values
  const formatYAxis = (value: number) => {
    console.log('Formatting Y axis value:', value, 'in mode:', baseCurrency);
    return formatValue(value, baseCurrency);
  };

  // Handle bar click to show token details
  const handleClick = (data: any, index: number) => {
    console.log('Bar clicked:', data);
    if (data && data.payload) {
      setSelectedToken(data.payload);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="h-full">
      {formattedData.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No portfolio data available</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formattedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              barSize={40}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={formatYAxis} />
              <Tooltip content={(props) => <CustomTooltip {...props} currency={baseCurrency} btcPrice={btcPrice} />} />
              <Bar 
                dataKey="value" 
                name="Initial Investment" 
                stackId="a" 
                fill="#8884d8" 
                onClick={handleClick}
                className="cursor-pointer"
              />
              <Bar 
                dataKey="growth" 
                name="Growth" 
                stackId="a" 
                fill="#82ca9d" 
                onClick={handleClick}
                className="cursor-pointer"
              />
            </BarChart>
          </ResponsiveContainer>
          
          {selectedToken && (
            <TokenExplorerModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              tokenData={{
                name: selectedToken.name,
                description: selectedToken.description,
                initial: selectedToken.value,
                current: selectedToken.current,
                change: selectedToken.change,
                totalValue: selectedToken.current,
                holdings: selectedToken.tokenAmount.toString(),
                address: selectedToken.address,
                transactions: [getInitialTransaction(selectedToken.tokenAmount, selectedToken.pricePerToken, baseCurrency)]
              }}
              baseCurrency={baseCurrency}
            />
          )}
        </>
      )}
    </div>
  );
}

// Keep the CustomTooltip component but update it to use the centralized formatter
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  currency: 'usd' | 'btc';
  btcPrice: number | null;
}

const CustomTooltip = ({ active, payload, label, currency, btcPrice }: CustomTooltipProps) => {
  const { formatValue } = useOVTClient();
  
  if (active && payload && payload.length) {
    const initialValue = payload[0].value;
    const growthValue = payload[1].value;
    const totalValue = initialValue + growthValue;
    const changePercent = initialValue > 0 ? (growthValue / initialValue) * 100 : 0;
    
    return (
      <div className="bg-white p-4 rounded shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-600 mt-2">
          Total: {formatValue(totalValue, currency)}
        </p>
        <p className="text-sm text-gray-600">
          Initial: {formatValue(initialValue, currency)}
        </p>
        <p className={`text-sm ${growthValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          Growth: {formatValue(growthValue, currency)} 
          ({changePercent.toFixed(1)}%)
        </p>
      </div>
    );
  }
  
  return null;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Removed useOVTClient from getInitialTransaction to avoid React hook rules issues
const getInitialTransaction = (tokenAmount: number, pricePerToken: number, currency: 'usd' | 'btc' = 'usd') => {
  return {
    date: formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // 30 days ago
    type: 'buy' as const, // Using 'buy' to match the expected union type of 'buy' | 'sell'
    amount: tokenAmount.toString(), // Converting to string as expected by TokenExplorerModal
    price: pricePerToken // Pass the raw price, let TokenExplorerModal handle formatting
  };
}; 
