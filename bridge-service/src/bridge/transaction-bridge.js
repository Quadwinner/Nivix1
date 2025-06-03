/**
 * Transaction Bridge Module
 * Connects Hyperledger Fabric and Solana blockchain for cross-chain operations
 */

const { v4: uuidv4 } = require('uuid');
const solanaClient = require('../solana/solana-client');
const anchorClient = require('../solana/anchor-client');
const { directInvokeChaincode } = require('../direct-invoke');
const { execPromise } = require('../exec-promise');
const { storeKYCDirectly } = require('../direct-kyc');
const fs = require('fs');
const path = require('path');

// In-memory transaction tracking (would be replaced with a database in production)
const pendingTransactions = new Map();
const completedTransactions = new Map();

class TransactionBridge {
  constructor() {
    this.initialized = false;
    this.fabricConnected = false;
    this.solanaConnected = false;
    this.transactions = new Map();
    
    // Create storage directory if it doesn't exist
    const transactionsDir = path.join(__dirname, '../../data/transactions');
    if (!fs.existsSync(transactionsDir)) {
      fs.mkdirSync(transactionsDir, { recursive: true });
    }
    
    // Path to the transaction log file
    this.transactionLogPath = path.join(transactionsDir, 'transactions.json');
    
    // Load existing transactions if any
    this.loadTransactions();
  }

  /**
   * Initialize the transaction bridge
   */
  async initialize() {
    try {
      console.log('Initializing Transaction Bridge...');
      
      // Initialize Solana client
      this.solanaConnected = await solanaClient.initialize();
      console.log('Solana client initialization:', this.solanaConnected ? 'SUCCESS' : 'FAILED');
      
      // Initialize Anchor client
      const anchorInitialized = await anchorClient.initialize();
      console.log('Anchor client initialization:', anchorInitialized ? 'SUCCESS' : 'FAILED');
      
      // Test Hyperledger Fabric connection
      try {
        // Test chaincode connectivity with a query for a known Solana address
        console.log('Testing Hyperledger Fabric connectivity...');
        const fabricResult = await this.queryHyperledger('GetKYCStatus', ['8VyJ4EgKeto2vhVzq2wgwD9GrFz1wcWnGHP97buwxZj2']);
        this.fabricConnected = true;
        console.log('Hyperledger Fabric connection: SUCCESS');
      } catch (error) {
        console.error('Hyperledger Fabric connection: FAILED', error.message);
        this.fabricConnected = false;
      }
      
      this.initialized = this.solanaConnected || this.fabricConnected;
      return this.initialized;
    } catch (error) {
      console.error('Error initializing transaction bridge:', error);
      return false;
    }
  }

  /**
   * Load transactions from storage
   */
  loadTransactions() {
    try {
      if (fs.existsSync(this.transactionLogPath)) {
        const transactionsData = JSON.parse(fs.readFileSync(this.transactionLogPath, 'utf-8'));
        
        // Add transactions to the in-memory maps
        if (transactionsData.pending) {
          Object.entries(transactionsData.pending).forEach(([id, tx]) => {
            pendingTransactions.set(id, tx);
          });
        }
        
        if (transactionsData.completed) {
          Object.entries(transactionsData.completed).forEach(([id, tx]) => {
            completedTransactions.set(id, tx);
          });
        }
        
        console.log(`Loaded ${pendingTransactions.size} pending and ${completedTransactions.size} completed transactions from storage`);
      } else {
        console.log('No transaction log file found, starting fresh');
      }
    } catch (error) {
      console.error('Error loading transactions from storage:', error);
    }
  }

  /**
   * Save transactions to storage
   */
  saveTransactions() {
    try {
      const transactionsData = {
        pending: Object.fromEntries(pendingTransactions),
        completed: Object.fromEntries(completedTransactions)
      };
      
      fs.writeFileSync(
        this.transactionLogPath,
        JSON.stringify(transactionsData, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Error saving transactions to storage:', error);
    }
  }

  /**
   * Query Hyperledger Fabric chaincode
   * @param {string} fcn - Function name to invoke
   * @param {Array} args - Arguments for the function
   * @returns {Promise<any>} - Result from chaincode
   */
  async queryHyperledger(fcn, args) {
    try {
      const helperScriptPath = '/tmp/fabric-invoke.sh';
      
      if (!fs.existsSync(helperScriptPath)) {
        throw new Error(`Fabric invoke script not found at: ${helperScriptPath}`);
      }
      
      const argsJson = JSON.stringify(args);
      const command = `${helperScriptPath} "${fcn}" '${argsJson}' "query"`;
      
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr && stderr.includes('Error') && !stderr.includes('no KYC record found')) {
        throw new Error(stderr);
      }
      
      try {
        return JSON.parse(stdout);
      } catch (e) {
        return stdout;
      }
    } catch (error) {
      console.error(`Error querying Hyperledger chaincode (${fcn}):`, error);
      throw error;
    }
  }

  /**
   * Invoke Hyperledger Fabric chaincode (write)
   * @param {string} fcn - Function name to invoke
   * @param {Array} args - Arguments for the function
   * @returns {Promise<any>} - Result from chaincode
   */
  async invokeHyperledger(fcn, args) {
    try {
      const helperScriptPath = '/tmp/fabric-invoke.sh';
      
      if (!fs.existsSync(helperScriptPath)) {
        throw new Error(`Fabric invoke script not found at: ${helperScriptPath}`);
      }
      
      const argsJson = JSON.stringify(args);
      const command = `${helperScriptPath} "${fcn}" '${argsJson}' "invoke"`;
      
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr && stderr.includes('Error')) {
        throw new Error(stderr);
      }
      
      try {
        return JSON.parse(stdout);
      } catch (e) {
        return stdout;
      }
    } catch (error) {
      console.error(`Error invoking Hyperledger chaincode (${fcn}):`, error);
      throw error;
    }
  }

  /**
   * Verify KYC status before processing a transaction
   * @param {string} solanaAddress - The Solana wallet address to check
   * @returns {Promise<boolean>} - Whether the user is KYC verified
   */
  async verifyKYC(solanaAddress) {
    try {
      if (!this.fabricConnected) {
        throw new Error('Hyperledger Fabric connection not available');
      }
      
      // Query Hyperledger for KYC status
      const kycData = await this.queryHyperledger('GetKYCStatus', [solanaAddress]);
      
      if (!kycData) {
        return false;
      }
      
      return kycData.kycVerified === true;
    } catch (error) {
      console.error('Error verifying KYC status:', error);
      return false;
    }
  }

  /**
   * Initiate a cross-chain transaction
   * @param {Object} transaction - Transaction details
   * @returns {Promise<Object>} - Transaction result
   */
  async initiateTransaction(transaction) {
    try {
      if (!this.initialized) await this.initialize();
      
      if (!transaction.fromAddress || !transaction.toAddress || !transaction.amount) {
        throw new Error('Missing required transaction parameters');
      }
      
      // Generate a unique transaction ID
      const transactionId = uuidv4();
      
      // Create transaction record
      const txRecord = {
        id: transactionId,
        fromAddress: transaction.fromAddress,
        toAddress: transaction.toAddress,
        amount: transaction.amount,
        sourceCurrency: transaction.sourceCurrency || 'SOL',
        destinationCurrency: transaction.destinationCurrency || 'SOL',
        memo: transaction.memo || '',
        status: 'PENDING',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        solanaTransaction: null,
        hyperledgerTransaction: null,
      };
      
      // Verify KYC status if possible
      if (this.fabricConnected) {
        const isKycVerified = await this.verifyKYC(transaction.fromAddress);
        if (!isKycVerified) {
          txRecord.status = 'REJECTED';
          txRecord.error = 'KYC verification required';
          completedTransactions.set(transactionId, txRecord);
          this.saveTransactions();
          return {
            success: false,
            status: 'REJECTED',
            transaction_id: transactionId,
            message: 'KYC verification required',
          };
        }
      }
      
      // Store the transaction in pending state
      pendingTransactions.set(transactionId, txRecord);
      this.saveTransactions();
      
      // Process the transaction asynchronously
      this.processTransaction(transactionId).catch(error => {
        console.error('Error in async transaction processing:', error);
      });
      
      return {
        success: true,
        status: 'PENDING',
        transaction_id: transactionId,
        message: 'Transaction initiated',
      };
    } catch (error) {
      console.error('Error initiating transaction:', error);
      throw error;
    }
  }

  /**
   * Process a pending transaction
   * @param {string} transactionId - The ID of the transaction to process
   * @returns {Promise<Object>} - Processing result
   */
  async processTransaction(transactionId) {
    try {
      // Get the transaction record
      const txRecord = pendingTransactions.get(transactionId);
      
      if (!txRecord) {
        throw new Error(`Transaction ${transactionId} not found`);
      }
      
      // Update status to PROCESSING
      txRecord.status = 'PROCESSING';
      txRecord.updated = new Date().toISOString();
      pendingTransactions.set(transactionId, txRecord);
      this.saveTransactions();
      
      // 1. Record transaction in Hyperledger Fabric (if connected)
      if (this.fabricConnected) {
        try {
          const hyperledgerResult = await this.invokeHyperledger('RecordTransaction', [
            transactionId,
            txRecord.fromAddress,
            txRecord.toAddress,
            txRecord.amount.toString(),
            txRecord.sourceCurrency,
            txRecord.destinationCurrency,
            txRecord.memo,
            new Date().toISOString()
          ]);
          
          txRecord.hyperledgerTransaction = hyperledgerResult;
        } catch (error) {
          console.error('Error recording transaction in Hyperledger:', error);
          // Continue even if Hyperledger recording fails
        }
      }
      
      // 2. Execute the transaction on Solana (if connected)
      if (this.solanaConnected) {
        try {
          // Use Anchor client to process the transfer
          const solanaResult = await anchorClient.processTransfer(
            txRecord.fromAddress,
            txRecord.toAddress,
            txRecord.amount,
            txRecord.sourceCurrency,
            txRecord.destinationCurrency,
            txRecord.memo
          );
          
          txRecord.solanaTransaction = solanaResult;
        } catch (error) {
          console.error('Error executing transaction on Solana:', error);
          
          // Mark transaction as failed
          txRecord.status = 'FAILED';
          txRecord.error = error.message;
          txRecord.updated = new Date().toISOString();
          
          // Move to completed transactions
          completedTransactions.set(transactionId, txRecord);
          pendingTransactions.delete(transactionId);
          this.saveTransactions();
          
          return {
            success: false,
            status: 'FAILED',
            transaction_id: transactionId,
            message: error.message,
          };
        }
      }
      
      // Mark transaction as completed
      txRecord.status = 'COMPLETED';
      txRecord.updated = new Date().toISOString();
      
      // Move to completed transactions
      completedTransactions.set(transactionId, txRecord);
      pendingTransactions.delete(transactionId);
      this.saveTransactions();
      
      return {
        success: true,
        status: 'COMPLETED',
        transaction_id: transactionId,
        message: 'Transaction completed successfully',
      };
    } catch (error) {
      console.error('Error processing transaction:', error);
      
      // Update transaction status to FAILED
      const txRecord = pendingTransactions.get(transactionId);
      if (txRecord) {
        txRecord.status = 'FAILED';
        txRecord.error = error.message;
        txRecord.updated = new Date().toISOString();
        
        // Move to completed transactions
        completedTransactions.set(transactionId, txRecord);
        pendingTransactions.delete(transactionId);
        this.saveTransactions();
      }
      
      throw error;
    }
  }

  /**
   * Get transaction status
   * @param {string} transactionId - The ID of the transaction to check
   * @returns {Promise<Object>} - Transaction status
   */
  async getTransactionStatus(transactionId) {
    try {
      // Check pending transactions first
      const pendingTx = pendingTransactions.get(transactionId);
      if (pendingTx) {
        return {
          id: pendingTx.id,
          status: pendingTx.status,
          fromAddress: pendingTx.fromAddress,
          toAddress: pendingTx.toAddress,
          amount: pendingTx.amount,
          sourceCurrency: pendingTx.sourceCurrency,
          destinationCurrency: pendingTx.destinationCurrency,
          created: pendingTx.created,
          updated: pendingTx.updated,
        };
      }
      
      // Then check completed transactions
      const completedTx = completedTransactions.get(transactionId);
      if (completedTx) {
        return {
          id: completedTx.id,
          status: completedTx.status,
          fromAddress: completedTx.fromAddress,
          toAddress: completedTx.toAddress,
          amount: completedTx.amount,
          sourceCurrency: completedTx.sourceCurrency,
          destinationCurrency: completedTx.destinationCurrency,
          created: completedTx.created,
          updated: completedTx.updated,
          error: completedTx.error,
        };
      }
      
      // Transaction not found
      return {
        success: false,
        message: 'Transaction not found',
      };
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw error;
    }
  }

  /**
   * Get all transactions for a wallet address
   * @param {string} walletAddress - The wallet address to get transactions for
   * @returns {Promise<Array>} - List of transactions
   */
  async getWalletTransactions(walletAddress) {
    try {
      const transactions = [];
      
      // Check pending transactions
      pendingTransactions.forEach(tx => {
        if (tx.fromAddress === walletAddress || tx.toAddress === walletAddress) {
          transactions.push({
            id: tx.id,
            status: tx.status,
            fromAddress: tx.fromAddress,
            toAddress: tx.toAddress,
            amount: tx.amount,
            sourceCurrency: tx.sourceCurrency,
            destinationCurrency: tx.destinationCurrency,
            created: tx.created,
            updated: tx.updated,
          });
        }
      });
      
      // Check completed transactions
      completedTransactions.forEach(tx => {
        if (tx.fromAddress === walletAddress || tx.toAddress === walletAddress) {
          transactions.push({
            id: tx.id,
            status: tx.status,
            fromAddress: tx.fromAddress,
            toAddress: tx.toAddress,
            amount: tx.amount,
            sourceCurrency: tx.sourceCurrency,
            destinationCurrency: tx.destinationCurrency,
            created: tx.created,
            updated: tx.updated,
            error: tx.error,
          });
        }
      });
      
      return transactions;
    } catch (error) {
      console.error('Error getting wallet transactions:', error);
      throw error;
    }
  }
}

module.exports = new TransactionBridge(); 