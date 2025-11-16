// Win Room v2.0 - Finance Status Modal
'use client';

import { useState, useEffect } from 'react';
import { ClaimWithMetrics, FinanceStatus } from '@/lib/types';

interface FinanceStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: ClaimWithMetrics;
  token: string | null;
  onSuccess?: () => void;
}

export function FinanceStatusModal({
  isOpen,
  onClose,
  claim,
  token,
  onSuccess,
}: FinanceStatusModalProps) {
  const [financeStatus, setFinanceStatus] = useState<FinanceStatus>('waiting');
  const [financeNotes, setFinanceNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Initialize with current status
      setFinanceStatus(claim.finance_status || 'waiting');
      setFinanceNotes(claim.finance_notes || '');
      setError('');
    }
  }, [isOpen, claim]);

  const handleSubmit = async () => {
    if (!token) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/claims/${claim.id}/finance-status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finance_status: financeStatus,
          finance_notes: financeNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        onSuccess?.();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update finance status');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  if (!isOpen) return null;

  const finalMargin = claim.adjusted_margin_usd ?? claim.original_margin_usd ?? 0;
  const hasAdjustments = (claim.adjustment_count || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-surface shadow-[0_24px_45px_rgba(0,0,0,0.4)] p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Finance Status</h2>
          <p className="text-sm text-foreground/60 mt-1">
            Update finance approval status for claim #{claim.subscription_id}
          </p>
        </div>

        {/* Claim Info */}
        <div className="mb-6 p-4 rounded-2xl bg-background/40 border border-border/30">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-foreground/50 uppercase mb-1">Customer</div>
              <div className="text-sm text-foreground font-medium">{claim.customer_name || 'N/A'}</div>
              <div className="text-xs text-foreground/50">{claim.customer_email}</div>
            </div>
            <div>
              <div className="text-xs text-foreground/50 uppercase mb-1">Claimed By</div>
              <div className="text-sm text-foreground font-medium">{claim.claimed_by}</div>
            </div>
            <div>
              <div className="text-xs text-foreground/50 uppercase mb-1">Payment Channel</div>
              <div className="text-sm text-foreground font-medium">
                <span className="inline-block px-2 py-1 rounded bg-amber-500/30 text-amber-200 text-xs">
                  {claim.payment_channel || 'N/A'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-foreground/50 uppercase mb-1">Amount</div>
              <div className="text-sm text-foreground font-medium">
                {currencyFormatter.format(claim.subs_amount || 0)} {claim.currency || ''}
              </div>
            </div>
          </div>

          {/* Margin Info */}
          <div className="mt-4 pt-4 border-t border-border/20">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-foreground/50 uppercase mb-1">Original Margin</div>
                <div className="text-sm text-foreground font-medium">
                  {currencyFormatter.format(claim.original_margin_usd || 0)}
                </div>
              </div>
              {hasAdjustments && (
                <div>
                  <div className="text-xs text-foreground/50 uppercase mb-1">Adjustments</div>
                  <div className="text-sm text-rose-400 font-medium">
                    -{currencyFormatter.format(claim.total_additional_cost_usd || 0)}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-foreground/50 uppercase mb-1">Final Margin</div>
                <div className={`text-sm font-medium ${hasAdjustments ? 'text-amber-300' : 'text-foreground'}`}>
                  {currencyFormatter.format(finalMargin)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Finance Status Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Finance Status *
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(['waiting', 'approved', 'installment', 'problem'] as FinanceStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFinanceStatus(status)}
                className={`px-4 py-3 rounded-xl border-2 transition-all ${
                  financeStatus === status
                    ? status === 'approved'
                      ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300'
                      : status === 'problem'
                      ? 'border-rose-400 bg-rose-400/20 text-rose-300'
                      : status === 'installment'
                      ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                      : 'border-foreground/30 bg-foreground/10 text-foreground'
                    : 'border-border bg-background/40 text-foreground/60 hover:border-foreground/30'
                }`}
              >
                <span className="font-semibold capitalize">{status}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Finance Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Finance Notes
          </label>
          <textarea
            value={financeNotes}
            onChange={(e) => setFinanceNotes(e.target.value)}
            placeholder="Add notes about costs, commissions, or other finance details..."
            rows={4}
            className="w-full px-4 py-3 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>

        {/* Previous Finance Info */}
        {claim.finance_approved_by && (
          <div className="mb-6 p-4 rounded-xl bg-background/20 border border-border/20">
            <div className="text-xs text-foreground/50 uppercase mb-2">Previous Status</div>
            <div className="text-sm text-foreground">
              Approved by <span className="font-medium">{claim.finance_approved_by}</span>
              {claim.finance_approved_at && (
                <span className="text-foreground/60">
                  {' '}on {new Date(claim.finance_approved_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl border border-border text-foreground hover:bg-background/60 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  );
}
