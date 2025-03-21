// Constants for the OVT rune
export const OVT_RUNE_ID = '240249:101';
export const OVT_RUNE_SYMBOL = 'OTORI•VISION•TOKEN';
export const OVT_RUNE_DECIMALS = 2;
export const OVT_TOTAL_SUPPLY = 2100000; // 2.1M tokens with 2 decimal places
export const OVT_TREASURY_ADDRESS = 'tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd';
export const OVT_TRANSACTION_ID = 'e75ce796378927a5c152e8ee469c4ca3cf19a921f1e444fb88a22aaf035782fb';

interface RuneClientConfig {
  runeId?: string;
  runeSymbol?: string;
  treasuryAddresses?: string[];
  endpoint?: string;
  mempoolEndpoint?: string;
  mockMode?: string;
  offlineMode?: boolean;
}

interface RuneSupply {
  total: number;
  distributed: number;
  treasury: number;
  percentDistributed: number;
}

interface RuneEvent {
  timestamp: number;
  amount: number;
  recipient: string;
  txid: string;
  runeTransactionId?: string;
}

interface RuneInfo {
  id: string;
  symbol: string;
  decimals: number;
  supply: RuneSupply;
  events: RuneEvent[];
  treasuryAddresses: string[];
}

interface RuneBalance {
  address: string;
  amount: number;
  isDistributed: boolean;
}

export class RuneClient {
  private runeId: string;
  private runeSymbol: string;
  private treasuryAddresses: string[];
  private endpoint: string;
  private mempoolEndpoint: string;
  private useLocalFallbacks: boolean = false; // Flag to remember if we had connection issues
  private mockMode: string;
  private offlineMode: boolean;

  constructor(config: RuneClientConfig = {}) {
    this.runeId = config.runeId || OVT_RUNE_ID;
    this.runeSymbol = config.runeSymbol || OVT_RUNE_SYMBOL;
    this.treasuryAddresses = config.treasuryAddresses || [OVT_TREASURY_ADDRESS];
    this.endpoint = config.endpoint || process.env.NEXT_PUBLIC_RUNE_ENDPOINT || 'http://localhost:3001';
    this.mempoolEndpoint = config.mempoolEndpoint || 'https://mempool.space/testnet/api';
    this.mockMode = config.mockMode || process.env.NEXT_PUBLIC_MOCK_MODE || 'hybrid';
    this.offlineMode = config.offlineMode || process.env.NODE_ENV === 'development';
    
    // Only check connectivity if not in offline mode
    if (!this.offlineMode) {
      this.checkConnectivity()
        .then(isConnected => {
          if (!isConnected) {
            console.warn('RuneClient: No connectivity, falling back to mock mode');
            this.useLocalFallbacks = true;
          }
        })
        .catch(() => {
          this.useLocalFallbacks = true;
        });
    } else {
      console.log('RuneClient: Running in offline development mode, using mock data');
      this.useLocalFallbacks = true;
    }
  }
  
  // Helper method to check API connectivity and set fallback flag
  private async checkConnectivity(): Promise<boolean> {
    try {
      // If we're in offline mode, don't even attempt to connect
      if (this.offlineMode) {
        this.useLocalFallbacks = true;
        return false;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${this.endpoint}/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      this.useLocalFallbacks = !response.ok;
      return response.ok;
    } catch (error) {
      console.warn('RuneClient: Connectivity check failed, using mock data:', error);
      this.useLocalFallbacks = true;
      return false;
    }
  }

  // Helper to generate consistent mock data
  private getMockRuneInfo(): RuneInfo {
    const totalSupply = OVT_TOTAL_SUPPLY;
    const distributed = Math.floor(totalSupply * 0.05); // 5% distributed
    
    return {
      id: this.runeId,
      symbol: this.runeSymbol,
      decimals: OVT_RUNE_DECIMALS,
      supply: {
        total: totalSupply,
        distributed: distributed,
        treasury: totalSupply - distributed,
        percentDistributed: (distributed / totalSupply) * 100
      },
      events: this.getMockDistributionEvents(),
      treasuryAddresses: this.treasuryAddresses
    };
  }
  
  // Helper to generate mock distribution events
  private getMockDistributionEvents(): RuneEvent[] {
    const now = Date.now();
    const totalSupply = OVT_TOTAL_SUPPLY;
    
    return [
      {
        timestamp: now - 86400000 * 30, // 30 days ago
        amount: Math.floor(totalSupply * 0.03), // 3% distributed
        recipient: 'tb1pexampleaddress1',
        txid: 'mock_tx_id_1',
        runeTransactionId: OVT_TRANSACTION_ID
      },
      {
        timestamp: now - 86400000 * 15, // 15 days ago
        amount: Math.floor(totalSupply * 0.02), // 2% distributed
        recipient: 'tb1pexampleaddress2',
        txid: 'mock_tx_id_2',
        runeTransactionId: OVT_TRANSACTION_ID
      }
    ];
  }

  async getRuneInfo(): Promise<RuneInfo> {
    try {
      // Skip API call if we're in offline mode or already know there's no connectivity
      if (this.offlineMode || this.useLocalFallbacks || this.mockMode === 'mock') {
        console.log('RuneClient: Using mock rune data');
        return this.getMockRuneInfo();
      }

      // Check connectivity again just to be sure
      const isConnected = await this.checkConnectivity();
      
      if (!isConnected) {
        console.log('RuneClient: No connectivity, using mock rune data');
        return this.getMockRuneInfo();
      }

      const response = await fetch(`${this.endpoint}/rune/info`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('RuneClient: Error fetching rune info, using mock data:', error);
      this.useLocalFallbacks = true;
      return this.getMockRuneInfo();
    }
  }

  async getRuneBalances(): Promise<RuneBalance[]> {
    try {
      // Skip API call if we're in offline mode or already know there's no connectivity
      if (this.offlineMode || this.useLocalFallbacks) {
        throw new Error('Using local fallbacks due to offline mode or connectivity issues');
      }
      
      const response = await fetch(`${this.endpoint}/runes/${this.runeId}/balances`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch rune balances: ${response.statusText}`);
      }
      
      const balances = await response.json();
      
      // Map to our RuneBalance interface
      return balances.map((balance: any) => ({
        address: balance.address,
        amount: balance.amount,
        isDistributed: !this.treasuryAddresses.includes(balance.address)
      }));
    } catch (error) {
      console.info('RuneClient: Using mock rune balances');
      this.useLocalFallbacks = true;
      
      // Fallback for development: simulate some balances
      return [
        // Treasury balance
        {
          address: OVT_TREASURY_ADDRESS,
          amount: OVT_TOTAL_SUPPLY * 0.95, // 95% still in treasury
          isDistributed: false
        },
        // Some mock distributed balances
        {
          address: 'tb1pexampleaddress1',
          amount: OVT_TOTAL_SUPPLY * 0.03, // 3% distributed
          isDistributed: true
        },
        {
          address: 'tb1pexampleaddress2',
          amount: OVT_TOTAL_SUPPLY * 0.02, // 2% distributed
          isDistributed: true
        }
      ];
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      // Skip API call if we're in offline mode or already know there's no connectivity
      if (this.offlineMode || this.useLocalFallbacks) {
        throw new Error('Using local fallbacks due to offline mode or connectivity issues');
      }
      
      const response = await fetch(`${this.endpoint}/runes/${this.runeId}/balances/${address}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }

      const data = await response.json();
      return data.balance || 0;
    } catch (error) {
      console.info('RuneClient: Using mock balance data');
      this.useLocalFallbacks = true;
      
      // Generate a mock balance
      if (address === OVT_TREASURY_ADDRESS) {
        return OVT_TOTAL_SUPPLY * 0.95;
      } else if (address) {
        // Generate a consistent mock balance based on address string
        const addressSum = address.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        return Math.floor((addressSum % 100) * OVT_TOTAL_SUPPLY / 1000);
      }
      return 0;
    }
  }

  async getDistributionEvents(): Promise<RuneEvent[]> {
    try {
      // Skip API call if we're in offline mode or already know there's no connectivity
      if (this.offlineMode || this.useLocalFallbacks) {
        throw new Error('Using local fallbacks due to offline mode or connectivity issues');
      }
      
      const response = await fetch(`${this.endpoint}/runes/${this.runeId}/events`);
      if (!response.ok) {
        throw new Error(`Failed to fetch distribution events: ${response.statusText}`);
      }

      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.info('RuneClient: Using mock distribution events');
      this.useLocalFallbacks = true;
      return this.getMockDistributionEvents();
    }
  }

  async getTransactionInfo(txid: string): Promise<any> {
    try {
      // Skip API call if we're in offline mode or already know there's no connectivity
      if (this.offlineMode || this.useLocalFallbacks) {
        throw new Error('Using local fallbacks due to offline mode or connectivity issues');
      }
      
      const response = await fetch(`${this.mempoolEndpoint}/tx/${txid}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transaction info: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.info('RuneClient: Using mock transaction data');
      this.useLocalFallbacks = true;
      
      // Return mock transaction data
      return {
        txid: txid || 'mock_tx_id',
        status: 'confirmed',
        timestamp: Date.now() - 86400000, // 1 day ago
        amount: 5000000,
        fee: 1000,
        confirmations: 25,
        inputs: [],
        outputs: []
      };
    }
  }

  // Treasury address management methods
  addTreasuryAddress(address: string): void {
    if (!this.treasuryAddresses.includes(address)) {
      this.treasuryAddresses.push(address);
    }
  }

  removeTreasuryAddress(address: string): void {
    this.treasuryAddresses = this.treasuryAddresses.filter(addr => addr !== address);
  }

  isTreasuryAddress(address: string): boolean {
    return this.treasuryAddresses.includes(address);
  }
} 