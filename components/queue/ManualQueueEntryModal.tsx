// Win Room v2.0 - Manual Queue Entry Modal
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FinanceStatus } from '@/lib/types';

interface ManualQueueEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onSuccess?: () => void;
  defaultSubscriptionId?: number | null;
}

type FormState = {
  subscription_id: string;
  revenue_usd: string;
  cost_usd: string;
  subs_amount: string;
  currency: string;
  payment_channel: string;
  custom_payment_channel: string;
  campaign_name: string;
  finance_status: FinanceStatus;
  finance_notes: string;
  custom_note: string;
};

const DEFAULT_FORM: FormState = {
  subscription_id: '',
  revenue_usd: '',
  cost_usd: '',
  subs_amount: '',
  currency: 'USD',
  payment_channel: 'craftgate',
  custom_payment_channel: '',
  campaign_name: '',
  finance_status: 'waiting',
  finance_notes: '',
  custom_note: '',
};

const PAYMENT_CHANNELS = [
  { value: 'craftgate', label: 'Craftgate' },
  { value: 'wise', label: 'Wise' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'paypal', label: 'Paypal' },
  { value: 'other', label: 'Other (Manuel Giriş)' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD' },
  { value: 'TRY', label: 'TRY' },
  { value: 'SAR', label: 'SAR' },
];

// Exchange rates (will be fetched from API)
const USD_TRY_RATE = 35; // Fallback, will be updated
const SAR_TO_USD = 3.75;

const FINANCE_STATUSES: { value: FinanceStatus; label: string }[] = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'approved', label: 'Approved' },
  { value: 'installment', label: 'Installment' },
  { value: 'problem', label: 'Problem' },
];

export function ManualQueueEntryModal({
  isOpen,
  onClose,
  token,
  onSuccess,
  defaultSubscriptionId,
}: ManualQueueEntryModalProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Fetch campaigns when modal opens
  useEffect(() => {
    if (isOpen && token && campaigns.length === 0) {
      setLoadingCampaigns(true);
      fetch('/api/campaigns', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.campaigns)) {
            setCampaigns(data.campaigns);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch campaigns:', err);
        })
        .finally(() => {
          setLoadingCampaigns(false);
        });
    }
  }, [isOpen, token, campaigns.length]);

  useEffect(() => {
    if (isOpen) {
      setForm((prev) => ({
        ...DEFAULT_FORM,
        subscription_id: defaultSubscriptionId ? String(defaultSubscriptionId) : prev.subscription_id,
      }));
      setError(null);
    } else {
      setSubmitting(false);
    }
  }, [isOpen, defaultSubscriptionId]);

  // Auto-calculate revenue from currency and subscription amount
  useEffect(() => {
    const subsAmount = parseFloat(form.subs_amount || '0');
    if (subsAmount > 0 && form.currency) {
      let calculatedRevenue = 0;

      if (form.currency === 'USD') {
        calculatedRevenue = subsAmount;
      } else if (form.currency === 'TRY') {
        calculatedRevenue = subsAmount / USD_TRY_RATE;
      } else if (form.currency === 'SAR') {
        calculatedRevenue = subsAmount / SAR_TO_USD;
      }

      setForm((prev) => ({
        ...prev,
        revenue_usd: calculatedRevenue > 0 ? calculatedRevenue.toFixed(2) : '',
      }));
    }
  }, [form.subs_amount, form.currency]);

  const marginPreview = useMemo(() => {
    const revenue = parseFloat(form.revenue_usd || '0');
    const cost = parseFloat(form.cost_usd || '0');
    if (!Number.isFinite(revenue) || !Number.isFinite(cost) || revenue <= 0) {
      return { amount: null as number | null, percent: null as number | null };
    }
    const amount = revenue - cost;
    const percent = amount / revenue;
    return { amount, percent };
  }, [form.revenue_usd, form.cost_usd]);

  if (!isOpen) return null;

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!token) return;

    if (!form.subscription_id.trim()) {
      setError('Subscription ID is required');
      return;
    }

    if (!form.revenue_usd.trim() || !form.cost_usd.trim() || !form.subs_amount.trim()) {
      setError('Revenue, cost, and subscription amount are required');
      return;
    }

    if (!form.payment_channel.trim()) {
      setError('Payment channel is required');
      return;
    }

    if (form.payment_channel === 'other' && !form.custom_payment_channel.trim()) {
      setError('Payment channel name is required when "Other" is selected');
      return;
    }

    // Use custom payment channel if "other" is selected
    const finalPaymentChannel = form.payment_channel === 'other'
      ? form.custom_payment_channel.trim()
      : form.payment_channel.trim();

    const payload = {
      subscription_id: Number(form.subscription_id),
      revenue_usd: Number(form.revenue_usd),
      cost_usd: Number(form.cost_usd),
      subs_amount: Number(form.subs_amount),
      currency: form.currency.trim() || 'USD',
      payment_channel: finalPaymentChannel,
      campaign_name: form.campaign_name.trim() || undefined,
      finance_status: form.finance_status,
      finance_notes: form.finance_notes.trim() || undefined,
      custom_note: form.custom_note.trim() || undefined,
    };

    if (
      [payload.subscription_id, payload.revenue_usd, payload.cost_usd, payload.subs_amount].some((value) =>
        Number.isNaN(value)
      )
    ) {
      setError('Numeric fields must contain valid numbers');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/queue/manual', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess?.();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add manual entry');
      }
    } catch (err) {
      console.error('Manual queue entry error:', err);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-surface shadow-[0_24px_45px_rgba(0,0,0,0.45)] p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Manual Queue Entry</h2>
            <p className="text-sm text-foreground/60 mt-1">
              Tüm alanları detaylı doldur. Bu giriş sistem tarafından <span className="font-semibold text-accent">MANUEL</span> olarak işaretlenecek.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-foreground/60 hover:text-foreground text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Row 1: Subscription ID, Payment Channel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground/80 mb-2">Subscription ID *</label>
              <input
                type="number"
                value={form.subscription_id}
                onChange={(e) => handleChange('subscription_id', e.target.value)}
                placeholder="12345"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground/80 mb-2">Payment Channel *</label>
              <select
                value={form.payment_channel}
                onChange={(e) => handleChange('payment_channel', e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {PAYMENT_CHANNELS.map((channel) => (
                  <option key={channel.value} value={channel.value}>
                    {channel.label}
                  </option>
                ))}
              </select>
              {form.payment_channel === 'other' && (
                <input
                  type="text"
                  value={form.custom_payment_channel}
                  onChange={(e) => handleChange('custom_payment_channel', e.target.value)}
                  placeholder="Payment channel ismini girin (örn: iyzico, paypal)"
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              )}
            </div>
          </div>

          {/* Row 2: Currency, Subscription Amount - yan yana */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground/80 mb-2">Currency *</label>
              <select
                value={form.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr.value} value={curr.value}>
                    {curr.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground/80 mb-2">Subscription Amount *</label>
              <input
                type="number"
                step="0.01"
                value={form.subs_amount}
                onChange={(e) => handleChange('subs_amount', e.target.value)}
                placeholder="42000"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-xs text-foreground/50 mt-1">
                Para birimindeki abonelik tutarı
              </p>
            </div>
          </div>

          {/* Row 3: Revenue, Cost */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground/80 mb-2">Revenue (USD) *</label>
              <input
                type="number"
                step="0.01"
                value={form.revenue_usd}
                readOnly
                placeholder="Auto-calculated"
                className="w-full rounded-xl border border-border bg-background/50 px-4 py-3 text-foreground/80 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <p className="text-xs text-emerald-400/80 mt-1">
                ✓ Currency ve Subscription Amount'tan otomatik hesaplanıyor
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground/80 mb-2">Cost (USD) *</label>
              <input
                type="number"
                step="0.01"
                value={form.cost_usd}
                onChange={(e) => handleChange('cost_usd', e.target.value)}
                placeholder="500"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-xs text-cyan-400/80 mt-1">
                💡 Hesaplama: Paket uzunluğu (ay) × 4 × (25 dk cinsten ders sayısı * 5) / taksit sayısı 
              </p>
            </div>
          </div>

          {/* Row 4: Campaign Name - full width */}
          <div>
            <label className="block text-sm font-semibold text-foreground/80 mb-2">Campaign Name</label>
            <select
              value={form.campaign_name}
              onChange={(e) => handleChange('campaign_name', e.target.value)}
              disabled={loadingCampaigns}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            >
              <option value="">-- Select Campaign (Optional) --</option>
              {campaigns.map((campaign) => (
                <option key={campaign} value={campaign}>
                  {campaign}
                </option>
              ))}
            </select>
            {loadingCampaigns && (
              <p className="text-xs text-foreground/50 mt-1">Loading campaigns...</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground/80 mb-2">Internal Note</label>
            <textarea
              value={form.custom_note}
              onChange={(e) => handleChange('custom_note', e.target.value)}
              rows={3}
              placeholder="Optional note that will be saved on subscription record"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="rounded-2xl border border-border/40 bg-background/30 p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                Margin preview
              </p>
              {marginPreview.amount == null ? (
                <p className="text-sm text-foreground/60">Enter revenue & cost to preview margin</p>
              ) : (
                <div className="flex items-baseline gap-3">
                  <p className={`text-lg font-bold ${marginPreview.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${marginPreview.amount.toFixed(2)}
                  </p>
                  <p className={`text-sm font-semibold ${marginPreview.percent && marginPreview.percent >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {marginPreview.percent !== null ? (marginPreview.percent * 100).toFixed(2) : '0.00'}%
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-foreground bg-foreground/10 hover:bg-foreground/15 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-black bg-accent hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {submitting ? 'Processing…' : 'Add to Queue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
