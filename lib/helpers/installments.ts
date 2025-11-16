// Win Room v2.0 - Installment helper utilities
import { PoolClient } from 'pg';
import { query, queryOne, transaction } from '@/lib/db/connection';
import {
  InstallmentPlan,
  InstallmentPayment,
  InstallmentPaymentStatus,
  InstallmentStatus,
} from '@/lib/types';

interface PlanRow {
  id: number;
  subscription_id: number;
  claim_id: number | null;
  customer_name: string | null;
  customer_email: string | null;
  total_amount: number | null;
  currency: string | null;
  total_installments: number;
  default_interval_days: number | null;
  status: InstallmentStatus;
  next_due_payment_id: number | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  frozen_at: string | null;
  frozen_by: string | null;
  frozen_reason: string | null;
  notes: string | null;
  paid_count?: number | null;
  total_payments?: number | null;
  submitted_count?: number | null;
  overdue_count?: number | null;
}

interface PaymentRow {
  id: number;
  installment_id: number;
  payment_number: number;
  due_date: string;
  amount: number | null;
  status: InstallmentPaymentStatus;
  paid_at: string | null;
  paid_amount: number | null;
  payment_channel: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  tolerance_until: string | null;
  tolerance_reason: string | null;
  tolerance_given_by: string | null;
  created_at: string;
  updated_at: string;
  overdue_days?: number | null;
  tolerance_active?: boolean | null;
}

export const OPEN_PAYMENT_STATUSES: InstallmentPaymentStatus[] = [
  'pending',
  'submitted',
  'overdue',
];

export interface InstallmentPaymentInput {
  payment_number: number;
  due_date: string;
  amount?: number;
  notes?: string;
}

export interface CreateInstallmentPlanInput {
  subscription_id: number;
  claim_id?: number;
  customer_name?: string;
  customer_email?: string;
  total_amount?: number;
  currency?: string;
  total_installments: number;
  default_interval_days?: number;
  payments: InstallmentPaymentInput[];
  notes?: string;
}

export interface InstallmentListFilters {
  status?: InstallmentStatus | 'review_needed' | 'overdue' | 'tolerance' | 'upcoming';
  subscription_id?: number;
  claim_id?: number;
  search?: string;
  limit?: number;
}

function mapPlanRow(row: PlanRow): InstallmentPlan {
  return {
    id: row.id,
    subscription_id: row.subscription_id,
    claim_id: row.claim_id ?? undefined,
    customer_name: row.customer_name ?? undefined,
    customer_email: row.customer_email ?? undefined,
    total_amount: row.total_amount ?? undefined,
    currency: row.currency ?? undefined,
    total_installments: row.total_installments,
    default_interval_days: row.default_interval_days ?? undefined,
    status: row.status,
    next_due_payment_id: row.next_due_payment_id ?? undefined,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    frozen_at: row.frozen_at ?? undefined,
    frozen_by: row.frozen_by ?? undefined,
    frozen_reason: row.frozen_reason ?? undefined,
    notes: row.notes ?? undefined,
    paid_count: typeof row.paid_count === 'number' ? row.paid_count : undefined,
    total_payments: typeof row.total_payments === 'number' ? row.total_payments : undefined,
    submitted_count: typeof row.submitted_count === 'number' ? row.submitted_count : undefined,
    overdue_count: typeof row.overdue_count === 'number' ? row.overdue_count : undefined,
  };
}

function mapPaymentRow(row: PaymentRow): InstallmentPayment {
  return {
    id: row.id,
    installment_id: row.installment_id,
    payment_number: row.payment_number,
    due_date: row.due_date,
    amount: row.amount ?? undefined,
    status: row.status,
    paid_at: row.paid_at ?? undefined,
    paid_amount: row.paid_amount ?? undefined,
    payment_channel: row.payment_channel ?? undefined,
    submitted_by: row.submitted_by ?? undefined,
    submitted_at: row.submitted_at ?? undefined,
    confirmed_by: row.confirmed_by ?? undefined,
    confirmed_at: row.confirmed_at ?? undefined,
    rejection_reason: row.rejection_reason ?? undefined,
    notes: row.notes ?? undefined,
    tolerance_until: row.tolerance_until ?? undefined,
    tolerance_reason: row.tolerance_reason ?? undefined,
    tolerance_given_by: row.tolerance_given_by ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    overdue_days: typeof row.overdue_days === 'number' ? row.overdue_days : undefined,
    tolerance_active: typeof row.tolerance_active === 'boolean' ? row.tolerance_active : undefined,
  };
}

export async function getInstallmentPlan(planId: number): Promise<InstallmentPlan | null> {
  const planRow = await queryOne<PlanRow>(
    `SELECT * FROM wr.installments WHERE id = $1`,
    [planId]
  );

  if (!planRow) return null;

  const plan = mapPlanRow(planRow);
  plan.payments = await getInstallmentPayments(planId);
  return plan;
}

export async function getInstallmentPayments(planId: number): Promise<InstallmentPayment[]> {
  const payments = await query<PaymentRow>(
    `SELECT
        ip.*,
        v.overdue_days,
        v.tolerance_active
     FROM wr.installment_payments ip
     LEFT JOIN wr.v_installment_payment_status v
       ON v.payment_id = ip.id
     WHERE ip.installment_id = $1
     ORDER BY payment_number ASC`,
    [planId]
  );

  return payments.map(mapPaymentRow);
}

export async function listInstallmentPlans(filters: InstallmentListFilters = {}): Promise<InstallmentPlan[]> {
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (filters.status) {
    if (['active','completed','frozen','cancelled'].includes(filters.status)) {
      params.push(filters.status);
      clauses.push(`i.status = $${params.length}`);
    } else if (filters.status === 'review_needed') {
      clauses.push(`EXISTS (
        SELECT 1 FROM wr.installment_payments ipp
        WHERE ipp.installment_id = i.id
          AND ipp.status = 'submitted'
      )`);
    } else if (filters.status === 'overdue') {
      clauses.push(`EXISTS (
        SELECT 1 FROM wr.installment_payments ipp
        WHERE ipp.installment_id = i.id
          AND ipp.status IN ('pending','overdue')
          AND ipp.due_date < CURRENT_DATE
          AND (ipp.tolerance_until IS NULL OR ipp.tolerance_until < CURRENT_DATE)
      )`);
    } else if (filters.status === 'tolerance') {
      clauses.push(`EXISTS (
        SELECT 1 FROM wr.installment_payments ipp
        WHERE ipp.installment_id = i.id
          AND ipp.tolerance_until IS NOT NULL
          AND ipp.tolerance_until >= CURRENT_DATE
      )`);
    } else if (filters.status === 'upcoming') {
      clauses.push(`EXISTS (
        SELECT 1 FROM wr.installment_payments ipp
        WHERE ipp.installment_id = i.id
          AND ipp.status IN ('pending','submitted')
          AND ipp.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      )`);
    }
  }

  if (filters.subscription_id) {
    params.push(filters.subscription_id);
    clauses.push(`i.subscription_id = $${params.length}`);
  }

  if (filters.claim_id) {
    params.push(filters.claim_id);
    clauses.push(`i.claim_id = $${params.length}`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    clauses.push(`(i.customer_name ILIKE $${params.length} OR i.customer_email ILIKE $${params.length})`);
  }

  let baseQuery = `SELECT 
      i.*,
      (SELECT COUNT(*) FROM wr.installment_payments ip WHERE ip.installment_id = i.id AND ip.status IN ('confirmed','waived')) AS paid_count,
      (SELECT COUNT(*) FROM wr.installment_payments ip WHERE ip.installment_id = i.id) AS total_payments,
      (SELECT COUNT(*) FROM wr.installment_payments ip WHERE ip.installment_id = i.id AND ip.status = 'submitted') AS submitted_count,
      (SELECT COUNT(*) FROM wr.installment_payments ip WHERE ip.installment_id = i.id AND ip.status IN ('pending','overdue') AND ip.due_date < CURRENT_DATE AND (ip.tolerance_until IS NULL OR ip.tolerance_until < CURRENT_DATE)) AS overdue_count
    FROM wr.installments i`;
  if (clauses.length > 0) {
    baseQuery += ` WHERE ${clauses.join(' AND ')}`;
  }

  baseQuery += ` ORDER BY i.updated_at DESC`;

  if (filters.limit) {
    params.push(filters.limit);
    baseQuery += ` LIMIT $${params.length}`;
  }

  const rows = await query<PlanRow>(baseQuery, params);
  return rows.map(mapPlanRow);
}

async function ensurePlanDoesNotExist(client: PoolClient, subscriptionId: number) {
    const existing = await client.query(
      `SELECT id FROM wr.installments WHERE subscription_id = $1`,
      [subscriptionId]
    );

    if (existing.rows.length > 0) {
      const error = new Error('INSTALLMENT_PLAN_EXISTS') as Error & { code?: string };
      error.code = 'INSTALLMENT_PLAN_EXISTS';
      throw error;
    }
  }

async function upsertPlanLinks(
  client: PoolClient,
  subscriptionId: number,
  planId: number,
  totalInstallments: number,
  claimId?: number
) {
  await client.query(
    `UPDATE wr.queue
     SET installment_plan_id = $1,
         installment_count = $2
     WHERE subscription_id = $3`,
    [planId, totalInstallments, subscriptionId]
  );

  await client.query(
    `UPDATE wr.claims
     SET installment_plan_id = $1,
         installment_count = $2
     WHERE subscription_id = $3`,
    [planId, totalInstallments, subscriptionId]
  );

  if (claimId) {
    await client.query(
      `UPDATE wr.claims
       SET installment_plan_id = $1,
           installment_count = $2
       WHERE id = $3`,
      [planId, totalInstallments, claimId]
    );
  }
}

async function recalcPlanRollup(client: PoolClient, planId: number) {
  const agg = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'confirmed' OR status = 'waived') AS closed_count,
       COUNT(*) AS total_count,
       COUNT(*) FILTER (WHERE status = ANY($1)) AS open_count,
       (
         SELECT id
         FROM wr.installment_payments
         WHERE installment_id = $2
           AND status = ANY($1)
         ORDER BY due_date ASC, payment_number ASC
         LIMIT 1
       ) AS next_due_payment_id
     FROM wr.installment_payments
     WHERE installment_id = $2`,
    [OPEN_PAYMENT_STATUSES, planId]
  );

  const row = agg.rows[0];
  let newStatus: InstallmentStatus = 'active';
  if (row.open_count === 0) {
    newStatus = 'completed';
  }

  await client.query(
    `UPDATE wr.installments
     SET status = $1,
         next_due_payment_id = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [newStatus, row.next_due_payment_id, planId]
  );
}

export async function createInstallmentPlan(
  payload: CreateInstallmentPlanInput,
  actor: string
): Promise<number> {
  if (!payload.payments || payload.payments.length === 0) {
    throw new Error('INSTALLMENT_PAYMENTS_REQUIRED');
  }

  // Validate payment numbers are sequential from 1 to N
  const paymentNumbers = payload.payments.map(p => p.payment_number).sort((a, b) => a - b);
  for (let i = 0; i < paymentNumbers.length; i++) {
    if (paymentNumbers[i] !== i + 1) {
      throw new Error('PAYMENT_NUMBERS_MUST_BE_SEQUENTIAL');
    }
  }

  const planId = await transaction(async (client) => {
    await ensurePlanDoesNotExist(client, payload.subscription_id);

    const planResult = await client.query(
      `INSERT INTO wr.installments (
        subscription_id,
        claim_id,
        customer_name,
        customer_email,
        total_amount,
        currency,
        total_installments,
        default_interval_days,
        created_by,
        updated_by,
        notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10)
      RETURNING id`,
      [
        payload.subscription_id,
        payload.claim_id || null,
        payload.customer_name || null,
        payload.customer_email || null,
        payload.total_amount || null,
        payload.currency || 'USD',
        payload.total_installments,
        payload.default_interval_days || 30,
        actor,
        payload.notes || null,
      ]
    );

    const planId = planResult.rows[0].id as number;

    for (const payment of payload.payments) {
      await client.query(
        `INSERT INTO wr.installment_payments (
           installment_id,
           payment_number,
           due_date,
           amount,
           notes
         ) VALUES ($1,$2,$3,$4,$5)`,
        [
          planId,
          payment.payment_number,
          payment.due_date,
          payment.amount || null,
          payment.notes || null,
        ]
      );
    }

    await upsertPlanLinks(
      client,
      payload.subscription_id,
      planId,
      payload.total_installments,
      payload.claim_id
    );

    await client.query(
      `INSERT INTO wr.installment_actions (installment_id, action_type, actor, notes, metadata)
       VALUES ($1, 'created', $2, $3, $4)`,
      [
        planId,
        actor,
        payload.notes || null,
        JSON.stringify({
          payments: payload.payments.length,
          total_installments: payload.total_installments,
        }),
      ]
    );

    await recalcPlanRollup(client, planId);

    await client.query(
      `INSERT INTO wr.events (type, subscription_id, actor, payload)
       VALUES ('installment.created', $1, $2, $3)`,
      [
        payload.subscription_id,
        actor,
        JSON.stringify({ plan_id: planId, total_installments: payload.total_installments }),
      ]
    );

    return planId;
  });

  return planId;
}

/**
 * Verifies that a payment belongs to the given seller (for sales reps)
 * SECURITY: This function prevents unauthorized access to payments
 * @throws Error if payment not found or seller doesn't own it
 */
async function assertPaymentOwnership(paymentId: number, sellerId: string) {
  const payment = await queryOne<{
    installment_id: number;
    subscription_id: number;
    status: string;
    paid_amount: number | null;
    payment_channel: string | null;
  }>(
    `SELECT ip.installment_id, i.subscription_id, ip.status, ip.paid_amount, ip.payment_channel
     FROM wr.installment_payments ip
     JOIN wr.installments i ON i.id = ip.installment_id
     JOIN wr.attribution a ON a.subscription_id = i.subscription_id
     WHERE ip.id = $1 AND a.closer_seller_id = $2`,
    [paymentId, sellerId]
  );

  if (!payment) {
    throw new Error('PAYMENT_NOT_FOUND_OR_ACCESS_DENIED');
  }

  return payment;
}

/**
 * Gets payment info for admin/finance operations (no ownership check)
 * @throws Error if payment not found
 */
async function getPaymentForAdmin(paymentId: number) {
  const payment = await queryOne<{
    installment_id: number;
    subscription_id: number;
    status: string;
    paid_amount: number | null;
    payment_channel: string | null;
  }>(
    `SELECT ip.installment_id, i.subscription_id, ip.status, ip.paid_amount, ip.payment_channel
     FROM wr.installment_payments ip
     JOIN wr.installments i ON i.id = ip.installment_id
     WHERE ip.id = $1`,
    [paymentId]
  );

  if (!payment) {
    throw new Error('PAYMENT_NOT_FOUND');
  }

  return payment;
}

export async function submitInstallmentPayment(
  paymentId: number,
  actor: string,
  payload: { paid_amount?: number; payment_channel?: string; notes?: string }
) {
  await transaction(async (client) => {
    const payment = await assertPaymentOwnership(paymentId, actor);

    // Check if plan is active (not frozen/cancelled)
    const plan = await client.query<{ status: string }>(
      `SELECT status FROM wr.installments WHERE id = $1`,
      [payment.installment_id]
    );
    if (plan.rows[0]?.status !== 'active') {
      throw new Error(`PLAN_${plan.rows[0]?.status.toUpperCase()}_CANNOT_SUBMIT`);
    }

    await client.query(
      `UPDATE wr.installment_payments
       SET status = 'submitted',
           submitted_by = $1,
           submitted_at = NOW(),
           paid_amount = COALESCE($2, paid_amount),
           payment_channel = COALESCE($3, payment_channel),
           notes = COALESCE($4, notes),
           updated_at = NOW()
       WHERE id = $5`,
      [
        actor,
        payload.paid_amount || null,
        payload.payment_channel || null,
        payload.notes || null,
        paymentId,
      ]
    );

    await client.query(
      `INSERT INTO wr.installment_actions (installment_id, payment_id, action_type, actor, metadata)
       VALUES ($1, $2, 'submit_payment', $3, $4)`,
      [
        payment.installment_id,
        paymentId,
        actor,
        JSON.stringify({
          paid_amount: payload.paid_amount,
          payment_channel: payload.payment_channel,
        }),
      ]
    );

    await recalcPlanRollup(client, payment.installment_id);
  });
}

export async function confirmInstallmentPayment(
  paymentId: number,
  actor: string,
  payload: { paid_amount?: number; payment_channel?: string }
) {
  await transaction(async (client) => {
    // Admin/finance can confirm any payment
    const payment = await getPaymentForAdmin(paymentId);

    // Check if plan is active (not frozen/cancelled)
    const plan = await client.query<{ status: string }>(
      `SELECT status FROM wr.installments WHERE id = $1`,
      [payment.installment_id]
    );
    if (plan.rows[0]?.status !== 'active') {
      throw new Error(`PLAN_${plan.rows[0]?.status.toUpperCase()}_CANNOT_CONFIRM`);
    }

    await client.query(
      `UPDATE wr.installment_payments
       SET status = 'confirmed',
           paid_at = NOW(),
           paid_amount = COALESCE($1, paid_amount),
           payment_channel = COALESCE($2, payment_channel),
           confirmed_by = $3,
           confirmed_at = NOW(),
           updated_at = NOW()
       WHERE id = $4`,
      [payload.paid_amount || payment.paid_amount || null, payload.payment_channel || payment.payment_channel || null, actor, paymentId]
    );

    await client.query(
      `INSERT INTO wr.installment_actions (installment_id, payment_id, action_type, actor, metadata)
       VALUES ($1, $2, 'confirm_payment', $3, $4)`,
      [
        payment.installment_id,
        paymentId,
        actor,
        JSON.stringify({
          paid_amount: payload.paid_amount ?? payment.paid_amount,
          payment_channel: payload.payment_channel ?? payment.payment_channel,
        }),
      ]
    );

    await recalcPlanRollup(client, payment.installment_id);
  });
}

export async function rejectInstallmentPayment(
  paymentId: number,
  actor: string,
  reason: string
) {
  await transaction(async (client) => {
    // Admin/finance can reject any payment
    const payment = await getPaymentForAdmin(paymentId);

    // Check if plan is active (not frozen/cancelled)
    const plan = await client.query<{ status: string }>(
      `SELECT status FROM wr.installments WHERE id = $1`,
      [payment.installment_id]
    );
    if (plan.rows[0]?.status !== 'active') {
      throw new Error(`PLAN_${plan.rows[0]?.status.toUpperCase()}_CANNOT_REJECT`);
    }

    await client.query(
      `UPDATE wr.installment_payments
       SET status = 'rejected',
           confirmed_by = $1,
           confirmed_at = NOW(),
           rejection_reason = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [actor, reason || 'Finance review rejected', paymentId]
    );

    await client.query(
      `INSERT INTO wr.installment_actions (installment_id, payment_id, action_type, actor, notes, metadata)
       VALUES ($1, $2, 'reject_payment', $3, $4, $5)`,
      [
        payment.installment_id,
        paymentId,
        actor,
        reason,
        JSON.stringify({ previous_status: payment.status }),
      ]
    );

    await recalcPlanRollup(client, payment.installment_id);
  });
}

export async function addToleranceToPayment(
  paymentId: number,
  actor: string,
  payload: { tolerance_until: string; tolerance_reason: string }
) {
  await transaction(async (client) => {
    // Admin/finance can add tolerance to any payment
    const payment = await getPaymentForAdmin(paymentId);

    // Check if plan is active (not frozen/cancelled)
    const plan = await client.query<{ status: string }>(
      `SELECT status FROM wr.installments WHERE id = $1`,
      [payment.installment_id]
    );
    if (plan.rows[0]?.status !== 'active') {
      throw new Error(`PLAN_${plan.rows[0]?.status.toUpperCase()}_CANNOT_ADD_TOLERANCE`);
    }

    await client.query(
      `UPDATE wr.installment_payments
       SET tolerance_until = $1,
           tolerance_reason = $2,
           tolerance_given_by = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [payload.tolerance_until, payload.tolerance_reason, actor, paymentId]
    );

    await client.query(
      `INSERT INTO wr.installment_actions (installment_id, payment_id, action_type, actor, notes, metadata)
       VALUES ($1, $2, 'add_tolerance', $3, $4, $5)`,
      [
        payment.installment_id,
        paymentId,
        actor,
        payload.tolerance_reason,
        JSON.stringify({ tolerance_until: payload.tolerance_until }),
      ]
    );

    await recalcPlanRollup(client, payment.installment_id);
  });
}

export async function updatePaymentNotes(
  paymentId: number,
  actor: string,
  note: string
) {
  await transaction(async (client) => {
    // Admin/finance can update notes on any payment
    const payment = await getPaymentForAdmin(paymentId);

    await client.query(
      `UPDATE wr.installment_payments
       SET notes = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [note, paymentId]
    );

    await client.query(
      `INSERT INTO wr.installment_actions (installment_id, payment_id, action_type, actor, notes)
       VALUES ($1, $2, 'update_note', $3, $4)`,
      [payment.installment_id, paymentId, actor, note]
    );
  });
}

export async function freezeInstallmentPlan(
  planId: number,
  actor: string,
  reason?: string
) {
  await transaction(async (client) => {
    await client.query(
      `UPDATE wr.installments
       SET status = 'frozen',
           frozen_at = NOW(),
           frozen_by = $1,
           frozen_reason = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [actor, reason || null, planId]
    );

    await client.query(
      `INSERT INTO wr.installment_actions (installment_id, action_type, actor, notes)
       VALUES ($1, 'freeze', $2, $3)`,
      [planId, actor, reason || null]
    );
  });
}

export async function unfreezeInstallmentPlan(planId: number, actor: string) {
  await transaction(async (client) => {
    await client.query(
      `UPDATE wr.installments
       SET status = 'active',
           frozen_at = NULL,
           frozen_by = NULL,
           frozen_reason = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [planId]
    );

    await client.query(
      `INSERT INTO wr.installment_actions (installment_id, action_type, actor)
       VALUES ($1, 'unfreeze', $2)`,
      [planId, actor]
    );
  });
}

export async function cancelInstallmentPlan(
  planId: number,
  actor: string,
  reason?: string
) {
  await transaction(async (client) => {
    await client.query(
      `UPDATE wr.installments
       SET status = 'cancelled',
           updated_at = NOW(),
           updated_by = $1,
           notes = COALESCE(notes, '') || '\nCancelled: ' || $2
       WHERE id = $3`,
      [actor, reason || null, planId]
    );

    await client.query(
      `INSERT INTO wr.installment_actions (installment_id, action_type, actor, notes)
       VALUES ($1, 'cancel', $2, $3)`,
      [planId, actor, reason || null]
    );
  });
}

/**
 * Marks overdue payments as 'overdue' status
 * This should be run daily via cron job
 * @returns Number of payments marked as overdue
 */
export async function markOverduePayments(): Promise<number> {
  try {
    const result = await query<{ count: number }>(
      `UPDATE wr.installment_payments
       SET status = 'overdue',
           updated_at = NOW()
       WHERE status = 'pending'
         AND due_date < CURRENT_DATE
         AND (tolerance_until IS NULL OR tolerance_until < CURRENT_DATE)
       RETURNING id`
    );

    const count = result.length;

    if (count > 0) {
      console.log(`[Installments] Marked ${count} payment(s) as overdue`);
    }

    return count;
  } catch (error) {
    console.error('[Installments] Error marking overdue payments:', error);
    throw error;
  }
}
