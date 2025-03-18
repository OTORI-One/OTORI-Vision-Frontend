#!/usr/bin/env node

/**
 * OVT Rune Minting Script
 * 
 * This script mints additional OVT runes on Bitcoin's signet network.
 * It uses the Bitcoin Core CLI to create and broadcast a transaction
 * that mints additional tokens for the existing OVT rune.
 * 
 * Requirements:
 * - Bitcoin Core running on signet
 * - bitcoind configured with RPC access
 * - Sufficient signet BTC in the wallet
 * - OVT rune already etched
 * 
 * Usage:
 * node mint-ovt-rune.js <amount> [signatures]
 * 
 * Arguments:
 *   amount     Amount of OVT tokens to mint
 *   signatures Array of signatures authorizing the mint (optional)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Parse command line arguments
const amount = parseInt(process.argv[2], 10);
let signatures = [];

try {
  if (process.argv[3]) {
    signatures = JSON.parse(process.argv[3]);
  }
} catch (e) {
  console.error('Error parsing signatures:', e.message);
  process.exit(1);
}

// Validate amount
if (isNaN(amount) || amount <= 0) {
  console.error('Invalid amount. Please provide a positive number.');
  process.exit(1);
}

// Configuration
const LOG_DIR = path.resolve(__dirname, '../logs');
const RUNE_DATA_PATH = path.resolve(__dirname, '../src/mock-data/rune-data.json');

// Bitcoin CLI command
const BITCOIN_CLI = process.env.BITCOIN_CLI_PATH || 'bitcoin-cli';
const BITCOIN_NETWORK = process.env.NEXT_PUBLIC_BITCOIN_NETWORK || 'signet';
const BITCOIN_WALLET = process.env.BITCOIN_WALLET || '';
const WALLET_ARG = BITCOIN_WALLET ? `-rpcwallet=${BITCOIN_WALLET}` : '';
const NETWORK_ARG = `-${BITCOIN_NETWORK}`;

// Treasury (destination) address
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Log file
const LOG_FILE = path.join(LOG_DIR, `mint-ovt-rune-${Date.now()}.log`);
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

/**
 * Logs to console and file
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

/**
 * Executes a Bitcoin CLI command
 */
function execBitcoinCli(command) {
  const fullCommand = `${BITCOIN_CLI} ${NETWORK_ARG} ${WALLET_ARG} ${command}`;
  log(`Executing: ${fullCommand}`);
  try {
    const output = execSync(fullCommand, { encoding: 'utf8' });
    return output.trim();
  } catch (error) {
    log(`Error executing Bitcoin CLI: ${error.message}`);
    if (error.stderr) {
      log(`STDERR: ${error.stderr}`);
    }
    throw error;
  }
}

/**
 * Gets an unspent transaction for minting
 */
function getUnspentTx() {
  // Get unspent transactions with enough value
  const unspentList = JSON.parse(execBitcoinCli('listunspent'));
  
  // Find a suitable UTXO
  const utxo = unspentList.find(tx => tx.amount >= 0.001);
  
  if (!utxo) {
    throw new Error('No suitable UTXOs found. Need at least 0.001 BTC.');
  }
  
  return utxo;
}

/**
 * Gets the OVT rune ID
 */
function getRuneId() {
  // Check if rune data file exists
  if (!fs.existsSync(RUNE_DATA_PATH)) {
    throw new Error(`Rune data file not found: ${RUNE_DATA_PATH}. Etch the OVT rune first.`);
  }
  
  // Load rune data
  const runeData = JSON.parse(fs.readFileSync(RUNE_DATA_PATH, 'utf8'));
  
  if (!runeData.txid || runeData.txid === 'not_etched_yet') {
    throw new Error('OVT rune has not been etched yet. Run etch-ovt-rune.js first.');
  }
  
  // Look up rune ID from the txid
  try {
    // Get the rune name
    const runeName = `${runeData.symbol}`;
    
    // Get list of runes
    const runesList = JSON.parse(execBitcoinCli('listrunes'));
    
    // Find our rune
    const rune = runesList.find(r => r.name === runeName);
    
    if (!rune) {
      throw new Error(`Rune with name ${runeName} not found.`);
    }
    
    return rune.id;
  } catch (error) {
    // If we can't get the real ID, use the symbol as a fallback
    log(`Warning: Could not get rune ID: ${error.message}`);
    log('Using rune symbol as fallback.');
    return runeData.symbol;
  }
}

/**
 * Mints additional OVT tokens
 */
async function mintRune() {
  try {
    log(`Starting OVT rune minting process for ${amount} tokens...`);
    
    // Check if the signatures are sufficient
    if (signatures.length < 2) {
      log('Warning: Less than 2 signatures provided. In production, multi-sig would be required.');
    }
    
    // Check Bitcoin Core connection
    const networkInfo = execBitcoinCli('getnetworkinfo');
    log(`Connected to Bitcoin Core. Network: ${JSON.parse(networkInfo).subversion}`);
    
    // Check balance
    const balance = execBitcoinCli('getbalance');
    log(`Wallet balance: ${balance} BTC`);
    
    if (parseFloat(balance) < 0.001) {
      throw new Error('Insufficient balance. Need at least 0.001 BTC.');
    }
    
    // Get UTXO for the transaction
    log('Finding suitable UTXO...');
    const utxo = getUnspentTx();
    log(`Using UTXO: ${utxo.txid}:${utxo.vout} (${utxo.amount} BTC)`);
    
    // Get rune ID
    log('Getting OVT rune ID...');
    const runeId = getRuneId();
    log(`OVT rune ID: ${runeId}`);
    
    // Get treasury address
    const treasuryAddress = TREASURY_ADDRESS || execBitcoinCli('getnewaddress "OVT-treasury"');
    log(`Treasury address: ${treasuryAddress}`);
    
    // Prepare rune minting transaction
    const mintCommand = [
      'mintrune',
      `${utxo.txid}`,
      `${utxo.vout}`,
      `'${runeId}'`,
      `${amount}`,
      `'${treasuryAddress}'`
    ].join(' ');
    
    // Create the rune minting transaction
    log('Creating rune minting transaction...');
    const mintResult = execBitcoinCli(mintCommand);
    log(`Mint transaction created: ${mintResult}`);
    
    // Sign and send the transaction
    log('Signing transaction...');
    const signedTx = execBitcoinCli(`signrawtransactionwithwallet ${mintResult}`);
    const parsedSignResult = JSON.parse(signedTx);
    
    if (!parsedSignResult.complete) {
      throw new Error('Failed to sign transaction: ' + JSON.stringify(parsedSignResult));
    }
    
    log('Broadcasting transaction...');
    const txid = execBitcoinCli(`sendrawtransaction ${parsedSignResult.hex}`);
    log(`Transaction broadcast successful! TXID: ${txid}`);
    
    // Update rune data
    if (fs.existsSync(RUNE_DATA_PATH)) {
      const runeData = JSON.parse(fs.readFileSync(RUNE_DATA_PATH, 'utf8'));
      
      runeData.totalSupply = (runeData.totalSupply || runeData.initialSupply) + amount;
      
      if (!runeData.mintingTransactions) {
        runeData.mintingTransactions = [];
      }
      
      runeData.mintingTransactions.push({
        amount,
        txid,
        timestamp: new Date().toISOString(),
        signatures: signatures.length
      });
      
      fs.writeFileSync(RUNE_DATA_PATH, JSON.stringify(runeData, null, 2));
      log(`Updated rune data: Total supply now ${runeData.totalSupply}`);
    }
    
    log('OVT rune minting process completed successfully!');
    console.log(`\nTransaction ID: ${txid}`);
    
    return {
      success: true,
      txid,
      amount
    };
  } catch (error) {
    log(`Error minting OVT rune: ${error.message}`);
    console.error(`Error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  } finally {
    logStream.end();
  }
}

// Execute the script
mintRune().then(result => {
  if (result.success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}); 