# ✅ Win Room v2.0 - Deployment Checklist

Deployment öncesi ve sonrası kontrol listesi.

---

## 📋 PRE-DEPLOYMENT (Deployment Öncesi)

### Repository Hazırlığı
- [ ] Git repository oluşturuldu (GitHub/GitLab)
- [ ] `.gitignore` dosyası `.env` içeriyor
- [ ] `.env` dosyası commit edilmemiş
- [ ] Son değişiklikler commit edildi ve push edildi
- [ ] `main` branch güncel

### Kod Kontrolü
- [ ] `package.json` scripts doğru:
  - [ ] `"build": "next build"`
  - [ ] `"start": "next start"`
  - [ ] `"start:socket": "tsx services/socket/server.ts"`
  - [ ] `"start:worker": "tsx services/poller/worker.ts"`
- [ ] Health check endpoint var: `app/api/health/route.ts`
- [ ] TypeScript hataları yok: `npm run build` başarılı
- [ ] Linter temiz: `npm run lint` başarılı

### Database Hazırlığı
- [ ] PostgreSQL database oluşturuldu (DigitalOcean)
- [ ] Database connection string hazır
- [ ] `wr` schema oluşturuldu:
  - [ ] `scripts/db/01_create_schema.sql` çalıştırıldı
  - [ ] `scripts/db/02_create_tables.sql` çalıştırıldı
  - [ ] `scripts/db/03_create_functions.sql` çalıştırıldı
- [ ] Test data eklendi (sellers, etc.)
- [ ] Database Trusted Sources ayarlandı (App Platform eklenecek)

### Environment Variables Hazırlığı
- [ ] `.env.production.template` kontrol edildi
- [ ] Production JWT secret hazırlandı (strong random string)
- [ ] Database credentials doğru
- [ ] Socket port ayarı doğru (3001)
- [ ] CORS origins belirlendi

---

## 🚀 DEPLOYMENT (Deployment Sırasında)

### DigitalOcean App Platform Setup
- [ ] App Platform'a gidildi
- [ ] "Create App" tıklandı
- [ ] GitHub repository bağlandı
- [ ] Branch seçildi: `main`
- [ ] Autodeploy aktif edildi

### Component 1: Web Service
- [ ] Component name: `web`
- [ ] Type: `Web Service` seçildi
- [ ] Build command: `npm install && npm run build`
- [ ] Run command: `npm start`
- [ ] HTTP Port: `3000`
- [ ] HTTP Route: `/`
- [ ] Health check path: `/api/health`
- [ ] Instance size seçildi (Basic/Professional)
- [ ] Environment variables eklendi (hepsi)

### Component 2: Socket.IO Worker
- [ ] Component name: `socket-server`
- [ ] Type: `Worker` seçildi
- [ ] Build command: `npm install`
- [ ] Run command: `npm run start:socket`
- [ ] Instance size seçildi (Basic)
- [ ] Environment variables eklendi (hepsi)
- [ ] `SOCKET_CORS_ORIGIN` eklendi (web URL)

### Component 3: Poller Worker
- [ ] Component name: `poller-worker`
- [ ] Type: `Worker` seçildi
- [ ] Build command: `npm install`
- [ ] Run command: `npm run start:worker`
- [ ] Instance size seçildi (Basic)
- [ ] Environment variables eklendi (hepsi)

### Final Steps
- [ ] Tüm ayarlar gözden geçirildi
- [ ] "Create Resources" tıklandı
- [ ] Deployment başladı

---

## ⏱️ DEPLOYMENT PROGRESS (İlerleme Takibi)

### Build Phase
- [ ] Web component building... ✅
- [ ] Socket-server component building... ✅
- [ ] Poller-worker component building... ✅
- [ ] Build errors yok

### Deploy Phase
- [ ] Containers oluşturuluyor...
- [ ] Web service deployed ✅
- [ ] Socket server deployed ✅
- [ ] Poller worker deployed ✅

### Health Checks
- [ ] Web health check passing ✅
- [ ] App "Live" durumunda ✅

### Database Connection
- [ ] Database Trusted Sources güncellendi
- [ ] App Platform IP range eklendi
- [ ] Test connection başarılı

---

## ✅ POST-DEPLOYMENT (Deployment Sonrası)

### Temel Testler
- [ ] App URL açılıyor: `https://win-room-xxxxx.ondigitalocean.app`
- [ ] Health check çalışıyor: `/api/health` → `{"status":"ok"}`
- [ ] 404 hatası yok (Next.js routing çalışıyor)
- [ ] Login sayfası açılıyor: `/login`

### Component Logs Kontrolü

#### Web Component:
- [ ] Logs açıldı: `Components → web → Runtime Logs`
- [ ] Beklenen çıktı görüldü:
  ```
  ready - started server on 0.0.0.0:3000
  ```
- [ ] Error yok
- [ ] Warning'ler normal (eğer varsa)

#### Socket Server:
- [ ] Logs açıldı: `Components → socket-server → Runtime Logs`
- [ ] Beklenen çıktı görüldü:
  ```
  [Socket] Server listening on port 3001
  [Socket] CORS origins: https://...
  [Socket] Ready to accept connections
  [Socket] Starting event polling from ID: 0
  ```
- [ ] Error yok
- [ ] Database bağlantısı başarılı

#### Poller Worker:
- [ ] Logs açıldı: `Components → poller-worker → Runtime Logs`
- [ ] Beklenen çıktı görüldü:
  ```
  [Poller] Worker started
  [Poller] Polling interval: 2000ms
  [Poller] Connected to database
  ```
- [ ] Error yok
- [ ] Polling başladı

### Functional Tests

#### API Endpoints:
- [ ] `GET /api/health` → 200 OK
- [ ] `GET /api/queue` → Authentication error (beklenen)
- [ ] `POST /api/login` → Çalışıyor (test user ile)

#### Socket.IO:
- [ ] Browser console test:
  ```javascript
  const socket = io('https://win-room-xxxxx.ondigitalocean.app');
  socket.on('connect', () => console.log('Connected!'));
  ```
- [ ] Connection başarılı
- [ ] Event broadcast çalışıyor

#### Database:
- [ ] Web app'den database okuyabiliyor
- [ ] Poller worker database'e yazabiliyor
- [ ] Events table'a data yazılıyor

### Performance Tests
- [ ] Page load time < 3 saniye
- [ ] API response time < 500ms
- [ ] Socket.IO latency < 100ms
- [ ] Memory usage normal (< 80%)
- [ ] CPU usage normal (< 70%)

---

## 🔧 CONFIGURATION (Son Ayarlar)

### Domain Setup (Opsiyonel)
- [ ] Custom domain eklendi
- [ ] DNS CNAME kaydı eklendi
- [ ] SSL certificate oluşturuldu
- [ ] Domain üzerinden erişim çalışıyor

### Security
- [ ] Production JWT secret değiştirildi
- [ ] CORS origins production domain'e set edildi
- [ ] Database password güvenli
- [ ] Environment variables şifrelendi (SECRET type)

### Monitoring
- [ ] Metrics açıldı: `Insights` tab
- [ ] CPU/Memory kullanımı izleniyor
- [ ] Alerts kuruldu (opsiyonel):
  - [ ] CPU > 80%
  - [ ] Memory > 80%
  - [ ] Health check fails
- [ ] Email/Slack notification ayarlandı

### Scaling (Production için)
- [ ] Auto-scaling aktif edildi (opsiyonel)
- [ ] Min/Max instance sayısı ayarlandı
- [ ] CPU threshold belirlendi
- [ ] Load balancing çalışıyor

---

## 📊 VERIFICATION (Doğrulama)

### End-to-End Test
- [ ] Login yapılabildi
- [ ] Queue görüntüleniyor
- [ ] Claim işlemi çalışıyor
- [ ] Leaderboard güncelleniyor
- [ ] Real-time updates geliyor (Socket.IO)
- [ ] Personal goals görünüyor
- [ ] Admin panel erişilebilir (admin kullanıcı ile)

### Data Flow Test
- [ ] Poller yeni subscription'ları buluyor
- [ ] Queue'ya ekleniyor
- [ ] Event oluşturuluyor
- [ ] Socket.IO broadcast yapıyor
- [ ] Frontend'de gösteriliyor

### Error Handling
- [ ] 404 sayfası düzgün
- [ ] 500 hatası loglanıyor
- [ ] Authentication hataları düzgün
- [ ] Rate limiting çalışıyor
- [ ] Database connection retry çalışıyor

---

## 🎉 DEPLOYMENT COMPLETE!

Tüm checklistler tamamlandıysa, deployment başarılı! 🚀

### Sonraki Adımlar:
1. 📊 Metrics'i günlük izle
2. 📝 Logs'u kontrol et
3. 🐛 Bug rapor sistemini kur
4. 📈 Performance optimize et
5. 🔒 Security audit yap
6. 👥 Kullanıcı eğitimi ver
7. 📚 Documentation güncelle

---

## 📞 Support

Sorun olursa:
1. Logs kontrol et (her component için)
2. `DEPLOYMENT_GUIDE.md` → Troubleshooting bölümüne bak
3. DigitalOcean support ticket aç

**App Status**: https://cloud.digitalocean.com/apps/[app-id]

**Documentation**: `/DEPLOYMENT_GUIDE.md`

**Quick Start**: `/DEPLOYMENT_QUICK_START.md`

---

**Last Updated**: 2025-10-24
**Version**: 2.0.0
