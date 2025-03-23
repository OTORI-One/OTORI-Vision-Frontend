import { useMemo, useState, useEffect, useCallback, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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

// Colors for growth bars
const POSITIVE_GROWTH_COLOR = '#82ca9d'; // Green
const NEGATIVE_GROWTH_COLOR = '#d32f2f'; // Red

// Use the centralized formatter from useOVTClient
function NAVVisualization({ data, totalValue, changePercentage, baseCurrency = 'usd' }: NAVVisualizationProps) {
  const [selectedToken, setSelectedToken] = useState<Portfolio | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formatValue } = useOVTClient();

  // Memoize formatted data to prevent unnecessary recalculations
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

  // Format Y axis values - memoize to prevent unnecessary recalculations
  const formatYAxis = useCallback((value: number) => {
    // Only call formatValue, don't log every time to improve performance
    return formatValue(value);
  }, [formatValue]);

  // Handle bar click to show token details
  const handleClick = useCallback((data: any, index: number) => {
    if (data && data.payload) {
      setSelectedToken(data.payload);
      setIsModalOpen(true);
    }
  }, []);

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
              <Tooltip content={(props) => <MemoizedCustomTooltip {...props} baseCurrency={baseCurrency} />} />
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
                onClick={handleClick}
                className="cursor-pointer"
              >
                {/* Apply different colors based on growth value */}
                {formattedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.growth >= 0 ? POSITIVE_GROWTH_COLOR : NEGATIVE_GROWTH_COLOR} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          {selectedToken && (
            <TokenExplorerModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              tokenData={{
                name: selectedToken.name,
                description: selectedToken.description || '',
                initial: selectedToken.value,
                current: selectedToken.current,
                change: selectedToken.change,
                totalValue: selectedToken.current,
                holdings: selectedToken.tokenAmount.toString(),
                address: selectedToken.address || '',
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

// Export memoized component to prevent unnecessary re-renders
export default memo(NAVVisualization);

// Keep the CustomTooltip component but update it to use the centralized formatter
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  baseCurrency: 'usd' | 'btc';
}

const CustomTooltip = ({ active, payload, label, baseCurrency }: CustomTooltipProps) => {
  const { formatValue } = useOVTClient();
  
  // Use useMemo to cache formatted values and prevent re-renders
  const formattedValues = useMemo(() => {
    if (!active || !payload || !payload.length) return null;
    
    const initialValue = payload[0].value;
    const growthValue = payload[1].value;
    const totalValue = initialValue + growthValue;
    const changePercent = initialValue > 0 ? (growthValue / initialValue) * 100 : 0;
    
    return {
      totalFormatted: formatValue(totalValue, baseCurrency),
      initialFormatted: formatValue(initialValue, baseCurrency),
      changePercent: changePercent.toFixed(1)
    };
  }, [active, payload, formatValue, baseCurrency]);
  
  if (!formattedValues) return null;
  
  return (
    <div className="bg-white p-4 rounded shadow-lg border border-gray-200">
      <p className="font-medium text-gray-900">{label}</p>
      <p className="text-sm text-gray-600 mt-2">
        Total: {formattedValues.totalFormatted}
      </p>
      <p className="text-sm text-gray-600">
        Initial: {formattedValues.initialFormatted}
      </p>
      <p className={`text-sm ${payload && payload[1].value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        Growth: {formattedValues.changePercent}%
      </p>
    </div>
  );
};

// Memoize the CustomTooltip component to prevent unnecessary re-renders
const MemoizedCustomTooltip = memo(CustomTooltip);

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
