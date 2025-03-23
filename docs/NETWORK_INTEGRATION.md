# OTORI Vision Network Integration Plan

## Overview
This document outlines the planned integration between OTORI Vision Token (OVT) and the Arch Network, detailing the transition from our mock environment to production.

## Current State (Mock Environment)
Our mock SDK (`mock_sdk.rs`) currently simulates:
- UTXO management
- Account state transitions
- Program execution
- Admin operations
- Bitcoin transaction handling

## Architectural Learnings from Testnet Deployment

### Key Architectural Findings
During our testnet deployment, we discovered several important architectural requirements:

1. **JSON-RPC Validator Architecture**
   - The Arch Network validator exposes a standard JSON-RPC interface
   - Custom program functions must be invoked through the `invoke_program` method
   - Program functions are not directly accessible as HTTP endpoints

2. **Program Function Limitations**
   - Current OTORI program implementation lacks position management functions (`add_position`, `get_positions`)
   - Program only defines basic functions: `Initialize`, `UpdateNAV`, and `BuybackBurn`
   - Functions need to be explicitly defined in the program before they can be invoked

3. **Hybrid Mode Implementation**
   - Implemented a hybrid approach to keep development progress while waiting for program updates
   - Portfolio positions stored in browser localStorage for frontend and JSON files for backend
   - Transaction history combines mock position entries with real blockchain transactions
   - Token operations (buy/sell) remain tied to real blockchain interactions

### JSON-RPC Invocation Pattern
The correct pattern to invoke program functions is:
```json
{
  "jsonrpc": "2.0",
  "method": "invoke_program",
  "params": {
    "program_id": "[PROGRAM_ID]",
    "function": "[FUNCTION_NAME]",
    "args": {
      // Function-specific arguments
    }
  },
  "id": 1
}
```

### Implementation Strategy
To accommodate the current program limitations while maintaining development momentum:

1. **For Portfolio Positions:**
   - Mock portfolio data using localStorage and local JSON files
   - Environment variables control which data sources are used:
     ```
     NEXT_PUBLIC_MOCK_MODE=hybrid
     NEXT_PUBLIC_PORTFOLIO_DATA_SOURCE=mock
     ```

2. **For Transactions:**
   - Combine mock position-related transactions with real token transactions
   - Hybrid transaction mode enables this mixed approach:
     ```
     NEXT_PUBLIC_TRANSACTION_DATA_SOURCE=hybrid
     ```

3. **For Token Operations:**
   - Keep all token buying/selling operations connected to real blockchain operations
   - Token supply can be tracked from real data:
     ```
     NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE=real
     ```

## Integration Phases

### Phase 1: Bitcoin Network Connection
1. **Bitcoin Node Setup**
   - Deploy Bitcoin Core node
   - Configure for testnet/mainnet
   - Implement RPC client integration
   - Set up Electrs indexer

2. **UTXO Management**
   - Replace mock UTXO validation with real Bitcoin network queries
   - Implement confirmation tracking
   - Handle reorgs and chain splits
   - Add UTXO caching layer

### Phase 2: Arch Network Integration
1. **Program Deployment**
   - Convert mock program to Arch Network format
   - Deploy to testnet
   - Validate state transitions
   - Implement proper error handling

2. **Account Management**
   - Migrate mock accounts to Arch Network accounts
   - Implement proper key management
   - Set up secure storage for admin keys
   - Add account recovery mechanisms

### Phase 3: State Management
1. **Data Migration**
   - Design state migration strategy
   - Implement data validation
   - Set up monitoring and alerts
   - Create rollback procedures

2. **Transaction Processing**
   - Replace mock transactions with real ones
   - Implement proper fee management
   - Add transaction batching
   - Set up transaction monitoring

## Future Program Roadmap

### Upcoming Program Updates
The OTORI program needs to be updated to include these functions:

1. **Position Management**
   - `add_position`: Add a new investment position
   - `get_positions`: Retrieve all positions
   - `update_position`: Update an existing position's data

2. **Enhanced Token Operations**
   - Functions to mint OVT runes on signet
   - Integration with DEX APIs for real trading
   - Proper transaction verification and validation

### Migration Strategy
As the program is updated, we'll:
1. Gradually transition from mocked positions to real ones
2. Maintain backward compatibility during transition
3. Provide clear upgrade paths for users

## Security Considerations
1. **Network Security**
   - Implement proper firewall rules
   - Set up secure RPC connections
   - Monitor for suspicious activities
   - Regular security audits

2. **Key Management**
   - Secure storage of admin keys
   - Multi-signature requirements
   - Key rotation procedures
   - Backup and recovery plans

## Testing Strategy
1. **Testnet Phase**
   - Deploy to Arch testnet
   - Run integration tests
   - Perform load testing
   - Validate state transitions

2. **Mainnet Preparation**
   - Security audit
   - Performance optimization
   - Documentation review
   - Emergency procedures

## Monitoring and Maintenance
1. **Monitoring**
   - UTXO state tracking
   - Transaction confirmation monitoring
   - Network health metrics
   - Performance metrics

2. **Maintenance**
   - Regular backups
   - Update procedures
   - Emergency response plan
   - Documentation updates

## Timeline and Milestones
1. **Phase 1** (Estimated: 4 weeks)
   - Week 1-2: Bitcoin node setup and configuration
   - Week 3-4: UTXO management implementation

2. **Phase 2** (Estimated: 6 weeks)
   - Week 1-3: Program deployment and testing
   - Week 4-6: Account management implementation

3. **Phase 3** (Estimated: 4 weeks)
   - Week 1-2: State migration
   - Week 3-4: Transaction processing

## Risk Mitigation
1. **Technical Risks**
   - Network disruptions
   - Chain reorganizations
   - State inconsistencies
   - Performance issues

2. **Operational Risks**
   - Key compromise
   - Data loss
   - Service disruption
   - Human error

## Success Criteria
1. **Technical**
   - Successful testnet deployment
   - All tests passing
   - Performance metrics met
   - Security audit passed

2. **Operational**
   - Monitoring in place
   - Documentation complete
   - Team trained
   - Support procedures established

## Future Considerations
1. **Scalability**
   - UTXO optimization
   - Transaction batching
   - State compression
   - Performance tuning

2. **Features**
   - Advanced analytics
   - Additional security features
   - Enhanced monitoring
   - User tooling

## Documentation Requirements
1. **Technical Documentation**
   - Architecture diagrams
   - API documentation
   - Integration guides
   - Troubleshooting guides

2. **Operational Documentation**
   - Runbooks
   - Emergency procedures
   - Monitoring guides
   - Maintenance procedures 


   # Journal

## What We Accomplished

1. **Bitcoin Network Configuration**
   - Successfully configured Bitcoin Core on signet
   - Set up proper RPC credentials and network parameters
   - Ensured blockchain synchronization

2. **Electrs Integration**
   - Installed and configured the Arch Network fork of Electrs with HTTP API support
   - Resolved port conflicts and configuration issues
   - Successfully enabled HTTP API on port 3002 for validator access
   - Fixed nested database path issues and optimized for Raspberry Pi

3. **Validator Setup**
   - Connected validator to both Bitcoin Core and Electrs
   - Configured proper network access and Bitcoin RPC parameters
   - Validated successful communication between components

4. **Frontend Deployment**
   - Configured Next.js frontend to connect to the validator
   - Set up environment variables for real data access
   - Implemented PM2 for robust process management
   - Made the application accessible both internally and externally

5. **Network and Security Setup**
   - Configured port forwarding on the router
   - Implemented UFW firewall rules
   - Exposed necessary services securely

6. **Architecture Exploration & Resolution**
   - Discovered key architectural requirements for Arch Network integration
   - Identified program function limitations and implemented a hybrid solution
   - Created a sustainable path forward while maintaining functionality

## Challenges Faced and Conquered

1. **Electrs HTTP API Issue**
   - **Challenge**: Standard Electrs (v0.10.9) didn't support HTTP server functionality despite the validator requiring it
   - **Solution**: Implemented the Arch Network fork of Electrs which includes HTTP API support

2. **Configuration Consistency**
   - **Challenge**: Multiple configuration files and services needed precise synchronization
   - **Solution**: Systematically updated Bitcoin Core, Electrs, and validator configurations to ensure compatibility

3. **Port Conflicts**
   - **Challenge**: Multiple services attempting to use the same ports
   - **Solution**: Created clean service configurations with unique port assignments

4. **Process Management**
   - **Challenge**: Difficulty managing multiple services and background processes
   - **Solution**: Implemented PM2 for frontend and proper systemd services for backend components

5. **Arch Network Program Invocation**
   - **Challenge**: "Method not found" errors when trying to call program functions
   - **Solution**: Identified correct JSON-RPC pattern using `invoke_program` method
   - **Challenge**: Program missing required position management functions
   - **Solution**: Implemented hybrid mode with local storage for positions

## Working Configurations

### Bitcoin Core (`~/.bitcoin/bitcoin.conf`)
```
server=1
txindex=1
signet=1
rpcuser=bitcoin
rpcpassword=vX3iNDjZof8orZVu8G3WfYTmlxVQyAkg
rpcbind=0.0.0.0
rpcallowip=127.0.0.1
rpcallowip=172.17.0.0/16
```

### Electrs Systemd Service (`/etc/systemd/system/arch-electrs-signet.service`)
```
[Unit]
Description=Arch Electrs Signet
After=bitcoind.service
Wants=bitcoind.service

[Service]
User=otori-pi
Group=otori-pi
WorkingDirectory=/home/otori-pi
ExecStart=/home/otori-pi/electrs/target/release/electrs --network signet --daemon-dir /home/otori-pi/.bitcoin --db-dir /home/otori-pi/.electrs/db --daemon-rpc-addr 127.0.0.1:38332 --cookie bitcoin:vX3iNDjZof8orZVu8G3WfYTmlxVQyAkg --electrum-rpc-addr 0.0.0.0:60001 --monitoring-addr 127.0.0.1:4225 --http-addr 0.0.0.0:3002 --jsonrpc-import --lightmode -vvv
Restart=always
TimeoutStopSec=30
RestartSec=30
Environment="RUST_LOG=info"
Environment="RUST_BACKTRACE=1"

[Install]
WantedBy=multi-user.target
```

### Frontend Environment (`.env.local`) - Updated for Hybrid Mode
```
NEXT_PUBLIC_PROGRAM_ID=a69a7dd583609c1e9f78771753592639376676872f9500552d77c9b13821b19b
NEXT_PUBLIC_ARCH_ENDPOINT=http://localhost:9002
NEXT_PUBLIC_TREASURY_ADDRESS=tb1psu2cxm4cel4qgnyhcpu3t7sf2ctcgd4fkx0dy934wvm0puqpnfeqdjc4en
NEXT_PUBLIC_MOCK_MODE=hybrid
NEXT_PUBLIC_PORTFOLIO_DATA_SOURCE=mock
NEXT_PUBLIC_TRANSACTION_DATA_SOURCE=hybrid
NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE=real
NEXT_PUBLIC_LOCAL_VALIDATOR_URL=http://127.0.0.1:9002
NEXT_PUBLIC_ELECTRS_URL=http://127.0.0.1:3004
NEXT_PUBLIC_BITCOIN_NETWORK=signet
```

### UFW Firewall Rules
```
ssh (22/tcp)                    ALLOW       Anywhere
3000/tcp                        ALLOW       Anywhere
9002/tcp                        ALLOW       Anywhere
3002/tcp                        ALLOW       Anywhere
60001/tcp                       ALLOW       Anywhere
38332/tcp                       ALLOW       Anywhere
80/tcp                          ALLOW       Anywhere
443/tcp                         ALLOW       Anywhere
```

## Key Commands

### Service Management
```bash
# Bitcoin Core
sudo systemctl start/stop/restart/status bitcoind

# Electrs
sudo systemctl start/stop/restart/status arch-electrs-signet

# Frontend with PM2
pm2 start/stop/restart/status ovt-frontend
pm2 logs ovt-frontend
```

### Monitoring
```bash
# Check Bitcoin Core status
bitcoin-cli -signet getblockchaininfo

# Check Electrs status
sudo journalctl -u arch-electrs-signet -f

# Check open ports
ss -tulpn | grep -E '3002|9002|60001'

# View frontend logs
pm2 logs ovt-frontend
```

### Network Configuration
```bash
# Check public IP
curl ifconfig.me

# UFW firewall status
sudo ufw status verbose
```

## Advanced Frontend Configuration for Hybrid Mode

### Hybrid Mode Environment
```bash
# Basic hybrid configuration
NEXT_PUBLIC_MOCK_MODE=hybrid
NEXT_PUBLIC_PORTFOLIO_DATA_SOURCE=mock
NEXT_PUBLIC_TRANSACTION_DATA_SOURCE=hybrid
NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE=real
```

### Seeding Local Positions
To set up initial portfolio positions in local storage:

1. Create a mock portfolio data file:
```bash
mkdir -p ~/OTORI-Vision-Frontend/src/mock-data
```

2. Create sample position data:
```bash
cat > ~/OTORI-Vision-Frontend/src/mock-data/portfolio-positions.json << 'EOF'
[
  {
    "name": "Polymorphic Labs",
    "description": "Encryption Layer",
    "value": 150000000,
    "tokenAmount": 500000,
    "pricePerToken": 300,
    "current": 155000000,
    "change": 3.33,
    "transactionId": "position_entry_polymorphic_1741954242330"
  },
  {
    "name": "VoltFi",
    "description": "Bitcoin DeFi Protocol",
    "value": 250000000,
    "tokenAmount": 1000000,
    "pricePerToken": 250,
    "current": 275000000,
    "change": 10.0,
    "transactionId": "position_entry_voltfi_1741954242330"
  },
  {
    "name": "MIXDTape",
    "description": "Music NFT Platform",
    "value": 100000000,
    "tokenAmount": 400000,
    "pricePerToken": 250,
    "current": 95000000,
    "change": -5.0,
    "transactionId": "position_entry_mixdtape_1741954242330"
  },
  {
    "name": "OrdinalHive",
    "value": 294000000,
    "description": "The Bitcoin asset aggregator from OGs for OGs",
    "transactionId": "position_entry_ordinalhive_1740995813211",
    "tokenAmount": 500000,
    "pricePerToken": 420,
    "current": 294000000,
    "change": 0
  }
]
EOF
```

3. Run the seed script:
```bash
cd ~/OTORI-Vision-Frontend && npx ts-node seed-real-positions.ts
```

## Now, let's proceed with securing your application for production use.

# Setting Up Production-Ready Environment with www.otori.one

I'll guide you through the process of setting up a secure production environment using your domain (www.otori.one). We'll set up Nginx as a reverse proxy with SSL/TLS encryption.

### 1. Set Up DNS for www.otori.one

First, point your domain to your public IP address:

1. Log in to your domain registrar (where you registered otori.one)
2. Find DNS settings or name server settings
3. Add/update these records:
   - A record: Point `dapp.otori.one` to your public IP (`91.7.62.224`)
   - A record: Point `www.dapp.otori.one` to your public IP (`91.7.62.224`)

Allow time for DNS propagation (can take 15 minutes to 24 hours).

### 2. Install Nginx as a Reverse Proxy

```bash
# Install Nginx
sudo apt-get update
sudo apt-get install nginx

# Check if Nginx is running
sudo systemctl status nginx

# Start Nginx if not running
sudo systemctl start nginx
```

### 3. Configure Nginx as a Reverse Proxy

Create a configuration file for your site:

```bash
sudo nano /etc/nginx/sites-available/otori
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name otori.one www.otori.one;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/otori /etc/nginx/sites-enabled/
sudo nginx -t  # Test the configuration
sudo systemctl reload nginx
```

### 4. Secure with SSL/TLS using Let's Encrypt

Install Certbot:

```bash
sudo apt-get install certbot python3-certbot-nginx
```

Obtain and install the certificate:

```bash
sudo certbot --nginx -d otori.one -d www.otori.one
```

Follow the prompts. Certbot will automatically update your Nginx configuration to use HTTPS.

### 5. Add HTTP Basic Authentication (Optional)

If you want to add an extra layer of protection:

```bash
# Install the tools
sudo apt-get install apache2-utils

# Create a password file
sudo htpasswd -c /etc/nginx/.htpasswd otori
```

Enter a secure password when prompted.

Then update your Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/otori
```

Add these lines inside the `location /` block:

```nginx
    auth_basic "Restricted Area";
    auth_basic_user_file /etc/nginx/.htpasswd;
```

Test and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Set Up Automatic SSL Renewal

Let's Encrypt certificates expire after 90 days. Set up automatic renewal:

```bash
sudo systemctl status certbot.timer  # Verify the timer is active
```

If not active:

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```



# [DEPRECATED] Plan for Migrating Mock Data to Real Positions on Signet [DEPRECATED] 

I'll create a script that will seed real position data to the OTORI Vision Token program on signet. Here's the approach:

```typescript
// seed-real-positions.ts

import { ArchClient } from '../src/lib/archClient';
import mockPortfolioData from '../src/mock-data/portfolio-positions.json';
import { useLaserEyes } from '@omnisat/lasereyes';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Constants
const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID;
const ARCH_ENDPOINT = process.env.NEXT_PUBLIC_ARCH_ENDPOINT || 'http://localhost:9002';
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '';

// Initialize the Arch client
const archClient = new ArchClient({
  programId: PROGRAM_ID || '',
  treasuryAddress: TREASURY_ADDRESS,
  endpoint: ARCH_ENDPOINT,
});

// Create custom addPosition function
async function addPosition(position) {
  try {
    // The real implementation would need:
    // 1. Create a Bitcoin transaction sending funds to the treasury address
    // 2. Wait for confirmation
    // 3. Call the contract to register the position with the transaction ID
    
    // Since Bitcoin tx creation is complex, you'd likely:
    // - Use a wallet library to create/sign transactions
    // - Wait for confirmation via the Bitcoin RPC
    // - Then call the contract API
    
    console.log(`Adding position: ${position.name}`);
    console.log(`- Value: ${position.value} sats`);
    console.log(`- Tokens: ${position.tokenAmount}`);
    console.log(`- Price per token: ${position.pricePerToken} sats`);
    
    // Create a "real" position entry via the API
    const response = await fetch(`${ARCH_ENDPOINT}/add_position`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        program_id: PROGRAM_ID,
        position_name: position.name,
        value_sats: position.value,
        token_amount: position.tokenAmount,
        price_per_token: position.pricePerToken,
        description: position.description,
        treasury_address: TREASURY_ADDRESS
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Position added successfully: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to add position: ${error.message}`);
    throw error;
  }
}

// Main function to seed positions
async function seedRealPositions() {
  console.log('Starting to seed real positions to signet...');
  console.log(`Using Arch endpoint: ${ARCH_ENDPOINT}`);
  console.log(`Using program ID: ${PROGRAM_ID}`);
  console.log(`Using treasury address: ${TREASURY_ADDRESS}`);
  
  if (!PROGRAM_ID || !TREASURY_ADDRESS) {
    console.error('Missing program ID or treasury address. Please check your .env.local file.');
    return;
  }
  
  try {
    // Create a log file
    const logFile = path.resolve(__dirname, 'seed-real-positions-log.txt');
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    logStream.write(`=== Seeding Real Positions: ${new Date().toISOString()} ===\n`);
    logStream.write(`Arch Endpoint: ${ARCH_ENDPOINT}\n`);
    logStream.write(`Program ID: ${PROGRAM_ID}\n`);
    logStream.write(`Treasury Address: ${TREASURY_ADDRESS}\n\n`);
    
    // Process each position
    for (const position of mockPortfolioData) {
      try {
        logStream.write(`Seeding position: ${position.name}\n`);
        const result = await addPosition(position);
        logStream.write(`  Status: Success - TX: ${result.txid}\n\n`);
      } catch (error) {
        logStream.write(`  Status: Failed - ${error.message}\n\n`);
      }
    }
    
    logStream.write('=== Seeding Complete ===\n\n');
    logStream.end();
    
    console.log(`Seeding log written to: ${logFile}`);
    console.log('Seeding process complete!');
  } catch (error) {
    console.error('Failed to seed real positions:', error);
  }
}

// Run the script
seedRealPositions().catch(console.error);
```

### [DEPRECATED]  Implementation Notes: [DEPRECATED] 

1. **API Endpoints**:
   - The script assumes the validator exposes `/add_position` endpoints
   - You may need to implement these API endpoints in your validator if they don't exist yet

2. **Bitcoin Transactions**:
   - In a full implementation, you would create actual Bitcoin transactions for each position
   - These would send sats to the treasury address and then use the transaction ID for position creation

3. **Error Handling and Logging**:
   - The script includes robust error handling and logging to track progress

### [DEPRECATED]  Next Steps: [DEPRECATED] 

1. Implement the necessary API endpoints in your validator
2. Test with a small position first
3. Run the full script to migrate all mock data

Would you like me to add any additional details or modifications to this approach?

