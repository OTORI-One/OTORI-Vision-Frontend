import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/**
 * API endpoint to serve mock rune data from the file system
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const runeDataPath = path.join(process.cwd(), 'src', 'mock-data', 'rune-data.json');
    
    // Check if file exists
    if (!fs.existsSync(runeDataPath)) {
      // Return default mock data if file doesn't exist
      return res.status(200).json({
        symbol: 'OVT',
        initialSupply: 500000,
        totalSupply: 500000,
        mintingEnabled: true,
        txid: 'not_etched_yet',
        createdAt: new Date().toISOString(),
        mintingTransactions: []
      });
    }
    
    // Read and parse file
    const runeData = JSON.parse(fs.readFileSync(runeDataPath, 'utf8'));
    
    // Send response
    res.status(200).json(runeData);
  } catch (error: any) {
    console.error('Error serving mock rune data:', error);
    
    // Return error
    res.status(500).json({
      error: error.message || 'An unknown error occurred'
    });
  }
} 