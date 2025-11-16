# 🚀 Win Room v2.0 - Deployment Quick Start

**5 dakikada deployment!** ⚡

---

## ✅ Ön Kontrol

```bash
# 1. Git repository push edilmiş mi?
git status
git push origin main

# 2. .env dosyası .gitignore'da mı?
cat .gitignore | grep .env
```

---

## 📝 Component Configuration (Özet)

App Platform'da **3 Component** oluştur:

### 1️⃣ Web Service
```yaml
Name: web
Type: Web Service
Build: npm install && npm run build
Run: npm start
Port: 3000
Route: /
Size: Basic ($5) veya Professional ($12)
```

### 2️⃣ Socket.IO Worker
```yaml
Name: socket-server
Type: Worker
Build: npm install
Run: npm run start:socket
Size: Basic ($5)
```

### 3️⃣ Poller Worker
```yaml
Name: poller-worker
Type: Worker
Build: npm install
Run: npm run start:worker
Size: Basic ($5)
```

**Toplam Maliyet**: $15/ay (Basic) veya $30/ay (Professional)

---

## 🔐 Environment Variables

**TÜMÜNE EKLE** (tüm componentler için aynı):

```env
DATABASE_URL=postgresql://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>?sslmode=require
DB_HOST=<db_host>
DB_PORT=<db_port>
DB_NAME=<db_name>
DB_USER=<db_user>
DB_PASSWORD=<db_password>
CORE_DB_URL=postgresql://<core_db_user>:<core_db_password>@<core_db_host>:<core_db_port>/<core_db_name>?sslmode=require
JWT_SECRET=<generate_a_strong_random_string>
JWT_EXPIRES_IN=2d
SOCKET_PORT=3001
POLLER_INTERVAL_MS=2000
POLLER_BATCH_SIZE=500
RATE_LIMIT_GENERAL=60
RATE_LIMIT_CLAIM=10
NODE_ENV=production
```

### Component-Specific Variables:

**Sadece `web` componentine:**
```env
NEXT_PUBLIC_SOCKET_URL=https://your-app-name.ondigitalocean.app
```

**Sadece `socket-server` componentine:**
```env
SOCKET_CORS_ORIGIN=https://your-app-name.ondigitalocean.app
```

> **Not**: `your-app-name` yerine actual app name'inizi yazın!

---

## 🗄️ Database Setup

### 1. Trusted Sources Ekle

```
DigitalOcean → Databases → Settings → Trusted Sources
→ Add Trusted Source → App Platform → Select: win-room
```

### 2. WR Schema Oluştur (eğer yoksa)

```bash
# Lokal'den veya psql ile:
psql $DATABASE_URL

# Script'leri sırayla çalıştır:
\i scripts/db/01_create_schema.sql
\i scripts/db/02_create_tables.sql
\i scripts/db/03_create_functions.sql
```

---

## 🎯 Deployment Adımları

### Adım 1: Repository Hazırla
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Adım 2: App Platform'a Git
1. https://cloud.digitalocean.com/apps
2. **Create App**
3. GitHub repo seç: `win-room`
4. Branch: `main`
5. **Next**

### Adım 3: Components Düzenle
1. **Edit Plan** → 3 component ekle (yukarıdaki config'e göre)
2. Environment variables ekle (tümüne)
3. **Review** → **Create Resources**

### Adım 4: Deploy Bekle
- 5-10 dakika sürer
- **Logs** tab'ından takip et

### Adım 5: Test Et
```bash
# Health check
curl https://your-app-name.ondigitalocean.app/api/health

# Response:
# {"status":"ok","service":"win-room-web","timestamp":"..."}
```

---

## ✅ Post-Deployment Checklist

- [ ] Web app açılıyor mu? → `https://your-app-name.ondigitalocean.app`
- [ ] Health check çalışıyor mu? → `/api/health`
- [ ] Socket.IO bağlanıyor mu? → Browser console test
- [ ] Poller worker logları görünüyor mu? → Logs tab
- [ ] Database bağlantısı başarılı mı? → Logs kontrol

---

## 🐛 Hızlı Troubleshooting

### Build hatası?
```bash
# Lokal'de test et:
npm install
npm run build

# Çalışıyorsa:
git push origin main
```

### Health check başarısız?
- Health check endpoint oluşturuldu mu? → `app/api/health/route.ts`

### Socket.IO bağlanmıyor?
- CORS origin doğru mu? → Environment variables kontrol
- Socket server çalışıyor mu? → Logs kontrol

### Database bağlanamıyor?
- Trusted sources eklendi mi? → Database settings kontrol
- Connection string doğru mu? → Environment variables kontrol

### Poller worker çalışmıyor?
- Logs görünüyor mu? → `poller-worker` component logs
- Database bağlantısı var mı? → Connection string kontrol

---

## 📊 Logs Kontrol

```bash
# Web component:
App Platform → Components → web → Runtime Logs

# Socket server:
App Platform → Components → socket-server → Runtime Logs

# Poller worker:
App Platform → Components → poller-worker → Runtime Logs
```

**Beklenen çıktılar:**
- **Web**: `ready - started server on 0.0.0.0:3000`
- **Socket**: `Server listening on port 3001`
- **Poller**: `Poller worker started`

---

## 🔄 Yeniden Deploy

### Otomatik (önerilen):
```bash
git push origin main
# App Platform otomatik deploy eder
```

### Manuel:
```
App Platform → Components → ... → Force Rebuild & Deploy
```

---

## 🌐 Domain Bağlama

1. **App Settings** → **Domains** → **Add Domain**
2. Domain gir: `winroom.yourdomain.com`
3. CNAME kaydı ekle:
   ```
   Type: CNAME
   Name: winroom
   Value: win-room-xxxxx.ondigitalocean.app.
   ```
4. SSL otomatik oluşur (~10 dk)

---

## 💰 Maliyet Optimizasyonu

**Development için:**
```
Web: Basic ($5)
Socket: Basic ($5)
Poller: Basic ($5)
────────────────
Total: $15/ay
```

**Production için:**
```
Web: Professional ($12) x 2 instances
Socket: Professional ($12)
Poller: Basic ($5)
─────────────────────────────
Total: $41/ay
```

**Auto-scaling ile:**
```
Web: 1-3 instances (load'a göre)
Socket: 1 instance
Poller: 1 instance
```

---

## 📞 Yardım Gerekirse

**Detaylı guide**: `DEPLOYMENT_GUIDE.md`

**DigitalOcean Docs**: https://docs.digitalocean.com/products/app-platform/

**Support**: https://cloud.digitalocean.com/support

---

## 🎉 Done!

Deployment tamamlandı! 🚀

**App URL**: https://your-app-name.ondigitalocean.app

**Next Steps**:
1. 🧪 Tüm features'ları test et
2. 📊 Monitoring setup yap
3. 🔒 Production JWT secret değiştir
4. 🌐 Custom domain ekle
5. 📈 Scaling ayarlarını optimize et
