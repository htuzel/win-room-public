# 📚 Win Room v2.0 - Tam Proje Dokümantasyonu

**Versiyon**: 2.0.0
**Son Güncelleme**: 2025-10-24
**Sahip**: Product + Engineering
**Dil**: Türkçe/İngilizce

---

## 📖 İçindekiler

1. [Proje Özeti](#1-proje-özeti)
2. [Özellikler](#2-özellikler)
3. [Teknoloji Yığını](#3-teknoloji-yığını)
4. [Mimari](#4-mimari)
5. [Veri Modeli](#5-veri-modeli)
6. [Yerel Kurulum ve Çalıştırma](#6-yerel-kurulum-ve-çalıştırma)
7. [API Endpoints](#7-api-endpoints)
8. [WebSocket Events](#8-websocket-events)
9. [Gizlilik ve Güvenlik](#9-gizlilik-ve-güvenlik)
10. [Hesaplama Kuralları](#10-hesaplama-kuralları)
11. [Deployment](#11-deployment)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Proje Özeti

**Win Room v2.0** - Privacy-first (gizlilik-ilk), oyunlaştırılmış, şeffaf ve adil bir satış odası sistemi.

### Ana Amaçlar:

- ✅ **Gerçek zamanlı satış takibi**: WebSocket ile anlık updates
- ✅ **Gizlilik-ilk tasarım**: Satışçılar kendi rakamlarını görür, başkalarının sadece sıralamasını
- ✅ **Claim sistemi**: Zorunlu claim ile kim hangi satışı aldı net
- ✅ **İtiraz yönetimi**: Satışçılar itiraz raiseable, admins resolve edebilir
- ✅ **Marj takibi**: Otomatik marj hesaplama
- ✅ **Hedefler**: Global ve kişisel hedefler tracking
- ✅ **Jackpot ödülleri**: 30,000 TRY üzeri satışlar için özel event

---

## 2. Özellikler

### 2.1 Temel Features

| Feature | Açıklama | Kto Kullanır |
|---------|----------|-------------|
| **Queue Management** | Pending satışların live queue'su | Sales Users |
| **Claim System** | Satış claim etme (first_sales, remarketing, upgrade, installment) | Sales Users |
| **Installment Management** | Taksit planı oluşturma, ödeme takibi, dondurma/tolerans akışları | Admin + Finance + Sales |
| **Lead Conversion Tracking** | Pipedrive owner bazlı lead ataması ve conversion rate leaderboard'u | Admin + Sales |
| **Leaderboards** | Wins ve Margin leaderboards (bar-only) | Sales Users |
| **Personal Metrics** | Kendi revenue, wins, margin analytics | Sales Users |
| **Goals Tracking** | Global ve kişisel hedefler progress | Sales Users |
| **Objections** | Satış itirazı ve admin çözümü | Sales + Admin |
| **Admin Panel** | Queue exclude, reassign, goal management | Admin Only |
| **Real-time Updates** | Socket.IO ile live push | All Users |
| **Dark Theme** | Professional dark UI | All Users |
| **Audio/Confetti** | Claim, streak, jackpot celebrations | Sales Users |

### 2.2 Gizlilik Kuralları

- **Sales User**: Kendi satışları (tam rakam), başkaları (bar + rank sadece)
- **Admin/Finance**: Tüm detaylar (sayılar, yüzdeler, marj)
- **Global Goals**: Sadece % gösterilir
- **Personal Goals**: Sadece owner görebilir

---

## 3. Teknoloji Yığını

### Frontend
- **Next.js 14** - React 19 ile
- **Tailwind CSS 4** - Dark theme
- **Socket.IO Client** - Real-time connection
- **Framer Motion** - Smooth animations
- **canvas-confetti** - Celebration effects
- **Howler.js** - Audio playback
- **TypeScript** - Type safety

### Backend
- **Node.js** - Runtime
- **Next.js API Routes** - REST endpoints
- **Socket.IO Server** - WebSocket server
- **TSX** - TypeScript execution

### Database
- **PostgreSQL 14+** - Primary DB
- **Schemas**:
  - `wr` - Win Room (read-write, application data)
  - Core schemas (read-only, from external system)

### DevOps
- **DigitalOcean App Platform** - Hosting
- **GitHub** - Version control
- **Docker** - Containerization (implicit in App Platform)

---

## 4. Mimari

### 4.1 System Architecture

```
┌─────────────────────────────────────┐
│       Browser (Sales User)          │
│  - Login, Queue, Leaderboards       │
│  - Real-time updates (Socket.IO)    │
└────────────┬────────────────────────┘
             │
      ┌──────┴─────────┬──────────────────┬────────────┐
      │                │                  │            │
   Next.js App      Socket.IO Server   Poller Worker  ...
  (port 3000)       (port 3001)        (background)
      │                │                  │
      └────────────────┼──────────────────┘
                       │
                ┌──────▼──────────┐
                │  PostgreSQL DB  │
                │  (wr + core)    │
                └─────────────────┘
```

### 4.2 Component Responsibilities

#### **Next.js Web App** (port 3000)
- React UI rendering
- REST API endpoints (`/api/...`)
- JWT authentication
- Static files serving

#### **Socket.IO Server** (port 3001)
- WebSocket connections
- Event broadcasting
- Real-time updates polling from DB
- CORS handling

#### **Poller Worker** (background)
- Every 2 seconds: subscriptions table'ını poll
- Fingerprint-based duplicate detection
- Metrics calculation (revenue, margin)
- Event generation
- Database writes to `wr` schema

---

## 5. Veri Modeli

### 5.1 Core Schema (READ-ONLY)

```
Dış sistemden senkronize edilmiş:
- subscriptions     → Satış verileri
- users            → Kullanıcı profilleri
- campaigns        → Kampanya bilgileri
- pipedrive_users  → Pipedrive entegrasyonu
- custom_settings  → İş ayarları (USD/TRY rate vb)
```

### 5.2 WR Schema (READ-WRITE) - Ana Data

#### **wr.queue** - Canlı satış sırası
```sql
id, subscription_id, user_id, status, fingerprint, created_at
Status: pending, claimed, excluded, expired, refunded
```

#### **wr.claims** - Claim kayıtları
```sql
id, subscription_id, claimed_by, claim_type, claimed_at
Claim types: first_sales, remarketing, upgrade, installment
```

#### **wr.attribution** - Satış atıfı
```sql
subscription_id, closer_seller_id, resolved_from, resolved_at
Resolved from: claim, pipedrive_owner, core_sales_person, manual
```

#### **wr.sellers** - Satışçı kimlik eşleme
```sql
seller_id, display_name, email, pipedrive_owner_id, is_active
```

#### **wr.sales_goals** - Global hedefler
```sql
id, period_type (day/15d/month), target_type, target_value
Visibility: admin_only, sales_percent_only
```

#### **wr.personal_goals** - Kişisel hedefler
```sql
id, seller_id, period_type, target_type, target_value
Visibility: owner_only (default)
```

#### **wr.objections** - İtiraz workflow
```sql
id, subscription_id, raised_by, reason, status, admin_note
Reasons: wrong_owner, duplicate, refund, other
Status: pending, accepted, rejected
```

#### **wr.subscription_metrics** - Hesaplanan metrikler
```sql
subscription_id, revenue_usd, cost_usd, margin_amount_usd,
margin_percent, is_jackpot, computed_at
```

#### **wr.events** - Event log (Socket broadcast için)
```sql
id, type, subscription_id, actor, payload, created_at
Types: queue.new, claimed, streak, jackpot, goal.progress,
       queue.excluded, refund.applied, objection.*, ...
```

#### **Diğer tablolar**
```
wr.progress_cache        → Goal progress % cache
wr.cache_kv              → General purpose KV cache
wr.exclusions            → Excluded sales records
wr.refunds               → Refund records
wr.streak_state          → Current streak state
```

---

## 6. Yerel Kurulum ve Çalıştırma

### 6.1 Ön Koşullar

```
- Node.js 18+
- PostgreSQL 14+
- Git
- npm veya yarn
```

### 6.2 Kurulum Adımları

#### Adım 1: Repository Clone
```bash
git clone https://github.com/yourorg/win-room.git
cd win-room
npm install
```

#### Adım 2: Environment Variables
```bash
cp .env.example .env
# .env düzenle:
# DATABASE_URL=postgresql://user:pass@localhost:5432/winroom
# JWT_SECRET=your-secret-key
# NODE_ENV=development
```

#### Adım 3: Database Setup
```bash
# PostgreSQL'e bağlan
psql -U your_user -d your_db

# SQL scripts'leri sırayla çalıştır
\i scripts/db/01_create_schema.sql
\i scripts/db/02_create_tables.sql
\i scripts/db/03_create_functions.sql
```

#### Adım 4: Admin Kullanıcı Oluştur
```bash
# Quick method (development)
npm run admin:create:quick
# Oluşturur: admin@winroom.local / admin role

# Interactive method (production)
npm run admin:create
# Seller ID, email, password, role vs. sorar
```

#### Adım 5: Test Kullanıcıları Ekle (Opsiyonel)
```bash
npm run admin:create
# seller_id: merve, role: sales

npm run admin:create
# seller_id: sait, role: sales
```

### 6.3 Development Mode Çalıştırma

**3 ayrı terminal gerekir:**

```bash
# Terminal 1: Next.js App (port 3000)
npm run dev

# Terminal 2: Socket.IO Server (port 3001)
npm run dev:socket

# Terminal 3: Poller Worker (background)
npm run dev:worker
```

### 6.4 Production Mode Çalıştırma

```bash
# Build önce
npm run build

# Terminal 1: Next.js
npm start

# Terminal 2: Socket Server
npm run start:socket

# Terminal 3: Poller Worker
npm run start:worker
```

### 6.5 Test Komutları

```bash
# Type check
npm run build

# Linter
npm run lint
```

---

## 7. API Endpoints

### 7.1 Authentication

#### POST `/api/auth/login`
```
Body: { email, password }
Response: { token, user: { seller_id, email, role } }
```

#### POST `/api/auth/logout`
```
Headers: Authorization: Bearer {token}
```

### 7.2 Sales User Endpoints

#### GET `/api/queue?limit=50`
Pending satışları getir
```
Response: [{
  subscription_id, user_id, tts (time-to-sale),
  margin_percent, status, suggested_seller
}]
```

#### POST `/api/claim`
Satış claim et
```
Body: { subscription_id, claimed_by, claim_type }
claim_type: first_sales | remarketing | upgrade | installment

Response: { success, claimed_at }
```

#### GET `/api/me/metrics?period=today|15d|month`
Kendi metriklerini getir
```
Response: {
  wins, revenue_usd, margin_amount_usd, avg_margin_percent
}
```

#### GET `/api/me/goals`
Kendi kişisel hedefleri getir
```
Response: [{
  id, target_type, target_value, current_progress, percent
}]
```

#### GET `/api/leaderboard/wins?period=today|15d|month`
Wins leaderboard (bar-only)
```
Response: [{
  seller_id, rank, bar_value_norm, you?: true
}]
```

#### GET `/api/leaderboard/margin?period=today|15d|month`
Margin leaderboard (bar-only)
```
Response: [{
  seller_id, rank, bar_value_norm, you?: true
}]
```

#### GET `/api/goals/progress`
Global hedeflerin progress % getir
```
Response: [{
  goal_id, target_type, period, percent
}]
```

#### POST `/api/objections`
Objection oluştur
```
Body: { subscription_id, reason, details }
reason: wrong_owner | duplicate | refund | other

Response: { id, status, created_at }
```

### 7.3 Admin Endpoints

#### GET/POST `/api/admin/goals`
Global hedefler CRUD

#### GET/POST `/api/admin/personal-goals`
Kişisel hedefler CRUD

#### POST `/api/admin/queue/exclude`
Satışı exclude et
```
Body: { subscription_id, reason, note }
```

#### POST `/api/admin/queue/restore`
Excluded satışı restore et

#### POST `/api/admin/reassign`
Satışı farklı satışçıya atayacak
```
Body: { subscription_id, new_seller_id }
```

#### PATCH `/api/admin/objections/:id`
Objection çöz
```
Body: { status, action, admin_note }
action: reassign | exclude | refund

Response: { status, resolved_at }
```

#### GET `/api/admin/metrics/subscription/:id`
Detaylı subscription metrikleri
```
Response: {
  subscription_id, revenue_usd, cost_usd, margin_amount_usd,
  margin_percent, is_jackpot, claimed_by, ...
}
```

---

## 8. WebSocket Events

### 8.1 Connection

```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: 'your-jwt-token' }
});
```

### 8.2 Server → Client Events

| Event | Payload | Açıklama |
|-------|---------|----------|
| `queue.new` | `{ subscription_id, user_id, margin_percent, suggested_seller }` | Yeni satış queue'ya eklendi |
| `claimed` | `{ subscription_id, claimed_by, claim_type }` | Satış claim edildi |
| `streak` | `{ claimer, count }` | 3 üst üste claim (streak) |
| `jackpot` | `{ subscription_id, claimed_by, revenue_usd }` | 30k+ TRY satış |
| `goal.progress` | `{ goal_id, percent, target_type }` | Global hedef % güncellendi |
| `queue.excluded` | `{ subscription_id, reason }` | Satış exclude edildi |
| `refund.applied` | `{ subscription_id }` | Refund tespit edildi |
| `objection.created` | `{ objection_id, subscription_id, reason }` | Yeni objection |
| `objection.resolved` | `{ objection_id, status }` | Objection çözüldü |

### 8.3 Client → Server Events

```typescript
// Sunucu otomatik broadcast yapar, client genelde listen eder
socket.on('queue.new', (data) => {
  console.log('New sale:', data);
});
```

---

## 9. Gizlilik ve Güvenlik

### 9.1 Gizlilik Kuralları

#### Sales User Görünürlüğü
```
KENDİ SATIŞLARI:
- Revenue (TRY/USD)
- Wins (count)
- Margin amount (USD)
- Margin percent (%)

BAŞKALARIN SATIŞLARI:
- Rank (sıra)
- Bar length (normalized 0..1)
- ❌ NO numbers, percentages
- ❌ NO revenue details
- ❌ NO margin data
```

#### Admin/Finance Görünürlüğü
```
✅ Tüm metrikler (detaylı)
✅ Tüm kullanıcılara ait data
✅ Query param ?detailed=true ile sayılar
```

#### Global Goals Görünürlüğü
```
Sales: Sadece % (0-100)
Admin: Tam rakamlar ve %)
```

### 9.2 Security Measures

- **JWT Authentication** - Token-based auth, 2 day expiry
- **Rate Limiting** - 60 rpm (general), 10 rpm (claim endpoint)
- **Database Roles**:
  - `core_ro` - Core tables SELECT only
  - `wr_rw` - WR schema R/W only
- **CORS** - Origin whitelist
- **Input Validation** - All endpoints validate input
- **SQL Injection Prevention** - Parameterized queries
- **Logging** - PII ve financial values maskelenir

---

## 10. Hesaplama Kuralları

### 10.1 USD/TRY Kuru

**Kaynak**: `custom_settings` tablo → `name='dolar'`

**Cache**: 1 gün (wr.cache_kv)

```sql
select wr_get_usd_try_rate() returns numeric
```

### 10.2 Revenue USD

```
IF currency = "USD" THEN
  revenue_usd = subs_amount

IF currency = "TRY" OR "TR" THEN
  revenue_usd = subs_amount / wr_get_usd_try_rate()
```

### 10.3 Cost USD (Kampanya maliyeti)

```
Lesson price:
  25 min → 5 USD
  50 min → 10 USD

cost_usd = campaign_length * per_week * 4 * lesson_price_usd
```

### 10.4 Margin

```
margin_amount_usd = MAX(revenue_usd - cost_usd, 0)

margin_percent = CASE
  WHEN revenue_usd > 0 THEN margin_amount_usd / revenue_usd
  ELSE 0
END
```

### 10.5 Jackpot Threshold

```
Threshold: 30,000 TRY

Şartlar:
- is_free = 0
- payment_channel != "Hediye"
- status IN ('paid', 'active')

USD kontrolü: 30000 / wr_get_usd_try_rate()
```

### 10.6 Statistics Date Calculation

**IMPORTANT**: All statistics (leaderboards, metrics, stats) are calculated based on **queue creation date** (wr.queue.created_at), not claim date.

**Logic**:
- Leads are counted in the period they entered the queue
- Claim date (wr.attribution.resolved_at) is used for sorting/display only
- Reporting: Filters by queue.created_at
- UI: Both dates displayed (queue creation + claim date)

**Rationale**:
- Queue entry date is more meaningful for performance measurement
- Delayed claims still count toward the correct period
- Real performance measured by when lead entered system, not when claimed

**Example**:
- Lead queued on Nov 5 → Claimed on Nov 7 → Counts toward Nov 5 statistics

**Implementation**:
```sql
-- All stats APIs filter by queue.created_at
WHERE q.created_at >= $start_date
  AND q.created_at < $end_date

-- UI shows both dates
queue_created_at: "2025-11-05 14:30"
claimed_at: "2025-11-07 09:15"
```

### 10.7 Fingerprint (Duplicate Detection)

```
SHA256(
  user_id +
  campaign_id +
  date_trunc('hour', created_at) +
  stripe_sub_id +
  paypal_sub_id
)

Aynı fingerprint 24h içinde tekrarsa: EXCLUDE
```

---

## 11. Deployment

### 11.1 Deployment Yöntemi: DigitalOcean App Platform

#### Gereksinimler
- GitHub repo
- DigitalOcean hesabı
- PostgreSQL database (already setup)

#### 3 Component Deploy

| Component | Type | Port | Command |
|-----------|------|------|---------|
| web | Web Service | 3000 | `npm start` |
| socket-server | Worker | 3001 | `npm run start:socket` |
| poller-worker | Worker | - | `npm run start:worker` |

#### Deployment Adımları (Özet)

```bash
# 1. Git push
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. App Platform'a git
# → Create App
# → GitHub repo seç
# → 3 component configure et
# → Environment variables ekle
# → Create Resources

# 3. 5-10 dakika bekle

# 4. Health check
curl https://your-app.ondigitalocean.app/api/health

# 5. Database setup (ilk kez)
npm run admin:create
```

#### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
CORE_DB_URL=postgresql://...

# JWT
JWT_SECRET=your-secure-secret-key
JWT_EXPIRES_IN=2d

# Socket
SOCKET_PORT=3001
SOCKET_CORS_ORIGIN=https://your-app.ondigitalocean.app

# Poller
POLLER_INTERVAL_MS=2000
POLLER_BATCH_SIZE=500

# Rate Limit
RATE_LIMIT_GENERAL=60
RATE_LIMIT_CLAIM=10

# Environment
NODE_ENV=production
```

#### Maliyet Tahmini

```
Basic instances:
  Web: $5/mo
  Socket: $5/mo
  Poller: $5/mo
  ────────────
  TOPLAM: $15/mo
```

### 11.2 Detaylı Deployment Guide

Bkz. [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Türkçe

### 11.3 Deployment Checklist

Bkz. [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Türkçe

---

## 12. Troubleshooting

### 12.1 Build Hatası

```
Error: Module not found

Çözüm:
npm install
npm run build
# Local'de test et, sonra push
```

### 12.2 Health Check Başarısız

```
Error: /api/health not found

Çözüm:
# app/api/health/route.ts oluştur
```

### 12.3 Socket.IO Bağlantı Hatası

```
Error: CORS origin not allowed

Çözüm:
# SOCKET_CORS_ORIGIN env variable kontrol et
# services/socket/server.ts'deki CORS config
```

### 12.4 Database Bağlantı Hatası

```
Error: connect ECONNREFUSED

Çözüm:
1. DATABASE_URL doğru mu?
2. Database firewall: Add Trusted Source
3. SSL mode: ?sslmode=require ekle
```

### 12.5 Poller Worker Çalışmıyor

```
Logs'ta hiç output yok

Çözüm:
1. DATABASE_URL kontrol et
2. POLLER_INTERVAL_MS set edilmiş mi?
3. Worker component logs kontrol et
```

### 12.6 Out of Memory Hatası

```
Error: JavaScript heap out of memory

Çözüm:
1. Instance size büyüt (Professional)
2. Memory leak debugla
3. Batch size azalt (POLLER_BATCH_SIZE)
```

---

## 📋 Hızlı Referans

### Dosya Yapısı
```
win-room/
├── app/                    # Next.js app
│   ├── api/               # API routes
│   ├── components/        # React components
│   └── layout.tsx         # App layout
├── lib/
│   ├── auth/              # JWT & middleware
│   ├── db/                # Database connection
│   ├── helpers/           # Utility functions
│   └── types/             # TypeScript types
├── services/
│   ├── socket/            # Socket.IO server
│   └── poller/            # Worker process
├── scripts/
│   └── db/                # Database migrations
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.js
└── PROJECT.md             # Bu dosya
```

### İmportant Notes

⚠️ **Database Safety**
- Core schema READ-ONLY
- Tüm yeni tables `wr` schema'sında
- SQL'i review et before production çalıştırma

⚠️ **JWT Secret**
- Production'da değiştir!
- Strong random string kullan
- Never commit to Git

⚠️ **Rate Limiting**
- General: 60 rpm
- Claim: 10 rpm
- User-based, IP-based kombine

### Kontrol Listesi: Production Deploy

- [ ] Git repo setup (GitHub)
- [ ] `.env` → `.gitignore`
- [ ] Database setup (PostgreSQL)
- [ ] Migrations çalıştırıldı
- [ ] Admin user oluşturuldu
- [ ] `npm run build` başarılı
- [ ] `npm run lint` temiz
- [ ] Environment variables ready
- [ ] Health check endpoint var
- [ ] 3 component configured
- [ ] Trusted sources added
- [ ] Deploy başladı

---

## 🤝 Katkıda Bulunma

Kod değişiklikleri TSD.md'deki spesifikasyonlara uymalıdır.

## 📄 License

Private - Internal Use Only

---

**Daha fazla bilgi için**:
- Technical Details: [TSD.md](./TSD.md)
- Deployment: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Quick Deploy: [DEPLOYMENT_QUICK_START.md](./DEPLOYMENT_QUICK_START.md)
- Deploy Checklist: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
