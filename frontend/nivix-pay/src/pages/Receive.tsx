import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Divider,
  IconButton,
  Alert,
  Grid
} from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import styled from 'styled-components';
import QrCodeIcon from '@mui/icons-material/QrCode';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import { fetchWalletData } from '../services/apiService';

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

// QR code component placeholder
const QrCodePlaceholder = () => (
  <Box 
    sx={{ 
      width: 200, 
      height: 200, 
      bgcolor: 'rgba(255,255,255,0.1)', 
      border: '1px solid rgba(255,255,255,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 1,
      mx: 'auto',
      mb: 2
    }}
  >
    <QrCodeIcon sx={{ fontSize: 60, opacity: 0.7 }} />
  </Box>
);

const Receive: React.FC = () => {
  const { connected, publicKey } = useWallet();
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [wallets, setWallets] = useState<any[]>([]);
  const [requestAmount, setRequestAmount] = useState<string>('');
  const [requestNote, setRequestNote] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      const data = await fetchWalletData(publicKey?.toString());
      setWallets(data);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle copy to clipboard
  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Generate payment request link
  const generatePaymentLink = () => {
    if (!publicKey) return '';
    
    const baseUrl = window.location.origin;
    let paymentUrl = `${baseUrl}/send?address=${publicKey.toString()}`;
    
    if (selectedWallet && requestAmount) {
      paymentUrl += `&currency=${selectedWallet}&amount=${requestAmount}`;
    }
    
    if (requestNote) {
      paymentUrl += `&note=${encodeURIComponent(requestNote)}`;
    }
    
    return paymentUrl;
  };

  // Handle copying payment link
  const handleCopyLink = () => {
    const link = generatePaymentLink();
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Generate a fake payment app URI scheme
  const generateAppLink = () => {
    if (!publicKey) return '';
    
    let appUri = `nivixpay://receive?address=${publicKey.toString()}`;
    
    if (selectedWallet && requestAmount) {
      appUri += `&currency=${selectedWallet}&amount=${requestAmount}`;
    }
    
    return appUri;
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
            Receive Payment
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
            Connect your wallet to receive payments on the Nivix network
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
                Connect your Solana wallet to receive payments
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
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
          Receive Payment
        </Typography>
        
        <Grid container spacing={4}>
          <Grid xs={12} md={5}>
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                mb: 2
              }}
            >
              <Typography variant="subtitle1" gutterBottom>
                Scan QR Code
              </Typography>
              
              <QrCodePlaceholder />
              
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 'medium' }}>
                Your Address
              </Typography>
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  width: '100%',
                  p: 2,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  borderRadius: 1,
                  mb: 2
                }}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    width: '80%', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis' 
                  }}
                >
                  {publicKey?.toString()}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={handleCopyAddress}
                  color={copySuccess ? 'success' : 'default'}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  width: '100%'
                }}
              >
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<DownloadIcon />}
                  sx={{ flexGrow: 1 }}
                >
                  Save QR
                </Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<ShareIcon />}
                  sx={{ flexGrow: 1 }}
                >
                  Share
                </Button>
              </Box>
            </Box>
          </Grid>
          
          <Grid xs={12} md={7}>
            <Typography variant="subtitle1" gutterBottom>
              Payment Request Details (Optional)
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Receive Currency</InputLabel>
              <Select
                value={selectedWallet}
                onChange={(e) => setSelectedWallet(e.target.value as string)}
                label="Receive Currency"
              >
                <MenuItem value="">Any Currency</MenuItem>
                {wallets.map((wallet) => (
                  <MenuItem key={wallet.id} value={wallet.currency}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ mr: 1, fontSize: '20px' }}>{wallet.icon}</Box>
                      <Typography>{wallet.currency}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Request Amount (Optional)"
              value={requestAmount}
              onChange={(e) => setRequestAmount(e.target.value)}
              type="number"
              placeholder="Enter amount"
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Add Note (Optional)"
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="e.g., Payment for dinner"
              sx={{ mb: 3 }}
            />
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Share Payment Request
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Generate a custom payment link that includes your address and optional details.
              </Alert>
              
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleCopyLink}
                sx={{ mb: 2 }}
              >
                {copySuccess ? 'Copied!' : 'Copy Payment Link'}
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                fullWidth
              >
                Send via Email
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Receive; 