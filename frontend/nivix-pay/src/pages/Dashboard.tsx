import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button, 
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
  IconButton,
  Skeleton,
  Alert,
  Grid
} from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTheme } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import QrCodeIcon from '@mui/icons-material/QrCode';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import styled from 'styled-components';
import { fetchWalletData, fetchTransactionHistory } from '../services/apiService';

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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { connected, publicKey } = useWallet();
  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState(true); // Mock KYC status, should come from API

  useEffect(() => {
    if (connected && publicKey) {
      // Load wallet data and transaction history
      fetchData();
    }
  }, [connected, publicKey]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // In a real application, these would be actual API calls
      const walletData = await fetchWalletData(publicKey?.toString());
      const transactionData = await fetchTransactionHistory(publicKey?.toString());
      
      setWallets(walletData);
      setTransactions(transactionData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total balance
  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.value_usd, 0);

  // Format date string
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Truncate address for display
  const truncateAddress = (address: string) => {
    if (address === 'Your wallet') return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (!connected) {
    return (
      <Container maxWidth="md">
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
            Welcome to Nivix Pay
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
            Connect your wallet to access the hybrid blockchain payment system
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
                Connect your Solana wallet to send and receive payments securely
              </Typography>
              <Box sx={{ mt: 2 }}>
                <StyledWalletButton>
                  <WalletMultiButton />
                </StyledWalletButton>
              </Box>
            </CardContent>
          </Card>
          
          <Typography variant="h6" component="h2" gutterBottom>
            Features
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 3, height: '100%', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <Typography variant="h6" gutterBottom>Fast Payments</Typography>
                <Typography variant="body2" color="text.secondary">
                  Send and receive payments within seconds using Solana blockchain
                </Typography>
              </Paper>
            </Grid>
            <Grid xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 3, height: '100%', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <Typography variant="h6" gutterBottom>Multiple Currencies</Typography>
                <Typography variant="body2" color="text.secondary">
                  Support for SOL, USDC, and local fiat currencies like INR
                </Typography>
              </Paper>
            </Grid>
            <Grid xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 3, height: '100%', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <Typography variant="h6" gutterBottom>Secure KYC</Typography>
                <Typography variant="body2" color="text.secondary">
                  Private KYC verification with Hyperledger Fabric
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 8 }}>
      {!kycStatus && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/kyc')}>
              Complete KYC
            </Button>
          }
        >
          Your KYC verification is incomplete. Some features may be limited.
        </Alert>
      )}
      
      <Grid container spacing={4}>
        {/* Balance Summary */}
        <Grid xs={12} md={4}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              height: '100%',
              background: 'linear-gradient(135deg, rgba(93, 95, 239, 0.1) 0%, rgba(93, 95, 239, 0.05) 100%)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Total Balance</Typography>
              <IconButton size="small" onClick={fetchData}>
                <RefreshIcon />
              </IconButton>
            </Box>
            
            {isLoading ? (
              <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1, mb: 2 }} />
            ) : (
              <Typography variant="h3" component="div" sx={{ mb: 2 }}>
                ${totalBalance.toFixed(2)}
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<SendIcon />}
                onClick={() => navigate('/send')}
                sx={{ flexGrow: 1 }}
              >
                Send
              </Button>
              <Button 
                variant="outlined" 
                color="primary" 
                startIcon={<QrCodeIcon />}
                onClick={() => navigate('/receive')}
                sx={{ flexGrow: 1 }}
              >
                Receive
              </Button>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="subtitle2" sx={{ mb: 2 }}>My Wallets</Typography>
            
            {isLoading ? (
              [...Array(3)].map((_, index) => (
                <Skeleton key={index} variant="rectangular" height={60} sx={{ borderRadius: 1, mb: 1 }} />
              ))
            ) : (
              wallets.map((wallet) => (
                <Box 
                  key={wallet.id}
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    p: 2, 
                    mb: 1,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 1
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ mr: 2, fontSize: '24px' }}>{wallet.icon}</Box>
                    <Box>
                      <Typography variant="body1">{wallet.currency}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {wallet.balance.toFixed(wallet.currency === 'SOL' ? 3 : 2)} {wallet.currency}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body1" sx={{ alignSelf: 'center' }}>
                    ${wallet.value_usd.toFixed(2)}
                  </Typography>
                </Box>
              ))
            )}
          </Paper>
        </Grid>
        
        {/* Transaction History */}
        <Grid xs={12} md={8}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>Transaction History</Typography>
            
            {isLoading ? (
              [...Array(4)].map((_, index) => (
                <Skeleton key={index} variant="rectangular" height={70} sx={{ borderRadius: 1, mb: 1 }} />
              ))
            ) : transactions.length > 0 ? (
              <TableContainer>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>From</TableCell>
                      <TableCell>To</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow 
                        key={tx.id}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {tx.type === 'received' ? (
                              <ArrowDownwardIcon 
                                fontSize="small" 
                                sx={{ color: theme.palette.success.main, mr: 1 }} 
                              />
                            ) : tx.type === 'sent' ? (
                              <ArrowUpwardIcon 
                                fontSize="small" 
                                sx={{ color: theme.palette.error.main, mr: 1 }} 
                              />
                            ) : (
                              <SendIcon 
                                fontSize="small" 
                                sx={{ color: theme.palette.warning.main, mr: 1 }} 
                              />
                            )}
                            {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            color={tx.type === 'received' ? 'success.main' : 'inherit'}
                          >
                            {tx.type === 'received' ? '+' : '-'} {tx.amount} {tx.currency}
                          </Typography>
                        </TableCell>
                        <TableCell>{truncateAddress(tx.from)}</TableCell>
                        <TableCell>{truncateAddress(tx.to)}</TableCell>
                        <TableCell>{formatDate(tx.date)}</TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            label={tx.status} 
                            color={tx.status === 'completed' ? 'success' : 'warning'} 
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No transactions yet</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 