// Win Room v2.0 - Claim Details Modal
'use client';

import { formatPercent, formatUSD } from '@/lib/helpers/format';
import type { ClaimAdjustment } from '@/lib/types';
import { Fragment } from 'react';

export interface ClaimDetailsRecord {
  id: number;
  subscription_id: number;
  claim_type: string;
  claimed_at: string;
  claimed_by: string;
  claimer_name?: string | null;
  claimer_email?: string | null;
  closer_seller_id?: string | null;
  closer_name?: string | null;
  assisted_seller_id?: string | null;
  assisted_name?: string | null;
  attribution_source?: string | null;
  resolved_from?: string | null;
  resolved_at?: string | null;
  closer_share_percent?: number | null;
  assisted_share_percent?: number | null;
  finance_status?: string | null;
  finance_approved_by?: string | null;
  finance_approved_at?: string | null;
  finance_notes?: string | null;
  queue_is_manual?: boolean;
  queue_created_by?: string | null;
  queue_created_by_email?: string | null;
  queue_created_by_name?: string | null;
  queue_created_at?: string | null;
  revenue_usd?: number | null;
  cost_usd?: number | null;
  margin_percent?: number | null;
  original_margin_usd?: number | null;
  original_margin_percent?: number | null;
  adjusted_margin_usd?: number | null;
  adjusted_margin_percent?: number | null;
  total_additional_cost_usd?: number | null;
  adjustment_count?: number | null;
  adjustment_reasons?: string | null;
  last_adjusted_at?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  sales_person?: string | null;
  payment_channel?: string | null;
  subs_amount?: number | null;
  currency?: string | null;
  subscription_created_at?: string | null;
  subscription_status?: string | null;
  custom_note?: string | null;
  subs_note?: string | null;
  campaign_name?: string | null;
  installment_plan_id?: number | null;
  installment_count?: number | null;
}

export type ClaimAdjustmentDetail = ClaimAdjustment & {
  adjusted_by_name?: string | null;
};

interface ClaimDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: ClaimDetailsRecord | null;
  adjustments: ClaimAdjustmentDetail[];
  loading: boolean;
  error: string | null;
}

const renderDateTime = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const renderPercent = (value?: number | null) => {
  if (value === undefined || value === null) {
    return '—';
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return '—';
  }
  return formatPercent(num * 100);
};

const renderCurrency = (value?: number | null) => {
  if (value === undefined || value === null) {
    return '—';
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return '—';
  }
  return formatUSD(num);
};

export function ClaimDetailsModal({
  isOpen,
  onClose,
  claim,
  adjustments,
  loading,
  error,
}: ClaimDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.45em] text-foreground/50">Claim Details</p>
            <h2 className="text-2xl font-semibold text-foreground">
              Subscription #{claim?.subscription_id ?? '—'}
            </h2>
            {claim?.customer_name || claim?.customer_email ? (
              <p className="text-sm text-foreground/60">
                {claim.customer_name}
                {claim.customer_name && claim.customer_email ? ' · ' : ''}
                {claim.customer_email}
              </p>
            ) : null}
            {claim?.campaign_name && (
              <p className="text-xs font-semibold text-accent mt-1">
                Package: {claim.campaign_name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-border px-3 py-1 text-sm font-semibold text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-surface/80">
          {loading && (
            <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-sm text-foreground/60">
              Loading claim details...
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          {claim && (
            <Fragment>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-foreground/40">Claim Type</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {claim.claim_type?.replace(/_/g, ' ') ?? '—'}
                  </p>
                  <p className="text-xs text-foreground/50 mt-2">
                    Claimed {renderDateTime(claim.claimed_at)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-foreground/40">Claimer</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {claim.claimer_name || claim.claimed_by || '—'}
                  </p>
                  {claim.claimer_email && (
                    <p className="text-xs text-foreground/50 mt-1">{claim.claimer_email}</p>
                  )}
                </div>
            <div className="rounded-xl border border-border/50 bg-background/40 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-foreground/40">Closer / Assisted</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {claim.closer_name || claim.closer_seller_id || '—'}
              </p>
              <p className="text-xs text-foreground/50 mt-1">
                Assisted: {claim.assisted_name || claim.assisted_seller_id || '—'}
              </p>
              <p className="text-[11px] text-foreground/50 mt-2">
                Shares → Closer: {renderPercent(claim.closer_share_percent)} · Assisted:{' '}
                {claim.assisted_seller_id ? renderPercent(claim.assisted_share_percent) : '—'}
              </p>
            </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-foreground/40">Revenue</p>
                  <p className="mt-2 text-lg font-semibold text-success">{renderCurrency(claim.revenue_usd)}</p>
                  <p className="text-[11px] text-foreground/50">Cost: {renderCurrency(claim.cost_usd)}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-foreground/40">Margin (Original)</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-300">
                    {renderCurrency(claim.original_margin_usd)}
                  </p>
                  <p className="text-[11px] text-foreground/50">
                    Percent: {renderPercent(claim.original_margin_percent)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-foreground/40">Margin (Adjusted)</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-300">
                    {renderCurrency(claim.adjusted_margin_usd ?? claim.original_margin_usd)}
                  </p>
                  <p className="text-[11px] text-foreground/50">
                    Percent: {renderPercent(claim.adjusted_margin_percent ?? claim.original_margin_percent)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-foreground/40">Adjustments</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {claim.adjustment_count ?? 0}{' '}
                    {claim.adjustment_count === 1 ? 'entry' : 'entries'}
                  </p>
                  <p className="text-[11px] text-foreground/50">
                    Total cost: {renderCurrency(claim.total_additional_cost_usd)}
                  </p>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                  <h3 className="text-xs uppercase tracking-[0.4em] text-foreground/50 mb-2">Finance Status</h3>
                  <p className="text-sm font-semibold text-foreground capitalize">
                    {claim.finance_status || 'waiting'}
                  </p>
                  <p className="text-xs text-foreground/50 mt-1">
                    Approved by {claim.finance_approved_by || '—'} · {renderDateTime(claim.finance_approved_at)}
                  </p>
                  <div className="mt-3 rounded-lg border border-border/40 bg-background/30 p-3 text-sm text-foreground/80 whitespace-pre-wrap">
                    {claim.finance_notes?.trim() || 'No finance notes'}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                  <h3 className="text-xs uppercase tracking-[0.4em] text-foreground/50 mb-2">Queue / Subscription</h3>
                  <ul className="space-y-2 text-sm text-foreground/80">
                    <li>
                      <span className="text-foreground/50">Payment:</span>{' '}
                      {claim.payment_channel || '—'}
                    </li>
                    <li>
                      <span className="text-foreground/50">Amount:</span>{' '}
                      {renderCurrency(claim.subs_amount)} {claim.currency || ''}
                    </li>
                    <li>
                      <span className="text-foreground/50">Package:</span>{' '}
                      {claim.campaign_name || '—'}
                    </li>
                    <li>
                      <span className="text-foreground/50">Queue created:</span>{' '}
                      {renderDateTime(claim.queue_created_at)}
                    </li>
                    <li>
                      <span className="text-foreground/50">Manual queue:</span>{' '}
                      {claim.queue_is_manual ? 'Yes' : 'No'}
                    </li>
                    {claim.queue_is_manual && (
                      <li className="text-xs text-foreground/60">
                        Added by {claim.queue_created_by_name || claim.queue_created_by || claim.queue_created_by_email || '—'}
                      </li>
                    )}
                    <li>
                      <span className="text-foreground/50">Sales Person:</span>{' '}
                      {claim.sales_person || '—'}
                    </li>
                    <li>
                      <span className="text-foreground/50">Subscription created:</span>{' '}
                      {renderDateTime(claim.subscription_created_at)}
                    </li>
                  </ul>
                </div>
              </section>

              <section className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <h3 className="text-xs uppercase tracking-[0.4em] text-foreground/50 mb-2">Notes</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-border/40 bg-background/20 p-3 text-sm text-foreground/70 whitespace-pre-wrap">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-foreground/40">Custom Note</p>
                    {claim.custom_note?.trim() || '—'}
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/20 p-3 text-sm text-foreground/70 whitespace-pre-wrap">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-foreground/40">Subscription Note</p>
                    {claim.subs_note?.trim() || '—'}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <h3 className="text-xs uppercase tracking-[0.4em] text-foreground/50 mb-3">Adjustments</h3>
                {adjustments.length === 0 ? (
                  <p className="text-sm text-foreground/60">No adjustments recorded for this claim.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-foreground/80">
                      <thead>
                        <tr className="border-b border-border/40 text-xs uppercase tracking-wide text-foreground/50">
                          <th className="px-2 py-2 text-left">Date</th>
                          <th className="px-2 py-2 text-left">Reason</th>
                          <th className="px-2 py-2 text-left">Amount</th>
                          <th className="px-2 py-2 text-left">Notes</th>
                          <th className="px-2 py-2 text-left">By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {adjustments.map((adjustment) => (
                          <tr key={adjustment.id}>
                            <td className="px-2 py-2 text-xs text-foreground/60">
                              {renderDateTime(adjustment.created_at)}
                            </td>
                            <td className="px-2 py-2 capitalize">{adjustment.reason.replace('_', ' ')}</td>
                            <td className="px-2 py-2">{renderCurrency(adjustment.additional_cost_usd)}</td>
                            <td className="px-2 py-2 text-foreground/60">{adjustment.notes || '—'}</td>
                            <td className="px-2 py-2 text-foreground/60">
                              {adjustment.adjusted_by_name || adjustment.adjusted_by}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </Fragment>
          )}
        </div>
      </div>
    </div>
  );
}
