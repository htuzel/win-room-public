// Win Room v2.0 - Claim Share Allocation Modal
'use client';

import { useEffect, useMemo, useState } from 'react';

interface SellerOption {
  seller_id: string;
  display_name: string;
}

interface SellersResponse {
  sellers?: Array<{
    seller_id: string;
    display_name?: string | null;
  }>;
}

export interface ClaimShareTarget {
  id: number;
  subscription_id: number;
  closer_seller_id?: string | null;
  closer_name?: string | null;
  closer_share_percent?: number | null;
  assisted_seller_id?: string | null;
  assisted_name?: string | null;
  assisted_share_percent?: number | null;
}

interface ClaimShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: ClaimShareTarget | null;
  token: string | null;
  onSuccess?: () => void;
}

const clampDecimal = (value: number | null | undefined, fallback: number) => {
  const base = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Number(Math.min(1, Math.max(0, base)).toFixed(4));
};

const percentFromDecimal = (decimal: number) =>
  Math.round(Math.min(1, Math.max(0, decimal)) * 10000) / 100;

const decimalFromPercent = (percent: number) =>
  Number.isFinite(percent) ? Number(Math.min(100, Math.max(0, percent)) / 100) : 0;

export function ClaimShareModal({
  isOpen,
  onClose,
  claim,
  token,
  onSuccess,
}: ClaimShareModalProps) {
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    closer_seller_id: string;
    assisted_seller_id: string | null;
    closer_share_percent: number;
    assisted_share_percent: number;
  }>({
    closer_seller_id: '',
    assisted_seller_id: null,
    closer_share_percent: 1,
    assisted_share_percent: 0,
  });

  useEffect(() => {
    if (!claim) return;
    setFormData({
      closer_seller_id: claim.closer_seller_id || '',
      assisted_seller_id: claim.assisted_seller_id || null,
      closer_share_percent: clampDecimal(claim.closer_share_percent, 1),
      assisted_share_percent: clampDecimal(claim.assisted_share_percent, 0),
    });
    setError(null);
  }, [claim]);

  useEffect(() => {
    if (!isOpen || !token || sellers.length > 0) return;

    setLoadingSellers(true);
    fetch('/api/admin/sellers?page=1&limit=1000&filter=active', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json() as Promise<SellersResponse>)
      .then((data) => {
        if (Array.isArray(data?.sellers)) {
          setSellers(
            data.sellers.map((seller) => ({
              seller_id: seller.seller_id,
              display_name: seller.display_name || seller.seller_id,
            }))
          );
        }
      })
      .catch((err) => {
        console.error('Share modal seller fetch failed:', err);
        setError('Satıcı listesi alınamadı. Yine de manuel ID girerek kaydedebilirsin.');
      })
      .finally(() => setLoadingSellers(false));
  }, [isOpen, token, sellers.length]);

  const hasAssisted = Boolean(formData.assisted_seller_id);
  const closerPercent = percentFromDecimal(formData.closer_share_percent);
  const assistedPercent = hasAssisted ? percentFromDecimal(formData.assisted_share_percent) : 0;
  const totalPercent = Math.round(
    (formData.closer_share_percent + formData.assisted_share_percent) * 10000
  ) / 100;
  const isBalanced =
    Math.abs(formData.closer_share_percent + formData.assisted_share_percent - 1) < 0.001;

  const closerOptions = useMemo(() => {
    const options = sellers.map((seller) => (
      <option key={seller.seller_id} value={seller.seller_id}>
        {seller.display_name}
      </option>
    ));
    if (
      claim?.closer_seller_id &&
      !sellers.some((s) => s.seller_id === claim.closer_seller_id)
    ) {
      options.unshift(
        <option key={claim.closer_seller_id} value={claim.closer_seller_id}>
          {claim.closer_name || claim.closer_seller_id}
        </option>
      );
    }
    return options;
  }, [sellers, claim?.closer_seller_id, claim?.closer_name]);

  const assistedOptions = useMemo(() => {
    const options = sellers.map((seller) => (
      <option key={seller.seller_id} value={seller.seller_id}>
        {seller.display_name}
      </option>
    ));
    if (
      claim?.assisted_seller_id &&
      !sellers.some((s) => s.seller_id === claim.assisted_seller_id)
    ) {
      options.unshift(
        <option key={claim.assisted_seller_id} value={claim.assisted_seller_id}>
          {claim.assisted_name || claim.assisted_seller_id}
        </option>
      );
    }
    return options;
  }, [sellers, claim?.assisted_seller_id, claim?.assisted_name]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!claim || !token) return;

    setSaving(true);
    setError(null);

    try {
      const assistedShare = hasAssisted
        ? clampDecimal(formData.assisted_share_percent, 0)
        : 0;
      const closerShare = hasAssisted
        ? Number((1 - assistedShare).toFixed(4))
        : 1;

      const payload = {
        closer_seller_id: formData.closer_seller_id || null,
        assisted_seller_id: formData.assisted_seller_id || null,
        closer_share_percent: closerShare,
        assisted_share_percent: assistedShare,
      };

      const res = await fetch(`/api/admin/claims/${claim.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Paylaşım güncellenemedi');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Share update failed:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !claim) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground"
        >
          Close
        </button>

        <header className="pb-4">
          <p className="text-xs uppercase tracking-[0.35em] text-foreground/50">
            Split Sale
          </p>
          <h3 className="text-2xl font-semibold text-foreground">
            Subscription #{claim.subscription_id}
          </h3>
          <p className="mt-1 text-sm text-foreground/60">
            Closer ve assisted satıcı arasında kazanımı böl.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="rounded-lg border border-border/50 bg-background/40 p-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground/60">
              Closer (Primary)
            </label>
            <select
              value={formData.closer_seller_id}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, closer_seller_id: e.target.value }))
              }
              disabled={loadingSellers}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            >
              <option value="">-- Select Closer --</option>
              {closerOptions}
            </select>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-foreground/70">
                Closer Share %
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={closerPercent}
                onChange={(e) => {
                  const decimal = decimalFromPercent(parseFloat(e.target.value));
                  setFormData((prev) => ({
                    ...prev,
                    closer_share_percent: decimal,
                    assisted_share_percent: prev.assisted_seller_id
                      ? Number((1 - decimal).toFixed(4))
                      : 0,
                  }));
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <p className="mt-1 text-xs text-foreground/50">
                {closerPercent.toFixed(2)}%
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-border/50 bg-background/40 p-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground/60">
              Assisted (Secondary)
            </label>
            <select
              value={formData.assisted_seller_id || ''}
              onChange={(e) => {
                const selected = e.target.value;
                if (!selected) {
                  setFormData((prev) => ({
                    ...prev,
                    assisted_seller_id: null,
                    assisted_share_percent: 0,
                    closer_share_percent: 1,
                  }));
                  return;
                }

                setFormData((prev) => {
                  const base = clampDecimal(
                    prev.assisted_share_percent,
                    claim.assisted_share_percent ?? 0
                  );
                  const share = base > 0 && base < 1 ? base : 0.5;
                  return {
                    ...prev,
                    assisted_seller_id: selected,
                    assisted_share_percent: Number(share.toFixed(4)),
                    closer_share_percent: Number((1 - share).toFixed(4)),
                  };
                });
              }}
              disabled={loadingSellers}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            >
              <option value="">-- No Assisted Seller --</option>
              {assistedOptions}
            </select>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-foreground/70">
                Assisted Share %
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={hasAssisted ? assistedPercent : 0}
                onChange={(e) => {
                  const decimal = decimalFromPercent(parseFloat(e.target.value));
                  setFormData((prev) => ({
                    ...prev,
                    assisted_share_percent: hasAssisted ? decimal : 0,
                    closer_share_percent: hasAssisted
                      ? Number((1 - decimal).toFixed(4))
                      : prev.closer_share_percent,
                  }));
                }}
                disabled={!hasAssisted}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-foreground/50">
                {hasAssisted ? assistedPercent.toFixed(2) : '0.00'}%
              </p>
            </div>
          </section>

          <div
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold ${
              isBalanced
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
            }`}
          >
            <span>Total</span>
            <span className="font-mono text-sm">{totalPercent.toFixed(2)}%</span>
            <span>{isBalanced ? '✓ Balanced' : '⚠ 100% olmalı'}</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (!claim) return;
                setFormData({
                  closer_seller_id: claim.closer_seller_id || '',
                  assisted_seller_id: claim.assisted_seller_id || null,
                  closer_share_percent: clampDecimal(claim.closer_share_percent, 1),
                  assisted_share_percent: clampDecimal(claim.assisted_share_percent, 0),
                });
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-foreground/10"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground/70 hover:bg-foreground/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.closer_seller_id || !isBalanced}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent/90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Shares'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-xs text-foreground/40">
          Not: Paylar toplamı 100% olmalıdır. Assisted seller boş bırakılırsa tüm kredi closer kişisine verilir.
        </p>
      </div>
    </div>
  );
}
