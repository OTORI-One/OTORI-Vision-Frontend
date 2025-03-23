import type { AppProps } from 'next/app';
import { LaserEyesProvider } from '@omnisat/lasereyes';
import { useEffect } from 'react';
import { ensurePortfolioDataLoaded } from '../src/utils/portfolioLoader';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  // Inject mock data on client-side
  useEffect(() => {
    ensurePortfolioDataLoaded();
    
    // Listen for wallet connection events from WalletConnector
    const handleWalletConnection = (e: CustomEvent) => {
      console.log('[_app.tsx] Detected wallet connection:', e.detail.address);
      // This can be used to update global state if needed
    };
    
    window.addEventListener('wallet-connected', handleWalletConnection as EventListener);
    return () => {
      window.removeEventListener('wallet-connected', handleWalletConnection as EventListener);
    };
  }, []);
  
  console.log('[_app.tsx] Initializing LaserEyesProvider with config:', {
    network: 'testnet4',
    timestamp: new Date().toISOString()
  });
  
  return (
    <LaserEyesProvider 
      config={{ 
        network: 'testnet4'
      }}
    >
      <Component {...pageProps} />
    </LaserEyesProvider>
  );
}