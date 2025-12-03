# دليل سريع للرفع على VPS

## الخطوات السريعة:

### 1. على VPS - إعداد البيئة
```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# تثبيت PM2
sudo npm install -g pm2
```

### 2. رفع الملفات
```bash
# من جهازك المحلي
scp -r shor-consultion user@your-vps-ip:/var/www/
```

### 3. على VPS - بناء الفرونت إند
```bash
cd /var/www/shor-consultion/frontend
npm install
npm run build
```

### 4. إعداد ملف .env
```bash
cd /var/www/shor-consultion/server
nano .env
```

أضف:
```env
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_REDIRECT_URI=https://yourdomain.com/auth/zoho/callback
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
```

### 5. تثبيت dependencies وتشغيل
```bash
cd /var/www/shor-consultion/server
npm install --production
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. إعداد Nginx (اختياري)
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/shor-consultation
```

أضف:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/shor-consultation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL (موصى به)
```bash
sudo certbot --nginx -d yourdomain.com
```

## أوامر مفيدة:
```bash
pm2 status              # عرض الحالة
pm2 logs                # عرض الـ logs
pm2 restart shor-consultation-server  # إعادة التشغيل
```

