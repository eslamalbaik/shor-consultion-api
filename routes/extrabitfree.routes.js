/**
 * ExtraBitFree API Routes
 * Proxy routes to handle requests to https://api.extrabitfree.com
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

// Base URL for ExtraBitFree API
const EXTRABITFREE_API_BASE = process.env.EXTRABITFREE_API_BASE || 'https://api.extrabitfree.com';

/**
 * Make request to ExtraBitFree API
 */
function makeExtraBitFreeRequest(endpoint, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, EXTRABITFREE_API_BASE);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    // Add authorization if provided
    if (process.env.EXTRABITFREE_API_KEY) {
      options.headers['Authorization'] = `Bearer ${process.env.EXTRABITFREE_API_KEY}`;
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              success: true,
              statusCode: res.statusCode,
              data: parsedData,
              headers: res.headers
            });
          } else {
            reject({
              success: false,
              statusCode: res.statusCode,
              error: parsedData.message || parsedData.error || 'Request failed',
              data: parsedData
            });
          }
        } catch (error) {
          reject({
            success: false,
            statusCode: res.statusCode,
            error: 'Failed to parse response',
            rawResponse: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        success: false,
        error: error.message || 'Network error',
        details: error
      });
    });

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Generic proxy endpoint - forwards any request to ExtraBitFree API
 * POST /api/extrabitfree/*
 */
router.post('*', async (req, res) => {
  try {
    const endpoint = req.path.replace('/api/extrabitfree', '') || '/';
    const method = req.method;
    const data = req.body;
    
    // Forward custom headers if needed
    const customHeaders = {};
    if (req.headers['x-api-key']) {
      customHeaders['X-API-Key'] = req.headers['x-api-key'];
    }
    if (req.headers['authorization']) {
      customHeaders['Authorization'] = req.headers['authorization'];
    }

    console.log(`📤 Forwarding ${method} request to ${EXTRABITFREE_API_BASE}${endpoint}`);
    
    const result = await makeExtraBitFreeRequest(endpoint, method, data, customHeaders);
    
    res.status(result.statusCode || 200).json({
      success: true,
      data: result.data,
      message: 'Request successful'
    });
  } catch (error) {
    console.error('❌ ExtraBitFree API Error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.error || 'Failed to process request',
      details: error.data || error.details
    });
  }
});

/**
 * Generic proxy endpoint - GET requests
 * GET /api/extrabitfree/*
 */
router.get('*', async (req, res) => {
  try {
    const endpoint = req.path.replace('/api/extrabitfree', '') || '/';
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const fullEndpoint = endpoint + queryString;
    
    // Forward custom headers if needed
    const customHeaders = {};
    if (req.headers['x-api-key']) {
      customHeaders['X-API-Key'] = req.headers['x-api-key'];
    }
    if (req.headers['authorization']) {
      customHeaders['Authorization'] = req.headers['authorization'];
    }

    console.log(`📤 Forwarding GET request to ${EXTRABITFREE_API_BASE}${fullEndpoint}`);
    
    const result = await makeExtraBitFreeRequest(fullEndpoint, 'GET', null, customHeaders);
    
    res.status(result.statusCode || 200).json({
      success: true,
      data: result.data,
      message: 'Request successful'
    });
  } catch (error) {
    console.error('❌ ExtraBitFree API Error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.error || 'Failed to process request',
      details: error.data || error.details
    });
  }
});

/**
 * Generic proxy endpoint - PUT requests
 * PUT /api/extrabitfree/*
 */
router.put('*', async (req, res) => {
  try {
    const endpoint = req.path.replace('/api/extrabitfree', '') || '/';
    const data = req.body;
    
    const customHeaders = {};
    if (req.headers['x-api-key']) {
      customHeaders['X-API-Key'] = req.headers['x-api-key'];
    }
    if (req.headers['authorization']) {
      customHeaders['Authorization'] = req.headers['authorization'];
    }

    console.log(`📤 Forwarding PUT request to ${EXTRABITFREE_API_BASE}${endpoint}`);
    
    const result = await makeExtraBitFreeRequest(endpoint, 'PUT', data, customHeaders);
    
    res.status(result.statusCode || 200).json({
      success: true,
      data: result.data,
      message: 'Request successful'
    });
  } catch (error) {
    console.error('❌ ExtraBitFree API Error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.error || 'Failed to process request',
      details: error.data || error.details
    });
  }
});

/**
 * Generic proxy endpoint - DELETE requests
 * DELETE /api/extrabitfree/*
 */
router.delete('*', async (req, res) => {
  try {
    const endpoint = req.path.replace('/api/extrabitfree', '') || '/';
    
    const customHeaders = {};
    if (req.headers['x-api-key']) {
      customHeaders['X-API-Key'] = req.headers['x-api-key'];
    }
    if (req.headers['authorization']) {
      customHeaders['Authorization'] = req.headers['authorization'];
    }

    console.log(`📤 Forwarding DELETE request to ${EXTRABITFREE_API_BASE}${endpoint}`);
    
    const result = await makeExtraBitFreeRequest(endpoint, 'DELETE', null, customHeaders);
    
    res.status(result.statusCode || 200).json({
      success: true,
      data: result.data,
      message: 'Request successful'
    });
  } catch (error) {
    console.error('❌ ExtraBitFree API Error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.error || 'Failed to process request',
      details: error.data || error.details
    });
  }
});

module.exports = { router };

