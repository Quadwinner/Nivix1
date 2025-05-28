#!/bin/bash

# This script helps invoke chaincode functions directly from the bridge service
# It works around issues with spaces in path names

NETWORK_DIR=/media/shubham/OS/for\ linux\ work/blockchain\ solana/nivix-project/hyperledger/fabric-samples/test-network
CONFIG_DIR=/media/shubham/OS/for\ linux\ work/blockchain\ solana/nivix-project/hyperledger/fabric-samples/config
BIN_DIR=/media/shubham/OS/for\ linux\ work/blockchain\ solana/nivix-project/hyperledger/fabric-samples/bin

# Function to execute
FUNC=$1
# Arguments as a JSON array string
ARGS=$2
# Type (query or invoke)
TYPE=$3

# Prepare environment
export FABRIC_CFG_PATH="$CONFIG_DIR"
export PATH="$BIN_DIR:$PATH"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK_DIR/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$NETWORK_DIR/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

cd "$NETWORK_DIR" || { echo "Failed to change directory"; exit 1; }

# Execute the appropriate command based on the type
if [ "$TYPE" == "query" ]; then
  peer chaincode query -C mychannel -n nivix-kyc -c "{\"function\":\"$FUNC\",\"Args\":$ARGS}"
else
  peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls \
    --cafile "$NETWORK_DIR/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
    -C mychannel -n nivix-kyc --peerAddresses localhost:7051 \
    --tlsRootCertFiles "$NETWORK_DIR/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles "$NETWORK_DIR/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
    -c "{\"function\":\"$FUNC\",\"Args\":$ARGS}"
fi 