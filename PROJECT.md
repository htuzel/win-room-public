# 📚 Win Room v2.0 - Complete Project Documentation

**Version**: 2.0.0
**Last Updated**: 2025-10-24
**Owner**: Product + Engineering
**Language**: English

---

## 📖 Table of Contents

1. [Project Summary](#1-project-summary)
2. [Features](#2-features)
3. [Technology Stack](#3-technology-stack)
4. [Architecture](#4-architecture)
5. [Data Model](#5-data-model)
6. [Local Setup and Execution](#6-local-setup-and-execution)
7. [API Endpoints](#7-api-endpoints)
8. [WebSocket Events](#8-websocket-events)
9. [Privacy and Security](#9-privacy-and-security)
10. [Calculation Rules](#10-calculation-rules)
11. [Deployment](#11-deployment)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Project Summary

**Win Room v2.0** - A privacy-first, gamified, transparent, and fair sales room system.

### Main Objectives:

- ✅ **Real-time sales tracking**: Instant updates via WebSocket
- ✅ **Privacy-first design**: Sales users see their own numbers, others see only rankings
- ✅ **Claim system**: Mandatory claim clarifies who took which sale
- ✅ **Objection management**: Sales users can raise objections, admins can resolve them
- ✅ **Margin tracking**: Automatic margin calculation
- ✅ **Goals**: Global and personal goal tracking
- ✅ **Jackpot rewards**: Special event for sales over 30,000 TRY

---

## 2. Features

### 2.1 Core Features

| Feature | Description | Who Uses It |
|---------|-------------|-------------|
| **Queue Management** | Live queue of pending sales | Sales Users |
| **Claim System** | Claim a sale (first_sales, remarketing, upgrade, installment) | Sales Users |
| **Installment Management** | Installment plan creation, payment tracking, freeze/tolerance workflows | Admin + Finance + Sales |
| **Lead Conversion Tracking** | Pipedrive owner-based lead assignment and conversion rate leaderboard | Admin + Sales |
| **Leaderboards** | Wins and Margin leaderboards (bar-only) | Sales Users |
| **Personal Metrics** | Own revenue, wins, margin analytics | Sales Users |
| **Goals Tracking** | Global and personal goals progress | Sales Users |
| **Objections** | Sale objection and admin resolution | Sales + Admin |
| **Admin Panel** | Queue exclude, reassign, goal management | Admin Only |
| **Real-time Updates** | Live push via Socket.IO | All Users |
| **Dark Theme** | Professional dark UI | All Users |
| **Audio/Confetti** | Claim, streak, jackpot celebrations | Sales Users |

### 2.2 Privacy Rules

- **Sales User**: Own sales (full numbers), others (bar + rank only)
- **Admin/Finance**: All details (numbers, percentages, margin)
- **Global Goals**: Only % is shown
- **Personal Goals**: Only the owner can see

---

## 3. Technology Stack

### Frontend
- **Next.js 14** - With React 19
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

## 4. Architecture

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
- Every 2 seconds: Polls the subscriptions table
- Fingerprint-based duplicate detection
- Metrics calculation (revenue, margin)
- Event generation
- Database writes to `wr` schema

---

## 5. Data Model

### 5.1 Core Schema (READ-ONLY)

```
Synchronized from external system:
- subscriptions     → Sales data
- users            → User profiles
- campaigns        → Campaign information
- pipedrive_users  → Pipedrive integration
- custom_settings  → Business settings (USD/TRY rate, etc)
```

### 5.2 WR Schema (READ-WRITE) - Main Data

#### **wr.queue** - Live sales queue
```sql
id, subscription_id, user_id, status, fingerprint, created_at
Status: pending, claimed, excluded, expired, refunded
```

#### **wr.claims** - Claim records
```sql
id, subscription_id, claimed_by, claim_type, claimed_at
Claim types: first_sales, remarketing, upgrade, installment
```

#### **wr.attribution** - Sale attribution
```sql
subscription_id, closer_seller_id, resolved_from, resolved_at
Resolved from: claim, pipedrive_owner, core_sales_person, manual
```

#### **wr.sellers** - Seller identity mapping
```sql
seller_id, display_name, email, pipedrive_owner_id, is_active
```

#### **wr.sales_goals** - Global goals
```sql
id, period_type (day/15d/month), target_type, target_value
Visibility: admin_only, sales_percent_only
```

#### **wr.personal_goals** - Personal goals
```sql
id, seller_id, period_type, target_type, target_value
Visibility: owner_only (default)
```

#### **wr.objections** - Objection workflow
```sql
id, subscription_id, raised_by, reason, status, admin_note
Reasons: wrong_owner, duplicate, refund, other
Status: pending, accepted, rejected
```

#### **wr.subscription_metrics** - Calculated metrics
```sql
subscription_id, revenue_usd, cost_usd, margin_amount_usd,
margin_percent, is_jackpot, computed_at
```

#### **wr.events** - Event log (for Socket broadcast)
```sql
id, type, subscription_id, actor, payload, created_at
Types: queue.new, claimed, streak, jackpot, goal.progress,
       queue.excluded, refund.applied, objection.*, ...
```

#### **Other tables**
```
wr.progress_cache        → Goal progress % cache
wr.cache_kv              → General purpose KV cache
wr.exclusions            → Excluded sales records
wr.refunds               → Refund records
wr.streak_state          → Current streak state
```

---

## 6. Local Setup and Execution

### 6.1 Prerequisites

```
- Node.js 18+
- PostgreSQL 14+
- Git
- npm or yarn
```

### 6.2 Setup Steps

#### Step 1: Clone Repository
```bash
git clone https://github.com/yourorg/win-room.git
cd win-room
npm install
```

#### Step 2: Environment Variables
```bash
cp .env.example .env
# Edit .env:
# DATABASE_URL=postgresql://user:pass@localhost:5432/winroom
# JWT_SECRET=your-secret-key
# NODE_ENV=development
```

#### Step 3: Database Setup
```bash
# Connect to PostgreSQL
psql -U your_user -d your_db

# Run SQL scripts in order
\i scripts/db/01_create_schema.sql
\i scripts/db/02_create_tables.sql
\i scripts/db/03_create_functions.sql
```

#### Step 4: Create Admin User
```bash
# Quick method (development)
npm run admin:create:quick
# Creates: admin@winroom.local / admin role

# Interactive method (production)
npm run admin:create
# Will ask for: Seller ID, email, password, role, etc.
```

#### Step 5: Add Test Users (Optional)
```bash
npm run admin:create
# seller_id: merve, role: sales

npm run admin:create
# seller_id: sait, role: sales
```

### 6.3 Running Development Mode

**Requires 3 separate terminals:**

```bash
# Terminal 1: Next.js App (port 3000)
npm run dev

# Terminal 2: Socket.IO Server (port 3001)
npm run dev:socket

# Terminal 3: Poller Worker (background)
npm run dev:worker
```

### 6.4 Running Production Mode

```bash
# Build first
npm run build

# Terminal 1: Next.js
npm start

# Terminal 2: Socket Server
npm run start:socket

# Terminal 3: Poller Worker
npm run start:worker
```

### 6.5 Test Commands

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
Get pending sales
```
Response: [{
  subscription_id, user_id, tts (time-to-sale),
  margin_percent, status, suggested_seller
}]
```

#### POST `/api/claim`
Claim a sale
```
Body: { subscription_id, claimed_by, claim_type }
claim_type: first_sales | remarketing | upgrade | installment

Response: { success, claimed_at }
```

#### GET `/api/me/metrics?period=today|15d|month`
Get own metrics
```
Response: {
  wins, revenue_usd, margin_amount_usd, avg_margin_percent
}
```

#### GET `/api/me/goals`
Get own personal goals
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
Get global goals progress %
```
Response: [{
  goal_id, target_type, period, percent
}]
```

#### POST `/api/objections`
Create objection
```
Body: { subscription_id, reason, details }
reason: wrong_owner | duplicate | refund | other

Response: { id, status, created_at }
```

### 7.3 Admin Endpoints

#### GET/POST `/api/admin/goals`
Global goals CRUD

#### GET/POST `/api/admin/personal-goals`
Personal goals CRUD

#### POST `/api/admin/queue/exclude`
Exclude a sale
```
Body: { subscription_id, reason, note }
```

#### POST `/api/admin/queue/restore`
Restore excluded sale

#### POST `/api/admin/reassign`
Reassign sale to different seller
```
Body: { subscription_id, new_seller_id }
```

#### PATCH `/api/admin/objections/:id`
Resolve objection
```
Body: { status, action, admin_note }
action: reassign | exclude | refund

Response: { status, resolved_at }
```

#### GET `/api/admin/metrics/subscription/:id`
Detailed subscription metrics
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

| Event | Payload | Description |
|-------|---------|-------------|
| `queue.new` | `{ subscription_id, user_id, margin_percent, suggested_seller }` | New sale added to queue |
| `claimed` | `{ subscription_id, claimed_by, claim_type }` | Sale claimed |
| `streak` | `{ claimer, count }` | 3 consecutive claims (streak) |
| `jackpot` | `{ subscription_id, claimed_by, revenue_usd }` | 30k+ TRY sale |
| `goal.progress` | `{ goal_id, percent, target_type }` | Global goal % updated |
| `queue.excluded` | `{ subscription_id, reason }` | Sale excluded |
| `refund.applied` | `{ subscription_id }` | Refund detected |
| `objection.created` | `{ objection_id, subscription_id, reason }` | New objection |
| `objection.resolved` | `{ objection_id, status }` | Objection resolved |

### 8.3 Client → Server Events

```typescript
// Server automatically broadcasts, client typically listens
socket.on('queue.new', (data) => {
  console.log('New sale:', data);
});
```

---

## 9. Privacy and Security

### 9.1 Privacy Rules

#### Sales User Visibility
```
OWN SALES:
- Revenue (TRY/USD)
- Wins (count)
- Margin amount (USD)
- Margin percent (%)

OTHERS' SALES:
- Rank (position)
- Bar length (normalized 0..1)
- ❌ NO numbers, percentages
- ❌ NO revenue details
- ❌ NO margin data
```

#### Admin/Finance Visibility
```
✅ All metrics (detailed)
✅ All users' data
✅ Query param ?detailed=true for numbers
```

#### Global Goals Visibility
```
Sales: Only % (0-100)
Admin: Full numbers and %
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
- **Logging** - PII and financial values are masked

---

## 10. Calculation Rules

### 10.1 USD/TRY Exchange Rate

**Source**: `custom_settings` table → `name='dolar'`

**Cache**: 1 day (wr.cache_kv)

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

### 10.3 Cost USD (Campaign cost)

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

Conditions:
- is_free = 0
- payment_channel != "Hediye" (Gift)
- status IN ('paid', 'active')

USD check: 30000 / wr_get_usd_try_rate()
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

If same fingerprint repeats within 24h: EXCLUDE
```

---

## 11. Deployment

### 11.1 Deployment Method: DigitalOcean App Platform

#### Requirements
- GitHub repo
- DigitalOcean account
- PostgreSQL database (already setup)

#### 3 Component Deploy

| Component | Type | Port | Command |
|-----------|------|------|---------|
| web | Web Service | 3000 | `npm start` |
| socket-server | Worker | 3001 | `npm run start:socket` |
| poller-worker | Worker | - | `npm run start:worker` |

#### Deployment Steps (Summary)

```bash
# 1. Git push
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. Go to App Platform
# → Create App
# → Select GitHub repo
# → Configure 3 components
# → Add environment variables
# → Create Resources

# 3. Wait 5-10 minutes

# 4. Health check
curl https://your-app.ondigitalocean.app/api/health

# 5. Database setup (first time)
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

#### Cost Estimate

```
Basic instances:
  Web: $5/mo
  Socket: $5/mo
  Poller: $5/mo
  ────────────
  TOTAL: $15/mo
```

### 11.2 Detailed Deployment Guide

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

### 11.3 Deployment Checklist

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

---

## 12. Troubleshooting

### 12.1 Build Error

```
Error: Module not found

Solution:
npm install
npm run build
# Test locally, then push
```

### 12.2 Health Check Failed

```
Error: /api/health not found

Solution:
# Create app/api/health/route.ts
```

### 12.3 Socket.IO Connection Error

```
Error: CORS origin not allowed

Solution:
# Check SOCKET_CORS_ORIGIN env variable
# Check CORS config in services/socket/server.ts
```

### 12.4 Database Connection Error

```
Error: connect ECONNREFUSED

Solution:
1. Is DATABASE_URL correct?
2. Database firewall: Add Trusted Source
3. SSL mode: Add ?sslmode=require
```

### 12.5 Poller Worker Not Working

```
No output in logs

Solution:
1. Check DATABASE_URL
2. Is POLLER_INTERVAL_MS set?
3. Check worker component logs
```

### 12.6 Out of Memory Error

```
Error: JavaScript heap out of memory

Solution:
1. Increase instance size (Professional)
2. Debug memory leak
3. Reduce batch size (POLLER_BATCH_SIZE)
```

---

## 📋 Quick Reference

### File Structure
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
└── PROJECT.md             # This file
```

### Important Notes

⚠️ **Database Safety**
- Core schema READ-ONLY
- All new tables in `wr` schema
- Review SQL before running in production

⚠️ **JWT Secret**
- Change in production!
- Use strong random string
- Never commit to Git

⚠️ **Rate Limiting**
- General: 60 rpm
- Claim: 10 rpm
- User-based, IP-based combined

### Checklist: Production Deploy

- [ ] Git repo setup (GitHub)
- [ ] `.env` → `.gitignore`
- [ ] Database setup (PostgreSQL)
- [ ] Migrations executed
- [ ] Admin user created
- [ ] `npm run build` successful
- [ ] `npm run lint` clean
- [ ] Environment variables ready
- [ ] Health check endpoint exists
- [ ] 3 components configured
- [ ] Trusted sources added
- [ ] Deploy started

---

## 🤝 Contributing

Code changes must comply with specifications in TSD.md.

## 📄 License

Private - Internal Use Only

---

**For more information**:
- Technical Details: [TSD.md](./TSD.md)
- Deployment: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Quick Deploy: [DEPLOYMENT_QUICK_START.md](./DEPLOYMENT_QUICK_START.md)
- Deploy Checklist: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
