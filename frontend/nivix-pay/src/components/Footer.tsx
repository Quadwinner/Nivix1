import React from 'react';
import { Box, Container, Typography, Link, IconButton } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) => theme.palette.background.paper,
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'center', md: 'flex-start' },
          }}
        >
          <Box sx={{ mb: { xs: 2, md: 0 } }}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              NIVIX Protocol
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A Hybrid Blockchain Payment Solution
            </Typography>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} Nivix Protocol
            </Typography>
          </Box>
          
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'center', md: 'flex-start' },
            }}
          >
            <Typography variant="subtitle1" color="text.primary" gutterBottom>
              Quick Links
            </Typography>
            <Link href="#" color="text.secondary" sx={{ mb: 0.5 }}>
              Documentation
            </Link>
            <Link href="#" color="text.secondary" sx={{ mb: 0.5 }}>
              API Reference
            </Link>
            <Link href="#" color="text.secondary" sx={{ mb: 0.5 }}>
              Support
            </Link>
          </Box>
          
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'center', md: 'flex-start' },
              mt: { xs: 2, md: 0 },
            }}
          >
            <Typography variant="subtitle1" color="text.primary" gutterBottom>
              Legal
            </Typography>
            <Link href="#" color="text.secondary" sx={{ mb: 0.5 }}>
              Privacy Policy
            </Link>
            <Link href="#" color="text.secondary" sx={{ mb: 0.5 }}>
              Terms of Service
            </Link>
            <Link href="#" color="text.secondary" sx={{ mb: 0.5 }}>
              Compliance
            </Link>
          </Box>
          
          <Box
            sx={{
              mt: { xs: 2, md: 0 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'center', md: 'flex-start' },
            }}
          >
            <Typography variant="subtitle1" color="text.primary" gutterBottom>
              Connect With Us
            </Typography>
            <Box>
              <IconButton color="primary" aria-label="GitHub" component="a" href="#">
                <GitHubIcon />
              </IconButton>
              <IconButton color="primary" aria-label="LinkedIn" component="a" href="#">
                <LinkedInIcon />
              </IconButton>
              <IconButton color="primary" aria-label="Twitter" component="a" href="#">
                <TwitterIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer; 