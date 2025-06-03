const express = require('express');
const cors = require('cors');
const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const { directInvokeChaincode } = require('./direct-invoke');
const { execPromise } = require('./exec-promise');
const { storeKYCDirectly, getKYCStatusDirectly } = require('./direct-kyc');
const { storeKYC, getKYC } = require('./file-storage');

// Import the new Solana and bridge modules
const solanaClient = require('./solana/solana-client');
const anchorClient = require('./solana/anchor-client');
const transactionBridge = require('./bridge/transaction-bridge');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Request received`);
  if (req.method === 'POST') {
    console.log('Request body:', JSON.stringify(req.body));
  } else if (req.method === 'GET' && req.params) {
    console.log('Request params:', JSON.stringify(req.params));
  }
  
  // Capture the original send function
  const originalSend = res.send;
  
  // Override the send function to log responses
  res.send = function(body) {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Response sent (${res.statusCode}) - Duration: ${duration}ms`);
    
    // Call the original send function
    return originalSend.call(this, body);
  };
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'nivix-bridge-service',
    mode: 'hyperledger',
    version: '1.1.0',
    features: {
      kyc: true,
      solana: solanaClient.initialized,
      hyperledger: true,
      bridge: transactionBridge.initialized
    }
  });
});

// Storage for temporary KYC data if Hyperledger connection fails
const tempKYCData = new Map();

// Connect to Hyperledger Fabric
async function connectToFabric() {
  try {
    console.log('Attempting to connect to Hyperledger Fabric...');
    
    // First check if the network is running using docker
    try {
      const { stdout } = await execPromise('docker ps | grep "hyperledger/fabric-peer" | wc -l');
      const runningContainers = parseInt(stdout.trim());
      if (runningContainers === 0) {
        console.log('No Hyperledger Fabric containers are running. Please start the network first.');
        return null;
      }
      console.log(`Found ${runningContainers} running Hyperledger containers`);
    } catch (error) {
      console.error('Error checking Docker containers:', error);
    }
    
    // Check if the fabric-invoke.sh script can be executed
    const helperScriptPath = '/tmp/fabric-invoke.sh';
    if (!fs.existsSync(helperScriptPath)) {
      console.error(`Fabric invoke script not found at: ${helperScriptPath}`);
      return null;
    }
    
    // Test chaincode connectivity with a query for a known Solana address
    console.log('Testing chaincode connectivity with GetKYCStatus query...');
    try {
      const args = ['8VyJ4EgKeto2vhVzq2wgwD9GrFz1wcWnGHP97buwxZj2'];
      const argsJson = JSON.stringify(args);
      const command = `${helperScriptPath} "GetKYCStatus" '${argsJson}' "query"`;
      
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr && stderr.includes('Error') && !stderr.includes('no KYC record found')) {
        console.error('Chaincode connection test error:', stderr);
        throw new Error(stderr);
      }
      
      console.log('Successfully connected to Hyperledger Fabric chaincode');
      return true;
    } catch (error) {
      console.error('Failed to connect to chaincode', error);
      return null;
    }
  } catch (error) {
    console.error('Error connecting to Hyperledger Fabric:', error);
    return null;
  }
}

// Function to store KYC data in Hyperledger or persistently
async function storeKYCData(kycData) {
  try {
    console.log('Attempting to store KYC data in Hyperledger Fabric');
    
    // First, try to store using the direct method
    try {
      const result = await storeKYCDirectly(kycData);
      console.log('KYC data submitted to Hyperledger Fabric successfully via direct method');
      
      // Also store in our persistent file storage as backup
      storeKYC(kycData.solanaAddress, kycData);
      
      return result;
    } catch (directError) {
      console.error('Error submitting KYC data to Hyperledger via direct method:', directError);
      
      // Fallback to storing in temporary memory AND persistent storage
      console.log('Falling back to temporary and persistent storage');
      
      // Store in memory
      tempKYCData.set(kycData.solanaAddress, {
        ...kycData,
        kycVerified: false,
        verificationDate: kycData.verificationDate
      });
      
      // Store in persistent file storage
      storeKYC(kycData.solanaAddress, {
        ...kycData,
        kycVerified: false,
        verificationDate: kycData.verificationDate
      });
      
      // Log the submission in the KYC log file
      try {
        const logEntry = `${new Date().toISOString()} - KYC submission for ${kycData.solanaAddress} (${kycData.fullName})\n`;
        fs.appendFileSync(path.join(process.cwd(), 'kyc-submissions.log'), logEntry);
      } catch (logError) {
        console.error('Error logging KYC submission:', logError);
      }
      
      return {
        success: true,
        verification_id: `kyc_${kycData.userId}`,
        status: 'pending',
        message: 'KYC data stored persistently due to Hyperledger error'
      };
    }
  } catch (error) {
    console.error('Unhandled error in storeKYCData:', error);
    throw error;
  }
}

// KYC submission endpoint
app.post('/api/kyc/submit', async (req, res) => {
  try {
    // Format the KYC data
    const { 
      userId, 
      solanaAddress,
      fullName,
      countryCode,
      idDocuments
    } = req.body;
    
    // Generate verification date (current time)
    const verificationDate = new Date().toISOString();
    
    // Initial risk score (could be calculated based on various factors)
    const riskScore = 50;
    
    const kycData = {
      userId,
      solanaAddress,
      fullName,
      countryCode,
      idDocuments,
      verificationDate,
      riskScore
    };
    
    // Store KYC data in Hyperledger Fabric or temporarily in memory
    const result = await storeKYCData(kycData);
    
    // Return response
    res.status(200).json(result);
    
  } catch (error) {
    console.error('Error processing KYC submission:', error);
    res.status(500).json({
      success: false,
      message: `Failed to submit KYC data: ${error.message}`
    });
  }
});

// Function to get KYC status from Hyperledger or storage
async function getKYCStatus(solanaAddress) {
  try {
    console.log(`Attempting to get KYC status for ${solanaAddress} from Hyperledger`);
    
    // First, try to get status using the direct method
    try {
      const result = await getKYCStatusDirectly(solanaAddress);
      if (result) {
        console.log('KYC status retrieved successfully from Hyperledger');
        return result;
      }
    } catch (directError) {
      console.error('Error querying KYC status from Hyperledger via direct method:', directError);
    }
    
    // Try to get from temporary memory storage
    console.log(`Looking up KYC status for ${solanaAddress} in temporary storage`);
    const kycData = tempKYCData.get(solanaAddress);
    
    if (kycData) {
      console.log('Found KYC data in temporary storage');
      return {
        verified: kycData.kycVerified,
        userId: kycData.userId,
        status: kycData.kycVerified ? 'verified' : 'pending',
        countryCode: kycData.countryCode
      };
    }
    
    // If not found in memory, try persistent storage
    console.log(`Looking up KYC status for ${solanaAddress} in persistent storage`);
    const persistentData = getKYC(solanaAddress);
    
    if (persistentData) {
      console.log('Found KYC data in persistent storage');
      
      // Also update in-memory cache
      tempKYCData.set(solanaAddress, persistentData);
      
      return {
        verified: persistentData.kycVerified,
        userId: persistentData.userId,
        status: persistentData.kycVerified ? 'verified' : 'pending',
        countryCode: persistentData.countryCode
      };
    }
    
    console.log('No KYC data found in any storage');
    return null;
  } catch (error) {
    console.error('Unhandled error in getKYCStatus:', error);
    throw error;
  }
}

// KYC status check endpoint
app.get('/api/kyc/status/:solanaAddress', async (req, res) => {
  try {
    const { solanaAddress } = req.params;
    
    const kycStatus = await getKYCStatus(solanaAddress);
    
    if (!kycStatus) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: `No KYC record found for address ${solanaAddress}`
      });
    }
    
    res.status(200).json(kycStatus);
    
  } catch (error) {
    console.error('Error checking KYC status:', error);
    res.status(500).json({
      success: false,
      verified: false,
      message: `Failed to check KYC status: ${error.message}`
    });
  }
});

// Initialize the Solana client and transaction bridge
(async () => {
  try {
    await solanaClient.initialize();
    console.log('Solana client initialized');
    
    await transactionBridge.initialize();
    console.log('Transaction bridge initialized');
  } catch (error) {
    console.error('Error initializing Solana/Bridge components:', error);
  }
})();

// New bridge service endpoints

// Get Solana wallet balance
app.get('/api/solana/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!solanaClient.initialized) {
      return res.status(503).json({
        success: false,
        message: 'Solana client not initialized'
      });
    }
    
    const balance = await solanaClient.getWalletBalance(address);
    
    res.json({
      success: true,
      address,
      balance,
      currency: 'SOL'
    });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Initiate a transaction
app.post('/api/bridge/initiate-transfer', async (req, res) => {
  try {
    const { 
      fromAddress, 
      toAddress, 
      amount,
      sourceCurrency,
      destinationCurrency,
      memo
    } = req.body;
    
    if (!transactionBridge.initialized) {
      return res.status(503).json({
        success: false,
        message: 'Transaction bridge not initialized'
      });
    }
    
    // Validate required fields
    if (!fromAddress || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: fromAddress, toAddress, amount'
      });
    }
    
    // Initialize transaction
    const result = await transactionBridge.initiateTransaction({
      fromAddress,
      toAddress,
      amount,
      sourceCurrency: sourceCurrency || 'SOL',
      destinationCurrency: destinationCurrency || 'SOL',
      memo: memo || ''
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error initiating transfer:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get transaction status
app.get('/api/bridge/transaction-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!transactionBridge.initialized) {
      return res.status(503).json({
        success: false,
        message: 'Transaction bridge not initialized'
      });
    }
    
    const status = await transactionBridge.getTransactionStatus(id);
    res.json(status);
  } catch (error) {
    console.error('Error getting transaction status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get wallet transaction history
app.get('/api/bridge/wallet-transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!transactionBridge.initialized) {
      return res.status(503).json({
        success: false,
        message: 'Transaction bridge not initialized'
      });
    }
    
    const transactions = await transactionBridge.getWalletTransactions(address);
    res.json({
      success: true,
      address,
      transactions
    });
  } catch (error) {
    console.error('Error getting wallet transactions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Sync offline transaction
app.post('/api/bridge/sync-offline-transaction', async (req, res) => {
  try {
    const { 
      offlineTransactionId, 
      fromAddress, 
      toAddress, 
      amount,
      sourceCurrency,
      destinationCurrency,
      bluetoothTxId,
      signature,
      timestamp
    } = req.body;
    
    if (!transactionBridge.initialized) {
      return res.status(503).json({
        success: false,
        message: 'Transaction bridge not initialized'
      });
    }
    
    // Validate required fields
    if (!offlineTransactionId || !fromAddress || !toAddress || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // TODO: Implement offline transaction syncing
    // This would involve:
    // 1. Verifying the transaction signature
    // 2. Recording the transaction in Hyperledger
    // 3. Executing the transaction on Solana
    
    res.json({
      success: true,
      message: 'Offline transaction sync not fully implemented yet',
      status: 'PENDING',
      transaction_id: offlineTransactionId
    });
  } catch (error) {
    console.error('Error syncing offline transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Nivix Bridge Service running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  
  console.log('Attempting to connect to Hyperledger Fabric...');
  connectToFabric().then(connection => {
    if (connection) {
      console.log('Successfully connected to Hyperledger Fabric');
    } else {
      console.log('Failed to connect to Hyperledger Fabric - temporarily storing KYC data in memory');
      console.log('Will try to reconnect to Hyperledger Fabric on each request');
    }
  });
});