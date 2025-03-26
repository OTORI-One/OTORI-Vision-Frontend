import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

type RuneInfoResponse = {
  success: boolean;
  runeData?: {
    symbol: string;
    initialSupply: number;
    totalSupply?: number;
    mintingEnabled: boolean;
    txid: string;
    createdAt: string;
    decimals?: number;
    mintingTransactions?: Array<{
      amount: number;
      txid: string;
      timestamp: string;
      signatures?: number;
    }>;
  };
  error?: string;
};

/**
 * Execute a command and return the result as a promise
 */
function execCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        if (stderr) {
          console.error(`stderr: ${stderr}`);
        }
        return reject(error);
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * Convert a Bitcoin CLI command to use the appropriate network
 */
function bitcoinCliCommand(command: string): string {
  const bitcoinCli = process.env.BITCOIN_CLI_PATH || 'bitcoin-cli';
  const network = process.env.NEXT_PUBLIC_BITCOIN_NETWORK || 'signet';
  const wallet = process.env.BITCOIN_WALLET || '';
  const walletArg = wallet ? `-rpcwallet=${wallet}` : '';
  
  return `${bitcoinCli} -${network} ${walletArg} ${command}`;
}

/**
 * Fetch rune data from Bitcoin Core or fallback to mock data
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RuneInfoResponse>
) {
  try {
    // Path to mock data
    const runeDataPath = path.join(process.cwd(), 'src', 'mock-data', 'rune-data.json');
    let mockDataExists = false;
    let mockData: any = null;
    
    // Check if mock data exists
    try {
      if (fs.existsSync(runeDataPath)) {
        mockData = JSON.parse(fs.readFileSync(runeDataPath, 'utf8'));
        mockDataExists = true;
      }
    } catch (error) {
      console.warn('Could not read mock rune data file:', error);
    }
    
    // If mock mode is enabled, return mock data
    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true' || 
        (process.env.NEXT_PUBLIC_MOCK_MODE === 'hybrid' && 
         process.env.NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE !== 'real')) {
      
      if (!mockDataExists) {
        // Return default mock data
        return res.status(200).json({
          success: true,
          runeData: {
            symbol: 'OVT',
            initialSupply: 500000,
            totalSupply: 500000,
            mintingEnabled: true,
            txid: 'not_etched_yet',
            createdAt: new Date().toISOString(),
            mintingTransactions: []
          }
        });
      }
      
      return res.status(200).json({
        success: true,
        runeData: mockData
      });
    }
    
    // Try to fetch real data from Bitcoin Core
    try {
      // Get rune symbol from mock data
      const symbol = mockDataExists ? mockData.symbol : 'OVT';
      
      // Get list of runes
      const runesListCommand = bitcoinCliCommand('listrunes');
      const runesListOutput = await execCommand(runesListCommand);
      const runesList = JSON.parse(runesListOutput);
      
      // Find our rune
      const rune = runesList.find((r: any) => r.name === symbol);
      
      if (!rune) {
        // If rune doesn't exist on-chain yet, fall back to mock data
        if (mockDataExists) {
          console.log('Rune not found on chain, using mock data');
          return res.status(200).json({
            success: true,
            runeData: mockData
          });
        }
        
        throw new Error(`Rune with name ${symbol} not found`);
      }
      
      // Get rune transaction history
      const runeHistoryCommand = bitcoinCliCommand(`getrunehistory ${rune.id}`);
      let mintingTransactions: Array<{
        amount: number;
        txid: string;
        timestamp: string;
      }> = [];
      
      try {
        const runeHistoryOutput = await execCommand(runeHistoryCommand);
        const runeHistory = JSON.parse(runeHistoryOutput);
        
        // Convert history to mintingTransactions format
        mintingTransactions = runeHistory.map((tx: any) => ({
          amount: tx.amount,
          txid: tx.txid,
          timestamp: new Date(tx.timestamp * 1000).toISOString()
        }));
      } catch (error) {
        console.warn('Could not get rune history:', error);
      }
      
      // Build rune data
      const runeData = {
        symbol: rune.name,
        initialSupply: parseInt(rune.initialSupply),
        totalSupply: parseInt(rune.currentSupply) || parseInt(rune.initialSupply),
        mintingEnabled: rune.mintable === true,
        txid: rune.etching_txid || (mockDataExists ? mockData.txid : 'not_etched_yet'),
        createdAt: new Date(rune.timestamp * 1000).toISOString(),
        decimals: rune.decimals || 0,
        mintingTransactions
      };
      
      // Update mock data file with real data
      if (mockDataExists) {
        try {
          fs.writeFileSync(runeDataPath, JSON.stringify({
            ...runeData,
            mintingTransactions: [
              ...(mockData.mintingTransactions || []),
              ...mintingTransactions.filter(tx => 
                !(mockData.mintingTransactions || []).some((mt: any) => mt.txid === tx.txid)
              )
            ]
          }, null, 2));
        } catch (error) {
          console.warn('Could not update mock rune data file:', error);
        }
      }
      
      return res.status(200).json({
        success: true,
        runeData
      });
    } catch (error: any) {
      console.error('Error fetching rune data from Bitcoin Core:', error);
      
      // If real data fetching fails but we have mock data, use it
      if (mockDataExists) {
        console.log('Falling back to mock data');
        return res.status(200).json({
          success: true,
          runeData: mockData
        });
      }
      
      throw error;
    }
  } catch (error: any) {
    console.error('Error in rune-info API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An unknown error occurred'
    });
  }
} 