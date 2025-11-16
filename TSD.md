TSD - Win Room v2.0 (Privacy-first, Claim Types, Objections, Personal Goals, Margin)

Version: 2.0
Date: 2025-10-24
Owner: Product + Eng

1) Purpose and Principles

Purpose: To establish an instant, gamified, transparent and fair sales room.

Privacy:

Users see their own sales as numbers.

They see others' sales only through ranking and bar length. No percentages or numbers.

Revenue visibility:

Total revenue is not shown in team view.

Daily/15-day/monthly goals are shown only as percentages.

Transparent attribution:

Claim is mandatory. Who took which sale is clear.

Pipedrive data is used for suggestions and assists.

Core isolation:

Core tables are not modified. All gamification is kept in "wr" schema.

Read from core, write to wr.

2) Role Permissions

Sales:

Own sales: amount, margin percentage and margin amount (only for themselves).

Others: bar-only view, no numbers and percentages.

Claim, create objection, view own goal.

Sales Lead:

Same as Sales, with team filters added. Bar-only rule applies.

Admin/Finance:

All goal and objection management, exclusion/restore, reassign, refund marking.

Access to all details including margin and revenue amounts.

System:

Collects data from core with Poller Worker, processes in wr, broadcasts via WS.

3) Architecture

Frontend: Next.js 14, Tailwind dark theme, Framer Motion, Howler, canvas-confetti.

Real-time: Socket.IO server.

Backend: Next.js API routes + Node Poller Worker.

DB:

Core read-only: subscriptions, campaigns, users, pipedrive_users, custom_settings.

wr read-write: queue, claims, attribution, events, goals, personal goals, objections, exclusions, refunds, sellers, cache_kv, metrics etc.

Deploy:

Node runtime for WebSocket (VM/k8s). If using Vercel, WS hosted separately.

4) Data Model - wr schema

Note: All new structures go to wr without touching core schema.

4.1) wr.queue - live queue
create table if not exists wr.queue (
  id bigserial primary key,
  subscription_id bigint not null unique,
  user_id bigint not null,                       -- subscriptions.user_id
  source_created_at timestamptz not null,        -- subscriptions.created_at
  status text not null check (status in ('pending','claimed','excluded','expired','refunded')),
  fingerprint text null,                         -- duplicate/reopen detection
  created_at timestamptz not null default now(),
  excluded_by text null,
  excluded_at timestamptz null,
  exclude_reason text null                       -- 'reopen','test','dup','fraud','other'
);
create index on wr.queue(status);
create index on wr.queue(created_at);

4.2) wr.claims - claim records
create table if not exists wr.claims (
  id bigserial primary key,
  subscription_id bigint not null unique,
  claimed_by text not null,                      -- panel display name or seller_id
  claim_type text not null check (claim_type in ('first_sales','remarketing','upgrade','installment')),
  claimed_at timestamptz not null default now(),
  attribution_source text not null default 'claim'  -- 'claim'|'auto'|'admin'
);
create index on wr.claims(claimed_by);
create index on wr.claims(claimed_at);

4.3) wr.attribution - who got credited
create table if not exists wr.attribution (
  subscription_id bigint primary key,
  closer_seller_id text not null,                -- wr.sellers.seller_id
  resolved_from text not null,                   -- 'claim'|'pipedrive_owner'|'core_sales_person'|'created_by'|'manual'
  resolved_at timestamptz not null default now(),
  assisted_seller_id text null
);

4.4) wr.sellers - identity mapping
create table if not exists wr.sellers (
  seller_id text primary key,                    -- stable slug
  display_name text not null,
  pipedrive_owner_id bigint null,
  core_sales_person text null,
  email text null,
  is_active boolean default true
);
create unique index if not exists wr_sellers_owner_uidx on wr.sellers(pipedrive_owner_id) where pipedrive_owner_id is not null;
create index if not exists wr_sellers_core_idx on wr.sellers(core_sales_person);

4.5) wr.events - events to be broadcast
create table if not exists wr.events (
  id bigserial primary key,
  type text not null,                            -- 'queue.new','claimed','streak','jackpot','goal.progress','queue.excluded','refund.applied','objection.created','objection.resolved'
  subscription_id bigint null,
  actor text null,
  payload jsonb null,
  created_at timestamptz not null default now()
);
create index on wr.events(created_at);
create index on wr.events(type);

4.6) wr.sales_goals - general goals (day, 15d, month)
create table if not exists wr.sales_goals (
  id bigserial primary key,
  period_type text check (period_type in ('day','15d','month')) not null,
  period_start date not null,
  period_end date not null,
  target_type text check (target_type in ('count','points','revenue')) not null,
  target_value numeric not null,
  visibility_scope text check (visibility_scope in ('admin_only','sales_percent_only')) default 'sales_percent_only',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on wr.sales_goals(period_start, period_end);

4.7) wr.personal_goals - personal goals
create table if not exists wr.personal_goals (
  id bigserial primary key,
  seller_id text not null references wr.sellers(seller_id) on update cascade,
  period_type text check (period_type in ('day','15d','month')) not null,
  period_start date not null,
  period_end date not null,
  target_type text check (target_type in ('count','points','revenue','margin_amount')) not null,
  target_value numeric not null,
  visibility_scope text check (visibility_scope in ('owner_only','admin_only')) default 'owner_only',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on wr.personal_goals(seller_id, period_start, period_end);

4.8) wr.progress_cache - percentage cache
create table if not exists wr.progress_cache (
  goal_scope text not null,                      -- 'global'|'personal'
  goal_id bigint not null,
  as_of_date date not null,
  percent numeric not null,                      -- 0..1
  updated_at timestamptz not null default now(),
  primary key (goal_scope, goal_id, as_of_date)
);

4.9) wr.objections - objection flow
create table if not exists wr.objections (
  id bigserial primary key,
  subscription_id bigint not null,
  raised_by text not null,                       -- seller_id or display
  reason text not null,                          -- 'wrong_owner','duplicate','refund','other'
  details text null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  admin_note text null,
  created_at timestamptz default now(),
  resolved_at timestamptz null
);
create index on wr.objections(subscription_id);
create index on wr.objections(status);

4.10) wr.exclusions and wr.refunds - management records

Used exactly as in v1.2. (Existing DDL applies.)

4.11) wr.streak_state - global consecutive state

Used exactly as in v1.2. (Existing DDL applies.)

4.12) wr.cache_kv - general purpose cache
create table if not exists wr.cache_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  ttl_seconds int not null default 86400         -- default 1 day
);

4.13) wr.subscription_metrics - calculated metrics
create table if not exists wr.subscription_metrics (
  subscription_id bigint primary key,
  revenue_usd numeric null,                      -- subs_amount converted to USD
  cost_usd numeric null,                         -- campaign cost
  margin_amount_usd numeric null,
  margin_percent numeric null,                   -- 0..1
  is_jackpot boolean not null default false,
  computed_at timestamptz not null default now(),
  currency_source text not null,                 -- 'TRY','USD','other'
  notes text null
);
create index on wr.subscription_metrics(computed_at);

5) Calculation Rules
5.1) USD rate

Source: core.custom_settings table, name="dolar", value = TRY per 1 USD.

Daily cache:

wr.cache_kv.key = "usd_try_rate"

value: like {"rate": 42}

ttl: 86400 sec

Function:

create or replace function wr_get_usd_try_rate() returns numeric
language plpgsql as $$
declare r numeric;
begin
  select (value->>'rate')::numeric into r
  from wr.cache_kv
  where key = 'usd_try_rate' and extract(epoch from (now()-updated_at)) < ttl_seconds
  limit 1;

  if r is not null then
    return r;
  end if;

  -- cache miss: read from core.custom_settings
  select (value::numeric) into r
  from custom_settings
  where name = 'dolar'
  order by updated_at desc nulls last
  limit 1;

  if r is null then
    -- safe default, optional env override
    r := 42;
  end if;

  insert into wr.cache_kv(key, value, ttl_seconds, updated_at)
  values ('usd_try_rate', jsonb_build_object('rate', r), 86400, now())
  on conflict (key) do update
    set value = excluded.value, updated_at = now(), ttl_seconds = excluded.ttl_seconds;

  return r;
end;
$$;

5.2) Revenue USD

subs_amount and subscriptions.currency are used.

Supported currencies: "USD" and "TRY".

Conversion:

If currency = "USD" -> revenue_usd = subs_amount.

If currency = "TRY" or "TR" -> revenue_usd = subs_amount / wr_get_usd_try_rate().

If others are seen, note and generate events "currency.unknown" for admin review (optional).

5.3) Cost USD

From campaigns:

lesson fee USD: 25 min = 5, 50 min = 10. Table for other durations:

20 min -> 4, 40 min -> 8 (optional). For now support 25 and 50.

cost_usd = campaign_lenght * per_week * 4 * lesson_price_usd.

Join:

subscriptions.campaign_id -> campaigns.id.

5.4) Margin

margin_amount_usd = max(revenue_usd - cost_usd, 0).

margin_percent = case when revenue_usd > 0 then margin_amount_usd / revenue_usd else 0 end.

5.5) Jackpot

Threshold: Sales over 30000 TRY.

Check on USD side: threshold_usd = 30000 / wr_get_usd_try_rate().

Conditions:

is_free = 0

payment_channel != "Hediye"

status appropriate (e.g. 'paid','active'). If "waiting" notify but don't count jackpot.

5.6) Time-to-sale

tts = subscriptions.created_at - users.created_at

Displayed on card as "TTS: 2d 4h".

5.7) Statistics Dates

**IMPORTANT**: All statistics (leaderboard, metrics, stats) are calculated based on **queue creation date** (wr.queue.created_at).

Logic:
- Lead is counted by the date it entered the queue
- Claim date (wr.attribution.resolved_at) is used for ordering
- Reporting: queue.created_at filters
- UI: Both dates are shown (queue + claim date)

Reason:
- Lead entry date to system is more meaningful
- Late claimed leads fall into the correct period
- Real performance is measured by lead creation time

Example:
- Lead entering queue on Nov 5 → counts in Nov 5 statistics even if claimed on Nov 7

6) Data Flow - Poller Worker

Interval: 2 sec.

Flow:

subscriptions where updated_at > last_checkpoint order by updated_at asc limit 500.

Generate fingerprint:

sha256(user_id + campaign_id + date_trunc('hour', created_at) + coalesce(stripe_sub_id,'') + coalesce(paypal_sub_id,''))

Duplicate/reopen rule:

If same fingerprint repeats in short window, wr.queue "excluded" and wr.exclusions record.

wr.queue insert pending.

Calculate cost_usd with campaigns join, revenue_usd with currency, margin, wr.subscription_metrics upsert.

Check jackpot -> wr.events "jackpot".

Refund detection -> wr.refunds upsert, wr.queue.status="refunded", wr.events "refund.applied".

Find owner_id with pipedrive_users, map with wr.sellers, wr.attribution assisted_seller_id can be set (suggested if no claim).

Update checkpoint.

7) Claim and Streak

POST /api/claim:

Body: { subscription_id, claimed_by, claim_type }

Operation:

wr.claims insert, validate claim_type.

wr.attribution upsert closer_seller_id = mapSeller(claimed_by), resolved_from='claim'.

wr.queue status 'claimed'.

wr.events broadcast "claimed".

wr.streak_state update:

If same claimer count += 1, else 1.

When reaches 3, wr.events "streak" payload {"threshold":3,"claimer":...}.

8) Goals
8.1) Global goals

wr.sales_goals - progress only percentage.

Daily progress for "revenue" type, backend calculates net revenue_usd from subscriptions - refunds and broadcasts percentage. Sales UI sees only percentage.

8.2) Personal goals

wr.personal_goals - visible owner_only.

Progress:

count: number of claims.

revenue: own revenue_usd total - refunds.

margin_amount: own margin_amount_usd total.

API returns single scope for logged-in seller_id.

9) Objection Flow

Sales POST /api/objections:

Body: { subscription_id, reason, details }

wr.objections insert, wr.events "objection.created".

Admin PATCH /api/admin/objections/:id:

Accept:

One of the actions:
a) Reassign: change wr.attribution.closer_seller_id, update wr.claims.claimed_by.
b) Exclude: wr.queue.status "excluded", delete or soft delete wr.claims if needed.
c) Refund: wr.refunds upsert.

wr.events "objection.resolved".

Reject: status "rejected", set admin_note.

10) API Design

Auth: JWT + role. Rate limit: 60 rpm, claim 10 rpm.

Sales UI:

GET /api/queue?limit=50

Returns: pending rows. Fields: subscription_id, user_id, tts, claim_suggested_seller, margin_percent, status.

Note: margin_percent can be visible to everyone, but revenue/cost fields are not returned.

POST /api/claim

Body: { subscription_id, claimed_by, claim_type }

GET /api/me/metrics?period=today|15d|month

Returns: { wins, revenue_usd, margin_amount_usd, avg_margin_percent } - only to logged-in user.

GET /api/leaderboard/wins?period=...

Returns: bar-only data structure:
[{ seller_id, rank, bar_value_norm, you?: boolean }]

Contains no numeric value or percentage.

GET /api/leaderboard/margin?period=...

Same, bar-only. For admin, query param "detailed=true" can add numbers.

GET /api/goals/progress

Global percentages.

GET /api/me/goals

Personal goal and percentage.

POST /api/objections

Body: { subscription_id, reason, details }

Admin:

GET/POST /api/admin/goals

GET/POST /api/admin/personal-goals

POST /api/admin/queue/exclude

POST /api/admin/queue/restore

POST /api/admin/reassign

PATCH /api/admin/objections/:id

GET /api/admin/metrics/subscription/:id (detail - revenue_usd, cost_usd, margin etc.)

WebSocket events:

queue.new, claimed, streak, jackpot, goal.progress, queue.excluded, refund.applied, objection.created, objection.resolved.

11) UI - Privacy and Visual Behavior

Live Queue:

Card: ID, channel badge, status, TTS, Suggested seller, margin_percent badge, Claim button.

After claim, card slides away with animation.

Leaderboard - Wins:

Only rank and bar length. Small "you" label on own bar and own numbers can be shown in tooltip.

Leaderboard - Margin:

Bar-only same rule. For self, margin_amount_usd can be shown in tooltip.

Daily Goal:

Progress bar only percentage + status label.

Personal Panel:

"My wins", "My revenue USD", "My margin USD", "My avg margin %" cards - visible only for user.

Objection modal:

Reason field - "wrong_owner","duplicate","refund","other".

Theme: Dark - bg #0A0A0A, surface #121212, border #2A2A2A, accent #22C55E.

12) Security

Sales endpoints never return revenue or margin_amount numbers belonging to others.

wr.subscription_metrics returned comprehensively only in admin endpoints; in sales endpoints only margin_percent can be returned.

Separate DB roles:

core_ro: SELECT on core tables.

wr_rw: R/W on wr schema.

PII and financial value masking in logs.

CSRF and rate limit active.

13) Test Plan

Privacy:

Sales user A doesn't see numeric values in user B's sales. API payload check.

Claim:

Concurrency - one of two claim attempts for same subscription gets 409.

claim_type validation.

Streak:

Same claimer 3 consecutive -> "streak" event.

Jackpot:

Correct triggering by converting TRY 30000 threshold to USD.

Goals:

Global percentage - decreases after refunds.

Personal goals visible only to owner.

Margin:

cost_usd formula calculated correctly with campaign fields.

revenue_usd conversion correct with USD/TRY.

margin leaderboard follows bar-only rule.

Objections:

Create -> pending -> accepted with reassign/exclude/refund -> events broadcast.

Cache:

wr_get_usd_try_rate daily cache behavior - doesn't read DB on second call same day.

14) Acceptance Criteria

Sales user sees their own sales as numbers; for others doesn't see numbers and percentages, only sees bar and rank.

Claim cannot be completed without selecting sale type on claim screen.

Objection flow can be finalized in admin and results reflect in leaderboard and queue.

Global goals show only percentage.

Personal goals visible only to owner.

Margin calculated for each subscription, margin_percent shown on card.

Margin-based leaderboard works; privacy rules preserved.

USD rate taken from custom_settings.name="dolar" value and cached for one day.

Jackpot correctly triggered at TRY 30000 threshold.

No DDL changes in core schema.

15) Sample SQL - Cost and Margin Calculation
-- lesson price USD
with c as (
  select s.id as subscription_id,
         s.campaign_id,
         s.subs_amount::numeric as amount_raw,
         upper(coalesce(s.currency,'TRY')) as ccy,
         s.status,
         s.is_free,
         s.payment_channel,
         s.created_at as sub_created_at,
         u.created_at as user_created_at,
         cmp.campaign_lenght,
         cmp.per_week,
         cmp.campaign_minute
  from subscriptions s
  join users u on u.id = s.user_id
  join campaigns cmp on cmp.id = s.campaign_id
  where s.id = $1
),
rate as (
  select wr_get_usd_try_rate() as usd_try
),
calc as (
  select
    c.subscription_id,
    case
      when c.campaign_minute = 25 then 5
      when c.campaign_minute = 50 then 10
      else 5 -- default
    end as lesson_price_usd,
    (c.campaign_lenght * c.per_week * 4) as total_lessons,
    case c.campaign_lenght
      when 1 then 1
      when 3 then 0.9
      when 6 then 0.8
      when 12 then 0.7
      else 0.7
    end as margin_multiplier,
    case when c.ccy = 'USD' then c.amount_raw
         when c.ccy in ('TRY','TR') then c.amount_raw / (select usd_try from rate)
         else null end as revenue_usd
  from c
)
select
  subscription_id,
  (total_lessons * lesson_price_usd * margin_multiplier) as cost_usd,
  revenue_usd,
  greatest(coalesce(revenue_usd,0) - (total_lessons * lesson_price_usd * margin_multiplier), 0) as margin_amount_usd,
  case when coalesce(revenue_usd,0) > 0
       then greatest(coalesce(revenue_usd,0) - (total_lessons * lesson_price_usd * margin_multiplier), 0) / revenue_usd
       else 0 end as margin_percent
from calc;

16) Bar-only Leaderboard Response Example
[
  { "seller_id": "merve", "rank": 1, "bar_value_norm": 1.0, "you": true },
  { "seller_id": "sait", "rank": 2, "bar_value_norm": 0.72 },
  { "seller_id": "ali", "rank": 3, "bar_value_norm": 0.55 }
]


"bar_value_norm" normalized value between 0..1. Contains no numeric amount or percentage.

User can see their own row as number on hover. No numbers on hover for others.

17) UI Tips

Show margin_percent badge on queue card in green tones.

Claim modal:

Options: first_sales, remarketing, upgrade, installment.

On confirm claim sfx, streak check.

Jackpot event:

Large top banner 3 sec, special sfx.

No numbers shown. Only "Jackpot" label and name of person who claimed.

Personal dashboard:

Cards: "My wins", "My revenue USD", "My margin USD", "My avg margin %".

Admin screen:

Queue Manager: exclude/restore, reason, note.

Objection Center: pending list, accept/reject, select reassign target.

You are working on a live database. Never, ever perform delete, update etc. operations without getting my approval on the SQL code you will run on the database!
