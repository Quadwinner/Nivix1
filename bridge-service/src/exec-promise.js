/**
 * Utility for executing shell commands and returning promises
 */

const { exec } = require('child_process');
const util = require('util');

// Create a promisified version of exec
const execPromise = util.promisify(exec);

module.exports = {
  execPromise
}; 