#!/bin/bash

# Exit on first error
set -e

# Get absolute path to the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define the absolute path to the chaincode
CC_SRC_PATH="${SCRIPT_DIR}/chaincode/nivix-kyc"
echo "Chaincode path: ${CC_SRC_PATH}"

# Define peer commands
export FABRIC_CFG_PATH="${SCRIPT_DIR}/fabric-samples/config"
export PATH="${SCRIPT_DIR}/fabric-samples/bin:$PATH"

# Change to the test-network directory
cd "${SCRIPT_DIR}/fabric-samples/test-network"

# Set environment variables for Org1
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Create a chaincode package
echo "Creating chaincode package..."
peer lifecycle chaincode package nivix-kyc.tar.gz --path ${CC_SRC_PATH} --lang golang --label nivix-kyc_1.0

# Install chaincode on peer0.org1
echo "Installing chaincode on peer0.org1..."
peer lifecycle chaincode install nivix-kyc.tar.gz

# Install chaincode on peer0.org2
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

echo "Installing chaincode on peer0.org2..."
peer lifecycle chaincode install nivix-kyc.tar.gz

# Find the package ID
echo "Finding package ID..."
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep nivix-kyc_1.0 | awk -F 'Package ID: ' '{print $2}' | awk -F ',' '{print $1}')
echo "Package ID: ${PACKAGE_ID}"

# Approve chaincode for org1
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

echo "Approving chaincode for org1..."
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name nivix-kyc --version 1.0 --package-id ${PACKAGE_ID} --sequence 1 --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --collections-config ${CC_SRC_PATH}/collections_config.json

# Approve chaincode for org2
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

echo "Approving chaincode for org2..."
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name nivix-kyc --version 1.0 --package-id ${PACKAGE_ID} --sequence 1 --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --collections-config ${CC_SRC_PATH}/collections_config.json

# Check if chaincode is ready to be committed
echo "Checking commit readiness..."
peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name nivix-kyc --version 1.0 --sequence 1 --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --output json --collections-config ${CC_SRC_PATH}/collections_config.json

# Commit the chaincode
echo "Committing chaincode..."
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name nivix-kyc --version 1.0 --sequence 1 --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt --collections-config ${CC_SRC_PATH}/collections_config.json

echo "Chaincode deployed successfully!"

# Test the chaincode
echo "Testing the chaincode..."
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n nivix-kyc --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"InitLedger","Args":[]}'

echo "Nivix KYC chaincode is ready to use!" 