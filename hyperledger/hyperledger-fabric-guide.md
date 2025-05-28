# Hyperledger Fabric Setup and Usage Guide for Nivix Project

This guide provides step-by-step instructions for setting up, deploying, and interacting with the Hyperledger Fabric blockchain for the Nivix project's KYC and compliance management system.

## Prerequisites

- Hyperledger Fabric binaries installed
- Docker and Docker Compose installed
- Go programming language installed

## 1. Starting the Hyperledger Fabric Network

Navigate to the test-network directory:

```bash
cd /media/shubham/OS/for\ linux\ work/blockchain\ solana/nivix-project/hyperledger/fabric-samples/test-network
```

Start the network with a new channel named "mychannel":

```bash
./network.sh up createChannel -c mychannel -ca
```

This command:
- Starts the Docker containers for Fabric's core components
- Creates two organizations (Org1 and Org2)
- Creates a channel named "mychannel"
- Joins both organizations to the channel

## 2. Packaging the Chaincode

First, set up the required environment variables:

```bash
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
```

Package the chaincode:

```bash
peer lifecycle chaincode package nivix-kyc.tar.gz --path /media/shubham/OS/for\ linux\ work/blockchain\ solana/nivix-project/hyperledger/chaincode/nivix-kyc --lang golang --label nivix-kyc_1.0
```

This creates a package file named `nivix-kyc.tar.gz` containing the chaincode.

## 3. Installing the Chaincode on Peers

### Install on Org1's Peer

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode install nivix-kyc.tar.gz
```

### Install on Org2's Peer

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer lifecycle chaincode install nivix-kyc.tar.gz
```

## 4. Getting the Package ID

After installation, you need to get the package ID:

```bash
peer lifecycle chaincode queryinstalled
```

You'll see output like:
```
Installed chaincodes on peer:
Package ID: nivix-kyc_1.0:f270d16e87317ad8b789b7bc9f3096ac479dcf3b5f8683a974acfc2aa3e9ceb2, Label: nivix-kyc_1.0
```

Note the package ID (you'll need it in the next step).

## 5. Approving the Chaincode for Organizations

### Approve for Org1

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name nivix-kyc --version 1.0 --package-id nivix-kyc_1.0:f270d16e87317ad8b789b7bc9f3096ac479dcf3b5f8683a974acfc2aa3e9ceb2 --sequence 1 --collections-config /media/shubham/OS/for\ linux\ work/blockchain\ solana/nivix-project/hyperledger/chaincode/nivix-kyc/collections_config.json
```

### Approve for Org2

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name nivix-kyc --version 1.0 --package-id nivix-kyc_1.0:f270d16e87317ad8b789b7bc9f3096ac479dcf3b5f8683a974acfc2aa3e9ceb2 --sequence 1 --collections-config /media/shubham/OS/for\ linux\ work/blockchain\ solana/nivix-project/hyperledger/chaincode/nivix-kyc/collections_config.json
```

## 6. Committing the Chaincode to the Channel

```bash
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name nivix-kyc --version 1.0 --sequence 1 --collections-config /media/shubham/OS/for\ linux\ work/blockchain\ solana/nivix-project/hyperledger/chaincode/nivix-kyc/collections_config.json --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
```

## 7. Interacting with the Chaincode

### Initialize the Ledger (Optional)

If your chaincode has an `InitLedger` function:

```bash
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n nivix-kyc --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"InitLedger","Args":[]}'
```

### Store KYC Data

```bash
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" -C mychannel -n nivix-kyc --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -c '{"function":"StoreKYC","Args":["user123", "8xj5hKLmrDVXA9VQxwiBrdS9GYmYLJ2GkQrZ7K1i9VJE", "John Doe", "true", "2025-05-22T12:00:00Z", "50", "US"]}'
```

### Query KYC Status

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

## 8. Monitoring the Network

### Check Docker Containers

```bash
docker ps
```

### View Container Logs

```bash
docker logs peer0.org1.example.com
```

### View Chaincode Logs

```bash
docker logs <chaincode-container-id>
```

## 9. Troubleshooting

### Common Issues

1. **Package ID Mismatch**: Ensure you're using the exact package ID from the `queryinstalled` command.

2. **Path Issues**: When working with paths that contain spaces, always escape them with backslashes.

3. **Collection Config Issues**: Ensure the collections_config.json file exists and is properly formatted.

4. **Network Issues**: If the network is not responding, try restarting it:
   ```bash
   ./network.sh down
   ./network.sh up createChannel -c mychannel -ca
   ```

5. **Chaincode Errors**: Check the chaincode logs for specific error messages.

## 10. Shutting Down the Network

When finished, you can shut down the network:

```bash
./network.sh down
```

This will stop and remove all Docker containers associated with the Fabric network.

## 11. Redeploying After Changes

If you make changes to the chaincode, you'll need to:
1. Package it with a new version or sequence number
2. Install on all peers
3. Approve for both organizations
4. Commit to the channel

## Additional Resources

- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)
- [Fabric Samples Repository](https://github.com/hyperledger/fabric-samples)
- [Chaincode for Developers](https://hyperledger-fabric.readthedocs.io/en/release-2.2/chaincode4ade.html) 