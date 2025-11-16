// Win Room v2.0 - Admin Single Claim Management API
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth/middleware';
import { query, queryOne } from '@/lib/db/connection';

interface RouteParams {
  params: { id: string };
}

// GET single claim details
export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const claimId = parseInt(params.id, 10);
  if (Number.isNaN(claimId)) {
    return NextResponse.json({ error: 'Invalid claim ID' }, { status: 400 });
  }

  try {
    const row = await queryOne<any>(
      `SELECT
         c.id,
         c.subscription_id,
         c.claimed_by,
         c.claim_type,
         c.claimed_at,
         c.attribution_source,
         c.finance_status,
         c.finance_approved_by,
         c.finance_approved_at,
         c.finance_notes,
         c.installment_plan_id,
         c.installment_count,
         s.display_name AS claimer_name,
         s.email AS claimer_email,
         a.closer_seller_id,
         closer.display_name AS closer_name,
         a.assisted_seller_id,
         assisted.display_name AS assisted_name,
         a.resolved_from,
         a.resolved_at,
         a.closer_share_percent,
         a.assisted_share_percent,
         q.created_by AS queue_created_by,
         q.created_at AS queue_created_at,
         (q.created_by IS NOT NULL) AS queue_is_manual,
         queue_creator.display_name AS queue_created_by_name,
         queue_creator.email AS queue_created_by_email,
         u.name AS customer_name,
         u.email AS customer_email,
         subs.payment_channel,
         subs.subs_amount,
         subs.currency,
         subs.sales_person,
         subs.status AS subscription_status,
         subs.custom_note,
       subs.subs_note,
       subs.created_at AS subscription_created_at,
       camp.campaign_name,
       sm.revenue_usd,
       sm.cost_usd,
         sm.margin_percent AS margin_percent,
         sm.margin_amount_usd AS original_margin_usd,
         sm.margin_percent AS original_margin_percent,
         cma.adjusted_margin_usd,
         cma.adjusted_margin_percent,
         cma.total_additional_cost_usd,
         cma.adjustment_count,
         cma.adjustment_reasons,
         cma.last_adjusted_at
       FROM wr.claims c
       LEFT JOIN wr.sellers s ON s.seller_id = c.claimed_by
       LEFT JOIN wr.queue q ON q.subscription_id = c.subscription_id
       LEFT JOIN wr.sellers queue_creator ON queue_creator.seller_id = q.created_by
       LEFT JOIN wr.attribution a ON a.subscription_id = c.subscription_id
       LEFT JOIN wr.sellers closer ON closer.seller_id = a.closer_seller_id
       LEFT JOIN wr.sellers assisted ON assisted.seller_id = a.assisted_seller_id
       LEFT JOIN subscriptions subs ON subs.id = c.subscription_id
       LEFT JOIN users u ON u.id = subs.user_id
      LEFT JOIN wr.subscription_metrics sm ON sm.subscription_id = c.subscription_id
      LEFT JOIN campaigns camp ON camp.id = subs.campaign_id
       LEFT JOIN wr.claim_metrics_adjusted cma ON cma.claim_id = c.id
       WHERE c.id = $1`,
      [claimId]
    );

    if (!row) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const toNumber = (value: any) => (value === null || value === undefined ? null : Number(value));

    const claim = {
      ...row,
      campaign_name: row.campaign_name,
      queue_is_manual: Boolean(row.queue_is_manual),
      revenue_usd: toNumber(row.revenue_usd),
      cost_usd: toNumber(row.cost_usd),
      subs_amount: toNumber(row.subs_amount),
      margin_percent: row.margin_percent !== null ? Number(row.margin_percent) : null,
      original_margin_usd: toNumber(row.original_margin_usd),
      original_margin_percent: row.original_margin_percent !== null ? Number(row.original_margin_percent) : null,
      adjusted_margin_usd: toNumber(row.adjusted_margin_usd),
      adjusted_margin_percent: row.adjusted_margin_percent !== null ? Number(row.adjusted_margin_percent) : null,
      total_additional_cost_usd: toNumber(row.total_additional_cost_usd),
      adjustment_count: row.adjustment_count !== null ? Number(row.adjustment_count) : null,
      installment_plan_id: row.installment_plan_id !== null ? Number(row.installment_plan_id) : null,
      installment_count: row.installment_count !== null ? Number(row.installment_count) : null,
      closer_share_percent: row.closer_share_percent !== null ? Number(row.closer_share_percent) : 1,
      assisted_share_percent: row.assisted_share_percent !== null ? Number(row.assisted_share_percent) : 0,
    };

    const adjustments = await query<any>(
      `SELECT
         ca.id,
         ca.subscription_id,
         ca.claim_id,
         ca.additional_cost_usd,
         ca.reason,
         ca.notes,
         ca.adjusted_by,
         ca.created_at,
         s.display_name AS adjusted_by_name
       FROM wr.claim_adjustments ca
       LEFT JOIN wr.sellers s ON s.seller_id = ca.adjusted_by
       WHERE ca.claim_id = $1
       ORDER BY ca.created_at DESC`,
      [claimId]
    );

    const normalizedAdjustments = adjustments.map((adj) => ({
      ...adj,
      additional_cost_usd: toNumber(adj.additional_cost_usd),
    }));

    return NextResponse.json({
      claim,
      adjustments: normalizedAdjustments,
    });
  } catch (error) {
    console.error('Claim detail fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update claim
export async function PUT(req: NextRequest, { params }: RouteParams) {
  // Require admin, finance, or sales team lead role
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const claimId = parseInt(params.id);
  if (isNaN(claimId)) {
    return NextResponse.json({ error: 'Invalid claim ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const {
      claimed_by,
      claim_type,
      closer_seller_id,
      assisted_seller_id,
      closer_share_percent,
      assisted_share_percent,
    } = body;

    const trimmedClaimedBy =
      typeof claimed_by === 'string' ? claimed_by.trim() : claimed_by;
    const claimedByProvided = claimed_by !== undefined;
    let normalizedClaimedBy: string | null = null;
    let claimedBySellerId: string | null = null;

    if (claimedByProvided) {
      if (!trimmedClaimedBy) {
        return NextResponse.json(
          { error: 'claimed_by cannot be empty' },
          { status: 400 }
        );
      }

      const lookupValue =
        typeof trimmedClaimedBy === 'string'
          ? trimmedClaimedBy
          : String(trimmedClaimedBy);

      const sellerMatch = await queryOne<{
        seller_id: string;
        display_name: string | null;
      }>(
        `SELECT seller_id, display_name
         FROM wr.sellers
         WHERE seller_id = $1 OR display_name = $1`,
        [lookupValue]
      );

      if (sellerMatch) {
        normalizedClaimedBy =
          sellerMatch.display_name || sellerMatch.seller_id;
        claimedBySellerId = sellerMatch.seller_id;
      } else {
        normalizedClaimedBy = lookupValue;
      }
    }

    const claimRow = await queryOne<{ subscription_id: number; installment_plan_id: number | null }>(
      `SELECT subscription_id, installment_plan_id FROM wr.claims WHERE id = $1`,
      [claimId]
    );

    if (!claimRow) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    let planMeta: { id: number; total_installments: number } | null = null;
    if (claim_type === 'installment') {
      planMeta = await queryOne<{ id: number; total_installments: number }>(
        `SELECT id, total_installments FROM wr.installments WHERE subscription_id = $1`,
        [claimRow.subscription_id]
      );

      if (!planMeta) {
        return NextResponse.json(
          { error: 'Installment plan required before switching claim to installment' },
          { status: 400 }
        );
      }
    }

    await query(
      `UPDATE wr.claims
       SET claimed_by = COALESCE($1, claimed_by),
           claim_type = COALESCE($2, claim_type),
           installment_plan_id = COALESCE($3, installment_plan_id),
           installment_count = COALESCE($4, installment_count)
       WHERE id = $5`,
      [
        claimedByProvided ? normalizedClaimedBy : null,
        claim_type ?? null,
        planMeta?.id ?? null,
        planMeta?.total_installments ?? null,
        claimId,
      ]
    );

    if (planMeta) {
      await query(
        `UPDATE wr.installments SET claim_id = $1 WHERE id = $2`,
        [claimId, planMeta.id]
      );
    }

    const attribution = await queryOne<{
      closer_share_percent: number;
      assisted_share_percent: number;
      assisted_seller_id: string | null;
    }>(
      `SELECT closer_share_percent, assisted_share_percent, assisted_seller_id
       FROM wr.attribution
       WHERE subscription_id = $1`,
      [claimRow.subscription_id]
    );

    if (!attribution) {
      throw new Error('Attribution record missing');
    }

    const trimmedCloserSellerId =
      typeof closer_seller_id === 'string' ? closer_seller_id.trim() : closer_seller_id;
    const trimmedAssistedSellerId =
      typeof assisted_seller_id === 'string' ? assisted_seller_id.trim() : assisted_seller_id;

    let targetCloserSellerId = attribution.closer_seller_id;
    let closerNeedsUpdate = false;

    if (closer_seller_id !== undefined) {
      if (!trimmedCloserSellerId) {
        return NextResponse.json(
          { error: 'closer_seller_id cannot be empty' },
          { status: 400 }
        );
      }
      targetCloserSellerId = trimmedCloserSellerId;
      closerNeedsUpdate = targetCloserSellerId !== attribution.closer_seller_id;
    } else if (
      claimedBySellerId &&
      claimedBySellerId !== attribution.closer_seller_id
    ) {
      targetCloserSellerId = claimedBySellerId;
      closerNeedsUpdate = true;
    }

    if (!targetCloserSellerId) {
      return NextResponse.json(
        { error: 'closer_seller_id must be provided for a claim' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const params: any[] = [];
    let index = 1;

    if (closerNeedsUpdate) {
      updates.push(`closer_seller_id = $${index++}`);
      params.push(targetCloserSellerId);
    }

    let nextAssistedSeller: string | null = attribution.assisted_seller_id;
    let assistedNeedsUpdate = false;

    if (assisted_seller_id !== undefined) {
      nextAssistedSeller =
        trimmedAssistedSellerId === '' || trimmedAssistedSellerId === null
          ? null
          : trimmedAssistedSellerId;
      assistedNeedsUpdate = true;
    } else if (closerNeedsUpdate && nextAssistedSeller) {
      nextAssistedSeller = null;
      assistedNeedsUpdate = true;
    }

    if (assistedNeedsUpdate) {
      updates.push(`assisted_seller_id = $${index++}`);
      params.push(nextAssistedSeller);
    }

    let nextCloserShare = Number(attribution.closer_share_percent ?? 1);
    let nextAssistedShare = Number(attribution.assisted_share_percent ?? 0);

    const closerShareProvided = closer_share_percent !== undefined && closer_share_percent !== null;
    const assistedShareProvided = assisted_share_percent !== undefined && assisted_share_percent !== null;

    if (!nextAssistedSeller) {
      // No assisted seller -> full credit to closer
      nextCloserShare = 1;
      nextAssistedShare = 0;
    } else {
      if (closerShareProvided) {
        const parsed = Number(closer_share_percent);
        if (!Number.isFinite(parsed)) {
          return NextResponse.json(
            { error: 'closer_share_percent must be a numeric value between 0 and 1' },
            { status: 400 }
          );
        }
        // Check decimal precision (max 4 digits)
        const decimalPart = String(parsed).split('.')[1];
        if (decimalPart && decimalPart.length > 4) {
          return NextResponse.json(
            { error: 'closer_share_percent can have maximum 4 decimal places' },
            { status: 400 }
          );
        }
        nextCloserShare = parsed;
      }

      if (assistedShareProvided) {
        const parsed = Number(assisted_share_percent);
        if (!Number.isFinite(parsed)) {
          return NextResponse.json(
            { error: 'assisted_share_percent must be a numeric value between 0 and 1' },
            { status: 400 }
          );
        }
        // Check decimal precision (max 4 digits)
        const decimalPart = String(parsed).split('.')[1];
        if (decimalPart && decimalPart.length > 4) {
          return NextResponse.json(
            { error: 'assisted_share_percent can have maximum 4 decimal places' },
            { status: 400 }
          );
        }
        nextAssistedShare = parsed;
      }

      if (!closerShareProvided && !assistedShareProvided) {
        // Newly adding OR changing assisted seller without explicit share; split evenly
        if (!attribution.assisted_seller_id || nextAssistedSeller !== attribution.assisted_seller_id) {
          nextCloserShare = 0.5;
          nextAssistedShare = 0.5;
        }
      } else if (closerShareProvided && !assistedShareProvided) {
        nextAssistedShare = Number((1 - nextCloserShare).toFixed(4));
      } else if (!closerShareProvided && assistedShareProvided) {
        nextCloserShare = Number((1 - nextAssistedShare).toFixed(4));
      }

      if (
        nextCloserShare < 0 ||
        nextCloserShare > 1 ||
        nextAssistedShare < 0 ||
        nextAssistedShare > 1
      ) {
        return NextResponse.json(
          { error: 'Share percentages must be between 0 and 1' },
          { status: 400 }
        );
      }

      if (Math.abs(nextCloserShare + nextAssistedShare - 1) > 0.0001) {
        return NextResponse.json(
          { error: 'Share percentages must add up to 1 when assisted seller is set' },
          { status: 400 }
        );
      }
    }

    updates.push(`closer_share_percent = $${index++}`);
    params.push(Number(nextCloserShare.toFixed(4)));
    updates.push(`assisted_share_percent = $${index++}`);
    params.push(Number(nextAssistedShare.toFixed(4)));

    if (updates.length > 0) {
      params.push(claimRow.subscription_id);
      await query(
        `UPDATE wr.attribution
         SET ${updates.join(', ')}
         WHERE subscription_id = $${index}`,
        params
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Claim update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete claim
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  // Require admin, finance, or sales team lead role
  const authResult = await requireRoles(req, ['admin', 'finance', 'sales_lead']);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const claimId = parseInt(params.id);
  if (isNaN(claimId)) {
    return NextResponse.json({ error: 'Invalid claim ID' }, { status: 400 });
  }

  try {
    // Get subscription_id first
    const claim = await query<any>(
      `SELECT subscription_id FROM wr.claims WHERE id = $1`,
      [claimId]
    );

    if (claim.length === 0) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const subscriptionId = claim[0].subscription_id;

    // Delete attribution
    await query(
      `DELETE FROM wr.attribution WHERE subscription_id = $1`,
      [subscriptionId]
    );

    // Delete claim
    await query(`DELETE FROM wr.claims WHERE id = $1`, [claimId]);

    // Update queue back to pending if exists
    await query(
      `UPDATE wr.queue SET status = 'pending' WHERE subscription_id = $1`,
      [subscriptionId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Claim delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
