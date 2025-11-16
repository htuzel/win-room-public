// Win Room v2.0 - GET /api/leaderboard/conversion
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { query } from '@/lib/db/connection';
import { LeaderboardEntry } from '@/lib/types';
import { getConversionWindow, normalizePeriod } from '@/lib/helpers/periods';

interface ConversionRow {
  seller_id: string;
  leads: string | number | null;
  wins: string | number | null;
  conversion: string | number | null;
}

export async function GET(req: NextRequest) {
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  const { searchParams } = new URL(req.url);
  const period = normalizePeriod(searchParams.get('period') || 'today');

  try {
    const { current } = getConversionWindow(period);

    const rows = await query<ConversionRow>(
      `WITH leads AS (
         SELECT seller_id, SUM(lead_count) AS leads
         FROM wr.lead_assignments_daily
         WHERE seller_id IS NOT NULL
           AND assignment_date BETWEEN $1::date AND $2::date
         GROUP BY seller_id
       ),
       wins AS (
         SELECT sa.seller_id, SUM(sa.share_percent) AS wins
         FROM wr.attribution_share_entries sa
         JOIN wr.attribution a ON a.subscription_id = sa.subscription_id
         JOIN wr.queue q ON q.subscription_id = sa.subscription_id
         LEFT JOIN wr.refunds r ON r.subscription_id = sa.subscription_id
         WHERE q.created_at BETWEEN $1::date AND $2::date
           AND r.id IS NULL
         GROUP BY sa.seller_id
       )
       SELECT
         s.seller_id,
         COALESCE(leads.leads, 0) AS leads,
         COALESCE(wins.wins, 0) AS wins,
         CASE
           WHEN COALESCE(leads.leads, 0) > 0
             THEN COALESCE(wins.wins, 0)::float / leads.leads
           ELSE 0
         END AS conversion
       FROM wr.sellers s
       LEFT JOIN leads ON leads.seller_id = s.seller_id
       LEFT JOIN wins ON wins.seller_id = s.seller_id
       WHERE s.is_active = true
         AND s.pipedrive_owner_id IS NOT NULL
         AND (leads.leads IS NOT NULL OR wins.wins IS NOT NULL)
       ORDER BY conversion DESC, wins DESC`,
      [current.startDate, current.endDate]
    );

    // Conversion is already a percentage (0-1), so max should always be 1.0 (100%)
    const MAX_CONVERSION = 1.0;

    const leaderboard: LeaderboardEntry[] = rows.map((row, index) => {
      const conversion = Number(row.conversion || 0);
      const leads = Number(row.leads || 0);
      const wins = Number(row.wins || 0);

      return {
        seller_id: row.seller_id,
        rank: index + 1,
        bar_value_norm: Math.min(conversion / MAX_CONVERSION, 1.0),
        value: conversion,
        value_unit: 'percent',
        leads_assigned: leads,
        wins,
        you: row.seller_id === user.seller_id,
      };
    });

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Conversion leaderboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
