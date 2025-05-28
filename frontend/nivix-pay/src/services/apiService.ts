// This is a mock API service for development purposes
// In a real application, this would connect to your backend services

// Mock data for wallet balances
const mockWallets = [
  { id: 1, currency: 'SOL', balance: 12.458, value_usd: 743.21, icon: '♦️' },
  { id: 2, currency: 'USDC', balance: 560.25, value_usd: 560.25, icon: '💲' },
  { id: 3, currency: 'INR', balance: 24500.0, value_usd: 294.35, icon: '₹' },
];

// Mock data for transaction history
const mockTransactions = [
  { 
    id: 't1', 
    type: 'received', 
    amount: 2.5, 
    currency: 'SOL', 
    from: '6yAWDtM2b3dNYaCduRTsFkC9JH6QbP8AUtYCeYtGuhzK', 
    to: 'Your wallet', 
    date: '2025-05-15T14:35:00Z',
    status: 'completed'
  },
  { 
    id: 't2', 
    type: 'sent', 
    amount: 100, 
    currency: 'USDC', 
    from: 'Your wallet',
    to: '8xj5hKLmrDVXA9VQxwiBrdS9GYmYLJ2GkQrZ7K1i9VJE', 
    date: '2025-05-14T10:22:00Z',
    status: 'completed'
  },
  { 
    id: 't3', 
    type: 'received', 
    amount: 5000, 
    currency: 'INR', 
    from: 'Off-chain transaction', 
    to: 'Your wallet', 
    date: '2025-05-12T18:45:00Z',
    status: 'completed'
  },
  { 
    id: 't4', 
    type: 'offline', 
    amount: 1500, 
    currency: 'INR', 
    from: 'Your wallet', 
    to: '9kj7hLYmrSVXA8BQwkiBrdS4GYmZLB3GlXrW9M3i4VRP', 
    date: '2025-05-11T12:10:00Z',
    status: 'pending'
  },
];

// Mock currency exchange rates
export const exchangeRates = {
  'SOL_USDC': 59.66,  // 1 SOL = 59.66 USDC
  'SOL_INR': 4926.35, // 1 SOL = 4926.35 INR
  'USDC_SOL': 0.0168, // 1 USDC = 0.0168 SOL
  'USDC_INR': 82.56,  // 1 USDC = 82.56 INR
  'INR_SOL': 0.000203, // 1 INR = 0.000203 SOL
  'INR_USDC': 0.0121,  // 1 INR = 0.0121 USDC
};

/**
 * Fetch wallet data for a user
 * @param walletAddress The Solana wallet address
 * @returns Promise with wallet data
 */
export const fetchWalletData = async (walletAddress?: string): Promise<typeof mockWallets> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // In a real application, this would be an API call to your backend
  // return await fetch(`/api/wallets/${walletAddress}`).then(res => res.json());
  
  // For now, just return mock data
  return mockWallets;
};

/**
 * Fetch transaction history for a user
 * @param walletAddress The Solana wallet address
 * @returns Promise with transaction history
 */
export const fetchTransactionHistory = async (walletAddress?: string): Promise<typeof mockTransactions> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In a real application, this would be an API call to your backend
  // return await fetch(`/api/transactions/${walletAddress}`).then(res => res.json());
  
  // For now, just return mock data
  return mockTransactions;
};

/**
 * Check KYC status for a user
 * @param walletAddress The Solana wallet address
 * @returns Promise with KYC status
 */
export const checkKYCStatus = async (walletAddress?: string): Promise<{ verified: boolean }> => {
  try {
    if (!walletAddress) {
      return { verified: false };
    }
    
    // Call the actual API endpoint
    const response = await fetch(`http://localhost:3002/api/kyc/status/${walletAddress}`);
    
    if (response.status === 404) {
      return { verified: false };
    }
    
    if (!response.ok) {
      throw new Error('Failed to check KYC status');
    }
    
    const result = await response.json();
    return { verified: result?.status === 'approved' || result?.kycVerified === true };
  } catch (error) {
    console.error('Error checking KYC status:', error);
    return { verified: false };
  }
};

/**
 * Send a payment transaction
 * @param data Transaction data
 * @returns Promise with transaction result
 */
export const sendPayment = async (data: {
  from: string;
  to: string;
  amount: number;
  currency: string;
  memo?: string;
}) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // In a real application, this would be an API call to your backend
  // return await fetch('/api/transactions', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(data)
  // }).then(res => res.json());
  
  // For now, just return a successful result
  return {
    success: true,
    transaction_id: 'tx_' + Math.random().toString(36).substring(2, 15),
    status: 'completed',
    timestamp: new Date().toISOString()
  };
};

/**
 * Submit KYC data to Hyperledger Fabric
 * @param data KYC data
 * @returns Promise with KYC submission result
 */
export const submitKYC = async (data: any) => {
  try {
    // Call the bridge service API
    const response = await fetch('http://localhost:3002/api/kyc/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit KYC data');
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error submitting KYC data to Hyperledger:', error);
    
    // Fallback to mock data in case of failure
    return {
      success: true,
      verification_id: 'kyc_' + Math.random().toString(36).substring(2, 15),
      status: 'pending',
      message: 'KYC data successfully submitted (MOCK DATA - bridge service unavailable)'
    };
  }
}; 