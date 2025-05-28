/**
 * File-based persistent storage for KYC data
 * This module provides functions to store and retrieve KYC data from a JSON file
 */

const fs = require('fs');
const path = require('path');

// Path to the KYC data storage file
const KYC_DATA_FILE = path.join(process.cwd(), 'kyc-data-store.json');

// Initialize the storage file if it doesn't exist
function initStorage() {
  if (!fs.existsSync(KYC_DATA_FILE)) {
    fs.writeFileSync(KYC_DATA_FILE, JSON.stringify({}, null, 2));
    console.log('Created new KYC data storage file');
  }
}

// Load KYC data from file
function loadKYCData() {
  try {
    initStorage();
    const data = fs.readFileSync(KYC_DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading KYC data from file:', error);
    return {};
  }
}

// Save KYC data to file
function saveKYCData(data) {
  try {
    fs.writeFileSync(KYC_DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving KYC data to file:', error);
    return false;
  }
}

/**
 * Store KYC data in the file storage
 * @param {string} solanaAddress - The Solana wallet address as the key
 * @param {Object} kycData - The KYC data to store
 * @returns {boolean} - Success status
 */
function storeKYC(solanaAddress, kycData) {
  try {
    const allData = loadKYCData();
    allData[solanaAddress] = {
      ...kycData,
      lastUpdated: new Date().toISOString()
    };
    return saveKYCData(allData);
  } catch (error) {
    console.error('Error storing KYC data in file storage:', error);
    return false;
  }
}

/**
 * Get KYC data from the file storage
 * @param {string} solanaAddress - The Solana wallet address to lookup
 * @returns {Object|null} - The KYC data or null if not found
 */
function getKYC(solanaAddress) {
  try {
    const allData = loadKYCData();
    return allData[solanaAddress] || null;
  } catch (error) {
    console.error('Error getting KYC data from file storage:', error);
    return null;
  }
}

// Initialize storage on module load
initStorage();

module.exports = {
  storeKYC,
  getKYC
}; 