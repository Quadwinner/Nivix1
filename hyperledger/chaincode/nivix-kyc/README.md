# Nivix KYC Chaincode

This is the Hyperledger Fabric chaincode for Nivix's KYC and compliance management system. It handles user verification data, compliance records, and transaction validation for the Nivix cross-border payment platform.

## Features

- KYC record management with public and private data separation
- Compliance record storage in private data collections
- Transaction validation based on KYC status and risk score
- Query capabilities for KYC records by country

## Private Data Collections

The chaincode uses two private data collections:

1. `kycPrivateData`: Stores sensitive user identification information
2. `complianceRecords`: Stores transaction validation and compliance audit records

## Deployment Instructions

### 1. Package the Chaincode

```bash
cd /media/shubham/OS/for\ linux\ work/blockchain\ solana/nivix-project/hyperledger/fabric-samples/test-network
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/

peer lifecycle chaincode package nivix-kyc.tar.gz --path /media/shubham/OS/for\ linux\ work/blockchain\ solana/nivix-project/hyperledger/chaincode/nivix-kyc --lang golang --label nivix-kyc_1.0
```

### 2. Install the Chaincode on Org1

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode install nivix-kyc.tar.gz
```

### 3. Install the Chaincode on Org2

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer lifecycle chaincode install nivix-kyc.tar.gz
```

### 4. Approve the Chaincode Definition for Org1

```bash
# Set back to Org1
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Query the installed chaincode to get the package ID
peer lifecycle chaincode queryinstalled

# Use the package ID from the output in the next command
export CC_PACKAGE_ID=<package_id_from_output>

# Approve for Org1
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" --channelID mychannel --name nivix-kyc --version 1.0 --package-id $CC_PACKAGE_ID --sequence 2 --collections-config /media/shubham/OS/for\ linux\ work/blockchain\ solana/nivix-project/hyperledger/chaincode/nivix-kyc/collections_config.json
```

### 5. Approve the Chaincode Definition for Org2

```bash
# Switch to Org2
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

# Approve for Org2
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" --channelID mychannel --name nivix-kyc --version 1.0 --package-id $CC_PACKAGE_ID --sequence 2 --collections-config /media/shubham/OS/for\ linux\ work/blockchain\ solana/nivix-project/hyperledger/chaincode/nivix-kyc/collections_config.json
```

### 6. Commit the Chaincode Definition

```bash
# Switch back to Org1
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Commit the definition
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" --channelID mychannel --name nivix-kyc --version 1.0 --sequence 2 --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" --collections-config /media/shubham/OS/for\ linux\ work/blockchain\ solana/nivix-project/hyperledger/chaincode/nivix-kyc/collections_config.json
```

### 7. Initialize the Ledger

```bash
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n nivix-kyc --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"InitLedger","Args":[]}'
```

## Usage Examples

### Store KYC Data

```bash
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n nivix-kyc --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"StoreKYC","Args":["user123", "8xj5hKLmrDVXA9VQxwiBrdS9GYmYLJ2GkQrZ7K1i9VJE", "John Doe", "true", "2025-05-17T12:00:00Z", "50", "US"]}'
```

### Get KYC Status

```bash
peer chaincode query -C mychannel -n nivix-kyc -c '{"function":"GetKYCStatus","Args":["8xj5hKLmrDVXA9VQxwiBrdS9GYmYLJ2GkQrZ7K1i9VJE"]}'
```

### Update KYC Status

```bash
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n nivix-kyc --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"UpdateKYCStatus","Args":["user123", "8xj5hKLmrDVXA9VQxwiBrdS9GYmYLJ2GkQrZ7K1i9VJE", "false", "Suspicious activity detected"]}'
```

### Validate a Transaction

```bash
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n nivix-kyc --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"ValidateTransaction","Args":["8xj5hKLmrDVXA9VQxwiBrdS9GYmYLJ2GkQrZ7K1i9VJE", "{\"transactionId\":\"tx123\",\"amount\":500,\"currency\":\"USD\",\"destination\":\"UK\"}"]}'
```

### Query KYC Records by Country

```bash
peer chaincode query -C mychannel -n nivix-kyc -c '{"function":"QueryKYCByCountry","Args":["US"]}'
``` 