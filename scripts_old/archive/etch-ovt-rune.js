#!/usr/bin/env node

/**
 * OVT Rune Etching Script
 * 
 * This script creates a new rune on Bitcoin's signet network to represent
 * the OTORI Vision Token (OVT) using the ord CLI tool.
 * 
 * Requirements:
 * - Bitcoin Core running on signet
 * - ord CLI configured with the same network
 * - Sufficient signet BTC in the wallet
 * 
 * Usage:
 * node etch-ovt-rune.js [options]
 * 
 * Options:
 *   --wallet         Bitcoin Core wallet to use (default: ord)
 *   --test           Run in test mode (dry run) without broadcasting transactions
 *   --fee-rate       Fee rate in sats/vbyte (default: 1)
 *   --inscribe-logo  Inscribe a logo with the rune (default: false)
 *   --logo-path      Path to logo file to inscribe (default: ./otori-logo.png)
 *   --rpc-user       Bitcoin RPC username
 *   --rpc-password   Bitcoin RPC password
 *   --rpc-url        Bitcoin RPC URL (default: http://127.0.0.1:38332)
 *   --cookie-path    Path to the Bitcoin cookie file
 *   --server-url     ORD server URL (default: http://127.0.0.1:80)
 * 
 * Environment Variables:
 *   BITCOIN_RPC_USER      - Bitcoin RPC username
 *   BITCOIN_RPC_PASSWORD  - Bitcoin RPC password
 *   BITCOIN_RPC_URL       - Bitcoin RPC URL
 *   BITCOIN_COOKIE_PATH   - Path to the Bitcoin cookie file
 *   ORD_SERVER_URL         - ORD server URL
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
const BITCOIN_COOKIE_PATH = process.env.BITCOIN_COOKIE_PATH || argv['cookie-path'] || '';
const ORD_SERVER_URL = process.env.ORD_SERVER_URL || argv['server-url'] || 'http://127.0.0.1:80';

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
const BATCH_FILE_PATH = path.resolve(__dirname, './ovt-rune-batch.yaml');

// Ensure mock-data directory exists
if (!fs.existsSync(MOCK_DATA_DIR)) {
    fs.mkdirSync(MOCK_DATA_DIR, { recursive: true });
}

/**
 * Get MIME type based on file extension
 */
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.json': 'application/json',
        '.txt': 'text/plain',
        '.html': 'text/html',
        '.md': 'text/markdown'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Etches the OVT rune using ord CLI batch command
 */
function etchRune() {
    console.log(`Starting OVT rune etching process on ${BITCOIN_NETWORK}...`);
    
    // Prepare batch file content
    let batchYaml = `---\nrunes:\n  - name: ${SYMBOL}\n    supply: ${INITIAL_SUPPLY}\n    decimals: ${DECIMALS}\n    symbol: ${DISPLAY_SYMBOL}\n    spacers: 2080\n    terms:\n      cap: ${MINT_CAP}\n      amount: ${MINT_AMOUNT}\n    destination: ${LP_ADDRESS}`;
    
    // Add inscription details if requested
    if (INSCRIBE_LOGO) {
        if (!fs.existsSync(LOGO_PATH)) {
            console.error(`Logo file not found at: ${LOGO_PATH}`);
            process.exit(1);
        }
        
        // Read the logo file and encode as base64
        const logoBuffer = fs.readFileSync(LOGO_PATH);
        const logoBase64 = logoBuffer.toString('base64');
        const mimeType = getMimeType(LOGO_PATH);
        
        console.log(`Adding logo inscription (${mimeType}) from: ${LOGO_PATH}`);
        
        // Add inscription details to batch file
        batchYaml += `\n    inscriptions:\n      - media_type: ${mimeType}\n        body: ${logoBase64}`;
    }
    
    // Write batch file
    fs.writeFileSync(BATCH_FILE_PATH, batchYaml);
    console.log(`Created batch file at ${BATCH_FILE_PATH}`);
    
    // Build a very explicit command with all credentials properly formatted
    let cmd = `ord --${BITCOIN_NETWORK}`;
    
    // Add Bitcoin data directory explicitly
    cmd += ` --bitcoin-data-dir="${process.env.HOME}/.bitcoin"`;
    
    // Add RPC credentials in the most explicit way
    if (BITCOIN_RPC_USER && BITCOIN_RPC_PASSWORD) {
        cmd += ` --bitcoin-rpc-user="${BITCOIN_RPC_USER}" --bitcoin-rpc-pass="${BITCOIN_RPC_PASSWORD}"`;
    }
    
    // Format URL differently for better compatibility
    if (BITCOIN_RPC_URL) {
        // Extract host and port from URL
        try {
            const url = new URL(BITCOIN_RPC_URL);
            cmd += ` --bitcoin-rpc-host="${url.hostname}" --bitcoin-rpc-port="${url.port}"`;
        } catch (e) {
            console.log(`Error parsing URL: ${e.message}, using original URL`);
            cmd += ` --bitcoin-rpc-url="${BITCOIN_RPC_URL}"`;
        }
    }
    
    // Add wallet command with all parameters properly quoted
    cmd += ` wallet batch --fee-rate ${FEE_RATE} --batch "${BATCH_FILE_PATH}"`;
    
    // Add dry-run flag if in test mode
    if (TEST_MODE) {
        console.log('TEST MODE: This is a dry run. No transactions will be broadcast.');
        cmd += ' --dry-run';
    }
    
    console.log(`Executing: ${cmd}`);
    
    try {
        // Execute the ord command with careful quoting
        const result = execSync(cmd, { encoding: 'utf8' });
        
        console.log('Command output:');
        console.log(result);
        
        // Try to extract transaction info from output
        let txid = '';
        let runeId = '';
        let inscriptionId = '';
        
        if (result.includes('txid:')) {
            const txidMatch = result.match(/txid:\s+([a-f0-9]+)/);
            if (txidMatch && txidMatch[1]) {
                txid = txidMatch[1];
            }
        }
        
        if (result.includes('rune:')) {
            const runeMatch = result.match(/rune:\s+([^\s]+)/);
            if (runeMatch && runeMatch[1]) {
                runeId = runeMatch[1];
            }
        }
        
        if (result.includes('inscription:')) {
            const inscriptionMatch = result.match(/inscription:\s+([^\s]+)/);
            if (inscriptionMatch && inscriptionMatch[1]) {
                inscriptionId = inscriptionMatch[1];
            }
        }
        
        // Save rune data if not in test mode and we have a txid
        if (!TEST_MODE && txid) {
            const runeData = {
                symbol: SYMBOL,
                initialSupply: INITIAL_SUPPLY,
                totalSupply: INITIAL_SUPPLY,
                mintingEnabled: true,
                txid: txid,
                rune: runeId,
                inscriptionId: inscriptionId || null,
                createdAt: new Date().toISOString(),
                decimals: DECIMALS,
                mintingTransactions: []
            };
            
            fs.writeFileSync(RUNE_DATA_PATH, JSON.stringify(runeData, null, 2));
            console.log(`Saved rune data to: ${RUNE_DATA_PATH}`);
            
            console.log(`\nOVT Rune etched successfully!`);
            console.log(`TXID: ${txid}`);
            if (runeId) console.log(`Rune: ${runeId}`);
            if (inscriptionId) console.log(`Inscription: ${inscriptionId}`);
            console.log(`Symbol: ${SYMBOL}`);
            console.log(`Initial Supply: ${INITIAL_SUPPLY}`);
        } else if (TEST_MODE) {
            console.log('\nDry run completed.');
        }
    } catch (error) {
        console.error(`Error executing ord command: ${error.message}`);
        if (error.stderr) {
            console.error(`STDERR: ${error.stderr}`);
        }
        process.exit(1);
    } finally {
        // Clean up the batch file
        try {
            fs.unlinkSync(BATCH_FILE_PATH);
            console.log(`Removed temporary batch file: ${BATCH_FILE_PATH}`);
        } catch (err) {
            console.warn(`Could not remove batch file: ${err.message}`);
        }
    }
}

// Execute the script
etchRune();