import { RuneClient, OVT_RUNE_ID, OVT_RUNE_SYMBOL, OVT_TOTAL_SUPPLY, OVT_TREASURY_ADDRESS, OVT_RUNE_DECIMALS } from '../runeClient';

// Mock fetch globally
global.fetch = jest.fn();

describe('RuneClient', () => {
  let runeClient: RuneClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    runeClient = new RuneClient();
  });

  afterEach(() => {
    jest.resetAllMocks();
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
        { address: OVT_TREASURY_ADDRESS, amount: Math.floor(OVT_TOTAL_SUPPLY * 0.9) },
        { address: 'tb1pexampleaddress1', amount: Math.floor(OVT_TOTAL_SUPPLY * 0.05) },
        { address: 'tb1pexampleaddress2', amount: Math.floor(OVT_TOTAL_SUPPLY * 0.05) }
      ];

      // Mock getRuneBalances response
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/balances')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockBalances)
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: OVT_RUNE_ID,
            symbol: OVT_RUNE_SYMBOL,
            decimals: OVT_RUNE_DECIMALS,
            events: []
          })
        });
      });

      const info = await runeClient.getRuneInfo();
      expect(info).toEqual({
        id: OVT_RUNE_ID,
        symbol: OVT_RUNE_SYMBOL,
        decimals: OVT_RUNE_DECIMALS,
        supply: {
          total: OVT_TOTAL_SUPPLY,
          distributed: Math.floor(OVT_TOTAL_SUPPLY * 0.1),
          treasury: Math.floor(OVT_TOTAL_SUPPLY * 0.9),
          percentDistributed: 10
        },
        events: [],
        treasuryAddresses: [OVT_TREASURY_ADDRESS]
      });
    });

    it('should return default values on API failure', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve({
        ok: false,
        statusText: 'API Error'
      }));

      const info = await runeClient.getRuneInfo();
      expect(info).toEqual({
        id: OVT_RUNE_ID,
        symbol: OVT_RUNE_SYMBOL,
        decimals: OVT_RUNE_DECIMALS,
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

      (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      }));

      const balances = await runeClient.getRuneBalances();
      expect(balances).toEqual([
        { address: OVT_TREASURY_ADDRESS, amount: Math.floor(OVT_TOTAL_SUPPLY * 0.9), isDistributed: false },
        { address: 'tb1pexampleaddress1', amount: Math.floor(OVT_TOTAL_SUPPLY * 0.05), isDistributed: true },
        { address: 'tb1pexampleaddress2', amount: Math.floor(OVT_TOTAL_SUPPLY * 0.05), isDistributed: true }
      ]);
    });

    it('should return mock balances on API failure', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve({
        ok: false,
        statusText: 'API Error'
      }));

      const balances = await runeClient.getRuneBalances();
      expect(balances).toEqual([
        { address: OVT_TREASURY_ADDRESS, amount: OVT_TOTAL_SUPPLY * 0.9, isDistributed: false },
        { address: 'tb1pexampleaddress1', amount: OVT_TOTAL_SUPPLY * 0.05, isDistributed: true },
        { address: 'tb1pexampleaddress2', amount: OVT_TOTAL_SUPPLY * 0.05, isDistributed: true }
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
      const initialLength = runeClient['treasuryAddresses'].length;
      runeClient.addTreasuryAddress(OVT_TREASURY_ADDRESS);
      expect(runeClient['treasuryAddresses'].length).toBe(initialLength);
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

      (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTxInfo)
      }));

      const txInfo = await runeClient.getTransactionInfo('test-txid');
      expect(txInfo).toEqual(mockTxInfo);
    });

    it('should throw error on API failure', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve({
        ok: false,
        statusText: 'API Error'
      }));

      await expect(runeClient.getTransactionInfo('test-txid'))
        .rejects
        .toThrow('Failed to fetch transaction info');
    });
  });
}); 