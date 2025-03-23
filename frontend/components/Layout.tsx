import React, { ReactNode, useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import WalletConnector from './WalletConnector';
import { useOVTClient } from '../src/hooks/useOVTClient';
import { isAdminWallet, ADMIN_WALLETS } from '../src/utils/adminUtils';
import styles from '../styles/Layout.module.css';

type LayoutProps = {
  children: ReactNode;
  title?: string;
};

export default function Layout({ children, title = 'OTORI Vision Token' }: LayoutProps) {
  const router = useRouter();
  const { baseCurrency, handleCurrencyChange } = useOVTClient();
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const DISABLE_ADMIN_REDIRECTS = true; // Set to false when everything is working
  
  // Set isMounted to true after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Check if connected wallet is an admin
  useEffect(() => {
    console.log('Layout - Connected address:', connectedAddress);
    const adminStatus = connectedAddress ? isAdminWallet(connectedAddress) : false;
    console.log('Layout - Is admin?', adminStatus);
    setIsAdmin(adminStatus);
    
    // Set loading to false after checking admin status
    setIsLoading(false);
  }, [connectedAddress]);
  
  // Navigation links - basic links always shown
  const baseNavigationLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/trade', label: 'Trade' },
  ];
  
  // Admin-only links
  const adminNavigationLinks = [
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/admin', label: 'Admin' },
  ];
  
  // Combine navigation links based on admin status
  // Only show admin links to admin users
  const navigationLinks = isAdmin 
    ? [...baseNavigationLinks, ...adminNavigationLinks]
    : baseNavigationLinks;
  
  // Wallet connection handlers
  const handleConnectWallet = (address: string) => {
    setConnectedAddress(address);
    console.log('Connected wallet address:', address);
  };
  
  const handleDisconnectWallet = () => {
    setConnectedAddress(null);
    console.log('Wallet disconnected');
  };
  
  // Redirect if trying to access restricted pages
  useEffect(() => {
    // Skip redirects if the debug flag is enabled
    if (DISABLE_ADMIN_REDIRECTS) {
      console.log('Admin redirects are disabled for debugging');
      return;
    }
    
    // Only redirect if we're sure the user is not an admin AND loading is complete
    // Add a check to make sure we have a valid address before redirecting
    if (!isLoading && connectedAddress && !isAdmin && (router.pathname === '/portfolio' || router.pathname === '/admin')) {
      console.log('Non-admin user attempting to access restricted page - redirecting to home');
      router.push('/');
    }
  }, [isAdmin, router.pathname, connectedAddress, isLoading]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{title} | OTORI</title>
        <meta name="description" content="OTORI Vision Token Fund" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link href="/" passHref>
                <span className="flex-shrink-0 flex items-center cursor-pointer">
                  <img className="h-8 w-auto" src="/logo.svg" alt="OTORI" />
                  <span className="ml-2 text-lg font-bold text-gray-900">OVT Fund</span>
                </span>
              </Link>
              <nav className="ml-8 flex space-x-4">
                {navigationLinks.map((link) => (
                  <Link key={link.href} href={link.href} passHref>
                    <span 
                      className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer ${
                        router.pathname === link.href 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {link.label}
                    </span>
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Only render currency buttons after component is mounted to prevent hydration issues */}
              {isMounted && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      // Direct approach - just set the currency and force a reload
                      console.log('BTC button clicked - setting currency to BTC');
                      localStorage.setItem('ovt-currency-preference', 'btc');
                      handleCurrencyChange('btc');
                      // Force a page reload to ensure all components use the new currency
                      window.location.reload();
                    }}
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      baseCurrency === 'btc' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    BTC
                  </button>
                  <button
                    onClick={() => {
                      // Direct approach - just set the currency and force a reload
                      console.log('USD button clicked - setting currency to USD');
                      localStorage.setItem('ovt-currency-preference', 'usd');
                      handleCurrencyChange('usd');
                      // Force a page reload to ensure all components use the new currency
                      window.location.reload();
                    }}
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      baseCurrency === 'usd' 
                        ? 'bg-green-100 text-green-800' 
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    USD
                  </button>
                </div>
              )}
              <WalletConnector 
                onConnect={handleConnectWallet}
                onDisconnect={handleDisconnectWallet}
                connectedAddress={connectedAddress || undefined}
              />
            </div>
          </div>
        </div>
      </header>
      
      <main>
        {children}
      </main>
      
      <footer className="bg-white mt-auto border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} OTORI Vision Token Fund. All rights reserved.
            </div>
            <div className="text-sm text-gray-400">
              Running on Bitcoin Testnet
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 