/**
 * PM2 Ecosystem Configuration
 * Use this file to manage your application with PM2
 * 
 * Install PM2: npm install -g pm2
 * Start: pm2 start ecosystem.config.js
 * Stop: pm2 stop ecosystem.config.js
 * Restart: pm2 restart ecosystem.config.js
 * Status: pm2 status
 * Logs: pm2 logs
 * Delete: pm2 delete ecosystem.config.js
 */

module.exports = {
  apps: [{
    name: 'shor-consultation-server',
    script: './index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};

