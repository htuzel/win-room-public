// Win Room v2.0 - Seller Management Panel
'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatUSD, formatPercent } from '@/lib/helpers/format';
import { SellerDetailPanel, type SellerDetailData } from './SellerDetailPanel';
import type { PeriodKey } from '@/lib/helpers/periods';

interface SellerSummary {
  seller_id: string;
  display_name: string;
  email?: string | null;
  role?: string | null;
  pipedrive_owner_id?: string | null;
  is_active: boolean;
  total_sales: number;
  total_revenue_usd: number;
  total_cost_usd: number;
  total_margin_usd: number;
  avg_margin_percent: number;
  campaigns?: string | null;
  total_leads?: number;
  conversion_rate?: number;
}

interface SellerManagerProps {
  token: string | null;
}

export function SellerManager({ token }: SellerManagerProps) {
  const [sellers, setSellers] = useState<SellerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [sellerDetailPeriod, setSellerDetailPeriod] = useState<PeriodKey>('today');
  const [sellerDetailData, setSellerDetailData] = useState<SellerDetailData | null>(null);
  const [sellerDetailLoading, setSellerDetailLoading] = useState(false);
  const [sellerDetailError, setSellerDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchSellers = async () => {
      setLoading(true);
      try {
        // Fetch all sellers with high limit
        const params = new URLSearchParams({
          page: '1',
          limit: '1000',
          filter: 'all',
        });
        const res = await fetch(`/api/admin/sellers?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error('Failed to load sellers');
        }
        const data = await res.json();
        // API now returns { sellers: [], pagination: {} }
        setSellers(data.sellers || []);
      } catch (error) {
        console.error('Sellers fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellers();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedSellerId) return;

    let cancelled = false;

    const fetchPerformance = async () => {
      setSellerDetailLoading(true);
      setSellerDetailError(null);
      try {
        const res = await fetch(
          `/api/admin/sellers/${selectedSellerId}/performance?period=${sellerDetailPeriod}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload?.error || 'Failed to load performance');
        }

        if (!cancelled) {
          setSellerDetailData(payload);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Seller performance error:', error);
          setSellerDetailError(
            error instanceof Error ? error.message : 'Failed to load performance'
          );
        }
      } finally {
        if (!cancelled) {
          setSellerDetailLoading(false);
        }
      }
    };

    fetchPerformance();
    return () => {
      cancelled = true;
    };
  }, [token, selectedSellerId, sellerDetailPeriod]);

  const filteredSellers = useMemo(() => {
    if (!search.trim()) return sellers;
    const term = search.toLowerCase();
    return sellers.filter(
      (seller) =>
        seller.display_name?.toLowerCase().includes(term) ||
        seller.seller_id.toLowerCase().includes(term) ||
        (seller.email || '').toLowerCase().includes(term)
    );
  }, [sellers, search]);

  const selectedSeller = selectedSellerId
    ? sellers.find((seller) => seller.seller_id === selectedSellerId)
    : null;

  const handleOpenDetail = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    setSellerDetailPeriod('today');
    setSellerDetailData(null);
    setSellerDetailError(null);
  };

  const handleCloseDetail = () => {
    setSelectedSellerId(null);
    setSellerDetailData(null);
    setSellerDetailError(null);
  };

  return (
    <div className="rounded-3xl border border-border/60 bg-surface/70 p-6 shadow-[0_24px_45px_rgba(0,0,0,0.25)]">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Sales Team Performance</h2>
          <p className="text-sm text-foreground/60">
            Tüm satışçıların toplam performansı ve detaylı inceleme.
          </p>
        </div>
        <input
          type="text"
          placeholder="Search seller..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent md:w-72"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-foreground/60">Loading sellers...</div>
      ) : filteredSellers.length === 0 ? (
        <div className="py-12 text-center text-foreground/60">No sellers found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSellers.map((seller) => (
            <div
              key={seller.seller_id}
              className="rounded-2xl border border-border/50 bg-background/70 p-5 transition hover:border-accent/50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{seller.display_name}</h3>
                  <p className="text-xs text-foreground/50">ID: {seller.seller_id}</p>
                  <p className="text-xs text-foreground/50">
                    Pipedrive Owner: {seller.pipedrive_owner_id || '—'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    seller.is_active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {seller.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border/40 bg-surface/60 p-3">
                  <p className="text-xs uppercase tracking-widest text-foreground/40">Sales</p>
                  <p className="text-xl font-semibold text-foreground">{seller.total_sales || 0}</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-surface/60 p-3">
                  <p className="text-xs uppercase tracking-widest text-foreground/40">Revenue</p>
                  <p className="text-xl font-semibold text-accent">
                    {formatUSD(seller.total_revenue_usd || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/40 bg-surface/60 p-3">
                  <p className="text-xs uppercase tracking-widest text-foreground/40">Margin</p>
                  <p className="text-xl font-semibold text-emerald-300">
                    {formatUSD(seller.total_margin_usd || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/40 bg-surface/60 p-3">
                  <p className="text-xs uppercase tracking-widest text-foreground/40">Avg %</p>
                  <p className="text-xl font-semibold text-foreground">
                    {formatPercent((seller.avg_margin_percent || 0) * 100)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/40 bg-surface/60 p-3">
                  <p className="text-xs uppercase tracking-widest text-foreground/40">Leads</p>
                  <p className="text-xl font-semibold text-foreground">
                    {seller.total_leads || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-border/40 bg-surface/60 p-3">
                  <p className="text-xs uppercase tracking-widest text-foreground/40">Conversion</p>
                  <p className="text-xl font-semibold text-accent">
                    {formatPercent((seller.conversion_rate || 0) * 100)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleOpenDetail(seller.seller_id)}
                className="mt-4 w-full rounded-lg bg-accent/20 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/30 transition"
              >
                View Performance
              </button>
            </div>
          ))}
        </div>
      )}

      <SellerDetailPanel
        isOpen={Boolean(selectedSellerId)}
        loading={sellerDetailLoading}
        error={sellerDetailError}
        period={sellerDetailPeriod}
        onPeriodChange={setSellerDetailPeriod}
        onClose={handleCloseDetail}
        data={sellerDetailData}
        fallbackSeller={
          selectedSeller
            ? {
                seller_id: selectedSeller.seller_id,
                display_name: selectedSeller.display_name,
                email: selectedSeller.email,
              }
            : undefined
        }
      />
    </div>
  );
}
