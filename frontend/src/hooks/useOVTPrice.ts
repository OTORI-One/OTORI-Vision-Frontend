/**
 * useOVTPrice Hook
 * 
 * This hook fetches OVT price data from the centralized price service,
 * ensuring consistent pricing across all clients.
 */

import { useState, useEffect } from 'react';
import priceService, { OVTPrice } from '../services/priceService';
import { shouldUseMockData } from '../lib/hybridModeUtils';

export function useOVTPrice() {
  const [ovtPrice, setOvtPrice] = useState<OVTPrice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // First check if we have a recent cached value
    const cachedData = priceService.getCachedOVTPrice();
    if (cachedData) {
      setOvtPrice(cachedData);
      setIsLoading(false);
    }

    // Function to fetch price data
    const fetchOVTPrice = async () => {
      try {
        setIsLoading(true);
        
        // Attempt to fetch from the API first
        try {
          // Fetch from the API - this will now be the primary approach
          const data = await priceService.getOVTPrice();
          setOvtPrice(data);
          priceService.cacheOVTPrice(data);
          setError(null);
          return; // Exit early if API call succeeds
        } catch (apiError) {
          console.warn('Failed to fetch from API, will use mock data if enabled:', apiError);
          // Continue to mock data fallback if the API call fails
        }

        // Check if we should use mock data (only as fallback)
        if (shouldUseMockData('tokenSupply')) {
          console.log('Using mock OVT price data as fallback');
          // For mock data, use a static value with mock 24h change
          const mockOVTPrice: OVTPrice = {
            price: 336666.67, // Match our mock data defaults
            btcPriceSats: 336666.67,
            btcPriceFormatted: '336,667 sats',
            usdPrice: 0.16, // Based on a $48k BTC price
            usdPriceFormatted: '$0.16',
            dailyChange: 7.59, // Mock 24h change
            lastUpdate: Date.now(),
            circulatingSupply: 1000000, // Default 1M circulating supply for testnet
            timestamp: Date.now()
          };
          
          setOvtPrice(mockOVTPrice);
          priceService.cacheOVTPrice(mockOVTPrice);
          setError(null);
        } else {
          // If we're here, the API failed and mock mode is disabled
          throw new Error('API request failed and mock mode is disabled');
        }
      } catch (err) {
        console.error('Error fetching OVT price:', err);
        setError('Failed to fetch OVT price data');
        
        // If we have cached data, continue using it
        if (!ovtPrice && cachedData) {
          setOvtPrice(cachedData);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately
    fetchOVTPrice();

    // Set up periodic refresh (every 5 minutes)
    const intervalId = setInterval(fetchOVTPrice, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Calculate the formatted daily change safely
  const dailyChangeFormatted = (() => {
    if (!ovtPrice || typeof ovtPrice.dailyChange !== 'number') return '0.00%';
    const change = ovtPrice.dailyChange;
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  })();

  return {
    price: ovtPrice?.price || 0,
    btcPriceSats: ovtPrice?.btcPriceSats || 0,
    btcPriceFormatted: ovtPrice?.btcPriceFormatted || '0 sats',
    usdPrice: ovtPrice?.usdPrice || 0,
    usdPriceFormatted: ovtPrice?.usdPriceFormatted || '$0.00',
    dailyChange: ovtPrice?.dailyChange || 0,
    dailyChangeFormatted,
    isPositiveChange: (ovtPrice?.dailyChange || 0) >= 0,
    lastUpdate: ovtPrice?.lastUpdate || 0,
    circulatingSupply: ovtPrice?.circulatingSupply || 1000000,
    isLoading,
    error
  };
} 