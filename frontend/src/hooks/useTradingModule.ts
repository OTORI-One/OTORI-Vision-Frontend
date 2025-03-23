import { useState, useCallback, useEffect } from 'react';
import { useOVTClient } from './useOVTClient';
import { getDataSourceIndicator } from '../lib/hybridModeUtils';
import { ArchTransaction } from '../lib/archClient';

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

// Local storage keys
const TRADE_HISTORY_KEY = 'ovt-trade-history';

// Helper to convert ArchTransaction to TradeTransaction
const convertArchToTradeTransaction = (archTx: ArchTransaction): TradeTransaction => {
  return {
    txid: archTx.txid,
    type: archTx.type.toLowerCase() as 'buy' | 'sell',
    amount: archTx.amount,
    price: archTx.metadata?.price || 0,
    timestamp: archTx.timestamp,
    status: archTx.metadata?.status || 'confirmed',
    details: {
      orderType: archTx.metadata?.orderType,
      limitPrice: archTx.metadata?.limitPrice,
      filledAt: archTx.metadata?.filledAt
    }
  };
};

/**
 * Hook for trading OVT tokens
 */
export function useTradingModule() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeTransaction[]>([]);
  const { archClient } = useOVTClient();

  // Get data source indicator for UI
  const dataSourceIndicator = getDataSourceIndicator('trading');

  // Load stored data on mount
  useEffect(() => {
    try {
      // Load trade history
      const storedTradeHistory = localStorage.getItem(TRADE_HISTORY_KEY);
      if (storedTradeHistory) {
        setTradeHistory(JSON.parse(storedTradeHistory));
      }
    } catch (err) {
      console.error('Error loading trade data from local storage:', err);
    }
  }, []);

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
      const price = await archClient.getMarketPrice();
      setIsLoading(false);
      return price;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching price';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, [archClient]);

  // Estimate price impact for a given order size
  const estimatePriceImpact = useCallback(async (
    amount: number, 
    isBuy: boolean
  ): Promise<number> => {
    setIsLoading(true);
    setError(null);

    try {
      const impactPrice = await archClient.estimatePriceImpact(amount, isBuy);
      setIsLoading(false);
      return impactPrice;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error estimating price';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, [archClient]);

  // Get order book
  const getOrderBook = useCallback(async (): Promise<OrderBook> => {
    setIsLoading(true);
    setError(null);

    try {
      const orderBook = await archClient.getOrderBook();
      setIsLoading(false);
      return orderBook;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching order book';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, [archClient]);

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

      // Execute trade
      const transaction = await archClient.executeTrade({
        type: 'buy',
        amount,
        executionPrice,
        maxPrice
      });
      
      // Convert ArchTransaction to TradeTransaction
      const tradeTransaction = convertArchToTradeTransaction(transaction);
      
      // Update trade history
      setTradeHistory(prev => [tradeTransaction, ...prev]);
      
      setIsLoading(false);
      return tradeTransaction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error buying OVT';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, [archClient, estimatePriceImpact]);

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

      // Execute trade
      const transaction = await archClient.executeTrade({
        type: 'sell',
        amount,
        executionPrice,
        minPrice
      });
      
      // Convert ArchTransaction to TradeTransaction
      const tradeTransaction = convertArchToTradeTransaction(transaction);
      
      // Update trade history
      setTradeHistory(prev => [tradeTransaction, ...prev]);
      
      setIsLoading(false);
      return tradeTransaction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error selling OVT';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, [archClient, estimatePriceImpact]);

  // Get recent trades
  const getRecentTrades = useCallback(async (limit: number = 10): Promise<TradeTransaction[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const trades = await archClient.getTransactionHistory(limit.toString());
      const convertedTrades = trades.map(convertArchToTradeTransaction);
      setIsLoading(false);
      return convertedTrades;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching trades';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, [archClient]);

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
    dataSourceIndicator
  };
} 