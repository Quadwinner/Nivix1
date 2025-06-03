#!/bin/bash

# Setup script for the Nivix Bridge Service
# This script will install dependencies and set up the necessary configuration files

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$DIR/.." && pwd )"

echo "Setting up Nivix Bridge Service..."
echo "=================================="

# Install npm dependencies
echo "Installing npm dependencies..."
cd "$ROOT_DIR"
npm install

# Create the wallet directory if it doesn't exist
echo "Setting up wallet directory..."
mkdir -p "$ROOT_DIR/wallet"

# Create the data directory if it doesn't exist
echo "Setting up data directory..."
mkdir -p "$ROOT_DIR/data/transactions"

# Create the config directory if it doesn't exist
echo "Setting up config directory..."
mkdir -p "$ROOT_DIR/config"

# Create a mock IDL file if it doesn't exist (for testing purposes)
if [ ! -f "$ROOT_DIR/config/nivix_protocol.json" ]; then
  echo "Creating mock IDL file for testing..."
  cat > "$ROOT_DIR/config/nivix_protocol.json" << EOL
{
  "version": "0.1.0",
  "name": "nivix_protocol",
  "instructions": [
    {
      "name": "initializePlatform",
      "accounts": [
        {
          "name": "platform",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "platformName",
          "type": "string"
        },
        {
          "name": "adminKey",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "registerUser",
      "accounts": [
        {
          "name": "platform",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "username",
          "type": "string"
        },
        {
          "name": "kycStatus",
          "type": "bool"
        },
        {
          "name": "homeCurrency",
          "type": "string"
        }
      ]
    },
    {
      "name": "processTransfer",
      "accounts": [
        {
          "name": "platform",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fromWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "toWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "fromTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "toTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "transactionRecord",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "sourceCurrency",
          "type": "string"
        },
        {
          "name": "destinationCurrency",
          "type": "string"
        },
        {
          "name": "recipientWalletSeed",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "memo",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Platform",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "totalTransactions",
            "type": "u64"
          },
          {
            "name": "supportedCurrencies",
            "type": "u8"
          },
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "createdAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "User",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "username",
            "type": "string"
          },
          {
            "name": "kycVerified",
            "type": "bool"
          },
          {
            "name": "homeCurrency",
            "type": "string"
          },
          {
            "name": "totalSent",
            "type": "u64"
          },
          {
            "name": "totalReceived",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "isActive",
            "type": "bool"
          }
        ]
      }
    }
  ]
}
EOL
fi

# Copy the fabric-invoke.sh script to /tmp for bridge to access
echo "Setting up Fabric invoke script..."
cp "$ROOT_DIR/fabric-invoke.sh" /tmp/fabric-invoke.sh
chmod +x /tmp/fabric-invoke.sh

# Update package.json with latest dependencies
echo "Updating package.json..."
if ! grep -q "uuid" "$ROOT_DIR/package.json"; then
  npm install --save uuid
fi

echo ""
echo "Setup complete! You can now start the bridge service with:"
echo "  cd $ROOT_DIR"
echo "  npm start"
echo "" 