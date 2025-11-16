// Win Room v2.0 - Edit Queue Item Modal
'use client';

import { useState, useEffect } from 'react';

interface QueueItem {
  id: number;
  subscription_id: number;
  customer_email?: string;
  customer_name?: string;
  campaign_name?: string;
  revenue_usd?: number;
  cost_usd?: number;
  margin_amount_usd?: number;
  margin_percent?: number;
  subs_amount?: number;
  currency?: string;
  payment_channel?: string;
}

interface EditQueueItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: QueueItem | null;
  token: string | null;
  onSuccess?: () => void;
}

export function EditQueueItemModal({
  isOpen,
  onClose,
  item,
  token,
  onSuccess,
}: EditQueueItemModalProps) {
  const [formData, setFormData] = useState({
    revenue_usd: 0,
    cost_usd: 0,
    subs_amount: 0,
    currency: 'USD',
    payment_channel: '',
    campaign_name: '',
    custom_note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Computed values
  const marginAmount = formData.revenue_usd - formData.cost_usd;
  const marginPercent = formData.revenue_usd > 0
    ? (marginAmount / formData.revenue_usd) * 100
    : 0;

  useEffect(() => {
    if (isOpen && item) {
      // Initialize form with current values
      setFormData({
        revenue_usd: item.revenue_usd || 0,
        cost_usd: item.cost_usd || 0,
        subs_amount: item.subs_amount || 0,
        currency: item.currency || 'USD',
        payment_channel: item.payment_channel || '',
        campaign_name: item.campaign_name || '',
        custom_note: '',
      });
      setError('');
    }
  }, [isOpen, item]);

  const handleSubmit = async () => {
    if (!token || !item) return;

    // Validation
    if (formData.revenue_usd < 0 || formData.cost_usd < 0) {
      setError('Revenue and cost cannot be negative');
      return;
    }

    if (formData.subs_amount <= 0) {
      setError('Subscription amount must be greater than 0');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/queue/${item.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess?.();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update queue item');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-surface shadow-[0_24px_45px_rgba(0,0,0,0.4)] p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Edit Queue Item</h2>
          <p className="text-sm text-foreground/60 mt-1">
            Subscription #{item.subscription_id} - {item.customer_name || item.customer_email}
          </p>
        </div>

        {/* Customer Info (Read-only) */}
        <div className="mb-6 p-4 rounded-2xl bg-background/40 border border-border/30">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-foreground/50 uppercase mb-1">Customer</div>
              <div className="text-sm text-foreground font-medium">{item.customer_name || 'N/A'}</div>
              <div className="text-xs text-foreground/50">{item.customer_email}</div>
            </div>
            <div>
              <div className="text-xs text-foreground/50 uppercase mb-1">Subscription ID</div>
              <div className="text-sm text-foreground font-medium">#{item.subscription_id}</div>
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="space-y-6 mb-6">
          {/* Financial Metrics */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Financial Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Revenue (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.revenue_usd}
                  onChange={(e) => handleInputChange('revenue_usd', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Cost (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost_usd}
                  onChange={(e) => handleInputChange('cost_usd', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            {/* Calculated Margin */}
            <div className="mt-4 p-4 rounded-xl bg-background/20 border border-border/20">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-foreground/50 uppercase mb-1">Calculated Margin</div>
                  <div className={`text-lg font-bold ${marginAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {currencyFormatter.format(marginAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-foreground/50 uppercase mb-1">Margin %</div>
                  <div className={`text-lg font-bold ${marginPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {marginPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Details */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Subscription Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Subscription Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.subs_amount}
                  onChange={(e) => handleInputChange('subs_amount', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Currency
                </label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  placeholder="USD, EUR, TRY..."
                  className="w-full px-4 py-3 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Payment Channel
                </label>
                <input
                  type="text"
                  value={formData.payment_channel}
                  onChange={(e) => handleInputChange('payment_channel', e.target.value)}
                  placeholder="stripe, iyzico, craftgate..."
                  className="w-full px-4 py-3 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={formData.campaign_name}
                  onChange={(e) => handleInputChange('campaign_name', e.target.value)}
                  placeholder="Campaign name..."
                  className="w-full px-4 py-3 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {/* Custom Note */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Custom Note (Optional)
            </label>
            <textarea
              value={formData.custom_note}
              onChange={(e) => handleInputChange('custom_note', e.target.value)}
              placeholder="Add any notes about this edit..."
              rows={3}
              className="w-full px-4 py-3 bg-background border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
        </div>

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
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
