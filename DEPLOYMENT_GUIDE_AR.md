# دليل رفع السيرفر على VPS

هذا الدليل يشرح كيفية رفع وتشغيل السيرفر على VPS.

## المتطلبات الأساسية

- VPS مع Ubuntu/Debian
- Node.js (الإصدار 18 أو أحدث)
- npm
- PM2 (لإدارة العملية)
- Nginx (اختياري - للـ reverse proxy)

---

## الخطوة 1: إعداد VPS

### 1.1 تحديث النظام
```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 تثبيت Node.js
```bash
# تثبيت Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# التحقق من التثبيت
node --version
npm --version
```

### 1.3 تثبيت PM2
```bash
sudo npm install -g pm2
```

---

## الخطوة 2: رفع الملفات على VPS

### 2.1 رفع الملفات باستخدام SCP
```bash
# من جهازك المحلي
scp -r shor-consultion user@your-vps-ip:/var/www/
```

### 2.2 أو استخدام Git
```bash
# على VPS
cd /var/www
git clone your-repository-url shor-consultation
cd shor-consultation
```

---

## الخطوة 3: بناء الفرونت إند

```bash
cd /var/www/shor-consultation/frontend
npm install
npm run build
```

سيتم إنشاء مجلد `dist` يحتوي على الملفات المبنية.

---

## الخطوة 4: إعداد متغيرات البيئة

```bash
cd /var/www/shor-consultation/server
cp .env.example .env
nano .env
```

عدّل ملف `.env` وأضف معلوماتك:

```env
# Zoho CRM OAuth2 Configuration
ZOHO_CLIENT_ID=your_actual_client_id
ZOHO_CLIENT_SECRET=your_actual_client_secret
ZOHO_REFRESH_TOKEN=your_actual_refresh_token
ZOHO_REDIRECT_URI=https://yourdomain.com/auth/zoho/callback

# Server Configuration
PORT=5000
NODE_ENV=production

# Frontend URL (for CORS)
FRONTEND_URL=https://yourdomain.com,https://www.yourdomain.com
```

احفظ الملف: `Ctrl+X` ثم `Y` ثم `Enter`

---

## الخطوة 5: تثبيت dependencies للسيرفر

```bash
cd /var/www/shor-consultation/server
npm install --production
```

---

## الخطوة 6: تشغيل السيرفر باستخدام PM2

### 6.1 إنشاء مجلد logs
```bash
mkdir -p /var/www/shor-consultation/server/logs
```

### 6.2 تشغيل السيرفر
```bash
cd /var/www/shor-consultation/server
pm2 start ecosystem.config.js
```

### 6.3 التحقق من الحالة
```bash
pm2 status
pm2 logs
```

### 6.4 حفظ إعدادات PM2
```bash
pm2 save
pm2 startup
```

سيظهر لك أمر، قم بنسخه وتنفيذه (مثل):
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-username --hp /home/your-username
```

---

## الخطوة 7: إعداد Nginx (اختياري لكن موصى به)

### 7.1 تثبيت Nginx
```bash
sudo apt install nginx -y
```

### 7.2 إنشاء ملف إعداد Nginx
```bash
sudo nano /etc/nginx/sites-available/shor-consultation
```

أضف التالي:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (بعد إعداد SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7.3 تفعيل الموقع
```bash
sudo ln -s /etc/nginx/sites-available/shor-consultation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## الخطوة 8: إعداد SSL مع Let's Encrypt (موصى به)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## أوامر PM2 المفيدة

```bash
# عرض الحالة
pm2 status

# عرض الـ logs
pm2 logs

# إعادة التشغيل
pm2 restart shor-consultation-server

# إيقاف
pm2 stop shor-consultation-server

# بدء
pm2 start shor-consultation-server

# حذف
pm2 delete shor-consultation-server

# مراقبة الأداء
pm2 monit
```

---

## أوامر Nginx المفيدة

```bash
# اختبار الإعدادات
sudo nginx -t

# إعادة تشغيل
sudo systemctl restart nginx

# عرض الحالة
sudo systemctl status nginx

# عرض الـ logs
sudo tail -f /var/log/nginx/error.log
```

---

## استكشاف الأخطاء

### السيرفر لا يعمل
```bash
# تحقق من الـ logs
pm2 logs shor-consultation-server

# تحقق من أن البورت متاح
sudo netstat -tulpn | grep 5000

# تحقق من متغيرات البيئة
cd /var/www/shor-consultation/server
cat .env
```

### الفرونت إند لا يظهر
- تأكد من أن `npm run build` تم تنفيذه بنجاح
- تأكد من وجود مجلد `frontend/dist`
- تحقق من أن `NODE_ENV=production` في ملف `.env`

### مشاكل CORS
- تأكد من إضافة الـ domain في `FRONTEND_URL` في ملف `.env`
- تأكد من أن Nginx يمرر الـ headers بشكل صحيح

---

## التحديثات المستقبلية

عند تحديث الكود:

```bash
# 1. سحب التحديثات
cd /var/www/shor-consultation
git pull

# 2. بناء الفرونت إند
cd frontend
npm install
npm run build

# 3. تحديث dependencies السيرفر
cd ../server
npm install --production

# 4. إعادة تشغيل السيرفر
pm2 restart shor-consultation-server
```

---

## الأمان

1. **جدار الحماية (Firewall)**
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

2. **حماية ملف .env**
```bash
chmod 600 /var/www/shor-consultation/server/.env
```

3. **تحديث النظام بانتظام**
```bash
sudo apt update && sudo apt upgrade -y
```

---

## الدعم

إذا واجهت مشاكل:
1. تحقق من الـ logs: `pm2 logs`
2. تحقق من Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. تحقق من أن جميع المتغيرات في `.env` صحيحة

