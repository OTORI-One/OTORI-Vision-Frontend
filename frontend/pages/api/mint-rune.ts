import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

type MintRequest = {
  amount: number;
  signatures: string[];
};

type MintResponse = {
  success: boolean;
  txid?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MintResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { amount, signatures } = req.body as MintRequest;

    // Validate the request
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    if (!signatures || !Array.isArray(signatures) || signatures.length === 0) {
      return res.status(400).json({ success: false, error: 'Signatures required' });
    }

    // Minimum required signatures (adjust as needed)
    const MIN_SIGNATURES = 2;
    if (signatures.length < MIN_SIGNATURES) {
      return res.status(400).json({ 
        success: false, 
        error: `At least ${MIN_SIGNATURES} signatures required` 
      });
    }

    // Path to the mint script
    const scriptPath = path.resolve(process.cwd(), '../scripts/mint-ovt-rune.js');
    
    // Check if the script exists
    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({ 
        success: false, 
        error: 'Mint script not found' 
      });
    }

    // Execute the mint script with the amount and signatures
    const signaturesArg = signatures.map(sig => `"${sig}"`).join(',');
    const command = `node ${scriptPath} ${amount} '[${signaturesArg}]'`;
    
    console.log(`Executing command: ${command}`);
    
    // Execute the command
    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Execution error: ${error.message}`);
          return reject(error);
        }
        resolve({ stdout, stderr });
      });
    });
    
    console.log('Command output:', stdout);
    
    if (stderr) {
      console.error('Command stderr:', stderr);
    }
    
    // Extract the transaction ID from the output
    const txidMatch = stdout.match(/Transaction ID: ([a-f0-9]{64})/);
    const txid = txidMatch ? txidMatch[1] : undefined;
    
    if (!txid) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to extract transaction ID from mint output' 
      });
    }
    
    // Return success response
    return res.status(200).json({ 
      success: true, 
      txid 
    });
    
  } catch (error: any) {
    console.error('Error minting Rune:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'An unknown error occurred' 
    });
  }
} 