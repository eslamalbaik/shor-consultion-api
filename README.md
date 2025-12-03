# Zoho CRM Integration Server

This server handles integration between your React frontend and Zoho CRM using OAuth2 with automatic token refresh.

## Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```env
# Zoho CRM OAuth2 Configuration
ZOHO_CLIENT_ID=your_zoho_client_id_here
ZOHO_CLIENT_SECRET=your_zoho_client_secret_here
ZOHO_REFRESH_TOKEN=your_zoho_refresh_token_here
ZOHO_REDIRECT_URI=http://localhost:5000/auth/zoho/callback

# Zoho API Base URL (usually doesn't need to change)
ZOHO_API_BASE=https://www.zohoapis.com

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

## Features

- ✅ Automatic OAuth2 token refresh on INVALID_TOKEN errors
- ✅ Retry mechanism for failed API calls
- ✅ Production-ready error handling
- ✅ CORS enabled for React frontend

## Installation

```bash
cd server
npm install
```

## Running the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

### POST /api/zoho/submit
Submit form data to Zoho CRM.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "message": "I need consultation",
  "module": "Leads"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Form submitted successfully to Zoho CRM",
  "data": {
    "id": "123456789",
    "module": "Leads"
  }
}
```

### GET /api/zoho/test
Test the Zoho connection and token.

## Getting Zoho Credentials

1. Go to https://api-console.zoho.com/
2. Create a new application
3. Generate OAuth2 credentials
4. Get the refresh token using OAuth2 flow
5. Add credentials to `.env` file

## Deployment to VPS

### Quick Start

1. **Upload files to VPS:**
   ```bash
   scp -r shor-consultion user@your-vps-ip:/var/www/
   ```

2. **Build frontend:**
   ```bash
   cd /var/www/shor-consultion/frontend
   npm install
   npm run build
   ```

3. **Setup server:**
   ```bash
   cd /var/www/shor-consultion/server
   npm install --production
   # Create .env file with your credentials
   ```

4. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Detailed Guide

See [DEPLOYMENT_GUIDE_AR.md](./DEPLOYMENT_GUIDE_AR.md) for complete Arabic deployment guide.

### Quick Reference

- **PM2 Commands:**
  - `pm2 start ecosystem.config.js` - Start server
  - `pm2 status` - Check status
  - `pm2 logs` - View logs
  - `pm2 restart shor-consultation-server` - Restart

- **Files:**
  - `ecosystem.config.js` - PM2 configuration
  - `deploy.sh` - Deployment script
  - `shor-consultation.service` - Systemd service file (alternative to PM2)

# shor-consultion-api
