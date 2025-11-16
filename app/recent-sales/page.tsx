// Win Room v2.0 - Recent Sales Page (Last 72 hours)
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { RecentSaleCard } from '@/components/sales/RecentSaleCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/lib/hooks/useSocket';
import { useReactions } from '@/lib/hooks/useReactions';

interface RecentSale {
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

export default function RecentSalesPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const { socket } = useSocket(token);
  const [sales, setSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailFilter, setEmailFilter] = useState('');
  const [debouncedEmail, setDebouncedEmail] = useState('');
  const [objectionModalOpen, setObjectionModalOpen] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<number | null>(null);
  const [objectionReason, setObjectionReason] = useState('');
  const [submittingObjection, setSubmittingObjection] = useState(false);

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

  // Fetch recent sales
  const fetchSales = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedEmail) {
        params.append('email', debouncedEmail);
      }

      const res = await fetch(`/api/sales/recent?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSales(data);
        const ids = data.map((sale: RecentSale) => sale.id).filter((id) => Number.isFinite(id));
        if (ids.length) {
          fetchClaimReactions(ids);
        }
      }
    } catch (error) {
      console.error('Failed to fetch recent sales:', error);
    } finally {
      setLoading(false);
    }
  }, [token, debouncedEmail, fetchClaimReactions]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleObjection = (subscriptionId: number) => {
    setSelectedSubscriptionId(subscriptionId);
    setObjectionModalOpen(true);
  };

  const submitObjection = async () => {
    if (!token || !selectedSubscriptionId || !objectionReason.trim()) return;

    try {
      setSubmittingObjection(true);
      const res = await fetch('/api/objections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscription_id: selectedSubscriptionId,
          reason: objectionReason.trim(),
        }),
      });

      if (res.ok) {
        setObjectionModalOpen(false);
        setObjectionReason('');
        setSelectedSubscriptionId(null);
        // Refresh sales list
        fetchSales();
      } else {
        const error = await res.json();
        alert(error.error || 'İtiraz gönderilemedi');
      }
    } catch (error) {
      console.error('Objection submission error:', error);
      alert('İtiraz gönderilemedi');
    } finally {
      setSubmittingObjection(false);
    }
  };

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
              className="px-4 py-2 bg-accent text-black font-medium rounded-lg hover:bg-accent-hover transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push('/my-sales')}
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 font-medium rounded-lg hover:bg-emerald-500/30 transition-colors"
            >
              Benim Satışlarım
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

        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">Son 120 Saat Satışlar</h2>
          <p className="text-foreground/60">
            Claim edilmiş tüm satışlar. İtiraz etmek için butonlara tıklayın.
          </p>
        </div>

        {/* Email Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Email veya isim ile ara..."
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
              {emailFilter ? 'Filtreye uygun satış bulunamadı.' : 'Son 120 saatte satış bulunamadı.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {sales.map((sale) => (
                <RecentSaleCard
                  key={sale.id}
                  sale={sale}
                  onObjection={handleObjection}
                  currentUserId={user.seller_id}
                  disabled={objectionModalOpen}
                  reactions={claimReactionMap[sale.id]}
                  onReact={(emoji) => toggleClaimReaction(sale.id, emoji)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Objection Modal */}
      <AnimatePresence>
        {objectionModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submittingObjection && setObjectionModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 300,
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border/70 bg-surface/90 p-6 shadow-[0_34px_55px_rgba(0,0,0,0.35)] backdrop-blur">
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  İtiraz Et
                </h2>
                <p className="text-sm text-foreground/60 mb-4">
                  Subscription #{selectedSubscriptionId} için itiraz sebebini belirt.
                </p>

                <textarea
                  value={objectionReason}
                  onChange={(e) => setObjectionReason(e.target.value)}
                  placeholder="İtiraz sebebinizi yazın..."
                  className="w-full h-32 rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder-foreground/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                  disabled={submittingObjection}
                />

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setObjectionModalOpen(false);
                      setObjectionReason('');
                      setSelectedSubscriptionId(null);
                    }}
                    disabled={submittingObjection}
                    className="flex-1 px-4 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-background transition-colors disabled:opacity-50"
                  >
                    İptal
                  </button>
                  <button
                    onClick={submitObjection}
                    disabled={submittingObjection || !objectionReason.trim()}
                    className="flex-1 px-4 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingObjection ? 'Gönderiliyor...' : 'Gönder'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
