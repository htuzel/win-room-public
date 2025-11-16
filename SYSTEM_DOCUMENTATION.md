# 🏆 WIN ROOM v2.0 - COMPREHENSIVE SYSTEM DOCUMENTATION

## 🎯 Overview

**Win Room** is a gamified Sales Room Management platform designed for sales teams, built specifically for Flalingo. It's a **real-time** system that motivates salespeople through competition, tracks performance, manages sales claims, and strengthens team collaboration.

---

## 🏗️ SYSTEM ARCHITECTURE

The project runs on **3 main services**:

### 1️⃣ **Next.js Web Application** (Port 3000)
- Frontend + Backend API
- React 18 + TypeScript
- Tailwind CSS for modern UI
- Framer Motion for animations
- JWT-based authentication
- Server-Side Rendering (SSR)

### 2️⃣ **Socket.IO Server** (Port 3001)
- WebSocket connections
- Real-time event broadcasting
- Polls database for new events every 500ms
- Sends instant notifications to all users
- Automatic reconnection with exponential backoff

### 3️⃣ **Poller Worker Service**
- Background worker that runs continuously
- Monitors `subscriptions` table (every 2 seconds)
- Detects new sales and adds them to queue
- Calculates financial metrics
- Performs duplicate detection
- Triggers achievements
- Daily maintenance tasks (cache cleanup, lead sync, overdue checks)

---

## 📊 DATA FLOW AND BUSINESS LOGIC

### **1. Sale Detection and Queue Addition**

```
CORE DATABASE (subscriptions table)
           ↓
   [POLLER WORKER] (checks every 2 seconds)
           ↓
   New record? → YES
           ↓
   ┌─────────────────────────┐
   │ DUPLICATE CHECK         │
   │ - User ID               │
   │ - Campaign ID           │
   │ - Date (hourly basis)   │
   │ - Stripe/PayPal Sub ID  │
   └─────────────────────────┘
           ↓
   Not duplicate? → YES
           ↓
   ┌─────────────────────────┐
   │ METRICS CALCULATION     │
   │ - Revenue (USD)         │
   │ - Cost (USD)            │
   │ - Margin ($, %)         │
   │ - Jackpot check         │
   └─────────────────────────┘
           ↓
   Campaign ID ≠ 65 (not trial) → YES
           ↓
   ┌─────────────────────────┐
   │ INSERT into wr.queue    │
   │ (status=pending)        │
   └─────────────────────────┘
           ↓
   ┌─────────────────────────┐
   │ INSERT into wr.events   │
   │ 'queue.new' event       │
   └─────────────────────────┘
           ↓
   [SOCKET SERVER] polls events
           ↓
   BROADCAST TO ALL USERS
           ↓
   [FRONTEND] Queue list updates
   📣 Notification sound plays
```

### **2. Financial Metrics Calculation (Critical)**

`lib/helpers/metrics.ts` handles all financial calculations:

#### **Revenue Calculation:**
```typescript
// Priority 1: subscriptions.subs_amount
// Fallback 2: payment_infos table paidPrice
// Currency conversion (TRY → USD, SAR → USD)

// Exchange Rates:
USD/TRY rate: From custom_settings table (key: 'dolar')
SAR rate: 3.75 (fixed)
Caching: 1 hour
```

#### **Cost Calculation:**
```typescript
// Cost per lesson:
25 minutes → $5
50 minutes → $10
20 minutes → $4
40 minutes → $8

// Total lessons:
totalLessons = campaign_length * per_week * 4

// Margin Multiplier (based on campaign duration):
1 month  → 1.0 (100%)
3 months → 0.9 (90%)
6 months → 0.8 (80%)
12 months → 0.7 (70%)

costUsd = totalLessons * lessonPrice * marginMultiplier
```

#### **Margin Calculation:**
```typescript
marginAmountUsd = revenue_usd - cost_usd
marginPercent = marginAmountUsd / revenue_usd
```

#### **Jackpot Check:**
```typescript
// Jackpot criteria:
1. revenue_usd >= 40000 TRY (USD equivalent: ~$950)
2. is_free = 0 (not free)
3. payment_channel ≠ 'Hediye' (not gift)
4. status IN ('paid', 'active')

// If jackpot → Achievement + Confetti + Sound
```

### **3. Claim (Sale Claim) Process**

```
USER → Clicks "Claim" button on Queue Card
           ↓
   [HoldToClaimButton] Holds for 700ms
           ↓
   POST /api/claim
           ↓
   ┌──────────────────────────────┐
   │ TRANSACTION STARTS           │
   │ (PostgreSQL Transaction)     │
   └──────────────────────────────┘
           ↓
   Already claimed? → NO
           ↓
   Queue item status = 'pending'? → YES
           ↓
   ┌──────────────────────────────┐
   │ 1. INSERT into wr.claims     │
   │    - subscription_id         │
   │    - claimed_by (seller_id)  │
   │    - claim_type              │
   │    - finance_status          │
   │    - installment info        │
   └──────────────────────────────┘
           ↓
   ┌──────────────────────────────┐
   │ 2. UPDATE wr.queue           │
   │    status = 'claimed'        │
   └──────────────────────────────┘
           ↓
   ┌──────────────────────────────┐
   │ 3. UPSERT wr.attribution     │
   │    - closer_seller_id        │
   │    - closer_share: 100%      │
   │    - assisted_share: 0%      │
   └──────────────────────────────┘
           ↓
   ┌──────────────────────────────┐
   │ 4. STREAK CHECK              │
   │    Same person consecutively?│
   │    3rd claim → STREAK!       │
   └──────────────────────────────┘
           ↓
   ┌──────────────────────────────┐
   │ 5. CREATE EVENTS             │
   │    - 'claimed' event         │
   │    - 'streak' event (optional)│
   │    - 'goal.progress' event   │
   └──────────────────────────────┘
           ↓
   TRANSACTION COMMIT
           ↓
   [FRONTEND] Instant sound + confetti
           ↓
   [SOCKET] Event broadcast
           ↓
   OTHER USERS see it too
```

### **4. Achievement System** 🏆

Worker service continuously monitors achievements:

#### **Streak (3 Consecutive Sales):**
```
Seller A → Claim
Seller A → Claim (2nd time)
Seller A → Claim (3rd time) → 🔥 STREAK!
→ Achievement badge
→ Confetti effect
→ "streak" sound plays
```

#### **Jackpot (Big Sale):**
```
Revenue ≥ 40,000 TRY → 🎰 JACKPOT!
→ Achievement badge
→ Special confetti effect (3 seconds)
→ "jackpot" sound
```

#### **Personal Revenue Milestones:**
Worker checks every 15 minutes:
```
Daily revenue:
- $4,000 → "4K Form"
- $8,000 → "8K Momentum"
- $10,000 → "10K Legend"
```

#### **Team Revenue Milestones:**
```
Team daily revenue:
- $20,000 → "20K Day" (daily_revenue)
- $30,000 → "30K Squad"
- $40,000 → "40K Power"
```

#### **Goal Completion:**
```
Personal goal 100% → "Personal Goal" achievement
Team goal 100% → "Team Goal" achievement
```

### **5. Leaderboard System**

4 different leaderboards:

#### **1. Revenue Leaderboard:**
```sql
SELECT seller_id,
       SUM(revenue_usd * share_percent) as total_revenue
FROM attribution_share_entries
WHERE claim_date = [period]
  AND NOT refunded
GROUP BY seller_id
ORDER BY total_revenue DESC
```

#### **2. Wins Leaderboard:**
```sql
SELECT claimed_by as seller_id,
       COUNT(*) as wins
FROM claims
WHERE claim_date = [period]
  AND NOT refunded
GROUP BY claimed_by
ORDER BY wins DESC
```

#### **3. Margin Leaderboard:**
```sql
SELECT seller_id,
       SUM((margin_amount_usd - adjustments) * share_percent) as total_margin
FROM claims + metrics + adjustments
GROUP BY seller_id
ORDER BY total_margin DESC
```

#### **4. Conversion Leaderboard:**
```sql
SELECT seller_id,
       (wins / leads_assigned) as conversion_rate
FROM claims + lead_assignments
GROUP BY seller_id
ORDER BY conversion_rate DESC
```

### **6. Lead Assignment Tracking**

Worker aggregates lead assignments daily:

```
[POLLER WORKER] every 24 hours
           ↓
   Fetches lead assignments from
   pipedrive_definitions + users tables
           ↓
   Stores in wr.lead_assignments_daily table
           ↓
   Conversion rate can be calculated
```

### **7. Installment System**

Admin or Finance can create installment plans:

```
1. Admin creates installment plan
   - total_installments
   - payment dates
   - amounts

2. Seller makes "installment" claim
   - claim_type = 'installment'
   - installment_plan_id specified

3. Payments tracked:
   - pending → submitted → confirmed
   - overdue check (daily)
   - tolerance period

4. Status transitions:
   - active → completed (all payments done)
   - active → frozen (frozen)
   - active → cancelled (cancelled)
```

### **8. Finance Approval Workflow**

Finance control in admin panel:

```
Queue Item
    ↓
Finance Status:
- waiting (default)
- approved (green)
- installment (blue)
- problem (red)
    ↓
When claimed
finance_status copied to claim
```

### **9. Adjustment System**

Admin can make adjustments to claims:

```
Claim #123
Original margin: $500
    ↓
Admin adds adjustment:
- Reason: "commission" / "partial_refund" / "chargeback"
- Amount: $50
    ↓
Adjusted margin: $500 - $50 = $450
    ↓
Leaderboard updates
'claim.adjusted' event broadcast
```

### **10. Objection System**

Sellers can object to claims:

```
Seller → "This is not my sale"
    ↓
POST /api/objections
- reason: 'wrong_owner' / 'duplicate' / 'refund' / 'other'
- details: explanation
    ↓
Admin sees it
    ↓
Admin decides:
- accepted → reassign / exclude / refund
- rejected → no action
```

---

## 🎨 FRONTEND FEATURES

### **Dashboard (Main Page)**

#### **Live Queue:**
- All unclaimed sales displayed in real-time
- Each card contains:
  - Campaign information
  - Customer info (email, name)
  - TTS (Time to Sale): Days from lead to sale
  - Economics (Revenue, Cost, Margin)
  - Margin quality indicator (High/Healthy/Risky/Watch)
  - Hold-to-Claim button (700ms hold)
  - Reaction bar (emoji reactions)

#### **Leaderboard:**
- 4 categories: Revenue / Wins / Margin / Conversion
- Bar chart view
- Normalized values (0-1)
- Your rank highlighted
- Period filter (Today, 15 Days, Month)

#### **Goals:**
- Global sales goals (whole team)
- Personal goals (only you)
- Progress bars
- Dynamic energy level (CSS variable)

#### **Achievement Stories:**
- Instagram story-style carousel
- Last 12 achievements
- Replay button (sound + animation replay)
- Emoji reactions

#### **Personal Metrics:**
- Wins, Revenue, Margin, Avg%, Leads, Conversion
- Comparison with previous period (↑↓ %)
- Only you see your own metrics

#### **Team Chat:**
- Real-time messaging
- 50 message limit
- Via WebSocket

#### **Promotion Banner:**
- Admin-defined announcements
- 4 variants: promo / info / success / warning

### **Overlays and Animations:**

#### **Streak Overlay:**
```typescript
// After 3 consecutive claims:
- Fullscreen overlay
- "🔥 STREAK" text
- Seller name
- Counter
- Shows for 2.6 seconds
- Confetti effect
```

#### **Jackpot Overlay:**
```typescript
// When big sale comes:
- "🎰 JACKPOT!" text
- 3.2 seconds
- Continuous confetti (from corners)
```

#### **Goal Celebration Overlay:**
```typescript
// When goal completed:
- Variant: member / team / daily
- Special title and subtitle
- 3.2 seconds
- Dynamic background colors
```

### **Admin Panel** (`/admin`)

Only admin, finance and sales_lead roles can access:

#### **Claims Management:**
- List all claims
- Detail modal (customer, economics, timeline)
- Change finance status
- Add adjustment
- Share adjustment (% split)
- Refund process

#### **Queue Management:**
- Pending items
- Add manual entry
- Exclude items
- Edit items
- Finance approval

#### **Seller Management:**
- List sellers
- Detailed performance
- Activation/deactivation

#### **Goals Management:**
- Create global goal
- Create personal goal
- Period: day / 15d / month
- Target type: count / revenue / margin_amount

#### **Installments Management:**
- All installment plans
- Dashboard: overdue, pending, active
- Payment confirmation
- Give tolerance
- Change status

#### **Promotions:**
- Create announcement
- Start/end date
- Variant selection

#### **Monthly Overview:**
- Monthly summary
- Revenue, margin, win trends
- Top performers

---

## 🔐 SECURITY AND AUTHORIZATION

### **JWT Authentication:**
```typescript
JWT Payload:
{
  seller_id: string,
  email: string,
  role: 'sales' | 'sales_lead' | 'admin' | 'finance',
  iat: number,
  exp: number
}
```

### **Role-Based Access:**
```
sales → Queue, dashboard, own sales
sales_lead → + Manual entry, team overview
finance → + Claims approval, finance status
admin → ALL PERMISSIONS
```

### **Rate Limiting:**
```typescript
// In-memory rate limiter
- Claim: 10 requests / minute
- API endpoints protected
```

### **Password Security:**
- bcrypt hashing (10 rounds)
- JWT token expiration (7 days default)
- Token stored in localStorage
- Auto logout on expiration

---

## 🔔 REAL-TIME EVENTS

Events broadcast via Socket.IO:

```typescript
'queue.new' → New sale added to queue
'claimed' → Sale claimed
'streak' → Streak achievement
'jackpot' → Jackpot sale
'goal.progress' → Goal progressed
'achievement.created' → New achievement
'queue.excluded' → Item excluded from queue
'refund.applied' → Refund processed
'objection.resolved' → Objection resolved
'claim.adjusted' → Claim adjusted
'finance.status_changed' → Finance status changed
'chat.message' → New message
'emoji.added' → Emoji added
'emoji.removed' → Emoji removed
```

Each event structure:
```typescript
{
  id: number,
  type: EventType,
  subscription_id?: number,
  actor?: string, // seller_id
  payload?: any,
  created_at: string
}
```

---

## 📁 DATABASE SCHEMA (wr schema)

```
wr.queue → Claims waiting in queue
wr.claims → Claimed sales
wr.attribution → Sale attributions
wr.attribution_share_entries → % share details
wr.subscription_metrics → Financial metrics (cache)
wr.claim_adjustments → Adjustments
wr.refunds → Refunds
wr.objections → Objections
wr.exclusions → Excluded items
wr.sellers → Seller information
wr.sales_goals → Global goals
wr.personal_goals → Personal goals
wr.progress_cache → Goal progress (cache)
wr.lead_assignments_daily → Daily lead assignments
wr.installments → Installment plans
wr.installment_payments → Installment payments
wr.achievements → Achievement badges
wr.reactions → Emoji reactions
wr.chats → Team messages
wr.events → Event log
wr.promotions → Announcements
wr.streak_state → Streak state
wr.cache_kv → Key-value cache
```

---

## 🎵 SOUNDS AND ANIMATIONS

### **Sound Files (Howler.js):**
```
notification.mp3 → New sale notification
claim.mp3 → Claim successful
streak.mp3 → Streak achievement
jackpot.mp3 → Jackpot
member_mission.mp3 → Personal goal
team_mission.mp3 → Team goal
happy.mp3 → Daily goal
sales_4k.mp3 → 4K milestone
sales_8k.mp3 → 8K milestone
sales_10k.mp3 → 10K milestone
team_30k.mp3 → 30K milestone
team_40k.mp3 → 40K milestone
```

### **Animations:**
- Framer Motion for smooth transitions
- Cards fade-in + slide-up
- Animated progress bars
- Confetti effects (canvas-confetti)
- Particle effects
- Hold-to-claim button with progress fill
- Pulsing ring effects
- Shimmer animations

---

## 🚀 DEPLOYMENT

### **Development:**
```bash
# 1. Copy environment file
cp .env.example .env
# Edit .env with your credentials

# 2. Install dependencies
npm install

# 3. Setup database
npm run db:migrate

# 4. Create admin user
npm run admin:create

# 5. Start all services (in separate terminals)
npm run dev              # Next.js (port 3000)
npm run dev:socket       # Socket server (port 3001)
npm run dev:worker       # Poller worker
```

### **Production:**
```bash
# 1. Build Next.js
npm run build

# 2. Start services (use PM2 or Kubernetes)
npm run start            # Next.js
npm run start:socket     # Socket server
npm run start:worker     # Poller worker
```

### **Environment Variables:**

See `.env.example` for all required variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database
# Or individual parameters
DB_HOST=localhost
DB_PORT=5432
DB_NAME=winroom
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# Socket.IO
SOCKET_PORT=3001
SOCKET_CORS_ORIGIN=http://localhost:3000

# Poller
POLLER_INTERVAL_MS=2000
POLLER_BATCH_SIZE=500

# Frontend
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

---

## 🔧 API ENDPOINTS

### **Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (admin only)
- `GET /api/auth/me` - Get current user info

### **Queue:**
- `GET /api/queue` - Get pending sales
- `POST /api/queue/manual` - Add manual queue entry (admin)

### **Claims:**
- `POST /api/claim` - Claim a sale
- `GET /api/claims/recent` - Recent claims for streak display

### **Leaderboards:**
- `GET /api/leaderboard/wins?period=today`
- `GET /api/leaderboard/revenue?period=today`
- `GET /api/leaderboard/margin?period=today`
- `GET /api/leaderboard/conversion?period=today`

### **Goals:**
- `GET /api/goals/progress` - Global goals progress
- `GET /api/me/goals` - Personal goals

### **Admin:**
- `GET /api/admin/claims` - All claims
- `PATCH /api/admin/claims/[id]` - Update claim
- `POST /api/admin/claims/[id]/adjustment` - Add adjustment
- `POST /api/admin/claims/[id]/refund` - Process refund
- `GET /api/admin/sellers` - All sellers
- `POST /api/admin/goals` - Create goal
- `GET /api/admin/installments` - All installment plans
- `POST /api/admin/promotions` - Create promotion

### **Objections:**
- `POST /api/objections` - Create objection
- `POST /api/admin/objections/[id]` - Resolve objection

### **Social:**
- `GET /api/chats` - Get chat messages
- `POST /api/chats` - Send message
- `POST /api/emojis` - React with emoji
- `DELETE /api/emojis` - Remove reaction

### **Achievements:**
- `GET /api/achievements?limit=12` - Recent achievements

---

## ⚠️ KNOWN ISSUES AND FIXES

### **Issues Fixed in This Version:**

1. ✅ **Migration Script Updated**
   - **Problem:** Script only ran 4 migrations, but 16 SQL files exist
   - **Fix:** Updated `scripts/db/migrate.js` to include all migration files

2. ✅ **.env.example Created**
   - **Problem:** No example environment file for developers
   - **Fix:** Created comprehensive `.env.example` with all variables

3. ✅ **WebSocket Reconnection**
   - **Problem:** No automatic reconnection on network interruption
   - **Fix:** Added reconnection logic with exponential backoff to `useSocket.ts`

4. ✅ **Cache Cleanup**
   - **Problem:** Expired cache entries not automatically cleaned
   - **Fix:** Created `lib/helpers/cache-cleanup.ts` helper function

### **Remaining Considerations for Production:**

1. **Rate Limiting:**
   - Current: In-memory (doesn't scale horizontally)
   - Recommendation: Use Redis or database-backed rate limiting

2. **Process Management:**
   - Use PM2, Docker, or Kubernetes for service orchestration
   - Implement health checks and auto-restart

3. **Database Connection Pool:**
   - Current: max 20 connections
   - Monitor and adjust based on load

4. **Monitoring:**
   - Add application monitoring (e.g., Sentry, DataDog)
   - Set up logging aggregation
   - Database query performance monitoring

5. **Caching Strategy:**
   - Consider Redis for hot data
   - CDN for static assets
   - Query result caching

---

## 📊 PERFORMANCE OPTIMIZATION

### **Database:**
- Indexes on frequently queried columns
- Connection pooling (max 20)
- Query result caching in `cache_kv` table
- Periodic cleanup of expired cache

### **Frontend:**
- Code splitting with Next.js
- Image optimization
- Lazy loading for heavy components
- Memoization for expensive calculations

### **Real-time:**
- Socket.IO rooms for targeted broadcasts
- Event batching to reduce network overhead
- Optimistic UI updates

---

## 🎯 CONCLUSION

**Win Room** is a sophisticated, real-time sales management platform built on **gamification** principles to motivate sales teams. Key features:

✅ **Real-time sales tracking**
✅ **Gamification** (streak, jackpot, achievements)
✅ **Leaderboard** competitions
✅ **Goal management** (personal and team)
✅ **Financial metric calculation** (revenue, cost, margin)
✅ **Installment system**
✅ **Objection mechanism**
✅ **Admin panel** (claims, queue, goals, installments)
✅ **Team chat**
✅ **Emoji reactions**
✅ **Sound and animation effects**

The system continuously pulls data from **PostgreSQL**, sends instant notifications via **Socket.IO**, and a background **Worker service** detects new sales, calculates metrics, and triggers achievements.

---

## 📝 LICENSE

This project is proprietary software developed for Flalingo.

---

## 👥 SUPPORT

For issues or questions:
- Technical Lead: [Contact Info]
- Documentation: This file
- Issues: Internal issue tracker
