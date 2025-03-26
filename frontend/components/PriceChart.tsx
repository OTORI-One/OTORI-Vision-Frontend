import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useBitcoinPrice } from '../src/hooks/useBitcoinPrice';
import { useEffect, useMemo, useState } from 'react';
import { useOVTClient } from '../src/hooks/useOVTClient';
import { usePortfolio } from '../src/hooks/usePortfolio';
import { useCurrencyToggle } from '../src/hooks/useCurrencyToggle';
import { useOVTPrice } from '../src/hooks/useOVTPrice';

interface PriceData {
  name: string;
  value: number;
  change?: number;
}

interface PriceChartProps {
  data?: PriceData[];
  baseCurrency?: 'usd' | 'btc';
  days?: number;
}

// Default color theme
const CHART_PRIMARY_COLOR = '#29378d'; // OTORI brand deep purple
const CHART_SUCCESS_COLOR = '#10B981'; // success
const CHART_ERROR_COLOR = '#EF4444';   // error

// Use the centralized formatter from useOVTClient
export default function PriceChart({ baseCurrency = 'usd', days = 30 }: PriceChartProps) {
  const { formatValue } = useCurrencyToggle();
  const { price: ovtPrice, dailyChange } = useOVTPrice();
  const [priceHistory, setPriceHistory] = useState<PriceData[]>([]);
  
  // Generate historical price data
  useEffect(() => {
    // In a real implementation, this would fetch from an API
    // For now, we'll generate synthetic data based on the current price
    if (ovtPrice <= 0) return;
    
    const today = new Date();
    const data: PriceData[] = [];
    
    // Generate past data points with some randomness but trending toward current price
    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // Create a price that trends from -30% to current price with some randomness
      const randomFactor = 0.5 + Math.random();
      const dayProgress = (days - i) / days;
      const dayValue = ovtPrice * (0.7 + (0.3 * dayProgress * randomFactor));
      
      data.push({
        name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: Math.round(dayValue * 100) / 100,
        change: i > 0 ? 
          Math.round(((data[data.length-1]?.value || dayValue) - dayValue) / dayValue * 1000) / 10 : 
          dailyChange
      });
    }
    
    setPriceHistory(data);
  }, [ovtPrice, dailyChange, days]);
  
  // Calculate if overall trend is positive
  const isPositiveTrend = useMemo(() => {
    if (priceHistory.length < 2) return true;
    return priceHistory[priceHistory.length - 1].value >= priceHistory[0].value;
  }, [priceHistory]);
  
  const gradientId = "ovtPriceGradient";
  const chartColor = CHART_PRIMARY_COLOR;
  
  const maxValue = Math.max(...priceHistory.map(item => item.value));
  const yAxisDomain = [0, Math.ceil(maxValue * 1.1)]; // Add 10% padding to the top

  const formatYAxis = (value: number) => {
    return formatValue(value);
  };

  if (priceHistory.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Loading price data...</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={priceHistory}
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