import { useState, useEffect } from 'react';
import axios from 'axios';

interface BitcoinPriceData {
  price: number | null;
  isLoading: boolean;
  error: string | null;
}

// Default fallback price to use when API fails
const FALLBACK_BTC_PRICE = 60000;

// Cache the bitcoin price to avoid unnecessary API calls
let cachedPrice: number | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes (increased from 5 minutes)

// Local storage keys for persistence across page reloads
const BTC_PRICE_KEY = 'otori-btc-price';
const BTC_TIMESTAMP_KEY = 'otori-btc-timestamp';

// Initialize from localStorage if available
if (typeof window !== 'undefined') {
  try {
    const storedPrice = localStorage.getItem(BTC_PRICE_KEY);
    const storedTimestamp = localStorage.getItem(BTC_TIMESTAMP_KEY);
    
    if (storedPrice && storedTimestamp) {
      cachedPrice = parseFloat(storedPrice);
      cacheTimestamp = parseInt(storedTimestamp, 10);
    }
  } catch (e) {
    console.warn('Failed to load cached Bitcoin price from localStorage');
  }
}

export function useBitcoinPrice(): BitcoinPriceData {
  const [data, setData] = useState<BitcoinPriceData>({
    price: cachedPrice || null,
    isLoading: !cachedPrice,
    error: null
  });

  useEffect(() => {
    const now = Date.now();
    
    // If we have a recent cached price, use it without making an API call
    if (cachedPrice && now - cacheTimestamp < CACHE_DURATION) {
      setData({
        price: cachedPrice,
        isLoading: false,
        error: null
      });
      return;
    }
    
    let isMounted = true;
    const fetchBitcoinPrice = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true }));
        
        // Add a random delay to avoid simultaneous requests
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
        
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
          timeout: 5000, // 5 second timeout
          headers: {
            'Cache-Control': 'max-age=3600' // Suggest caching for 1 hour
          }
        });
        
        if (response.data && response.data.bitcoin && response.data.bitcoin.usd) {
          const price = response.data.bitcoin.usd;
          
          // Update cache
          cachedPrice = price;
          cacheTimestamp = now;
          
          // Store in localStorage for persistence
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(BTC_PRICE_KEY, price.toString());
              localStorage.setItem(BTC_TIMESTAMP_KEY, now.toString());
            } catch (e) {
              console.warn('Failed to store Bitcoin price in localStorage');
            }
          }
          
          if (isMounted) {
            setData({
              price,
              isLoading: false,
              error: null
            });
          }
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.warn('Failed to fetch Bitcoin price, using fallback:', error);
        
        // If we have a cached price, use it even if it's older than the cache duration
        if (cachedPrice) {
          if (isMounted) {
            setData({
              price: cachedPrice,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        } else {
          // Otherwise use the hardcoded fallback price
          if (isMounted) {
            setData({
              price: FALLBACK_BTC_PRICE,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
          
          // Set the fallback price as the cached price
          cachedPrice = FALLBACK_BTC_PRICE;
          cacheTimestamp = now;
          
          // Store in localStorage
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(BTC_PRICE_KEY, FALLBACK_BTC_PRICE.toString());
              localStorage.setItem(BTC_TIMESTAMP_KEY, now.toString());
            } catch (e) {
              console.warn('Failed to store Bitcoin price in localStorage');
            }
          }
        }
      }
    };

    fetchBitcoinPrice();

    return () => {
      isMounted = false;
    };
  }, []);

  return data;
} 