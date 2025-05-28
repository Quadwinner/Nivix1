#!/bin/bash

set -e

# Define paths with proper quoting
WORKSPACE_PATH="/media/shubham/OS/for linux work/blockchain solana"
CHAINCODE_SRC_PATH="${WORKSPACE_PATH}/nivix-project/hyperledger/chaincode/nivix-kyc"
TEST_NETWORK_PATH="${WORKSPACE_PATH}/nivix-project/hyperledger/fabric-samples/test-network"

echo "Starting KYC chaincode redeployment..."

# Navigate to the test network directory
cd "${TEST_NETWORK_PATH}"

# Set environment variables
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/

# Copy collections_config.json to test-network directory to avoid path issues
cp "${CHAINCODE_SRC_PATH}/collections_config.json" "${TEST_NETWORK_PATH}/collections_config.json"

# Package the chaincode
echo "Packaging chaincode..."
peer lifecycle chaincode package nivix-kyc.tar.gz --path "${CHAINCODE_SRC_PATH}" --lang golang --label nivix-kyc_1.0

# Install on Org1
echo "Installing chaincode on Org1..."
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode install nivix-kyc.tar.gz

# Get the package ID
echo "Querying installed chaincode..."
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep -o "nivix-kyc_1.0:[a-z0-9]*" | head -1)

if [ -z "$PACKAGE_ID" ]; then
  echo "Failed to get package ID. Please check the installation and try again."
  exit 1
fi

echo "Package ID: $PACKAGE_ID"

# Install on Org2
echo "Installing chaincode on Org2..."
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp"
export CORE_PEER_ADDRESS=localhost:9051

peer lifecycle chaincode install nivix-kyc.tar.gz

# Approve for Org1
echo "Approving chaincode for Org1..."
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode approveformyorg -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --channelID mychannel \
  --name nivix-kyc \
  --version 1.0 \
  --package-id $PACKAGE_ID \
  --sequence 1 \
  --collections-config "${PWD}/collections_config.json"

# Approve for Org2
echo "Approving chaincode for Org2..."
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp"
export CORE_PEER_ADDRESS=localhost:9051

peer lifecycle chaincode approveformyorg -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --channelID mychannel \
  --name nivix-kyc \
  --version 1.0 \
  --package-id $PACKAGE_ID \
  --sequence 1 \
  --collections-config "${PWD}/collections_config.json"

# Commit the chaincode definition
echo "Committing chaincode definition..."
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

peer lifecycle chaincode commit -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  --channelID mychannel \
  --name nivix-kyc \
  --version 1.0 \
  --sequence 1 \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
  --collections-config "${PWD}/collections_config.json"

echo "Initializing the ledger..."
peer chaincode invoke -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  -C mychannel \
  -n nivix-kyc \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
  -c '{"function":"InitLedger","Args":[]}'

echo "Chaincode redeployment completed successfully!" 