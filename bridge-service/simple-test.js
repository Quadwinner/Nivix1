    const { execSync } = require('child_process');
const fs = require('fs');

function getKYCStatus(solanaAddress) {
  try {
    console.log(`Testing KYC for ${solanaAddress}`);
    
    // Run the command and capture output to a file
    execSync(`./fabric-invoke.sh "GetKYCStatus" '["${solanaAddress}"]' "query" > output.json 2> error.log`);
    
    // Read the output file
    const output = fs.readFileSync('output.json', 'utf8');
    console.log('Command output:', output);
    
    // Find the JSON part in the output
    const startIdx = output.indexOf('{');
    const endIdx = output.lastIndexOf('}');
    
    if (startIdx >= 0 && endIdx >= 0) {
      const jsonStr = output.substring(startIdx, endIdx + 1);
      console.log('Extracted JSON string:', jsonStr);
      
      try {
        const kycData = JSON.parse(jsonStr);
        console.log('Successfully parsed KYC data:', kycData);
        
        return {
          success: true,
          verified: kycData.kycVerified === true || kycData.kycVerified === 'true',
          userId: kycData.userId,
          countryCode: kycData.countryCode
        };
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        return null;
      }
    } else {
      console.log('No JSON data found in output');
      return null;
    }
  } catch (error) {
    console.error('Error executing command:', error.message);
    return null;
  } finally {
    // Clean up
    try {
      fs.unlinkSync('output.json');
      fs.unlinkSync('error.log');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Test with the specified address
const testAddress = '8VyJ4EgKeto2vhVzq2wgwD9GrFz1wcWnGHP97buwxZj2';
try {
  const result = getKYCStatus(testAddress);
  console.log('Final result:', result);
} catch (error) {
  console.error('Test failed:', error);
} 