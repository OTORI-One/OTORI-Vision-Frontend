import type { AppProps } from 'next/app';
import { LaserEyesProvider } from '@omnisat/lasereyes';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
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