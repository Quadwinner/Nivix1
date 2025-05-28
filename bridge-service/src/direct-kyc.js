/**
 * Direct KYC operations using the fabric-invoke.sh script
 * This module provides functions to directly work with KYC data in Hyperledger Fabric
 */

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Use a path without spaces to avoid issues with shell execution
const FABRIC_INVOKE_SCRIPT = '/tmp/fabric-invoke.sh';

/**
 * Store KYC data directly in Hyperledger Fabric using fabric-invoke.sh
 * @param {Object} kycData - KYC data to store
 * @returns {Promise<Object>} - Result of the operation
 */
async function storeKYCDirectly(kycData) {
  try {
    console.log('Storing KYC data directly using fabric-invoke.sh script');
    
    // Check if the script exists at the no-spaces path
    if (!fs.existsSync(FABRIC_INVOKE_SCRIPT)) {
      throw new Error(`fabric-invoke.sh script not found at ${FABRIC_INVOKE_SCRIPT}`);
    }
    
    // Prepare the arguments
    const args = [
      kycData.userId,
      kycData.solanaAddress,
      kycData.fullName,
      'false', // Initially not verified
      kycData.verificationDate,
      kycData.riskScore.toString(),
      kycData.countryCode
    ];
    
    const argsJson = JSON.stringify(args);
    
    // Execute the script
    const command = `${FABRIC_INVOKE_SCRIPT} "StoreKYC" '${argsJson}' "invoke"`;
    console.log('Executing command:', command);
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr && stderr.includes('Error')) {
      console.error('Error storing KYC data:', stderr);
      throw new Error(stderr);
    }
    
    if (stderr && stderr.includes('Chaincode invoke successful')) {
      console.log('KYC data successfully stored in Hyperledger Fabric');
      
      // Also record a compliance event
      await recordComplianceEvent(kycData.userId, 'KYC Document Submission', 
        `User submitted ${kycData.idDocuments.length} identification documents`);
      
      return {
        success: true,
        verification_id: `kyc_${kycData.userId}`,
        status: 'pending',
        message: 'KYC data successfully submitted to Hyperledger Fabric'
      };
    }
    
    console.log('KYC storage response:', stdout);
    throw new Error('Unexpected response from fabric-invoke.sh');
  } catch (error) {
    console.error('Error storing KYC data directly:', error);
    throw error;
  }
}

/**
 * Record a compliance event in Hyperledger Fabric
 * @param {string} userId - User ID
 * @param {string} eventType - Type of compliance event
 * @param {string} description - Description of the event
 * @returns {Promise<void>}
 */
async function recordComplianceEvent(userId, eventType, description) {
  try {
    console.log('Recording compliance event directly using fabric-invoke.sh script');
    
    // Prepare the arguments
    const args = [userId, eventType, description];
    const argsJson = JSON.stringify(args);
    
    // Execute the script
    const command = `${FABRIC_INVOKE_SCRIPT} "RecordComplianceEvent" '${argsJson}' "invoke"`;
    console.log('Executing command:', command);
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr && stderr.includes('Error')) {
      console.error('Error recording compliance event:', stderr);
      throw new Error(stderr);
    }
    
    if (stderr && stderr.includes('Chaincode invoke successful')) {
      console.log('Compliance event successfully recorded in Hyperledger Fabric');
      return;
    }
    
    console.log('Compliance event response:', stdout);
  } catch (error) {
    console.error('Error recording compliance event directly:', error);
    // Don't throw, just log the error since this is secondary
  }
}

/**
 * Get KYC status directly from Hyperledger Fabric
 * @param {string} solanaAddress - Solana wallet address to query
 * @returns {Promise<Object|null>} - KYC status or null if not found
 */
async function getKYCStatusDirectly(solanaAddress) {
  try {
    console.log(`Getting KYC status for ${solanaAddress} directly using fabric-invoke.sh script`);
    
    // Prepare the arguments
    const args = [solanaAddress];
    const argsJson = JSON.stringify(args);
    
    // Execute the script
    const command = `${FABRIC_INVOKE_SCRIPT} "GetKYCStatus" '${argsJson}' "query"`;
    console.log('Executing command:', command);
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr && stderr.includes('no KYC record found')) {
      console.log(`No KYC record found for address ${solanaAddress}`);
      return null;
    }
    
    if (stderr && stderr.includes('Error') && !stderr.includes('no KYC record found')) {
      console.error('Error getting KYC status:', stderr);
      throw new Error(stderr);
    }
    
    // Try to parse the JSON result
    try {
      // Now we should have clean JSON in stdout
      const cleanOutput = stdout.trim();
      console.log('Raw output:', cleanOutput);
      
      // Parse the JSON output
      const kycStatus = JSON.parse(cleanOutput);
      console.log('KYC status retrieved:', kycStatus);
      
      return {
        verified: kycStatus.kycVerified === true || kycStatus.kycVerified === 'true',
        userId: kycStatus.userId,
        status: kycStatus.kycVerified === true || kycStatus.kycVerified === 'true' ? 'verified' : 'pending',
        countryCode: kycStatus.countryCode
      };
    } catch (parseError) {
      console.error('Error parsing KYC status result:', parseError);
      console.error('Raw output was:', stdout);
      throw new Error(`Failed to parse KYC status result: ${parseError.message}`);
    }
  } catch (error) {
    console.error('Error getting KYC status directly:', error);
    throw error;
  }
}

module.exports = {
  storeKYCDirectly,
  getKYCStatusDirectly,
  recordComplianceEvent
}; 