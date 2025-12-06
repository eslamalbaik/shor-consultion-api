const express = require('express');
const path = require('path');

require('dotenv').config();


const { router: zohoRouter, initializeTokenManager: initZohoTokenManager } = require('./routes/zoho.routes');
const { router: zohoFieldsRouter, initializeTokenManager: initZohoFieldsTokenManager } = require('./routes/zoho-fields.routes');

const { router: extrabitfreeRouter } = require('./routes/extrabitfree.routes');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';


const allowedOrigins = isProduction
  ? ['https://shor.solutions']
  : [
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080'
    ];

console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
console.log('CORS Allowed Origins:', allowedOrigins);


app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const zohoConfig = {
  clientId: process.env.ZOHO_CLIENT_ID,
  clientSecret: process.env.ZOHO_CLIENT_SECRET,
  refreshToken: process.env.ZOHO_REFRESH_TOKEN,
  redirectUri: process.env.ZOHO_REDIRECT_URI
};

const requiredEnvVars = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_REDIRECT_URI'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('Warning: Missing environment variables:', missingVars.join(', '));
  console.warn('Zoho integration will not work until these are configured.');
} else {
  initZohoTokenManager(zohoConfig);
  initZohoFieldsTokenManager(zohoConfig);
  console.log(' Zoho Token Manager initialized');
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});


app.use('/api/zoho', zohoRouter);
app.use('/api/zoho', zohoFieldsRouter);
app.use('/api/extrabitfree', extrabitfreeRouter);


console.log('📋 Registered API routes:');
console.log('   POST /api/zoho/submit');
console.log('   GET  /api/zoho/test');
console.log('   GET  /api/extrabitfree/*');
console.log('   POST /api/extrabitfree/*');


if (isProduction) {
  const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendBuildPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });

} else {
  // Dev mode homepage
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


app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// 404 for dev mode
if (!isProduction) {
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.path,
      method: req.method
    });
  });
}


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
