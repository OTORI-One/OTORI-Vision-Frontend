import React, { useState, useEffect } from 'react';
import { useTradingModule } from '../src/hooks/useTradingModule';
import { useOVTClient, SATS_PER_BTC } from '../src/hooks/useOVTClient';
import { Switch } from '@headlessui/react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import DataSourceIndicator from './DataSourceIndicator';

export default function TradingInterface() {
  // State for buy/sell forms
  const [buyAmount, setBuyAmount] = useState<string>('');
  const [sellAmount, setSellAmount] = useState<string>('');
  const [isLimitOrder, setIsLimitOrder] = useState<boolean>(false);
  const [limitBuyPrice, setLimitBuyPrice] = useState<string>('');
  const [limitSellPrice, setLimitSellPrice] = useState<string>('');
  
  // State for price impact and expected return
  const [buyPriceImpact, setBuyPriceImpact] = useState<number | null>(null);
  const [sellPriceImpact, setSellPriceImpact] = useState<number | null>(null);
  
  // State for transaction feedback
  const [buyStatus, setBuyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [sellStatus, setSellStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Get trading module and client hooks
  const { 
    buyOVT, 
    sellOVT, 
    getMarketPrice,
    estimatePriceImpact,
    isLoading: isTradingLoading,
    error: tradingError,
    dataSourceIndicator
  } = useTradingModule();
  
  const { formatValue, baseCurrency, btcPrice } = useOVTClient();
  
  // State for market price
  const [marketPrice, setMarketPrice] = useState<number>(0);
  
  // Log when currency changes to ensure component is updating
  useEffect(() => {
    console.log('TradingInterface: Currency changed to', baseCurrency);
  }, [baseCurrency]);
  
  // Fetch market price on component mount
  useEffect(() => {
    const fetchMarketPrice = async () => {
      try {
        const price = await getMarketPrice();
        setMarketPrice(price);
      } catch (error) {
        console.error('Error fetching market price:', error);
      }
    };
    
    fetchMarketPrice();
    
    // Set up periodic price updates
    const interval = setInterval(fetchMarketPrice, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [getMarketPrice]);
  
  // Calculate price impact when buy amount changes
  useEffect(() => {
    const calculateBuyPriceImpact = async () => {
      const amount = parseFloat(buyAmount);
      if (!isNaN(amount) && amount > 0) {
        try {
          const impactPrice = await estimatePriceImpact(amount, true);
          setBuyPriceImpact(impactPrice);
        } catch (error) {
          console.error('Error calculating buy price impact:', error);
          setBuyPriceImpact(null);
        }
      } else {
        setBuyPriceImpact(null);
      }
    };
    
    calculateBuyPriceImpact();
  }, [buyAmount, estimatePriceImpact]);
  
  // Calculate price impact when sell amount changes
  useEffect(() => {
    const calculateSellPriceImpact = async () => {
      const amount = parseFloat(sellAmount);
      if (!isNaN(amount) && amount > 0) {
        try {
          const impactPrice = await estimatePriceImpact(amount, false);
          setSellPriceImpact(impactPrice);
        } catch (error) {
          console.error('Error calculating sell price impact:', error);
          setSellPriceImpact(null);
        }
      } else {
        setSellPriceImpact(null);
      }
    };
    
    calculateSellPriceImpact();
  }, [sellAmount, estimatePriceImpact]);
  
  // Handle buy amount change
  const handleBuyAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow positive numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setBuyAmount(value);
    }
  };
  
  // Handle sell amount change
  const handleSellAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow positive numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSellAmount(value);
    }
  };
  
  // Handle limit price changes
  const handleLimitBuyPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setLimitBuyPrice(value);
    }
  };
  
  const handleLimitSellPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setLimitSellPrice(value);
    }
  };
  
  // Handle buy submit
  const handleBuy = async () => {
    const amount = parseFloat(buyAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }
    
    setBuyStatus('loading');
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      let maxPrice: number | undefined;
      if (isLimitOrder && limitBuyPrice) {
        maxPrice = parseFloat(limitBuyPrice);
        if (isNaN(maxPrice) || maxPrice <= 0) {
          throw new Error('Invalid limit price');
        }
      }
      
      const result = await buyOVT(amount, maxPrice);
      setBuyStatus('success');
      setSuccessMessage(`Transaction Confirmed: Bought ${amount} OVT at ${formatValue(result.price)} per token`);
      setBuyAmount('');
      setLimitBuyPrice('');
    } catch (error) {
      setBuyStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error executing buy order');
      console.error('Buy error:', error);
    }
  };
  
  // Handle sell submit
  const handleSell = async () => {
    const amount = parseFloat(sellAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }
    
    setSellStatus('loading');
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      let minPrice: number | undefined;
      if (isLimitOrder && limitSellPrice) {
        minPrice = parseFloat(limitSellPrice);
        if (isNaN(minPrice) || minPrice <= 0) {
          throw new Error('Invalid limit price');
        }
      }
      
      const result = await sellOVT(amount, minPrice);
      setSellStatus('success');
      setSuccessMessage(`Transaction Confirmed: Sold ${amount} OVT at ${formatValue(result.price)} per token`);
      setSellAmount('');
      setLimitSellPrice('');
    } catch (error) {
      setSellStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error executing sell order');
      console.error('Sell error:', error);
    }
  };
  
  // Toggle order type
  const toggleOrderType = () => {
    setIsLimitOrder(!isLimitOrder);
    // Reset error/success states
    setErrorMessage(null);
    setSuccessMessage(null);
  };
  
  // Calculate total cost for buy
  const calculateBuyCost = () => {
    const amount = parseFloat(buyAmount);
    if (isNaN(amount) || amount <= 0 || !buyPriceImpact) return null;
    
    return Math.floor(amount * buyPriceImpact);
  };
  
  // Calculate total return for sell
  const calculateSellReturn = () => {
    const amount = parseFloat(sellAmount);
    if (isNaN(amount) || amount <= 0 || !sellPriceImpact) return null;
    
    return Math.floor(amount * sellPriceImpact);
  };
  
  // Format price according to selected currency
  const formatCurrencyValue = (satValue: number) => {
    console.log(`TradingInterface formatting ${satValue} sats with currency: ${baseCurrency}, btcPrice: ${btcPrice}`);
    
    if (satValue === 0 || isNaN(satValue)) {
      return baseCurrency === 'usd' ? '$0.00' : '0 sats';
    }
    
    // Use the shared formatValue function to maintain consistency
    return formatValue(satValue);
  };
  
  // Listen for global currency changes
  useEffect(() => {
    const handleCurrencyChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('TradingInterface: Detected currency change event:', customEvent.detail);
      // Force re-render of price displays
      setMarketPrice(prev => prev); // Trigger re-render without changing value
    };
    
    window.addEventListener('currency-changed', handleCurrencyChange);
    return () => {
      window.removeEventListener('currency-changed', handleCurrencyChange);
    };
  }, []);
  
  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Interface header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">OVT Trading</h2>
            <p className="mt-1 text-sm text-gray-500">Buy and sell OVT tokens</p>
          </div>
          <div className="flex items-center space-x-2">
            <DataSourceIndicator 
              isMock={dataSourceIndicator.isMock}
              label={dataSourceIndicator.label}
              color={dataSourceIndicator.color}
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Current Market Price</p>
            <p className="text-2xl font-bold">
              {formatCurrencyValue(marketPrice)}
            </p>
          </div>
          
          {/* Order type toggle */}
          <div className="flex items-center">
            <span className={`mr-3 text-sm ${isLimitOrder ? 'text-gray-500' : 'font-medium text-gray-900'}`}>
              Market
            </span>
            <Switch
              checked={isLimitOrder}
              onChange={toggleOrderType}
              className={`${
                isLimitOrder ? 'bg-blue-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
            >
              <span
                className={`${
                  isLimitOrder ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
            <span className={`ml-3 text-sm ${isLimitOrder ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
              Limit
            </span>
          </div>
        </div>
      </div>
      
      {/* Transaction feedback */}
      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 m-6 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 m-6 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Buy Panel */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-700">Buy OVT</h2>
        <div className="mt-2">
          <p className="text-3xl font-bold">{formatCurrencyValue(marketPrice)}</p>
          <p className="text-sm text-gray-500">per OVT</p>
          
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="buyAmount" className="block text-sm font-medium text-gray-700">
                Buy Amount
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="buyAmount"
                  id="buyAmount"
                  aria-label="Buy Amount"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter amount to buy"
                  value={buyAmount}
                  onChange={handleBuyAmountChange}
                />
              </div>
            </div>
            
            {isLimitOrder && (
              <div>
                <label htmlFor="limitBuyPrice" className="block text-sm font-medium text-gray-700">
                  Limit Price
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="limitBuyPrice"
                    id="limitBuyPrice"
                    aria-label="Limit Price"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Maximum price in sats"
                    value={limitBuyPrice}
                    onChange={handleLimitBuyPriceChange}
                  />
                </div>
                {limitBuyPrice && !isNaN(parseFloat(limitBuyPrice)) && (
                  <p className="mt-1 text-sm text-gray-500">
                    Price: {formatCurrencyValue(parseFloat(limitBuyPrice))}/OVT
                  </p>
                )}
              </div>
            )}
            
            {buyPriceImpact && buyAmount && !isNaN(parseFloat(buyAmount)) && (
              <div className="text-sm text-gray-700">
                <p>Price Impact: {((buyPriceImpact - marketPrice) / marketPrice * 100).toFixed(2)}%</p>
                <p>Execution Price: {formatCurrencyValue(buyPriceImpact)}/OVT</p>
                <p>Total Cost: {formatCurrencyValue(calculateBuyCost() || 0)}</p>
              </div>
            )}
            
            <button
              onClick={handleBuy}
              disabled={buyStatus === 'loading' || buyAmount === ''}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {buyStatus === 'loading' ? 'Processing...' : 'Buy OVT'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Sell Panel */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-700">Sell OVT</h2>
        <div className="mt-2">
          <p className="text-3xl font-bold">{formatCurrencyValue(marketPrice)}</p>
          <p className="text-sm text-gray-500">per OVT</p>
          
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="sellAmount" className="block text-sm font-medium text-gray-700">
                Sell Amount
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="sellAmount"
                  id="sellAmount"
                  aria-label="Sell Amount"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter amount to sell"
                  value={sellAmount}
                  onChange={handleSellAmountChange}
                />
              </div>
            </div>
            
            {isLimitOrder && (
              <div>
                <label htmlFor="limitSellPrice" className="block text-sm font-medium text-gray-700">
                  Limit Price
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="limitSellPrice"
                    id="limitSellPrice"
                    aria-label="Limit Price"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Minimum price in sats"
                    value={limitSellPrice}
                    onChange={handleLimitSellPriceChange}
                  />
                </div>
                {limitSellPrice && !isNaN(parseFloat(limitSellPrice)) && (
                  <p className="mt-1 text-sm text-gray-500">
                    Price: {formatCurrencyValue(parseFloat(limitSellPrice))}/OVT
                  </p>
                )}
              </div>
            )}
            
            {sellPriceImpact && sellAmount && !isNaN(parseFloat(sellAmount)) && (
              <div className="text-sm text-gray-700">
                <p>Price Impact: {((marketPrice - sellPriceImpact) / marketPrice * 100).toFixed(2)}%</p>
                <p>Execution Price: {formatCurrencyValue(sellPriceImpact)}/OVT</p>
                <p>Expected Return: {formatCurrencyValue(calculateSellReturn() || 0)}</p>
              </div>
            )}
            
            <button
              onClick={handleSell}
              disabled={sellStatus === 'loading' || sellAmount === ''}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sellStatus === 'loading' ? 'Processing...' : 'Sell OVT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 