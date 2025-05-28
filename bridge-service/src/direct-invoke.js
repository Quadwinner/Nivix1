/**
 * Hyperledger Fabric direct chaincode invocation utility
 * This script provides a helper function to invoke chaincode directly through 
 * the Fabric SDK's lower-level APIs to bypass discovery service issues.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Use a path without spaces to avoid issues with shell execution
const FABRIC_INVOKE_SCRIPT = '/tmp/fabric-invoke.sh';

/**
 * Directly invoke Hyperledger Fabric chaincode using SDK and CLI fallback
 * @param {string} functionName - The chaincode function to call
 * @param {Array<string>} args - Arguments for the chaincode function
 * @param {boolean} isQuery - Whether this is a query (read) or invoke (write)
 * @returns {Promise<any>} - The result of the chaincode invocation
 */
async function directInvokeChaincode(functionName, args, isQuery = false) {
  console.log(`\n======= CHAINCODE ${isQuery ? 'QUERY' : 'INVOKE'} =======`);
  console.log(`Function: ${functionName}`);
  console.log(`Arguments: ${JSON.stringify(args)}`);
  console.log(`Operation type: ${isQuery ? 'Query (Read)' : 'Invoke (Write)'}`);
  console.log('======================================\n');
  
  try {
    // Check if the script exists
    if (!fs.existsSync(FABRIC_INVOKE_SCRIPT)) {
      console.error(`Fabric invoke script not found at: ${FABRIC_INVOKE_SCRIPT}`);
      throw new Error(`Fabric invoke script not found at: ${FABRIC_INVOKE_SCRIPT}`);
    }
    
    const type = isQuery ? 'query' : 'invoke';
    const argsJson = JSON.stringify(args);
    
    // Build the command
    const command = `${FABRIC_INVOKE_SCRIPT} "${functionName}" '${argsJson}' "${type}"`;
    
    console.log(`=== Executing fabric invoke script for ${type.toUpperCase()} ===`);
    console.log(`Command: ${command}`);
    console.log('======================================');
    
    // Execute the command
    try {
      const { stdout, stderr } = await execPromise(command);
      
      console.log('=== COMMAND EXECUTION COMPLETED ===');
      console.log('STDOUT:');
      console.log(stdout);
      
      if (stderr) {
        console.log('STDERR:');
        console.log(stderr);
        
        // For invoke operations, success messages might be in stderr
        if (stderr.includes('Chaincode invoke successful')) {
          console.log('Found success message in stderr - operation was successful');
        }
      }
      
      // Try to extract JSON from the output
      let result = stdout.trim();
      if (type === 'query' && result) {
        try {
          // Validate the result is proper JSON before returning
          JSON.parse(result);
          console.log('Successfully parsed result as JSON');
        } catch (jsonError) {
          console.error('Result is not valid JSON, returning as is');
        }
      }
      
      console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} result:`, result);
      return result;
    } catch (execError) {
      console.error('=== COMMAND EXECUTION FAILED ===');
      console.error('Error executing command:', execError.message);
      
      if (execError.stdout) {
        console.log('STDOUT from failed command:');
        console.log(execError.stdout);
      }
      
      if (execError.stderr) {
        console.log('STDERR from failed command:');
        console.log(execError.stderr);
      }
      
      throw execError;
    }
  } catch (error) {
    console.error(`=== FAILED TO INVOKE CHAINCODE DIRECTLY USING FABRIC INVOKE SCRIPT ===`);
    console.error('Error details:', error);
    console.error('=========================================================');
    throw error;
  }
}

module.exports = {
  directInvokeChaincode
}; 