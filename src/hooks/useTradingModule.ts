import { useState, useCallback, useEffect } from 'react';
import { shouldUseMockData, getDataSourceIndicator } from '../lib/hybridModeUtils';
import { useOVTClient } from './useOVTClient';

// Define types for our trading module
export interface Order {
  price: number;  // in sats
  amount: number; // number of OVT tokens
}

export interface OrderBook {
  bids: Order[];  // buy orders (price descending)
  asks: Order[];  // sell orders (price ascending)
}

export interface TradeTransaction {
  txid: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  details?: {
    orderType?: 'market' | 'limit';
    limitPrice?: number;
    filledAt?: number;
  };
}

// Mock data for initial order book
const MOCK_ORDER_BOOK: OrderBook = {
  bids: [
    { price: 685, amount: 500 },
    { price: 680, amount: 1000 },
    { price: 675, amount: 1500 },
    { price: 670, amount: 2000 },
  ],
  asks: [
    { price: 710, amount: 500 },
    { price: 715, amount: 1000 },
    { price: 720, amount: 1500 },
    { price: 725, amount: 2000 },
  ]
};

// Base market price (in the middle of the spread)
const BASE_MARKET_PRICE = 700; // sats per OVT

// Local storage keys
const TRADE_HISTORY_KEY = 'ovt-trade-history';
const ORDER_BOOK_KEY = 'ovt-order-book';

/**
 * Hook for trading OVT tokens
 */
export function useTradingModule() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook>(MOCK_ORDER_BOOK);
  const [tradeHistory, setTradeHistory] = useState<TradeTransaction[]>([]);
  const { navData } = useOVTClient();

  // Load stored data on mount
  useEffect(() => {
    try {
      // Load order book
      const storedOrderBook = localStorage.getItem(ORDER_BOOK_KEY);
      if (storedOrderBook) {
        setOrderBook(JSON.parse(storedOrderBook));
      }

      // Load trade history
      const storedTradeHistory = localStorage.getItem(TRADE_HISTORY_KEY);
      if (storedTradeHistory) {
        setTradeHistory(JSON.parse(storedTradeHistory));
      }
    } catch (err) {
      console.error('Error loading trade data from local storage:', err);
    }
  }, []);

  // Save order book whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(ORDER_BOOK_KEY, JSON.stringify(orderBook));
    } catch (err) {
      console.error('Error saving order book to local storage:', err);
    }
  }, [orderBook]);

  // Save trade history whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(TRADE_HISTORY_KEY, JSON.stringify(tradeHistory));
    } catch (err) {
      console.error('Error saving trade history to local storage:', err);
    }
  }, [tradeHistory]);

  // Get current market price
  const getMarketPrice = useCallback(async (): Promise<number> => {
    setIsLoading(true);
    setError(null);

    try {
      if (shouldUseMockData('trading')) {
        // For mock data, calculate mid-price from order book
        const highestBid = orderBook.bids[0]?.price || 0;
        const lowestAsk = orderBook.asks[0]?.price || 0;
        
        // If we have both, use the midpoint
        if (highestBid > 0 && lowestAsk > 0) {
          setIsLoading(false);
          return (highestBid + lowestAsk) / 2;
        }
        
        // Fallback to base price
        setIsLoading(false);
        return BASE_MARKET_PRICE;
      } else {
        // In real mode, we would fetch from an API
        // This is a placeholder for the future on-chain implementation
        const response = await fetch('https://api.example.com/price/ovt');
        if (!response.ok) {
          throw new Error('Failed to fetch market price');
        }
        
        const data = await response.json();
        setIsLoading(false);
        return data.price;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching price';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Error getting market price:', err);
      
      // Fallback to base price on error
      return BASE_MARKET_PRICE;
    }
  }, [orderBook]);

  // Estimate price impact for a given order size
  const estimatePriceImpact = useCallback(async (
    amount: number, 
    isBuy: boolean
  ): Promise<number> => {
    setIsLoading(true);
    setError(null);

    try {
      if (shouldUseMockData('trading')) {
        // Simple price impact model: larger orders move price more
        // For demo purposes only
        
        // Get base price
        const basePrice = await getMarketPrice();
        
        // Calculate impact (0.5% per 100 tokens for this demo)
        const impactPercentage = (amount / 100) * 0.5;
        const impactFactor = isBuy 
          ? 1 + (impactPercentage / 100)
          : 1 - (impactPercentage / 100);
        
        const impactPrice = Math.round(basePrice * impactFactor);
        setIsLoading(false);
        return impactPrice;
      } else {
        // Real implementation would use the order book depth
        // This is a placeholder for the future on-chain implementation
        const response = await fetch(`https://api.example.com/estimate-impact?amount=${amount}&side=${isBuy ? 'buy' : 'sell'}`);
        if (!response.ok) {
          throw new Error('Failed to estimate price impact');
        }
        
        const data = await response.json();
        setIsLoading(false);
        return data.estimatedPrice;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error estimating price';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Error estimating price impact:', err);
      
      // Fallback to market price on error
      return getMarketPrice();
    }
  }, [getMarketPrice]);

  // Get order book
  const getOrderBook = useCallback(async (): Promise<OrderBook> => {
    setIsLoading(true);
    setError(null);

    try {
      if (shouldUseMockData('trading')) {
        // For mock data, return the current order book state
        setIsLoading(false);
        return orderBook;
      } else {
        // In real mode, we would fetch from an API or blockchain
        // This is a placeholder for the future on-chain implementation
        const response = await fetch('https://api.example.com/orderbook/ovt');
        if (!response.ok) {
          throw new Error('Failed to fetch order book');
        }
        
        const data = await response.json();
        setIsLoading(false);
        return {
          bids: data.bids,
          asks: data.asks
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching order book';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Error getting order book:', err);
      
      // Fallback to current order book on error
      return orderBook;
    }
  }, [orderBook]);

  // Buy OVT tokens
  const buyOVT = useCallback(async (
    amount: number,
    maxPrice?: number
  ): Promise<TradeTransaction> => {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get execution price
      const executionPrice = await estimatePriceImpact(amount, true);
      
      // Check if price exceeds max price (for limit orders)
      if (maxPrice && executionPrice > maxPrice) {
        throw new Error(`Execution price ${executionPrice} exceeds max price ${maxPrice}`);
      }

      if (shouldUseMockData('trading')) {
        // For mock data, simulate a transaction
        // In real implementation, this would call a smart contract
        
        // Create transaction record
        const transaction: TradeTransaction = {
          txid: `buy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'buy',
          amount,
          price: executionPrice,
          timestamp: Date.now(),
          status: 'confirmed',
          details: {
            orderType: maxPrice ? 'limit' : 'market',
            limitPrice: maxPrice,
            filledAt: executionPrice
          }
        };
        
        // Update trade history
        setTradeHistory(prev => [transaction, ...prev]);
        
        // Simulate delay for network confirmation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setIsLoading(false);
        return transaction;
      } else {
        // Real implementation would call the blockchain
        // This is a placeholder for the future on-chain implementation
        const response = await fetch('https://api.example.com/trade/buy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount,
            maxPrice
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to execute buy order');
        }
        
        const data = await response.json();
        
        // Create transaction record
        const transaction: TradeTransaction = {
          txid: data.txid,
          type: 'buy',
          amount,
          price: data.executionPrice,
          timestamp: Date.now(),
          status: 'confirmed',
          details: {
            orderType: maxPrice ? 'limit' : 'market',
            limitPrice: maxPrice,
            filledAt: data.executionPrice
          }
        };
        
        // Update trade history
        setTradeHistory(prev => [transaction, ...prev]);
        
        setIsLoading(false);
        return transaction;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error buying OVT';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Error buying OVT:', err);
      throw err;
    }
  }, [estimatePriceImpact]);

  // Sell OVT tokens
  const sellOVT = useCallback(async (
    amount: number,
    minPrice?: number
  ): Promise<TradeTransaction> => {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get execution price
      const executionPrice = await estimatePriceImpact(amount, false);
      
      // Check if price is below min price (for limit orders)
      if (minPrice && executionPrice < minPrice) {
        throw new Error(`Execution price ${executionPrice} below min price ${minPrice}`);
      }

      if (shouldUseMockData('trading')) {
        // For mock data, simulate a transaction
        // In real implementation, this would call a smart contract
        
        // Create transaction record
        const transaction: TradeTransaction = {
          txid: `sell-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: 'sell',
          amount,
          price: executionPrice,
          timestamp: Date.now(),
          status: 'confirmed',
          details: {
            orderType: minPrice ? 'limit' : 'market',
            limitPrice: minPrice,
            filledAt: executionPrice
          }
        };
        
        // Update trade history
        setTradeHistory(prev => [transaction, ...prev]);
        
        // Simulate delay for network confirmation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setIsLoading(false);
        return transaction;
      } else {
        // Real implementation would call the blockchain
        // This is a placeholder for the future on-chain implementation
        const response = await fetch('https://api.example.com/trade/sell', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount,
            minPrice
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to execute sell order');
        }
        
        const data = await response.json();
        
        // Create transaction record
        const transaction: TradeTransaction = {
          txid: data.txid,
          type: 'sell',
          amount,
          price: data.executionPrice,
          timestamp: Date.now(),
          status: 'confirmed',
          details: {
            orderType: minPrice ? 'limit' : 'market',
            limitPrice: minPrice,
            filledAt: data.executionPrice
          }
        };
        
        // Update trade history
        setTradeHistory(prev => [transaction, ...prev]);
        
        setIsLoading(false);
        return transaction;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error selling OVT';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Error selling OVT:', err);
      throw err;
    }
  }, [estimatePriceImpact]);

  // Get recent trades
  const getRecentTrades = useCallback(async (limit: number = 10): Promise<TradeTransaction[]> => {
    setIsLoading(true);
    setError(null);

    try {
      if (shouldUseMockData('trading')) {
        // For mock data, return from our trade history
        setIsLoading(false);
        return tradeHistory.slice(0, limit);
      } else {
        // In real mode, we would fetch from an API or blockchain
        // This is a placeholder for the future on-chain implementation
        const response = await fetch(`https://api.example.com/trades/ovt?limit=${limit}`);
        if (!response.ok) {
          throw new Error('Failed to fetch recent trades');
        }
        
        const data = await response.json();
        setIsLoading(false);
        return data.trades;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching trades';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Error getting recent trades:', err);
      
      // Fallback to current trade history on error
      return tradeHistory.slice(0, limit);
    }
  }, [tradeHistory]);

  // Return the trading module interface
  return {
    buyOVT,
    sellOVT,
    getOrderBook,
    getMarketPrice,
    estimatePriceImpact,
    getRecentTrades,
    tradeHistory,
    isLoading,
    error,
    dataSourceIndicator: getDataSourceIndicator('trading')
  };
} 