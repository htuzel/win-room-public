TSD - Win Room v2.0 (Privacy-first, Claim Types, Objections, Personal Goals, Margin)

Sürüm: 2.0
Tarih: 2025-10-24
Sahip: Product + Eng

1) Amaç ve İlkeler

Amaç: Anlık, oyunlaştırılmış, şeffaf ve adil bir satış odası kurmak.

Gizlilik:

Kullanıcı kendi satışlarını rakam olarak görür.

Başkalarının satışlarını yalnız sıralama ve bar uzunluğu ile görür. Yüzde veya sayı yok.

Ciro görünürlüğü:

Toplam ciro ekip görünümünde yok.

Günlük/15gün/ay hedefleri yalnız yüzde olarak gösterilir.

Şeffaf atıf:

Claim zorunlu. Kim hangi satışı aldı net.

Pipedrive verileri öneri ve assist için kullanılır.

Core izolasyonu:

Core tablolar değişmez. Tüm oyunlaştırma "wr" şemasında tutulur.

Core’dan okur, wr’ye yazarız.

2) Rollerin Yetkileri

Sales:

Kendi satışları: miktar, marj yüzdesi ve marj tutarı (yalnız kendisi için).

Diğerleri: bar-only görünüm, sayı ve yüzde yok.

Claim, itiraz oluşturma, kendi hedefini görme.

Sales Lead:

Sales ile aynı, ekip filtreleri eklenir. Bar-only kuralı geçerli.

Admin/Finance:

Tüm hedef ve itiraz yönetimi, exclusion/restore, reassign, refund işaretleme.

Marj ve gelir tutarları dahil tüm detaylara erişim.

System:

Poller Worker ile core’dan veri toplar, wr’de işler, WS ile yayınlar.

3) Mimari

Frontend: Next.js 14, Tailwind dark theme, Framer Motion, Howler, canvas-confetti.

Real-time: Socket.IO server.

Backend: Next.js API routes + Node Poller Worker.

DB:

Core read-only: subscriptions, campaigns, users, pipedrive_users, custom_settings.

wr read-write: queue, claims, attribution, events, goals, personal goals, objections, exclusions, refunds, sellers, cache_kv, metrics vb.

Deploy:

WebSocket için Node runtime (VM/k8s). Vercel kullanılıyorsa WS ayrı host.

4) Veri Modeli - wr şeması

Not: Core şemaya dokunmadan tüm yeni yapılar wr’ye.

4.1) wr.queue - canlı yığın
create table if not exists wr.queue (
  id bigserial primary key,
  subscription_id bigint not null unique,
  user_id bigint not null,                       -- subscriptions.user_id
  source_created_at timestamptz not null,        -- subscriptions.created_at
  status text not null check (status in ('pending','claimed','excluded','expired','refunded')),
  fingerprint text null,                         -- duplicate/reopen tespiti
  created_at timestamptz not null default now(),
  excluded_by text null,
  excluded_at timestamptz null,
  exclude_reason text null                       -- 'reopen','test','dup','fraud','other'
);
create index on wr.queue(status);
create index on wr.queue(created_at);

4.2) wr.claims - claim kayıtları
create table if not exists wr.claims (
  id bigserial primary key,
  subscription_id bigint not null unique,
  claimed_by text not null,                      -- panel görünen adı veya seller_id
  claim_type text not null check (claim_type in ('first_sales','remarketing','upgrade','installment')),
  claimed_at timestamptz not null default now(),
  attribution_source text not null default 'claim'  -- 'claim'|'auto'|'admin'
);
create index on wr.claims(claimed_by);
create index on wr.claims(claimed_at);

4.3) wr.attribution - kime yazıldı
create table if not exists wr.attribution (
  subscription_id bigint primary key,
  closer_seller_id text not null,                -- wr.sellers.seller_id
  resolved_from text not null,                   -- 'claim'|'pipedrive_owner'|'core_sales_person'|'created_by'|'manual'
  resolved_at timestamptz not null default now(),
  assisted_seller_id text null
);

4.4) wr.sellers - kimlik eşleme
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

4.5) wr.events - yayınlanacak olaylar
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

4.6) wr.sales_goals - genel hedefler (day, 15d, month)
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

4.7) wr.personal_goals - kişisel hedefler
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

4.8) wr.progress_cache - yüzde cache
create table if not exists wr.progress_cache (
  goal_scope text not null,                      -- 'global'|'personal'
  goal_id bigint not null,
  as_of_date date not null,
  percent numeric not null,                      -- 0..1
  updated_at timestamptz not null default now(),
  primary key (goal_scope, goal_id, as_of_date)
);

4.9) wr.objections - itiraz akışı
create table if not exists wr.objections (
  id bigserial primary key,
  subscription_id bigint not null,
  raised_by text not null,                       -- seller_id veya display
  reason text not null,                          -- 'wrong_owner','duplicate','refund','other'
  details text null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  admin_note text null,
  created_at timestamptz default now(),
  resolved_at timestamptz null
);
create index on wr.objections(subscription_id);
create index on wr.objections(status);

4.10) wr.exclusions ve wr.refunds - yönetim kayıtları

Aynen v1.2’deki gibi kullanılır. (Mevcut DDL geçerlidir.)

4.11) wr.streak_state - global üst üste state

Aynen v1.2’deki gibi kullanılır. (Mevcut DDL geçerlidir.)

4.12) wr.cache_kv - genel amaçlı cache
create table if not exists wr.cache_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  ttl_seconds int not null default 86400         -- varsayılan 1 gün
);

4.13) wr.subscription_metrics - hesaplanan metrikler
create table if not exists wr.subscription_metrics (
  subscription_id bigint primary key,
  revenue_usd numeric null,                      -- subs_amount USD'e çevrilmiş
  cost_usd numeric null,                         -- kampanya maliyeti
  margin_amount_usd numeric null,
  margin_percent numeric null,                   -- 0..1
  is_jackpot boolean not null default false,
  computed_at timestamptz not null default now(),
  currency_source text not null,                 -- 'TRY','USD','other'
  notes text null
);
create index on wr.subscription_metrics(computed_at);

5) Hesaplama Kuralları
5.1) USD kuru

Kaynak: core.custom_settings tablosu, name="dolar", value = TRY per 1 USD.

Günlük cache:

wr.cache_kv.key = "usd_try_rate"

value: {"rate": 42} gibi

ttl: 86400 sn

Fonksiyon:

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

  -- cache miss: core.custom_settings'tan oku
  select (value::numeric) into r
  from custom_settings
  where name = 'dolar'
  order by updated_at desc nulls last
  limit 1;

  if r is null then
    -- güvenli varsayılan, opsiyonel env override
    r := 42;
  end if;

  insert into wr.cache_kv(key, value, ttl_seconds, updated_at)
  values ('usd_try_rate', jsonb_build_object('rate', r), 86400, now())
  on conflict (key) do update
    set value = excluded.value, updated_at = now(), ttl_seconds = excluded.ttl_seconds;

  return r;
end;
$$;

5.2) Gelir USD

subs_amount ve subscriptions.currency kullanılır.

Desteklenen para birimleri: "USD" ve "TRY".

Dönüşüm:

Eğer currency = "USD" -> revenue_usd = subs_amount.

Eğer currency = "TRY" veya "TR" -> revenue_usd = subs_amount / wr_get_usd_try_rate().

Diğerleri görülürse not düş ve admin incelemesi için events "currency.unknown" üret (opsiyonel).

5.3) Maliyet USD

campaigns üzerinden:

ders ücreti USD: 25 dk = 5, 50 dk = 10. Diğer süreler için tablo:

20 dk -> 4, 40 dk -> 8 (opsiyonel). Şimdilik 25 ve 50 destek.

cost_usd = campaign_lenght * per_week * 4 * lesson_price_usd.

Join:

subscriptions.campaign_id -> campaigns.id.

5.4) Marj

margin_amount_usd = max(revenue_usd - cost_usd, 0).

margin_percent = case when revenue_usd > 0 then margin_amount_usd / revenue_usd else 0 end.

5.5) Jackpot

Eşik: 30000 TRY üzeri satışlar.

Kontrol USD tarafında: threshold_usd = 30000 / wr_get_usd_try_rate().

Şartlar:

is_free = 0

payment_channel != "Hediye"

status uygun (örn. 'paid','active'). "waiting" ise bilgilendirme ama jackpot sayma.

5.6) Time-to-sale

tts = subscriptions.created_at - users.created_at

Kartta "TTS: 2g 4s" şeklinde gösterilir.

5.7) İstatistik Tarihleri

**ÖNEMLİ**: Tüm istatistikler (leaderboard, metrics, stats) **queue creation date** (wr.queue.created_at) üzerinden hesaplanır.

Mantık:
- Lead kuyruğa girdiği tarihe göre sayılır
- Claim tarihi (wr.attribution.resolved_at) sıralama için kullanılır
- Raporlama: queue.created_at filtreler
- UI: Her iki tarih de gösterilir (queue + claim date)

Sebep:
- Lead'in sisteme girdiği tarih daha anlamlı
- Geç claim edilen leadler doğru periyoda düşer
- Gerçek performans lead creation zamanına göre ölçülür

Örnek:
- 5 Kasım'da kuyruğa giren lead → 7 Kasım'da claim edilse bile 5 Kasım istatistiklerine sayılır

6) Veri Akışı - Poller Worker

Aralık: 2 sn.

Akış:

subscriptions where updated_at > last_checkpoint order by updated_at asc limit 500.

fingerprint üret:

sha256(user_id + campaign_id + date_trunc('hour', created_at) + coalesce(stripe_sub_id,'') + coalesce(paypal_sub_id,''))

Duplicate/reopen kuralı:

Kısa pencerede aynı fingerprint tekrar ise wr.queue "excluded" ve wr.exclusions kaydı.

wr.queue insert pending.

campaigns join ile cost_usd, currency ile revenue_usd, marj hesapla, wr.subscription_metrics upsert.

Jackpot kontrol et -> wr.events "jackpot".

Refund tespiti -> wr.refunds upsert, wr.queue.status="refunded", wr.events "refund.applied".

pipedrive_users ile owner_id bul, wr.sellers ile eşle, wr.attribution assisted_seller_id set edilebilir (claim yoksa suggested).

Checkpoint güncelle.

7) Claim ve Streak

POST /api/claim:

Body: { subscription_id, claimed_by, claim_type }

İşlem:

wr.claims insert, claim_type doğrula.

wr.attribution upsert closer_seller_id = mapSeller(claimed_by), resolved_from='claim'.

wr.queue status 'claimed'.

wr.events "claimed" yayınla.

wr.streak_state güncelle:

Aynı claimer ise count += 1, değilse 1.

3 olduğunda wr.events "streak" payload {"threshold":3,"claimer":...}.

8) Hedefler
8.1) Global hedefler

wr.sales_goals - progress yalnız yüzde.

Daily progress "revenue" tipi için backend net revenue_usd from subscriptions - refunds ile hesaplar ve yüzde yayınlar. Sales UI yalnız yüzde görür.

8.2) Kişisel hedefler

wr.personal_goals - owner_only görünür.

Progress:

count: claim sayısı.

revenue: kendi revenue_usd toplamı - refunds.

margin_amount: kendi margin_amount_usd toplamı.

API, giriş yapan seller_id için tek scope döndürür.

9) İtiraz Akışı

Sales POST /api/objections:

Body: { subscription_id, reason, details }

wr.objections insert, wr.events "objection.created".

Admin PATCH /api/admin/objections/:id:

Accept:

Aksiyonlardan biri:
a) Reassign: wr.attribution.closer_seller_id değiştir, wr.claims.claimed_by güncelle.
b) Exclude: wr.queue.status "excluded", gerekirse wr.claims sil veya soft delete.
c) Refund: wr.refunds upsert.

wr.events "objection.resolved".

Reject: status "rejected", admin_note set.

10) API Tasarımı

Auth: JWT + role. Rate limit: 60 rpm, claim 10 rpm.

Sales UI:

GET /api/queue?limit=50

Döner: pending satırlar. Alanlar: subscription_id, user_id, tts, claim_suggested_seller, margin_percent, status.

Not: margin_percent herkes için görünebilir, ancak revenue/cost alanları dönmez.

POST /api/claim

Body: { subscription_id, claimed_by, claim_type }

GET /api/me/metrics?period=today|15d|month

Döner: { wins, revenue_usd, margin_amount_usd, avg_margin_percent } - sadece giriş yapan kullanıcıya.

GET /api/leaderboard/wins?period=...

Döner: bar-only veri yapısı:;
[{ seller_id, rank, bar_value_norm, you?: boolean }]

Numeric value ve yüzde içermez.

GET /api/leaderboard/margin?period=...

Aynı, bar-only. Admin için query param "detailed=true" ile sayılar eklenebilir.

GET /api/goals/progress

Global yüzdeler.

GET /api/me/goals

Kişisel hedef ve yüzde.

POST /api/objections

Body: { subscription_id, reason, details }

Admin:

GET/POST /api/admin/goals

GET/POST /api/admin/personal-goals

POST /api/admin/queue/exclude

POST /api/admin/queue/restore

POST /api/admin/reassign

PATCH /api/admin/objections/:id

GET /api/admin/metrics/subscription/:id (detay - revenue_usd, cost_usd, margin vs.)

WebSocket event’leri:

queue.new, claimed, streak, jackpot, goal.progress, queue.excluded, refund.applied, objection.created, objection.resolved.

11) UI - Gizlilik ve Görsel Davranış

Live Queue:

Kart: ID, channel badge, status, TTS, Suggested seller, margin_percent badge, Claim butonu.

Claim sonrası kart animasyonla kayar.

Leaderboard - Wins:

Sadece rank ve bar uzunluğu. Kendi barının üzerinde küçük "you" etiketi ve tooltip ile kendi sayıları gösterilebilir.

Leaderboard - Margin:

Bar-only aynı kural. Kendi için tooltipte margin_amount_usd gösterilebilir.

Daily Goal:

Progress bar yalnız yüzde + durum etiketi.

Kişisel Panel:

"My wins", "My revenue USD", "My margin USD", "My avg margin %" kartları - sadece user için görünür.

Objection modali:

Gerekçe alanı - "wrong_owner","duplicate","refund","other".

Tema: Dark - bg #0A0A0A, surface #121212, border #2A2A2A, accent #22C55E.

12) Güvenlik

Sales uçlarında hiçbir yerde başkasına ait revenue veya margin_amount sayısı dönmez.

wr.subscription_metrics yalnız admin uçlarında kapsamlı döndürülür; sales uçlarında yalnız margin_percent dönebilir.

Ayrı DB rolleri:

core_ro: core tablolara SELECT.

wr_rw: wr şemasına R/W.

Loglarda PII ve finansal değer maskeleme.

CSRF ve rate limit aktif.

13) Test Planı

Gizlilik:

Sales kullanıcı A, kullanıcı B’nin satışlarında numeric değer görmüyor. API payload kontrolü.

Claim:

Concurrency - aynı subscription için iki claim denemesinde biri 409.

claim_type doğrulama.

Streak:

Aynı claimer 3 üst üste -> "streak" event.

Jackpot:

TRY 30000 eşiğini USD e çevirerek doğru tetikleme.

Goals:

Global yüzde - refunds sonrası düşüyor.

Personal goals yalnız owner’a görünüyor.

Margin:

cost_usd formülü kampanya alanlarıyla doğru hesaplanıyor.

revenue_usd dönüşüm USD/TRY ile doğru.

margin leaderboard bar-only kuralına uyuyor.

Objections:

Create -> pending -> accepted with reassign/exclude/refund -> events yayınlanıyor.

Cache:

wr_get_usd_try_rate günlük cache davranışı - aynı gün ikinci çağrıda DB okumuyor.

14) Kabul Kriterleri

Sales kullanıcı, kendi satışlarını rakam olarak görür; başkaları için sayı ve yüzde görmez, yalnız bar ve rank görür.

Claim ekranında satış türü seçilmeden claim tamamlanamaz.

İtiraz akışı admin’de sonuçlandırılabilir ve sonuçlar leaderboard ve queue’ya yansır.

Global hedefler yalnız yüzde gösterir.

Kişisel hedefler yalnız owner’a görünür.

Marj her subscription için hesaplanır, kartta margin_percent gösterilir.

Marj bazlı leaderboard çalışır; gizlilik kuralları korunur.

USD kuru custom_settings.name="dolar" değerinden alınıp bir gün cache’lenir.

Jackpot TRY 30000 eşiğinde doğru tetiklenir.

Core şemada DDL değişikliği yoktur.

15) Örnek SQL - Maliyet ve Marj Hesabı
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

16) Bar-only Leaderboard Response Örneği
[
  { "seller_id": "merve", "rank": 1, "bar_value_norm": 1.0, "you": true },
  { "seller_id": "sait", "rank": 2, "bar_value_norm": 0.72 },
  { "seller_id": "ali", "rank": 3, "bar_value_norm": 0.55 }
]


"bar_value_norm" 0..1 arası normalize değer. Numeric tutar veya yüzde içermez.

Kullanıcı kendi satırını hover’da rakam olarak görebilir. Diğerleri için hover da rakam yok.

17) UI İpuçları

Queue kartında margin_percent rozetini yeşil tonlarda göster.

Claim modal:

Seçenekler: first_sales, remarketing, upgrade, installment.

Onaylandığında claim sfx, streak kontrolü.

Jackpot event:

Büyük üst banner 3 sn, özel sfx.

Rakam gösterme yok. Sadece "Jackpot" etiketi ve claim eden kişi adı.

Personal dashboard:

Cards: "My wins", "My revenue USD", "My margin USD", "My avg margin %".

Admin ekranı:

Queue Manager: exclude/restore, reason, not.

Objection Center: pending list, accept/reject, reassign hedefi seç.

Canlı veritabanında çalışıyorsun. Sakın ama sakın, veritabanında benden çalıştıracağın SQL kodu konusunda onay almadan silme, update vs. işlemi yapma!
