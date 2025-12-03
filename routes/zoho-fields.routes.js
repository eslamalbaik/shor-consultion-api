/**
 * Zoho CRM Fields Routes
 * Get available fields from Zoho CRM
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const ZohoTokenManager = require('../utils/tokenManager');

// Initialize token manager (will be set by server)
let tokenManager = null;

function initializeTokenManager(config) {
  tokenManager = new ZohoTokenManager(config);
}

/**
 * Get fields from Zoho CRM API
 */
function getZohoFields(token, module = 'Leads') {
  return new Promise((resolve, reject) => {
    const url = new URL(`/crm/v3/settings/fields?module=${module}`, process.env.ZOHO_API_BASE || 'https://www.zohoapis.com');
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({
              code: 'API_ERROR',
              message: parsed.error?.message || 'Failed to fetch fields',
              statusCode: res.statusCode,
              details: parsed
            });
          }
        } catch (error) {
          reject({
            code: 'PARSE_ERROR',
            message: 'Failed to parse fields response',
            statusCode: res.statusCode,
            rawResponse: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        code: 'REQUEST_ERROR',
        message: error.message,
        error: error
      });
    });

    req.end();
  });
}

/**
 * GET /api/zoho/fields
 * Get all fields from Zoho CRM
 */
router.get('/fields', async (req, res) => {
  try {
    if (!tokenManager) {
      return res.status(500).json({
        success: false,
        error: 'Token manager not initialized'
      });
    }

    const module = req.query.module || 'Leads';

    const result = await tokenManager.executeWithRetry(async (token) => {
      return await getZohoFields(token, module);
    });

    // Filter and format fields
    const allFields = result.fields || [];
    const customFields = allFields.filter(f => f.custom_field === true);
    const standardFields = allFields.filter(f => !f.custom_field);

    // Format for easier reading
    const formattedCustomFields = customFields.map(field => ({
      displayLabel: field.display_label,
      apiName: field.api_name,
      dataType: field.data_type,
      required: field.required,
      systemMandatory: field.system_mandatory
    }));

    return res.status(200).json({
      success: true,
      module: module,
      totalFields: allFields.length,
      customFieldsCount: customFields.length,
      standardFieldsCount: standardFields.length,
      customFields: formattedCustomFields,
      // Also include full custom fields data
      allCustomFields: customFields
    });

  } catch (error) {
    console.error('❌ Error fetching fields:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch fields from Zoho CRM',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

module.exports = {
  router,
  initializeTokenManager
};

