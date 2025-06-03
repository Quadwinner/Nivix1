import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Menu, 
  MenuItem, 
  Box, 
  Container,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SendIcon from '@mui/icons-material/Send';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PersonIcon from '@mui/icons-material/Person';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import styled from 'styled-components';

const StyledWalletButton = styled.div`
  .wallet-adapter-button {
    background-color: #5D5FEF;
    color: white;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 600;
  }
`;

const navItems = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Send', path: '/send', icon: <SendIcon /> },
  { label: 'Receive', path: '/receive', icon: <QrCodeIcon /> },
  { label: 'Profile', path: '/profile', icon: <PersonIcon /> },
  { label: 'KYC Verification', path: '/kyc', icon: <VerifiedUserIcon /> },
];

const Header: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const { connected } = useWallet();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        NIVIX PAY
      </Typography>
      <List>
        {navItems.map((item) => (
          <ListItem 
            button
            component={Link} 
            to={item.path}
            key={item.label}
            selected={location.pathname === item.path}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <StyledWalletButton>
          <WalletMultiButton />
        </StyledWalletButton>
      </Box>
    </Box>
  );

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              color: 'white',
              textDecoration: 'none',
              fontWeight: 700,
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <AccountBalanceWalletIcon sx={{ mr: 1 }} />
            NIVIX PAY
          </Typography>

          {isMobile ? (
            <>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="end"
                onClick={handleDrawerToggle}
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="right"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                  keepMounted: true,
                }}
                sx={{
                  display: { xs: 'block', md: 'none' },
                  '& .MuiDrawer-paper': { 
                    boxSizing: 'border-box', 
                    width: 280,
                    backgroundColor: theme.palette.background.default
                  },
                }}
              >
                {drawer}
              </Drawer>
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 2, mr: 4 }}>
                {navItems.map((item) => (
                  <Button
                    key={item.label}
                    component={Link}
                    to={item.path}
                    startIcon={item.icon}
                    color={location.pathname === item.path ? 'primary' : 'inherit'}
                    sx={{ fontWeight: location.pathname === item.path ? 600 : 400 }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
              <StyledWalletButton>
                <WalletMultiButton />
              </StyledWalletButton>
            </>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header; 