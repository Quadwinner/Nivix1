# Nivix KYC System on Hyperledger Fabric

This repository contains the implementation of the KYC (Know Your Customer) system for the Nivix payment platform using Hyperledger Fabric.

## Overview

The Nivix KYC system provides a secure and compliant way to manage customer identity verification on the blockchain. It supports:

- Storing KYC records with both public and private data
- Querying KYC status by Solana address
- Updating KYC verification status
- Validating transactions based on KYC status
- Querying KYC records by country

## Prerequisites

- Hyperledger Fabric v2.2+
- Go 1.14+
- Node.js 12+
- Docker and Docker Compose

## Directory Structure

```
nivix-project/hyperledger/
├── chaincode/
│   └── nivix-kyc/
│       ├── nivix-kyc.go        # KYC chaincode implementation
│       └── collections_config.json  # Private data collection configuration
├── fabric-samples/             # Hyperledger Fabric test network
├── redeploy-kyc.sh             # Script to redeploy KYC chaincode
├── deploy-simple-test.sh       # Simple test script for basic functions
├── test-all-kyc-functions.sh   # Comprehensive test script for all KYC functions
└── README.md                   # This file
```

## Setup Instructions

1. Start the Hyperledger Fabric test network:

```bash
cd nivix-project/hyperledger/fabric-samples/test-network
./network.sh up createChannel -c mychannel -ca
```

2. Deploy the KYC chaincode:

```bash
cd /media/shubham/OS/for\ linux\ work/blockchain\ solana
./nivix-project/hyperledger/redeploy-kyc.sh
```

## Data Model

The KYC system uses the following data structures:

### KYCRecord

```go
type KYCRecord struct {
    UserID           string `json:"userId"`
    SolanaAddress    string `json:"solanaAddress"`
    FullName         string `json:"fullName"`
    KYCVerified      bool   `json:"kycVerified"`
    VerificationDate string `json:"verificationDate"`
    RiskScore        int    `json:"riskScore"`
    CountryCode      string `json:"countryCode"`
}
```

### ComplianceRecord

```go
type ComplianceRecord struct {
    UserID      string `json:"userId"`
    Action      string `json:"action"`
    Description string `json:"description"`
    Timestamp   string `json:"timestamp"`
}
```

### TransactionValidation

```go
type TransactionValidation struct {
    TransactionID string  `json:"transactionId"`
    Amount        float64 `json:"amount"`
    Currency      string  `json:"currency"`
    Destination   string  `json:"destination"`
}
```

## Solana Integration

The KYC system is designed to integrate with the Solana blockchain through:

1. **Solana Address Mapping**: Each KYC record is indexed by a Solana wallet address, allowing for quick verification of Solana transactions.

2. **Bridge Service**: The Nivix bridge service connects the Hyperledger KYC system with the Solana payment protocol, enabling:
   - Real-time KYC verification for Solana transactions
   - Compliance checks before transaction execution
   - Risk-based transaction limits

3. **Cross-Chain Verification**: Transactions on Solana can be validated against KYC records stored on Hyperledger Fabric.

## Private Data Collections

The KYC chaincode uses two private data collections defined in `collections_config.json`:

1. **kycPrivateData** - Stores sensitive KYC information
   - Contains full user details including name and verification date
   - Accessible only to member organizations

2. **complianceRecords** - Stores compliance-related events
   - Contains records of KYC updates and transaction validations
   - Used for audit and compliance purposes

```json
[
  {
    "name": "kycPrivateData",
    "policy": "OR('Org1MSP.member', 'Org2MSP.member')",
    "requiredPeerCount": 0,
    "maxPeerCount": 3,
    "blockToLive": 0,
    "memberOnlyRead": true,
    "memberOnlyWrite": false
  },
  {
    "name": "complianceRecords",
    "policy": "OR('Org1MSP.member', 'Org2MSP.member')",
    "requiredPeerCount": 0,
    "maxPeerCount": 3,
    "blockToLive": 0,
    "memberOnlyRead": true,
    "memberOnlyWrite": false
  }
]
```

## Available Functions

The KYC chaincode provides the following functions:

1. **StoreKYC** - Store a new KYC record
   ```
   Args: [userId, solanaAddress, fullName, kycVerified, verificationDate, riskScore, countryCode]
   ```

2. **GetKYCStatus** - Get KYC status for a Solana address
   ```
   Args: [solanaAddress]
   ```

3. **UpdateKYCStatus** - Update KYC verification status
   ```
   Args: [userId, solanaAddress, kycVerified, reason]
   ```

4. **ValidateTransaction** - Validate if a transaction is allowed based on KYC
   ```
   Args: [solanaAddress, transactionDataJSON]
   ```

5. **QueryKYCByCountry** - Query all KYC records for a specific country
   ```
   Args: [countryCode]
   ```

## Testing

### Simple Test

Run a simple test to verify basic KYC functionality:

```bash
cd /media/shubham/OS/for\ linux\ work/blockchain\ solana
./nivix-project/hyperledger/deploy-simple-test.sh
```

### Comprehensive Test

Test all KYC functions:

```bash
cd /media/shubham/OS/for\ linux\ work/blockchain\ solana
./nivix-project/hyperledger/test-all-kyc-functions.sh
```

## Example Commands

### Store KYC Record

```bash
peer chaincode invoke -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  -C mychannel \
  -n nivix-kyc \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
  -c '{"function":"StoreKYC","Args":["user123", "8xj5hKLmrDVXA9VQxwiBrdS9GYmYLJ2GkQrZ7K1i9VJE", "John Doe", "true", "2025-05-17T12:00:00Z", "30", "US"]}'
```

### Get KYC Status

```bash
peer chaincode query -C mychannel \
  -n nivix-kyc \
  -c '{"function":"GetKYCStatus","Args":["8xj5hKLmrDVXA9VQxwiBrdS9GYmYLJ2GkQrZ7K1i9VJE"]}'
```

### Update KYC Status

```bash
peer chaincode invoke -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  -C mychannel \
  -n nivix-kyc \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
  -c '{"function":"UpdateKYCStatus","Args":["user123", "8xj5hKLmrDVXA9VQxwiBrdS9GYmYLJ2GkQrZ7K1i9VJE", "false", "Test update for compliance check"]}'
```

### Validate Transaction

```bash
peer chaincode invoke -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  -C mychannel \
  -n nivix-kyc \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
  -c '{"function":"ValidateTransaction","Args":["8xj5hKLmrDVXA9VQxwiBrdS9GYmYLJ2GkQrZ7K1i9VJE", "{\"transactionId\":\"tx123\",\"amount\":500,\"currency\":\"USD\",\"destination\":\"UK\"}"]}'
```

### Query KYC By Country

```bash
peer chaincode query -C mychannel \
  -n nivix-kyc \
  -c '{"function":"QueryKYCByCountry","Args":["US"]}'
```

## Troubleshooting

If you encounter issues with the private data collections, ensure:

1. The collections_config.json file is properly formatted and accessible
2. The collection names in the chaincode match those in collections_config.json
3. The chaincode was deployed with the correct collections configuration

For path issues with spaces in file paths, use proper quoting in scripts and commands.

## Recent Fixes

- Fixed QueryKYCByCountry function to use GetStateByRange instead of GetQueryResult for LevelDB compatibility
- Created properly quoted scripts to handle paths with spaces
- Created a comprehensive test script that successfully tests all KYC functions
- Fixed collection name consistency between chaincode and configuration 