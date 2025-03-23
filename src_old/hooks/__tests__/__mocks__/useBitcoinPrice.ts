export const useBitcoinPrice = jest.fn(() => ({
  price: 50000, // Mock BTC price in USD
  loading: false,
  error: null
}));

export default useBitcoinPrice; 