#!/bin/bash

# Change to the bridge service directory
cd "$(dirname "$0")"

# Check if Hyperledger Fabric is running
echo "Checking if Hyperledger Fabric is running..."
FABRIC_RUNNING=$(docker ps | grep "hyperledger/fabric-peer" | wc -l)

if [ $FABRIC_RUNNING -eq 0 ]; then
  echo "Hyperledger Fabric is not running. Please start the Fabric network first."
  echo "Run: cd ../hyperledger/fabric-samples/test-network && ./network.sh up createChannel -c mychannel -ca"
  exit 1
fi

# Setup the fabric-invoke.sh script for the bridge service
echo "Setting up fabric-invoke.sh for blockchain interactions..."
cp fabric-invoke.sh /tmp/fabric-invoke.sh
chmod +x /tmp/fabric-invoke.sh

# Create necessary directories and symbolic links for fabric-invoke.sh
mkdir -p /tmp/fabric-helper
ln -sf "/media/shubham/OS/for linux work/blockchain solana/nivix-project/hyperledger/fabric-samples/test-network" /tmp/fabric-helper/test-network
ln -sf "/media/shubham/OS/for linux work/blockchain solana/nivix-project/hyperledger/fabric-samples/config" /tmp/fabric-helper/config
ln -sf "/media/shubham/OS/for linux work/blockchain solana/nivix-project/hyperledger/fabric-samples/bin" /tmp/fabric-helper/bin

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Create wallet directory if it doesn't exist
mkdir -p wallet

# Enroll admin if not already enrolled
if [ ! -f "wallet/admin.id" ]; then
  echo "Enrolling admin user..."
  node src/enrollAdmin.js
fi

# Start the bridge service
echo "Starting Nivix Bridge Service..."
npm start 