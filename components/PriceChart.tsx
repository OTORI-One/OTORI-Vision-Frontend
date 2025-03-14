import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useBitcoinPrice } from '../src/hooks/useBitcoinPrice';
import { useEffect } from 'react';
import { useOVTClient } from '../src/hooks/useOVTClient';

interface PriceData {
  name: string;
  value: number;
}

interface PriceChartProps {
  data?: PriceData[];
  baseCurrency?: 'usd' | 'btc';
}

// Use the centralized formatter from useOVTClient
export default function PriceChart({ data = mockData, baseCurrency = 'usd' }: PriceChartProps) {
  const { price: btcPrice } = useBitcoinPrice();
  const { formatValue } = useOVTClient();
  
  const maxValue = Math.max(...data.map(item => item.value));
  const yAxisDomain = [0, Math.ceil(maxValue * 1.1)]; // Add 10% padding to the top

  // Add console logs to track when currency changes
  useEffect(() => {
    console.log('PriceChart: baseCurrency changed to', baseCurrency);
  }, [baseCurrency]);
  
  // Listen for global currency changes
  useEffect(() => {
    const handleCurrencyChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('PriceChart: Detected currency change event:', customEvent.detail);
      // The component will re-render because the parent passes the new baseCurrency
    };
    
    window.addEventListener('currency-changed', handleCurrencyChange);
    return () => {
      window.removeEventListener('currency-changed', handleCurrencyChange);
    };
  }, []);

  const formatYAxis = (value: number) => {
    return formatValue(value, baseCurrency);
  };

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={yAxisDomain} tickFormatter={formatYAxis} />
          <Tooltip content={(props) => <CustomTooltip {...props} currency={baseCurrency} btcPrice={btcPrice} />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, currency, btcPrice }: any) => {
  const { formatValue } = useOVTClient();
  
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="text-sm text-gray-600">{data.name}</p>
        <p className="text-lg font-semibold mt-1">
          {formatValue(data.value, currency)}
        </p>
      </div>
    );
  }
  return null;
};

// Mock data for development
const mockData = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 600 },
  { name: 'Apr', value: 800 },
  { name: 'May', value: 700 },
  { name: 'Jun', value: 900 },
  { name: 'Jul', value: 1000 },
]; 