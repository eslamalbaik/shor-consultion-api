/**
 * Zoho OAuth2 Token Manager
 * Handles token refresh automatically when INVALID_TOKEN is received
 */

const https = require('https');
const querystring = require('querystring');

class ZohoTokenManager {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.refreshToken = config.refreshToken;
    this.redirectUri = config.redirectUri;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.refreshingPromise = null;
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken() {
    // If already refreshing, return the existing promise
    if (this.refreshingPromise) {
      return this.refreshingPromise;
    }

    this.refreshingPromise = new Promise((resolve, reject) => {
      const postData = querystring.stringify({
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'refresh_token'
      });

      const options = {
        hostname: 'accounts.zoho.com',
        path: '/oauth/v2/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);

            if (res.statusCode === 200 && response.access_token) {
              // Check if scope is correct
              if (response.scope && !response.scope.includes('ZohoCRM')) {
                console.warn('⚠️  Warning: Token scope does not include ZohoCRM. Current scope:', response.scope);
                console.warn('⚠️  This may cause "OAUTH_SCOPE_MISMATCH" errors when accessing CRM APIs.');
              }
              
              this.accessToken = response.access_token;
              // Set expiry time (Zoho tokens typically expire in 1 hour)
              // We'll refresh 5 minutes before expiry
              const expiresIn = (response.expires_in || 3600) * 1000;
              this.tokenExpiry = Date.now() + expiresIn - (5 * 60 * 1000);
              
              console.log('✅ Access token refreshed successfully');
              resolve(this.accessToken);
            } else {
              const error = response.error || 'Unknown error';
              const errorDescription = response.error_description || response.message || '';
              
              // Check for scope mismatch error
              if (error === 'invalid_client' || errorDescription.includes('scope') || errorDescription.includes('OAUTH_SCOPE')) {
                console.error('❌ Token refresh failed - SCOPE ERROR:');
                console.error('   Your refresh token has insufficient scope.');
                console.error('   Current scope:', response.scope || 'unknown');
                console.error('   Required scope: ZohoCRM.modules.ALL,ZohoCRM.settings.ALL');
                console.error('');
                console.error('   🔧 Solution: Regenerate refresh token with correct scope.');
                console.error('   📖 See: FIX_SCOPE_STEPS_AR.md or SCOPE_ERROR_FIX.md');
                reject(new Error('OAUTH_SCOPE_MISMATCH: Refresh token has insufficient scope. Please regenerate with ZohoCRM scope.'));
              } else {
                console.error('❌ Token refresh failed:', error);
                reject(new Error(`Token refresh failed: ${error} - ${errorDescription}`));
              }
            }
          } catch (error) {
            console.error('❌ Error parsing token response:', error);
            reject(new Error('Failed to parse token response'));
          } finally {
            this.refreshingPromise = null;
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ Token refresh request error:', error);
        this.refreshingPromise = null;
        reject(error);
      });

      req.write(postData);
      req.end();
    });

    return this.refreshingPromise;
  }

  /**
   * Get a valid access token (refresh if needed)
   */
  async getValidAccessToken() {
    // Check if token exists and is not expired
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Token expired or doesn't exist, refresh it
    return await this.refreshAccessToken();
  }

  /**
   * Check if error is INVALID_TOKEN and handle refresh
   */
  isInvalidTokenError(error) {
    if (!error) {
      return false;
    }

    // If error has a code property that is INVALID_TOKEN
    if (error.code === 'INVALID_TOKEN' || error.code === 'AUTHENTICATION_FAILURE') {
      return true;
    }

    // Check error message/string representation
    const errorString = error.message 
      ? error.message.toUpperCase()
      : String(error).toUpperCase();
    
    const errorJsonString = JSON.stringify(error).toUpperCase();
    
    return errorString.includes('INVALID_TOKEN') || 
           errorString.includes('INVALID_OAUTH') ||
           errorString.includes('AUTHENTICATION_FAILURE') ||
           errorJsonString.includes('INVALID_TOKEN') ||
           errorJsonString.includes('AUTHENTICATION_FAILURE');
  }

  /**
   * Handle API call with automatic token refresh on INVALID_TOKEN
   */
  async executeWithRetry(apiCall) {
    try {
      // Get valid token
      const token = await this.getValidAccessToken();
      
      // Execute API call
      return await apiCall(token);
    } catch (error) {
      // Check if it's an INVALID_TOKEN error
      if (this.isInvalidTokenError(error)) {
        console.log('🔄 INVALID_TOKEN detected, refreshing token and retrying...');
        
        // Force refresh token
        this.accessToken = null;
        this.tokenExpiry = null;
        
        try {
          // Refresh token
          const newToken = await this.refreshAccessToken();
          
          // Retry the API call with new token
          return await apiCall(newToken);
        } catch (refreshError) {
          console.error('❌ Failed to refresh token:', refreshError);
          throw new Error('Failed to refresh access token: ' + refreshError.message);
        }
      }
      
      // If not INVALID_TOKEN error, throw original error
      throw error;
    }
  }
}

module.exports = ZohoTokenManager;

