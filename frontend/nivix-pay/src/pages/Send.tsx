import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  AlertTitle,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  InputAdornment,
  Snackbar,
  Grid
} from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import styled from 'styled-components';
import SendIcon from '@mui/icons-material/Send';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { fetchWalletData, exchangeRates, sendPayment } from '../services/apiService';

const StyledWalletButton = styled.div`
  .wallet-adapter-button {
    background-color: #5D5FEF;
    color: white;
    border-radius: 8px;
    padding: 12px 20px;
    font-size: 16px;
    font-weight: 600;
    width: 100%;
  }
`;

const Send: React.FC = () => {
  const navigate = useNavigate();
  const { connected, publicKey } = useWallet();
  
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [wallets, setWallets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [kycStatus, setKycStatus] = useState<boolean>(true); // Mock KYC status
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [exchangeAmount, setExchangeAmount] = useState<string>('');
  const [destinationCurrency, setDestinationCurrency] = useState<string>('');

  // Fetch wallet data when connected
  useEffect(() => {
    if (connected && publicKey) {
      loadWalletData();
    }
  }, [connected, publicKey]);

  // Load wallet data from API
  const loadWalletData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchWalletData();
      setWallets(data);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get wallet balance for selected currency
  const getSelectedWalletBalance = () => {
    const wallet = wallets.find(w => w.currency === selectedWallet);
    return wallet ? wallet.balance : 0;
  };

  // Calculate fees (mock implementation)
  const calculateFee = () => {
    if (!amount) return 0;
    
    // Different currencies have different fee structures
    switch (selectedWallet) {
      case 'SOL':
        return 0.000005; // Solana network fee
      case 'USDC':
        return 0.1;      // USDC transfer fee
      case 'INR':
        return Number(amount) * 0.005; // 0.5% for INR transfers
      default:
        return 0;
    }
  };

  // Calculate total amount with fees
  const calculateTotal = () => {
    if (!amount) return 0;
    return Number(amount) + calculateFee();
  };

  // Calculate equivalent amount in destination currency
  const calculateExchange = () => {
    if (!amount || !selectedWallet || !destinationCurrency || selectedWallet === destinationCurrency) {
      setExchangeAmount('');
      return;
    }
    
    const exchangeKey = `${selectedWallet}_${destinationCurrency}`;
    const rate = exchangeRates[exchangeKey as keyof typeof exchangeRates];
    
    if (rate) {
      const exchanged = Number(amount) * rate;
      setExchangeAmount(exchanged.toFixed(destinationCurrency === 'SOL' ? 4 : 2));
    }
  };

  // Effect for calculation
  useEffect(() => {
    calculateExchange();
  }, [amount, selectedWallet, destinationCurrency]);

  // Check if transfer is valid
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!selectedWallet) {
      errors.wallet = 'Please select a wallet';
    }
    
    if (!recipientAddress) {
      errors.recipientAddress = 'Recipient address is required';
    } else if (recipientAddress.length < 32 || recipientAddress.length > 44) {
      errors.recipientAddress = 'Invalid Solana address';
    }
    
    if (!amount) {
      errors.amount = 'Amount is required';
    } else if (isNaN(Number(amount)) || Number(amount) <= 0) {
      errors.amount = 'Invalid amount';
    } else if (Number(amount) > getSelectedWalletBalance()) {
      errors.amount = 'Insufficient balance';
    }
    
    if (destinationCurrency && !exchangeAmount) {
      errors.destinationCurrency = 'Exchange calculation failed';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle send button click
  const handleSendClick = () => {
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  // Handle confirmation
  const handleConfirmSend = async () => {
    if (validateForm()) {
      setIsSubmitting(true);
      
      try {
        // Call API to send payment
        const result = await sendPayment({
          from: publicKey?.toString() || '',
          to: recipientAddress,
          amount: Number(amount),
          currency: selectedWallet,
          memo: memo || undefined
        });
        
        setIsSubmitting(false);
        setShowConfirmation(false);
        setShowSuccess(true);
        
        // Clear form
        setRecipientAddress('');
        setAmount('');
        setMemo('');
        setExchangeAmount('');
        setDestinationCurrency('');
      } catch (error) {
        console.error('Error sending transaction:', error);
        setIsSubmitting(false);
        setShowConfirmation(false);
        setErrorMessage('Transaction failed. Please try again.');
        setShowError(true);
      }
    }
  };

  // Handle close of success/error messages
  const handleCloseSnackbar = () => {
    setShowSuccess(false);
    setShowError(false);
  };

  if (!connected) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            mt: 8,
            mb: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Send Payment
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
            Connect your wallet to send payments on the Nivix network
          </Typography>
          
          <Card sx={{ 
            width: '100%', 
            maxWidth: 500, 
            backgroundColor: 'rgba(93, 95, 239, 0.05)',
            border: '1px solid rgba(93, 95, 239, 0.2)',
            borderRadius: 2,
            p: 2,
            mb: 4
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Connect Wallet
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Connect your Solana wallet to send payments
              </Typography>
              <Box sx={{ mt: 2 }}>
                <StyledWalletButton>
                  <WalletMultiButton />
                </StyledWalletButton>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={0} sx={{ p: 4, mt: 4, mb: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 2 }}>
          Send Payment
        </Typography>
        
        {!kycStatus && (
          <Alert 
            severity="warning" 
            sx={{ mb: 4 }}
            action={
              <Button color="inherit" size="small" onClick={() => navigate('/kyc')}>
                Complete KYC
              </Button>
            }
          >
            <AlertTitle>KYC Required</AlertTitle>
            Your KYC verification is incomplete. You can only send up to 100 USDC equivalent without KYC verification.
          </Alert>
        )}
        
        <Grid container spacing={3}>
          <Grid xs={12}>
            <FormControl fullWidth error={!!formErrors.wallet}>
              <InputLabel>Select Source Wallet</InputLabel>
              <Select
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value)}
                label="Select Source Wallet"
                startAdornment={
                  selectedWallet && (
                    <InputAdornment position="start">
                      {wallets.find(w => w.currency === selectedWallet)?.icon}
                    </InputAdornment>
                  )
                }
              >
                {wallets.map((wallet) => (
                  <MenuItem key={wallet.id} value={wallet.currency}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ mr: 1, fontSize: '20px' }}>{wallet.icon}</Box>
                        <Typography>{wallet.currency}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Balance: {wallet.balance.toFixed(wallet.currency === 'SOL' ? 4 : 2)} {wallet.currency}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
              {formErrors.wallet && <FormHelperText>{formErrors.wallet}</FormHelperText>}
            </FormControl>
          </Grid>
          
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Recipient Address"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              error={!!formErrors.recipientAddress}
              helperText={formErrors.recipientAddress}
              placeholder="Enter Solana wallet address"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountBalanceWalletIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid xs={12} sm={6}>
            <TextField
              fullWidth
              label={`Amount (${selectedWallet || 'Select currency'})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              error={!!formErrors.amount}
              helperText={formErrors.amount || (selectedWallet ? `Available: ${getSelectedWalletBalance()} ${selectedWallet}` : '')}
              disabled={!selectedWallet}
              InputProps={{
                startAdornment: selectedWallet && (
                  <InputAdornment position="start">
                    {wallets.find(w => w.currency === selectedWallet)?.icon}
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Convert To (Optional)</InputLabel>
              <Select
                value={destinationCurrency}
                onChange={(e) => setDestinationCurrency(e.target.value)}
                label="Convert To (Optional)"
              >
                <MenuItem value="">Don't convert</MenuItem>
                {wallets.map((wallet) => (
                  wallet.currency !== selectedWallet && (
                    <MenuItem key={wallet.id} value={wallet.currency}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ mr: 1, fontSize: '20px' }}>{wallet.icon}</Box>
                        <Typography>{wallet.currency}</Typography>
                      </Box>
                    </MenuItem>
                  )
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {destinationCurrency && (
            <Grid xs={12}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(93, 95, 239, 0.05)', 
                  borderRadius: 2,
                  border: '1px dashed rgba(93, 95, 239, 0.3)'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SwapHorizIcon color="primary" sx={{ mx: 2 }} />
                  <Typography>
                    {amount || '0'} {selectedWallet} ≈ {exchangeAmount || '0'} {destinationCurrency}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          )}
          
          <Grid xs={12}>
            <TextField
              fullWidth
              label="Memo (Optional)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Add a note to this payment"
              multiline
              rows={2}
            />
          </Grid>
          
          {selectedWallet && amount && (
            <Grid xs={12}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 3, 
                  mt: 2, 
                  bgcolor: 'rgba(255, 255, 255, 0.03)', 
                  borderRadius: 2
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Transaction Summary
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Amount:</Typography>
                  <Typography>{amount} {selectedWallet}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Network Fee:</Typography>
                  <Typography>{calculateFee().toFixed(selectedWallet === 'SOL' ? 6 : 2)} {selectedWallet}</Typography>
                </Box>
                {destinationCurrency && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Recipient Gets:</Typography>
                    <Typography>{exchangeAmount} {destinationCurrency}</Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="subtitle2">Total:</Typography>
                  <Typography variant="subtitle2">{calculateTotal().toFixed(selectedWallet === 'SOL' ? 6 : 2)} {selectedWallet}</Typography>
                </Box>
              </Paper>
            </Grid>
          )}
          
          <Grid xs={12} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              startIcon={<SendIcon />}
              onClick={handleSendClick}
              disabled={isLoading || isSubmitting}
            >
              {isLoading || isSubmitting ? <CircularProgress size={24} /> : 'Send Payment'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Confirmation Dialog */}
      {showConfirmation && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
        >
          <Card sx={{ width: '100%', maxWidth: 480, borderRadius: 2 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom>
                Confirm Transaction
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                Please review the transaction details before confirming.
              </Alert>
              
              <Typography variant="subtitle2" gutterBottom>
                Transaction Details
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">From:</Typography>
                  <Typography variant="body2">
                    {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">To:</Typography>
                  <Typography variant="body2">
                    {recipientAddress.slice(0, 8)}...{recipientAddress.slice(-8)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Amount:</Typography>
                  <Typography variant="body2">{amount} {selectedWallet}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Fee:</Typography>
                  <Typography variant="body2">{calculateFee().toFixed(selectedWallet === 'SOL' ? 6 : 2)} {selectedWallet}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Total:</Typography>
                  <Typography variant="body2" fontWeight="bold">{calculateTotal().toFixed(selectedWallet === 'SOL' ? 6 : 2)} {selectedWallet}</Typography>
                </Box>
                {destinationCurrency && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Converted Amount:</Typography>
                    <Typography variant="body2">{exchangeAmount} {destinationCurrency}</Typography>
                  </Box>
                )}
                {memo && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Memo:</Typography>
                    <Typography variant="body2">{memo}</Typography>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowConfirmation(false)}
                  fullWidth
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleConfirmSend}
                  fullWidth
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <CircularProgress size={24} /> : 'Confirm & Send'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
      
      {/* Success Message */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message="Payment sent successfully!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      
      {/* Error Message */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={errorMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
};

export default Send; 