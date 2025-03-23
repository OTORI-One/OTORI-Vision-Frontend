#!/usr/bin/env node

/**
 * LP PSBTs Management Script
 * 
 * This script helps with managing and processing PSBTs for the LP wallet.
 * It can:
 * - List available PSBTs
 * - Check PSBT details
 * - Estimate fees
 * - Sign PSBTs (if wallet is available)
 * - Broadcast signed PSBTs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Configuration
const config = {
  dataDir: process.env.DATA_DIR || path.join(__dirname, '../data/lp-distribution'),
  bitcoinCliPath: process.env.BITCOIN_CLI_PATH || 'bitcoin-cli',
  network: process.env.NETWORK || 'testnet',
  walletName: process.env.WALLET_NAME || '',
};

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompts the user with a question
 * @param {string} question - The question to ask
 * @returns {Promise<string>} - User's answer
 */
function promptUser(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Executes a bitcoin-cli command
 * @param {string} command - Command to execute
 * @returns {string} - Command output
 */
function executeBitcoinCommand(command) {
  try {
    let fullCommand = `${config.bitcoinCliPath}`;
    
    if (config.network === 'testnet') {
      fullCommand += ' -testnet';
    }
    
    if (config.walletName) {
      fullCommand += ` -rpcwallet=${config.walletName}`;
    }
    
    fullCommand += ` ${command}`;
    
    return execSync(fullCommand).toString().trim();
  } catch (error) {
    console.error(`Error executing bitcoin command: ${error.message}`);
    if (error.stderr) {
      console.error(`stderr: ${error.stderr.toString()}`);
    }
    throw error;
  }
}

/**
 * Lists all PSBT files in the data directory
 * @returns {string[]} - Array of PSBT file paths
 */
function listPSBTFiles() {
  try {
    const files = fs.readdirSync(config.dataDir)
      .filter(file => file.endsWith('.psbt'))
      .map(file => path.join(config.dataDir, file));
    
    return files;
  } catch (error) {
    console.error(`Error listing PSBT files: ${error.message}`);
    return [];
  }
}

/**
 * Analyzes a PSBT file
 * @param {string} psbtFilePath - Path to PSBT file
 * @returns {object} - PSBT analysis
 */
function analyzePSBT(psbtFilePath) {
  try {
    const psbt = fs.readFileSync(psbtFilePath, 'utf8');
    const result = executeBitcoinCommand(`analyzepsbt ${psbt}`);
    return JSON.parse(result);
  } catch (error) {
    console.error(`Error analyzing PSBT: ${error.message}`);
    throw error;
  }
}

/**
 * Processes a PSBT
 * @param {string} psbtFilePath - Path to PSBT file
 */
async function processPSBT(psbtFilePath) {
  try {
    console.log(`\nProcessing PSBT: ${path.basename(psbtFilePath)}`);
    
    // Analyze the PSBT
    const analysis = analyzePSBT(psbtFilePath);
    console.log('\nPSBT Analysis:');
    console.log(`Status: ${analysis.complete ? 'Complete' : 'Incomplete'}`);
    console.log(`Inputs: ${analysis.inputs?.length || 0}`);
    console.log(`Outputs: ${analysis.outputs?.length || 0}`);
    console.log(`Estimated fee: ${analysis.fee || 'unknown'} BTC`);
    
    if (analysis.error) {
      console.log(`Error: ${analysis.error}`);
      return;
    }
    
    if (analysis.next === 'signer') {
      const shouldSign = await promptUser('This PSBT needs signing. Sign it now? (y/n): ');
      if (shouldSign.toLowerCase() === 'y') {
        // Attempt to sign the PSBT
        try {
          const psbt = fs.readFileSync(psbtFilePath, 'utf8');
          const signedPsbt = executeBitcoinCommand(`walletprocesspsbt ${psbt}`);
          const signedPsbtObj = JSON.parse(signedPsbt);
          
          if (signedPsbtObj.complete) {
            console.log('PSBT successfully signed!');
            
            // Save the signed PSBT
            const signedFilePath = psbtFilePath.replace('.psbt', '.signed.psbt');
            fs.writeFileSync(signedFilePath, signedPsbtObj.psbt);
            console.log(`Signed PSBT saved to: ${signedFilePath}`);
            
            // Ask if user wants to broadcast
            const shouldBroadcast = await promptUser('Broadcast the signed PSBT now? (y/n): ');
            if (shouldBroadcast.toLowerCase() === 'y') {
              const txid = executeBitcoinCommand(`finalizepsbt ${signedPsbtObj.psbt} true`);
              console.log(`Transaction broadcast! TXID: ${JSON.parse(txid).txid}`);
            }
          } else {
            console.log('PSBT signing incomplete. It may require additional signatures.');
          }
        } catch (error) {
          console.error('Error signing PSBT. Do you have the correct wallet loaded?');
        }
      }
    } else if (analysis.next === 'extractor') {
      // This PSBT is already signed and ready for broadcast
      const shouldBroadcast = await promptUser('This PSBT is ready for broadcast. Broadcast now? (y/n): ');
      if (shouldBroadcast.toLowerCase() === 'y') {
        try {
          const psbt = fs.readFileSync(psbtFilePath, 'utf8');
          const result = executeBitcoinCommand(`finalizepsbt ${psbt} true`);
          console.log(`Transaction broadcast! TXID: ${JSON.parse(result).txid}`);
        } catch (error) {
          console.error('Error broadcasting transaction:', error.message);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing PSBT: ${error.message}`);
  }
}

/**
 * Main menu function
 */
async function showMainMenu() {
  while (true) {
    console.log('\n=== LP PSBT Management Tool ===');
    console.log('1. List all PSBTs');
    console.log('2. Process a specific PSBT');
    console.log('3. Process all unsigned PSBTs');
    console.log('4. Check wallet status');
    console.log('5. Exit');
    
    const choice = await promptUser('\nEnter your choice (1-5): ');
    
    switch (choice) {
      case '1':
        // List all PSBTs
        const psbtFiles = listPSBTFiles();
        console.log('\nAvailable PSBT files:');
        if (psbtFiles.length === 0) {
          console.log('No PSBT files found.');
        } else {
          psbtFiles.forEach((file, index) => {
            console.log(`${index + 1}. ${path.basename(file)}`);
          });
        }
        break;
        
      case '2':
        // Process a specific PSBT
        const files = listPSBTFiles();
        if (files.length === 0) {
          console.log('No PSBT files found.');
          break;
        }
        
        console.log('\nAvailable PSBT files:');
        files.forEach((file, index) => {
          console.log(`${index + 1}. ${path.basename(file)}`);
        });
        
        const fileIndex = await promptUser(`\nEnter the file number (1-${files.length}): `);
        const selectedIndex = parseInt(fileIndex) - 1;
        
        if (selectedIndex >= 0 && selectedIndex < files.length) {
          await processPSBT(files[selectedIndex]);
        } else {
          console.log('Invalid selection.');
        }
        break;
        
      case '3':
        // Process all unsigned PSBTs
        const allFiles = listPSBTFiles();
        if (allFiles.length === 0) {
          console.log('No PSBT files found.');
          break;
        }
        
        console.log('\nProcessing all PSBTs...');
        let processedCount = 0;
        
        for (const file of allFiles) {
          if (!file.includes('.signed.')) {
            try {
              const analysis = analyzePSBT(file);
              if (!analysis.complete && analysis.next === 'signer') {
                await processPSBT(file);
                processedCount++;
              }
            } catch (error) {
              console.error(`Error processing ${path.basename(file)}: ${error.message}`);
            }
          }
        }
        
        console.log(`\nProcessed ${processedCount} unsigned PSBTs.`);
        break;
        
      case '4':
        // Check wallet status
        try {
          console.log('\nChecking wallet status...');
          const walletInfo = executeBitcoinCommand('getwalletinfo');
          console.log(walletInfo);
        } catch (error) {
          console.error('Error checking wallet status. Is bitcoin-cli configured correctly?');
        }
        break;
        
      case '5':
        // Exit
        console.log('Exiting...');
        rl.close();
        return;
        
      default:
        console.log('Invalid choice. Please try again.');
    }
  }
}

// Ensure data directory exists
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

// Start the application
console.log('=== OTORI•VISION•TOKEN LP PSBT Management Tool ===');
console.log(`Data directory: ${config.dataDir}`);
console.log(`Network: ${config.network}`);
console.log(`Wallet name: ${config.walletName || 'Default'}`);

// Check bitcoin-cli availability
try {
  const bitcoinCliVersion = execSync(`${config.bitcoinCliPath} --version`).toString();
  console.log(`Bitcoin CLI detected: ${bitcoinCliVersion.split('\n')[0]}`);
} catch (error) {
  console.warn('Warning: bitcoin-cli not found or not accessible. Some features may not work.');
}

showMainMenu().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 