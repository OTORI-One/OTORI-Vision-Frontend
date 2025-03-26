import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useBitcoinPrice } from '../src/hooks/useBitcoinPrice';
import { useEffect, useMemo } from 'react';
import { useOVTClient } from '../src/hooks/useOVTClient';
import { usePortfolio } from '../src/hooks/usePortfolio';
import { useCurrencyToggle } from '../src/hooks/useCurrencyToggle';

interface PriceData {
  name: string;
  value: number;
}

interface PriceChartProps {
  data?: PriceData[];
  baseCurrency?: 'usd' | 'btc';
}

// Default color theme
const CHART_PRIMARY_COLOR = '#29378d'; // primary
const CHART_SUCCESS_COLOR = '#10B981'; // success
const CHART_ERROR_COLOR = '#EF4444';   // error

// Use the centralized formatter from useOVTClient
export default function PriceChart({ baseCurrency = 'usd' }: PriceChartProps) {
  const { formatValue } = useCurrencyToggle();
  const { positions } = usePortfolio();
  
  // Generate price data from portfolio positions
  const priceData = useMemo(() => {
    // If no positions, use mock data
    if (!positions || positions.length === 0) {
      return mockData;
    }
    
    // Create a time series of price data (for now, use position names as time points)
    return positions.map(position => ({
      name: position.name,
      value: position.pricePerToken,
      change: position.change
    }));
  }, [positions]);
  
  // Calculate if overall trend is positive
  const isPositiveTrend = useMemo(() => {
    if (priceData.length < 2) return true;
    return priceData[priceData.length - 1].value >= priceData[0].value;
  }, [priceData]);
  
  const gradientId = isPositiveTrend ? "positiveGradient" : "negativeGradient";
  const chartColor = isPositiveTrend ? CHART_SUCCESS_COLOR : CHART_ERROR_COLOR;
  
  const maxValue = Math.max(...priceData.map(item => item.value));
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
    return formatValue(value);
  };

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={priceData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={chartColor} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={yAxisDomain} tickFormatter={formatYAxis} />
          <Tooltip content={(props) => <CustomTooltip {...props} currency={baseCurrency} />} />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={chartColor}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 8, strokeWidth: 2 }}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, currency }: any) => {
  const { formatValue } = useCurrencyToggle();
  
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isPositive = data.change >= 0;
    
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-primary">
        <p className="text-sm text-primary">{data.name}</p>
        <p className="text-lg font-semibold mt-1 text-primary">
          {formatValue(data.value, currency)}
        </p>
        {data.change !== undefined && (
          <p className={`text-sm font-medium ${isPositive ? 'text-success' : 'text-error'}`}>
            {isPositive ? '+' : ''}{data.change}%
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Mock data for development or when no positions exist
const mockData = [
  { name: 'Jan', value: 400, change: 0 },
  { name: 'Feb', value: 300, change: -25 },
  { name: 'Mar', value: 600, change: 100 },
  { name: 'Apr', value: 800, change: 33.3 },
  { name: 'May', value: 700, change: -12.5 },
  { name: 'Jun', value: 900, change: 28.6 },
  { name: 'Jul', value: 1000, change: 11.1 },
]; 