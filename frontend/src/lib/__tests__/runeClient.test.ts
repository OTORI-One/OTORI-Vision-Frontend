import { RuneClient, OVT_RUNE_ID, OVT_RUNE_SYMBOL, OVT_RUNE_TICKER, OVT_TOTAL_SUPPLY, OVT_TREASURY_ADDRESS, OVT_RUNE_DECIMALS, OVT_RUNE } from '../runeClient';

// Mock fetch and axios globally
global.fetch = jest.fn();
jest.mock('axios');

describe('RuneClient', () => {
  let runeClient: RuneClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Initialize with the proper config object
    runeClient = new RuneClient({
      baseUrl: 'https://api.example.com',
      mockData: true
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with config values', () => {
      const client = new RuneClient({
        baseUrl: 'https://api.example.com',
        mockData: true
      });
      
      expect(client.baseUrl).toBe('https://api.example.com');
      expect(client.mockData).toBe(true);
    });

    it('should accept and use provided config', () => {
      const customClient = new RuneClient({
        baseUrl: 'http://custom-endpoint',
        mockData: false
      });

      expect(customClient.baseUrl).toBe('http://custom-endpoint');
      expect(customClient.mockData).toBe(false);
    });
  });

  describe('getRuneInfo', () => {
    it('should return mock rune info when mockData is true', async () => {
      // Instead of spying on generateMockBalances, let's just verify the result
      const info = await runeClient.getRuneInfo(OVT_RUNE_ID);
      
      // Verify the structure contains expected fields
      expect(info).toHaveProperty('id', OVT_RUNE_ID);
      expect(info).toHaveProperty('symbol', OVT_RUNE_SYMBOL);
      expect(info).toHaveProperty('ticker', OVT_RUNE_TICKER);
      expect(info).toHaveProperty('divisibility');
      expect(info).toHaveProperty('supply');
      expect(info.supply).toHaveProperty('circulating');
      expect(info.supply).toHaveProperty('maximum');
    });
  });

  describe('getRuneBalances', () => {
    it('should return mock balances when mockData is true', async () => {
      const balances = await runeClient.getRuneBalances(OVT_RUNE_ID);
      
      // Check the structure of the response
      expect(Array.isArray(balances)).toBe(true);
      expect(balances.length).toBeGreaterThan(0);
      
      // Check that the treasury address is included
      const treasuryBalance = balances.find(b => b.address === OVT_RUNE.treasuryAddress);
      expect(treasuryBalance).toBeDefined();
      expect(treasuryBalance).toHaveProperty('isTreasury', true);
      
      // Check that the LP address is included
      const lpBalance = balances.find(b => b.address === OVT_RUNE.lpAddress);
      expect(lpBalance).toBeDefined();
      expect(lpBalance).toHaveProperty('isLP', true);
    });
  });

  describe('getDistributionStats', () => {
    it('should return mock distribution stats when mockData is true', async () => {
      const stats = await runeClient.getDistributionStats(OVT_RUNE_ID);
      
      // Check the structure of the response
      expect(stats).toHaveProperty('totalSupply', OVT_TOTAL_SUPPLY);
      expect(stats).toHaveProperty('treasuryHeld');
      expect(stats).toHaveProperty('lpHeld');
      expect(stats).toHaveProperty('distributed');
      expect(stats).toHaveProperty('percentDistributed');
      expect(stats).toHaveProperty('treasuryAddresses');
      expect(stats.treasuryAddresses).toContain(OVT_RUNE.treasuryAddress);
    });
  });

  describe('getLPInfo', () => {
    it('should return mock LP info when mockData is true', async () => {
      const lpInfo = await runeClient.getLPInfo(OVT_RUNE_ID);
      
      // Check the structure of the response
      expect(lpInfo).toHaveProperty('address', OVT_RUNE.lpAddress);
      expect(lpInfo).toHaveProperty('liquidity');
      expect(lpInfo.liquidity).toHaveProperty('ovt');
      expect(lpInfo.liquidity).toHaveProperty('btcSats');
      expect(lpInfo).toHaveProperty('pricing');
      expect(lpInfo).toHaveProperty('transactions');
      expect(Array.isArray(lpInfo.transactions)).toBe(true);
    });
  });

  // Remove tests for methods that don't exist anymore
}); 