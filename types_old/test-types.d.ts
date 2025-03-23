declare namespace jest {
  interface Matchers<R> {
    toHaveNoViolations(): R;
  }
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.svg' {
  const content: any;
  export default content;
}

interface Portfolio {
  id: string;
  name: string;
  navHistory: Array<{
    date: string;
    nav: number;
  }>;
  holdings: Array<{
    asset: string;
    amount: string;
    value: number;
  }>;
}

interface Transaction {
  txid: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: string;
  asset: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  timestamp: string;
}

interface BitcoinPrice {
  price: number;
  lastUpdated: string;
}

interface WalletConnection {
  address: string;
}

interface MockWallet {
  connect: () => Promise<WalletConnection>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
} 