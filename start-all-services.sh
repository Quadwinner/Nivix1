#!/bin/bash

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if Hyperledger Fabric is running
echo "Checking if Hyperledger Fabric is running..."
FABRIC_RUNNING=$(docker ps | grep "hyperledger/fabric-peer" | wc -l)

if [ $FABRIC_RUNNING -eq 0 ]; then
  echo "⚠️ Hyperledger Fabric is not running."
  echo "Would you like to start it? (y/n)"
  read -r START_FABRIC
  
  if [[ $START_FABRIC == "y" || $START_FABRIC == "Y" ]]; then
    echo "Starting Hyperledger Fabric..."
    cd "$DIR/hyperledger/fabric-samples/test-network"
    ./network.sh up createChannel -c mychannel -ca
    
    echo "Deploying Nivix KYC chaincode..."
    cd "$DIR"
    ./hyperledger/redeploy-kyc.sh
  else
    echo "⚠️ Hyperledger Fabric will not be started. KYC data will be mocked."
  fi
fi

# Start bridge service in the background
echo "Starting Nivix Bridge Service..."
cd "$DIR/bridge-service"
# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing bridge service dependencies..."
  npm install
fi
# Run in background and save PID
npm start &
BRIDGE_PID=$!
echo "Bridge service started with PID: $BRIDGE_PID"

# Start frontend
echo "Starting Nivix frontend..."
cd "$DIR/frontend/nivix-pay"
npm start

# When frontend is stopped, also stop the bridge service
echo "Shutting down bridge service (PID: $BRIDGE_PID)..."
kill $BRIDGE_PID 