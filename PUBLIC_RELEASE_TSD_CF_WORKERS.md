# WIN ROOM PUBLIC RELEASE - CLOUDFLARE WORKERS EDITION
## Technical Specification Document (TSD)

**Version**: 2.0 (Cloudflare Workers Architecture)
**Date**: 2025-02-17
**Status**: ✅ PRODUCTION-READY ARCHITECTURE
**Target Audience**: Full-stack engineers (junior+), DevOps, Product
**Estimated Timeline**: 8-10 weeks (quality-first approach)

---

## 📋 EXECUTIVE SUMMARY

This TSD defines the complete transformation of Win Room from an internal tool to a **public SaaS product** running on **Cloudflare Workers** infrastructure.

### Key Changes from Original TSD

| Aspect | ❌ Original TSD | ✅ This Document |
|--------|----------------|-----------------|
| **Runtime** | Node.js 20+ | Cloudflare Workers (V8) |
| **API Framework** | Next.js API Routes | Hono on Workers |
| **Database** | PostgreSQL direct | PostgreSQL via Hyperdrive |
| **Job Queue** | pg-boss | Cloudflare Queues |
| **Real-time** | Socket.IO | Durable Objects + WebSockets |
| **Caching** | Redis | Cloudflare KV |
| **Frontend** | Next.js App Router | Remix on Cloudflare Pages |
| **Product System** | ❌ Missing | ✅ Full product catalog with margin calc |
| **i18n** | ❌ Half-baked | ✅ English-only, enforced by linting |
| **Multi-tenancy** | ❌ Nullable tenant_key | ✅ Proper tenant table + isolation |

---

## 🎯 GOALS & NON-GOALS

### Goals
1. ✅ **Cloudflare Workers-native** architecture (global edge deployment, <50ms P95 latency)
2. ✅ **Product-based system** (simple catalog: name + cost → auto-calculate margins)
3. ✅ **English-only** (remove all Turkish strings, enforce with CI)
4. ✅ **Generic SaaS platform** (any sales team can use, proper multi-tenancy)
5. ✅ **Clean public codebase** (single TSD, remove finance/installment modules)

### Non-Goals
- ❌ Advanced product variants/bundles (keep simple for v1)
- ❌ Multi-language i18n (English only, add later if needed)
- ❌ Finance/installment tracking (completely removed)
- ❌ Legacy subscription polling (replaced with event ingestion API)

---

## 📚 TABLE OF CONTENTS

### Part I: Architecture
1. [Problem Statement](#1-problem-statement)
2. [Cloudflare Workers Architecture](#2-cloudflare-workers-architecture)
3. [Database Schema (with Products)](#3-database-schema)
4. [API Design](#4-api-design)
5. [Real-time System](#5-real-time-system)

### Part II: Implementation Workstreams
6. [Workstream A: Environment Setup](#6-workstream-a-environment-setup)
7. [Workstream B: Database Migration](#7-workstream-b-database-migration)
8. [Workstream C: API Layer (Hono)](#8-workstream-c-api-layer)
9. [Workstream D: Queue Consumer](#9-workstream-d-queue-consumer)
10. [Workstream E: Real-time (Durable Objects)](#10-workstream-e-real-time)
11. [Workstream F: Frontend Migration](#11-workstream-f-frontend-migration)
12. [Workstream G: Cleanup & English-Only](#12-workstream-g-cleanup)

### Part III: Operations
13. [Testing Strategy](#13-testing-strategy)
14. [Deployment Guide](#14-deployment-guide)
15. [Monitoring & Alerting](#15-monitoring)
16. [Operational Runbook](#16-operational-runbook)
17. [Launch Checklist](#17-launch-checklist)

### Part IV: Appendices
18. [Glossary](#18-glossary)
19. [Migration from Current System](#19-migration-guide)
20. [Cost Analysis](#20-cost-analysis)

---

## 1. PROBLEM STATEMENT

### Current State
- **Tied to subscriptions table**: Worker polls `subscriptions` table from internal system
- **Not generic**: Hard-coded logic for specific business
- **Mixed languages**: Turkish/English strings throughout
- **Unnecessary features**: Finance, installments, margin tracking tied to internal products
- **Not SaaS-ready**: No multi-tenancy, no public API, manual deployment

### Target State
- **Generic event ingestion**: POST sale events via API, no subscription dependency
- **Product-based margins**: Simple product catalog, optional cost tracking for margin calc
- **English-only**: Clean codebase, enforced by CI
- **Edge-deployed SaaS**: Runs on Cloudflare Workers, <50ms latency globally
- **Multi-tenant**: Proper tenant isolation, API key per tenant

### Success Metrics
✅ Any company can sign up and start using within 30 minutes
✅ API ingests 1000+ events/min with <100ms P95 latency
✅ Real-time updates reach users within 2 seconds
✅ Zero Turkish strings in production build
✅ Deploy to new tenant in <5 minutes

---

## 2. CLOUDFLARE WORKERS ARCHITECTURE

### 2.1 High-Level Flow

```
External CRM/API
      │
      ▼
┌─────────────────────────────────────────┐
│  POST /api/events                       │
│  (Cloudflare Worker - Hono)             │
│   - Validate with Zod                   │
│   - Rate limit (KV)                     │
│   - Insert to wr.sales_events           │
│   - Enqueue to Cloudflare Queue         │
└───────────────┬─────────────────────────┘
                │
                ▼
       ┌────────────────────┐
       │ Cloudflare Queue   │
       │ (sales-events)     │
       └────────┬───────────┘
                │
                ▼
       ┌────────────────────┐
       │ Queue Consumer     │
       │ Worker             │
       │  - Process event   │
       │  - Create queue    │
       │    item            │
       │  - Calc margin     │
       │  - Notify DO       │
       └────────┬───────────┘
                │
                ▼
       ┌────────────────────┐
       │ Durable Object     │
       │ (Real-time Room)   │
       │  - Broadcast via   │
       │    WebSocket       │
       └────────────────────┘
                │
                ▼
       ┌────────────────────┐
       │ Remix Frontend     │
       │ (Cloudflare Pages) │
       └────────────────────┘
```

### 2.2 Component Breakdown

#### **A. API Layer (Hono on Workers)**
- **Framework**: Hono v4+ (lightweight, edge-optimized)
- **Validation**: Zod schemas
- **Auth**: JWT + Cloudflare Access
- **Rate Limiting**: KV-based (100 req/min per tenant)
- **Database**: PostgreSQL via Hyperdrive (connection pooling)

**Why Hono?**
- 3x faster than Express on Workers
- TypeScript-first, great DX
- Middleware ecosystem (CORS, auth, logging)
- <5KB bundle size

#### **B. Database (PostgreSQL + Hyperdrive)**
- **Provider**: Neon, Supabase, or Railway
- **Connection**: Cloudflare Hyperdrive (smart connection pooler)
- **ORM**: Drizzle ORM (edge-compatible, type-safe)
- **Schema**: PostgreSQL 14+ with `wr` schema

**Why Hyperdrive?**
- Solves "no TCP from Workers" problem
- Connection pooling (Workers can't maintain pools)
- Caching layer (reduces DB roundtrips by ~80%)
- Works with any Postgres provider

#### **C. Job Queue (Cloudflare Queues)**
- **Queue**: `sales-events` (processes incoming events)
- **Consumer**: Dedicated Worker (auto-scales)
- **Retry**: Exponential backoff (3 retries, then DLQ)
- **Throughput**: 10,000+ messages/sec

**Why CF Queues?**
- Native integration (no external service)
- $0.50 per million messages (cheap)
- Guaranteed delivery, exactly-once processing
- Built-in DLQ

#### **D. Real-time (Durable Objects + WebSockets)**
- **DO**: `QueueRoom` (one per tenant, or global)
- **Protocol**: WebSocket Hibernation API
- **Broadcast**: New queue items, claims, leaderboard updates
- **Scaling**: Automatic (Cloudflare manages)

**Why Durable Objects?**
- Stateful Workers (can hold connections)
- WebSocket Hibernation (low cost when idle)
- Strong consistency (single-threaded per instance)
- No need for Redis pub/sub

#### **E. Frontend (Remix on Cloudflare Pages)**
- **Framework**: Remix v2+ (or Next.js static export)
- **Deployment**: Cloudflare Pages (git push to deploy)
- **Data Loading**: Remix loaders call Hono API
- **Real-time**: WebSocket client connects to DO

**Why Remix?**
- Built for edge (Cloudflare is tier-1 platform)
- Better data loading than Next.js App Router
- Nested routes (great for dashboards)
- Progressive enhancement (works without JS)

#### **F. Caching (Cloudflare KV)**
- **Use cases**:
  - Leaderboard cache (TTL 30s)
  - Rate limiting counters
  - API key lookup (avoid DB hit)
- **Limits**: 1GB free, 1ms read latency

---

### 2.3 Deployment Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Cloudflare Global Network (300+ cities)                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐  │
│  │ Pages       │   │ Workers     │   │ Durable      │  │
│  │ (Remix)     │   │ (Hono API)  │   │ Objects      │  │
│  └─────────────┘   └─────────────┘   └──────────────┘  │
│                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐  │
│  │ KV          │   │ Queues      │   │ R2 (files)   │  │
│  │ (cache)     │   │ (jobs)      │   │ [optional]   │  │
│  └─────────────┘   └─────────────┘   └──────────────┘  │
└─────────────────────────┬────────────────────────────────┘
                          │
                          │ Hyperdrive (pooled connection)
                          ▼
                 ┌────────────────┐
                 │ PostgreSQL     │
                 │ (Neon/Supabase)│
                 │ us-east-1      │
                 └────────────────┘
```

**Key Decisions**:
- ✅ Database in single region (us-east-1) - Hyperdrive makes latency negligible
- ✅ Static assets on Cloudflare CDN (auto-cached)
- ✅ API requests routed to nearest datacenter (smart routing)
- ✅ Durable Objects colocated with database (if tenant-specific, pin to region)

---

## 3. DATABASE SCHEMA

### 3.1 Core Tables (Revised for Products)

#### **wr.tenants** (NEW - Multi-tenancy)
```sql
CREATE TABLE wr.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE, -- e.g., 'acme-corp'
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON wr.tenants(slug);
```

#### **wr.products** (NEW - Product Catalog)
```sql
CREATE TABLE wr.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES wr.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT, -- optional SKU
  default_cost NUMERIC(12,2), -- default cost (can be overridden per sale)
  category TEXT, -- e.g., 'software', 'hardware'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_product_tenant_name UNIQUE (tenant_id, name)
);

CREATE INDEX idx_products_tenant ON wr.products(tenant_id) WHERE is_active = TRUE;
```

#### **wr.sales_events** (Event Source)
```sql
CREATE TABLE wr.sales_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES wr.tenants(id) ON DELETE CASCADE,
  sale_id TEXT NOT NULL, -- client-provided ID
  external_event_id TEXT, -- for idempotency
  source TEXT NOT NULL DEFAULT 'api' CHECK (source IN ('api','manual','import')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_sales_events_tenant_sale_id UNIQUE (tenant_id, sale_id)
);

CREATE INDEX idx_sales_events_pending
  ON wr.sales_events(tenant_id, status, created_at)
  WHERE status = 'pending';

CREATE UNIQUE INDEX idx_sales_events_external_id
  ON wr.sales_events(tenant_id, external_event_id)
  WHERE external_event_id IS NOT NULL;
```

#### **wr.queue** (Queue Items with Product Link)
```sql
CREATE TABLE wr.queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES wr.tenants(id) ON DELETE CASCADE,
  sale_id TEXT NOT NULL,
  product_id UUID REFERENCES wr.products(id) ON DELETE SET NULL, -- NEW
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','claimed','excluded')),

  -- Sale details
  customer_name TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'api',

  -- Financial (Product-based)
  sell_price NUMERIC(12,2) NOT NULL, -- NEW: required
  cost_price NUMERIC(12,2), -- NEW: optional, overrides product.default_cost
  margin_amount NUMERIC(12,2) GENERATED ALWAYS AS (sell_price - COALESCE(cost_price, 0)) STORED,
  margin_pct NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN sell_price > 0 THEN ((sell_price - COALESCE(cost_price, 0)) / sell_price * 100)
      ELSE 0
    END
  ) STORED,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Assignment
  assigned_seller_id TEXT REFERENCES wr.sellers(seller_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_queue_tenant_sale_id UNIQUE (tenant_id, sale_id)
);

CREATE INDEX idx_queue_tenant_status ON wr.queue(tenant_id, status);
CREATE INDEX idx_queue_tenant_occurred ON wr.queue(tenant_id, occurred_at DESC);
CREATE INDEX idx_queue_product ON wr.queue(product_id) WHERE product_id IS NOT NULL;
```

**Key Changes**:
- ✅ Added `product_id` foreign key (optional - can still create sales without product)
- ✅ `sell_price` is required (was `amount`, now more explicit)
- ✅ `cost_price` is optional (defaults to `product.default_cost` if not provided)
- ✅ `margin_amount` and `margin_pct` auto-calculated via generated columns
- ✅ All tables have `tenant_id` for proper isolation

#### **wr.claims** (Unchanged, add tenant_id)
```sql
CREATE TABLE wr.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES wr.tenants(id) ON DELETE CASCADE,
  sale_id TEXT NOT NULL,
  claimed_by TEXT NOT NULL REFERENCES wr.sellers(seller_id),
  claim_type TEXT NOT NULL CHECK (claim_type IN ('first_touch','upsell','retention')),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_claims_tenant_sale_id UNIQUE (tenant_id, sale_id)
);

CREATE INDEX idx_claims_tenant_seller ON wr.claims(tenant_id, claimed_by);
```

#### **wr.sellers** (Add tenant_id)
```sql
CREATE TABLE wr.sellers (
  seller_id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES wr.tenants(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sellers_tenant ON wr.sellers(tenant_id) WHERE is_active = TRUE;
```

---

### 3.2 Supporting Tables

#### **wr.api_keys** (Tenant API Keys)
```sql
CREATE TABLE wr.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES wr.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Production API Key'
  key_hash TEXT NOT NULL, -- SHA-256 hash
  key_prefix TEXT NOT NULL, -- First 8 chars for identification (e.g., 'wr_live_12345678...')
  created_by TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_api_keys_hash ON wr.api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_tenant ON wr.api_keys(tenant_id);
```

#### **wr.api_audit_log** (API Usage Tracking)
```sql
CREATE TABLE wr.api_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES wr.tenants(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES wr.api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  http_method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  request_ip INET,
  user_agent TEXT,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_created ON wr.api_audit_log(tenant_id, created_at DESC);
```

#### **wr.events** (Immutable Event Log)
```sql
CREATE TABLE wr.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES wr.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'queue.created', 'claim.created', etc.
  sale_id TEXT NOT NULL,
  actor TEXT, -- seller_id or 'system'
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_tenant_type ON wr.events(tenant_id, type, created_at DESC);
CREATE INDEX idx_events_sale_id ON wr.events(sale_id);
```

---

### 3.3 Row-Level Security (RLS)

**Enable RLS for tenant isolation**:
```sql
ALTER TABLE wr.sales_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE wr.queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE wr.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE wr.products ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their tenant's data
CREATE POLICY tenant_isolation_sales_events ON wr.sales_events
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_queue ON wr.queue
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_claims ON wr.claims
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_products ON wr.products
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**Set tenant context in application**:
```typescript
// Before each query, set tenant context
await db.execute(sql`SET app.current_tenant_id = ${tenantId}`);
```

---

## 4. API DESIGN

### 4.1 API Structure (Hono)

```typescript
// src/api/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { eventsRouter } from './routes/events';
import { queueRouter } from './routes/queue';
import { productsRouter } from './routes/products';

type Bindings = {
  DB: Hyperdrive; // Hyperdrive binding
  QUEUE: Queue; // Cloudflare Queue
  KV: KVNamespace; // Rate limiting
  QUEUE_ROOM: DurableObjectNamespace; // Real-time
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Mount routers
app.route('/api/events', eventsRouter);
app.route('/api/queue', queueRouter);
app.route('/api/products', productsRouter);

export default app;
```

### 4.2 Event Ingestion Endpoint

**POST /api/events**

```typescript
// src/api/routes/events.ts
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';

const eventSchema = z.object({
  sale_id: z.string().max(255),
  occurred_at: z.string().datetime(), // ISO 8601
  customer_name: z.string().max(500),
  sell_price: z.number().positive(), // NEW: required
  cost_price: z.number().positive().optional(), // NEW: optional
  product_id: z.string().uuid().optional(), // NEW: optional product reference
  currency: z.enum(['USD', 'EUR', 'GBP', 'TRY']).default('USD'),
  seller_external_id: z.string().max(255),
  category: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export const eventsRouter = new Hono()
  .post(
    '/',
    authMiddleware, // Validate API key, set c.var.tenantId
    rateLimitMiddleware, // 100 req/min via KV
    zValidator('json', eventSchema),
    async (c) => {
      const data = c.req.valid('json');
      const tenantId = c.var.tenantId;

      // 1. Insert to sales_events table
      const eventId = crypto.randomUUID();
      await c.env.DB.prepare(`
        INSERT INTO wr.sales_events (id, tenant_id, sale_id, payload, source)
        VALUES (?1, ?2, ?3, ?4, 'api')
      `).bind(eventId, tenantId, data.sale_id, JSON.stringify(data)).run();

      // 2. Enqueue to Cloudflare Queue for processing
      await c.env.QUEUE.send({
        eventId,
        tenantId,
        payload: data,
      });

      // 3. Return 202 Accepted
      return c.json({
        eventId,
        status: 'pending',
        message: 'Event received and queued for processing',
      }, 202);
    }
  );
```

### 4.3 Products API

**POST /api/products** (Create Product)

```typescript
// src/api/routes/products.ts
const productSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().max(100).optional(),
  default_cost: z.number().positive().optional(),
  category: z.string().max(100).optional(),
});

export const productsRouter = new Hono()
  .post(
    '/',
    authMiddleware,
    zValidator('json', productSchema),
    async (c) => {
      const data = c.req.valid('json');
      const tenantId = c.var.tenantId;

      const productId = crypto.randomUUID();
      await c.env.DB.prepare(`
        INSERT INTO wr.products (id, tenant_id, name, sku, default_cost, category)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      `).bind(
        productId,
        tenantId,
        data.name,
        data.sku || null,
        data.default_cost || null,
        data.category || null
      ).run();

      return c.json({ id: productId, ...data }, 201);
    }
  );
```

**GET /api/products** (List Products)

```typescript
  .get('/', authMiddleware, async (c) => {
    const tenantId = c.var.tenantId;

    const { results } = await c.env.DB.prepare(`
      SELECT id, name, sku, default_cost, category, is_active, created_at
      FROM wr.products
      WHERE tenant_id = ?1 AND is_active = TRUE
      ORDER BY name ASC
    `).bind(tenantId).all();

    return c.json({ products: results });
  });
```

---

## 5. REAL-TIME SYSTEM

### 5.1 Durable Object: QueueRoom

```typescript
// src/durable-objects/QueueRoom.ts
import { DurableObject } from 'cloudflare:workers';

export class QueueRoom extends DurableObject {
  private sessions: Set<WebSocket> = new Set();

  async fetch(request: Request) {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server);
      this.sessions.add(server);

      return new Response(null, { status: 101, webSocket: client });
    }

    // HTTP endpoint to broadcast updates
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const message = await request.json();
      this.broadcast(message);
      return new Response('Broadcasted', { status: 200 });
    }

    return new Response('Not found', { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Handle incoming messages (e.g., ping/pong, subscriptions)
    console.log('Received message:', message);
  }

  async webSocketClose(ws: WebSocket) {
    this.sessions.delete(ws);
  }

  private broadcast(data: any) {
    const message = JSON.stringify(data);
    for (const session of this.sessions) {
      try {
        session.send(message);
      } catch (err) {
        // Remove broken connections
        this.sessions.delete(session);
      }
    }
  }
}
```

### 5.2 Triggering Real-time Updates

After processing an event in the queue consumer:

```typescript
// src/consumers/sales-events.ts
async function processEvent(message: Message<EventPayload>, env: Env) {
  // ... process event, insert to queue table ...

  // Notify Durable Object to broadcast
  const doId = env.QUEUE_ROOM.idFromName(message.body.tenantId);
  const doStub = env.QUEUE_ROOM.get(doId);

  await doStub.fetch('https://do/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      type: 'queue.created',
      data: { saleId, customerName, sellPrice, margin },
    }),
  });
}
```

---

## 6. WORKSTREAM A: ENVIRONMENT SETUP

### A1. Install Cloudflare CLI (Wrangler)

```bash
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### A2. Create Cloudflare Resources

```bash
# Create Workers project
npm create cloudflare@latest win-room-api -- --type=hello-world

cd win-room-api

# Install dependencies
npm install hono drizzle-orm zod @hono/zod-validator
npm install -D wrangler @cloudflare/workers-types
```

### A3. Configure wrangler.toml

```toml
name = "win-room-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# Hyperdrive (PostgreSQL connection)
[[hyperdrive]]
binding = "DB"
id = "<your-hyperdrive-id>" # Create via Cloudflare dashboard

# Queue for event processing
[[queues.producers]]
binding = "SALES_EVENTS_QUEUE"
queue = "sales-events"

[[queues.consumers]]
queue = "sales-events"
max_batch_size = 100
max_batch_timeout = 5

# KV for rate limiting
[[kv_namespaces]]
binding = "KV"
id = "<your-kv-id>"

# Durable Object for real-time
[[durable_objects.bindings]]
name = "QUEUE_ROOM"
class_name = "QueueRoom"
script_name = "win-room-api"

[[migrations]]
tag = "v1"
new_classes = ["QueueRoom"]
```

### A4. Setup PostgreSQL via Hyperdrive

1. **Create Postgres database** (Neon, Supabase, or Railway)
2. **Create Hyperdrive binding**:
   ```bash
   wrangler hyperdrive create win-room-db \
     --connection-string="postgresql://user:pass@host:5432/winroom"
   ```
3. **Update `wrangler.toml`** with Hyperdrive ID

### A5. Local Development

```bash
# Install Miniflare for local testing
npm install -D miniflare

# Run dev server
wrangler dev
```

---

## 7. WORKSTREAM B: DATABASE MIGRATION

### B1. Setup Drizzle ORM

```bash
npm install drizzle-orm drizzle-kit
```

**drizzle.config.ts**:
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### B2. Define Schema

**src/db/schema.ts**:
```typescript
import { pgTable, uuid, text, timestamp, numeric, boolean, jsonb } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('free'),
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  slugIdx: index('idx_tenants_slug').on(table.slug),
}));

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sku: text('sku'),
  defaultCost: numeric('default_cost', { precision: 12, scale: 2 }),
  category: text('category'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const salesEvents = pgTable('sales_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  saleId: text('sale_id').notNull(),
  externalEventId: text('external_event_id'),
  source: text('source').notNull().default('api'),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull().default('pending'),
  retryCount: integer('retry_count').notNull().default(0),
  errorMessage: text('error_message'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const queue = pgTable('queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  saleId: text('sale_id').notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('pending'),
  customerName: text('customer_name'),
  occurredAt: timestamp('occurred_at').notNull(),
  source: text('source').notNull().default('api'),
  sellPrice: numeric('sell_price', { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }),
  currency: text('currency').notNull().default('USD'),
  assignedSellerId: text('assigned_seller_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Add generated columns via raw SQL migration (Drizzle doesn't support yet)
```

### B3. Generate and Run Migrations

```bash
# Generate migration SQL
npx drizzle-kit generate

# Review migration in ./migrations/

# Apply to database
npx drizzle-kit push
```

### B4. Add Generated Columns (Raw SQL)

**migrations/0001_add_margin_columns.sql**:
```sql
ALTER TABLE wr.queue
ADD COLUMN margin_amount NUMERIC(12,2) GENERATED ALWAYS AS (sell_price - COALESCE(cost_price, 0)) STORED,
ADD COLUMN margin_pct NUMERIC(5,2) GENERATED ALWAYS AS (
  CASE
    WHEN sell_price > 0 THEN ((sell_price - COALESCE(cost_price, 0)) / sell_price * 100)
    ELSE 0
  END
) STORED;
```

---

## 8. WORKSTREAM C: API LAYER (HONO)

### C1. Project Structure

```
src/
├── api/
│   ├── index.ts          # Main Hono app
│   ├── routes/
│   │   ├── events.ts     # POST /api/events
│   │   ├── queue.ts      # GET /api/queue, POST /api/queue/:id/claim
│   │   ├── products.ts   # CRUD /api/products
│   │   └── health.ts     # GET /health
│   └── middleware/
│       ├── auth.ts       # JWT + API key validation
│       ├── rateLimit.ts  # KV-based rate limiting
│       └── tenant.ts     # Set tenant context
├── db/
│   ├── schema.ts         # Drizzle schema
│   └── client.ts         # DB connection helper
└── index.ts              # Worker entry point
```

### C2. Authentication Middleware

**src/api/middleware/auth.ts**:
```typescript
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { sha256 } from 'hono/utils/crypto';

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing API key' });
  }

  const apiKey = authHeader.substring(7);
  const keyHash = await sha256(apiKey);

  // Lookup API key in database (cached in KV)
  const cachedKey = await c.env.KV.get(`apikey:${keyHash}`);
  let tenantId: string;

  if (cachedKey) {
    tenantId = cachedKey;
  } else {
    // Query database
    const result = await c.env.DB.prepare(`
      SELECT tenant_id FROM wr.api_keys
      WHERE key_hash = ?1 AND revoked_at IS NULL
    `).bind(keyHash).first();

    if (!result) {
      throw new HTTPException(401, { message: 'Invalid API key' });
    }

    tenantId = result.tenant_id as string;

    // Cache for 5 minutes
    await c.env.KV.put(`apikey:${keyHash}`, tenantId, { expirationTtl: 300 });
  }

  // Set tenant ID in context
  c.set('tenantId', tenantId);
  await next();
});
```

### C3. Rate Limiting Middleware

**src/api/middleware/rateLimit.ts**:
```typescript
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

const RATE_LIMIT = 100; // requests per minute
const WINDOW = 60; // seconds

export const rateLimitMiddleware = createMiddleware(async (c, next) => {
  const tenantId = c.var.tenantId;
  const key = `ratelimit:${tenantId}:${Math.floor(Date.now() / 1000 / WINDOW)}`;

  const count = parseInt((await c.env.KV.get(key)) || '0');

  if (count >= RATE_LIMIT) {
    throw new HTTPException(429, {
      message: 'Rate limit exceeded',
      res: new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter: WINDOW }), {
        status: 429,
        headers: {
          'Retry-After': WINDOW.toString(),
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': '0',
        },
      }),
    });
  }

  await c.env.KV.put(key, (count + 1).toString(), { expirationTtl: WINDOW });
  await next();
});
```

### C4. Events Route (Complete Implementation)

See [Section 4.2](#42-event-ingestion-endpoint) for full code.

### C5. Queue Routes

**GET /api/queue** (List pending queue items)

```typescript
// src/api/routes/queue.ts
export const queueRouter = new Hono()
  .get('/', authMiddleware, async (c) => {
    const tenantId = c.var.tenantId;
    const status = c.req.query('status') || 'pending';

    const { results } = await c.env.DB.prepare(`
      SELECT
        q.id, q.sale_id, q.customer_name, q.occurred_at,
        q.sell_price, q.cost_price, q.margin_amount, q.margin_pct, q.currency,
        p.name as product_name
      FROM wr.queue q
      LEFT JOIN wr.products p ON q.product_id = p.id
      WHERE q.tenant_id = ?1 AND q.status = ?2
      ORDER BY q.occurred_at DESC
      LIMIT 100
    `).bind(tenantId, status).all();

    return c.json({ queue: results });
  });
```

**POST /api/queue/:id/claim** (Claim a queue item)

```typescript
  .post('/:id/claim', authMiddleware, async (c) => {
    const queueId = c.req.param('id');
    const { seller_id, claim_type } = await c.req.json();
    const tenantId = c.var.tenantId;

    // Update queue status
    await c.env.DB.prepare(`
      UPDATE wr.queue
      SET status = 'claimed', assigned_seller_id = ?1
      WHERE id = ?2 AND tenant_id = ?3 AND status = 'pending'
    `).bind(seller_id, queueId, tenantId).run();

    // Insert claim record
    await c.env.DB.prepare(`
      INSERT INTO wr.claims (tenant_id, sale_id, claimed_by, claim_type)
      SELECT tenant_id, sale_id, ?1, ?2 FROM wr.queue WHERE id = ?3
    `).bind(seller_id, claim_type, queueId).run();

    // Broadcast real-time update
    const doId = c.env.QUEUE_ROOM.idFromName(tenantId);
    const doStub = c.env.QUEUE_ROOM.get(doId);
    await doStub.fetch('https://do/broadcast', {
      method: 'POST',
      body: JSON.stringify({ type: 'queue.claimed', data: { queueId, seller_id } }),
    });

    return c.json({ success: true });
  });
```

---

## 9. WORKSTREAM D: QUEUE CONSUMER

### D1. Consumer Worker

**src/consumers/sales-events.ts**:
```typescript
export default {
  async queue(batch: MessageBatch<EventPayload>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processEvent(message, env);
        message.ack();
      } catch (error) {
        console.error('Failed to process event:', error);
        message.retry();
      }
    }
  },
};

async function processEvent(message: Message<EventPayload>, env: Env) {
  const { eventId, tenantId, payload } = message.body;

  // 1. Fetch product to get default_cost (if product_id provided)
  let costPrice = payload.cost_price;
  if (!costPrice && payload.product_id) {
    const product = await env.DB.prepare(`
      SELECT default_cost FROM wr.products WHERE id = ?1 AND tenant_id = ?2
    `).bind(payload.product_id, tenantId).first();

    if (product?.default_cost) {
      costPrice = product.default_cost;
    }
  }

  // 2. Insert into queue table (margin auto-calculated)
  await env.DB.prepare(`
    INSERT INTO wr.queue (
      tenant_id, sale_id, product_id, customer_name, occurred_at,
      sell_price, cost_price, currency, source
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'api')
    ON CONFLICT (tenant_id, sale_id) DO NOTHING
  `).bind(
    tenantId,
    payload.sale_id,
    payload.product_id || null,
    payload.customer_name,
    payload.occurred_at,
    payload.sell_price,
    costPrice || null,
    payload.currency,
  ).run();

  // 3. Mark event as processed
  await env.DB.prepare(`
    UPDATE wr.sales_events
    SET status = 'processed', processed_at = NOW()
    WHERE id = ?1
  `).bind(eventId).run();

  // 4. Insert audit event
  await env.DB.prepare(`
    INSERT INTO wr.events (tenant_id, type, sale_id, payload)
    VALUES (?1, 'queue.created', ?2, ?3)
  `).bind(tenantId, payload.sale_id, JSON.stringify(payload)).run();

  // 5. Broadcast real-time update
  const doId = env.QUEUE_ROOM.idFromName(tenantId);
  const doStub = env.QUEUE_ROOM.get(doId);
  await doStub.fetch('https://do/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      type: 'queue.created',
      data: {
        saleId: payload.sale_id,
        customerName: payload.customer_name,
        sellPrice: payload.sell_price,
        margin: costPrice ? payload.sell_price - costPrice : null,
      },
    }),
  });
}
```

### D2. Error Handling & DLQ

```typescript
async function processEvent(message: Message<EventPayload>, env: Env) {
  try {
    // ... processing logic ...
  } catch (error) {
    // Log error
    console.error('Processing failed:', error);

    // Update event with error
    await env.DB.prepare(`
      UPDATE wr.sales_events
      SET status = 'failed', error_message = ?1, retry_count = retry_count + 1
      WHERE id = ?2
    `).bind(error.message, message.body.eventId).run();

    // If max retries exceeded, move to DLQ
    if (message.attempts >= 3) {
      await env.DB.prepare(`
        INSERT INTO wr.sales_events_dlq (sale_id, failure_reason, payload, last_error)
        SELECT sale_id, 'Max retries exceeded', payload, ?1
        FROM wr.sales_events WHERE id = ?2
      `).bind(error.message, message.body.eventId).run();

      message.ack(); // Don't retry anymore
    } else {
      message.retry(); // Retry with exponential backoff
    }
  }
}
```

---

## 10. WORKSTREAM E: REAL-TIME (DURABLE OBJECTS)

See [Section 5](#5-real-time-system) for complete Durable Object implementation.

### E1. Deploy Durable Object

Add to `wrangler.toml`:
```toml
[[durable_objects.bindings]]
name = "QUEUE_ROOM"
class_name = "QueueRoom"
script_name = "win-room-api"
```

**src/index.ts**:
```typescript
export { QueueRoom } from './durable-objects/QueueRoom';

export default {
  fetch: app.fetch,
  queue: queueHandler.queue,
};
```

### E2. Client-Side Connection (Frontend)

```typescript
// app/hooks/useQueueUpdates.ts
import { useEffect, useState } from 'react';

export function useQueueUpdates(tenantId: string) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [queueItems, setQueueItems] = useState([]);

  useEffect(() => {
    const socket = new WebSocket(`wss://api.winroom.com/ws?tenant=${tenantId}`);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'queue.created') {
        setQueueItems(prev => [message.data, ...prev]);
      }

      if (message.type === 'queue.claimed') {
        setQueueItems(prev => prev.filter(item => item.id !== message.data.queueId));
      }
    };

    setWs(socket);

    return () => socket.close();
  }, [tenantId]);

  return queueItems;
}
```

---

## 11. WORKSTREAM F: FRONTEND MIGRATION

### F1. Remix Project Setup

```bash
npx create-remix@latest win-room-frontend --template remix-run/remix/templates/cloudflare-pages

cd win-room-frontend
npm install
```

### F2. Configure Remix for Cloudflare Pages

**remix.config.js**:
```javascript
export default {
  serverModuleFormat: 'esm',
  serverPlatform: 'neutral',
  future: {
    v3_fetcherPersist: true,
  },
};
```

### F3. Fetch Queue Data (Server Loader)

```typescript
// app/routes/dashboard.tsx
import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const apiKey = context.env.API_KEY; // From Pages env vars

  const response = await fetch('https://api.winroom.com/api/queue', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  const { queue } = await response.json();

  return json({ queue });
}

export default function Dashboard() {
  const { queue } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Queue</h1>
      {queue.map(item => (
        <div key={item.id}>
          <p>{item.customer_name} - ${item.sell_price}</p>
          {item.margin_pct && <p>Margin: {item.margin_pct}%</p>}
        </div>
      ))}
    </div>
  );
}
```

### F4. Real-time Updates Component

```typescript
// app/components/LiveQueue.tsx
import { useEffect, useState } from 'react';

export function LiveQueue({ initialQueue, tenantId }) {
  const [queue, setQueue] = useState(initialQueue);

  useEffect(() => {
    const ws = new WebSocket(`wss://api.winroom.com/ws?tenant=${tenantId}`);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'queue.created') {
        setQueue(prev => [msg.data, ...prev]);
      }
    };

    return () => ws.close();
  }, [tenantId]);

  return (
    <div>
      {queue.map(item => (
        <QueueItem key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### F5. Deploy to Cloudflare Pages

```bash
# Build
npm run build

# Deploy
wrangler pages deploy ./build/client
```

Or connect Git repository for automatic deployments.

---

## 12. WORKSTREAM G: CLEANUP & ENGLISH-ONLY

### G1. Remove Turkish Strings

**Find Turkish strings**:
```bash
rg -i "satış|ürün|taksit|ödeme|müşteri" app/ components/ src/
```

**Replace with English**:
- `satış` → `sale`
- `ürün` → `product`
- `taksit` → `installment` (then delete installment code)
- `müşteri` → `customer`

### G2. Centralize English Strings

**lib/copy.ts**:
```typescript
export const copy = {
  queue: {
    title: 'Sales Queue',
    empty: 'No pending sales',
    claim: 'Claim',
  },
  products: {
    title: 'Product Catalog',
    addNew: 'Add Product',
    margin: 'Margin',
  },
  leaderboard: {
    title: 'Leaderboard',
    wins: 'Wins',
    revenue: 'Revenue',
  },
} as const;
```

### G3. Add ESLint Rule for Non-ASCII

**.eslintrc.js**:
```javascript
module.exports = {
  rules: {
    'no-irregular-whitespace': 'error',
    'no-control-regex': 'error',
    // Custom rule to block Turkish characters
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/[ğüşıöçĞÜŞİÖÇ]/]',
        message: 'Turkish characters not allowed. Use English strings from lib/copy.ts',
      },
    ],
  },
};
```

### G4. Remove Finance/Installment Code

**Delete files**:
```bash
rm -rf app/routes/installments/
rm -rf app/components/installments/
rm -rf app/routes/finance/
```

**Remove DB tables**:
```sql
DROP TABLE IF EXISTS wr.installments CASCADE;
DROP TABLE IF EXISTS wr.payment_plans CASCADE;
DROP TABLE IF EXISTS wr.finance_settings CASCADE;
```

**Remove API routes**:
Delete all routes under `src/api/routes/installments.ts`, `finance.ts`, etc.

### G5. Pre-commit Hook

**.husky/pre-commit**:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Block Turkish strings
if git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | xargs grep -E '[ğüşıöçĞÜŞİÖÇ]'; then
  echo "ERROR: Turkish characters found in staged files"
  echo "Please use English strings from lib/copy.ts"
  exit 1
fi

npm run lint
```

---

## 13. TESTING STRATEGY

### 13.1 Unit Tests (Vitest)

```bash
npm install -D vitest @cloudflare/vitest-pool-workers
```

**vitest.config.ts**:
```typescript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
});
```

**Test Example**:
```typescript
// src/api/routes/events.test.ts
import { describe, it, expect } from 'vitest';
import app from '../index';

describe('POST /api/events', () => {
  it('should accept valid event', async () => {
    const res = await app.request('/api/events', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sale_id: 'test-123',
        occurred_at: '2025-01-01T00:00:00Z',
        customer_name: 'Test Corp',
        sell_price: 1000,
        currency: 'USD',
        seller_external_id: 'sel-1',
      }),
    });

    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.status).toBe('pending');
  });

  it('should reject missing sell_price', async () => {
    const res = await app.request('/api/events', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sale_id: 'test-456',
        // missing sell_price
      }),
    });

    expect(res.status).toBe(400);
  });
});
```

### 13.2 Integration Tests

Test full flow: API → Queue → Consumer → Database

```typescript
// tests/integration/event-flow.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

describe('Event Flow', () => {
  it('should process event end-to-end', async () => {
    // 1. POST event
    const eventRes = await fetch('http://localhost:8787/api/events', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-key' },
      body: JSON.stringify({
        sale_id: 'int-test-1',
        sell_price: 500,
        // ...
      }),
    });
    expect(eventRes.status).toBe(202);

    // 2. Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Check queue table
    const queueRes = await fetch('http://localhost:8787/api/queue', {
      headers: { 'Authorization': 'Bearer test-key' },
    });
    const { queue } = await queueRes.json();

    expect(queue).toContainEqual(
      expect.objectContaining({ sale_id: 'int-test-1' })
    );
  });
});
```

### 13.3 Load Testing (k6)

```bash
npm install -g k6
```

**load-test.js**:
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 }, // Ramp up to 50 RPS
    { duration: '3m', target: 50 }, // Stay at 50 RPS
    { duration: '1m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests under 200ms
  },
};

export default function () {
  const payload = JSON.stringify({
    sale_id: `sale-${__VU}-${__ITER}`,
    occurred_at: new Date().toISOString(),
    customer_name: 'Load Test Corp',
    sell_price: 999,
    currency: 'USD',
    seller_external_id: 'sel-load',
  });

  const res = http.post('https://api.winroom.com/api/events', payload, {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json',
    },
  });

  check(res, {
    'status is 202': (r) => r.status === 202,
  });
}
```

Run: `k6 run load-test.js`

---

## 14. DEPLOYMENT GUIDE

### 14.1 Deploy API (Workers)

```bash
# Deploy to production
wrangler deploy

# Deploy with specific environment
wrangler deploy --env production
```

### 14.2 Deploy Frontend (Pages)

**Option A: Git-based**
1. Connect repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set build output: `./build/client`
4. Push to `main` branch → auto-deploys

**Option B: CLI**
```bash
npm run build
wrangler pages deploy ./build/client --project-name=win-room-frontend
```

### 14.3 Database Migrations

```bash
# Run migrations before deploying code
npx drizzle-kit push --config=drizzle.config.ts
```

### 14.4 Environment Variables

**Cloudflare Dashboard**:
- Workers & Pages → win-room-api → Settings → Variables
- Add:
  - `DATABASE_URL` (Postgres connection string, encrypted)
  - `JWT_SECRET` (for auth tokens, encrypted)

### 14.5 Custom Domain

**Cloudflare Dashboard**:
1. Workers & Pages → win-room-api → Settings → Domains
2. Add custom domain: `api.winroom.com`
3. Update DNS (automatic if using Cloudflare DNS)

---

## 15. MONITORING & ALERTING

### 15.1 Cloudflare Analytics

Built-in metrics (free):
- Requests per second
- Error rate (4xx, 5xx)
- CPU time (ms)
- Duration (P50, P95, P99)

**Access**: Workers & Pages → win-room-api → Analytics

### 15.2 Custom Logs (Logpush)

```bash
# Enable Logpush to external service (e.g., Datadog)
wrangler tail --format=json | datadog-agent
```

Or use Cloudflare Logpush to:
- AWS S3
- Google Cloud Storage
- Splunk
- Datadog

### 15.3 Alerts (Workers)

**Set up alerts in Cloudflare Dashboard**:
- Workers & Pages → Notifications → Add
- Alert on:
  - Error rate > 5%
  - P95 latency > 500ms
  - Queue backlog > 1000 messages

### 15.4 Application Monitoring

**Add custom metrics**:
```typescript
// src/api/routes/events.ts
app.post('/api/events', async (c) => {
  const start = Date.now();

  try {
    // ... processing ...

    const duration = Date.now() - start;
    console.log(JSON.stringify({
      event: 'api.events.success',
      duration,
      tenantId: c.var.tenantId,
    }));

    return c.json({ ... }, 202);
  } catch (error) {
    console.error(JSON.stringify({
      event: 'api.events.error',
      error: error.message,
      tenantId: c.var.tenantId,
    }));
    throw error;
  }
});
```

Parse logs with Cloudflare Logpush or Workers Analytics Engine.

---

## 16. OPERATIONAL RUNBOOK

### 16.1 Common Issues

#### Issue: Events stuck in pending

**Symptoms**: `SELECT COUNT(*) FROM wr.sales_events WHERE status='pending'` returns high number

**Resolution**:
1. Check queue consumer is running: `wrangler tail --queue=sales-events`
2. Check DLQ: `SELECT * FROM wr.sales_events_dlq ORDER BY failed_at DESC LIMIT 10`
3. Manually retry failed events:
   ```sql
   UPDATE wr.sales_events
   SET status = 'pending', retry_count = 0
   WHERE status = 'failed' AND error_message NOT LIKE '%duplicate%';
   ```

#### Issue: Rate limit errors

**Symptoms**: Users reporting 429 errors

**Resolution**:
1. Check KV rate limit keys: `wrangler kv:key list --namespace-id=<KV_ID> --prefix=ratelimit:`
2. Increase limit temporarily:
   ```typescript
   const RATE_LIMIT = 200; // Increase from 100
   ```
3. Identify abusive tenant:
   ```sql
   SELECT tenant_id, COUNT(*) as requests
   FROM wr.api_audit_log
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY tenant_id
   ORDER BY requests DESC;
   ```

#### Issue: WebSocket connections dropping

**Symptoms**: Real-time updates not reaching users

**Resolution**:
1. Check Durable Object health: `wrangler tail --durable-object=QueueRoom`
2. Restart DO (reconnections auto-happen):
   ```bash
   wrangler delete --durable-object QueueRoom:<tenant-id>
   ```
3. Clients will auto-reconnect

### 16.2 Deployment Rollback

```bash
# List recent deployments
wrangler deployments list

# Rollback to specific deployment
wrangler rollback <deployment-id>
```

### 16.3 Database Backup

**Automated (if using Neon/Supabase)**:
- Point-in-time recovery (PITR) enabled by default
- Restore from dashboard

**Manual**:
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

---

## 17. LAUNCH CHECKLIST

### Pre-Launch

- [ ] All workstreams A-G complete
- [ ] Zero TypeScript errors: `npm run typecheck`
- [ ] All tests passing: `npm test`
- [ ] Load test passed: 100+ RPS sustained
- [ ] No Turkish strings: `rg -i 'satış|ürün' app/` returns 0
- [ ] Finance modules deleted: `ls app/routes/installments` fails
- [ ] Product catalog tested: Create product, margin auto-calculated
- [ ] Multi-tenancy tested: Create 2 tenants, data isolated
- [ ] API docs written: OpenAPI spec generated
- [ ] Monitoring configured: Alerts set up in Cloudflare
- [ ] Custom domain configured: `api.winroom.com` resolves

### Launch Day

- [ ] Database migrations applied
- [ ] Deploy API: `wrangler deploy`
- [ ] Deploy frontend: `wrangler pages deploy`
- [ ] Smoke tests:
  - [ ] `curl https://api.winroom.com/health` → 200 OK
  - [ ] POST event → appears in queue within 5s
  - [ ] WebSocket connects and receives updates
  - [ ] Leaderboard loads
- [ ] Monitor for 2 hours: no errors

### Post-Launch

- [ ] Onboard first external customer
- [ ] Customer feedback collected
- [ ] Performance review: P95 latency < 100ms?
- [ ] Cost analysis: within budget?

---

## 18. GLOSSARY

- **Hyperdrive**: Cloudflare's smart connection pooler for PostgreSQL
- **Durable Object**: Stateful Workers with strong consistency
- **Hono**: Lightweight web framework for Cloudflare Workers
- **Drizzle ORM**: Type-safe ORM for edge runtimes
- **Queue Consumer**: Worker that processes messages from Cloudflare Queues
- **RLS**: Row-Level Security (PostgreSQL feature for tenant isolation)
- **WebSocket Hibernation**: Cloudflare feature that reduces DO costs when idle

---

## 19. MIGRATION GUIDE

### 19.1 Data Migration from Current System

**Step 1: Export existing data**
```sql
-- Export current queue to CSV
COPY (
  SELECT
    subscription_id as sale_id,
    customer_name,
    amount as sell_price,
    created_at as occurred_at,
    -- ... map other fields
  FROM public.queue
) TO '/tmp/queue_export.csv' CSV HEADER;
```

**Step 2: Import to new schema**
```sql
-- Create staging table
CREATE TEMP TABLE queue_import (
  sale_id TEXT,
  customer_name TEXT,
  sell_price NUMERIC,
  occurred_at TIMESTAMPTZ
);

-- Load CSV
COPY queue_import FROM '/tmp/queue_export.csv' CSV HEADER;

-- Insert into new schema
INSERT INTO wr.queue (tenant_id, sale_id, customer_name, sell_price, occurred_at, currency)
SELECT
  '<your-tenant-id>',
  sale_id,
  customer_name,
  sell_price,
  occurred_at,
  'USD' -- default currency
FROM queue_import;
```

### 19.2 Code Migration Checklist

- [ ] Replace `subscription_id` with `sale_id` in all queries
- [ ] Update TypeScript types: `SubscriptionItem` → `QueueItem`
- [ ] Remove `services/poller/worker.ts`
- [ ] Replace Socket.IO client with WebSocket API
- [ ] Update environment variables (see Section 14.4)
- [ ] Test manual sale form with new API
- [ ] Update admin UI to use new API endpoints

---

## 20. COST ANALYSIS

### Cloudflare Costs (Estimated)

**Workers (API + Consumer)**:
- Free: 100k requests/day
- Paid: $5/month + $0.50 per million requests
- **Estimate**: 1M req/month = $5.50/month

**Queues**:
- $0.50 per million operations
- **Estimate**: 1M events/month = $0.50/month

**Durable Objects**:
- $0.15 per million requests
- $12.50 per million GB-s (memory)
- **Estimate**: 10k WebSocket connections = $2/month

**KV**:
- 1GB storage free
- $0.50 per million reads
- **Estimate**: 5M reads/month (rate limiting) = $2.50/month

**Hyperdrive**:
- Free tier: 10M requests/month
- **Estimate**: $0/month (within free tier)

**Pages (Frontend)**:
- Free: 500 builds/month, unlimited bandwidth
- **Estimate**: $0/month

**Total Cloudflare**: ~$10-15/month for 1M events

### Database Costs

**Neon (PostgreSQL)**:
- Free tier: 512MB storage, 0.5 compute units
- Pro: $19/month (3GB, always-on compute)
- **Estimate**: $19/month for production

**Alternative (Supabase)**:
- Free tier: 500MB database, 1GB bandwidth
- Pro: $25/month (8GB database, 50GB bandwidth)

### Total Estimated Cost

- **Cloudflare**: $10-15/month
- **Database**: $19-25/month
- **Total**: **$35-40/month** for production workload (1M events/month, 100 concurrent users)

**Compare to traditional stack**:
- Vercel Pro: $20/month
- Railway (Postgres + Redis): $30/month
- Render (API + Worker): $40/month
- **Traditional total**: $90/month

**Savings**: ~55% cheaper with Cloudflare Workers

---

## 21. NEXT STEPS

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyze current TSD's Cloudflare Workers incompatibilities", "activeForm": "Analyzing current TSD's Cloudflare Workers incompatibilities", "status": "completed"}, {"content": "Design Cloudflare Workers architecture (Hono + D1/Hyperdrive + Durable Objects)", "activeForm": "Designing Cloudflare Workers architecture", "status": "completed"}, {"content": "Add product-based system to schema and API", "activeForm": "Adding product-based system to schema and API", "status": "completed"}, {"content": "Create comprehensive revised TSD with step-by-step implementation", "activeForm": "Creating comprehensive revised TSD", "status": "completed"}, {"content": "Review and validate revised TSD against requirements", "activeForm": "Reviewing and validating revised TSD", "status": "in_progress"}]