# ExtraBitFree API Integration Guide

## نظرة عامة

تم إضافة دعم لـ ExtraBitFree API من خلال proxy في السيرفر. الفرونت إند يمكنه الآن التواصل مع `https://api.extrabitfree.com` من خلال السيرفر.

## الإعداد

### 1. متغيرات البيئة (اختياري)

في ملف `server/.env`:

```env
# ExtraBitFree API Configuration
EXTRABITFREE_API_BASE=https://api.extrabitfree.com
EXTRABITFREE_API_KEY=your_api_key_here
```

**ملاحظة:** إذا لم تحدد `EXTRABITFREE_API_BASE`، سيستخدم `https://api.extrabitfree.com` كقيمة افتراضية.

## الاستخدام في الفرونت إند

### 1. استيراد الـ utility

```typescript
import { 
  callExtraBitFreeAPI, 
  getExtraBitFree, 
  postExtraBitFree,
  putExtraBitFree,
  deleteExtraBitFree 
} from '@/utils/extrabitfreeApi';
```

### 2. أمثلة الاستخدام

#### GET Request
```typescript
try {
  const response = await getExtraBitFree('users');
  console.log('Data:', response.data);
} catch (error) {
  console.error('Error:', error);
}
```

#### POST Request
```typescript
try {
  const response = await postExtraBitFree('users', {
    name: 'John Doe',
    email: 'john@example.com'
  });
  console.log('Success:', response.data);
} catch (error) {
  console.error('Error:', error);
}
```

#### PUT Request
```typescript
try {
  const response = await putExtraBitFree('users/123', {
    name: 'Jane Doe'
  });
  console.log('Updated:', response.data);
} catch (error) {
  console.error('Error:', error);
}
```

#### DELETE Request
```typescript
try {
  const response = await deleteExtraBitFree('users/123');
  console.log('Deleted:', response.data);
} catch (error) {
  console.error('Error:', error);
}
```

#### Request مخصص
```typescript
try {
  const response = await callExtraBitFreeAPI(
    'custom/endpoint',
    'POST',
    { data: 'value' },
    { 'X-Custom-Header': 'value' }
  );
  console.log('Response:', response.data);
} catch (error) {
  console.error('Error:', error);
}
```

## API Endpoints في السيرفر

### Proxy Endpoint
```
/api/extrabitfree/*
```

يدعم جميع الـ HTTP methods:
- `GET /api/extrabitfree/*`
- `POST /api/extrabitfree/*`
- `PUT /api/extrabitfree/*`
- `DELETE /api/extrabitfree/*`

### مثال

إذا أردت الوصول إلى `https://api.extrabitfree.com/users`:

**من الفرونت إند:**
```typescript
const response = await getExtraBitFree('users');
```

**أو مباشرة:**
```typescript
const response = await fetch('http://localhost:5000/api/extrabitfree/users');
```

## Headers مخصصة

يمكنك إرسال headers مخصصة:

```typescript
const response = await getExtraBitFree('users', {
  'X-API-Key': 'your-key',
  'Authorization': 'Bearer token'
});
```

أو من خلال fetch مباشرة:

```typescript
const response = await fetch('http://localhost:5000/api/extrabitfree/users', {
  headers: {
    'x-api-key': 'your-key',
    'authorization': 'Bearer token'
  }
});
```

## الأمان

- جميع الطلبات تمر من خلال السيرفر (proxy)
- يمكن إضافة API Key في متغيرات البيئة
- السيرفر يضيف Authorization header تلقائياً إذا كان `EXTRABITFREE_API_KEY` موجوداً

## استكشاف الأخطاء

### خطأ في الاتصال
```typescript
try {
  const response = await getExtraBitFree('endpoint');
} catch (error) {
  console.error('Error:', error.message);
  // تحقق من أن السيرفر يعمل
  // تحقق من أن endpoint صحيح
}
```

### خطأ 404
- تأكد من أن endpoint صحيح
- تحقق من أن API يدعم هذا الـ endpoint

### خطأ CORS
- تأكد من أن `FRONTEND_URL` في `.env` يحتوي على domain الفرونت إند

## ملاحظات

1. جميع الطلبات تمر من خلال السيرفر (لا اتصال مباشر من الفرونت إند)
2. السيرفر يعمل كـ proxy ويضيف headers إذا لزم الأمر
3. يمكن استخدام أي endpoint من ExtraBitFree API
4. الـ response format موحد: `{ success, data, message, error }`

