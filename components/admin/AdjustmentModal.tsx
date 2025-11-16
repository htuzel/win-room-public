// Win Room v2.0 - Claim Adjustment Modal
'use client';

import { useState, useEffect } from 'react';
import { ClaimWithMetrics, ClaimAdjustment, AdjustmentReason } from '@/lib/types';

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: ClaimWithMetrics;
  token: string | null;
  onSuccess: () => void;
}

export function AdjustmentModal({ isOpen, onClose, claim, token, onSuccess }: AdjustmentModalProps) {
  const [additionalCost, setAdditionalCost] = useState<number>(0);
  const [reason, setReason] = useState<AdjustmentReason>('commission');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [adjustmentHistory, setAdjustmentHistory] = useState<ClaimAdjustment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (isOpen && claim.id) {
      fetchAdjustmentHistory();
    }
  }, [isOpen, claim.id]);

  const fetchAdjustmentHistory = async () => {
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/claims/${claim.id}/adjustment`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAdjustmentHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch adjustment history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (additionalCost <= 0) {
      alert('Additional cost must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/claims/${claim.id}/adjustment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          additional_cost_usd: additionalCost,
          reason,
          notes: notes || null,
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to add adjustment');
      }
    } catch (error) {
      console.error('Adjustment error:', error);
      alert('Failed to add adjustment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to remove all adjustments for this claim?')) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/claims/${claim.id}/adjustment`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        onSuccess();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete adjustments');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete adjustments');
    } finally {
      setLoading(false);
    }
  };

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  if (!isOpen) return null;

  const originalMargin = claim.original_margin_usd || 0;
  const totalAdjustments = claim.total_additional_cost_usd || 0;
  const finalMargin = claim.adjusted_margin_usd ?? originalMargin;
  const remainingMargin = originalMargin - totalAdjustments;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Claim Adjustment</h2>
          <p className="text-sm text-foreground/60 mt-1">
            Subscription #{claim.subscription_id} - {claim.claimed_by}
          </p>
        </div>

        {/* Summary */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border/50 bg-background/40 p-4">
            <p className="text-xs text-foreground/60 mb-1">Original Margin</p>
            <p className="text-lg font-bold text-foreground">{currencyFormatter.format(originalMargin)}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/40 p-4">
            <p className="text-xs text-foreground/60 mb-1">Total Adjustments</p>
            <p className="text-lg font-bold text-rose-400">-{currencyFormatter.format(totalAdjustments)}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-background/40 p-4">
            <p className="text-xs text-foreground/60 mb-1">Final Margin</p>
            <p className="text-lg font-bold text-emerald-400">{currencyFormatter.format(finalMargin)}</p>
          </div>
        </div>

        {/* Adjustment History */}
        {!loadingHistory && adjustmentHistory.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Adjustment History</h3>
            <div className="space-y-2">
              {adjustmentHistory.map((adj) => (
                <div key={adj.id} className="rounded-lg border border-border/40 bg-background/20 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-rose-400">
                        -{currencyFormatter.format(adj.additional_cost_usd)}
                      </span>
                      <span className="ml-3 text-sm text-foreground/60">
                        {adj.reason.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-foreground/50">
                      {new Date(adj.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {adj.notes && (
                    <p className="text-sm text-foreground/60 mt-2">{adj.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Adjustment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Additional Cost (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remainingMargin}
              value={additionalCost}
              onChange={(e) => setAdditionalCost(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <p className="text-xs text-foreground/50 mt-1">
              Max: {currencyFormatter.format(remainingMargin)} (remaining margin)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as AdjustmentReason)}
              className="w-full px-4 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="commission">Commission</option>
              <option value="partial_refund">Partial Refund</option>
              <option value="chargeback">Chargeback</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g., PayPal transaction fee"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-accent text-black font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Adjustment'}
            </button>

            {adjustmentHistory.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={loading}
                className="px-4 py-2 bg-rose-500/20 text-rose-400 font-medium rounded-lg hover:bg-rose-500/30 transition-colors disabled:opacity-50"
              >
                Remove All
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-background transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
