#!/bin/bash

# Create symbolic links to avoid path issues with spaces
mkdir -p /tmp/fabric-helper
ln -sf "/media/shubham/OS/for linux work/blockchain solana/nivix-project/hyperledger/fabric-samples/test-network" /tmp/fabric-helper/test-network
ln -sf "/media/shubham/OS/for linux work/blockchain solana/nivix-project/hyperledger/fabric-samples/config" /tmp/fabric-helper/config
ln -sf "/media/shubham/OS/for linux work/blockchain solana/nivix-project/hyperledger/fabric-samples/bin" /tmp/fabric-helper/bin

# Function to execute
FUNC=$1
# Arguments as a JSON array string
ARGS=$2
# Type (query or invoke)
TYPE=$3

# Prepare environment
export FABRIC_CFG_PATH="/tmp/fabric-helper/config"
export PATH="/tmp/fabric-helper/bin:$PATH"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="/tmp/fabric-helper/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="/tmp/fabric-helper/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

cd "/tmp/fabric-helper/test-network" || { echo "Failed to change directory"; exit 1; }

echo "Running command in $(pwd)"
echo "Function: $FUNC"
echo "Args: $ARGS"
echo "Type: $TYPE"

# Execute the appropriate command based on the type
if [ "$TYPE" == "query" ]; then
  peer chaincode query -C mychannel -n nivix-kyc -c "{\"function\":\"$FUNC\",\"Args\":$ARGS}"
else
  peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls \
    --cafile "/tmp/fabric-helper/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
    -C mychannel -n nivix-kyc --peerAddresses localhost:7051 \
    --tlsRootCertFiles "/tmp/fabric-helper/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles "/tmp/fabric-helper/test-network/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
    -c "{\"function\":\"$FUNC\",\"Args\":$ARGS}"
fi 