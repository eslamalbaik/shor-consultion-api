# Environment Variables Setup

This file documents the required environment variables for the Zoho CRM integration server.

## Required Variables

Create a `.env` file in the `server` directory with the following:

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

# ExtraBitFree API Configuration (optional)
EXTRABITFREE_API_BASE=https://api.extrabitfree.com
EXTRABITFREE_API_KEY=your_api_key_here
```

## How to Get Zoho Credentials

### Step 1: Create a Zoho Application

1. Go to https://api-console.zoho.com/
2. Click "ADD CLIENT"
3. Select "Server-based Applications"
4. Fill in the application details:
   - **Client Name**: Your application name
   - **Homepage URL**: Your website URL
   - **Authorized Redirect URIs**: `http://localhost:5000/auth/zoho/callback`
5. Click "CREATE"
6. Copy the **Client ID** and **Client Secret**

### Step 2: Generate Refresh Token

1. Build the authorization URL (replace YOUR_CLIENT_ID):

```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=http://localhost:5000/auth/zoho/callback
```

2. Open this URL in your browser and authorize the application
3. You'll be redirected to your redirect URI with a code parameter:
   ```
   http://localhost:5000/auth/zoho/callback?code=XXXXX
   ```
4. Copy the `code` value

### Step 3: Exchange Code for Tokens

Use curl or Postman to exchange the code for tokens:

```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:5000/auth/zoho/callback" \
  -d "code=CODE_FROM_STEP_2"
```

Response will look like:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  ...
}
```

5. Copy the `refresh_token` value to your `.env` file

### Step 4: Set Environment Variables

Add all values to your `.env` file:

```env
ZOHO_CLIENT_ID=<from step 1>
ZOHO_CLIENT_SECRET=<from step 1>
ZOHO_REFRESH_TOKEN=<from step 3>
ZOHO_REDIRECT_URI=http://localhost:5000/auth/zoho/callback
```

## Notes

- **Never commit `.env` files** to version control
- Keep your credentials secure
- Refresh tokens don't expire unless revoked
- For production, use your production redirect URI
- Different Zoho data centers may require different API URLs:
  - US: `https://www.zohoapis.com`
  - EU: `https://www.zohoapis.eu`
  - IN: `https://www.zohoapis.in`
  - AU: `https://www.zohoapis.com.au`
  - JP: `https://www.zohoapis.jp`

