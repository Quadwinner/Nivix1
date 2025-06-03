# Nivix Payment Platform

A hybrid blockchain architecture for cross-border P2P payments combining Solana and Hyperledger Fabric.

## Architecture Overview

- **Solana**: Handles fast payment transactions, liquidity pools, and token management
- **Hyperledger Fabric**: Manages KYC/AML data and compliance in a private manner
- **Bridge Service**: Connects the two blockchains and orchestrates cross-chain operations

## Project Structure

- `/solana`: Contains Solana smart contracts built with Anchor framework
- `/hyperledger`: Contains Hyperledger Fabric chaincode and network configuration
- `/bridge-service`: Contains the bridge service that connects the two blockchains

## Setup Instructions

See the README files in each directory for specific setup instructions.

## KYC Integration with Hyperledger Fabric

Nivix uses Hyperledger Fabric to securely store KYC (Know Your Customer) data. When a user submits KYC information through the frontend:

1. The data is sent to a secure bridge service API
2. The bridge service calls the Hyperledger Fabric chaincode to store the KYC data
3. Sensitive personal information is stored in a private data collection on Hyperledger Fabric
4. Only authorized organizations have access to the private data
5. A reference hash is stored on Solana to verify KYC status without exposing private data

### Running the KYC Integration

To use the KYC integration with real Hyperledger Fabric storage:

1. Start the Hyperledger Fabric network:
   ```bash
   cd hyperledger/fabric-samples/test-network
   ./network.sh up createChannel -c mychannel -ca
   ```

2. Deploy the KYC chaincode:
   ```bash
   ./nivix-project/hyperledger/redeploy-kyc.sh
   ```

3. Start the bridge service:
   ```bash
   cd nivix-project/bridge-service
   ./start-bridge.sh
   ```

4. Start the frontend:
   ```bash
   cd nivix-project/frontend/nivix-pay
   npm start
   ```

### Quick Start

You can also use the all-in-one script to start all services:

```bash
./nivix-project/start-all-services.sh
```

### Verifying KYC Data Storage

To verify that KYC data is being stored in Hyperledger Fabric:

1. Submit KYC data through the frontend
2. Run the KYC test script:
   ```bash
   ./nivix-project/hyperledger/test-all-kyc-functions.sh
   # Nivix Bridge Service

A blockchain bridge service that connects Hyperledger Fabric and Solana networks, enabling cross-chain transactions and KYC verification.

## Features

- Cross-chain transaction processing between Hyperledger Fabric and Solana
- KYC verification and compliance management
- Solana wallet management and balance queries
- Transaction history tracking
- RESTful API for easy integration

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nivix-bridge-service.git
cd nivix-bridge-service
```

2. Install dependencies:
```bash
npm install
```

3. Run the setup script:
```bash
./scripts/setup-bridge.sh
```

## Usage

Start the bridge service:
```bash
npm start
```

To test the bridge functionality:
```bash
node test-bridge.js
```

## API Endpoints

### Health Check
- `GET /health` - Check service status

### KYC Operations
- `POST /api/kyc/submit` - Submit KYC data
- `GET /api/kyc/status/:solanaAddress` - Check KYC status

### Solana Operations
- `GET /api/solana/balance/:address` - Get Solana wallet balance

### Bridge Operations
- `POST /api/bridge/initiate-transfer` - Initiate a cross-chain transaction
- `GET /api/bridge/transaction-status/:id` - Check transaction status
- `GET /api/bridge/wallet-transactions/:address` - Get transaction history for a wallet
- `POST /api/bridge/sync-offline-transaction` - Sync an offline transaction

## License

MIT
