# 🚀 Win Room v2.0 - DigitalOcean App Platform Deployment Guide

**Süre**: ~30 dakika
**Zorluk**: Kolay
**Maliyet**: ~$12-18/ay

---

## 📋 İçindekiler

1. [Ön Hazırlık](#1-ön-hazırlık)
2. [Git Repository Hazırlama](#2-git-repository-hazırlama)
3. [App Platform'da Yeni App Oluşturma](#3-app-platformda-yeni-app-oluşturma)
4. [Component Konfigürasyonu](#4-component-konfigürasyonu)
5. [Environment Variables](#5-environment-variables)
6. [Deployment](#6-deployment)
7. [Post-Deployment Kontroller](#7-post-deployment-kontroller)
8. [Domain Bağlama (Opsiyonel)](#8-domain-bağlama-opsiyonel)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Ön Hazırlık

### 1.1 Gereksinimler Kontrolü

- ✅ DigitalOcean hesabı ([kaydol](https://cloud.digitalocean.com/registrations/new))
- ✅ PostgreSQL veritabanı hazır (zaten var!)
- ✅ Git repository (GitHub/GitLab)
- ✅ Proje local'de çalışıyor

### 1.2 Proje Analizi

Win Room v2.0 **3 ayrı process** gerektirir:

| Process | Port | Komut | Açıklama |
|---------|------|-------|----------|
| **Next.js App** | 3000 | `npm start` | Web UI ve API endpoints |
| **Socket.IO Server** | 3001 | `npm run start:socket` | WebSocket real-time updates |
| **Poller Worker** | - | `npm run start:worker` | Database sync (2sn interval) |

> **App Platform Stratejisi**: 3 ayrı "Component" olarak deploy edeceğiz

---

## 2. Git Repository Hazırlama

### 2.1 Eğer repository yoksa oluştur

```bash
# Terminal'de proje dizininde
cd /Users/admin/Documents/Projects/win-room

# Git init (eğer yoksa)
git init

# GitHub'da yeni repo oluştur
# Örnek: https://github.com/kullaniciadin/win-room

# Remote ekle
git remote add origin https://github.com/kullaniciadin/win-room.git

# Commit ve push
git add .
git commit -m "Initial commit for deployment"
git branch -M main
git push -u origin main
```

### 2.2 `.gitignore` Kontrolü

`.gitignore` dosyasında bunların olduğundan emin ol:

```
node_modules/
.next/
.env
.env.local
*.log
.DS_Store
```

### 2.3 `package.json` Production Scripts Kontrolü

Zaten mevcut, ama kontrol et:

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "start:socket": "tsx services/socket/server.ts",
    "start:worker": "tsx services/poller/worker.ts"
  }
}
```

✅ Hazır!

---

## 3. App Platform'da Yeni App Oluşturma

### 3.1 DigitalOcean'a Giriş

1. [DigitalOcean App Platform](https://cloud.digitalocean.com/apps) sayfasına git
2. **"Create App"** butonuna tıkla

### 3.2 Repository Bağlama

1. **Source**: GitHub seç
2. **Authorize DigitalOcean** butonuna tıkla (ilk kez ise)
3. Repository'ni seç: `kullaniciadin/win-room`
4. **Branch**: `main` seç
5. **Autodeploy**: ✅ aktif bırak (her push'ta otomatik deploy)
6. **Next** butonuna tıkla

---

## 4. Component Konfigürasyonu

App Platform otomatik algılama yapacak. **3 Component manuel ekleyeceğiz**:

### 4.1 Component 1: Next.js Web Service

**Edit Plan** butonuna tıkla, sonra:

#### Component Settings:
- **Component Name**: `web`
- **Component Type**: `Web Service`
- **Environment**: `Node.js`
- **Build Command**:
  ```bash
  npm install && npm run build
  ```
- **Run Command**:
  ```bash
  npm start
  ```
- **HTTP Port**: `3000`
- **HTTP Route**: `/`
- **Instance Size**: `Basic ($5/mo)` veya `Professional ($12/mo)`
- **Instance Count**: `1`

#### Health Check:
- **Path**: `/api/health` (bunu oluşturacağız)
- **Initial Delay**: `30 seconds`

**Save** butonuna tıkla.

---

### 4.2 Component 2: Socket.IO Worker Service

**Add Component** → **Worker**

#### Component Settings:
- **Component Name**: `socket-server`
- **Component Type**: `Worker`
- **Environment**: `Node.js`
- **Build Command**:
  ```bash
  npm install
  ```
- **Run Command**:
  ```bash
  npm run start:socket
  ```
- **Instance Size**: `Basic ($5/mo)`
- **Instance Count**: `1`

> **ÖNEMLİ**: Worker type seçiyoruz çünkü HTTP route gerektirmiyor, ama port 3001'i dinleyecek

**Save** butonuna tıkla.

---

### 4.3 Component 3: Poller Worker Service

**Add Component** → **Worker**

#### Component Settings:
- **Component Name**: `poller-worker`
- **Component Type**: `Worker`
- **Environment**: `Node.js`
- **Build Command**:
  ```bash
  npm install
  ```
- **Run Command**:
  ```bash
  npm run start:worker
  ```
- **Instance Size**: `Basic ($5/mo)`
- **Instance Count**: `1`

**Save** butonuna tıkla.

---

## 5. Environment Variables

### 5.1 Environment Variables Ekleme

**App Settings** → **Environment Variables** bölümüne git.

**TÜMÜNE EKLE** (her 3 component için):

```env
# Database Configuration (copy from DigitalOcean connection details)
DATABASE_URL=postgresql://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>?sslmode=require
DB_HOST=<db_host>
DB_PORT=<db_port>
DB_NAME=<db_name>
DB_USER=<db_user>
DB_PASSWORD=<db_password>

# Core DB (use the same string unless you run a dedicated core database)
CORE_DB_URL=postgresql://<core_db_user>:<core_db_password>@<core_db_host>:<core_db_port>/<core_db_name>?sslmode=require

# JWT Configuration (generate a brand new value per environment)
JWT_SECRET=<generate_a_strong_random_string>
JWT_EXPIRES_IN=2d

# Socket.IO Server
SOCKET_PORT=3001

# Poller Worker Configuration
POLLER_INTERVAL_MS=2000
POLLER_BATCH_SIZE=500

# Rate Limiting
RATE_LIMIT_GENERAL=60
RATE_LIMIT_CLAIM=10

# Environment
NODE_ENV=production
```

### 5.2 Socket.IO URL (Component'e özel)

**Sadece `web` component'ine** ekle:

```env
NEXT_PUBLIC_SOCKET_URL=${socket-server.PRIVATE_URL}
```

> **Açıklama**: `${socket-server.PRIVATE_URL}` App Platform'un internal networking'ini kullanır. Socket server'a doğrudan erişim sağlar.

**VEYA** daha basit (public URL):

```env
NEXT_PUBLIC_SOCKET_URL=https://your-app-name.ondigitalocean.app
```

> **Not**: Public URL kullanırsan socket server için HTTP route eklemen gerekir

### 5.3 CORS Ayarı (Component'e özel)

**Sadece `socket-server` component'ine** ekle:

```env
SOCKET_CORS_ORIGIN=${web.PUBLIC_URL}
```

---

## 6. Deployment

### 6.1 İlk Deployment

1. **Review** butonuna tıkla
2. Tüm ayarları kontrol et:
   - ✅ 3 component görünüyor
   - ✅ Environment variables eklenmiş
   - ✅ Build ve run commands doğru
3. **Create Resources** butonuna tıkla

### 6.2 Deployment Süreci

**Deployment yaklaşık 5-10 dakika sürer**:

1. ✅ Building... (npm install + build)
2. ✅ Deploying... (containers oluşturuluyor)
3. ✅ Running health checks...
4. ✅ Live!

**Logs** tab'ından real-time takip edebilirsin.

### 6.3 Beklenen Log Çıktıları

#### Web Component:
```
> next start
ready - started server on 0.0.0.0:3000
```

#### Socket Server:
```
Socket.IO server running on port 3001
Listening for client connections...
```

#### Poller Worker:
```
Poller worker started
Polling interval: 2000ms
Connecting to database...
```

---

## 7. Post-Deployment Kontroller

### 7.1 Health Check Endpoint Oluştur

Local'de bu dosyayı oluştur:

**`app/api/health/route.ts`**:

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}
```

Push et:

```bash
git add app/api/health/route.ts
git commit -m "Add health check endpoint"
git push
```

App Platform **otomatik yeniden deploy** edecek.

### 7.2 App URL'i Al

Deployment tamamlandıktan sonra:

1. **App Platform** → **Settings** → **Domains**
2. Default URL'i kopyala:
   ```
   https://win-room-xxxxx.ondigitalocean.app
   ```

### 7.3 Manuel Test

#### Test 1: Web UI
```bash
curl https://win-room-xxxxx.ondigitalocean.app/api/health
# Response: {"status":"ok","timestamp":"2025-10-24T..."}
```

#### Test 2: Socket.IO (browser console)
```javascript
const io = require('socket.io-client');
const socket = io('https://win-room-xxxxx.ondigitalocean.app');

socket.on('connect', () => console.log('Connected!'));
socket.on('disconnect', () => console.log('Disconnected!'));
```

#### Test 3: Database Connection
```bash
# App Platform logs'tan kontrol et
# Component: poller-worker
# Log: "Connected to database successfully"
```

---

## 8. Domain Bağlama (Opsiyonel)

### 8.1 Custom Domain Ekle

1. **App Platform** → **Settings** → **Domains**
2. **Add Domain** butonuna tıkla
3. Domain'i gir: `winroom.yourdomain.com`
4. DigitalOcean'ın verdiği **CNAME** kaydını domain provider'ına ekle:
   ```
   Type: CNAME
   Name: winroom
   Value: win-room-xxxxx.ondigitalocean.app.
   ```
5. DNS propagation bekle (~10-60 dakika)
6. DigitalOcean otomatik SSL sertifikası oluşturur

---

## 9. Troubleshooting

### 9.1 "Build Failed" Hatası

**Logs kontrolü**:
```
Component: web
Error: Module not found: Can't resolve 'xyz'
```

**Çözüm**:
```bash
# Local'de test et
npm install
npm run build

# Sorun yoksa push et
git push
```

---

### 9.2 "Health Check Failed" Hatası

**Sebep**: `/api/health` endpoint yok

**Çözüm**: Yukarıdaki 7.1'i uygula

---

### 9.3 Socket.IO Bağlantı Hatası

**Logs kontrolü**:
```
Component: socket-server
Error: CORS origin not allowed
```

**Çözüm**:
1. `services/socket/server.ts` dosyasında CORS ayarını kontrol et:
   ```typescript
   const io = new Server(server, {
     cors: {
       origin: process.env.SOCKET_CORS_ORIGIN || '*',
       methods: ['GET', 'POST']
     }
   });
   ```

2. Environment variable'ı doğru ayarla (bkz. 5.3)

---

### 9.4 Database Bağlantı Hatası

**Logs kontrolü**:
```
Error: connect ECONNREFUSED
```

**Sebep**: Database firewall kuralları

**Çözüm**:
1. **DigitalOcean** → **Databases** → **Settings** → **Trusted Sources**
2. **Add Trusted Source** → **App Platform**
3. App'ini seç: `win-room`
4. Save

> App Platform otomatik IP range'ini ekler

---

### 9.5 Poller Worker Çalışmıyor

**Logs kontrolü**:
```
Component: poller-worker
No logs appear
```

**Çözüm**:
1. `services/poller/worker.ts` dosyasında `console.log` ekle:
   ```typescript
   console.log('Poller worker started at:', new Date().toISOString());
   ```

2. Environment variables kontrol et:
   - `DATABASE_URL` doğru mu?
   - `POLLER_INTERVAL_MS` ayarlanmış mı?

---

### 9.6 "Out of Memory" Hatası

**Çözüm**: Instance size'ı büyüt

1. **App Settings** → **Components** → **web** (veya sorunlu component)
2. **Instance Size**: `Professional ($12/mo)` seç
3. Save ve redeploy

---

## 10. Monitoring ve Scaling

### 10.1 App Platform Metrics

**Insights** tab'ından şunları izle:
- CPU usage
- Memory usage
- Request rate
- Response time

### 10.2 Alerts Kurma

1. **Settings** → **Alerts**
2. **Create Alert**
3. Metrik seç (örn. "CPU > 80%")
4. Email/Slack webhook ekle

### 10.3 Auto-scaling

**Professional plan** ile:
1. **Components** → **web** → **Scaling**
2. **Auto-scaling**: Aktif et
3. **Min instances**: 1
4. **Max instances**: 3
5. **CPU threshold**: 70%

---

## 11. Maliyetler

| Component | Instance Size | Maliyet/ay |
|-----------|---------------|------------|
| Web | Basic | $5 |
| Socket Server | Basic | $5 |
| Poller Worker | Basic | $5 |
| **TOPLAM** | | **$15/ay** |

> **Professional** instance kullanırsan: $12 x 3 = **$36/ay**

---

## 12. Sonraki Adımlar

✅ **Deployment tamamlandı!**

Şimdi:
1. 🧪 **Test et**: Tüm features çalışıyor mu?
2. 📊 **Monitoring**: Metrics ve logs takip et
3. 🔒 **Güvenlik**: JWT secrets production'a özel değiştir
4. 🌐 **Domain**: Custom domain ekle
5. 📈 **Scaling**: Trafiğe göre instance sayısını ayarla

---

## 12. Initial Setup After Deployment

### 12.1 Create Admin User

Deployment tamamlandıktan sonra **ilk admin kullanıcınızı** oluşturun:

#### Method 1: Local'den Remote Database'e

```bash
# 1. Production database URL'ini DigitalOcean panelinden kopyala
export DATABASE_URL="postgresql://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>?sslmode=require"

# 2. Admin oluştur
npm run admin:create

# Seller ID: admin
# Display Name: Admin User
# Email: admin@yourcompany.com
# Password: [strong password]
# Role: admin
```

#### Method 2: DigitalOcean Console

1. **Database** → **Overview** → **Connection Details**
2. **Copy** connection string
3. Click **"Open Console"**
4. Paste SQL:

```sql
-- Önce password hash oluştur (local'de)
-- node scripts/hash-password.js YourStrongPassword123

INSERT INTO wr.sellers (
  seller_id,
  display_name,
  email,
  password_hash,
  role,
  is_active
) VALUES (
  'admin',
  'Admin User',
  'admin@yourcompany.com',
  '$2a$10$[HASH_BURAYA]',
  'admin',
  true
);
```

#### Method 3: App Platform Console (Advanced)

```bash
# App Platform → Components → web → Console

# Console'da:
cd /workspace
npm run admin:create:quick
```

### 12.2 Verify Admin Login

```bash
curl -X POST https://your-app-name.ondigitalocean.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "password": "YOUR_PASSWORD"
  }'
```

Expected response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "seller_id": "admin",
    "email": "admin@yourcompany.com",
    "role": "admin"
  }
}
```

### 12.3 Add Sales Users

Aynı şekilde sales users ekle:

```bash
npm run admin:create
# seller_id: merve, role: sales

npm run admin:create
# seller_id: sait, role: sales
```

**Detaylı guide**: [`scripts/ADMIN_SETUP.md`](./scripts/ADMIN_SETUP.md)

---

## 13. Faydalı Komutlar

### Logs İzleme

```bash
# CLI ile (DigitalOcean CLI gerektirir)
doctl apps logs <app-id> --type run --follow

# Veya web interface:
# App Platform → Logs → Component seç → Tail Logs
```

### Yeniden Deploy

```bash
# Git push ile otomatik
git push origin main

# Manuel (App Platform UI)
# Components → ... → Force Rebuild & Deploy
```

### Environment Variables Güncelleme

```bash
# UI'dan:
# App Settings → Environment Variables → Edit → Save

# CLI ile:
doctl apps update <app-id> --spec spec.yaml
```

---

## 📞 Yardım

Sorun yaşarsan:
1. **Logs** kontrol et (her component için ayrı ayrı)
2. **Health checks** çalışıyor mu?
3. **Database connection** ayakta mı?
4. **Environment variables** doğru mu?

**DigitalOcean Destek**: https://cloud.digitalocean.com/support

---

## ✅ Checklist

Deployment öncesi kontrol listesi:

- [ ] Git repository hazır
- [ ] `.env` dosyası `.gitignore`'da
- [ ] PostgreSQL database hazır ve erişilebilir
- [ ] `package.json` scripts doğru
- [ ] Health check endpoint oluşturuldu
- [ ] Environment variables hazır
- [ ] 3 component ayarlandı (web, socket, poller)
- [ ] CORS ayarları yapıldı
- [ ] Database trusted sources eklendi

**Hepsini yaptıysan, deployment'a hazırsın! 🚀**
