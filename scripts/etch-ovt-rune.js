#!/usr/bin/env node

/**
 * OVT Rune Etching Script
 * 
 * This script creates a new rune on Bitcoin's signet network to represent
 * the OTORI Vision Token (OVT). It uses the Bitcoin Core CLI to create and
 * broadcast a transaction that etches a new rune with the OVT symbol.
 * 
 * Requirements:
 * - Bitcoin Core running on signet
 * - bitcoind configured with RPC access
 * - Sufficient signet BTC in the wallet
 * 
 * Usage:
 * node etch-ovt-rune.js [options]
 * 
 * Options:
 *   --symbol     Symbol for the rune (default: 'OVT')
 *   --supply     Initial supply (default: 500000)
 *   --decimals   Decimals for the rune (default: 0)
 *   --wallet     Bitcoin Core wallet to use (default: '')
 *   --test       Run in test mode without broadcasting transactions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Parse command line arguments
const argv = require('minimist')(process.argv.slice(2));

// Add test mode flag
const TEST_MODE = argv.test || false;

// Configuration
const SYMBOL = 'OTORI•VISION•TOKEN';
const INITIAL_SUPPLY = 500000;
const DECIMALS = 2;
const DISPLAY_SYMBOL = '\u0FCB'; // Unicode ྋ symbol

// LP/Trading simulation address - replace with new address when created
const LP_ADDRESS = 'tb1p7pjgu34lprrtj24gq203zyyjjju34e9ftaarstjas2877zxuar2q5ru9yz'; 

// Additional parameters for open minting
const MINT_AMOUNT = 100000;  // Amount per mint transaction
const MINT_CAP = 10;  // Maximum number of mints allowed

const BITCOIN_WALLET = argv.wallet || '';
const WALLET_ARG = BITCOIN_WALLET ? `-rpcwallet=${BITCOIN_WALLET}` : '';
const LOG_DIR = path.resolve(__dirname, '../logs');
const RUNE_DATA_PATH = path.resolve(__dirname, '../src/mock-data/rune-data.json');

// Bitcoin CLI command
const BITCOIN_CLI = process.env.BITCOIN_CLI_PATH || 'bitcoin-cli';
const BITCOIN_NETWORK = process.env.NEXT_PUBLIC_BITCOIN_NETWORK || 'signet';
const NETWORK_ARG = `-${BITCOIN_NETWORK}`;

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create mock-data directory if it doesn't exist
const MOCK_DATA_DIR = path.resolve(__dirname, '../src/mock-data');
if (!fs.existsSync(MOCK_DATA_DIR)) {
    fs.mkdirSync(MOCK_DATA_DIR, { recursive: true });
}

// Log file
const LOG_FILE = path.join(LOG_DIR, `etch-ovt-rune-${new Date().toISOString().replace(/:/g, '-')}.log`);
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
    
    // In test mode, don't actually execute critical commands
    if (TEST_MODE && (command.includes('etchrune') || command.includes('sendrawtransaction'))) {
        log(`TEST MODE: Would execute: ${fullCommand}`);
        
        // For etchrune, return dummy transaction hex
        if (command.includes('etchrune')) {
            return "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        }
        
        // For sendrawtransaction, return dummy txid
        if (command.includes('sendrawtransaction')) {
            return "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        }
        
        return "TEST_RESULT";
    }
    
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
 * Gets an unspent transaction for etching
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
 * Gets a new address for change
 */
function getChangeAddress() {
    return execBitcoinCli('getnewaddress "OVT-change"');
}

/**
 * Etches a new OVT rune
 */
async function etchRune() {
    try {
        log(`Starting OVT rune etching process on ${BITCOIN_NETWORK}...`);
        
        if (TEST_MODE) {
            log('TEST MODE: This is a dry run. No transactions will be broadcast.');
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
        
        // Get change address
        const changeAddress = getChangeAddress();
        log(`Change address: ${changeAddress}`);
        
        // Prepare rune etching transaction
        const etchCommand = [
            'etchrune',
            `${utxo.txid}`,
            `${utxo.vout}`,
            `'${SYMBOL}'`,
            `${INITIAL_SUPPLY}`,
            `{\\\"decimals\\\":${DECIMALS},\\\"spacers\\\":2080,\\\"terms\\\":{\\\"cap\\\":${MINT_CAP},\\\"amount\\\":${MINT_AMOUNT}},\\\"symbol\\\":${DISPLAY_SYMBOL.charCodeAt(0)}}`,
            `'${LP_ADDRESS}'`
        ].join(' ');
        
        // Create the rune etching transaction
        log('Creating rune etching transaction...');
        const etchResult = execBitcoinCli(etchCommand);
        log(`Etch transaction created: ${etchResult}`);
        
        // Sign and send the transaction
        log('Signing transaction...');
        const signedTx = execBitcoinCli(`signrawtransactionwithwallet ${etchResult}`);
        const parsedSignResult = JSON.parse(signedTx);
        
        if (!parsedSignResult.complete) {
            throw new Error('Failed to sign transaction: ' + JSON.stringify(parsedSignResult));
        }
        
        log('Broadcasting transaction...');
        const txid = execBitcoinCli(`sendrawtransaction ${parsedSignResult.hex}`);
        log(`Transaction broadcast successful! TXID: ${txid}`);
        
        // Store rune data
        const runeData = {
            symbol: SYMBOL,
            initialSupply: INITIAL_SUPPLY,
            totalSupply: INITIAL_SUPPLY,
            mintingEnabled: true,
            txid: txid,
            createdAt: new Date().toISOString(),
            decimals: DECIMALS,
            mintingTransactions: []
        };
        
        fs.writeFileSync(RUNE_DATA_PATH, JSON.stringify(runeData, null, 2));
        log(`Saved rune data to: ${RUNE_DATA_PATH}`);
        
        if (TEST_MODE) {
            log('TEST MODE: Dry run completed successfully. The script appears to be configured correctly.');
            return {
                success: true,
                test: true,
                message: 'Dry run completed successfully.'
            };
        }
        
        log('OVT rune etching process completed successfully!');
        
        return {
            success: true,
            txid: txid,
            symbol: SYMBOL,
            initialSupply: INITIAL_SUPPLY
        };
    } catch (error) {
        log(`Error etching OVT rune: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    } finally {
        logStream.end();
        log(`Log saved to: ${LOG_FILE}`);
    }
}

// Execute the script
if (require.main === module) {
    etchRune().then(result => {
        if (result.test) {
            console.log(`\nDry run completed successfully. The script appears to be configured correctly.`);
            process.exit(0);
        } else if (result.success) {
            console.log(`\nOVT Rune etched successfully!`);
            console.log(`TXID: ${result.txid}`);
            console.log(`Symbol: ${result.symbol}`);
            console.log(`Initial Supply: ${result.initialSupply}`);
            process.exit(0);
        } else {
            console.error(`\nFailed to etch OVT rune: ${result.error}`);
            process.exit(1);
        }
    });
} else {
    // Export for importing in other scripts
    module.exports = {
        etchRune
    };
} 

async function etchRune() {
  try {
    const response = await fetch('http://your-ord-pi:3030/etch-rune', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: SYMBOL,
        supply: INITIAL_SUPPLY,
        decimals: DECIMALS
      })
    });
    
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    
    // Process the result and extract txid
    // ...
  } catch (error) {
    // Error handling
  }
} 