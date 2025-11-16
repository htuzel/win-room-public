// Win Room v2.0 - Admin Statistics Panel
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConversionLatencyNotice } from '@/components/ui/ConversionLatencyNotice';
import type { PeriodKey } from '@/lib/helpers/periods';

interface AdminStats {
  total_sales: number;
  total_revenue_usd: number;
  total_margin_usd: number;
  original_margin_usd: number;
  total_adjustments_usd: number;
  avg_margin_percent: number;
  total_leads: number | null;
  conversion_rate: number | null;
  previous?: {
    total_sales: number;
    total_revenue_usd: number;
    total_margin_usd: number;
    avg_margin_percent: number;
    total_leads?: number | null;
    conversion_rate?: number | null;
  };
}

interface Seller {
  seller_id: string;
  display_name: string;
  role: string;
}

interface AdminStatsPanelProps {
  token: string | null;
  period?: PeriodKey;
  refreshKey?: number;
}

export function AdminStatsPanel({ token, period = 'today', refreshKey }: AdminStatsPanelProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellerFilter, setSellerFilter] = useState<string[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch sellers for filter
  useEffect(() => {
    if (!token) return;

    const fetchSellers = async () => {
      try {
        // Fetch all sellers with high limit to get everyone
        const params = new URLSearchParams({
          page: '1',
          limit: '1000',
          filter: 'all',
        });
        const res = await fetch(`/api/admin/sellers?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          // Filter to only sales and sales_lead roles
          const salesSellers = data.sellers.filter((s: any) => ['sales', 'sales_lead'].includes(s.role));
          setSellers(salesSellers);
        }
      } catch (error) {
        console.error('Failed to fetch sellers:', error);
      }
    };

    fetchSellers();
  }, [token]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (sellerFilter.length > 0) {
        params.append('seller_ids', sellerFilter.join(','));
      }
      if (period) {
        params.append('period', period);
      }

      const res = await fetch(`/api/admin/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, [token, sellerFilter, period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshKey]);

  const handleSellerFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
    setSellerFilter(selected);
  };

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  if (loading) {
    return <div className="text-center text-foreground/60">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="text-center text-foreground/60">No statistics available</div>;
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-surface/70 p-6 shadow-[0_24px_45px_rgba(0,0,0,0.25)]">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">Sales Statistics</h2>
          <p className="text-xs text-foreground/50">
            Showing totals for {sellerFilter.length > 0 ? `${sellerFilter.length} selected seller(s)` : 'all sellers'}.
          </p>
        </div>
        {sellers.length > 0 && (
          <button
            onClick={() => setShowFilter((prev) => !prev)}
            className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-foreground/70 hover:border-accent hover:text-accent transition"
          >
            {showFilter ? 'Hide Filter' : 'Filter Sellers'}
          </button>
        )}
      </div>

      {showFilter && (
        <div className="mb-6 rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-[0.35em] text-foreground/40">
              Filter by seller (optional)
            </label>
            {sellerFilter.length > 0 && (
              <button
                onClick={() => setSellerFilter([])}
                className="text-xs font-semibold text-accent hover:text-accent/80"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <select
              multiple
              value={sellerFilter}
              onChange={handleSellerFilterChange}
              className="w-full max-w-sm rounded-lg border border-border bg-background/80 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              size={Math.min(4, Math.max(sellers.length, 1))}
            >
              {sellers.map((seller) => (
                <option key={seller.seller_id} value={seller.seller_id}>
                  {seller.display_name || seller.seller_id} {seller.role === 'sales_lead' ? '(Lead)' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-foreground/50">
              Hold Ctrl/Cmd for multi-select. Leave empty for all sellers.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Sales */}
        <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
          <p className="text-xs uppercase tracking-[0.45em] text-foreground/40">Total Sales</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.total_sales}</p>
          {stats.previous && (
            <p
              className={`text-xs font-semibold mt-1 ${
                stats.total_sales >= stats.previous.total_sales ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {stats.total_sales >= stats.previous.total_sales ? '↑' : '↓'}{' '}
              {Math.abs(calculateChange(stats.total_sales, stats.previous.total_sales)).toFixed(1)}% vs
              previous period
            </p>
          )}
        </div>

        {/* Total Revenue */}
        <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
          <p className="text-xs uppercase tracking-[0.45em] text-foreground/40">Total Revenue</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {currencyFormatter.format(stats.total_revenue_usd)}
          </p>
          {stats.previous && (
            <p
              className={`text-xs font-semibold mt-1 ${
                stats.total_revenue_usd >= stats.previous.total_revenue_usd
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {stats.total_revenue_usd >= stats.previous.total_revenue_usd ? '↑' : '↓'}{' '}
              {Math.abs(
                calculateChange(stats.total_revenue_usd, stats.previous.total_revenue_usd)
              ).toFixed(1)}
              % vs previous period
            </p>
          )}
        </div>

        {/* Total Margin (Adjusted) */}
        <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
          <p className="text-xs uppercase tracking-[0.45em] text-foreground/40">Total Margin</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {currencyFormatter.format(stats.total_margin_usd)}
          </p>
          {stats.total_adjustments_usd > 0 && (
            <p className="text-xs text-amber-300 mt-1">
              After {currencyFormatter.format(stats.total_adjustments_usd)} adjustments
            </p>
          )}
          {stats.previous && (
            <p
              className={`text-xs font-semibold mt-1 ${
                stats.total_margin_usd >= stats.previous.total_margin_usd
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {stats.total_margin_usd >= stats.previous.total_margin_usd ? '↑' : '↓'}{' '}
              {Math.abs(calculateChange(stats.total_margin_usd, stats.previous.total_margin_usd)).toFixed(
                1
              )}
              % vs previous period
            </p>
          )}
        </div>

        {/* Avg Margin % */}
        <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
          <p className="text-xs uppercase tracking-[0.45em] text-foreground/40">Avg Margin %</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {(stats.avg_margin_percent * 100).toFixed(1)}%
          </p>
          {stats.previous && (
            <p
              className={`text-xs font-semibold mt-1 ${
                stats.avg_margin_percent >= stats.previous.avg_margin_percent
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {stats.avg_margin_percent >= stats.previous.avg_margin_percent ? '↑' : '↓'}{' '}
              {Math.abs(
                calculateChange(stats.avg_margin_percent, stats.previous.avg_margin_percent)
              ).toFixed(1)}
              % vs previous period
            </p>
          )}
        </div>

        {/* Lead Assignments */}
        <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
          <p className="text-xs uppercase tracking-[0.45em] text-foreground/40">Assigned Leads</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.total_leads ?? '—'}</p>
          {stats.previous && stats.previous.total_leads !== undefined && (
            <p
              className={`text-xs font-semibold mt-1 ${
                (stats.total_leads || 0) >= (stats.previous.total_leads || 0)
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {(stats.total_leads || 0) >= (stats.previous.total_leads || 0) ? '↑' : '↓'}{' '}
              {Math.abs(
                calculateChange(stats.total_leads || 0, stats.previous.total_leads || 0)
              ).toFixed(1)}
              % vs previous period
            </p>
          )}
        </div>

        {/* Conversion Rate */}
        <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-[0.45em] text-foreground/40">Conversion</p>
            <ConversionLatencyNotice />
          </div>
          <p className="mt-2 text-2xl font-bold text-accent">
            {stats.conversion_rate != null ? (stats.conversion_rate * 100).toFixed(1) : '—'}%
          </p>
          {stats.previous && stats.previous.conversion_rate !== undefined && (
            <p
              className={`text-xs font-semibold mt-1 ${
                (stats.conversion_rate || 0) >= (stats.previous.conversion_rate || 0)
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {(stats.conversion_rate || 0) >= (stats.previous.conversion_rate || 0) ? '↑' : '↓'}{' '}
              {Math.abs(
                calculateChange(
                  stats.conversion_rate || 0,
                  stats.previous.conversion_rate || 0
                )
              ).toFixed(1)}
              % vs previous period
            </p>
          )}
        </div>
      </div>

      {/* Adjustments Impact (if any) */}
      {stats.total_adjustments_usd > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <h3 className="text-sm font-semibold text-amber-300 mb-2">Adjustments Impact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-foreground/60">Original Margin</p>
              <p className="text-lg font-bold text-foreground">
                {currencyFormatter.format(stats.original_margin_usd)}
              </p>
            </div>
            <div>
              <p className="text-foreground/60">Total Adjustments</p>
              <p className="text-lg font-bold text-rose-400">
                -{currencyFormatter.format(stats.total_adjustments_usd)}
              </p>
            </div>
            <div>
              <p className="text-foreground/60">Final Margin</p>
              <p className="text-lg font-bold text-emerald-400">
                {currencyFormatter.format(stats.total_margin_usd)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
