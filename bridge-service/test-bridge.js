/**
 * Test script for the Nivix Transaction Bridge
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3002';

// Test addresses
const FROM_ADDRESS = '8VyJ4EgKeto2vhVzq2wgwD9GrFz1wcWnGHP97buwxZj2';
const TO_ADDRESS = '9AxVyJ4EgKeto2vhVzq2wgwD9GrFz1wcWnGHP97btest';

async function runTests() {
  try {
    console.log('🧪 TESTING NIVIX BRIDGE INTEGRATION 🧪');
    console.log('====================================');
    console.log('');

    // Step 1: Check health
    console.log('1️⃣ Testing bridge service health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`Health Status: ${healthResponse.data.status}`);
    console.log(`Features: ${JSON.stringify(healthResponse.data.features, null, 2)}`);
    console.log('');

    // Step 2: Check Solana balance
    console.log(`2️⃣ Testing Solana balance API for address: ${FROM_ADDRESS}...`);
    try {
      const balanceResponse = await axios.get(`${BASE_URL}/api/solana/balance/${FROM_ADDRESS}`);
      console.log(`Balance: ${balanceResponse.data.balance} ${balanceResponse.data.currency}`);
    } catch (error) {
      console.log(`Error getting balance: ${error.response?.data?.message || error.message}`);
    }
    console.log('');

    // Step 3: Initiate a transaction
    console.log('3️⃣ Testing transaction initiation...');
    try {
      const transferResponse = await axios.post(`${BASE_URL}/api/bridge/initiate-transfer`, {
        fromAddress: FROM_ADDRESS,
        toAddress: TO_ADDRESS,
        amount: 0.001,
        sourceCurrency: 'SOL',
        destinationCurrency: 'SOL',
        memo: 'Test transaction from bridge test script'
      });

      console.log(`Transaction Status: ${transferResponse.data.status}`);
      console.log(`Transaction ID: ${transferResponse.data.transaction_id}`);
      
      // Step 4: Check transaction status
      if (transferResponse.data.transaction_id) {
        console.log('');
        console.log(`4️⃣ Checking transaction status for ID: ${transferResponse.data.transaction_id}...`);
        
        // Wait 2 seconds for transaction to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await axios.get(`${BASE_URL}/api/bridge/transaction-status/${transferResponse.data.transaction_id}`);
        console.log(`Transaction Status: ${statusResponse.data.status}`);
        console.log(`Details: ${JSON.stringify(statusResponse.data, null, 2)}`);
      }
    } catch (error) {
      console.log(`Error initiating transaction: ${error.response?.data?.message || error.message}`);
    }
    console.log('');

    // Step 5: Get wallet transaction history
    console.log(`5️⃣ Testing wallet transaction history for address: ${FROM_ADDRESS}...`);
    try {
      const historyResponse = await axios.get(`${BASE_URL}/api/bridge/wallet-transactions/${FROM_ADDRESS}`);
      console.log(`Found ${historyResponse.data.transactions?.length || 0} transactions`);
      if (historyResponse.data.transactions?.length > 0) {
        console.log(`Latest transaction: ${JSON.stringify(historyResponse.data.transactions[0], null, 2)}`);
      }
    } catch (error) {
      console.log(`Error getting wallet history: ${error.response?.data?.message || error.message}`);
    }
    
    console.log('');
    console.log('✅ BRIDGE TESTING COMPLETE ✅');
    
  } catch (error) {
    console.error('Error running tests:', error.message);
  }
}

// Run the tests
runTests(); 