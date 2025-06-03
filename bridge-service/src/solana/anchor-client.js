/**
 * Anchor Client Module
 * Handles interaction with Solana smart contracts using Anchor framework
 */

const { Program, Provider, web3, BN } = require('@project-serum/anchor');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const solanaClient = require('./solana-client');

// Helper function to convert to BN (Big Number) with proper decimal handling
const convertToBN = (amount, decimals = 9) => {
  return new BN(amount * Math.pow(10, decimals));
};

class AnchorClient {
  constructor() {
    this.connection = solanaClient.connection;
    this.provider = null;
    this.program = null;
    this.initialized = false;
    this.programId = new PublicKey('6WapLzABgaKEBBos6NTTyNJajhe2uFZ27MUpYAwWcBzM'); // Nivix program ID
  }

  /**
   * Initialize the Anchor client with bridge wallet
   */
  async initialize() {
    try {
      // Wait for solanaClient to be initialized if it's not already
      if (!solanaClient.initialized) {
        await solanaClient.initialize();
      }

      // Use the bridge wallet from solanaClient
      this.wallet = {
        publicKey: solanaClient.bridgeWallet.publicKey,
        signTransaction: async (tx) => {
          tx.partialSign(solanaClient.bridgeWallet);
          return tx;
        },
        signAllTransactions: async (txs) => {
          return txs.map((tx) => {
            tx.partialSign(solanaClient.bridgeWallet);
            return tx;
          });
        },
      };

      // Create an Anchor provider
      this.provider = new Provider(
        this.connection,
        this.wallet,
        { commitment: 'confirmed' }
      );

      // Load the IDL (Interface Description Language) for the program
      const idlPath = path.join(__dirname, '../../config/nivix_protocol.json');
      let idl;

      if (fs.existsSync(idlPath)) {
        idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
        console.log('Loaded Nivix Protocol IDL from file');
      } else {
        // If we don't have the IDL file, try to fetch it from the chain
        try {
          idl = await Program.fetchIdl(this.programId, this.provider);
          
          if (idl) {
            // Ensure the directory exists
            const configDir = path.join(__dirname, '../../config');
            if (!fs.existsSync(configDir)) {
              fs.mkdirSync(configDir, { recursive: true });
            }
            
            // Save the IDL for future use
            fs.writeFileSync(idlPath, JSON.stringify(idl, null, 2));
            console.log('Fetched and saved Nivix Protocol IDL');
          } else {
            throw new Error('Failed to fetch IDL from chain');
          }
        } catch (error) {
          console.error('Error fetching IDL:', error);
          throw new Error('Cannot load or fetch IDL. Make sure the program is deployed on this network.');
        }
      }

      // Create the program interface
      this.program = new Program(idl, this.programId, this.provider);
      this.initialized = true;
      console.log('Anchor client initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Anchor client:', error);
      return false;
    }
  }

  /**
   * Register a user on the Nivix protocol
   * @param {string} owner - The owner's wallet address
   * @param {string} username - The username for the new user
   * @param {boolean} kycStatus - The KYC verification status
   * @param {string} homeCurrency - The user's home currency code
   * @returns {Promise<Object>} - Transaction result
   */
  async registerUser(owner, username, kycStatus, homeCurrency) {
    try {
      if (!this.initialized) await this.initialize();

      const ownerPublicKey = new PublicKey(owner);
      
      // Create a new user account
      const user = Keypair.generate();
      
      // Find the platform account
      const [platformPda] = await PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        this.programId
      );

      // Execute the registerUser instruction
      const tx = await this.program.rpc.registerUser(
        username,
        kycStatus,
        homeCurrency,
        {
          accounts: {
            platform: platformPda,
            user: user.publicKey,
            owner: ownerPublicKey,
            payer: this.wallet.publicKey,
            systemProgram: web3.SystemProgram.programId,
          },
          signers: [solanaClient.bridgeWallet, user],
        }
      );

      return {
        success: true,
        transaction: tx,
        userAccount: user.publicKey.toString(),
      };
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * Process a transfer between users
   * @param {string} fromWallet - Sender's wallet address
   * @param {string} toWallet - Recipient's wallet address
   * @param {number} amount - Amount to transfer
   * @param {string} sourceCurrency - Source currency code
   * @param {string} destinationCurrency - Destination currency code
   * @param {string} memo - Transaction memo
   * @returns {Promise<Object>} - Transaction result
   */
  async processTransfer(fromWallet, toWallet, amount, sourceCurrency, destinationCurrency, memo) {
    try {
      if (!this.initialized) await this.initialize();

      // Convert wallet addresses to PublicKeys
      const fromWalletPubkey = new PublicKey(fromWallet);
      const toWalletPubkey = new PublicKey(toWallet);
      
      // Find the platform account
      const [platformPda] = await PublicKey.findProgramAddress(
        [Buffer.from('platform')],
        this.programId
      );
      
      // Find the user account associated with the sender
      const [userPda] = await PublicKey.findProgramAddress(
        [Buffer.from('user'), fromWalletPubkey.toBuffer()],
        this.programId
      );
      
      // Find wallet accounts for sender and recipient
      const [fromWalletPda] = await PublicKey.findProgramAddress(
        [Buffer.from('wallet'), fromWalletPubkey.toBuffer(), Buffer.from(sourceCurrency)],
        this.programId
      );
      
      const [toWalletPda] = await PublicKey.findProgramAddress(
        [Buffer.from('wallet'), toWalletPubkey.toBuffer(), Buffer.from(destinationCurrency)],
        this.programId
      );
      
      // Find token accounts for sender and recipient
      // Note: In a real implementation, you would need to look up the actual token accounts
      
      // Create a new transaction record account
      const transactionRecord = Keypair.generate();
      
      // Generate a random seed for the recipient wallet
      const recipientWalletSeed = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        recipientWalletSeed[i] = Math.floor(Math.random() * 256);
      }
      
      // Execute the processTransfer instruction
      const tx = await this.program.rpc.processTransfer(
        new BN(amount),
        sourceCurrency,
        destinationCurrency,
        recipientWalletSeed,
        memo,
        {
          accounts: {
            platform: platformPda,
            user: userPda,
            fromWallet: fromWalletPda,
            toWallet: toWalletPda,
            fromTokenAccount: fromWalletPubkey, // Simplified, should be actual token account
            toTokenAccount: toWalletPubkey, // Simplified, should be actual token account
            transactionRecord: transactionRecord.publicKey,
            owner: fromWalletPubkey,
            payer: this.wallet.publicKey,
            systemProgram: web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
          signers: [solanaClient.bridgeWallet, transactionRecord],
        }
      );

      return {
        success: true,
        transaction: tx,
        transactionRecord: transactionRecord.publicKey.toString(),
      };
    } catch (error) {
      console.error('Error processing transfer:', error);
      throw error;
    }
  }
}

module.exports = new AnchorClient(); 