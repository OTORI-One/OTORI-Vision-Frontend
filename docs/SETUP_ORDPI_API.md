# OrdPi Runes API Setup Guide

This guide explains how to set up the OTORI Vision Runes API server on your OrdPi to enable LP wallet functionality.

## Prerequisites

- OrdPi (Raspberry Pi with Bitcoin Core and Ord installed)
- Node.js installed
- Bitcoin Core running on signet
- Ord installed and configured

## Setup Steps

### 1. Install Required Dependencies

First, ensure you have the necessary Node.js dependencies installed:

```bash
cd ~/OTORI-Vision-Frontend
npm install express axios fs path child_process --legacy-peer-deps
npm install -g pm2
```

### 2. Configure the Runes API

The Runes API uses environment variables from `.env.local` for configuration:

```
NEXT_PUBLIC_TREASURY_ADDRESS=tb1pglzcv7mg4xdy8nd2cdulsqgxc5yf35fxu5yvz27cf5gl6wcs4ktspjmytd
NEXT_PUBLIC_LP_ADDRESS=tb1p3vn6wc0dlud3tvckv95datu3stq4qycz7vj9mzpclfkrv9rh8jqsjrw38f
NEXT_PUBLIC_OVT_RUNE_ID=240249:101
```

Verify these settings in your `.env.local` file.

### 3. Start the Runes API Server

Start the Runes API server using PM2 to ensure it stays running:

```bash
cd ~/OTORI-Vision-Frontend
pm2 start scripts/runes_API.js --name "runes-api"
```

Verify the API is running:

```bash
# Check PM2 status
pm2 status

# Test the API
curl http://localhost:3030/health
curl http://localhost:3030/rune/240249:101/balances
```

### 4. Install the Test Script

Copy the test script to your OrdPi to validate all API endpoints:

```bash
cd ~/OTORI-Vision-Frontend
npm install node-fetch
```

Create the test file at `scripts/test_runes_api.js` and make it executable:

```bash
chmod +x scripts/test_runes_api.js
```

Run the test:

```bash
cd ~/OTORI-Vision-Frontend
node scripts/test_runes_api.js
```

### 5. Configure for Remote Access (Optional)

If you want to access the Runes API from another machine, set up an SSH tunnel:

```bash
# On your local machine
ssh -L 9001:localhost:3030 BTCPi@OrdberryPi -p 2211
```

Then update your local `.env.local` to use:

```
ORDPI_API_URL=http://127.0.0.1:9001
```

## Using the LP Wallet

Once the API is set up, you can:

1. **Check LP Wallet Status:**
   ```bash
   curl http://localhost:3030/rune/240249:101/lp-info
   ```

2. **Initial Distribution:**
   Use the `distribute-to-lp.sh` script for the initial transfer:
   ```bash
   cd ~/OTORI-Vision-Frontend
   ./scripts/distribute-to-lp.sh --amount=210000 --no-dry-run
   ```

3. **Prepare Trading PSBTs:**
   ```bash
   node scripts/distribute_lp_runes.js
   ```

4. **Process PSBTs:**
   ```bash
   node scripts/manage_lp_psbts.js
   ```

## API Endpoints

The Runes API provides the following endpoints:

- `GET /` - API documentation
- `GET /health` - System health check
- `GET /rune/:id` - Get rune information
- `GET /rune/:id/balances` - Get rune balances
- `GET /rune/:id/distribution` - Get distribution statistics
- `GET /rune/:id/lp-info` - Get LP wallet information
- `POST /rune/prepare-lp-distribution` - Prepare PSBTs for distribution

For detailed API documentation, visit [http://localhost:3030/](http://localhost:3030/) in your browser.

## Troubleshooting

- **API not responding:** Check if the server is running with `pm2 status`
- **Command errors:** Verify ord and Bitcoin Core are running correctly
- **Balance issues:** Ensure your wallet is properly configured in the ord config
- **Remote access problems:** Check SSH tunnel and port forwarding settings

## Next Steps

After setting up the Runes API, proceed with LP wallet setup and distribution as outlined in the project documentation. 