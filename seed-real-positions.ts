#!/usr/bin/env ts-node
/**
 * OTORI Vision Token - Position Migration Script
 * 
 * This script migrates mock portfolio positions to real positions on the Bitcoin signet network.
 * It reads the mock data and creates real positions through the validator API.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// Type definition for portfolio positions
interface Portfolio {
  name: string;
  value: number;      // in sats
  description: string;
  transactionId?: string;
  tokenAmount: number;
  pricePerToken: number;
  current: number;    // in sats
  change: number;     // percentage
  address?: string;
}

// Type definition for migration results
interface MigrationResult {
  name: string;
  status: 'success' | 'failed';
  txid?: string;
  error?: string;
}

// Configuration validation
function validateConfig() {
  const requiredVars = [
    'NEXT_PUBLIC_PROGRAM_ID',
    'NEXT_PUBLIC_TREASURY_ADDRESS',
    'NEXT_PUBLIC_ARCH_ENDPOINT'
  ];

  for (const envVar of requiredVars) {
    if (!process.env[envVar]) {
      throw new Error(`Required environment variable ${envVar} is not set. Check your .env.local file.`);
    }
  }

  return {
    programId: process.env.NEXT_PUBLIC_PROGRAM_ID!,
    treasuryAddress: process.env.NEXT_PUBLIC_TREASURY_ADDRESS!,
    endpoint: process.env.NEXT_PUBLIC_ARCH_ENDPOINT!
  };
}

// Create a specialized client for adding positions
class PositionClient {
  private programId: string;
  private treasuryAddress: string;
  private endpoint: string;
  
  constructor(config: { programId: string; treasuryAddress: string; endpoint: string }) {
    this.programId = config.programId;
    this.treasuryAddress = config.treasuryAddress;
    this.endpoint = config.endpoint;
  }
  
  async addPosition(position: Portfolio): Promise<{ success: boolean; txid?: string; error?: string }> {
    try {
      console.log(`Calling validator API to add position: ${position.name}`);
      
      // JSON-RPC 2.0 format
      const jsonRpcPayload = {
        jsonrpc: "2.0",
        method: "add_position",
        params: {
          program_id: this.programId,
          name: position.name,
          description: position.description,
          value: position.value,
          token_amount: position.tokenAmount,
          price_per_token: position.pricePerToken,
          transaction_id: `position_entry_${position.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`
        },
        id: 1
      };

      const response = await fetch(`${this.endpoint}/api/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonRpcPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add position. Status: ${response.status}. Error: ${errorText}`);
      }

      const result = await response.json();
      console.log("API Response:", JSON.stringify(result, null, 2));
      
      if (result.error) {
        throw new Error(`JSON-RPC error: ${result.error.message} (code: ${result.error.code})`);
      }
      
      return {
        success: true,
        txid: result.result?.txid || result.result?.transaction_id,
      };
    } catch (error) {
      console.error(`Position creation failed for ${position.name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // New method to fetch positions
  async getPositions(): Promise<{ success: boolean; positions?: any[]; error?: string }> {
    try {
      console.log("Fetching positions from validator...");
      
      // JSON-RPC 2.0 format for get_positions method
      const jsonRpcPayload = {
        jsonrpc: "2.0",
        method: "get_positions",
        params: {
          program_id: this.programId
        },
        id: 1
      };
      
      const response = await fetch(`${this.endpoint}/api/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonRpcPayload)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.error) {
          console.log(`JSON-RPC error: ${result.error.message} (code: ${result.error.code})`);
          return {
            success: false,
            error: `JSON-RPC error: ${result.error.message}`
          };
        }
        
        console.log(`Success with JSON-RPC:`, JSON.stringify(result, null, 2));
        return {
          success: true,
          positions: result.result || []
        };
      } else {
        console.log(`API returned status: ${response.status}`);
        return {
          success: false,
          error: `API returned status: ${response.status}`
        };
      }
    } catch (error) {
      console.error("Failed to fetch positions:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// Read mock portfolio data
async function readMockPortfolioData(): Promise<Portfolio[]> {
  try {
    const filePath = path.resolve(__dirname, 'src/mock-data/portfolio-positions.json');
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as Portfolio[];
  } catch (error) {
    console.error('Error reading mock portfolio data:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting position migration from mock data to real positions on signet');
    
    // Validate and get configuration
    const config = validateConfig();
    console.log(`Using validator endpoint: ${config.endpoint}`);
    console.log(`Using program ID: ${config.programId}`);
    console.log(`Using treasury address: ${config.treasuryAddress}`);
    
    // Initialize client
    const client = new PositionClient({
      programId: config.programId,
      treasuryAddress: config.treasuryAddress,
      endpoint: config.endpoint
    });
    
    // Try to fetch existing positions first
    console.log("\nAttempting to fetch existing positions before migration...");
    const existingPositions = await client.getPositions();
    if (existingPositions.success) {
      console.log("Existing positions found:", existingPositions.positions);
    } else {
      console.log("Could not fetch existing positions:", existingPositions.error);
    }
    
    // Read mock data
    const portfolioPositions = await readMockPortfolioData();
    console.log(`\nFound ${portfolioPositions.length} mock positions to migrate`);
    
    // Process each position
    const results: MigrationResult[] = [];
    
    // Process only the first position as a test
    for (const position of portfolioPositions.slice(0, 1)) {
      console.log(`\nProcessing position: ${position.name}`);
      console.log(`  Value: ${position.value} sats`);
      console.log(`  Token Amount: ${position.tokenAmount} tokens`);
      console.log(`  Price Per Token: ${position.pricePerToken} sats`);
      
      // Add position to the validator
      const result = await client.addPosition(position);
      
      if (result.success) {
        console.log(`✅ Successfully added position: ${position.name}`);
        console.log(`  Transaction ID: ${result.txid}`);
        results.push({ name: position.name, status: 'success', txid: result.txid });
      } else {
        console.error(`❌ Failed to add position: ${position.name}`);
        console.error(`  Error: ${result.error}`);
        results.push({ name: position.name, status: 'failed', error: result.error });
      }
    }
    
    // Check positions after migration
    console.log("\nAttempting to fetch positions after migration...");
    const updatedPositions = await client.getPositions();
    if (updatedPositions.success) {
      console.log("Positions after migration:", updatedPositions.positions);
    } else {
      console.log("Could not fetch positions after migration:", updatedPositions.error);
    }
    
    // Print summary
    console.log('\n--- Migration Summary ---');
    console.log(`Total positions: ${portfolioPositions.length}`);
    console.log(`Successful: ${results.filter(r => r.status === 'success').length}`);
    console.log(`Failed: ${results.filter(r => r.status === 'failed').length}`);
    
    // Save results to file
    const resultsPath = path.resolve(__dirname, 'position_migration_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results: results
    }, null, 2));
    console.log(`\nDetailed results saved to: ${resultsPath}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
