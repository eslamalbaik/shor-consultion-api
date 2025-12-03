# دليل رفع المشروع على cPanel - GoDaddy

هذا الدليل يشرح كيفية رفع المشروع على cPanel من GoDaddy.

## ⚠️ ملاحظات مهمة:

1. **GoDaddy cPanel يدعم Node.js** في بعض الخطط (عادة Business Hosting أو أعلى)
2. تأكد من أن خطة الاستضافة لديك تدعم Node.js
3. إذا لم تكن متأكداً، تحقق من cPanel → "Node.js Selector" أو "Node.js App"

---

## الطريقة 1: استخدام Node.js App في cPanel (موصى به)

### الخطوة 1: بناء الفرونت إند محلياً

```bash
cd frontend
npm install
npm run build
```

سيتم إنشاء مجلد `dist` يحتوي على الملفات المبنية.

### الخطوة 2: رفع الملفات على cPanel

1. **افتح cPanel** من حساب GoDaddy
2. **اذهب إلى "Node.js App"** أو **"Node.js Selector"**
3. **ارفع الملفات** باستخدام File Manager أو FTP:
   - ارفع مجلد `server` كاملاً
   - ارفع مجلد `frontend/dist` (الملفات المبنية)

**هيكل الملفات على السيرفر:**
```
/home/username/
├── server/
│   ├── index.js
│   ├── package.json
│   ├── .env
│   └── ...
└── public_html/
    └── dist/  (ملفات الفرونت إند المبنية)
```

### الخطوة 3: إنشاء Node.js App في cPanel

1. **افتح "Node.js App"** في cPanel
2. **انقر على "Create Application"**
3. **املأ البيانات:**
   - **Node.js version:** اختر 18.x أو أحدث
   - **Application mode:** Production
   - **Application root:** `/home/username/server`
   - **Application URL:** اختر subdomain أو domain
   - **Application startup file:** `index.js`
   - **Application port:** اتركه فارغاً (سيتم تحديده تلقائياً)

### الخطوة 4: إعداد متغيرات البيئة

في صفحة Node.js App:
1. **انقر على "Environment Variables"**
2. **أضف المتغيرات التالية:**

```
NODE_ENV=production
PORT=(اتركه فارغاً - سيتم تحديده تلقائياً)
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_REDIRECT_URI=https://yourdomain.com/auth/zoho/callback
FRONTEND_URL=https://yourdomain.com
```

### الخطوة 5: تثبيت Dependencies

1. **في صفحة Node.js App، انقر على "Run NPM Install"**
2. أو **استخدم Terminal في cPanel:**
   ```bash
   cd ~/server
   npm install --production
   ```

### الخطوة 6: تشغيل التطبيق

1. **في صفحة Node.js App، انقر على "Restart"**
2. **تحقق من الـ logs** للتأكد من أن التطبيق يعمل

---

## الطريقة 2: رفع الفرونت إند منفصلاً (بدون Node.js)

إذا كانت خطة الاستضافة لا تدعم Node.js، يمكنك:

### رفع الفرونت إند فقط على cPanel:

1. **بناء الفرونت إند:**
   ```bash
   cd frontend
   npm run build
   ```

2. **رفع مجلد `dist`** إلى `public_html` في cPanel

3. **إنشاء ملف `.htaccess`** في `public_html`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

4. **رفع السيرفر على خدمة أخرى** (مثل Railway, Render, أو VPS)

---

## الطريقة 3: استخدام GoDaddy VPS (إذا كان متوفر)

إذا كان لديك VPS من GoDaddy:

1. اتبع دليل [DEPLOYMENT_GUIDE_AR.md](./DEPLOYMENT_GUIDE_AR.md)
2. استخدم PM2 لتشغيل السيرفر

---

## إعداد ملف .env في cPanel

### الطريقة 1: من خلال File Manager

1. **افتح File Manager** في cPanel
2. **اذهب إلى مجلد `server`**
3. **أنشئ ملف `.env`** (يبدأ بنقطة)
4. **أضف المحتوى:**

```env
NODE_ENV=production
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_REDIRECT_URI=https://yourdomain.com/auth/zoho/callback
FRONTEND_URL=https://yourdomain.com
```

### الطريقة 2: من خلال Terminal

```bash
cd ~/server
nano .env
# أضف المحتوى واحفظ
```

---

## إعداد CORS للـ Domain

في ملف `.env` أو Environment Variables في cPanel:

```
FRONTEND_URL=https://yourdomain.com,https://www.yourdomain.com
```

---

## استكشاف الأخطاء

### التطبيق لا يعمل

1. **تحقق من الـ logs:**
   - في Node.js App → View Logs
   - أو في Terminal: `cd ~/server && cat logs/err.log`

2. **تحقق من البورت:**
   - GoDaddy عادة يحدد البورت تلقائياً
   - تأكد من أن `PORT` في `.env` فارغ أو غير موجود

3. **تحقق من Dependencies:**
   ```bash
   cd ~/server
   npm install --production
   ```

### الفرونت إند لا يظهر

1. **تأكد من بناء الفرونت إند:**
   ```bash
   cd ~/frontend
   npm run build
   ```

2. **تأكد من وجود مجلد `dist`:**
   ```bash
   ls -la ~/frontend/dist
   ```

3. **تحقق من المسار في `server/index.js`:**
   - يجب أن يشير إلى `../frontend/dist`

### مشاكل CORS

1. **أضف الـ domain في `FRONTEND_URL`:**
   ```
   FRONTEND_URL=https://yourdomain.com
   ```

2. **تحقق من أن `NODE_ENV=production`**

---

## أوامر مفيدة في Terminal (cPanel)

```bash
# الانتقال إلى مجلد السيرفر
cd ~/server

# عرض الـ logs
tail -f logs/err.log

# إعادة تشغيل Node.js App
# (من خلال cPanel → Node.js App → Restart)

# تثبيت dependencies
npm install --production

# التحقق من Node.js version
node --version

# التحقق من npm version
npm --version
```

---

## ملاحظات مهمة:

1. **GoDaddy قد يحدد البورت تلقائياً** - لا تحدد PORT في `.env` إلا إذا طُلب منك
2. **استخدم HTTPS** في `FRONTEND_URL` و `ZOHO_REDIRECT_URI`
3. **تأكد من بناء الفرونت إند** قبل الرفع
4. **احفظ ملف `.env`** بشكل آمن ولا ترفعه على Git

---

## الدعم

إذا واجهت مشاكل:
1. تحقق من logs في Node.js App
2. تأكد من أن جميع المتغيرات في `.env` صحيحة
3. تأكد من أن خطة الاستضافة تدعم Node.js

