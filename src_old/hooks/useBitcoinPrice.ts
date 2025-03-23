import { useState, useEffect } from 'react';
import { getBitcoinPrice } from '../lib/bitcoinPrice';

export function useBitcoinPrice() {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchPrice = async () => {
      try {
        const btcPrice = await getBitcoinPrice();
        if (mounted) {
          setPrice(btcPrice);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch Bitcoin price');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchPrice();

    // Update price every minute
    const interval = setInterval(fetchPrice, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { price, loading, error };
} 