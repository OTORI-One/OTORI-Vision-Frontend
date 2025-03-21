import { RuneClient, OVT_RUNE_ID, OVT_RUNE_SYMBOL, OVT_TOTAL_SUPPLY, OVT_TREASURY_ADDRESS } from '../runeClient';

// Mock fetch globally
global.fetch = jest.fn();

describe('RuneClient', () => {
  let runeClient: RuneClient;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Initialize RuneClient with default config
    runeClient = new RuneClient();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(runeClient['runeId']).toBe(OVT_RUNE_ID);
      expect(runeClient['runeSymbol']).toBe(OVT_RUNE_SYMBOL);
      expect(runeClient['treasuryAddresses']).toEqual([OVT_TREASURY_ADDRESS]);
    });

    it('should accept custom configuration', () => {
      const customClient = new RuneClient({
        runeId: 'custom-id',
        runeSymbol: 'CUSTOM',
        treasuryAddresses: ['custom-address'],
        endpoint: 'http://custom-endpoint',
        mempoolEndpoint: 'http://custom-mempool'
      });

      expect(customClient['runeId']).toBe('custom-id');
      expect(customClient['runeSymbol']).toBe('CUSTOM');
      expect(customClient['treasuryAddresses']).toEqual(['custom-address']);
      expect(customClient['endpoint']).toBe('http://custom-endpoint');
      expect(customClient['mempoolEndpoint']).toBe('http://custom-mempool');
    });
  });

  describe('getRuneInfo', () => {
    it('should fetch and return rune information', async () => {
      const mockBalances = [
        { address: OVT_TREASURY_ADDRESS, amount: 1900000, isDistributed: false },
        { address: 'addr1', amount: 100000, isDistributed: true },
        { address: 'addr2', amount: 100000, isDistributed: true }
      ];

      const mockApiResponse = {
        id: OVT_RUNE_ID,
        symbol: OVT_RUNE_SYMBOL,
        decimals: 2,
        events: [
          { timestamp: 1234567890, amount: 100000, recipient: 'addr1', txid: 'tx1' }
        ]
      };

      // Mock getRuneBalances
      jest.spyOn(runeClient, 'getRuneBalances').mockResolvedValue(mockBalances);

      // Mock fetch for getRuneInfo
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      });

      const info = await runeClient.getRuneInfo();

      expect(info).toEqual({
        id: OVT_RUNE_ID,
        symbol: OVT_RUNE_SYMBOL,
        decimals: 2,
        supply: {
          total: 2100000,
          distributed: 200000,
          treasury: 1900000,
          percentDistributed: (200000 / 2100000) * 100
        },
        events: mockApiResponse.events,
        treasuryAddresses: [OVT_TREASURY_ADDRESS]
      });
    });

    it('should return default values on API failure', async () => {
      // Mock getRuneBalances to fail
      jest.spyOn(runeClient, 'getRuneBalances').mockRejectedValue(new Error('API Error'));

      // Mock fetch to fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      const info = await runeClient.getRuneInfo();

      expect(info).toEqual({
        id: OVT_RUNE_ID,
        symbol: OVT_RUNE_SYMBOL,
        decimals: 2,
        supply: {
          total: OVT_TOTAL_SUPPLY,
          distributed: 0,
          treasury: OVT_TOTAL_SUPPLY,
          percentDistributed: 0
        },
        events: [],
        treasuryAddresses: [OVT_TREASURY_ADDRESS]
      });
    });
  });

  describe('getRuneBalances', () => {
    it('should fetch and return balances', async () => {
      const mockApiResponse = [
        { address: OVT_TREASURY_ADDRESS, amount: Math.floor(OVT_TOTAL_SUPPLY * 0.9) },
        { address: 'tb1pexampleaddress1', amount: Math.floor(OVT_TOTAL_SUPPLY * 0.05) },
        { address: 'tb1pexampleaddress2', amount: Math.floor(OVT_TOTAL_SUPPLY * 0.05) }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      });

      const balances = await runeClient.getRuneBalances();

      expect(balances).toEqual([
        { address: OVT_TREASURY_ADDRESS, amount: Math.floor(OVT_TOTAL_SUPPLY * 0.9), isDistributed: false },
        { address: 'tb1pexampleaddress1', amount: Math.floor(OVT_TOTAL_SUPPLY * 0.05), isDistributed: true },
        { address: 'tb1pexampleaddress2', amount: Math.floor(OVT_TOTAL_SUPPLY * 0.05), isDistributed: true }
      ]);
    });

    it('should return mock balances on API failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      const balances = await runeClient.getRuneBalances();

      expect(balances).toEqual([
        { 
          address: OVT_TREASURY_ADDRESS, 
          amount: OVT_TOTAL_SUPPLY * 0.9, 
          isDistributed: false 
        },
        { 
          address: 'tb1pexampleaddress1', 
          amount: OVT_TOTAL_SUPPLY * 0.05, 
          isDistributed: true 
        },
        { 
          address: 'tb1pexampleaddress2', 
          amount: OVT_TOTAL_SUPPLY * 0.05, 
          isDistributed: true 
        }
      ]);
    });
  });

  describe('treasury address management', () => {
    it('should add new treasury address', () => {
      const newAddress = 'new-treasury-address';
      runeClient.addTreasuryAddress(newAddress);
      expect(runeClient['treasuryAddresses']).toContain(newAddress);
    });

    it('should not add duplicate treasury address', () => {
      runeClient.addTreasuryAddress(OVT_TREASURY_ADDRESS);
      expect(runeClient['treasuryAddresses'].length).toBe(1);
    });

    it('should remove treasury address', () => {
      const newAddress = 'new-treasury-address';
      runeClient.addTreasuryAddress(newAddress);
      runeClient.removeTreasuryAddress(newAddress);
      expect(runeClient['treasuryAddresses']).not.toContain(newAddress);
    });

    it('should correctly identify treasury addresses', () => {
      expect(runeClient.isTreasuryAddress(OVT_TREASURY_ADDRESS)).toBe(true);
      expect(runeClient.isTreasuryAddress('random-address')).toBe(false);
    });
  });

  describe('getTransactionInfo', () => {
    it('should fetch transaction information', async () => {
      const mockTxInfo = {
        txid: 'test-txid',
        status: { confirmed: true },
        value: 100000
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTxInfo)
      });

      const txInfo = await runeClient.getTransactionInfo('test-txid');
      expect(txInfo).toEqual(mockTxInfo);
    });

    it('should throw error on API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'API Error'
      });

      await expect(runeClient.getTransactionInfo('test-txid'))
        .rejects
        .toThrow('Failed to fetch transaction info: API Error');
    });
  });
}); 