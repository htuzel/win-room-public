// Win Room v2.0 - Queue Finance Approval Modal
'use client';

import { useState, useEffect } from 'react';
import { InstallmentPlanBuilder } from '@/components/installments/InstallmentPlanBuilder';

interface QueueFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any | null;
  token: string | null;
  onSuccess?: () => void;
}

type FinanceStatus = 'waiting' | 'approved' | 'installment' | 'problem';

export function QueueFinanceModal({
  isOpen,
  onClose,
  item,
  token,
  onSuccess,
}: QueueFinanceModalProps) {
  const [formData, setFormData] = useState<{
    finance_status: FinanceStatus;
    finance_notes: string;
    installment_count?: number;
    installment_plan_id?: number | null;
  }>({
    finance_status: 'waiting',
    finance_notes: '',
    installment_count: undefined,
    installment_plan_id: undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        finance_status: item.finance_status || 'waiting',
        finance_notes: item.finance_notes || '',
        installment_count: item.installment_count,
        installment_plan_id: item.installment_plan_id,
      });
    }
  }, [item]);

  const handlePlanLinked = (payload: { planId: number; installmentCount: number }) => {
    setFormData((prev) => ({
      ...prev,
      installment_plan_id: payload.planId,
      installment_count: payload.installmentCount,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !token) return;

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/queue/${item.id}/finance`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
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

  if (!isOpen || !item) return null;
  const activePlanId = formData.installment_plan_id || item.installment_plan_id;

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
          Finance Approval - Queue #{item.id}
        </h2>

        <div className="mb-6 space-y-3 rounded-lg border border-border/50 bg-surface/50 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/40">
                Subscription ID
              </p>
              <p className="font-semibold text-foreground">#{item.subscription_id}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/40">
                Customer
              </p>
              <p className="font-semibold text-foreground">
                {item.customer_name || item.customer_email || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/40">
                Campaign
              </p>
              <p className="font-semibold text-foreground">
                {item.campaign_name || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/40">
                Payment Channel
              </p>
              <p className="font-semibold text-foreground">
                {item.payment_channel || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/40">
                Revenue (USD)
              </p>
              <p className="font-semibold text-foreground">
                ${typeof item.revenue_usd === 'number' ? item.revenue_usd.toFixed(2) : '0.00'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-foreground/40">
                Margin
              </p>
              <p className="font-semibold text-foreground">
                {typeof item.margin_percent === 'number' ? `${(item.margin_percent * 100).toFixed(1)}%` : '—'}
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
                <label className="text-sm font-semibold text-foreground">Taksit Bilgisi</label>
                {activePlanId && (
                  <a
                    className="text-xs font-semibold text-accent underline"
                    href={`/admin/installments?plan=${activePlanId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Planı Görüntüle #{activePlanId}
                  </a>
                )}
              </div>
              <label className="text-xs font-semibold text-foreground/70">
                Taksit Sayısı
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
                  subscriptionId={item.subscription_id}
                  token={token}
                  defaultCustomerName={item.customer_name}
                  defaultCustomerEmail={item.customer_email}
                  onPlanCreated={handlePlanLinked}
                />
              )}

              {!token && (
                <p className="text-xs text-rose-400">
                  Token bulunamadı; plan oluşturmak için sayfayı yenileyin.
                </p>
              )}
            </div>
          )}

          {item.finance_approved_at && (
            <div className="rounded-lg border border-border/50 bg-surface/30 p-3 text-xs text-foreground/60">
              <p>
                Last updated:{' '}
                {new Date(item.finance_approved_at).toLocaleString('tr-TR')}
              </p>
              {item.finance_approved_by && <p>By: {item.finance_approved_by}</p>}
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
      </div>
    </div>
  );
}
