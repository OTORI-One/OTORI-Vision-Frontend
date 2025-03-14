interface PriceCache {
  usdPrice: number;
  timestamp: number;
}

let priceCache: PriceCache | null = null;
const CACHE_DURATION = 60 * 1000; // 1 minute cache

export async function getBitcoinPrice(): Promise<number> {
  // Return cached price if still valid
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
    return priceCache.usdPrice;
  }

  try {
    // Fetch from multiple sources for redundancy
    const [coingeckoPrice, memepoolPrice] = await Promise.all([
      fetchCoingeckoPrice(),
      fetchMemepoolPrice()
    ]);

    // Use average of available prices
    const prices = [coingeckoPrice, memepoolPrice].filter(p => p !== null);
    if (prices.length === 0) {
      throw new Error('Failed to fetch Bitcoin price from all sources');
    }

    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Update cache
    priceCache = {
      usdPrice: averagePrice,
      timestamp: Date.now()
    };

    return averagePrice;
  } catch (error) {
    console.error('Error fetching Bitcoin price:', error);
    // Return cached price if available, even if expired
    if (priceCache) {
      return priceCache.usdPrice;
    }
    throw error;
  }
}

async function fetchCoingeckoPrice(): Promise<number | null> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
    );
    const data = await response.json();
    return data.bitcoin.usd;
  } catch (error) {
    console.warn('Failed to fetch from CoinGecko:', error);
    return null;
  }
}

async function fetchMemepoolPrice(): Promise<number | null> {
  try {
    const response = await fetch('https://mempool.space/api/v1/prices');
    const data = await response.json();
    return data.USD;
  } catch (error) {
    console.warn('Failed to fetch from Mempool:', error);
    return null;
  }
} 