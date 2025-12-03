/**
 * Zoho CRM Routes
 * Handles form submissions and integration with Zoho CRM
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const ZohoTokenManager = require('../utils/tokenManager');

// Initialize token manager (will be set by server)
let tokenManager = null;

/**
 * Initialize token manager with config
 */
function initializeTokenManager(config) {
  tokenManager = new ZohoTokenManager(config);
}

/**
 * Make API request to Zoho CRM
 */
function makeZohoAPIRequest(token, endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, process.env.ZOHO_API_BASE || 'https://www.zohoapis.com');
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

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
            // Check for INVALID_TOKEN - Zoho returns various formats
            const errorMessage = parsed.error?.message || parsed.message || parsed.data?.[0]?.message || parsed.data?.[0]?.status || 'API request failed';
            const errorCode = parsed.code || parsed.error?.code || parsed.data?.[0]?.code || 'API_ERROR';
            
            // Get detailed error information
            const errorDetails = parsed.data?.[0]?.details || parsed.data?.[0] || parsed.error || parsed;
            
            const error = {
              code: errorCode,
              message: errorMessage,
              statusCode: res.statusCode,
              details: errorDetails,
              fullResponse: parsed
            };

            // Check if it's an invalid token error (401 or specific error codes)
            const errorString = JSON.stringify(parsed).toUpperCase();
            if (res.statusCode === 401 ||
                errorCode === 'INVALID_TOKEN' ||
                errorCode === 'AUTHENTICATION_FAILURE' ||
                errorMessage.toUpperCase().includes('INVALID_TOKEN') ||
                errorMessage.toUpperCase().includes('INVALID_OAUTH') ||
                errorString.includes('INVALID_TOKEN') ||
                errorString.includes('AUTHENTICATION_FAILURE')) {
              error.code = 'INVALID_TOKEN';
            }

            reject(error);
          }
        } catch (error) {
          reject({
            code: 'PARSE_ERROR',
            message: 'Failed to parse API response',
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

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Create a lead or contact in Zoho CRM from form submission
 */
async function createZohoRecord(token, recordData) {
  // Determine if this should be a Lead or Contact
  // You can customize this logic based on your needs
  const module = recordData.module || 'Leads'; // Default to Leads

  const endpoint = `/crm/v3/${module}`;
  
  // Format phone number (clean and validate)
  const formatPhoneNumber = (phone) => {
    if (!phone || phone.trim() === '') return '';
    
    // Remove all non-digit characters
    let cleaned = phone.trim().replace(/[^\d]/g, '');
    
    // If empty after cleaning, return empty
    if (!cleaned || cleaned === '') return '';
    
    // If it already starts with a country code (966 for Saudi, or other international codes)
    // Check for Saudi number first
    if (cleaned.startsWith('966')) {
      const numberAfter966 = cleaned.substring(3);
      
      // If the number after 966 starts with another country code (like 1 for USA),
      // it means the user entered a wrong number format. Use the number after 966 as-is.
      if (numberAfter966.startsWith('1') && numberAfter966.length >= 10) {
        // This is likely a US number that was incorrectly prefixed with 966
        return '+' + numberAfter966;
      }
      
      // Normal Saudi number processing
      // If it starts with 0, remove it
      const finalNumber = numberAfter966.startsWith('0') ? numberAfter966.substring(1) : numberAfter966;
      
      // Validate that it's a valid Saudi number (9 digits starting with 5)
      if (finalNumber.length === 9 && finalNumber.startsWith('5')) {
        return '+966' + finalNumber;
      }
      
      // If it's 10 digits and starts with 5, it might be valid
      if (finalNumber.length === 10 && finalNumber.startsWith('5')) {
        return '+966' + finalNumber;
      }
      
      // If it doesn't look like a Saudi number, return as is (might be international)
      return '+' + cleaned;
    }
    
    // Check for other international country codes (1-3 digits)
    // Common patterns: 1xxx (USA), 44xxx (UK), etc.
    // If the number is longer than 10 digits, it likely has a country code
    if (cleaned.length > 10) {
      // Try to detect country code
      // For numbers starting with 1 (USA/Canada), keep as is
      if (cleaned.startsWith('1') && cleaned.length === 11) {
        return '+' + cleaned;
      }
      // For other international numbers, return as is (user entered full international number)
      // But only if it's clearly not a Saudi number
      if (!cleaned.startsWith('5')) {
        return '+' + cleaned;
      }
    }
    
    // If it starts with 0, replace with +966
    if (cleaned.startsWith('0')) {
      return '+966' + cleaned.substring(1);
    }
    
    // For Saudi numbers (9 digits starting with 5), add +966
    if (cleaned.length === 9 && cleaned.startsWith('5')) {
      return '+966' + cleaned;
    }
    
    // If it's 10 digits and starts with 5, it might be Saudi number with leading digit
    if (cleaned.length === 10 && cleaned.startsWith('5')) {
      return '+966' + cleaned;
    }
    
    // For other cases, assume it's a Saudi number without country code
    return '+966' + cleaned;
  };

  const phoneNumber = recordData.phone || recordData.mobile || '';
  const formattedPhone = formatPhoneNumber(phoneNumber);

  // Build base record
  const baseRecord = {
    Last_Name: recordData.lastName || recordData.name || 'N/A',
    First_Name: recordData.firstName || '',
    Email: recordData.email || '',
    Phone: formattedPhone,
    Description: recordData.description || recordData.message || recordData.question || '',
    Lead_Source: recordData.leadSource || 'Website Form'
  };

  // Add additional fields based on module type
  if (module === 'Leads') {
    // Use Company field for file number in medical consultations
    if (recordData.fileNumber) {
      baseRecord.Company = recordData.fileNumber;
    } else if (recordData.company) {
      baseRecord.Company = recordData.company;
    }
    
    // Set Lead Status from custom fields
    if (recordData.customFields && recordData.customFields.Status) {
      baseRecord.Lead_Status = recordData.customFields.Status;
    }
  }

  if (module === 'Contacts') {
    if (recordData.accountName) baseRecord.Account_Name = recordData.accountName;
  }

  // Prepare custom fields (excluding Status as it's handled above)
  const customFields = { ...recordData.customFields };
  if (customFields.Status) {
    delete customFields.Status; // Already used in Lead_Status
  }

  // Clean and format custom fields
  const cleanedCustomFields = {};
  for (const [key, value] of Object.entries(customFields)) {
    // Skip null, undefined, or empty strings
    if (value !== null && value !== undefined && value !== '') {
      // Format phone fields (field2 is phone type)
      if (key === 'field2' && typeof value === 'string') {
        // Format phone number for field2 (custom phone field)
        const phoneValue = formatPhoneNumber(value);
        if (phoneValue) {
          cleanedCustomFields[key] = phoneValue;
        }
        continue;
      }
      // Format datetime fields (field is datetime type)
      if (key === 'field' && typeof value === 'string') {
        // Zoho datetime requires full ISO 8601 format: YYYY-MM-DDTHH:mm:ss+HH:mm
        // Convert date string (YYYY-MM-DD) to ISO datetime format
        try {
          // Check if it's a date-only format (YYYY-MM-DD)
          if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Date only format, add time component with timezone
            const date = new Date(value + 'T00:00:00');
            if (!isNaN(date.getTime())) {
              // Get timezone offset
              const timezoneOffset = -date.getTimezoneOffset();
              const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60).toString().padStart(2, '0');
              const offsetMinutes = (Math.abs(timezoneOffset) % 60).toString().padStart(2, '0');
              const offsetSign = timezoneOffset >= 0 ? '+' : '-';
              // Format: YYYY-MM-DDTHH:mm:ss+HH:mm
              cleanedCustomFields[key] = `${value}T00:00:00${offsetSign}${offsetHours}:${offsetMinutes}`;
            } else {
              // Fallback: use Saudi Arabia timezone
              cleanedCustomFields[key] = `${value}T00:00:00+03:00`;
            }
          } else if (value.includes('T')) {
            // Already has time component, use as is
            cleanedCustomFields[key] = value;
          } else {
            // Invalid format, skip this field
            console.warn(`⚠️  Invalid date format for field '${key}': ${value} - skipping`);
            continue;
          }
        } catch (e) {
          console.warn(`⚠️  Error formatting date for field '${key}': ${e.message} - skipping`);
          continue;
        }
      } else {
        cleanedCustomFields[key] = value;
      }
    }
  }

  // Merge custom fields (they take precedence)
  const finalRecord = {
    ...baseRecord,
    ...cleanedCustomFields
  };

  // Remove any undefined or null values from final record
  const cleanedRecord = {};
  for (const [key, value] of Object.entries(finalRecord)) {
    if (value !== null && value !== undefined) {
      cleanedRecord[key] = value;
    }
  }

  // Log the data being sent for debugging
  console.log('📤 Sending to Zoho CRM:', JSON.stringify(cleanedRecord, null, 2));

  const zohoData = {
    data: [cleanedRecord]
  };

  const result = await makeZohoAPIRequest(token, endpoint, 'POST', zohoData);
  
  // Log response for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('📥 Response from Zoho CRM:', JSON.stringify(result, null, 2));
  }

  return result;
}

/**
 * Upload file to Zoho CRM as attachment
 * Uses Zoho CRM v2 API endpoint for attachments
 */
async function uploadAttachmentToZoho(token, recordId, module, fileUrl, fileName) {
  return new Promise((resolve, reject) => {
    // First, download the file from URL
    const url = new URL(fileUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    
    protocol.get(fileUrl, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download file: ${response.statusCode}`));
      }
      
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const fileBuffer = Buffer.concat(chunks);
        
        // Use Zoho CRM v2 API for attachments (as per Zoho documentation)
        const zohoUrl = `${process.env.ZOHO_API_BASE || 'https://www.zohoapis.com'}/crm/v2/${module}/${recordId}/attachments`;
        const urlObj = new URL(zohoUrl);
        
        // Create multipart form data
        const boundary = '----WebKitFormBoundary' + Date.now().toString(36);
        const contentType = response.headers['content-type'] || 'application/octet-stream';
        
        // Build multipart body
        const bodyParts = [];
        
        // Form field header
        bodyParts.push(Buffer.from(`--${boundary}\r\n`));
        bodyParts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName.replace(/"/g, '\\"')}"\r\n`));
        bodyParts.push(Buffer.from(`Content-Type: ${contentType}\r\n\r\n`));
        
        // File content
        bodyParts.push(fileBuffer);
        
        // Closing boundary
        bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
        
        const body = Buffer.concat(bodyParts);
        
        const options = {
          hostname: urlObj.hostname,
          path: urlObj.pathname,
          method: 'POST',
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length
          }
        };
        
        // Create HTTPS request
        const req = https.request(options, (res) => {
          let responseData = '';
          
          res.on('data', (chunk) => {
            responseData += chunk;
          });
          
          res.on('end', () => {
            try {
              const parsed = JSON.parse(responseData);
              if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`✅ Attachment uploaded successfully: ${fileName}`);
                resolve(parsed);
              } else {
                console.error(`❌ Failed to upload attachment ${fileName}:`, JSON.stringify(parsed, null, 2));
                reject({
                  code: 'ATTACHMENT_ERROR',
                  message: parsed.error?.message || parsed.message || parsed.response?.message || 'Failed to upload attachment',
                  statusCode: res.statusCode,
                  details: parsed
                });
              }
            } catch (error) {
              console.error(`❌ Error parsing attachment response for ${fileName}:`, error);
              console.error(`Raw response:`, responseData);
              reject({
                code: 'PARSE_ERROR',
                message: 'Failed to parse attachment response',
                statusCode: res.statusCode,
                rawResponse: responseData
              });
            }
          });
        });
        
        req.on('error', (error) => {
          console.error(`❌ Request error uploading ${fileName}:`, error);
          reject({
            code: 'REQUEST_ERROR',
            message: error.message,
            error: error
          });
        });
        
        // Write body to request
        req.write(body);
        req.end();
      });
      
      response.on('error', (error) => {
        console.error(`❌ Download stream error for ${fileName}:`, error);
        reject({
          code: 'DOWNLOAD_STREAM_ERROR',
          message: error.message,
          error: error
        });
      });
    }).on('error', (error) => {
      console.error(`❌ Download error for ${fileName}:`, error);
      reject({
        code: 'DOWNLOAD_ERROR',
        message: error.message,
        error: error
      });
    });
  });
}

/**
 * POST /api/zoho/submit
 * Submit form data to Zoho CRM
 */
router.post('/submit', async (req, res) => {
  try {
    if (!tokenManager) {
      return res.status(500).json({
        success: false,
        error: 'Token manager not initialized'
      });
    }

    const {
      name,
      email,
      phone,
      mobile,
      message,
      question,
      module = 'Leads', // 'Leads' or 'Contacts'
      leadSource = 'Website Form',
      firstName,
      lastName,
      company,
      fileNumber,
      description,
      customFields = {},
      attachments = []
    } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Prepare record data
    const recordData = {
      name: name || '',
      email: email,
      phone: phone || mobile || '',
      message: message || question || description || '',
      module: module,
      leadSource: leadSource,
      firstName: firstName,
      lastName: lastName,
      company: company,
      fileNumber: fileNumber,
      customFields: customFields
    };

    // Execute with automatic token refresh on INVALID_TOKEN
    const result = await tokenManager.executeWithRetry(async (token) => {
      return await createZohoRecord(token, recordData);
    });

    // Check if record was created successfully
    if (result.data && result.data.length > 0) {
      const recordResult = result.data[0];
      
      if (recordResult.status === 'success') {
        const leadId = recordResult.details?.id;
        
        // Upload attachments if any
        if (attachments && attachments.length > 0 && leadId) {
          try {
            const token = await tokenManager.getValidAccessToken();
            const uploadPromises = attachments.map(async (attachment) => {
              try {
                const fileUrl = attachment.url || (attachment.path ? 
                  `https://hgzqqxqvkshomuysdwfo.supabase.co/storage/v1/object/public/consultation-attachments/${attachment.path}` : null);
                
                if (fileUrl) {
                  await uploadAttachmentToZoho(token, leadId, module, fileUrl, attachment.name);
                  console.log(`✅ Uploaded attachment: ${attachment.name}`);
                }
              } catch (error) {
                console.error(`⚠️  Failed to upload attachment ${attachment.name}:`, error.message);
                // Don't fail the whole request if attachment upload fails
              }
            });
            
            await Promise.all(uploadPromises);
            console.log(`✅ All attachments processed for Lead ${leadId}`);
          } catch (error) {
            console.error('⚠️  Error uploading attachments:', error.message);
            // Don't fail the whole request if attachment upload fails
          }
        }
        
        return res.status(200).json({
          success: true,
          message: 'Form submitted successfully to Zoho CRM',
          data: {
            id: leadId,
            module: module
          }
        });
      } else {
        // Record created but with warnings/errors
        console.warn('⚠️ Zoho record created with warnings:', recordResult);
        return res.status(200).json({
          success: true,
          message: 'Form submitted to Zoho CRM with warnings',
          data: {
            id: recordResult.details?.id,
            module: module,
            warnings: recordResult.message || recordResult.details
          }
        });
      }
    } else {
      // Log the full response for debugging
      console.error('❌ Failed to create record. Full response:', JSON.stringify(result, null, 2));
      return res.status(500).json({
        success: false,
        error: 'Failed to create record in Zoho CRM',
        details: process.env.NODE_ENV === 'development' ? result : undefined
      });
    }

  } catch (error) {
    console.error('❌ Zoho submission error:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));

    // Handle specific error types
    if (error.code === 'INVALID_TOKEN') {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed. Please check your Zoho credentials.'
      });
    }

    // Handle INVALID_DATA error with more details
    if (error.code === 'INVALID_DATA' || error.statusCode === 400) {
      console.error('❌ INVALID_DATA - Full error details:');
      console.error(JSON.stringify(error.details, null, 2));
      console.error('❌ Full error object:');
      console.error(JSON.stringify(error, null, 2));
      
      // Try to extract field-specific errors
      const fieldErrors = [];
      if (error.details?.data && Array.isArray(error.details.data)) {
        error.details.data.forEach((item, index) => {
          if (item.details) {
            fieldErrors.push(`Record ${index + 1}: ${JSON.stringify(item.details)}`);
          }
          if (item.message) {
            fieldErrors.push(`Record ${index + 1}: ${item.message}`);
          }
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'Invalid data sent to Zoho CRM',
        message: error.message,
        fieldErrors: fieldErrors.length > 0 ? fieldErrors : undefined,
        details: error.details || error
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred while submitting to Zoho CRM',
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/zoho/test
 * Test endpoint to verify Zoho connection
 */
router.get('/test', async (req, res) => {
  try {
    if (!tokenManager) {
      return res.status(500).json({
        success: false,
        error: 'Token manager not initialized'
      });
    }

    // Test by getting a valid token
    const token = await tokenManager.getValidAccessToken();

    // Optionally, make a test API call
    const result = await tokenManager.executeWithRetry(async (token) => {
      return await makeZohoAPIRequest(token, '/crm/v3/settings/modules', 'GET');
    });

    return res.status(200).json({
      success: true,
      message: 'Zoho connection is working',
      data: {
        modulesCount: result.modules?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Zoho test error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect to Zoho CRM',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

module.exports = {
  router,
  initializeTokenManager
};
