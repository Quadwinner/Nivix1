import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Box, 
  Button,
  Stepper,
  Step,
  StepLabel,
  TextField,
  FormControl,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
  MenuItem,
  InputLabel,
  Select,
  SelectChangeEvent,
  Alert,
  Checkbox,
  FormHelperText,
  CircularProgress,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import styled from 'styled-components';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { submitKYC } from '../services/apiService';

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

// Define steps for KYC process
const steps = [
  'Personal Information',
  'Address Verification',
  'Identity Documents',
  'Submit & Verify'
];

const KYC: React.FC = () => {
  const navigate = useNavigate();
  const { connected, publicKey } = useWallet();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    nationality: '',
    
    // Address
    streetAddress: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    
    // Identity Documents
    documentType: '',
    documentNumber: '',
    documentFront: null,
    documentBack: null,
    selfie: null,
    
    // Terms
    termsAccepted: false
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState('pending'); // pending, approved, rejected

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value, checked } = e.target as HTMLInputElement;
    if (name === 'termsAccepted') {
      setFormData({
        ...formData,
        [name]: checked
      });
    } else if (name) {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle select changes
  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle file inputs
  const handleFileUpload = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({
        ...formData,
        [name]: e.target.files[0]
      });
    }
  };

  // Validate form data for current step
  const validateStep = () => {
    const errors: Record<string, string> = {};
    
    switch (activeStep) {
      case 0: // Personal Information
        if (!formData.firstName) errors.firstName = 'First name is required';
        if (!formData.lastName) errors.lastName = 'Last name is required';
        if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
        if (!formData.email) {
          errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          errors.email = 'Email is invalid';
        }
        if (!formData.phone) errors.phone = 'Phone number is required';
        if (!formData.nationality) errors.nationality = 'Nationality is required';
        break;
        
      case 1: // Address
        if (!formData.streetAddress) errors.streetAddress = 'Street address is required';
        if (!formData.city) errors.city = 'City is required';
        if (!formData.state) errors.state = 'State/Province is required';
        if (!formData.postalCode) errors.postalCode = 'Postal code is required';
        if (!formData.country) errors.country = 'Country is required';
        break;
        
      case 2: // Identity Documents
        if (!formData.documentType) errors.documentType = 'Document type is required';
        if (!formData.documentNumber) errors.documentNumber = 'Document number is required';
        if (!formData.documentFront) errors.documentFront = 'Front side of document is required';
        if (!formData.documentBack) errors.documentBack = 'Back side of document is required';
        if (!formData.selfie) errors.selfie = 'Selfie is required';
        break;
        
      case 3: // Terms & Submit
        if (!formData.termsAccepted) errors.termsAccepted = 'You must accept the terms and conditions';
        break;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  // Handle back
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (validateStep()) {
      setIsSubmitting(true);
      
      try {
        // Get the wallet address from the connected wallet
        const walletAddress = publicKey?.toString() || '';
        
        if (!walletAddress) {
          console.error('No wallet connected');
          alert('Please connect your wallet first');
          setIsSubmitting(false);
          return;
        }
        
        // Create a unique user ID based on the wallet address
        const userId = `user_${walletAddress.substring(0, 8)}`;
        
        // Prepare the KYC data for submission
        const kycData = {
          userId: userId,
          solanaAddress: walletAddress,
          fullName: `${formData.firstName} ${formData.lastName}`,
          countryCode: formData.country,
          idDocuments: [formData.documentType]
        };
        
        console.log('Submitting KYC data:', kycData);
        
        // Submit KYC data to Hyperledger Fabric through bridge service
        const result = await submitKYC(kycData);
        
        if (result.success) {
          // KYC submission successful
          console.log('KYC submission successful:', result);
          setActiveStep(4);
          setKycStatus('pending'); // Initial status is pending
        } else {
          // KYC submission failed
          console.error('Failed to submit KYC data:', result.message);
          alert(`KYC submission failed: ${result.message || 'Unknown error'}`);
        }
      } catch (error: any) {
        console.error('Error submitting KYC data:', error);
        alert(`Error submitting KYC data: ${error?.message || 'Unknown error'}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Render the current step form
  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Personal Information
        return (
          <div>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please provide your basic personal information for KYC verification.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  error={!!formErrors.firstName}
                  helperText={formErrors.firstName}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  error={!!formErrors.lastName}
                  helperText={formErrors.lastName}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  error={!!formErrors.dateOfBirth}
                  helperText={formErrors.dateOfBirth}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Nationality</InputLabel>
                  <Select
                    name="nationality"
                    value={formData.nationality}
                    label="Nationality"
                    onChange={handleSelectChange}
                    error={!!formErrors.nationality}
                  >
                    <MenuItem value="US">United States</MenuItem>
                    <MenuItem value="CA">Canada</MenuItem>
                    <MenuItem value="UK">United Kingdom</MenuItem>
                    <MenuItem value="AU">Australia</MenuItem>
                    <MenuItem value="IN">India</MenuItem>
                    <MenuItem value="SG">Singapore</MenuItem>
                  </Select>
                  {formErrors.nationality && (
                    <FormHelperText error>{formErrors.nationality}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  error={!!formErrors.phone}
                  helperText={formErrors.phone}
                />
              </Grid>
            </Grid>
          </div>
        );
        
      case 1: // Address
        return (
          <div>
            <Typography variant="h6" gutterBottom>
              Address Information
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please provide your current residential address.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  name="streetAddress"
                  value={formData.streetAddress}
                  onChange={handleChange}
                  error={!!formErrors.streetAddress}
                  helperText={formErrors.streetAddress}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  error={!!formErrors.city}
                  helperText={formErrors.city}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="State / Province"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  error={!!formErrors.state}
                  helperText={formErrors.state}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Postal Code"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  error={!!formErrors.postalCode}
                  helperText={formErrors.postalCode}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Country</InputLabel>
                  <Select
                    name="country"
                    value={formData.country}
                    label="Country"
                    onChange={handleSelectChange}
                    error={!!formErrors.country}
                  >
                    <MenuItem value="US">United States</MenuItem>
                    <MenuItem value="CA">Canada</MenuItem>
                    <MenuItem value="UK">United Kingdom</MenuItem>
                    <MenuItem value="AU">Australia</MenuItem>
                    <MenuItem value="IN">India</MenuItem>
                    <MenuItem value="SG">Singapore</MenuItem>
                  </Select>
                  {formErrors.country && (
                    <FormHelperText error>{formErrors.country}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
            </Grid>
          </div>
        );
        
      case 2: // Identity Documents
        return (
          <div>
            <Typography variant="h6" gutterBottom>
              Identity Documents
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please upload clear photos of your identity documents.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth error={!!formErrors.documentType}>
                  <InputLabel>Document Type</InputLabel>
                  <Select
                    name="documentType"
                    value={formData.documentType}
                    label="Document Type"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="passport">Passport</MenuItem>
                    <MenuItem value="national_id">National ID Card</MenuItem>
                    <MenuItem value="driving_license">Driving License</MenuItem>
                  </Select>
                  {formErrors.documentType && (
                    <FormHelperText>{formErrors.documentType}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Document Number"
                  name="documentNumber"
                  value={formData.documentNumber}
                  onChange={handleChange}
                  error={!!formErrors.documentNumber}
                  helperText={formErrors.documentNumber}
                />
              </Grid>
              
              <Grid xs={12}>
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    sx={{ p: 2, border: formErrors.documentFront ? '1px solid red' : undefined }}
                  >
                    Upload Front Side of Document
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleFileUpload('documentFront')}
                    />
                  </Button>
                  {formData.documentFront && (
                    <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                      File selected: {(formData.documentFront as File).name}
                    </Typography>
                  )}
                  {formErrors.documentFront && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      {formErrors.documentFront}
                    </Typography>
                  )}
                </Box>
              </Grid>
              
              <Grid xs={12}>
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    sx={{ p: 2, border: formErrors.documentBack ? '1px solid red' : undefined }}
                  >
                    Upload Back Side of Document
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleFileUpload('documentBack')}
                    />
                  </Button>
                  {formData.documentBack && (
                    <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                      File selected: {(formData.documentBack as File).name}
                    </Typography>
                  )}
                  {formErrors.documentBack && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      {formErrors.documentBack}
                    </Typography>
                  )}
                </Box>
              </Grid>
              
              <Grid xs={12}>
                <Box>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    sx={{ p: 2, border: formErrors.selfie ? '1px solid red' : undefined }}
                  >
                    Upload Selfie with Document
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleFileUpload('selfie')}
                    />
                  </Button>
                  {formData.selfie && (
                    <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                      File selected: {(formData.selfie as File).name}
                    </Typography>
                  )}
                  {formErrors.selfie && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      {formErrors.selfie}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </div>
        );
        
      case 3: // Terms & Submit
        return (
          <div>
            <Typography variant="h6" gutterBottom>
              Review & Submit
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please review your information and accept the terms and conditions.
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              Your KYC information will be securely stored on the Hyperledger Fabric private blockchain.
              Only authorized validators will be able to verify your identity.
            </Alert>
            
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleChange}
                  />
                }
                label="I confirm that the information provided is accurate and I accept the terms and conditions."
              />
              {formErrors.termsAccepted && (
                <FormHelperText error>{formErrors.termsAccepted}</FormHelperText>
              )}
            </Box>
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              fullWidth
              size="large"
              sx={{ mt: 2 }}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Submit KYC Information'}
            </Button>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Render success state
  const renderSuccess = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <VerifiedUserIcon color="success" sx={{ fontSize: 64 }} />
      </Box>
      <Typography variant="h5" gutterBottom>
        KYC Verification Successful!
      </Typography>
      <Typography variant="body1" paragraph>
        Your identity has been verified. You now have full access to the Nivix Protocol.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => navigate('/')}
        sx={{ mt: 2 }}
      >
        Go to Dashboard
      </Button>
    </Box>
  );

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
            KYC Verification
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
            Connect your wallet to complete the KYC verification process
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
                Connect your Solana wallet to verify your identity
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
        {kycStatus === 'approved' ? (
          renderSuccess()
        ) : (
          <>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
              KYC Verification
            </Typography>
            
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            
            <Box sx={{ mb: 4 }}>
              {renderStepContent()}
            </Box>
            
            {activeStep !== steps.length - 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleNext}
                >
                  Next
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default KYC; 