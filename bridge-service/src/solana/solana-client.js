/**
 * Solana Client Module
 * Handles connection to Solana blockchain and provides methods for interacting with Solana
 */

const { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');
const os = require('os');

class SolanaClient {
  constructor(networkUrl = 'https://api.devnet.solana.com') {
    this.connection = new Connection(networkUrl, 'confirmed');
    this.programId = new PublicKey('6WapLzABgaKEBBos6NTTyNJajhe2uFZ27MUpYAwWcBzM'); // Nivix program ID
    this.initialized = false;
    this.bridgeWallet = null;
  }

  /**
   * Initialize the Solana client with bridge wallet
   */
  async initialize() {
    try {
      // Load or create bridge wallet
      const walletPath = path.join(__dirname, '../../wallet/bridge-wallet.json');
      
      if (fs.existsSync(walletPath)) {
        const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
        this.bridgeWallet = Keypair.fromSecretKey(new Uint8Array(walletData));
        console.log('Loaded existing bridge wallet from', walletPath);
      } else {
        // Create a new wallet for the bridge
        this.bridgeWallet = Keypair.generate();
        
        // Ensure directory exists
        if (!fs.existsSync(path.join(__dirname, '../../wallet'))) {
          fs.mkdirSync(path.join(__dirname, '../../wallet'), { recursive: true });
        }
        
        // Save wallet
        fs.writeFileSync(
          walletPath,
          JSON.stringify(Array.from(this.bridgeWallet.secretKey)),
          'utf-8'
        );
        console.log('Created new bridge wallet at', walletPath);
        
        // Request airdrop for new wallet (for devnet)
        const airdropSignature = await this.connection.requestAirdrop(
          this.bridgeWallet.publicKey,
          1000000000 // 1 SOL
        );
        
        await this.connection.confirmTransaction(airdropSignature);
        console.log('Airdropped 1 SOL to bridge wallet');
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing Solana client:', error);
      return false;
    }
  }

  /**
   * Get the balance of a Solana wallet
   * @param {string} walletAddress - The Solana wallet address
   * @returns {Promise<number>} - The balance in SOL
   */
  async getWalletBalance(walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1000000000; // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      throw error;
    }
  }

  /**
   * Get the token balance for a specific SPL token
   * @param {string} walletAddress - The Solana wallet address
   * @param {string} tokenMintAddress - The token mint address
   * @returns {Promise<number>} - The token balance
   */
  async getTokenBalance(walletAddress, tokenMintAddress) {
    try {
      const walletPublicKey = new PublicKey(walletAddress);
      const tokenMintPublicKey = new PublicKey(tokenMintAddress);
      
      // Find the associated token account
      const associatedTokenAddress = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        tokenMintPublicKey,
        walletPublicKey
      );
      
      // Get token account info
      const tokenAccountInfo = await this.connection.getAccountInfo(associatedTokenAddress);
      
      if (!tokenAccountInfo) {
        return 0; // Account doesn't exist, so balance is 0
      }
      
      // Parse the token account data
      const tokenAccount = await this.connection.getTokenAccountBalance(associatedTokenAddress);
      return parseFloat(tokenAccount.value.uiAmount);
    } catch (error) {
      console.error('Error getting token balance:', error);
      throw error;
    }
  }

  /**
   * Transfer SOL between wallets
   * @param {string} fromSecretKey - The sender's secret key (as Uint8Array or base58 string)
   * @param {string} toAddress - The recipient's wallet address
   * @param {number} amount - Amount to send in SOL
   * @returns {Promise<string>} - Transaction signature
   */
  async transferSol(fromSecretKey, toAddress, amount) {
    try {
      // Convert the amount to lamports
      const lamports = amount * 1000000000;
      
      // Create sender keypair from secret key
      let fromKeypair;
      if (typeof fromSecretKey === 'string') {
        // Assuming base58 encoded string
        fromKeypair = Keypair.fromSecretKey(Buffer.from(fromSecretKey, 'base58'));
      } else {
        // Assuming Uint8Array
        fromKeypair = Keypair.fromSecretKey(fromSecretKey);
      }
      
      const toPublicKey = new PublicKey(toAddress);
      
      // Create a transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: toPublicKey,
          lamports: lamports
        })
      );
      
      // Send the transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [fromKeypair]
      );
      
      return signature;
    } catch (error) {
      console.error('Error transferring SOL:', error);
      throw error;
    }
  }

  /**
   * Get a Solana account from the blockchain
   * @param {string} accountAddress - The account address to fetch
   * @returns {Promise<Object>} - The account info
   */
  async getAccountInfo(accountAddress) {
    try {
      const publicKey = new PublicKey(accountAddress);
      const accountInfo = await this.connection.getAccountInfo(publicKey);
      return accountInfo;
    } catch (error) {
      console.error('Error getting account info:', error);
      throw error;
    }
  }
}

module.exports = new SolanaClient(); 