// Win Room v2.0 - Poller Worker
// This service polls the core subscriptions table and syncs to wr schema
import 'dotenv/config';

// For development with DigitalOcean managed databases (self-signed certs)
if (process.env.NODE_ENV !== 'production' && process.env.DATABASE_URL?.includes('digitalocean.com')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import { getPool, query, queryOne } from '../../lib/db/connection';
import { insertAchievement } from '../../lib/db/achievements';
import { calculateMetrics, generateFingerprint } from '../../lib/helpers/metrics';
import { markOverduePayments } from '../../lib/helpers/installments';
import {
  DAILY_REVENUE_MILESTONE,
  PERSONAL_GOAL_META,
  PERSONAL_REVENUE_MILESTONES,
  TEAM_GOAL_META,
  TEAM_REVENUE_MILESTONES,
} from '../../lib/constants/achievements';

const POLL_INTERVAL_MS = parseInt(process.env.POLLER_INTERVAL_MS || '2000');
const BATCH_SIZE = parseInt(process.env.POLLER_BATCH_SIZE || '500');
const TEAM_REVENUE_CHECK_INTERVAL_MINUTES = Math.max(
  1,
  parseInt(process.env.TEAM_REVENUE_CHECK_INTERVAL_MINUTES || '15', 10) || 15
);
const PERSONAL_REVENUE_CHECK_INTERVAL_MINUTES = Math.max(
  1,
  parseInt(process.env.PERSONAL_REVENUE_CHECK_INTERVAL_MINUTES || '15', 10) || 15
);

let isRunning = false;
let lastCheckpoint: string | null = null;
let lastOverdueCheck: string | null = null;
let lastLeadAssignmentSync: string | null = null;
let lastProgressCacheUpdate: string | null = null;
let lastTeamRevenueCheck: string | null = null;
let lastPersonalRevenueCheck: string | null = null;
let teamRevenueAchievementState: {
  date: string;
  highest: number;
} = {
  date: '',
  highest: 0,
};

/**
 * Initialize checkpoint from cache or start from now
 */
async function initializeCheckpoint() {
  const cached = await queryOne<{ value: any }>(
    `SELECT value FROM wr.cache_kv WHERE key = 'poller_checkpoint'`
  );

  if (cached && cached.value?.timestamp) {
    lastCheckpoint = cached.value.timestamp;
    console.log('[Poller] Resuming from checkpoint:', lastCheckpoint);
  } else {
    lastCheckpoint = new Date().toISOString();
    console.log('[Poller] Starting fresh from:', lastCheckpoint);
  }

  // Initialize overdue check timestamp
  const overdueCache = await queryOne<{ value: any }>(
    `SELECT value FROM wr.cache_kv WHERE key = 'last_overdue_check'`
  );

  if (overdueCache && overdueCache.value?.timestamp) {
    lastOverdueCheck = overdueCache.value.timestamp;
    console.log('[Poller] Last overdue check:', lastOverdueCheck);
  } else {
    lastOverdueCheck = new Date().toISOString();
    console.log('[Poller] No previous overdue check found');
  }

  // Initialize lead assignment sync checkpoint (default: run within next cycle)
  const leadCache = await queryOne<{ value: any }>(
    `SELECT value FROM wr.cache_kv WHERE key = 'lead_assignments_last_run'`
  );

  if (leadCache && leadCache.value?.timestamp) {
    lastLeadAssignmentSync = leadCache.value.timestamp;
    console.log('[Poller] Lead sync resume from:', lastLeadAssignmentSync);
  } else {
    const initialWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    lastLeadAssignmentSync = initialWindowStart;
    console.log('[Poller] Lead sync initialized at:', lastLeadAssignmentSync);
  }

  // Initialize progress cache update checkpoint
  const progressCache = await queryOne<{ value: any }>(
    `SELECT value FROM wr.cache_kv WHERE key = 'progress_cache_last_update'`
  );

  if (progressCache && progressCache.value?.timestamp) {
    lastProgressCacheUpdate = progressCache.value.timestamp;
    console.log('[Poller] Progress cache last updated:', lastProgressCacheUpdate);
  } else {
    // Run immediately on first start
    lastProgressCacheUpdate = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    console.log('[Poller] Progress cache initialized, will run on first cycle');
  }

  // Initialize team revenue achievement state
  const teamRevenueCache = await queryOne<{ value: any }>(
    `SELECT value FROM wr.cache_kv WHERE key = 'team_revenue_state'`
  );

  if (teamRevenueCache?.value) {
    const value = teamRevenueCache.value;
    const cacheDate = typeof value.date === 'string' ? value.date : '';
    const cacheHighest = Number.isFinite(value.highest) ? Number(value.highest) : 0;
    teamRevenueAchievementState = {
      date: cacheDate,
      highest: cacheHighest,
    };
    lastTeamRevenueCheck = typeof value.last_check === 'string' ? value.last_check : null;
    console.log(
      '[Poller] Team revenue cache:',
      JSON.stringify({ date: cacheDate, highest: cacheHighest, lastTeamRevenueCheck })
    );
  } else {
    teamRevenueAchievementState = { date: '', highest: 0 };
    lastTeamRevenueCheck = null;
    console.log('[Poller] No team revenue cache found; will initialize on first check');
  }
}

/**
 * Update checkpoint in cache
 */
async function updateCheckpoint(newCheckpoint: string) {
  await query(
    `INSERT INTO wr.cache_kv (key, value, ttl_seconds)
     VALUES ('poller_checkpoint', $1, 86400)
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify({ timestamp: newCheckpoint })]
  );
  lastCheckpoint = newCheckpoint;
}

/**
 * Process a single subscription
 */
async function processSubscription(subs: any) {
  try {
    // Generate fingerprint for duplicate detection
    const fingerprint = generateFingerprint({
      user_id: subs.user_id,
      campaign_id: subs.campaign_id,
      created_at: subs.created_at,
      stripe_sub_id: subs.stripe_sub_id,
      paypal_sub_id: subs.paypal_sub_id,
    });

    const checkpointMs = lastCheckpoint ? Date.parse(lastCheckpoint) : NaN;
    const createdMs = subs.created_at ? Date.parse(subs.created_at) : NaN;
    const hasValidCheckpoint = Number.isFinite(checkpointMs);
    const hasValidCreated = Number.isFinite(createdMs);
    const isNewSubscription =
      hasValidCreated && hasValidCheckpoint ? createdMs > checkpointMs : true;
    const isTrialCampaign = Number(subs.campaign_id) === 65;

    if (isNewSubscription && !isTrialCampaign) {
      // Check for duplicate in recent window (last 24 hours)
      const recentDuplicate = await queryOne<{ id: number }>(
        `SELECT id FROM wr.queue
         WHERE fingerprint = $1
           AND subscription_id <> $2
           AND created_at > NOW() - INTERVAL '24 hours'
         LIMIT 1`,
        [fingerprint, subs.id]
      );

      if (recentDuplicate) {
        console.log(`[Poller] Duplicate detected for subscription ${subs.id}, excluding`);

        await query(
          `INSERT INTO wr.queue (subscription_id, user_id, source_created_at, status, fingerprint, excluded_by, excluded_at, exclude_reason)
           VALUES ($1, $2, $3, 'excluded', $4, 'system', NOW(), 'duplicate')
           ON CONFLICT (subscription_id) DO NOTHING`,
          [subs.id, subs.user_id, subs.created_at, fingerprint]
        );

        await query(
          `INSERT INTO wr.exclusions (subscription_id, reason, excluded_by, notes)
           VALUES ($1, 'duplicate', 'system', $2)`,
          [subs.id, `Duplicate fingerprint: ${fingerprint}`]
        );

        return;
      }
    }

    // Refund handling is manual via admin workflows; poller does not auto-mark refunds.

    // Calculate metrics
    const metrics = await calculateMetrics({
      subscription_id: subs.id,
      subs_amount: parseFloat(subs.subs_amount || '0'),
      currency: subs.currency || 'TRY',
      campaign_lenght: subs.campaign_lenght || 0,
      per_week: subs.per_week || 0,
      campaign_minute: subs.campaign_minute || 25,
      is_free: subs.is_free || 0,
      payment_channel: subs.payment_channel || '',
      status: subs.status || '',
    });

    // Upsert subscription_metrics
    await query(
      `INSERT INTO wr.subscription_metrics
       (subscription_id, revenue_usd, cost_usd, margin_amount_usd, margin_percent, is_jackpot, currency_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (subscription_id) DO UPDATE
       SET revenue_usd = EXCLUDED.revenue_usd,
           cost_usd = EXCLUDED.cost_usd,
           margin_amount_usd = EXCLUDED.margin_amount_usd,
           margin_percent = EXCLUDED.margin_percent,
           is_jackpot = EXCLUDED.is_jackpot,
           currency_source = EXCLUDED.currency_source,
           computed_at = NOW()`,
      [
        subs.id,
        metrics.revenue_usd,
        metrics.cost_usd,
        metrics.margin_amount_usd,
        metrics.margin_percent,
        metrics.is_jackpot,
        metrics.currency_source,
      ]
    );

    if (isNewSubscription && !isTrialCampaign) {
      const queueInsert = await query(
        `INSERT INTO wr.queue (subscription_id, user_id, source_created_at, status, fingerprint)
         VALUES ($1, $2, $3, 'pending', $4)
         ON CONFLICT (subscription_id) DO NOTHING
         RETURNING id`,
        [subs.id, subs.user_id, subs.created_at, fingerprint]
      );

      if (queueInsert.length > 0) {
        console.log(`[Poller] Queued subscription ${subs.id}`);

        await query(
          `INSERT INTO wr.events (type, subscription_id, payload)
           VALUES ('queue.new', $1, $2)`,
          [subs.id, JSON.stringify({ margin_percent: metrics.margin_percent })]
        );

        if (metrics.is_jackpot) {
          console.log(`[Poller] 🎰 JACKPOT! Subscription ${subs.id}`);

          const jackpotRows = await query<{ id: number }>(
            `INSERT INTO wr.events (type, subscription_id, payload)
             VALUES ('jackpot', $1, $2)
             RETURNING id`,
            [subs.id, JSON.stringify({ revenue_usd: metrics.revenue_usd })]
          );

          await insertAchievement({
            eventId: jackpotRows[0]?.id || null,
            type: 'jackpot',
            sellerId: null,
            title: 'Jackpot',
            description: `Yüksek paket satışı: #${subs.id}`,
            payload: { revenue_usd: metrics.revenue_usd },
            dedupeKey: jackpotRows[0]?.id ? `event:${jackpotRows[0].id}` : `jackpot:${subs.id}`,
          });
        }
      } else {
        console.log(`[Poller] Subscription ${subs.id} already present in queue, skipping event emission`);
      }
    } else if (isTrialCampaign) {
      console.log(`[Poller] Subscription ${subs.id} is trial campaign (65); skipping Live Queue.`);
    } else {
      console.log(`[Poller] Subscription ${subs.id} updated since last poll; metrics refreshed, queue unchanged.`);
    }

    console.log(`[Poller] ✓ Processed subscription ${subs.id}`);
  } catch (error) {
    console.error(`[Poller] Error processing subscription ${subs.id}:`, error);
  }
}

/**
 * Aggregate daily lead assignments (runs daily)
 */
async function syncLeadAssignments() {
  try {
    if (!lastLeadAssignmentSync) return;

    const now = new Date();
    const lastSync = new Date(lastLeadAssignmentSync);
    const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastSync < 24) {
      return;
    }

    console.log('[LeadSync] Aggregating Pipedrive lead assignments...');

    const windowStart = lastSync.toISOString();
    const windowEnd = now.toISOString();

    const inserted = await query(
      `INSERT INTO wr.lead_assignments_daily (assignment_date, pipedrive_owner_id, seller_id, lead_count)
       SELECT
         DATE_TRUNC('day', u.created_at)::date AS assignment_date,
         pd.owner_id,
         s.seller_id,
         COUNT(*) AS lead_count
       FROM pipedrive_definitions pd
       JOIN users u ON u.id = pd.user_id
       LEFT JOIN wr.sellers s ON s.pipedrive_owner_id = pd.owner_id
       WHERE u.created_at >= $1::timestamptz
         AND u.created_at < $2::timestamptz
       GROUP BY assignment_date, pd.owner_id, s.seller_id
       ON CONFLICT (assignment_date, pipedrive_owner_id)
       DO UPDATE SET
         lead_count = EXCLUDED.lead_count,
         seller_id = COALESCE(EXCLUDED.seller_id, wr.lead_assignments_daily.seller_id),
         updated_at = NOW()
       RETURNING 1`,
      [windowStart, windowEnd]
    );

    // Backfill seller_id for rows that previously lacked an owner match
    await query(
      `UPDATE wr.lead_assignments_daily lad
       SET seller_id = s.seller_id,
           updated_at = NOW()
       FROM wr.sellers s
       WHERE lad.seller_id IS NULL
         AND s.pipedrive_owner_id = lad.pipedrive_owner_id`
    );

    const newCheckpoint = now.toISOString();
    await query(
      `INSERT INTO wr.cache_kv (key, value, ttl_seconds)
       VALUES ('lead_assignments_last_run', $1, 86400 * 7)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify({ timestamp: newCheckpoint })]
    );

    lastLeadAssignmentSync = newCheckpoint;
    console.log(
      `[LeadSync] ✓ Aggregated leads for window ${windowStart} → ${windowEnd} (${inserted.length} owner bucket(s))`
    );
  } catch (error) {
    console.error('[LeadSync] Error aggregating lead assignments:', error);
  }
}

/**
 * Check and mark overdue payments (runs daily)
 */
async function checkOverduePayments() {
  try {
    if (!lastOverdueCheck) {
      console.log('[Overdue] No last check timestamp, skipping');
      return;
    }

    const now = new Date();
    const lastCheck = new Date(lastOverdueCheck);
    const hoursSinceLastCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60);

    // Run once per day (24 hours)
    if (hoursSinceLastCheck < 24) {
      return;
    }

    console.log('[Overdue] Running daily overdue payment check...');
    const count = await markOverduePayments();

    // Update cache
    const newCheckpoint = now.toISOString();
    await query(
      `INSERT INTO wr.cache_kv (key, value, ttl_seconds)
       VALUES ('last_overdue_check', $1, 86400 * 7)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify({ timestamp: newCheckpoint })]
    );

    lastOverdueCheck = newCheckpoint;
    console.log(`[Overdue] ✓ Marked ${count} payment(s) as overdue. Next check in 24 hours.`);
  } catch (error) {
    console.error('[Overdue] Error checking overdue payments:', error);
  }
}

/**
 * Check team revenue milestones and emit achievements (runs every few minutes)
 */
async function checkTeamRevenueAchievements() {
  try {
    const now = new Date();

    if (lastTeamRevenueCheck) {
      const lastCheckDate = new Date(lastTeamRevenueCheck);
      if (!Number.isNaN(lastCheckDate.getTime())) {
        const minutesSinceLastCheck = (now.getTime() - lastCheckDate.getTime()) / (1000 * 60);
        if (minutesSinceLastCheck < TEAM_REVENUE_CHECK_INTERVAL_MINUTES) {
          return;
        }
      }
    }

    const today = now.toISOString().split('T')[0];
    const result = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(sm.revenue_usd), 0) AS total
       FROM wr.claims c
       JOIN wr.subscription_metrics sm ON sm.subscription_id = c.subscription_id
       WHERE c.claimed_at >= $1::date
         AND c.claimed_at < ($1::date + INTERVAL '1 day')`,
      [today]
    );

    const totalRevenue = parseFloat(result?.total || '0') || 0;
    let highestAwarded =
      teamRevenueAchievementState.date === today ? teamRevenueAchievementState.highest : 0;
    let stateChanged = teamRevenueAchievementState.date !== today;

    if (stateChanged) {
      highestAwarded = 0;
    }

    for (const milestone of TEAM_REVENUE_MILESTONES) {
      if (totalRevenue >= milestone.threshold && highestAwarded < milestone.threshold) {
        console.log(
          `[TeamRevenue] Threshold ${milestone.threshold} reached (total=${totalRevenue.toFixed(
            2
          )}). Emitting ${milestone.type} achievement.`
        );
        await insertAchievement({
          type: milestone.type,
          sellerId: null,
          title: milestone.title,
          description: milestone.description,
          payload: {
            totalRevenue,
            threshold: milestone.threshold,
            celebration: {
              variant: milestone.celebrationVariant,
              sound: milestone.sound,
              title: milestone.title,
              subtitle: milestone.celebrationSubtitle,
            },
          },
          dedupeKey: `team_revenue:${milestone.threshold}:${today}`,
        });
        highestAwarded = milestone.threshold;
        stateChanged = true;
      }
    }

    teamRevenueAchievementState = {
      date: today,
      highest: highestAwarded,
    };
    lastTeamRevenueCheck = now.toISOString();

    if (stateChanged) {
      console.log(
        `[TeamRevenue] State updated for ${today}: highest=${highestAwarded}, total=${totalRevenue.toFixed(
          2
        )}.`
      );
    }

    await query(
      `INSERT INTO wr.cache_kv (key, value, ttl_seconds)
       VALUES ('team_revenue_state', $1, 172800)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW()`,
      [
        JSON.stringify({
          date: teamRevenueAchievementState.date,
          highest: teamRevenueAchievementState.highest,
          last_check: lastTeamRevenueCheck,
          total_revenue: totalRevenue,
        }),
      ]
    );
  } catch (error) {
    console.error('[TeamRevenue] Error checking team revenue achievements:', error);
  }
}

/**
 * Check personal revenue milestones and daily revenue (runs every ~15 minutes)
 */
async function checkPersonalRevenueAchievements() {
  try {
    const now = new Date();

    if (lastPersonalRevenueCheck) {
      const lastCheckDate = new Date(lastPersonalRevenueCheck);
      if (!Number.isNaN(lastCheckDate.getTime())) {
        const minutesSinceLastCheck = (now.getTime() - lastCheckDate.getTime()) / (1000 * 60);
        if (minutesSinceLastCheck < PERSONAL_REVENUE_CHECK_INTERVAL_MINUTES) {
          return;
        }
      }
    }

    const today = now.toISOString().split('T')[0];
    const personalRows = await query<
      { seller_id: string; total: string }
    >(
      `SELECT
         c.claimed_by AS seller_id,
         COALESCE(SUM(sm.revenue_usd), 0) AS total
       FROM wr.claims c
       JOIN wr.subscription_metrics sm ON sm.subscription_id = c.subscription_id
       WHERE c.claimed_at >= $1::date
         AND c.claimed_at < ($1::date + INTERVAL '1 day')
         AND c.claimed_by IS NOT NULL
       GROUP BY c.claimed_by`,
      [today]
    );

    let totalRevenue = 0;

    for (const row of personalRows) {
      const sellerId = row.seller_id;
      if (!sellerId) continue;
      const revenue = parseFloat(row.total || '0') || 0;
      totalRevenue += revenue;

      for (const milestone of PERSONAL_REVENUE_MILESTONES) {
        if (revenue >= milestone.threshold) {
          await insertAchievement({
            type: milestone.type,
            sellerId,
            title: milestone.title,
            description: milestone.description,
            payload: {
              revenue,
              threshold: milestone.threshold,
              celebration: {
                variant: milestone.celebrationVariant,
                sound: milestone.sound,
                title: milestone.title,
                subtitle: milestone.celebrationSubtitle,
              },
            },
            dedupeKey: `personal_revenue:${sellerId}:${milestone.threshold}:${today}`,
          });
        }
      }
    }

    if (totalRevenue >= DAILY_REVENUE_MILESTONE.threshold) {
      await insertAchievement({
        type: DAILY_REVENUE_MILESTONE.type,
        sellerId: null,
        title: DAILY_REVENUE_MILESTONE.title,
        description: DAILY_REVENUE_MILESTONE.description,
        payload: {
          totalRevenue,
          threshold: DAILY_REVENUE_MILESTONE.threshold,
          celebration: {
            variant: DAILY_REVENUE_MILESTONE.celebrationVariant,
            sound: DAILY_REVENUE_MILESTONE.sound,
            title: DAILY_REVENUE_MILESTONE.title,
            subtitle: DAILY_REVENUE_MILESTONE.celebrationSubtitle,
          },
        },
        dedupeKey: `daily_revenue:${today}`,
      });
    }

    lastPersonalRevenueCheck = now.toISOString();
    console.log(
      `[PersonalRevenue] Checked milestones for ${today}. Total revenue: ${totalRevenue.toFixed(2)}`
    );
  } catch (error) {
    console.error('[PersonalRevenue] Error checking personal revenue achievements:', error);
  }
}

/**
 * Update progress cache for all goals (runs every 15 minutes)
 */
async function updateProgressCache() {
  try {
    if (!lastProgressCacheUpdate) {
      console.log('[ProgressCache] No last update timestamp, skipping');
      return;
    }

    const now = new Date();
    const lastUpdate = new Date(lastProgressCacheUpdate);
    const minutesSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

    // Run every 15 minutes
    if (minutesSinceLastUpdate < 15) {
      return;
    }

    console.log('[ProgressCache] Updating goal progress cache...');

    const today = now.toISOString().split('T')[0];

    // Update global sales goals progress
    const globalGoals = await query<any>(
      `SELECT
         g.id as goal_id,
         g.period_type,
         g.period_start,
         g.period_end,
         g.target_type,
         g.target_value
       FROM wr.sales_goals g
       WHERE g.period_start <= $1::date
         AND g.period_end >= $1::date
         AND g.visibility_scope = 'sales_percent_only'`,
      [today]
    );

    for (const goal of globalGoals) {
      // Calculate current value based on target type
      let currentValue = 0;

      if (goal.target_type === 'revenue') {
        const result = await queryOne<{ total: string }>(
          `SELECT COALESCE(SUM(sm.revenue_usd), 0) as total
           FROM wr.claims c
           JOIN wr.subscription_metrics sm ON sm.subscription_id = c.subscription_id
           WHERE c.claimed_at >= $1::date
             AND c.claimed_at < ($2::date + INTERVAL '1 day')`,
          [goal.period_start, goal.period_end]
        );
        currentValue = parseFloat(result?.total || '0');
      } else if (goal.target_type === 'count') {
        const result = await queryOne<{ total: string }>(
          `SELECT COUNT(*) as total
           FROM wr.claims c
           WHERE c.claimed_at >= $1::date
             AND c.claimed_at < ($2::date + INTERVAL '1 day')`,
          [goal.period_start, goal.period_end]
        );
        currentValue = parseFloat(result?.total || '0');
      } else if (goal.target_type === 'margin_amount') {
        const result = await queryOne<{ total: string }>(
          `SELECT COALESCE(SUM(
             COALESCE(sm.margin_amount_usd, 0) - COALESCE(adj.total_additional_cost_usd, 0)
           ), 0) as total
           FROM wr.claims c
           JOIN wr.subscription_metrics sm ON sm.subscription_id = c.subscription_id
           LEFT JOIN (
             SELECT subscription_id, SUM(additional_cost_usd) as total_additional_cost_usd
             FROM wr.claim_adjustments
             GROUP BY subscription_id
           ) adj ON adj.subscription_id = c.subscription_id
           WHERE c.claimed_at >= $1::date
             AND c.claimed_at < ($2::date + INTERVAL '1 day')`,
          [goal.period_start, goal.period_end]
        );
        currentValue = parseFloat(result?.total || '0');
      }

      const percent = goal.target_value > 0 ? currentValue / goal.target_value : 0;

      await query(
        `INSERT INTO wr.progress_cache (goal_scope, goal_id, as_of_date, percent)
         VALUES ('global', $1, $2::date, $3)
         ON CONFLICT (goal_scope, goal_id, as_of_date)
         DO UPDATE SET percent = EXCLUDED.percent, updated_at = NOW()`,
        [goal.goal_id, today, percent]
      );

      console.log(
        `[ProgressCache] Global goal ${goal.goal_id} (${goal.target_type}): ${(percent * 100).toFixed(1)}% (${currentValue.toFixed(2)} / ${goal.target_value})`
      );

      if (percent >= 1) {
        await insertAchievement({
          type: TEAM_GOAL_META.type,
          sellerId: null,
          title: TEAM_GOAL_META.title,
          description: TEAM_GOAL_META.description,
          payload: {
            goalId: goal.goal_id,
            goalType: goal.target_type,
            currentValue,
            targetValue: goal.target_value,
            periodStart: goal.period_start,
            periodEnd: goal.period_end,
            celebration: {
              variant: TEAM_GOAL_META.celebrationVariant,
              sound: TEAM_GOAL_META.sound,
              title: TEAM_GOAL_META.title,
              subtitle: TEAM_GOAL_META.celebrationSubtitle,
            },
          },
          dedupeKey: `team_goal:${goal.goal_id}:${goal.period_start}:${goal.period_end}`,
        });
      }
    }

    // Update personal goals progress
    const personalGoals = await query<any>(
      `SELECT
         g.id as goal_id,
         g.seller_id,
         g.period_type,
         g.period_start,
         g.period_end,
         g.target_type,
         g.target_value
       FROM wr.personal_goals g
       WHERE g.period_start <= $1::date
         AND g.period_end >= $1::date`,
      [today]
    );

    for (const goal of personalGoals) {
      let currentValue = 0;

      if (goal.target_type === 'revenue') {
        const result = await queryOne<{ total: string }>(
          `SELECT COALESCE(SUM(sm.revenue_usd), 0) as total
           FROM wr.claims c
           JOIN wr.subscription_metrics sm ON sm.subscription_id = c.subscription_id
           WHERE c.claimed_by = $1
             AND c.claimed_at >= $2::date
             AND c.claimed_at < ($3::date + INTERVAL '1 day')`,
          [goal.seller_id, goal.period_start, goal.period_end]
        );
        currentValue = parseFloat(result?.total || '0');
      } else if (goal.target_type === 'count') {
        const result = await queryOne<{ total: string }>(
          `SELECT COUNT(*) as total
           FROM wr.claims c
           WHERE c.claimed_by = $1
             AND c.claimed_at >= $2::date
             AND c.claimed_at < ($3::date + INTERVAL '1 day')`,
          [goal.seller_id, goal.period_start, goal.period_end]
        );
        currentValue = parseFloat(result?.total || '0');
      } else if (goal.target_type === 'margin_amount') {
        const result = await queryOne<{ total: string }>(
          `SELECT COALESCE(SUM(
             COALESCE(sm.margin_amount_usd, 0) - COALESCE(adj.total_additional_cost_usd, 0)
           ), 0) as total
           FROM wr.claims c
           JOIN wr.subscription_metrics sm ON sm.subscription_id = c.subscription_id
           LEFT JOIN (
             SELECT subscription_id, SUM(additional_cost_usd) as total_additional_cost_usd
             FROM wr.claim_adjustments
             GROUP BY subscription_id
           ) adj ON adj.subscription_id = c.subscription_id
           WHERE c.claimed_by = $1
             AND c.claimed_at >= $2::date
             AND c.claimed_at < ($3::date + INTERVAL '1 day')`,
          [goal.seller_id, goal.period_start, goal.period_end]
        );
        currentValue = parseFloat(result?.total || '0');
      }

      const percent = goal.target_value > 0 ? currentValue / goal.target_value : 0;

      await query(
        `INSERT INTO wr.progress_cache (goal_scope, goal_id, as_of_date, percent)
         VALUES ('personal', $1, $2::date, $3)
         ON CONFLICT (goal_scope, goal_id, as_of_date)
         DO UPDATE SET percent = EXCLUDED.percent, updated_at = NOW()`,
        [goal.goal_id, today, percent]
      );

      console.log(
        `[ProgressCache] Personal goal ${goal.goal_id} for ${goal.seller_id} (${goal.target_type}): ${(percent * 100).toFixed(1)}% (${currentValue.toFixed(2)} / ${goal.target_value})`
      );

      if (percent >= 1 && goal.seller_id) {
        await insertAchievement({
          type: PERSONAL_GOAL_META.type,
          sellerId: goal.seller_id,
          title: PERSONAL_GOAL_META.title,
          description: `${goal.seller_id} kişisel hedefini tamamladı.`,
          payload: {
            goalId: goal.goal_id,
            goalType: goal.target_type,
            currentValue,
            targetValue: goal.target_value,
            periodStart: goal.period_start,
            periodEnd: goal.period_end,
            celebration: {
              variant: PERSONAL_GOAL_META.celebrationVariant,
              sound: PERSONAL_GOAL_META.sound,
              title: PERSONAL_GOAL_META.title,
              subtitle: PERSONAL_GOAL_META.celebrationSubtitle,
            },
          },
          dedupeKey: `personal_goal:${goal.goal_id}:${goal.seller_id}:${goal.period_start}:${goal.period_end}`,
        });
      }
    }

    // Update cache timestamp
    const newCheckpoint = now.toISOString();
    await query(
      `INSERT INTO wr.cache_kv (key, value, ttl_seconds)
       VALUES ('progress_cache_last_update', $1, 86400)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify({ timestamp: newCheckpoint })]
    );

    lastProgressCacheUpdate = newCheckpoint;
    console.log(
      `[ProgressCache] ✓ Updated ${globalGoals.length} global goal(s) and ${personalGoals.length} personal goal(s). Next update in 15 minutes.`
    );
  } catch (error) {
    console.error('[ProgressCache] Error updating progress cache:', error);
  }
}

/**
 * Main polling loop
 */
async function poll() {
  if (isRunning) {
    console.log('[Poller] Previous poll still running, skipping...');
    return;
  }

  isRunning = true;

  try {
    // Check for overdue payments (runs once per day)
    await checkOverduePayments();
    await syncLeadAssignments();
    await updateProgressCache();
    await checkTeamRevenueAchievements();
    await checkPersonalRevenueAchievements();

    // Fetch new/updated subscriptions
    const subscriptions = await query<any>(
      `SELECT
         s.id,
         s.user_id,
         s.campaign_id,
         s.created_at,
         s.updated_at,
         s.subs_amount,
         s.currency,
         s.status,
         s.is_free,
         s.payment_channel,
         s.stripe_sub_id,
         s.paypal_sub_id,
         s.sales_person,
         c.campaign_lenght,
         c.per_week,
         c.campaign_minute
       FROM subscriptions s
       LEFT JOIN campaigns c ON c.id = s.campaign_id
       WHERE s.updated_at > $1::timestamptz
       ORDER BY s.updated_at ASC
       LIMIT $2`,
      [lastCheckpoint, BATCH_SIZE]
    );

    console.log(`[Poller] Found ${subscriptions.length} subscription(s) to process`);

    // Process each subscription
    for (const subs of subscriptions) {
      await processSubscription(subs);
    }

    // Update checkpoint to latest updated_at
    if (subscriptions.length > 0) {
      const latestUpdatedAt = subscriptions[subscriptions.length - 1].updated_at;
      await updateCheckpoint(latestUpdatedAt);
      console.log(`[Poller] Checkpoint updated to ${latestUpdatedAt}`);
    }
  } catch (error) {
    console.error('[Poller] Error in poll loop:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the poller worker
 */
async function start() {
  console.log('[Poller] Win Room v2.0 Poller Worker starting...');

  // Initialize DB connection
  getPool();

  // Initialize checkpoint
  await initializeCheckpoint();

  // Start polling interval
  console.log(`[Poller] Polling every ${POLL_INTERVAL_MS}ms`);
  setInterval(poll, POLL_INTERVAL_MS);

  // Run first poll immediately
  poll();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Poller] Shutting down gracefully...');
  const { closePool } = await import('../../lib/db/connection');
  await closePool();
  process.exit(0);
});

// Start the worker
start().catch((error) => {
  console.error('[Poller] Fatal error:', error);
  process.exit(1);
});
