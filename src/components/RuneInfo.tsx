import React, { useState, useEffect } from 'react';

interface RuneInfoProps {
  className?: string;
}

interface RuneData {
  symbol: string;
  initialSupply: number;
  totalSupply?: number;
  mintingEnabled: boolean;
  txid: string;
  createdAt: string;
  mintingTransactions?: Array<{
    amount: number;
    txid: string;
    timestamp: string;
  }>;
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

const RuneInfo: React.FC<RuneInfoProps> = ({ className }) => {
  const [runeData, setRuneData] = useState<RuneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRuneData = async () => {
      try {
        // In a real implementation, this would fetch from an API
        // For now, we'll use a placeholder
        setRuneData({
          symbol: 'OVT',
          initialSupply: 500000,
          mintingEnabled: true,
          txid: 'not_etched_yet',
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        setError('Failed to load Rune data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRuneData();
  }, []);

  if (loading) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
          <div className="h-24 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error || !runeData) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
        <h2 className="text-xl font-bold mb-2">OVT Rune Information</h2>
        <p className="text-sm text-gray-500 mb-4">Error loading Rune data</p>
        <p className="text-red-500">{error || 'Unknown error'}</p>
      </div>
    );
  }

  const isEtched = runeData.txid !== 'not_etched_yet';
  const totalSupply = runeData.totalSupply || runeData.initialSupply;
  const mintingCount = runeData.mintingTransactions?.length || 0;

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold">{runeData.symbol} Rune Information</h2>
        <span className={`px-2 py-1 text-xs rounded-full ${isEtched 
          ? 'bg-green-100 text-green-800' 
          : 'bg-amber-100 text-amber-800'}`}>
          {isEtched ? 'Etched' : 'Not Etched'}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Bitcoin Rune representing the OTORI Vision Token
      </p>
      
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Initial Supply</p>
            <p className="text-xl font-bold">{formatNumber(runeData.initialSupply)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Current Supply</p>
            <p className="text-xl font-bold">{formatNumber(totalSupply)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Minting</p>
            <p className="text-xl font-bold">{runeData.mintingEnabled ? 'Enabled' : 'Disabled'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Minting Events</p>
            <p className="text-xl font-bold">{mintingCount}</p>
          </div>
        </div>

        {isEtched && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-500 mb-2">Transaction</p>
            <a
              href={`https://mempool.space/testnet/tx/${runeData.txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
            >
              <span className="truncate">{runeData.txid}</span>
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        {mintingCount > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-500 mb-2">Recent Minting Events</p>
            <div className="space-y-2">
              {runeData.mintingTransactions?.slice(0, 3).map((tx, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <div className="flex items-center">
                    <span className="font-medium">+{formatNumber(tx.amount)}</span>
                    <span className="text-gray-500 ml-2">
                      {new Date(tx.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <a
                    href={`https://mempool.space/testnet/tx/${tx.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <span className="sr-only">View transaction</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RuneInfo; 