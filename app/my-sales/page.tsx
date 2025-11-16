// Win Room v2.0 - My Sales Page (Seller's own claims)
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { RecentSaleCard } from '@/components/sales/RecentSaleCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/lib/hooks/useSocket';
import { useReactions } from '@/lib/hooks/useReactions';
import { formatUSD, formatPercent } from '@/lib/helpers/format';

interface MySale {
  id: number;
  subscription_id: number;
  claimed_by: string;
  claim_type: string;
  claimed_at: string;
  customer_name?: string;
  customer_email?: string;
  campaign_name?: string;
  revenue_usd?: number;
  margin_amount_usd?: number;
  margin_percent?: number;
  payment_channel?: string;
  sales_person?: string;
  subscription_created_at?: string;
  tts?: string;
  has_objection: boolean;
  objection_status?: string;
}

interface SalesStats {
  total_sales: number;
  total_revenue: number;
  total_margin: number;
  avg_margin_percent: number;
}

export default function MySalesPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const { socket } = useSocket(token);
  const [sales, setSales] = useState<MySale[]>([]);
  const [stats, setStats] = useState<SalesStats>({ total_sales: 0, total_revenue: 0, total_margin: 0, avg_margin_percent: 0 });
  const [loading, setLoading] = useState(true);
  const [emailFilter, setEmailFilter] = useState('');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, totalCount: 0, totalPages: 0 });

  const {
    summaries: claimReactionMap,
    fetchReactions: fetchClaimReactions,
    toggleReaction: toggleClaimReaction,
  } = useReactions('claim', token, socket);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Debounce email filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmail(emailFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [emailFilter]);

  // Fetch my sales
  const fetchMySales = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        my_sales_only: 'true',
        page: page.toString(),
        limit: '50',
      });
      if (debouncedEmail) {
        params.append('email', debouncedEmail);
      }

      const res = await fetch(`/api/sales/recent?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const salesData = data.sales || [];
        setSales(salesData);

        if (data.pagination) {
          setPagination(data.pagination);
        }

        // Calculate stats from current page
        const totalRevenue = salesData.reduce((sum: number, sale: MySale) => sum + (sale.revenue_usd || 0), 0);
        const totalMargin = salesData.reduce((sum: number, sale: MySale) => sum + (sale.margin_amount_usd || 0), 0);
        const avgMarginPercent = salesData.length > 0
          ? salesData.reduce((sum: number, sale: MySale) => sum + (sale.margin_percent || 0), 0) / salesData.length
          : 0;

        setStats({
          total_sales: data.pagination?.totalShare ?? data.pagination?.totalCount ?? salesData.length,
          total_revenue: totalRevenue,
          total_margin: totalMargin,
          avg_margin_percent: avgMarginPercent,
        });

        const ids = salesData.map((sale: MySale) => sale.id).filter((id) => Number.isFinite(id));
        if (ids.length) {
          fetchClaimReactions(ids);
        }
      }
    } catch (error) {
      console.error('Failed to fetch my sales:', error);
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedEmail, fetchClaimReactions]);

  useEffect(() => {
    fetchMySales();
  }, [fetchMySales]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedEmail]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/60 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header with Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/flalingoLogo.webp"
              alt="Flalingo"
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Win Room</h1>
              <p className="text-sm text-accent font-medium">Built for ⚡ Challenge</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-foreground mb-1">
                {user?.seller_id}
              </div>
              <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded capitalize">
                {user?.role}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-surface border border-border text-foreground font-medium rounded-lg hover:bg-background transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push('/recent-sales')}
              className="px-4 py-2 bg-surface border border-border text-foreground font-medium rounded-lg hover:bg-background transition-colors"
            >
              All Sales (120h)
            </button>
            <button
              onClick={() => router.push('/installments')}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-400/40 font-medium rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              Installments
            </button>
            {['admin', 'finance', 'sales_lead'].includes(user?.role || '') && (
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 bg-accent text-black font-medium rounded-lg hover:bg-accent-hover transition-colors"
              >
                Admin
              </button>
            )}
          </div>
        </div>

        {/* Page Title & Stats */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">My Sales</h2>
          <p className="text-foreground/60 mb-4">
            All sales you claimed (in chronological order).
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="rounded-2xl border border-border/40 bg-surface/60 p-5">
              <p className="text-xs uppercase tracking-widest text-foreground/50 mb-2">Total Sales</p>
              <p className="text-3xl font-bold text-foreground">{stats.total_sales}</p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-surface/60 p-5">
              <p className="text-xs uppercase tracking-widest text-foreground/50 mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-success">{formatUSD(stats.total_revenue)}</p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-surface/60 p-5">
              <p className="text-xs uppercase tracking-widest text-foreground/50 mb-2">Total Margin</p>
              <p className="text-3xl font-bold text-emerald-300">{formatUSD(stats.total_margin)}</p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-surface/60 p-5">
              <p className="text-xs uppercase tracking-widest text-foreground/50 mb-2">Avg Margin %</p>
              <p className="text-3xl font-bold text-accent">{formatPercent(stats.avg_margin_percent)}</p>
            </div>
          </div>
        </div>

        {/* Email Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search by customer email or name..."
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-4 py-2 pl-10 text-foreground placeholder-foreground/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40">
              🔍
            </span>
          </div>
        </div>

        {/* Sales List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        ) : sales.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-surface/90 p-12 text-center">
            <p className="text-lg text-foreground/60">
              {emailFilter ? 'No sales matching filter found.' : 'No claimed sales found yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {sales.map((sale) => (
                  <RecentSaleCard
                    key={sale.id}
                    sale={sale}
                    onObjection={() => {}} // No objection for own sales
                    currentUserId={user.seller_id}
                    disabled={true} // Disable objection button
                    reactions={claimReactionMap[sale.id]}
                    onReact={(emoji) => toggleClaimReaction(sale.id, emoji)}
                    hideObjectionButton={true}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between rounded-2xl border border-border/60 bg-surface/90 p-4">
                <div className="text-sm text-foreground/60">
                  Page {pagination.page} / {pagination.totalPages} ({pagination.totalCount} total sales)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg border border-border bg-surface text-foreground font-medium hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="px-4 py-2 rounded-lg border border-border bg-surface text-foreground font-medium hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
