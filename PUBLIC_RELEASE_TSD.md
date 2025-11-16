PUBLIC RELEASE TSD – WIN ROOM (PUBLIC SALES EDITION)
====================================================

Document version: 1.0 (2025-02-17) – PRODUCTION READY
Maintainer: Product Engineering
Audience: Full-stack engineer (junior+), PM, DevOps, QA
Last Updated: 2025-02-17
Status: ✅ COMPREHENSIVE - Ready for implementation

Public Edition Scope: This plan assumes a clean deployment on a freshly provisioned Postgres instance. No legacy `subscriptions`, `campaigns`, or other core tables from the internal product are required. Every dependency described here must be created as part of the public package.

------------------------------------------------------------------------------
0. How to Use This Document
------------------------------------------------------------------------------
CRITICAL READING ORDER:
  1. Read Section 1 (Problem Statement & Goals) to understand the why
  2. Read Section 2.5 (Initial Data Bootstrapping) BEFORE writing any code - this is the highest-risk area
  3. Read Section 15 (Risks & Mitigations) to understand what can go wrong
  4. Read Section 2 (Architecture) to understand the how
  5. Follow Workstreams A-F in order (Sections 3-8)
  6. Use Section 12 (Testing) throughout development
  7. Use Section 19 (Monitoring) and Section 20 (Deployment) for production readiness

USING THIS DOCUMENT:
  - Each workstream has step-by-step checklists - tick them off as you go
  - Keep this file as the single source of truth; update it as work progresses
  - Before implementing, review "Dependencies" (Section 14) and "Risks" (Section 15)
  - When stuck, check the relevant section's "Acceptance Criteria"
  - Use the Glossary (Section 18) for unfamiliar terms

SECTIONS REFERENCE:
  • Section 1: Problem Statement & Goals
  • Section 2: Architecture Overview
  • Section 2.5: ⚠️  Initial Data Bootstrapping (CRITICAL - Read First!)
  • Sections 3-8: Workstreams A-F (implementation steps)
  • Section 9: Setup & Configuration (to be completed)
  • Section 10: API Reference & Versioning
  • Section 11: Operational Runbook
  • Section 12: Testing Strategy (comprehensive)
  • Section 13: Timeline (6-8 weeks realistic)
  • Section 14: Dependencies & Stakeholders
  • Section 15: Risks & Mitigations (comprehensive)
  • Section 16: Launch Checklist (comprehensive)
  • Section 17: Bootstrap Script Appendix
  • Section 18: Glossary
  • Section 19: Monitoring & Observability
  • Section 20: Deployment Strategy & Rollback

------------------------------------------------------------------------------
1. Problem Statement & Goals
------------------------------------------------------------------------------
Context
  • We are packaging Win Room for external sales teams as a standalone product.  
  • The public edition must run on a fresh Postgres database with no dependency on our internal subscription/campaign schema.  
  • Feature surface needs to focus on real-time queue visibility, claims, and leaderboards; finance/installment tooling will not ship.  
  • Copy is mixed Turkish/English; public release must be fully English.  
  • Documentation is fragmented across many markdown files and needs a single source of truth.

Goals
  1. Deliver a clean ingestion-to-queue pipeline that requires only the new public schema.  
  2. Provide a simplified UI/feature set (queue, claims, leaderboard) that operates solely on the new tables.  
  3. Ensure all user-facing copy and system messages are English.  
  4. Consolidate documentation into this single public-facing file.  
  5. Define repeatable bootstrapping steps for brand-new deployments (DB creation, seeds, verification).

Out of Scope (Non-goals)
  • Adding finance-specific dashboards, installment tracking, or margin analytics.  
  • Advanced multi-tenancy billing. Basic tenant isolation is required, but billing is not.  
  • Refactoring legacy admin features beyond what is required for the public release.

Success Metrics
  • A third-party company can deploy the product on an empty Postgres instance using the steps in this TSD.  
  • Both manual sales and API submissions flow through the same ingestion pipeline and materialize in the queue.  
  • Finance/installment modules are absent from the build by default.  
  • No Turkish strings remain in UI or logs that surface to end users.  
  • All documentation for setup, API usage, and operations exists in this file only.

------------------------------------------------------------------------------
2. Target Architecture Overview
------------------------------------------------------------------------------
High-Level Flow
  1. External system (or internal manual form) submits a "sale event" via REST API.
  2. API validates payload, normalizes it, writes into `wr.sales_events` (new table).
  3. Background processor (Node.js worker with pg-boss queue) transforms events into queue items, claims, metrics.
  4. Socket server reads from `wr.queue` and broadcasts updates to clients in real time.
  5. Dashboard pages read simplified read models (queue, leaderboard, personal stats).

Architecture Decisions & Rationale
  • Event Processor: Use **pg-boss** (PostgreSQL-backed job queue) instead of cron for:
    - At-least-once delivery guarantees
    - Built-in retry with exponential backoff
    - Dead letter queue for failed events
    - No external dependency (runs on same DB)
    - Better than cron for production reliability

  • Caching Strategy: Add **Redis** for:
    - Leaderboard caching (TTL 30s, invalidate on claim)
    - API rate limiting counters
    - Active seller presence tracking
    Decision: Redis optional for MVP, required for >50 concurrent users

  • Database Connection Pooling:
    - Use pgBouncer or built-in pg pool (max 20 connections)
    - Separate connection pools for API vs processor

  • Horizontal Scaling:
    - API: Stateless, can run N instances behind load balancer
    - Socket: Single instance initially, scale with Redis adapter later
    - Processor: Single instance with pg-boss handles parallelism internally

Key Changes
  • Remove `services/poller/worker.ts` (legacy-only path).
  • Introduce `app/api/events/route.ts` (Next.js Route Handler) with token-based auth.
  • Add `services/events/worker.ts` (pg-boss worker for event processing).
  • Harmonize manual entry components to call the same API.
  • Remove `app/installments`, finance-related components, and unused tables/queries.
  • Centralize English copy in a simple dictionary (no full i18n framework needed for v1).
  • Update documentation, env vars, and deployment steps accordingly.

Tech Stack Summary
  • Runtime: Node.js 20+ (LTS)
  • Framework: Next.js 14+ (App Router)
  • Database: PostgreSQL 14+
  • Job Queue: pg-boss 9+
  • Socket: Socket.IO 4+
  • Validation: Zod
  • Cache (optional): Redis 7+
  • Monitoring: (See Section 19)

------------------------------------------------------------------------------
2.5 CRITICAL: Initial Data Bootstrapping & Deployment Sequencing
------------------------------------------------------------------------------
This section is MANDATORY reading before writing any implementation code.

Why it matters
  • The public edition must be installable on an empty Postgres instance.  
  • Every environment (local, staging, production) must follow the same bootstrap recipe.  
  • Mistakes here lead to missing tables, mismatched IDs, and broken real-time flows.

Stage 0 – Provision Infrastructure
  - [ ] Create a dedicated Postgres instance (14+). Recommended naming: `winroom_public`.  
  - [ ] Create a `wr` schema owned by the application role:
        ```sql
        CREATE SCHEMA IF NOT EXISTS wr AUTHORIZATION <app_user>;
        ```
  - [ ] (Optional) Create separate users for app, worker, and read-only analytics with least privilege.

Stage 1 – Apply Base Schema
  - [ ] Run `npm install` then `npm run db:setup-wr` (or execute the equivalent SQL) to create all required tables:
        • wr.sales_events, wr.sales_events_dlq, wr.sales_events_archive  
        • wr.queue, wr.claims, wr.events (public edition variants)  
        • wr.sellers, wr.api_keys, wr.api_audit_log, wr.cache_kv, wr.streak_state (minimal set)  
  - [ ] Verify tables exist:
        ```sql
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'wr'
        ORDER BY table_name;
        ```
  - [ ] Ensure required functions/triggers are present (`wr_touch_updated_at`, etc.).

Stage 2 – Seed Minimal Data
  - [ ] Create at least one seller/user record for smoke testing:
        ```sql
        INSERT INTO wr.sellers (seller_id, display_name, email)
        VALUES ('demo-seller', 'Demo Seller', 'demo@example.com')
        ON CONFLICT (seller_id) DO NOTHING;
        ```
  - [ ] Generate an ingestion API key, hash it (SHA-256), and insert into `wr.api_keys` with an identifiable name (Workstream B covers API key tooling).  
  - [ ] (Optional) Seed sample queue rows for demos using the `/api/events` endpoint once it is implemented.

Stage 3 – Configure Application Secrets
  - [ ] Populate `.env.local` / deployment secrets with:
        • `DATABASE_URL` pointing at the new instance  
        • `INGESTION_API_KEY` (plain value)  
        • `REDIS_URL` (if using rate limiting / socket scaling)  
        • Any auth/JWT secrets required by the admin UI
  - [ ] Document the variables in Section 9 after verification.

Stage 4 – Smoke-Test the Empty System
  - [ ] Run `npm run dev` and ensure the app starts with an empty database.  
  - [ ] Hit `GET /api/health` → expect `status=healthy` with zero data.  
  - [ ] Manually POST a sample event to `/api/events`; confirm a queue item is created and appears on the dashboard.  
  - [ ] Start the processor/worker (`npm run process-events` placeholder) and verify it transitions events from `pending` to `queued`.

Reset & Rollback Strategy
  - [ ] For local/staging issues, run `npm run db:setup-wr` followed by a truncation script:
        ```sql
        TRUNCATE wr.sales_events CASCADE;
        TRUNCATE wr.queue CASCADE;
        TRUNCATE wr.claims CASCADE;
        ```
  - [ ] Keep a snapshot/backup after Stage 1 so you can restore clean state quickly in production environments.  
  - [ ] If deployment fails, restore the snapshot and redeploy after fixing the issue—there is no legacy system to fall back to.

Data Validation Checkpoints
  - [ ] Table counts (should match expected seed data):
        ```sql
        SELECT COUNT(*) FROM wr.sales_events;
        SELECT COUNT(*) FROM wr.queue;
        SELECT COUNT(*) FROM wr.claims;
        ```
  - [ ] Ensure no `NULL` sale IDs:
        ```sql
        SELECT COUNT(*) FROM wr.sales_events WHERE sale_id IS NULL;
        ```
  - [ ] Verify queue items reference known sellers (if enforcing FK):
        ```sql
        SELECT COUNT(*) FROM wr.queue q
        WHERE q.assigned_seller_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM wr.sellers s WHERE s.seller_id = q.assigned_seller_id
          );
        ```
  - [ ] Check DLQ size stays at 0 in healthy environments.

Performance Considerations
  - [ ] Run schema migrations in a transaction during maintenance windows.  
  - [ ] Use `CREATE INDEX CONCURRENTLY` for any large-data deployments.  
  - [ ] Schedule regular `VACUUM (ANALYZE)` on high-churn tables (`wr.sales_events`, `wr.queue`).

------------------------------------------------------------------------------
3. Workstream A – Foundations & Environment Setup
------------------------------------------------------------------------------
A1. Repository Preparation
  - [ ] Confirm you are on a new branch `feature/public-release`.  
  - [ ] Search repo (`rg "TODO"`) for leftover experimental flags; note anything touching queue/claims.  
  - [ ] Run `npm install` to ensure dependencies are fresh.  
  - [ ] Capture baseline behavior (screenshots or Loom) for queue, claims, leaderboard.

A2. Configuration Audit
  - [ ] Review `.env.example` (create if missing) and list required variables for the new API (e.g., `INGESTION_API_KEY`).  
  - [ ] Document which variables are required for public setup in Section 9.

Dependencies: None. Complete before other workstreams.

------------------------------------------------------------------------------
4. Workstream B – Event Ingestion API
------------------------------------------------------------------------------
Objective: Deliver a generic, secure ingestion endpoint for sale events.

B1. Data Model Preparation

  Table: wr.sales_events
  - [ ] Create table with complete schema:
        ```sql
        CREATE TABLE wr.sales_events (
          id BIGSERIAL PRIMARY KEY,
          sale_id TEXT NOT NULL,
          external_event_id TEXT,  -- Client-provided ID (optional, for idempotency)
          tenant_key TEXT NULL,    -- Optional external tenant slug (no FK dependency)
          source TEXT NOT NULL,    -- 'api', 'manual', 'import'
          payload JSONB NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
          retry_count INTEGER NOT NULL DEFAULT 0,
          error_message TEXT,
          processed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_sales_events_sale_id UNIQUE (sale_id)
        );
        ```

  - [ ] Create indexes (use CONCURRENTLY in production):
        ```sql
        -- For processor batch queries
        CREATE INDEX CONCURRENTLY idx_sales_events_pending
          ON wr.sales_events(status, created_at) WHERE status = 'pending';

        -- For direct lookups / deduplication
        CREATE UNIQUE INDEX CONCURRENTLY idx_sales_events_sale_id
          ON wr.sales_events(sale_id);

        -- For deduplication lookups (client-supplied IDs)
        CREATE UNIQUE INDEX CONCURRENTLY idx_sales_events_external_id
          ON wr.sales_events(tenant_key, external_event_id)
          WHERE external_event_id IS NOT NULL;

        -- For monitoring queries
        CREATE INDEX CONCURRENTLY idx_sales_events_tenant_created
          ON wr.sales_events(tenant_key, created_at DESC);
        ```

  - [ ] Add trigger for updated_at:
        ```sql
        CREATE TRIGGER trg_sales_events_updated_at
        BEFORE UPDATE ON wr.sales_events
        FOR EACH ROW EXECUTE FUNCTION wr_touch_updated_at();
        ```

  Table: wr.api_audit_log
  - [ ] Create audit log table:
        ```sql
        CREATE TABLE wr.api_audit_log (
          id BIGSERIAL PRIMARY KEY,
          tenant_key TEXT NULL,  -- Matches sales_events.tenant_key
          api_key_hash TEXT NOT NULL,  -- SHA256 hash, not plain key!
          endpoint TEXT NOT NULL,
          http_method TEXT NOT NULL,
          status_code INTEGER NOT NULL,
          request_ip INET,
          user_agent TEXT,
          response_time_ms INTEGER,
          error_message TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Partitioning for large datasets (if >1M rows expected per month)
        -- Consider partitioning by created_at (monthly partitions)
        CREATE INDEX CONCURRENTLY idx_audit_tenant_created
          ON wr.api_audit_log(tenant_key, created_at DESC);
        ```

  Table: wr.api_keys
  - [ ] Store hashed API keys for ingestion authentication:
        ```sql
        CREATE TABLE wr.api_keys (
          id BIGSERIAL PRIMARY KEY,
          tenant_key TEXT NULL,
          name TEXT NOT NULL,
          key_hash TEXT NOT NULL,      -- SHA-256
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          revoked_at TIMESTAMPTZ NULL
        );
        CREATE UNIQUE INDEX idx_api_keys_hash ON wr.api_keys(key_hash);
        CREATE INDEX idx_api_keys_tenant ON wr.api_keys(tenant_key);
        ```
  - [ ] Implement helper script to generate keys (`npm run api-key:create`).

  Table: wr.sales_events_dlq
  - [ ] Create DLQ for events that exhaust retries:
        ```sql
        CREATE TABLE wr.sales_events_dlq (
          id BIGSERIAL PRIMARY KEY,
          sale_id TEXT NOT NULL,
          failure_reason TEXT NOT NULL,
          payload JSONB NOT NULL,
          last_error TEXT,
          failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX CONCURRENTLY idx_sales_events_dlq_failed_at
          ON wr.sales_events_dlq(failed_at DESC);
        ```

  Table: wr.sales_events_archive
  - [ ] Create archive table to support retention jobs:
        ```sql
        CREATE TABLE wr.sales_events_archive (
          id BIGSERIAL PRIMARY KEY,
          sale_id TEXT NOT NULL,
          external_event_id TEXT,
          tenant_key TEXT,
          source TEXT NOT NULL,
          payload JSONB NOT NULL,
          status TEXT NOT NULL,
          retry_count INTEGER NOT NULL,
          error_message TEXT,
          processed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL,
          archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ```

  Trigger Helper
  - [ ] Add reusable trigger function to maintain `updated_at`:
        ```sql
        CREATE OR REPLACE FUNCTION wr_touch_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at := NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        ```
        Recreate the trigger from the previous step after deploying this function.

  Data Retention Policies
  - [ ] Document retention periods:
        • sales_events: Keep 'processed' rows for 90 days, 'failed' indefinitely (manual review).
        • api_audit_log: Keep for 90 days, archive older to cold storage.
        • queue: Archive 'completed' items after 30 days to wr.queue_archive table.

  - [ ] Create cleanup job (run daily via cron):
        ```sql
        -- Archive old processed events
        INSERT INTO wr.sales_events_archive
        SELECT * FROM wr.sales_events
        WHERE status = 'processed' AND processed_at < NOW() - INTERVAL '90 days';

        DELETE FROM wr.sales_events
        WHERE status = 'processed' AND processed_at < NOW() - INTERVAL '90 days';

        -- Delete old audit logs
        DELETE FROM wr.api_audit_log WHERE created_at < NOW() - INTERVAL '90 days';
        ```

  Partitioning Strategy (Optional - for high volume)
  - [ ] If expecting >10K events/day, consider partitioning sales_events by created_at:
        ```sql
        -- Convert to partitioned table (requires downtime or pg_partman)
        CREATE TABLE wr.sales_events_partitioned (LIKE wr.sales_events)
        PARTITION BY RANGE (created_at);

        -- Create monthly partitions
        CREATE TABLE wr.sales_events_2025_02 PARTITION OF wr.sales_events_partitioned
        FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
        ```
        Decision: Skip for MVP, implement if load testing shows need.

B2. API Route Skeleton
  - [ ] Add `app/api/events/route.ts`.
  - [ ] Accept POST requests only (return 405 for GET/PUT/DELETE).
  - [ ] Extract API key from `Authorization: Bearer <token>` header, compare with env var.
  - [ ] Return `401` for missing/incorrect token.
  - [ ] Add request size limit (max 100KB per request, configurable).
  - [ ] Set CORS headers if needed (default: same-origin only, configurable via env).

B2a. Rate Limiting (CRITICAL - Must Have for MVP)
  - [ ] Implement rate limiting using Redis or in-memory store (upstash/rate-limit or similar).
  - [ ] Default limits: 100 requests per minute per API key.
  - [ ] Return `429 Too Many Requests` with `Retry-After` header.
  - [ ] Log rate limit violations for monitoring.
  - [ ] Make limits configurable per tenant key (future: introduce a lightweight `wr.tenants` table if multi-tenant requirements emerge).

B2b. Audit Logging
  - [ ] Log all API requests to `wr.api_audit_log` table:
        Columns: id, tenant_key, api_key_hash (not full key!), endpoint, http_method,
        status_code, request_ip, user_agent, created_at.
  - [ ] Keep logs for 90 days minimum (add retention policy).
  - [ ] Index on (created_at, tenant_key) for analytics queries.

B3. Payload Validation
  - [ ] Define TypeScript schema (e.g., Zod) with fields: `sale_id`, `occurred_at`, `customer_name`, `amount`, `currency`, `seller_external_id`, `category` (optional), `notes` (optional).  
  - [ ] Convert `occurred_at` to UTC ISO.  
  - [ ] Validate `amount > 0`, currency in `['TRY','USD','EUR']` for MVP.  
  - [ ] Normalize seller identifier (trim, lowercase slug).

B4. Persistence
  - [ ] Insert validated payload into `wr.sales_events` with status `pending`.  
  - [ ] Upsert seller record into `wr.sellers` if new (lightweight lookup).  
  - [ ] Return `202 Accepted` with an event tracking ID.

B5. Manual Entry Integration
  - [ ] Update existing manual sale form (likely `components/forms/manual-sale-form.tsx` or similar) to call `/api/events`.  
  - [ ] Route calls through a server action or handler that injects the API token from env (never expose secret to the browser).  
  - [ ] When callers do not provide `sale_id`, generate one via `crypto.randomUUID()` (format suggestion: `manual-${uuid}`) before invoking the API.  
  - [ ] Handle optimistic UI states (loading, success, error) to inform the user.  
  - [ ] Remove any code that previously wrote directly to queue/claims tables.

B6. Acceptance Criteria
  • POSTing a valid event stores a `pending` record and returns 202 within 200 ms.  
  • Missing/invalid token yields 401. Bad payload yields 400 with error detail.  
  • Manual form uses the same API and works end-to-end.

------------------------------------------------------------------------------
5. Workstream C – Event Processor & Queue Sync
------------------------------------------------------------------------------
Objective: Convert pending sales events into queue items and claims consistently.

C1. Processor Design & Implementation
  - [ ] Install pg-boss: `npm install pg-boss @types/pg-boss`.
  - [ ] Create `services/events/processor.ts` (pure processing logic).
  - [ ] Create `services/events/worker.ts` (pg-boss worker initialization).
  - [ ] Create `scripts/start-worker.ts` (entry point for worker process).

  Processor Configuration:
  - [ ] Batch size: configurable via env (default 100).
  - [ ] Concurrency: pg-boss handles parallelism (teamSize = 5 for MVP).
  - [ ] Polling interval: check for new events every 5 seconds.

  Processing Steps (Transactional):
  - [ ] 1. Fetch oldest pending events (LIMIT batch_size, ORDER BY created_at ASC).
  - [ ] 2. For each event, within a DB transaction:
        a. Map payload fields to queue record schema.
        b. Detect duplicates via `external_event_id` OR fingerprint `hash(seller_id + occurred_at + amount)`.
        c. If duplicate found: mark event as `processed` with note, skip insert.
        d. If new: INSERT into `wr.queue` (status = 'pending').
        e. INSERT into `wr.events` for audit trail (immutable event log).
        f. UPDATE sales_events SET status = 'processed', processed_at = NOW().
  - [ ] 3. On error: ROLLBACK transaction, mark event status = 'failed', increment retry_count.

C1a. Retry & Error Handling
  - [ ] Configure pg-boss retry policy:
        - Max retries: 3
        - Backoff: exponential (1min, 5min, 15min)
        - After max retries: move to dead letter queue (`wr.sales_events_dlq` table).
  - [ ] Store error details in `error_message` column (truncate to 1000 chars).
  - [ ] Add `retry_count` column to `wr.sales_events`.
  - [ ] Create monitoring alert when DLQ size > 10 events.

C1b. Concurrency & Idempotency
  - [ ] Use `FOR UPDATE SKIP LOCKED` when fetching pending events (prevents race conditions).
  - [ ] Ensure queue insert is idempotent (unique constraint on sale_id prevents duplicates).
  - [ ] If unique violation occurs: treat as success (event already processed by parallel worker).

C1c. Graceful Shutdown
  - [ ] Handle SIGTERM/SIGINT signals to drain in-flight jobs before exit.
  - [ ] Pg-boss automatically handles this with `boss.stop()`.
  - [ ] Set drain timeout to 30 seconds max.

C2. Queue Schema Definition
  - [ ] Create a minimal queue table tailored for the public edition (no dependency on legacy metrics):
        ```sql
        CREATE TABLE IF NOT EXISTS wr.queue (
          id BIGSERIAL PRIMARY KEY,
          sale_id TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending','claimed','excluded')),
          amount NUMERIC(12,2) NULL,
          currency TEXT NULL,
          customer_name TEXT NULL,
          occurred_at TIMESTAMPTZ NOT NULL,
          source TEXT NOT NULL DEFAULT 'api',
          assigned_seller_id TEXT NULL REFERENCES wr.sellers(seller_id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_queue_status ON wr.queue(status);
        CREATE INDEX IF NOT EXISTS idx_queue_updated_at ON wr.queue(updated_at DESC);
        ```
  - [ ] Add trigger to keep `updated_at` fresh (reuse `wr_touch_updated_at`).  
  - [ ] Update TypeScript models to match this schema (e.g., `lib/types.ts` queue item).

C3. Claim Flow Implementation
  - [ ] Create lightweight claims table keyed by `sale_id`:
        ```sql
        CREATE TABLE IF NOT EXISTS wr.claims (
          id BIGSERIAL PRIMARY KEY,
          sale_id TEXT NOT NULL REFERENCES wr.queue(sale_id) ON DELETE CASCADE,
          claimed_by TEXT NOT NULL,
          claim_type TEXT NOT NULL CHECK (claim_type IN ('first_touch','upsell','retention')),
          claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_sale_id ON wr.claims(sale_id);
        CREATE INDEX IF NOT EXISTS idx_claims_claimed_by ON wr.claims(claimed_by);
        ```
  - [ ] Ensure API/worker writes the simplified claim payload (no finance columns).  
  - [ ] Update TypeScript types and service utilities to use `saleId` strings everywhere.

C4. Legacy Poller Decommission
  - [ ] Remove `services/poller/worker.ts`, related scripts, and npm aliases so the public build exposes only the new ingestion pipeline.  
  - [ ] Purge documentation and README references to “poller” or `subscription_id`.

C5. WebSocket Update
  - [ ] Update `services/socket/server.ts` queries: replace `subscription_id` with `sale_id`.  
  - [ ] Ensure outgoing events reference new naming (`saleId`, `sellerId`, etc.).

C6. Acceptance Criteria
  • `npm run process-events` processes at least 100 events/minute locally.  
  • Duplicate events are skipped (no duplicate queue rows).  
  • Socket updates reflect new sale IDs without client errors.  
  • Queue/claims tables contain only the new sale-centric columns (no subscription artifacts).  
  • Legacy poller scripts are removed.

------------------------------------------------------------------------------
6. Workstream D – UI Simplification
------------------------------------------------------------------------------
Objective: Deliver a minimal experience focused on queue and leaderboard.

D1. Navigation Audit
  - [ ] Identify routes under `app/` that are finance-specific (`installments`, `recent-sales` with finance filters, etc.).  
  - [ ] Remove routes or wrap them with a `featureFlag?.finance` guard defaulting to `false`.

D2. Queue Page
  - [ ] Update list to read from new sale model (fields: saleId, sellerDisplayName, amount, currency).  
  - [ ] Confirm claim actions still POST to existing endpoints (update if endpoints renamed).  
  - [ ] Remove margin/finance columns.

D3. Dashboard/Leaderboard
  - [ ] Replace finance metrics with basic counts (wins, amount).  
  - [ ] Ensure bar charts only require fields present in new data.  
  - [ ] Verify there are no references to `subscription_id`.

D4. Admin Tools
  - [ ] Keep only essential controls: claim approval, exclude/restore, manual sale entry.  
  - [ ] Remove refund/installment settings panels.  
  - [ ] Adjust permission checks if specific roles were tied to finance modules.

D5. Acceptance Criteria
  • UI builds with zero TypeScript errors.  
  • QA click-through finds no navigation links to removed modules.  
  • Queue and leaderboard show correct data for API- and manually-ingested sales.

------------------------------------------------------------------------------
7. Workstream E – Copy & Localization
------------------------------------------------------------------------------
Objective: Ensure all user-facing content is English and consistent.

E1. String Audit
  - [ ] Run `rg "\".*[\\u011F\\u00FC\\u015F\\u0131\\u00F6\\u00E7\\u011E\\u00DC\\u015E\\u0130\\u00D6\\u00C7].*\""` and `rg "[[:^ascii:]]"` to find non-English strings.  
  - [ ] Check `public/` assets (images, audio cues) for Turkish text.

E2. Copy Centralization
  - [ ] Create `lib/i18n/en.ts` exporting a plain object of strings.  
  - [ ] Replace inline literals with references to the dictionary.  
  - [ ] For dynamic strings (e.g., `Welcome, {name}`), use template helpers.

E3. Validation Messages
  - [ ] Ensure API error responses are English and user-friendly.  
  - [ ] Update form validation copy to match UI tone.

E4. Acceptance Criteria
  • `rg` search for Turkish characters returns zero results in `app/`, `components/`, `services/`.  
  • All copy changes pass design/PM review for tone.

------------------------------------------------------------------------------
8. Workstream F – Documentation Consolidation (This File)
------------------------------------------------------------------------------
Objective: Transform this file into the single public-facing document.

F1. Remove Redundant Files
  - [ ] Delete old markdown docs (DEPLOYMENT*, PROJECT.md, etc.) after migrating relevant content here.  
  - [ ] Update README.md to a short pointer (“See PUBLIC_RELEASE_TSD.md”).  
  - [ ] Note: Confirm with stakeholders before deletion if other teams still use them.

F2. Sections To Populate (Junior Engineer Task)
  - [ ] Installation & Local Setup (add in Section 9).  
  - [ ] API Reference (add in Section 10).  
  - [ ] Operational Runbook (add in Section 11).  
  - [ ] Changelog (appendix).

F3. Acceptance Criteria
  • All necessary setup instructions exist in this file.  
  • Other md files are either removed or reference this document.  
  • Links in README / package.json scripts point here if they mention docs.

------------------------------------------------------------------------------
9. Setup & Configuration (To Be Completed After Implementation)
------------------------------------------------------------------------------
// TODO: Fill in after code changes  
  - Prerequisites (Node version, Postgres, env vars).  
  - `npm run dev` instructions.  
  - Test account creation or seed script.  
  - Deployment steps (Docker or Vercel + separate socket host).

------------------------------------------------------------------------------
10. API Reference & Versioning Strategy
------------------------------------------------------------------------------

10.1 Versioning Approach
  Initial Version: v1 (implicit, no version in URL for MVP)
  - Path: `/api/events` (no version prefix for now)
  - Breaking changes in future: introduce `/api/v2/events`
  - v1 maintained for 12 months minimum after v2 release

  Version Header (Optional for Clients):
  - Clients can send `X-API-Version: 1` header
  - If omitted: defaults to latest stable (v1)
  - Used for future analytics and deprecation warnings

10.2 Endpoint: POST /api/events

  Authentication
    Header: `Authorization: Bearer <INGESTION_API_KEY>`
    Key Format: 32+ character random string (generate with `openssl rand -hex 32`)
    Management: Store hashed in database (SHA-256), compare on each request
    Rotation: Keys can be rotated via admin panel (future feature)

  Request Headers
    Required:
      - `Authorization: Bearer <token>`
      - `Content-Type: application/json`
    Optional:
      - `X-Request-ID`: Client-provided request ID for tracking (reflected in response)
      - `X-API-Version`: API version (default: 1)

  Request Body Schema
    ```typescript
    interface SaleEventPayload {
      sale_id: string;              // Unique ID from external system (max 255 chars)
      occurred_at: string;          // ISO 8601 timestamp (UTC), e.g., "2025-02-16T15:30:00Z"
      customer_name: string;        // Customer/company name (max 500 chars)
      amount: number;               // Sale amount (must be > 0, up to 2 decimal places)
      currency: 'TRY' | 'USD' | 'EUR';  // ISO 4217 currency code (expand as needed)
      seller_external_id: string;   // Seller identifier from external system (max 255 chars)
      category?: string;            // Optional: sale category (max 100 chars)
      notes?: string;               // Optional: additional notes (max 2000 chars)
    }
    ```

  Request Body Example
    ```json
    {
      "sale_id": "ext-12345",
      "occurred_at": "2025-02-16T15:30:00Z",
      "customer_name": "Acme Inc.",
      "amount": 1800.50,
      "currency": "USD",
      "seller_external_id": "sel-987",
      "category": "new_business",
      "notes": "Converted from webinar lead"
    }
    ```

  Response: 202 Accepted (Success)
    ```json
    {
      "eventId": "f3b8b4c2-1a2b-3c4d-5e6f-7g8h9i0j1k2l",
      "status": "pending",
      "message": "Event received and queued for processing"
    }
    ```

  Response: 400 Bad Request (Validation Error)
    ```json
    {
      "error": "Validation failed",
      "details": [
        {
          "field": "amount",
          "message": "amount must be greater than 0"
        }
      ]
    }
    ```
    Common validation errors:
      - Missing required field: `{field} is required`
      - Invalid format: `occurred_at must be a valid ISO 8601 timestamp`
      - Out of range: `amount must be greater than 0`
      - Invalid enum: `currency must be one of: TRY, USD, EUR`

  Response: 401 Unauthorized (Auth Error)
    ```json
    {
      "error": "Invalid or missing API token"
    }
    ```

  Response: 429 Too Many Requests (Rate Limit)
    ```json
    {
      "error": "Rate limit exceeded",
      "retryAfter": 42
    }
    ```
    Headers:
      - `Retry-After: 42` (seconds until reset)
      - `X-RateLimit-Limit: 100` (requests per window)
      - `X-RateLimit-Remaining: 0`
      - `X-RateLimit-Reset: 1676563200` (Unix timestamp)

  Response: 500 Internal Server Error
    ```json
    {
      "error": "Internal server error",
      "requestId": "req-abc123"  // For support ticket reference
    }
    ```

10.3 Backward Compatibility Guarantees

  What Will NOT Break (Guaranteed)
    - Existing required fields will remain required
    - Field types will not change (string stays string, number stays number)
    - Enum values will only be added, never removed
    - 202 response will always mean "accepted successfully"

  What MAY Change (Non-Breaking)
    - New optional fields added to request schema
    - New optional fields added to response
    - New error codes introduced (clients should handle unknown codes gracefully)
    - Rate limits adjusted (will be communicated 30 days in advance)

  What WILL Break (Requires New Version)
    - Removing or renaming required fields
    - Changing field types
    - Removing enum values
    - Changing authentication mechanism

  Deprecation Policy
    - 90 days notice before any breaking change
    - Deprecation warnings sent via email to registered contacts
    - Deprecated endpoints return `X-API-Deprecated: true` header
    - Old version supported for 12 months minimum after new version release

10.4 Health Check Endpoint

  Endpoint: GET /api/health
    No authentication required (public endpoint)

    Response: 200 OK
    ```json
    {
      "status": "healthy",
      "version": "1.0.0",
      "timestamp": "2025-02-16T15:30:00Z",
      "services": {
        "database": "healthy",
        "processor": "healthy",
        "socket": "healthy"
      }
    }
    ```

    Response: 503 Service Unavailable (Degraded)
    ```json
    {
      "status": "degraded",
      "version": "1.0.0",
      "timestamp": "2025-02-16T15:30:00Z",
      "services": {
        "database": "healthy",
        "processor": "unhealthy",  // Worker down
        "socket": "healthy"
      }
    }
    ```

10.5 Error Codes Reference

    HTTP Status Code | Error Type | Retry? | Action
    -----------------|------------|--------|--------
    400 | Validation error | No | Fix request payload
    401 | Authentication error | No | Check API key
    429 | Rate limit exceeded | Yes | Wait and retry after Retry-After seconds
    500 | Internal server error | Yes | Retry with exponential backoff, contact support if persists
    503 | Service unavailable | Yes | System is down, retry after 1 minute

------------------------------------------------------------------------------
11. Operational Runbook (Draft)
------------------------------------------------------------------------------
Daily
  - Monitor queue processing metrics (events pending vs processed).  
  - Check logs for failed events (`status = 'failed'`).

On-call Playbook
  1. If events stuck in `pending`: run processor manually (`npm run process-events`).  
  2. If API returning 401: verify `INGESTION_API_KEY` env variable.  
  3. If WebSocket down: restart socket service (`pm2 restart winroom-socket` or equivalent).

Backups
  - Schedule nightly Postgres backup (document exact commands once infra picked).  
  - Retain logs for 14 days minimum.

------------------------------------------------------------------------------
12. Testing Strategy (Comprehensive)
------------------------------------------------------------------------------

12.1 Unit Tests (Target: 80% coverage)
  API Layer (app/api/events/route.ts)
  - [ ] Test payload validation with Zod:
        • Valid payload returns 202
        • Missing required fields returns 400 with specific error
        • Invalid currency returns 400
        • Negative amount returns 400
        • Future date in occurred_at returns 400
        • Malformed JSON returns 400
  - [ ] Test authentication:
        • Missing Authorization header returns 401
        • Invalid Bearer token returns 401
        • Valid token with valid payload returns 202
  - [ ] Test rate limiting:
        • 101st request within 1 minute returns 429
        • Retry-After header is present on 429
        • Rate limit resets after 60 seconds
  - [ ] Test idempotency:
        • Duplicate external_event_id returns 202 but doesn't create duplicate row
        • Check event count remains 1 after duplicate POST

  Processor Logic (services/events/processor.ts)
  - [ ] Test event processing:
        • processEvent() maps payload correctly to queue schema
        • Duplicate detection works (same seller + timestamp + amount)
        • Failed events increment retry_count
        • Successful events mark status = 'processed'
  - [ ] Test error handling:
        • Invalid seller_id logs error and marks event as failed
        • DB constraint violation doesn't crash processor
        • Transaction rollback on error
  - [ ] Test batch processing:
        • Fetches correct batch size
        • Processes events in order (oldest first)
        • Skips locked rows (FOR UPDATE SKIP LOCKED works)

12.2 Integration Tests (Database Required)
  - [ ] Test full API → DB → Processor flow:
        • POST event → verify row in sales_events
        • Run processor once → verify row in queue
        • Verify audit log entry created
  - [ ] Test concurrent event processing:
        • Insert 500 pending events
        • Start 3 processor instances
        • Verify all 500 processed with no duplicates in queue
  - [ ] Test dead letter queue:
        • Create event that always fails (invalid data)
        • Verify retry_count increments
        • Verify moves to DLQ after 3 retries

12.3 End-to-End Tests (Playwright/Cypress)
  Manual Sale Flow
  - [ ] User fills manual sale form → submits
  - [ ] Verify success toast appears
  - [ ] Verify sale appears in queue within 5 seconds (via Socket.IO)
  - [ ] Verify leaderboard updates

  API Sale Flow
  - [ ] External system POSTs to /api/events
  - [ ] User watching queue sees new item appear in real-time
  - [ ] User claims item → verify claim appears in dashboard
  - [ ] Verify leaderboard updates

  Error Cases
  - [ ] Submit invalid sale (negative amount) → verify error message
  - [ ] API with wrong token → verify 401 error page
  - [ ] Rate limit exceeded → verify friendly error message

12.4 Bootstrap Testing (CRITICAL)
  Fresh Install Validation
  - [ ] Start with an empty Postgres instance and run Stage 1 (Section 2.5) migrations.  
  - [ ] Verify required tables exist (`wr.sales_events`, `wr.queue`, `wr.claims`, `wr.api_audit_log`).  
  - [ ] Confirm zero rows in queue/claims and DLQ tables.

  End-to-End Smoke
  - [ ] POST a sample sale via `/api/events` (use realistic payload).  
  - [ ] Ensure `wr.sales_events` receives `status='pending'` and worker transitions it to `processed`.  
  - [ ] Confirm `wr.queue` row is created with correct `sale_id`, amount, currency, and seller mapping.  
  - [ ] Claim the sale through the UI → verify `wr.claims` row created and UI reflects change.

  Failure & Recovery
  - [ ] Simulate worker failure (stop worker, insert events) → ensure retries/DLQ logic handles backlog once restarted.  
  - [ ] Force validation error via API (e.g., negative amount) → expect 400 response and no DB writes.  
  - [ ] Intentionally push an event with duplicate `sale_id` → verify processor treats as idempotent success.

12.5 Performance Testing
  API Load Testing (Use k6, Artillery, or similar)
  - [ ] Test baseline: 100 requests/minute for 10 minutes
        • Expected: p95 latency < 200ms, 0% error rate
  - [ ] Test spike: 500 requests in 1 minute
        • Expected: Rate limiter kicks in, some 429s, no 500s
  - [ ] Test sustained load: 50 req/min for 1 hour
        • Expected: No memory leaks, stable latency

  Processor Performance
  - [ ] Insert 10,000 pending events
  - [ ] Start processor
  - [ ] Measure time to clear queue
        • Expected: < 5 minutes (≈33 events/sec)
  - [ ] Monitor CPU/memory usage
        • Expected: < 200MB RAM, < 30% CPU on 2-core VM

  Database Performance
  - [ ] Run EXPLAIN ANALYZE on critical queries:
        • Processor batch fetch (should use idx_sales_events_pending)
        • Queue fetch for socket broadcast (should use idx_queue_status)
        • Leaderboard aggregation (should use indexes)
  - [ ] Monitor slow query log (queries > 100ms)
  - [ ] Test with 1M rows in sales_events (simulate 6 months of data)

12.6 Security Testing
  - [ ] Test SQL injection in payload fields (Zod should prevent)
  - [ ] Test XSS in customer_name field (should be sanitized before display)
  - [ ] Test API key brute-force (rate limiter should block)
  - [ ] Test large payload attack (request size limit should block)
  - [ ] Verify API keys not logged in plain text (check all log files)
  - [ ] Test CORS bypass attempts (should be rejected)

12.7 Compatibility Testing
  - [ ] Validate API clients that omit optional fields (e.g., `category`) still succeed.  
  - [ ] Ensure adding new optional response fields does not break existing SDKs.  
  - [ ] Confirm Socket.IO payloads remain backward compatible when new keys are added (ignore unknown keys).  
  - [ ] Verify manual entry flow handles missing optional payload fields gracefully.

12.8 Smoke Tests (Run After Every Deployment)
  - [ ] GET /api/health returns 200
  - [ ] POST /api/events with valid token returns 202
  - [ ] Manual sale form submits successfully
  - [ ] Queue page loads without errors
  - [ ] Leaderboard displays data
  - [ ] Socket.IO connection establishes
  - [ ] Processor is running (check pm2 status or equivalent)

Test Data Management
  - [ ] Create seed script for realistic test data:
        • 100 sellers, 500 sales events, 50 claims
  - [ ] Add script to reset test database to clean state
  - [ ] Document test accounts and API keys for QA

Test Coverage Goals
  • Unit tests: 80% coverage minimum
  • Integration tests: Cover all critical paths (API → processor → queue)
  • E2E tests: Cover top 5 user journeys
  • Bootstrap tests: cover installation, first event ingestion, and rollback-to-clean-state flows

------------------------------------------------------------------------------
13. Timeline & Milestones (Realistic 6-8 Week Plan)
------------------------------------------------------------------------------
IMPORTANT: This timeline assumes 1-2 full-time engineers. Adjust based on team size
and availability. Include buffer time for unexpected issues and stakeholder reviews.

Week 1: Foundation & Environment Setup
  - [ ] Complete Workstream A (repo prep, environment audit, dependency cleanup)
  - [ ] Provision local/staging Postgres instances and run Stage 1 migrations
  - [ ] Set up Redis (if using) and verify connectivity
  - [ ] Bootstrap `.env` files with placeholder secrets
  Milestone: Environments online with empty schema

Week 2: API Development & Testing
  - [ ] Complete Workstream B (full API with validation, rate limiting, audit logging)
  - [ ] Write unit tests for API layer (80% coverage goal)
  - [ ] Stand up API documentation/examples (Section 10)
  Milestone: API accepts events and stores in `wr.sales_events`

Week 3: Event Processor & Queue
  - [ ] Complete Workstream C (processor logic, queue/claim schema creation)
  - [ ] Integrate worker into dev/staging environments
  - [ ] Write integration tests covering API → processor → queue
  Milestone: Events reach queue/claims end-to-end

Week 4: UI Simplification & Real-Time Path
  - [ ] Complete Workstream D (UI refactor to new data model)
  - [ ] Update Socket.IO handlers and client hooks
  - [ ] Remove finance/installment routes from build
  Milestone: Dashboard reflects live queue/claim updates from new pipeline

Week 5: Copy, Localization & Docs
  - [ ] Complete Workstream E (English copy pass, central string file)
  - [ ] Begin Workstream F (documentation consolidation into this TSD + README pointer)
  - [ ] Conduct accessibility/usability review on simplified UI
  Milestone: Public-facing copy and docs ready for review

Week 6: Hardening & Release Candidate
  - [ ] Performance testing (API, worker throughput, websocket load)
  - [ ] Security testing (OWASP top 10, rate limit abuse, secret storage)
  - [ ] Chaos testing of worker restarts / DLQ handling
  - [ ] Prepare deployment automation (scripts, infra-as-code if applicable)
  Milestone: Release candidate build passes quality gates

Week 7: Production Deployment & Monitoring
  - [ ] Production deployment during planned window
  - [ ] Execute bootstrap checklist (Section 2.5) in production
  - [ ] Run smoke tests immediately after deployment
  - [ ] Monitor intensively for 48 hours (assign on-call rotation)
  Milestone: Production environment serving real traffic

Week 8: Stabilization & Enablement
  - [ ] Complete Workstream F (final documentation polish, knowledge transfer)
  - [ ] Finalize operational runbook with post-launch learnings
  - [ ] Post-mortem / retro with stakeholders
  - [ ] Prepare onboarding materials for external customers (videos, quick start)
  Milestone: Project complete, ready for customer onboarding

Buffer & Risk Contingency
  • If major issues found: Add 1-2 weeks for fixes
  • If stakeholder reviews delayed: Add 1 week
  • If performance doesn't meet targets: Add 1 week for optimization
  • Recommended: Plan for 8 weeks, communicate 6 weeks externally

Key Decision Points
  Week 2 End: Go/No-Go for expanding into worker/queue work (API must be stable)
  Week 4 End: Go/No-Go for release-candidate polishing (UI + real-time path complete)
  Week 6 End: Go/No-Go for production deployment (performance & security tests green)

------------------------------------------------------------------------------
14. Dependencies & External Stakeholders
------------------------------------------------------------------------------
Dependencies
  • Product approval on simplified feature set.  
  • Access to staging Postgres for schema bootstrap and load testing.  
  • DevOps support for new API secret management.

Stakeholders
  • Product Manager – final scope approval.  
  • Design – copy review, UI adjustments.  
  • Sales Ops – confirm onboarding needs for third parties.  
  • Infrastructure – deployment review.

------------------------------------------------------------------------------
15. Risks & Mitigations (Comprehensive)
------------------------------------------------------------------------------

15.1 CRITICAL Risks (Project Blockers)

Risk: Schema bootstrap executed incorrectly (missing tables / constraints)
  Severity: CRITICAL
  Probability: Medium
  Impact: Application errors at startup, ingestion pipeline fails, customer onboarding blocked
  Mitigation:
    - [ ] Automate Stage 1 bootstrap via scripts checked into repo
    - [ ] Add CI check that runs migrations against an empty database
    - [ ] Maintain a verified SQL snapshot (Appendix 17) and keep it updated
    - [ ] Document smoke validation queries (Section 2.5) and run them after every deploy
    - [ ] Enable point-in-time recovery (PITR) for production Postgres
  Detection: Health check failing, `/api/events` returning 500, missing tables in logs

Risk: New event processor can't handle production load, queue backs up
  Severity: CRITICAL
  Probability: Medium
  Impact: Users don't see new sales for hours, real-time updates fail
  Mitigation:
    - [ ] Load test with 2x expected production volume (see Section 12.5)
    - [ ] Configure pg-boss with appropriate concurrency (teamSize = 5 initially)
    - [ ] Set up alerting when pending events > 100 (see Section 19)
    - [ ] Implement DLQ alerting + manual replay tooling
    - [ ] Horizontal scaling plan: add worker instances if needed
  Detection: Monitor `SELECT COUNT(*) FROM sales_events WHERE status='pending'`
  Rollback: Temporarily disable ingestion API, drain backlog with increased worker concurrency, and re-open API once queue stabilizes

Risk: Production bootstrap fails, system missing required tables/secrets
  Severity: CRITICAL
  Probability: Low
  Impact: Application boots with runtime errors, ingestion fails, customers blocked
  Mitigation:
    - [ ] Use blue-green deployment or canary release (see Section 20)
    - [ ] Deploy during low-traffic window (2-5 AM in primary timezone)
    - [ ] Health check endpoint ready before deployment (see Section 10.4)
    - [ ] Smoke tests run automatically after deployment
    - [ ] Execute Stage 1 bootstrap scripts before rolling out code
    - [ ] On-call engineer monitoring deployment in real-time
  Detection: Automated smoke tests fail
  Rollback: Restore latest database snapshot, re-run bootstrap scripts, redeploy application

15.2 HIGH Risks (Serious Issues)

Risk: External teams misuse API, send malformed or malicious data
  Severity: HIGH
  Probability: High
  Impact: Database pollution, processor crashes, wasted compute resources
  Mitigation:
    - [ ] Strict Zod validation on all fields (see Section B3)
    - [ ] Rate limiting from day 1 (100 req/min per tenant)
    - [ ] Request size limits (100KB max payload)
    - [ ] Per-tenant API keys (isolate blast radius)
    - [ ] SQL injection protection via parameterized queries
    - [ ] XSS protection: sanitize all user-input before display
    - [ ] Audit logging for forensics (see Section B2b)
  Detection: High failed_events count, unusual error patterns in logs
  Response: Temporarily disable problematic API key, contact tenant

Risk: Socket server can't scale beyond 100 concurrent users
  Severity: HIGH
  Probability: Medium
  Impact: Real-time updates lag or fail, poor UX for growing customer base
  Mitigation:
    - [ ] Use Redis adapter for Socket.IO (enables multi-instance)
    - [ ] Load test with 200 concurrent connections (see Section 12.5)
    - [ ] Implement connection throttling
    - [ ] Consider WebSocket alternative if Socket.IO doesn't scale
    - [ ] Monitor connection count and p95 message latency
  Detection: Socket message latency > 2 seconds, connection drops
  Response: Add Socket.IO instances with Redis adapter, use sticky sessions

Risk: Removing finance modules breaks features still needed for internal use
  Severity: HIGH
  Probability: Medium
  Impact: Internal teams lose critical functionality
  Mitigation:
    - [ ] Audit with Product/Sales Ops BEFORE removing any feature
    - [ ] Use feature flags instead of deletion (can toggle back on)
    - [ ] Document all removed features in changelog
    - [ ] Keep finance code in separate branch for 6 months
  Detection: Internal users report missing functionality
  Response: Re-enable feature flag or cherry-pick code back

15.3 MEDIUM Risks (Quality Issues)

Risk: Turkish strings slip through, appear in production for external customers
  Severity: MEDIUM
  Probability: Medium
  Impact: Unprofessional appearance, confuses external customers
  Mitigation:
    - [ ] Run `rg` audit for Turkish characters (see Section E1)
    - [ ] Add pre-commit hook to reject Turkish strings in UI files
    - [ ] QA review of all user-facing screens
    - [ ] Add English-only CI test
  Detection: Customer reports seeing non-English text
  Response: Hotfix within 24 hours, add to regression tests

Risk: API key leaked in logs or client-side code
  Severity: MEDIUM
  Probability: Medium
  Impact: Unauthorized access, security breach, data corruption
  Mitigation:
    - [ ] Store API keys hashed (SHA-256) in database
    - [ ] Never log full API key (log last 4 chars only: `...abc123`)
    - [ ] Audit all console.log/logger calls for secrets
    - [ ] Add secret scanning to CI pipeline (git-secrets, truffleHog)
    - [ ] API key rotation mechanism (admin panel feature)
  Detection: Unusual API activity from unexpected IPs
  Response: Revoke compromised key immediately, notify tenant

Risk: Performance degrades over time as data grows (6+ months)
  Severity: MEDIUM
  Probability: High
  Impact: Slow queries, poor UX, increased cloud costs
  Mitigation:
    - [ ] Implement data retention policies (see Section B1)
    - [ ] Archive old data after 90 days
    - [ ] Partition large tables if > 10K events/day (see Section B1)
    - [ ] Regular VACUUM ANALYZE on large tables
    - [ ] Monitor query performance with pg_stat_statements
    - [ ] Set up index usage monitoring
  Detection: Query latency increases over time
  Response: Implement partitioning, optimize slow queries

15.4 LOW Risks (Minor Issues)

Risk: Copy centralization delays due to designer availability
  Severity: LOW
  Probability: Medium
  Impact: Launch delayed by 1-2 weeks
  Mitigation:
    - [ ] Prepare neutral default copy (see Section E2)
    - [ ] Flag for later refinement (don't block launch)
    - [ ] Get designer approval on top 10 most visible strings only
  Detection: Designer review taking > 1 week
  Response: Launch with "good enough" copy, iterate post-launch

Risk: Documentation gets out of sync with code
  Severity: LOW
  Probability: High
  Impact: Developer confusion, onboarding friction
  Mitigation:
    - [ ] Single source of truth: this TSD file
    - [ ] Update docs in same PR as code changes
    - [ ] Monthly documentation review (add to runbook)
  Detection: Developers ask questions answered in docs
  Response: Update docs immediately, share with team

Risk: Third-party pg-boss library has breaking changes
  Severity: LOW
  Probability: Low
  Impact: Upgrade blocked, security patches delayed
  Mitigation:
    - [ ] Pin pg-boss to specific minor version (9.x.x)
    - [ ] Subscribe to pg-boss GitHub releases
    - [ ] Test upgrades in staging before production
  Detection: Dependabot alert or breaking change announcement
  Response: Evaluate alternative or fork library if needed

15.5 Risk Monitoring Dashboard
  Create a simple dashboard (Grafana or similar) showing:
    - [ ] Pending events count (alert if > 100)
    - [ ] Failed events count (alert if > 10)
    - [ ] DLQ size (alert if > 10)
    - [ ] API error rate (alert if > 5%)
    - [ ] Rate limit violations per hour
    - [ ] Socket.IO connection count
    - [ ] Database connection pool usage
    - [ ] Processor lag (time between event creation and processing)

------------------------------------------------------------------------------
16. Launch Checklist (Comprehensive Pre-Release Validation)
------------------------------------------------------------------------------

16.1 Code & Features
  - [ ] All workstream acceptance criteria met (A through F)
  - [ ] Zero TypeScript compilation errors
  - [ ] All unit tests passing (80%+ coverage)
  - [ ] All integration tests passing
  - [ ] E2E tests passing for all critical user flows
  - [ ] Security testing completed (SQL injection, XSS, rate limiting)
  - [ ] Performance testing completed (load tests pass SLA requirements)
  - [ ] No Turkish strings remaining (`rg` audit clean)
  - [ ] Finance modules removed or feature-flagged
  - [ ] Manual sale form uses new API
  - [ ] Legacy poller code deleted (services/poller removed, scripts cleaned)

16.2 Bootstrap & Data Integrity
  - [ ] Stage 1-4 bootstrap steps (Section 2.5) executed and logged
  - [ ] Data validation queries all pass (see Section 2.5)
  - [ ] No orphaned records found between sales_events, queue, claims
  - [ ] Sale IDs match expected format across all tables
  - [ ] Database backups/snapshots verified and restorable
  - [ ] Rollback-to-clean-state procedure tested in staging

16.3 Infrastructure & Deployment
  - [ ] Staging environment uses new ingestion API exclusively
  - [ ] Staging soak test passed (72 hours stable)
  - [ ] Production deployment plan reviewed and approved
  - [ ] Blue-green or canary deployment configured
  - [ ] Database migrations backward compatible
  - [ ] Health check endpoint working (/api/health returns 200)
  - [ ] Load balancer configured with health checks
  - [ ] SSL certificates valid and auto-renewing

16.4 Monitoring & Alerting
  - [ ] Prometheus/Datadog metrics collection working
  - [ ] Grafana dashboards created for key metrics
  - [ ] Critical alerts configured (PagerDuty/SMS)
  - [ ] Warning alerts configured (Email/Slack)
  - [ ] On-call rotation defined and communicated
  - [ ] Log aggregation working (can query last 7 days)
  - [ ] Alerting tested (verify alerts fire correctly)

16.5 API & Documentation
  - [ ] API Reference complete with all endpoints (Section 10)
  - [ ] Rate limiting enabled (100 req/min per tenant)
  - [ ] API audit logging enabled
  - [ ] Request size limits enforced (100KB)
  - [ ] CORS policy configured
  - [ ] API versioning strategy documented
  - [ ] Deprecation policy communicated to partners
  - [ ] Swagger/OpenAPI spec generated (optional but recommended)

16.6 Operations & Support
  - [ ] Operational Runbook complete (Section 11)
  - [ ] Common issues and resolutions documented
  - [ ] Database backup schedule confirmed
  - [ ] Log retention policies configured
  - [ ] Data cleanup jobs scheduled (cron)
  - [ ] Secret management audited (no keys in logs)
  - [ ] API key rotation procedure documented

16.7 External Readiness
  - [ ] Partner onboarding documentation ready
  - [ ] Sample API integration code/SDKs prepared
  - [ ] Support email/Slack channel set up
  - [ ] Pricing/billing plan finalized (if applicable)
  - [ ] Legal/privacy policy reviewed (GDPR, etc.)
  - [ ] Public announcement plan ready (marketing)

16.8 Team Readiness
  - [ ] Final QA sign-off from QA team
  - [ ] Product Manager approval
  - [ ] Engineering lead approval
  - [ ] Bug bash completed (all critical bugs fixed)
  - [ ] Post-deployment monitoring plan assigned
  - [ ] Emergency contact list up to date

16.9 Go/No-Go Criteria (Must All Be TRUE)
  - [ ] Zero critical bugs in staging
  - [ ] All launch checklist items above complete
  - [ ] Rollback tested and under 5 minutes
  - [ ] On-call engineer confirmed and available
  - [ ] Stakeholders notified of deployment window
  - [ ] No other major deployments scheduled same day

Decision: [ ] GO / [ ] NO-GO (Date: _________, Approved by: _________)

------------------------------------------------------------------------------
17. Appendix – Bootstrap Script Sketch (Reference Only)
------------------------------------------------------------------------------
```sql
-- Minimal bootstrap for fresh Postgres instance
BEGIN;

CREATE SCHEMA IF NOT EXISTS wr;

CREATE OR REPLACE FUNCTION wr_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS wr.sellers (
  seller_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wr.sales_events (
  id BIGSERIAL PRIMARY KEY,
  sale_id TEXT NOT NULL UNIQUE,
  external_event_id TEXT NULL,
  tenant_key TEXT NULL,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  processed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_events_external_id
  ON wr.sales_events(tenant_key, external_event_id)
  WHERE external_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_events_pending
  ON wr.sales_events(status, created_at) WHERE status = 'pending';
CREATE TRIGGER trg_sales_events_updated_at
BEFORE UPDATE ON wr.sales_events
FOR EACH ROW EXECUTE FUNCTION wr_touch_updated_at();

CREATE TABLE IF NOT EXISTS wr.queue (
  id BIGSERIAL PRIMARY KEY,
  sale_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','claimed','excluded')),
  amount NUMERIC(12,2),
  currency TEXT,
  customer_name TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'api',
  assigned_seller_id TEXT REFERENCES wr.sellers(seller_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_queue_status ON wr.queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_updated_at ON wr.queue(updated_at DESC);
CREATE TRIGGER trg_queue_updated_at
BEFORE UPDATE ON wr.queue
FOR EACH ROW EXECUTE FUNCTION wr_touch_updated_at();

CREATE TABLE IF NOT EXISTS wr.claims (
  id BIGSERIAL PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES wr.queue(sale_id) ON DELETE CASCADE,
  claimed_by TEXT NOT NULL,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('first_touch','upsell','retention')),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_sale_id ON wr.claims(sale_id);

CREATE TABLE IF NOT EXISTS wr.events (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  sale_id TEXT NOT NULL REFERENCES wr.queue(sale_id) ON DELETE CASCADE,
  actor TEXT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_type ON wr.events(type);

CREATE TABLE IF NOT EXISTS wr.api_audit_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_key TEXT,
  api_key_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  http_method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  request_ip INET,
  user_agent TEXT,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wr.api_keys (
  id BIGSERIAL PRIMARY KEY,
  tenant_key TEXT,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON wr.api_keys(key_hash);

CREATE TABLE IF NOT EXISTS wr.sales_events_dlq (
  id BIGSERIAL PRIMARY KEY,
  sale_id TEXT NOT NULL,
  failure_reason TEXT NOT NULL,
  payload JSONB NOT NULL,
  last_error TEXT,
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wr.sales_events_archive (
  id BIGSERIAL PRIMARY KEY,
  sale_id TEXT NOT NULL,
  external_event_id TEXT,
  tenant_key TEXT,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  retry_count INTEGER NOT NULL,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wr.cache_kv (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ttl_seconds INT NOT NULL DEFAULT 86400
);

CREATE TABLE IF NOT EXISTS wr.streak_state (
  id SERIAL PRIMARY KEY,
  current_claimer TEXT NULL,
  current_count INT NOT NULL DEFAULT 0,
  last_claim_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO wr.streak_state (id, current_count)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

COMMIT;
```

------------------------------------------------------------------------------
18. Glossary
------------------------------------------------------------------------------
Sale Event: A normalized record representing a sales action, whether API or manual.
Queue Item: A sale awaiting claim.
Claim: Assignment of a sale to a seller.
Processor: Background job that converts sales events into queue entries.
Tenant: A company using the public version of Win Room.
DLQ: Dead Letter Queue - storage for events that failed processing after max retries.
Bootstrap: First-time initialization of database schema and seed data for a fresh deployment.
Soak Test: Extended testing period (48-72 hours) to verify stability under real load.

------------------------------------------------------------------------------
19. Monitoring, Observability & Alerting
------------------------------------------------------------------------------

19.1 Metrics Collection

  Required Metrics (Collect from Day 1)

  Application Metrics:
    - API request rate (requests/min, grouped by endpoint, tenant, status code)
    - API request latency (p50, p95, p99)
    - API error rate (4xx, 5xx)
    - Rate limit violations (count per tenant per hour)
    - Event ingestion rate (events/min)
    - Event processing rate (events/min)
    - Event processing lag (seconds between created_at and processed_at)
    - Pending events count (gauge)
    - Failed events count (gauge)
    - DLQ size (gauge)
    - Active Socket.IO connections (gauge)
    - Socket message broadcast latency (p95)

  Database Metrics:
    - Connection pool usage (active/idle/waiting)
    - Query latency (p95 for top 10 queries)
    - Slow queries (>100ms)
    - Table sizes (MB, track growth)
    - Index hit ratio (should be >99%)
    - Dead tuples count (for VACUUM monitoring)

  System Metrics:
    - CPU usage (per service: API, processor, socket)
    - Memory usage (per service)
    - Disk I/O (IOPS, throughput)
    - Network I/O (bytes in/out)

  Metrics Stack Options:
    Option A (Recommended for MVP): Prometheus + Grafana
      - [ ] Install prom-client npm package
      - [ ] Expose /metrics endpoint (no auth, internal only)
      - [ ] Deploy Prometheus to scrape /metrics every 15s
      - [ ] Deploy Grafana with pre-built dashboards

    Option B: Datadog (if already using)
      - [ ] Install dd-trace npm package
      - [ ] Configure Datadog API key
      - [ ] StatsD integration for custom metrics

    Option C: Cloud-native (AWS CloudWatch, GCP Monitoring)
      - [ ] Use cloud provider's SDK for metrics
      - [ ] Set up dashboards in cloud console

19.2 Logging Strategy

  Log Levels & Usage:
    ERROR: Unrecoverable errors, alerting required
      - Database connection failures
      - Event processing failures after all retries
      - Unhandled exceptions

    WARN: Recoverable errors, review regularly
      - Event processing retry attempts
      - Rate limit violations
      - Validation failures
      - Missing optional configurations

    INFO: Important business events
      - API requests (with tenant_key, status_code, latency)
      - Event processing success
      - Bootstrap milestones or release deployments

    DEBUG: Development only (disable in production)
      - Detailed request/response payloads
      - SQL query parameters

  Structured Logging Format (JSON):
    ```json
    {
      "timestamp": "2025-02-16T15:30:00.123Z",
      "level": "INFO",
      "service": "api",
      "message": "Event ingested successfully",
      "context": {
        "tenant_key": "acme",
        "event_id": "f3b8b4c2...",
        "sale_id": "ext-12345",
        "latency_ms": 45
      }
    }
    ```

  Log Aggregation:
    Option A: ELK Stack (Elasticsearch, Logstash, Kibana)
    Option B: Cloud-native (AWS CloudWatch Logs, GCP Logging)
    Option C: Managed service (Datadog Logs, Logtail)

  Log Retention:
    - Production: 30 days in hot storage, 90 days in cold storage
    - Staging: 7 days
    - Development: 1 day

19.3 Alerting Rules

  CRITICAL Alerts (PagerDuty/SMS)
    - [ ] Pending events > 100 for more than 5 minutes
        Action: Check processor is running, investigate DB performance
    - [ ] DLQ size > 50
        Action: Review failed events, check for systematic issue
    - [ ] API error rate > 10% for more than 2 minutes
        Action: Check for deployment issues, database problems
    - [ ] Database connection pool exhausted
        Action: Restart services, investigate connection leaks
    - [ ] Processor service down (no heartbeat for 2 minutes)
        Action: Restart worker, check logs for crash reason

  WARNING Alerts (Email/Slack)
    - [ ] Pending events > 50 for more than 10 minutes
    - [ ] API error rate > 5% for more than 5 minutes
    - [ ] Socket.IO connection count > 80% of limit
    - [ ] Failed events count > 10
    - [ ] Slow query detected (>500ms)
    - [ ] Disk usage > 80%

  INFO Alerts (Slack only)
    - [ ] Daily summary: events processed, API requests, error count
    - [ ] Bootstrap stage completed or schema change deployed
    - [ ] Deployment completed successfully

19.4 Health Checks

  Application Health Endpoint: GET /api/health
    Checks:
      - [ ] Database reachable (simple SELECT 1 query)
      - [ ] Processor last heartbeat < 60 seconds ago (write timestamp to Redis/DB)
      - [ ] Socket server responding (ping endpoint)
    Response time: < 100ms
    Called by: Load balancer, monitoring system (every 10 seconds)

  Database Health:
    - [ ] Check replication lag (if using replicas)
    - [ ] Check disk space available
    - [ ] Check active connections < max_connections

  Processor Health:
    - [ ] Worker process running (pm2 status or systemd)
    - [ ] Last job completion timestamp < 5 minutes ago
    - [ ] No error logs in last 5 minutes

19.5 Observability Best Practices

  Distributed Tracing (Optional for MVP, Recommended Later):
    - [ ] Add trace IDs to API requests (X-Request-ID header)
    - [ ] Propagate trace ID through processor jobs
    - [ ] Include trace ID in all log entries
    - [ ] Use OpenTelemetry or Datadog APM for visualization

  Debugging Workflows:
    - [ ] Document how to find event by sale_id in logs
    - [ ] Document how to trace API request through system
    - [ ] Create runbook for common issues (see Section 11)

  Performance Monitoring:
    - [ ] Set up slow query alerts (Postgres log slow queries)
    - [ ] Monitor pg-boss job queue size
    - [ ] Track API endpoint performance trends

19.6 Monitoring Checklist for Launch

  Before Production Deployment:
    - [ ] Metrics endpoint exposed and Prometheus scraping
    - [ ] Critical alerts configured with PagerDuty/SMS
    - [ ] Log aggregation working (can search logs from last 7 days)
    - [ ] Health check endpoint returns 200 OK
    - [ ] Grafana dashboards created for key metrics
    - [ ] On-call rotation defined (who gets alerts when)
    - [ ] Runbook accessible to on-call engineer

  Post-Deployment:
    - [ ] Watch metrics for 2 hours continuously
    - [ ] Verify alerts are firing correctly (test with fake issue)
    - [ ] Check log volume is reasonable (not too noisy)
    - [ ] Confirm all services reporting metrics

------------------------------------------------------------------------------
20. Deployment Strategy & Rollback Procedures
------------------------------------------------------------------------------

20.1 Deployment Environments

  Development (Local)
    - Local Postgres database
    - Sample data (seed script)
    - Hot reload enabled
    - Debug logging enabled

  Staging (Pre-Production)
    - Production-like infrastructure
    - Copy of production data (anonymized)
    - All migrations tested here first
    - Used for QA and load testing

  Production
    - High availability setup
    - Database backups enabled
    - Monitoring and alerting active
    - Read replicas (if needed for scale)

20.2 Deployment Methods

  Option A: Blue-Green Deployment (Recommended)
    Setup:
      - Two identical environments: Blue (current) and Green (new)
      - Load balancer switches traffic between them
      - Database shared (migrations applied before code deployment)

    Process:
      1. [ ] Deploy new code to Green environment
      2. [ ] Run smoke tests on Green
      3. [ ] Switch 10% of traffic to Green (canary test)
      4. [ ] Monitor for 15 minutes
      5. [ ] Switch 100% of traffic to Green
      6. [ ] Keep Blue running for 1 hour (quick rollback possible)
      7. [ ] Shut down Blue if no issues

    Rollback:
      - Switch load balancer back to Blue (30 second recovery)

  Option B: Rolling Deployment
    Process:
      1. [ ] Deploy to 1 instance, remove from load balancer
      2. [ ] Wait 5 minutes, monitor errors
      3. [ ] Deploy to next instance
      4. [ ] Repeat until all instances updated

    Rollback:
      - Redeploy previous version to all instances

  Option C: Serverless (Vercel/Netlify)
    Process:
      - [ ] Git push to main branch
      - [ ] Automatic deployment by platform
      - [ ] Atomic deployment (all or nothing)

    Rollback:
      - Use platform's rollback feature (instant)

20.3 Database Migration Strategy

  Separate from Code Deployment:
    - [ ] Run migrations BEFORE deploying new code
    - [ ] Migrations must be backward compatible
    - [ ] Test migrations in staging first

  Migration Scripts:
    - [ ] Store in `migrations/` folder with sequential numbering
    - [ ] Use migration tool (pg-migrate, knex, Prisma)
    - [ ] Each migration has UP and DOWN script
    - [ ] Test DOWN script (rollback) in staging

  Zero-Downtime Change Pattern (for future schema updates):
    - [ ] Add new columns/tables while keeping existing ones intact.
    - [ ] Deploy code that populates both old and new structures (if coexistence required).
    - [ ] Backfill or transform data in batches with monitoring.
    - [ ] Switch reads to the new structure after validation.
    - [ ] Remove legacy columns only after at least 1 week of stable production.

20.4 Rollback Procedures

  Code Rollback:
    Trigger: Smoke tests fail, error rate spike, critical bug discovered
    Steps:
      1. [ ] Notify team on Slack/Discord
      2. [ ] Switch load balancer to previous version (if blue-green)
      3. [ ] OR: Redeploy previous Git commit/tag
      4. [ ] Verify health check returns 200
      5. [ ] Run smoke tests
      6. [ ] Monitor for 30 minutes
      7. [ ] Document what went wrong

    Time to rollback: 5 minutes (blue-green) or 15 minutes (redeploy)

  Database Rollback:
    Trigger: Migration caused data corruption or critical bug
    Steps:
      1. [ ] STOP: Do not drop old columns yet
      2. [ ] Restore from backup if data loss occurred
      3. [ ] Revert code to use old columns
      4. [ ] Run DOWN migration script
      5. [ ] Verify data integrity

    Prevention: Never drop old columns in same deployment as code change

  Partial Rollback (Feature Flag):
    - [ ] Disable problematic feature via environment variable
    - [ ] Restart services to pick up new config
    - [ ] No code deployment needed

20.5 Deployment Checklist

  Pre-Deployment:
    - [ ] All tests passing (unit, integration, E2E)
    - [ ] Code review approved by 2+ engineers
    - [ ] Staging deployment successful and tested
    - [ ] Database migrations tested in staging
    - [ ] Rollback procedure documented and tested
    - [ ] On-call engineer assigned and aware
    - [ ] Deploy during low-traffic window (if production)

  During Deployment:
    - [ ] Run database migrations first
    - [ ] Deploy code to staging/canary environment
    - [ ] Run smoke tests
    - [ ] Monitor metrics for 15 minutes
    - [ ] Gradually increase traffic (10% → 50% → 100%)
    - [ ] Watch error rates, latency, health checks

  Post-Deployment:
    - [ ] Verify all smoke tests pass
    - [ ] Check monitoring dashboards (no anomalies)
    - [ ] Review logs for errors
    - [ ] Test critical user flows manually
    - [ ] Monitor for 2 hours
    - [ ] Send deployment summary to team

20.6 Emergency Hotfix Procedure

  When to use: Critical production bug (data loss, security breach, complete outage)

  Process:
    1. [ ] Create hotfix branch from production tag
    2. [ ] Implement minimal fix (smallest possible change)
    3. [ ] Test fix in staging
    4. [ ] Deploy directly to production (skip canary if outage)
    5. [ ] Monitor closely for 1 hour
    6. [ ] Merge hotfix back to main branch
    7. [ ] Post-mortem within 24 hours

  Approval: Requires sign-off from engineering lead or on-call manager
