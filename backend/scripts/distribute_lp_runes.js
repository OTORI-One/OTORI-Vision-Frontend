#!/usr/bin/env node

/**
 * LP Runes Distribution Script
 * 
 * This script automates the process of distributing Runes tokens to the LP wallet
 * for trading simulation. It prepares PSBTs, handles wallet signing, and tracks
 * distribution progress.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

// Configuration
const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3030',
  runeId: process.env.RUNE_ID || '240249:101',
  lpAddress: process.env.LP_ADDRESS || 'tb1plp_placeholder_address', 
  // ⚠️ Update the LP address before running in production
  amount: process.env.AMOUNT ? parseInt(process.env.AMOUNT) : 210000, // 10% of total supply
  outputDir: process.env.OUTPUT_DIR || path.join(__dirname, '../data/lp-distribution'),
  batchSize: process.env.BATCH_SIZE ? parseInt(process.env.BATCH_SIZE) : 50000, // Tokens per batch
};

// Ensure output directory exists
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Makes API requests with error handling
 * @param {string} endpoint - API endpoint
 * @param {object} options - Axios options
 * @returns {Promise<any>} - API response
 */
async function makeApiRequest(endpoint, options = {}) {
  try {
    const url = `${config.apiBaseUrl}${endpoint}`;
    const response = await axios({
      url,
      ...options,
      timeout: 30000, // 30 second timeout
    });
    return response.data;
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Gets rune info to verify connection and parameters
 * @returns {Promise<object>} - Rune info
 */
async function getRuneInfo() {
  try {
    const response = await makeApiRequest(`/rune/${config.runeId}`);
    return response;
  } catch (error) {
    console.error("Failed to get rune info. Is the API running?");
    process.exit(1);
  }
}

/**
 * Gets current rune distribution info
 * @returns {Promise<object>} - Distribution statistics
 */
async function getDistributionStats() {
  try {
    const response = await makeApiRequest(`/rune/${config.runeId}/distribution`);
    return response.distributionStats;
  } catch (error) {
    console.log("Failed to get distribution stats, returning default values");
    return {
      totalSupply: 2100000,
      treasuryHeld: 1890000,
      lpHeld: 0,
      distributed: 210000,
      percentDistributed: 10,
      percentInLP: 0
    };
  }
}

/**
 * Prepares PSBTs for LP distribution
 * @param {number} amount - Amount to distribute
 * @returns {Promise<string[]>} - Array of PSBT strings
 */
async function prepareLPDistributionPSBTs(amount) {
  try {
    const response = await makeApiRequest('/rune/prepare-lp-distribution', {
      method: 'POST',
      data: {
        runeId: config.runeId,
        amount: amount,
        lpAddress: config.lpAddress
      }
    });
    
    return response.psbts || [];
  } catch (error) {
    console.error("Failed to prepare LP distribution PSBTs");
    throw error;
  }
}

/**
 * Saves PSBTs to files
 * @param {string[]} psbts - Array of PSBT strings
 * @returns {string[]} - Array of file paths
 */
function savePSBTsToFiles(psbts) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePaths = [];
  
  for (let i = 0; i < psbts.length; i++) {
    const filePath = path.join(config.outputDir, `lp_distribution_${timestamp}_${i}.psbt`);
    fs.writeFileSync(filePath, psbts[i]);
    filePaths.push(filePath);
  }
  
  return filePaths;
}

/**
 * Prompts user for confirmation
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} - User confirmation
 */
function promptForConfirmation(message) {
  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Executes a shell command
 * @param {string} command - Command to execute
 * @returns {Promise<{stdout: string, stderr: string}>} - Command output
 */
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stderr });
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

/**
 * Analyzes a PSBT file
 * @param {string} psbtFilePath - Path to PSBT file
 * @returns {Promise<object>} - PSBT analysis
 */
async function analyzePSBT(psbtFilePath) {
  try {
    const { stdout } = await executeCommand(`bitcoin-cli analyzepsbt $(cat ${psbtFilePath})`);
    return JSON.parse(stdout);
  } catch (error) {
    console.error("Failed to analyze PSBT:", error);
    throw error;
  }
}

/**
 * Estimates fees for a PSBT
 * @param {string} psbtFilePath - Path to PSBT file
 * @returns {Promise<number>} - Estimated fee in satoshis
 */
async function estimatePSBTFee(psbtFilePath) {
  try {
    const analysis = await analyzePSBT(psbtFilePath);
    return analysis.fee || 0;
  } catch (error) {
    console.error("Failed to estimate PSBT fee:", error);
    return 0;
  }
}

/**
 * Processes distribution in batches
 * @returns {Promise<void>}
 */
async function processBatchDistribution() {
  try {
    console.log("🔍 Checking rune info and distribution stats...");
    const runeInfo = await getRuneInfo();
    const stats = await getDistributionStats();
    
    console.log("\n== RUNE DISTRIBUTION INFO ==");
    console.log(`Rune ID: ${config.runeId}`);
    console.log(`LP Address: ${config.lpAddress}`);
    console.log(`Total Supply: ${stats.totalSupply}`);
    console.log(`Treasury Held: ${stats.treasuryHeld} (${(stats.treasuryHeld / stats.totalSupply * 100).toFixed(2)}%)`);
    console.log(`LP Wallet Held: ${stats.lpHeld} (${(stats.lpHeld / stats.totalSupply * 100).toFixed(2)}%)`);
    console.log(`Already Distributed: ${stats.distributed} (${stats.percentDistributed}%)`);
    
    const remainingAmount = config.amount - stats.lpHeld;
    if (remainingAmount <= 0) {
      console.log("\n✅ The LP wallet already has the target amount or more. No distribution needed.");
      rl.close();
      return;
    }
    
    console.log(`\n📊 Planning to distribute ${remainingAmount} tokens to LP wallet at ${config.lpAddress}`);
    
    // Calculate number of batches
    const numBatches = Math.ceil(remainingAmount / config.batchSize);
    console.log(`This will be done in ${numBatches} batch(es) of up to ${config.batchSize} tokens each`);
    
    const shouldContinue = await promptForConfirmation("Do you want to continue with the distribution?");
    if (!shouldContinue) {
      console.log("❌ Distribution canceled by user");
      rl.close();
      return;
    }
    
    // Process each batch
    let totalProcessed = 0;
    for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
      const batchAmount = Math.min(config.batchSize, remainingAmount - totalProcessed);
      console.log(`\n== Processing Batch ${batchIndex + 1}/${numBatches} (${batchAmount} tokens) ==`);
      
      // Prepare PSBTs for this batch
      console.log("🔄 Preparing PSBTs...");
      const psbts = await prepareLPDistributionPSBTs(batchAmount);
      console.log(`Created ${psbts.length} PSBTs for this batch`);
      
      // Save PSBTs to files
      const psbtFiles = savePSBTsToFiles(psbts);
      console.log(`PSBTs saved to ${config.outputDir}`);
      
      // Estimate fees
      let totalFees = 0;
      for (const file of psbtFiles) {
        const fee = await estimatePSBTFee(file);
        totalFees += fee;
      }
      console.log(`Estimated total fees: ${totalFees} satoshis (${(totalFees / 100000000).toFixed(8)} BTC)`);
      
      // Ask user to sign PSBTs manually for now
      console.log("\n⚠️ Please sign these PSBTs with your wallet and then broadcast them");
      console.log(`PSBT files are located at: ${config.outputDir}`);
      
      const shouldProceedToNextBatch = await promptForConfirmation("Proceed to next batch?");
      if (!shouldProceedToNextBatch) {
        console.log("❌ Distribution paused by user. Remaining batches not processed.");
        break;
      }
      
      totalProcessed += batchAmount;
    }
    
    console.log("\n✅ LP distribution process completed!");
    console.log(`Total tokens processed: ${totalProcessed}`);
    
    rl.close();
  } catch (error) {
    console.error("Error during distribution process:", error);
    rl.close();
    process.exit(1);
  }
}

// Main execution
console.log("=== OTORI•VISION•TOKEN LP Distribution Tool ===");
console.log("This tool helps distribute OVT runes to the LP wallet for trading simulation");
processBatchDistribution().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
}); 