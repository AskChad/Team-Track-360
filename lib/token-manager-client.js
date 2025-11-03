/**
 * Token Manager Client
 *
 * Connect to the Token Manager running at http://localhost:3737
 *
 * Usage:
 *   const TokenManager = require('./token-manager-client');
 *   const tm = new TokenManager();
 *
 *   // Get all tokens
 *   const tokens = await tm.getTokens();
 *
 *   // Save tokens
 *   await tm.saveTokens(encryptedData);
 */

const TOKEN_MANAGER_URL = process.env.TOKEN_MANAGER_URL || 'http://localhost:3737';

class TokenManagerClient {
  constructor(baseURL) {
    this.baseURL = baseURL || TOKEN_MANAGER_URL;
  }

  /**
   * Get all tokens from the Token Manager
   * @returns {Promise<Object>} Encrypted tokens data
   */
  async getTokens() {
    try {
      const response = await fetch(`${this.baseURL}/api/tokens`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log('No tokens file found - this is normal for first run');
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get tokens:', error.message);
      throw error;
    }
  }

  /**
   * Save encrypted tokens to the Token Manager
   * @param {Object} encryptedData - Encrypted tokens data
   * @returns {Promise<Object>} Success response
   */
  async saveTokens(encryptedData) {
    try {
      const response = await fetch(`${this.baseURL}/api/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(encryptedData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to save tokens:', error.message);
      throw error;
    }
  }

  /**
   * Check if Token Manager is accessible
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const response = await fetch(this.baseURL, {
        method: 'GET'
      });
      // Any response (even 404) means server is running
      return true;
    } catch (error) {
      console.error('Token Manager not accessible:', error.message);
      return false;
    }
  }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TokenManagerClient;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.TokenManagerClient = TokenManagerClient;
}
