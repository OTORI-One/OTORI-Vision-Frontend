# OTORI Vision Monorepo

This repository contains the full OTORI Vision application, comprising both frontend and backend components.

## Repository Structure

```
OTORI-Vision/
├── frontend/       (Next.js application)
├── backend/        (Express API and scripts)
│   ├── api/        (API services)
│   └── scripts/    (Utility scripts)
├── program/        (Arch Network program)
├── shared/         (Shared utilities and types)
└── docs/           (Documentation)
```

## Development

### Prerequisites

- Node.js 18+
- npm 9+
- Bitcoin Signet setup (for runes functionality)
- Arch Network SDK (for program development)

### Setup

1. Clone the repository

```bash
git clone https://github.com/your-username/OTORI-Vision.git
cd OTORI-Vision
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

### Running the Application

#### Development mode

To run both frontend and backend in development mode:

```bash
npm run dev
```

To run only the frontend:

```bash
npm run frontend:dev
```

To run only the backend:

```bash
npm run backend:dev
```

#### Production mode

Build and start the application:

```bash
npm run build
npm start
```

## Backend Services

The backend includes:

1. **Runes API** - API for managing OTORI Vision Token (OVT) runes
2. **Distribution Scripts** - Scripts for distributing tokens and managing liquidity

## Frontend Application

The frontend is a Next.js application that provides:

1. **Portfolio Management** - View and manage your OVT portfolio
2. **Transaction History** - View transaction history and activity
3. **Analytics** - Token supply, distribution, and other analytics

## Documentation

For more detailed documentation, please refer to the files in the `docs/` directory:

- [LP Wallet Setup](docs/LP_WALLET.md)
- [Rune Integration](docs/RUNE_INTEGRATION.md)
- [Price Movement Algorithm](docs/PRICE_MOVEMENT_ALGORITHM.md)

# OTORI Vision Token (OVT) Frontend

## Overview

The OTORI Vision Token (OVT) frontend is a Next.js application that provides a user interface for interacting with the OVT contract deployed on Arch Network's testnet. The application supports a hybrid mode that combines real contract interactions with predefined mock data for a consistent and engaging experience during the incentive program.

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn or npm
- Access to Arch Network testnet

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd ovt-fund
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Update the `.env.local` file with your configuration (see Configuration section)
5. Start the development server:
   ```bash
   npm run dev
   ```

## Configuration

The application is configured through environment variables in the `.env.local` file:

```env
# Program ID for the deployed contract
NEXT_PUBLIC_PROGRAM_ID=your_program_id_here

# Hybrid Mode Configuration
# Set to 'false' to use only real data, 'true' for mock mode, or 'hybrid' for hybrid mode
NEXT_PUBLIC_MOCK_MODE=hybrid

# Granular toggles for hybrid mode (only used when NEXT_PUBLIC_MOCK_MODE=hybrid)
# Set to 'mock' to use mock data or 'real' to use real contract data
NEXT_PUBLIC_PORTFOLIO_DATA_SOURCE=mock
NEXT_PUBLIC_TRANSACTION_DATA_SOURCE=real
NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE=real

# Arch Network Configuration
NEXT_PUBLIC_ARCH_ENDPOINT=http://localhost:9002
```

## Hybrid Mode

The application supports three modes of operation:

1. **Real Mode** (`NEXT_PUBLIC_MOCK_MODE=false`): Uses only real contract data
2. **Mock Mode** (`NEXT_PUBLIC_MOCK_MODE=true`): Uses only mock data
3. **Hybrid Mode** (`NEXT_PUBLIC_MOCK_MODE=hybrid`): Uses a mix of real and mock data

In hybrid mode, you can configure which aspects of the application use real vs. mock data:

- `NEXT_PUBLIC_PORTFOLIO_DATA_SOURCE`: Controls portfolio position data
- `NEXT_PUBLIC_TRANSACTION_DATA_SOURCE`: Controls transaction history data
- `NEXT_PUBLIC_TOKEN_SUPPLY_DATA_SOURCE`: Controls token supply data

For detailed information about the hybrid mode implementation, see [docs/HYBRID_MODE.md](docs/HYBRID_MODE.md).

## LP Wallet Management

This project includes tools for managing the Liquidity Pool (LP) wallet, which is used for trading simulation.

### LP Wallet Setup

Follow these steps to set up the LP wallet:

1. See [LP Wallet Documentation](./docs/LP_WALLET.md) for detailed setup instructions
2. Configure your LP wallet address in environment variables or update it directly in the configuration files
3. Run distribution scripts to allocate Runes tokens to the LP wallet

### LP Distribution Tools

The following npm scripts are available for managing LP wallet and token distribution:

```bash
# Distribute Runes tokens to the LP wallet
npm run lp-distribute

# Manage PSBTs for LP wallet
npm run lp-manage-psbts

# Show LP wallet setup help
npm run lp-setup-help
```

See [LP Wallet Documentation](./docs/LP_WALLET.md) for detailed usage instructions.

## Scripts

The application includes several scripts for development and testing:

- `npm run dev`: Start the development server
- `npm run build`: Build the application for production
- `npm run start`: Start the production server
- `npm run lint`: Run linting
- `npm run test`: Run tests
- `npm run populate-positions`: Populate mock portfolio positions
- `npm run mint-ovt`: Create mock OVT token data
- `npm run seed-contract`: Seed the deployed contract with initial data

## Project Structure

```
ovt-fund/
├── docs/                  # Documentation
│   └── HYBRID_MODE.md     # Hybrid mode documentation
├── public/                # Static assets
├── scripts/               # Utility scripts
│   ├── mint-initial-ovt.ts        # Script to mint initial OVT tokens
│   ├── populate-initial-positions.ts  # Script to populate portfolio positions
│   └── seed-contract-data.ts      # Script to seed the contract with initial data
├── src/
│   ├── components/        # React components
│   │   └── DataSourceIndicator.tsx  # Component to show data source
│   ├── hooks/             # React hooks
│   │   └── useOVTClient.ts  # Main client hook
│   ├── lib/               # Utility libraries
│   │   ├── archClient.ts    # Client for Arch Network
│   │   └── hybridModeUtils.ts  # Utilities for hybrid mode
│   ├── mock-data/         # Mock data for development
│   │   ├── portfolio-positions.json  # Mock portfolio positions
│   │   └── token-data.json  # Mock token data
│   └── pages/             # Next.js pages
├── .env.example           # Example environment variables
├── .env.local             # Local environment variables (not in repo)
└── package.json           # Project dependencies and scripts
```

## Development Guidelines

- Follow TypeScript best practices
- Use React hooks for state management
- Use Tailwind CSS for styling
- Write tests for new features
- Document code with JSDoc comments

## Deployment

To deploy the application:

1. Build the application:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm run start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Testing

### Unit Tests

Run unit tests with mock data:

```bash
npm run test:unit
```

These tests use mock implementations of the RuneClient and other dependencies to ensure fast, reliable testing without external dependencies.

### Integration Tests

Run integration tests with real backend (requires OrdPi to be running):

```bash
npm run test:integration
```

These tests connect to the actual OrdPi backend when available to validate real integrations. If the OrdPi is not available, they will still run but in mock mode.

### All Tests

Run both unit and integration tests:

```bash
npm run test:all
``` 