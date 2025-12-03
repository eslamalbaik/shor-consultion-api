# دليل سريع - cPanel GoDaddy

## الخطوات السريعة:

### 1. بناء الفرونت إند (محلياً)
```bash
cd frontend
npm install
npm run build
```

### 2. رفع الملفات على cPanel
- ارفع مجلد `server` كاملاً
- ارفع محتويات `frontend/dist` إلى `public_html`

### 3. إنشاء Node.js App في cPanel
1. افتح **Node.js App** في cPanel
2. انقر **Create Application**
3. املأ:
   - **Application root:** `/home/username/server`
   - **Application startup file:** `index.js`
   - **Node.js version:** 18.x

### 4. إعداد Environment Variables
في Node.js App → Environment Variables:
```
NODE_ENV=production
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_REDIRECT_URI=https://yourdomain.com/auth/zoho/callback
FRONTEND_URL=https://yourdomain.com
```

### 5. تثبيت Dependencies
في Node.js App → **Run NPM Install**

### 6. تشغيل
في Node.js App → **Restart**

---

## إذا لم يكن Node.js متوفر:

### رفع الفرونت إند فقط:
1. ارفع محتويات `frontend/dist` إلى `public_html`
2. ارفع ملف `.htaccess` إلى `public_html`
3. رفع السيرفر على خدمة أخرى (Railway, Render, etc.)

---

## استكشاف الأخطاء:

```bash
# في Terminal (cPanel)
cd ~/server
npm install --production
tail -f logs/err.log
```

**ملاحظة:** تأكد من أن خطة GoDaddy لديك تدعم Node.js!

