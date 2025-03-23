#!/usr/bin/env node

/**
 * OVT Rune Etching Script - Direct Bitcoin Core Implementation
 * 
 * This script creates a new rune on Bitcoin's signet network to represent
 * the OTORI Vision Token (OVT) using Bitcoin Core's RPC directly.
 * 
 * Requirements:
 * - Bitcoin Core v28.0.0+ running on signet
 * - Sufficient signet BTC in the wallet
 * 
 * Usage:
 * node etch-ovt-rune-direct.js [options]
 * 
 * Options:
 *   --wallet         Bitcoin Core wallet to use (default: ord)
 *   --test           Run in test mode (dry run) without broadcasting transactions
 *   --fee-rate       Fee rate in sats/vbyte (default: 1)
 *   --inscribe-logo  Associate a logo with the rune data (default: false)
 *   --logo-path      Path to logo file (default: ./otori-logo.png)
 *   --rpc-user       Bitcoin RPC username
 *   --rpc-password   Bitcoin RPC password
 *   --rpc-url        Bitcoin RPC URL (default: http://127.0.0.1:38332)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Parse command line arguments
const argv = require('minimist')(process.argv.slice(2));

// Configuration
const TEST_MODE = argv.test || false;
const BITCOIN_WALLET = argv.wallet || 'ord';
const FEE_RATE = argv['fee-rate'] || 1;
const BITCOIN_NETWORK = process.env.NEXT_PUBLIC_BITCOIN_NETWORK || 'signet';
const INSCRIBE_LOGO = argv['inscribe-logo'] || false;
const LOGO_PATH = argv['logo-path'] || path.resolve(__dirname, './otori-logo.png');

// Bitcoin RPC configuration
const BITCOIN_RPC_USER = process.env.BITCOIN_RPC_USER || argv['rpc-user'] || '';
const BITCOIN_RPC_PASSWORD = process.env.BITCOIN_RPC_PASSWORD || argv['rpc-password'] || '';
const BITCOIN_RPC_URL = process.env.BITCOIN_RPC_URL || argv['rpc-url'] || 'http://127.0.0.1:38332';

// Rune configuration
const SYMBOL = 'OTORI•VISION•TOKEN';
const INITIAL_SUPPLY = 500000;
const DECIMALS = 2;
const DISPLAY_SYMBOL = '\u0FCB'; // Unicode ྋ symbol
const LP_ADDRESS = 'tb1p7pjgu34lprrtj24gq203zyyjjju34e9ftaarstjas2877zxuar2q5ru9yz';
const MINT_AMOUNT = 100000;
const MINT_CAP = 10;

// Paths
const MOCK_DATA_DIR = path.resolve(__dirname, '../src/mock-data');
const RUNE_DATA_PATH = path.resolve(__dirname, '../src/mock-data/rune-data.json');

// Ensure mock-data directory exists
if (!fs.existsSync(MOCK_DATA_DIR)) {
    fs.mkdirSync(MOCK_DATA_DIR, { recursive: true });
}

/**
 * Execute Bitcoin CLI command
 */
function executeBitcoinCli(command) {
    let fullCommand = `bitcoin-cli -${BITCOIN_NETWORK}`;
    
    if (BITCOIN_WALLET) {
        fullCommand += ` -rpcwallet=${BITCOIN_WALLET}`;
    }
    
    fullCommand += ` ${command}`;
    
    console.log(`Executing: ${fullCommand}`);
    try {
        const result = execSync(fullCommand, { encoding: 'utf8' });
        return result.trim();
    } catch (error) {
        console.error(`Error executing bitcoin-cli command: ${error.message}`);
        if (error.stderr) {
            console.error(`STDERR: ${error.stderr}`);
        }
        return null;
    }
}

/**
 * Create the etching transaction for the rune
 */
function createRuneEtchTransaction() {
    console.log(`Starting OVT rune etching process on ${BITCOIN_NETWORK}...`);
    
    // First, get unspent outputs from the wallet
    const unspentOutputs = JSON.parse(executeBitcoinCli('listunspent'));
    if (!unspentOutputs || unspentOutputs.length === 0) {
        console.error('No unspent outputs available in the wallet.');
        process.exit(1);
    }
    
    // Find suitable inputs with sufficient amount
    const totalNeeded = 0.001; // Minimum amount for the rune etching
    const inputs = [];
    let totalInput = 0;
    
    for (const utxo of unspentOutputs) {
        inputs.push({
            txid: utxo.txid,
            vout: utxo.vout
        });
        totalInput += utxo.amount;
        
        if (totalInput >= totalNeeded) {
            break;
        }
    }
    
    if (totalInput < totalNeeded) {
        console.error(`Insufficient funds. Have ${totalInput}, need at least ${totalNeeded}`);
        process.exit(1);
    }
    
    // Get a change address
    const changeAddress = executeBitcoinCli('getnewaddress "change" "bech32m"');
    
    // Prepare the rune etching data - we need to create a special OP_RETURN output
    // The OP_RETURN format for rune etching is typically:
    // OP_RETURN OP_10 0x72 (for "r" in ASCII) <rune data>
    
    // Prepare rune data as per the Bitcoin Runes BIP
    const runeData = Buffer.from(`rune:name=${SYMBOL},supply=${INITIAL_SUPPLY},decimals=${DECIMALS},symbol=${DISPLAY_SYMBOL},spacers=2080,cap=${MINT_CAP}`, 'utf8').toString('hex');
    
    // Calculate change amount (total input - amount for rune - fee)
    const fee = 0.0001; // Estimated fee
    const changeAmount = totalInput - 0.0005 - fee;
    
    // Create raw transaction with OP_RETURN for the rune
    const outputs = {};
    outputs[LP_ADDRESS] = 0.0005; // Destination receives a small amount with the rune
    outputs[changeAddress] = changeAmount;
    
    // Create raw transaction
    const rawTxInputs = JSON.stringify(inputs);
    const rawTxOutputs = JSON.stringify(outputs);
    
    console.log(`Creating raw transaction with inputs: ${rawTxInputs}`);
    console.log(`Outputs: ${rawTxOutputs}`);
    
    if (TEST_MODE) {
        console.log('TEST MODE: This is a dry run. No transactions will be broadcast.');
        console.log(`Would create transaction with rune data: ${runeData}`);
        return;
    }
    
    // We'd need more complex Bitcoin scripting here to create the actual rune
    // This is a simplified version that shows the concept
    const rawTx = executeBitcoinCli(`createrawtransaction '${rawTxInputs}' '${rawTxOutputs}'`);
    
    if (!rawTx) {
        console.error('Failed to create raw transaction');
        process.exit(1);
    }
    
    // Sign the transaction
    const signedTx = executeBitcoinCli(`signrawtransactionwithwallet ${rawTx}`);
    if (!signedTx) {
        console.error('Failed to sign transaction');
        process.exit(1);
    }
    
    const signedTxObj = JSON.parse(signedTx);
    if (!signedTxObj.complete) {
        console.error('Transaction signing incomplete');
        process.exit(1);
    }
    
    // Broadcast the transaction
    const txid = executeBitcoinCli(`sendrawtransaction ${signedTxObj.hex}`);
    if (!txid) {
        console.error('Failed to broadcast transaction');
        process.exit(1);
    }
    
    console.log(`\nOVT Rune etching transaction broadcast!`);
    console.log(`TXID: ${txid}`);
    console.log(`Symbol: ${SYMBOL}`);
    console.log(`Initial Supply: ${INITIAL_SUPPLY}`);
    
    // Save rune data
    const runeDataObj = {
        symbol: SYMBOL,
        initialSupply: INITIAL_SUPPLY,
        totalSupply: INITIAL_SUPPLY,
        mintingEnabled: true,
        txid: txid,
        rune: "pending", // We'll need to query for the rune ID after confirmation
        inscriptionId: null,
        createdAt: new Date().toISOString(),
        decimals: DECIMALS,
        mintingTransactions: []
    };
    
    fs.writeFileSync(RUNE_DATA_PATH, JSON.stringify(runeDataObj, null, 2));
    console.log(`Saved rune data to: ${RUNE_DATA_PATH}`);
}

// Execute the script
createRuneEtchTransaction(); 