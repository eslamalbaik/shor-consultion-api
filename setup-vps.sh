#!/bin/bash

# Quick VPS Setup Script
# Run this script on your VPS to setup the environment

set -e

echo "🚀 Setting up VPS for Shor Consultation Server..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Please don't run as root. Use a regular user.${NC}"
    exit 1
fi

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update
sudo apt upgrade -y

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo -e "${GREEN}✅ Node.js is already installed: $(node --version)${NC}"
fi

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Installing PM2...${NC}"
    sudo npm install -g pm2
else
    echo -e "${GREEN}✅ PM2 is already installed${NC}"
fi

# Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Nginx...${NC}"
    sudo apt install nginx -y
else
    echo -e "${GREEN}✅ Nginx is already installed${NC}"
fi

# Check if project directory exists
PROJECT_DIR="/var/www/shor-consultion"
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️  Project directory not found at $PROJECT_DIR${NC}"
    echo -e "${YELLOW}   Please upload your project files first${NC}"
    exit 1
fi

echo -e "${GREEN}✅ VPS setup complete!${NC}"
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "   1. cd $PROJECT_DIR/frontend && npm install && npm run build"
echo "   2. cd $PROJECT_DIR/server && npm install --production"
echo "   3. Create .env file in server directory"
echo "   4. pm2 start ecosystem.config.js"
echo "   5. pm2 save && pm2 startup"

