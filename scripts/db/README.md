# Win Room v2.0 - Database Migration Guide

## ⚠️ IMPORTANT WARNING
**You are working with a LIVE database. DO NOT run these scripts without careful review!**

## Prerequisites
- PostgreSQL database with existing core schema (subscriptions, users, campaigns, etc.)
- Database user with permissions to create schemas and tables
- Core schema is READ-ONLY - we only create new `wr` schema

## Migration Steps

### 1. Review SQL Files
Before running anything, carefully review each SQL file:
- `01_create_schema.sql` - Creates wr schema
- `02_create_tables.sql` - Creates all wr tables
- `03_create_functions.sql` - Creates helper functions

### 2. Connect to Database
```bash
psql -U your_username -d your_database_name
```

### 3. Run Migrations (IN ORDER)
```sql
-- Step 1: Create schema
\i scripts/db/01_create_schema.sql

-- Step 2: Create tables
\i scripts/db/02_create_tables.sql

-- Step 3: Create functions
\i scripts/db/03_create_functions.sql
```

### 4. Verify Installation
```sql
-- Check schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'wr';

-- Check tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'wr';

-- Check functions
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'wr';
```

### 5. Create Database Roles (Optional but Recommended)
```sql
-- Read-only role for core schema
CREATE ROLE core_ro;
GRANT USAGE ON SCHEMA public TO core_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO core_ro;

-- Read-write role for wr schema
CREATE ROLE wr_rw;
GRANT USAGE ON SCHEMA wr TO wr_rw;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA wr TO wr_rw;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA wr TO wr_rw;
```

## Schema Overview

### Core Schema (READ-ONLY)
- `subscriptions` - Sales data
- `users` - User information
- `campaigns` - Campaign details
- `pipedrive_users` - Pipedrive integration
- `custom_settings` - Settings (including USD/TRY rate)

### WR Schema (READ-WRITE)
- `queue` - Live sales queue
- `claims` - Claim records
- `attribution` - Sales attribution
- `sellers` - Seller identity mapping
- `events` - Events for WebSocket
- `sales_goals` - Global goals
- `personal_goals` - Personal goals
- `objections` - Objection workflow
- `exclusions` - Excluded sales
- `refunds` - Refund tracking
- `subscription_metrics` - Calculated metrics
- `cache_kv` - General cache
- `streak_state` - Streak tracking
- `progress_cache` - Goal progress cache

## Rollback (If Needed)
```sql
-- ⚠️ WARNING: This will delete all wr schema data!
DROP SCHEMA wr CASCADE;
```

## Next Steps
After database setup:
1. Configure `.env` with database credentials
2. Seed initial sellers data
3. Start poller worker to begin syncing
4. Start Socket.IO server for real-time updates
