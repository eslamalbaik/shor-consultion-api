#!/bin/bash

# Deployment Script for VPS
# This script builds the frontend and prepares the server for production

echo "🚀 Starting deployment process..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js and npm are installed${NC}"

# Navigate to project root
cd "$(dirname "$0")/.." || exit 1

# Build frontend
echo -e "${YELLOW}📦 Building frontend...${NC}"
cd frontend || exit 1
npm install
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Frontend build failed. dist folder not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Install server dependencies
echo -e "${YELLOW}📦 Installing server dependencies...${NC}"
cd ../server || exit 1
npm install --production

echo -e "${GREEN}✅ Server dependencies installed${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please edit .env file with your actual credentials${NC}"
    else
        echo -e "${RED}❌ .env.example not found. Please create .env file manually.${NC}"
    fi
fi

# Create logs directory
mkdir -p logs

echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "   1. Edit server/.env with your actual credentials"
echo "   2. Install PM2: npm install -g pm2"
echo "   3. Start server: pm2 start ecosystem.config.js"
echo "   4. Save PM2 config: pm2 save"
echo "   5. Setup PM2 startup: pm2 startup"

