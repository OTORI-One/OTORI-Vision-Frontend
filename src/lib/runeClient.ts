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

  constructor(config: RuneClientConfig = {}) {
    this.runeId = config.runeId || OVT_RUNE_ID;
    this.runeSymbol = config.runeSymbol || OVT_RUNE_SYMBOL;
    this.treasuryAddresses = config.treasuryAddresses || [OVT_TREASURY_ADDRESS];
    this.endpoint = config.endpoint || 'http://127.0.0.1:9191/api';
    this.mempoolEndpoint = config.mempoolEndpoint || 'https://mempool.space/signet/api';
  }

  async getRuneInfo(): Promise<RuneInfo> {
    try {
      // Fetch balances to calculate distribution
      const balances = await this.getRuneBalances();
      
      // Calculate total and distributed supply
      const totalSupply = balances.reduce((sum, balance) => sum + balance.amount, 0);
      const distributedSupply = balances
        .filter(balance => balance.isDistributed)
        .reduce((sum, balance) => sum + balance.amount, 0);
      
      // Calculate percentage distributed
      const percentDistributed = totalSupply > 0 
        ? (distributedSupply / totalSupply) * 100 
        : 0;

      const response = await fetch(`${this.endpoint}/runes/${this.runeId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch rune info: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        id: data.id || this.runeId,
        symbol: data.symbol || this.runeSymbol,
        decimals: data.decimals || OVT_RUNE_DECIMALS,
        supply: {
          total: totalSupply || OVT_TOTAL_SUPPLY,
          distributed: distributedSupply,
          treasury: totalSupply - distributedSupply,
          percentDistributed
        },
        events: data.events || [],
        treasuryAddresses: this.treasuryAddresses
      };
    } catch (error) {
      console.error('Error fetching rune info:', error);
      // Return default values if API call fails
      return {
        id: this.runeId,
        symbol: this.runeSymbol,
        decimals: OVT_RUNE_DECIMALS,
        supply: {
          total: OVT_TOTAL_SUPPLY,
          distributed: 0,
          treasury: OVT_TOTAL_SUPPLY,
          percentDistributed: 0
        },
        events: [],
        treasuryAddresses: this.treasuryAddresses
      };
    }
  }

  async getRuneBalances(): Promise<RuneBalance[]> {
    try {
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
      console.error('Failed to fetch rune balances:', error);
      
      // Fallback for development: simulate some balances
      return [
        // Treasury balance
        {
          address: OVT_TREASURY_ADDRESS,
          amount: OVT_TOTAL_SUPPLY * 0.9, // 90% still in treasury
          isDistributed: false
        },
        // Some mock distributed balances
        {
          address: 'tb1pexampleaddress1',
          amount: OVT_TOTAL_SUPPLY * 0.05, // 5% distributed
          isDistributed: true
        },
        {
          address: 'tb1pexampleaddress2',
          amount: OVT_TOTAL_SUPPLY * 0.05, // 5% distributed
          isDistributed: true
        }
      ];
    }
  }

  async getBalance(address: string): Promise<number> {
    try {
      const response = await fetch(`${this.endpoint}/runes/${this.runeId}/balances/${address}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }

      const data = await response.json();
      return data.balance || 0;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return 0;
    }
  }

  async getDistributionEvents(): Promise<RuneEvent[]> {
    try {
      const response = await fetch(`${this.endpoint}/runes/${this.runeId}/events`);
      if (!response.ok) {
        throw new Error(`Failed to fetch distribution events: ${response.statusText}`);
      }

      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('Error fetching distribution events:', error);
      return [];
    }
  }

  async getTransactionInfo(txid: string): Promise<any> {
    try {
      const response = await fetch(`${this.mempoolEndpoint}/tx/${txid}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transaction info: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch transaction info for ${txid}:`, error);
      throw error;
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