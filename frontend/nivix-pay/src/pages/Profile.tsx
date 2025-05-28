import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button,
  Avatar,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  Card,
  CardContent,
  Chip,
  Grid,
  SelectChangeEvent
} from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import styled from 'styled-components';
import PersonIcon from '@mui/icons-material/Person';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SecurityIcon from '@mui/icons-material/Security';
import LanguageIcon from '@mui/icons-material/Language';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

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

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { connected, publicKey, disconnect } = useWallet();
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Mock user data
  const [userData, setUserData] = useState({
    username: 'Nivix User',
    email: 'user@nivixpay.com',
    avatar: '',
    notificationsEnabled: true,
    language: 'en',
    kycVerified: true,
    homeCurrency: 'USD'
  });

  // Handle copy to clipboard
  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Handle settings change
  const handleSettingsChange = (
    event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value } = event.target;
    if (name) {
      setUserData({
        ...userData,
        [name]: value,
      });
    }
  };

  // Handle select change
  const handleSelectChange = (
    event: SelectChangeEvent<string>
  ) => {
    const { name, value } = event.target;
    if (name) {
      setUserData({
        ...userData,
        [name]: value,
      });
    }
  };

  // Handle toggle changes
  const handleToggleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, checked } = event.target;
    setUserData({
      ...userData,
      [name]: checked,
    });
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
            User Profile
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
            Connect your wallet to view and manage your profile
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
                Connect your Solana wallet to access your profile
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
    <Container maxWidth="lg">
      <Grid container spacing={4} sx={{ mt: 2, mb: 8 }}>
        <Grid xs={12} md={4}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              height: '100%',
            }}
          >
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                mb: 3
              }}
            >
              <Avatar 
                sx={{ 
                  width: 100, 
                  height: 100, 
                  mb: 2,
                  bgcolor: 'primary.main'
                }}
              >
                {userData.username.charAt(0).toUpperCase()}
              </Avatar>
              
              <Typography variant="h6">{userData.username}</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {userData.email}
              </Typography>
              
              {userData.kycVerified ? (
                <Chip 
                  icon={<VerifiedUserIcon />} 
                  label="KYC Verified" 
                  color="success" 
                  size="small"
                  sx={{ mt: 1 }}
                />
              ) : (
                <Button 
                  size="small" 
                  variant="outlined" 
                  color="warning" 
                  onClick={() => navigate('/kyc')}
                  sx={{ mt: 1 }}
                >
                  Complete KYC
                </Button>
              )}
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Wallet Address
            </Typography>
            
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 2,
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: 1,
                mb: 3
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  maxWidth: '80%', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis' 
                }}
              >
                {publicKey?.toString()}
              </Typography>
              <Button 
                size="small" 
                variant="text" 
                color={copySuccess ? 'success' : 'primary'}
                startIcon={<ContentCopyIcon fontSize="small" />}
                onClick={handleCopyAddress}
              >
                {copySuccess ? 'Copied' : 'Copy'}
              </Button>
            </Box>
            
            <Button 
              variant="outlined" 
              color="error" 
              fullWidth
              onClick={() => disconnect()}
            >
              Disconnect Wallet
            </Button>
          </Paper>
        </Grid>
        
        <Grid xs={12} md={8}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              Account Settings
            </Typography>
            
            <Grid container spacing={3}>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={userData.username}
                  onChange={handleSettingsChange}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={userData.email}
                  onChange={handleSettingsChange}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Home Currency</InputLabel>
                  <Select
                    name="homeCurrency"
                    value={userData.homeCurrency}
                    label="Home Currency"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="USD">USD - US Dollar</MenuItem>
                    <MenuItem value="EUR">EUR - Euro</MenuItem>
                    <MenuItem value="GBP">GBP - British Pound</MenuItem>
                    <MenuItem value="INR">INR - Indian Rupee</MenuItem>
                    <MenuItem value="JPY">JPY - Japanese Yen</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Language</InputLabel>
                  <Select
                    name="language"
                    value={userData.language}
                    label="Language"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                    <MenuItem value="de">German</MenuItem>
                    <MenuItem value="hi">Hindi</MenuItem>
                    <MenuItem value="ja">Japanese</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 4 }} />
            
            <Typography variant="h6" gutterBottom>
              Preferences
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <NotificationsIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Notifications" 
                  secondary="Receive alerts for transactions and updates"
                />
                <Switch
                  edge="end"
                  name="notificationsEnabled"
                  checked={userData.notificationsEnabled}
                  onChange={handleToggleChange}
                />
              </ListItem>
            </List>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Security
            </Typography>
            
            <List>
              <ListItem onClick={() => navigate('/kyc')}>
                <ListItemIcon>
                  <VerifiedUserIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="KYC Verification" 
                  secondary={userData.kycVerified ? "Verified" : "Not verified"}
                />
                <Chip 
                  label={userData.kycVerified ? "Complete" : "Incomplete"} 
                  color={userData.kycVerified ? "success" : "warning"} 
                  size="small"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Security Settings" 
                  secondary="Configure 2FA and other security options"
                />
              </ListItem>
            </List>
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" color="primary">
                Save Changes
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile; 