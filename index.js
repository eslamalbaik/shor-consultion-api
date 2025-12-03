/**
 * Express Server
 * Main server file with Zoho CRM integration
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Fix for duplicate CORS headers - intercept setHeader globally
const originalSetHeader = express.response.setHeader;
express.response.setHeader = function(name, value) {
  if (name && name.toLowerCase() === 'access-control-allow-origin') {
    // Remove any existing headers first
    try {
      if (this.getHeader('Access-Control-Allow-Origin')) {
        this.removeHeader('Access-Control-Allow-Origin');
      }
    } catch (e) {
      // Ignore if header doesn't exist
    }
    // Normalize value - take first value if comma-separated, remove trailing slash
    const normalizedValue = String(value).split(',')[0].trim().replace(/\/+$/, '');
    console.log(`🔧 Setting CORS header: ${normalizedValue} (from: ${value})`);
    return originalSetHeader.call(this, 'Access-Control-Allow-Origin', normalizedValue);
  }
  return originalSetHeader.call(this, name, value);
};

// Import Zoho routes
const { router: zohoRouter, initializeTokenManager: initZohoTokenManager } = require('./routes/zoho.routes');
const { router: zohoFieldsRouter, initializeTokenManager: initZohoFieldsTokenManager } = require('./routes/zoho-fields.routes');
// Import ExtraBitFree routes
const { router: extrabitfreeRouter } = require('./routes/extrabitfree.routes');

const app = express();

// Middleware - CORS Configuration
const isDevelopment = process.env.NODE_ENV !== 'production';

// Clean and normalize allowed origins
function getAllowedOrigins() {
  if (!process.env.FRONTEND_URL) {
    return ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000'];
  }
  
  // Split by comma and clean each URL
  const urls = process.env.FRONTEND_URL
    .split(',')
    .map(url => {
      // Remove leading/trailing whitespace
      url = url.trim();
      // Remove trailing slash
      url = url.replace(/\/+$/, '');
      return url;
    })
    .filter(url => url.length > 0) // Remove empty strings
    .filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates
  
  // Log for debugging
  console.log('🌍 CORS Allowed Origins:', urls);
  console.log('🌍 FRONTEND_URL from env:', process.env.FRONTEND_URL);
  
  return urls;
}

const allowedOrigins = getAllowedOrigins();

// CORS middleware - use single origin string if only one origin to avoid duplicates
let corsOrigin;
if (allowedOrigins.length === 1) {
  // Use single origin string to prevent duplicate headers
  corsOrigin = allowedOrigins[0];
  console.log(`🔧 Using single CORS origin: ${corsOrigin}`);
} else {
  // Use function for multiple origins
  corsOrigin = function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // In development, allow all localhost origins
    if (isDevelopment) {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    // Normalize origin (remove trailing slash)
    const normalizedOrigin = origin.replace(/\/+$/, '');
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(normalizedOrigin) !== -1) {
      return callback(null, true);
    }
    
    // Block the request
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    console.warn(`⚠️  CORS blocked origin: ${origin} (allowed: ${allowedOrigins.join(', ')})`);
    callback(new Error(msg), false);
  };
}

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Final middleware to clean up CORS headers before sending response
app.use((req, res, next) => {
  // Intercept res.end to clean headers before sending
  const originalEnd = res.end.bind(res);
  res.end = function(...args) {
    // Get all headers
    const headers = res.getHeaders();
    const corsHeaderValue = headers['access-control-allow-origin'];
    
    if (corsHeaderValue) {
      // Normalize: take first value, remove trailing slash
      const normalizedValue = String(corsHeaderValue).split(',')[0].trim().replace(/\/+$/, '');
      
      // Remove all existing headers (in case of duplicates)
      try {
        res.removeHeader('Access-Control-Allow-Origin');
      } catch (e) {
        // Ignore
      }
      
      // Set only one normalized header
      res.setHeader('Access-Control-Allow-Origin', normalizedValue);
      console.log(`✅ Final CORS header: ${normalizedValue} (was: ${corsHeaderValue})`);
    }
    
    return originalEnd.apply(this, args);
  };
  
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Zoho Token Manager
const zohoConfig = {
  clientId: process.env.ZOHO_CLIENT_ID,
  clientSecret: process.env.ZOHO_CLIENT_SECRET,
  refreshToken: process.env.ZOHO_REFRESH_TOKEN,
  redirectUri: process.env.ZOHO_REDIRECT_URI
};

// Validate Zoho configuration
const requiredEnvVars = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_REDIRECT_URI'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('⚠️  Warning: Missing environment variables:', missingVars.join(', '));
  console.warn('   Zoho integration will not work until these are configured.');
} else {
  initZohoTokenManager(zohoConfig);
  initZohoFieldsTokenManager(zohoConfig);
  console.log('✅ Zoho Token Manager initialized');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Register Zoho routes
app.use('/api/zoho', zohoRouter);
app.use('/api/zoho', zohoFieldsRouter);
// Register ExtraBitFree routes
app.use('/api/extrabitfree', extrabitfreeRouter);

// Debug: Log all registered routes
console.log('📋 Registered API routes:');
console.log('   POST /api/zoho/submit');
console.log('   GET  /api/zoho/test');
console.log('   GET  /api/extrabitfree/*');
console.log('   POST /api/extrabitfree/*');

// Serve static files from frontend build (in production)
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendBuildPath));
  
  // Catch-all handler: send back React's index.html file for client-side routing
  // Only for GET requests and non-API routes
  app.get('*', (req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return next(); // Let 404 handler catch it
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  // Development: API info endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'Zoho CRM Integration API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        zohoTest: '/api/zoho/test',
        zohoSubmit: '/api/zoho/submit (POST)',
        extrabitfree: '/api/extrabitfree/* (GET, POST, PUT, DELETE)'
      },
      note: 'Frontend is running separately in development mode'
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// 404 handler for non-API routes (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.path,
      method: req.method
    });
  });
}

// Start server
// For cPanel/GoDaddy, use PORT from environment or default
const PORT = process.env.PORT || process.env.NODE_PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://${HOST}:${PORT}`);
  console.log(`📋 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🧪 Zoho test: http://${HOST}:${PORT}/api/zoho/test`);
  console.log(`🌐 ExtraBitFree proxy: http://${HOST}:${PORT}/api/extrabitfree/*`);
  console.log(`🌍 Allowed CORS origins: ${allowedOrigins.join(', ')}`);
});

module.exports = app;

