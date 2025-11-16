// Win Room v2.0 - Seller Detail Drawer
'use client';

import { PeriodFilter } from '@/components/ui/PeriodFilter';
import { formatUSD, formatPercent } from '@/lib/helpers/format';
import type { PeriodKey } from '@/lib/helpers/periods';

export interface SellerDetailData {
  seller: {
    seller_id: string;
    display_name: string;
    email?: string | null;
    role?: string | null;
    is_active: boolean;
  };
  metrics: {
    current: {
      wins: number;
      revenue_usd: number;
      margin_amount_usd: number;
      avg_margin_percent: number;
      leads_assigned?: number;
      conversion_rate?: number;
    };
    previous: {
      wins: number;
      revenue_usd: number;
      margin_amount_usd: number;
      avg_margin_percent: number;
      leads_assigned?: number;
      conversion_rate?: number;
    };
    change: {
      wins: number;
      revenue_usd: number;
      margin_amount_usd: number;
      avg_margin_percent: number;
      leads_assigned?: number;
      conversion_rate?: number;
    };
  };
  sales: Array<{
    subscription_id: number;
    resolved_at: string;
    queue_created_at?: string | null;
    resolved_from?: string | null;
    campaign_name?: string | null;
    customer_name?: string | null;
    customer_email?: string | null;
    revenue_usd: number | null;
    margin_amount_usd: number | null;
    margin_percent: number | null;
    payment_channel?: string | null;
    status?: string | null;
    subs_amount?: number | null;
    currency?: string | null;
  }>;
}

interface SellerDetailPanelProps {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  period: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
  onClose: () => void;
  data: SellerDetailData | null;
  fallbackSeller?: {
    seller_id: string;
    display_name: string;
    email?: string | null;
  };
}

const formatDateTime = (value?: string | null) => {
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

const renderChangeLabel = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return null;
  const arrow = value >= 0 ? '↑' : '↓';
  const tone = value >= 0 ? 'text-emerald-400' : 'text-rose-400';
  return (
    <span className={`text-[11px] font-semibold ${tone}`}>
      {arrow} {Math.abs(value).toFixed(1)}% vs önceki dönem
    </span>
  );
};

export function SellerDetailPanel({
  isOpen,
  loading,
  error,
  period,
  onPeriodChange,
  onClose,
  data,
  fallbackSeller,
}: SellerDetailPanelProps) {
  if (!isOpen) return null;

  const sellerName = data?.seller.display_name || fallbackSeller?.display_name || 'Seller';
  const sellerEmail = data?.seller.email || fallbackSeller?.email || '';
  const metrics = data?.metrics;
  const sales = data?.sales || [];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden border-l border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-foreground/50">Seller Performance</p>
            <h2 className="text-2xl font-semibold text-foreground">{sellerName}</h2>
            {sellerEmail && <p className="text-sm text-foreground/60">{sellerEmail}</p>}
          </div>
          <div className="flex items-center gap-4">
            <PeriodFilter value={period} onChange={onPeriodChange} label="Period" />
            <button
              onClick={onClose}
              className="rounded-full border border-border px-3 py-1 text-sm text-foreground/70 hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>

        {error && (
          <div className="border-b border-rose-500/30 bg-rose-500/10 px-6 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Wins',
                value: metrics?.current.wins ?? 0,
                formatter: (val: number) => val.toString(),
                change: metrics?.change.wins,
                helper: 'Toplam satış adedi',
              },
              {
                label: 'Revenue',
                value: metrics?.current.revenue_usd ?? 0,
                formatter: (val: number) => formatUSD(val),
                change: metrics?.change.revenue_usd,
                helper: 'USD cinsinden gelir',
              },
              {
                label: 'Margin',
                value: metrics?.current.margin_amount_usd ?? 0,
                formatter: (val: number) => formatUSD(val),
                change: metrics?.change.margin_amount_usd,
                helper: 'Net katkı USD',
              },
              {
                label: 'Avg %',
                value: (metrics?.current.avg_margin_percent ?? 0) * 100,
                formatter: (val: number) => formatPercent(val),
                change: metrics?.change.avg_margin_percent,
                helper: 'Ortalama marj',
              },
              {
                label: 'Assigned Leads',
                value: metrics?.current.leads_assigned ?? 0,
                formatter: (val: number) => val.toString(),
                change: metrics?.change.leads_assigned,
                helper: 'Pipedrive üzerinden gelen lead sayısı',
              },
              {
                label: 'Conversion',
                value: (metrics?.current.conversion_rate ?? 0) * 100,
                formatter: (val: number) => formatPercent(val),
                change: metrics?.change.conversion_rate,
                helper: 'Wins / Leads oranı',
              },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.4em] text-foreground/40">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{card.formatter(card.value)}</p>
                {renderChangeLabel(card.change)}
                <p className="text-xs text-foreground/50 mt-1">{card.helper}</p>
              </div>
            ))}
          </div>

          {/* Sales list */}
          <div className="rounded-2xl border border-border bg-background/60">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Sales ({sales.length})</p>
                <p className="text-xs text-foreground/50">Seçilen dönemdeki satışlar</p>
              </div>
            </div>
            <div className="max-h-[480px] overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-sm text-foreground/50">
                  Loading performance...
                </div>
              ) : sales.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-foreground/50">
                  Bu periyotta satış bulunamadı.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-surface/80 text-xs uppercase tracking-widest text-foreground/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Subscription</th>
                      <th className="px-4 py-3 text-left font-medium">Queue Date</th>
                      <th className="px-4 py-3 text-left font-medium">Claim Date</th>
                      <th className="px-4 py-3 text-left font-medium">Customer</th>
                      <th className="px-4 py-3 text-left font-medium">Package</th>
                      <th className="px-4 py-3 text-right font-medium">Revenue</th>
                      <th className="px-4 py-3 text-right font-medium">Margin</th>
                      <th className="px-4 py-3 text-right font-medium">Margin %</th>
                      <th className="px-4 py-3 text-left font-medium">Channel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {sales.map((sale) => (
                      <tr key={sale.subscription_id} className="hover:bg-surface/40">
                        <td className="px-4 py-3 font-mono text-xs text-foreground/80">
                          #{sale.subscription_id}
                        </td>
                        <td className="px-4 py-3 text-foreground/80">
                          <div className="text-sm font-medium text-sky-300">
                            {formatDateTime(sale.queue_created_at)}
                          </div>
                          <div className="text-xs text-foreground/50">
                            (Lead kuyruğa girdi)
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground/80">
                          <div className="text-sm">
                            {formatDateTime(sale.resolved_at)}
                          </div>
                          <div className="text-xs text-foreground/50">
                            (Claim edildi)
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-foreground text-sm">
                            {sale.customer_name || '—'}
                          </div>
                          <div className="text-xs text-foreground/50">
                            {sale.customer_email || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground/80">{sale.campaign_name || '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-accent">
                          {sale.revenue_usd != null ? formatUSD(sale.revenue_usd) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-300">
                          {sale.margin_amount_usd != null ? formatUSD(sale.margin_amount_usd) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-foreground/80">
                          {sale.margin_percent != null ? formatPercent(sale.margin_percent * 100) : '—'}
                        </td>
                        <td className="px-4 py-3 text-foreground/70">
                          {sale.payment_channel || sale.resolved_from || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
