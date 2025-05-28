# Troubleshooting Private Data Collections in Hyperledger Fabric

This guide addresses common issues with private data collections in Hyperledger Fabric chaincode, specifically for the Nivix KYC system.

## Common Issues with Private Data Collections

### 1. Private Data Not Being Stored or Retrieved

**Symptoms:**
- Functions like `StorePrivateKYCData` fail silently
- `GetKYCStatus` only returns public data, not private data
- `UpdateKYCStatus` doesn't update private data
- `ValidateTransaction` fails to access private data

**Root Causes:**
- Incorrect path to collections_config.json during chaincode deployment
- Missing or incorrect collections_config.json reference in deployment commands
- Incorrect collection names in the chaincode code
- Permission issues with the private data collections

### 2. Fixing Private Data Collection Issues

#### Step 1: Verify collections_config.json

Our collections_config.json looks correct:

```json
[
  {
    "name": "kycPrivateData",
    "policy": "OR('Org1MSP.member', 'Org2MSP.member')",
    "requiredPeerCount": 0,
    "maxPeerCount": 3,
    "blockToLive": 0,
    "memberOnlyRead": true,
    "memberOnlyWrite": false
  },
  {
    "name": "complianceRecords",
    "policy": "OR('Org1MSP.member', 'Org2MSP.member')",
    "requiredPeerCount": 0,
    "maxPeerCount": 3,
    "blockToLive": 0,
    "memberOnlyRead": true,
    "memberOnlyWrite": false
  }
]
```

#### Step 2: Proper Chaincode Deployment with Collections

The key issue is ensuring the collections_config.json is properly referenced during chaincode deployment. Our deployment script addresses this by:

1. Copying the collections_config.json to the test-network directory to avoid path issues
2. Using the local path to the collections_config.json in all chaincode lifecycle commands
3. Using the same collection names in the chaincode as defined in the config file

#### Step 3: Debugging Private Data Operations

If issues persist after proper deployment:

1. Check endorsement policies: Ensure that the chaincode endorsement policy is compatible with the collection policy
2. Verify MSP configuration: Make sure the MSP IDs in the collection policy match your organization MSP IDs
3. Check chaincode logs: Look for errors related to private data operations
4. Verify peer logs: Check for access denied errors or other permission issues

## Specific Fixes for Nivix KYC Chaincode

### Fix for StoreKYC Function

The `StoreKYC` function should work correctly if the collections are properly defined during deployment. The function stores data in both the public ledger and the private data collection:

```go
// Store in private data collection
err = ctx.GetStub().PutPrivateData("kycPrivateData", userId, kycJSON)
if err != nil {
    return fmt.Errorf("failed to put KYC data: %v", err)
}

// Also store a public reference that this user has KYC
publicData := map[string]interface{}{
    "userId":        userId,
    "solanaAddress": solanaAddress,
    "kycVerified":   kycVerified,
    "riskScore":     riskScore,
    "countryCode":   countryCode,
}
publicJSON, err := json.Marshal(publicData)
if err != nil {
    return err
}

return ctx.GetStub().PutState(solanaAddress, publicJSON)
```

### Fix for UpdateKYCStatus Function

The `UpdateKYCStatus` function should update both public and private data:

```go
// Update public data
publicData["kycVerified"] = kycVerified
updatedPublicJSON, err := json.Marshal(publicData)
if err != nil {
    return err
}

// Update the state
err = ctx.GetStub().PutState(solanaAddress, updatedPublicJSON)
if err != nil {
    return err
}

// Try to update private data if available
privateDataBytes, err := ctx.GetStub().GetPrivateData("kycPrivateData", userId)
if err == nil && privateDataBytes != nil {
    var kycRecord KYCRecord
    err = json.Unmarshal(privateDataBytes, &kycRecord)
    if err == nil {
        kycRecord.KYCVerified = kycVerified
        kycRecord.VerificationDate = time.Now().Format(time.RFC3339)
        
        updatedPrivateJSON, err := json.Marshal(kycRecord)
        if err == nil {
            _ = ctx.GetStub().PutPrivateData("kycPrivateData", userId, updatedPrivateJSON)
        }
    }
}
```

### Fix for ValidateTransaction Function

The `ValidateTransaction` function uses data from both public and private collections:

```go
// Get KYC status
kycRecord, err := s.GetKYCStatus(ctx, solanaAddress)
if err != nil {
    return &ValidationResult{
        IsValid: false,
        Message: "KYC record not found",
    }, nil
}

// Validate based on KYC status and risk score
if !kycRecord.KYCVerified {
    return &ValidationResult{
        IsValid: false,
        Message: "KYC not verified",
    }, nil
}
```

## Testing Private Data Collections

After redeploying the chaincode with the correct collections_config.json reference, run the test script to verify that all functions work correctly, including those that use private data collections.

```bash
chmod +x deploy-nivix-kyc.sh
./deploy-nivix-kyc.sh

chmod +x test-kyc-chaincode.sh
./test-kyc-chaincode.sh
```

Check the output logs for any errors related to private data collections.

## Additional Resources

- [Hyperledger Fabric Private Data Documentation](https://hyperledger-fabric.readthedocs.io/en/release-2.2/private-data/private-data.html)
- [Hyperledger Fabric Private Data Tutorial](https://hyperledger-fabric.readthedocs.io/en/release-2.2/private_data_tutorial.html) 