// Win Room v2.0 - Claim Finance Approval Modal
'use client';

import { useState, useEffect } from 'react';
import { InstallmentPlanBuilder } from '@/components/installments/InstallmentPlanBuilder';
import type { ClaimWithMetrics } from '@/lib/types';

interface ClaimFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: ClaimWithMetrics | null;
  token: string | null;
  onSuccess?: () => void;
}

type FinanceStatus = 'waiting' | 'approved' | 'installment' | 'problem';

export function ClaimFinanceModal({
  isOpen,
  onClose,
  claim,
  token,
  onSuccess,
}: ClaimFinanceModalProps) {
  const [formData, setFormData] = useState<{
    finance_status: FinanceStatus;
    finance_notes: string;
    installment_count?: number;
    installment_plan_id?: number | null;
  }>({
    finance_status: 'waiting',
    finance_notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRefundSection, setShowRefundSection] = useState(false);
  const [refundData, setRefundData] = useState({
    refund_type: 'partial' as 'partial' | 'full',
    refund_amount: '',
    refund_reason: '',
  });

  useEffect(() => {
    if (claim) {
      setFormData({
        finance_status: claim.finance_status || 'waiting',
        finance_notes: claim.finance_notes || '',
        installment_count: claim.installment_count,
        installment_plan_id: claim.installment_plan_id,
      });
    }
  }, [claim]);

  const handlePlanLinked = (payload: { planId: number; installmentCount: number }) => {
    setFormData((prev) => ({
      ...prev,
      installment_plan_id: payload.planId,
      installment_count: payload.installmentCount,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim || !token) return;

    setIsSubmitting(true);

    try {
      // Update finance status
      const res = await fetch(`/api/admin/claims/${claim.id}/finance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          finance_status: formData.finance_status,
          finance_notes: formData.finance_notes,
          installment_count: formData.installment_count,
          installment_plan_id: formData.installment_plan_id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Claim updated successfully');
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update finance status');
      }
    } catch (error) {
      console.error('Finance update error:', error);
      alert('Failed to update finance status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefund = async () => {
    if (!claim || !token) return;

    if (!refundData.refund_reason.trim()) {
      alert('Please provide a refund reason');
      return;
    }

    if (refundData.refund_type === 'partial' && !refundData.refund_amount) {
      alert('Please enter refund amount for partial refund');
      return;
    }

    let refundAmount: number;

    if (refundData.refund_type === 'full') {
      refundAmount = Number(claim.revenue_usd);
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        alert('Invalid revenue amount for full refund');
        return;
      }
    } else {
      refundAmount = parseFloat(refundData.refund_amount);
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        alert('Invalid refund amount - please enter a valid number');
        return;
      }
    }

    if (refundAmount > Number(claim.revenue_usd || 0)) {
      alert('Refund amount cannot exceed revenue');
      return;
    }

    if (!confirm(`Confirm ${refundData.refund_type} refund of $${refundAmount.toFixed(2)}?\n\nThis will reduce the seller's metrics.`)) {
      return;
    }

    const payload = {
      refund_type: refundData.refund_type,
      refund_amount: refundAmount,
      refund_reason: refundData.refund_reason.trim(),
    };

    console.log('[Refund] Sending payload:', payload);

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/claims/${claim.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Refund processed successfully');
        onSuccess?.();
        onClose();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to process refund');
      }
    } catch (error) {
      console.error('Refund error:', error);
      alert('Failed to process refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !claim) return null;
  const activePlanId = formData.installment_plan_id || claim.installment_plan_id;

  const getStatusColor = (status: FinanceStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30';
      case 'waiting':
        return 'bg-amber-500/20 text-amber-400 border-amber-400/30';
      case 'installment':
        return 'bg-blue-500/20 text-blue-400 border-blue-400/30';
      case 'problem':
        return 'bg-rose-500/20 text-rose-400 border-rose-400/30';
      default:
        return 'bg-foreground/10 text-foreground border-border';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-foreground/60 transition hover:bg-foreground/10 hover:text-foreground text-xl font-bold"
        >
          ×
        </button>

        <h2 className="mb-6 text-2xl font-bold text-foreground">
          Finance Approval - Claim #{claim.id}
        </h2>

        <div className="mb-6 space-y-3 rounded-lg border border-border/50 bg-surface/50 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/40">
                Subscription ID
              </p>
              <p className="font-semibold text-foreground">#{claim.subscription_id}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/40">
                Claimed By
              </p>
              <p className="font-semibold text-foreground">
                {claim.claimed_by || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/40">
                Claim Type
              </p>
              <p className="font-semibold text-foreground capitalize">
                {claim.claim_type?.replace('_', ' ') || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/40">
                Payment Channel
              </p>
              <p className="font-semibold text-foreground">
                {claim.payment_channel || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/40">
                Revenue (USD)
              </p>
              <p className="font-semibold text-foreground">
                ${typeof claim.revenue_usd === 'number' ? claim.revenue_usd.toFixed(2) : '0.00'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/40">
                Margin
              </p>
              <p className="font-semibold text-foreground">
                {typeof claim.margin_percent === 'number' ? `${(claim.margin_percent * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Finance Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['waiting', 'approved', 'installment', 'problem'] as FinanceStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({ ...formData, finance_status: status })}
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold capitalize transition ${
                      formData.finance_status === status
                        ? getStatusColor(status)
                        : 'border-border bg-surface/50 text-foreground/60 hover:bg-surface'
                    }`}
                  >
                    {status}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Finance Notes (Optional)
            </label>
            <textarea
              value={formData.finance_notes}
              onChange={(e) =>
                setFormData({ ...formData, finance_notes: e.target.value })
              }
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder-foreground/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Add notes about this finance decision..."
            />
          </div>

          {formData.finance_status === 'installment' && (
            <div className="space-y-3 rounded-xl border border-border/40 bg-surface/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="text-sm font-semibold text-foreground">Installment Information</label>
                {activePlanId && (
                  <a
                    className="text-xs font-semibold text-accent underline"
                    href={`/admin/installments?plan=${activePlanId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Plan #{activePlanId}
                  </a>
                )}
              </div>
              <label className="text-xs font-semibold text-foreground/70">
                Number of Installments
                <input
                  type="number"
                  min={2}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                  value={formData.installment_count ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      installment_count: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </label>

              {!activePlanId && token && (
                <InstallmentPlanBuilder
                  subscriptionId={claim.subscription_id}
                  claimId={claim.id}
                  token={token}
                  defaultCustomerName={claim.customer_name}
                  defaultCustomerEmail={claim.customer_email}
                  onPlanCreated={handlePlanLinked}
                />
              )}

              {!token && (
                <p className="text-xs text-rose-400">
                  Token not found; please refresh the page to create a plan.
                </p>
              )}
            </div>
          )}

          {claim.finance_approved_at && (
            <div className="rounded-lg border border-border/50 bg-surface/30 p-3 text-xs text-foreground/60">
              <p>
                Last updated:{' '}
                {new Date(claim.finance_approved_at).toLocaleString('tr-TR')}
              </p>
              {claim.finance_approved_by && <p>By: {claim.finance_approved_by}</p>}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 font-semibold text-foreground transition hover:bg-surface/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-accent px-4 py-2.5 font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update Finance Status'}
            </button>
          </div>

        </form>

        {/* Refund Section */}
        <div className="mt-6 border-t border-border/50 pt-6">
          <button
            type="button"
            onClick={() => setShowRefundSection(!showRefundSection)}
            className="mb-4 flex w-full items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/5 px-4 py-3 font-semibold text-rose-400 transition hover:bg-rose-500/10"
          >
            <span>🔄 Process Refund</span>
            <span>{showRefundSection ? '▼' : '▶'}</span>
          </button>

          {showRefundSection && (
            <div className="space-y-4 rounded-lg border border-border/50 bg-surface/30 p-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Refund Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRefundData({ ...refundData, refund_type: 'partial' })}
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                      refundData.refund_type === 'partial'
                        ? 'border-rose-400/50 bg-rose-500/20 text-rose-300'
                        : 'border-border bg-surface/50 text-foreground/60 hover:bg-surface'
                    }`}
                  >
                    Partial Refund
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundData({ ...refundData, refund_type: 'full' })}
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                      refundData.refund_type === 'full'
                        ? 'border-rose-400/50 bg-rose-500/20 text-rose-300'
                        : 'border-border bg-surface/50 text-foreground/60 hover:bg-surface'
                    }`}
                  >
                    Full Refund
                  </button>
                </div>
              </div>

              {refundData.refund_type === 'partial' && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    Refund Amount (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    max={claim.revenue_usd}
                    value={refundData.refund_amount}
                    onChange={(e) =>
                      setRefundData({ ...refundData, refund_amount: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    placeholder={`Max: $${Number(claim.revenue_usd || 0).toFixed(2)}`}
                  />
                </div>
              )}

              {refundData.refund_type === 'full' && (
                <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                  Full refund amount: $${Number(claim.revenue_usd || 0).toFixed(2)}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Refund Reason *
                </label>
                <textarea
                  value={refundData.refund_reason}
                  onChange={(e) =>
                    setRefundData({ ...refundData, refund_reason: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground/40 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  placeholder="Why is this refund being processed?"
                  required
                />
              </div>

              <button
                type="button"
                onClick={handleRefund}
                disabled={isSubmitting}
                className="w-full rounded-lg bg-rose-600 px-4 py-2.5 font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Process Refund'}
              </button>

              <p className="text-xs text-foreground/50">
                ⚠️ Refunding will reduce seller revenue, margin, and win counts. This action is logged.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
