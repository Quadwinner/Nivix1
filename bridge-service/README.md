# Nivix Bridge Service

A Node.js bridge service that connects the Nivix frontend with Hyperledger Fabric for KYC data storage.

## Overview

The Nivix Bridge Service acts as a middleware layer between the React frontend and the Hyperledger Fabric blockchain network. It provides RESTful API endpoints for:

- Submitting KYC data to Hyperledger Fabric
- Querying KYC status from Hyperledger Fabric
- Validating transactions against KYC records

## Prerequisites

- Node.js 14+
- Running Hyperledger Fabric network (test-network)
- Deployed Nivix KYC chaincode on the network

## Setup

1. Make sure the Hyperledger Fabric test network is running:
   ```bash
   cd ../hyperledger/fabric-samples/test-network
   ./network.sh up createChannel -c mychannel -ca
   ```

2. Deploy the Nivix KYC chaincode:
   ```bash
   cd ../../..
   ./nivix-project/hyperledger/redeploy-kyc.sh
   ```

3. Install dependencies:
   ```bash
   cd nivix-project/bridge-service
   npm install
   ```

4. Enroll the admin user:
   ```bash
   npm run enroll
   ```

## Starting the Service

You can start the bridge service using:

```bash
./start-bridge.sh
```

Or manually:

```bash
npm start
```

The service will run on http://localhost:3001 by default.

## API Endpoints

### Submit KYC Data

Submits KYC data to Hyperledger Fabric.

- **URL**: `/api/kyc/submit`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "userId": "user_123",
    "solanaAddress": "8xj5hKLmrDVXA9VQxwiBrdS9GYmYLJ2GkQrZ7K1i9VJE",
    "fullName": "John Doe",
    "countryCode": "US",
    "idDocuments": [
      {
        "type": "passport",
        "number": "123456789",
        "expiryDate": "2030-01-01"
      }
    ],
    "address": {
      "street": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "zipCode": "12345",
      "country": "US"
    },
    "contactInfo": {
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "consentGiven": true
  }
  ```

- **Response**:
  ```json
  {
    "success": true,
    "verification_id": "kyc_user_123",
    "status": "pending",
    "message": "KYC data successfully submitted to Hyperledger Fabric private data collection"
  }
  ```

### Get KYC Status

Gets the KYC status for a Solana address.

- **URL**: `/api/kyc/status/:solanaAddress`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "verified": false,
    "userId": "user_123",
    "status": "pending",
    "countryCode": "US"
  }
  ```

## Testing

You can test the bridge service using the built-in test scripts in the Hyperledger directory:

```bash
cd ../hyperledger
./test-all-kyc-functions.sh
``` 