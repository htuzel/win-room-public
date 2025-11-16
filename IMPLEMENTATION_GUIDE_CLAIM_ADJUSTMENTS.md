# WIN ROOM v2.0 - CLAIM ADJUSTMENTS IMPLEMENTATION GUIDE

## ✅ TAMAMLANAN İŞLER

### 1. Database Schema & Materialized View ✅
**Dosya**: `scripts/db/06_claim_adjustments.sql`
- ✅ `wr.claim_adjustments` tablosu oluşturuldu
- ✅ `wr.claim_adjustments_latest` view (en son adjustment)
- ✅ `wr.claim_adjustments_total` view (toplam adjustments)
- ✅ `wr.claim_metrics_adjusted` materialized view (adjusted metrics)
- ✅ Trigger fonksiyonu: `notify_adjustment_change()` (auto event)
- ✅ Helper fonksiyon: `refresh_claim_metrics_adjusted()`

### 2. Types Güncelleme ✅
**Dosya**: `lib/types/index.ts`
- ✅ `AdjustmentReason` type eklendi
- ✅ `EventType` → 'claim.adjusted' eklendi
- ✅ `ClaimAdjustment` interface
- ✅ `ClaimWithMetrics` interface
- ✅ `Claim` interface → adjustment fields eklendi
- ✅ `UserMetrics` → original_margin_amount_usd, total_adjustments_usd eklendi
- ✅ `ClaimAdjustmentRequest` interface
- ✅ `AdminStatsFilter` interface

### 3. API Endpoints - Adjustment CRUD ✅
**Dosya**: `app/api/admin/claims/[id]/adjustment/route.ts`
- ✅ POST - Add adjustment (validation + materialized view refresh)
- ✅ DELETE - Remove all adjustments
- ✅ GET - Get adjustment history

### 4. Admin Claims List Query Güncelleme ✅
**Dosya**: `app/api/admin/claims/route.ts`
- ✅ Materialized view JOIN eklendi
- ✅ Adjusted metrics döndürülüyor

---

## 📋 KALAN İMPLEMENTASYONLAR

### 5. Leaderboard Endpoints Güncelleme

#### 5.1 GET /api/leaderboard/margin/route.ts
**Mevcut kod:**
```typescript
const results = await query<any>(`
  SELECT
    a.closer_seller_id as seller_id,
    SUM(sm.margin_amount_usd) as total_margin
  FROM wr.attribution a
  JOIN wr.subscription_metrics sm ON sm.subscription_id = a.subscription_id
  LEFT JOIN wr.refunds r ON r.subscription_id = a.subscription_id
  WHERE a.resolved_at >= $1::date AND r.id IS NULL
  GROUP BY a.closer_seller_id
  HAVING SUM(sm.margin_amount_usd) > 0
  ORDER BY total_margin DESC
`, [startDate]);
```

**YENİ KOD:**
```typescript
const results = await query<any>(`
  SELECT
    a.closer_seller_id as seller_id,
    -- Use adjusted margin if available, fallback to original
    SUM(COALESCE(cma.adjusted_margin_usd, sm.margin_amount_usd)) as total_margin
  FROM wr.attribution a
  JOIN wr.subscription_metrics sm ON sm.subscription_id = a.subscription_id
  LEFT JOIN wr.claim_metrics_adjusted cma ON cma.subscription_id = a.subscription_id
  LEFT JOIN wr.refunds r ON r.subscription_id = a.subscription_id
  WHERE a.resolved_at >= $1::date AND r.id IS NULL
  GROUP BY a.closer_seller_id
  HAVING SUM(COALESCE(cma.adjusted_margin_usd, sm.margin_amount_usd)) > 0
  ORDER BY total_margin DESC
`, [startDate]);
```

---

### 6. GET /api/me/metrics Güncelleme

#### 6.1 Dosya: app/api/me/metrics/route.ts

**Mevcut kod:**
```typescript
const metrics = await queryOne<any>(`
  SELECT
    COUNT(DISTINCT a.subscription_id) as wins,
    COALESCE(SUM(sm.revenue_usd), 0) as revenue_usd,
    COALESCE(SUM(sm.margin_amount_usd), 0) as margin_amount_usd,
    COALESCE(AVG(sm.margin_percent), 0) as avg_margin_percent
  FROM wr.attribution a
  JOIN wr.subscription_metrics sm ON sm.subscription_id = a.subscription_id
  LEFT JOIN wr.refunds r ON r.subscription_id = a.subscription_id
  WHERE a.closer_seller_id = $1
    AND a.resolved_at >= $2::date
    AND r.id IS NULL
`, [user.seller_id, startDate]);
```

**YENİ KOD:**
```typescript
const metrics = await queryOne<any>(`
  SELECT
    COUNT(DISTINCT a.subscription_id) as wins,
    COALESCE(SUM(sm.revenue_usd), 0) as revenue_usd,
    -- Adjusted margin
    COALESCE(SUM(COALESCE(cma.adjusted_margin_usd, sm.margin_amount_usd)), 0) as margin_amount_usd,
    COALESCE(AVG(COALESCE(cma.adjusted_margin_percent, sm.margin_percent)), 0) as avg_margin_percent,
    -- Original margin (before adjustments)
    COALESCE(SUM(sm.margin_amount_usd), 0) as original_margin_amount_usd,
    -- Total adjustments applied
    COALESCE(SUM(cma.total_additional_cost_usd), 0) as total_adjustments_usd
  FROM wr.attribution a
  JOIN wr.subscription_metrics sm ON sm.subscription_id = a.subscription_id
  LEFT JOIN wr.claim_metrics_adjusted cma ON cma.subscription_id = a.subscription_id
  LEFT JOIN wr.refunds r ON r.subscription_id = a.subscription_id
  WHERE a.closer_seller_id = $1
    AND a.resolved_at >= $2::date
    AND r.id IS NULL
`, [user.seller_id, startDate]);
```

**AYNISI PREVIOUS METRICS İÇİN DE YAP** (line ~39-52)

---

### 7. Helper Functions

#### 7.1 Dosya: lib/helpers/adjustments.ts (YENİ DOSYA)

```typescript
// Win Room v2.0 - Claim Adjustments Helper Functions
import { queryOne, query } from '../db/connection';

/**
 * Get adjusted metrics for a specific claim
 */
export async function getClaimAdjustedMetrics(claimId: number) {
  const result = await queryOne<any>(
    `SELECT
      claim_id,
      subscription_id,
      original_margin_usd,
      total_additional_cost_usd,
      adjusted_margin_usd,
      adjusted_margin_percent,
      adjustment_count,
      adjustment_reasons,
      last_adjusted_at
    FROM wr.claim_metrics_adjusted
    WHERE claim_id = $1`,
    [claimId]
  );

  return result;
}

/**
 * Get all adjustments for a claim
 */
export async function getClaimAdjustments(claimId: number) {
  const results = await query<any>(
    `SELECT
      ca.id,
      ca.subscription_id,
      ca.claim_id,
      ca.additional_cost_usd,
      ca.reason,
      ca.notes,
      ca.adjusted_by,
      ca.created_at,
      s.display_name as adjusted_by_name
    FROM wr.claim_adjustments ca
    LEFT JOIN wr.sellers s ON s.seller_id = ca.adjusted_by
    WHERE ca.claim_id = $1
    ORDER BY ca.created_at DESC`,
    [claimId]
  );

  return results;
}

/**
 * Refresh materialized view (call after adjustments)
 */
export async function refreshAdjustedMetrics() {
  await query('REFRESH MATERIALIZED VIEW CONCURRENTLY wr.claim_metrics_adjusted');
}
```

---

### 8. Admin Claims List UI Komponenti

#### 8.1 Dosya: app/admin/page.tsx (YENİ VEYA GÜNCELLE)

```typescript
// Win Room v2.0 - Admin Dashboard
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { ClaimsTable } from '@/components/admin/ClaimsTable';
import { AdminStatsPanel } from '@/components/stats/AdminStatsPanel';

export default function AdminDashboard() {
  const router = useRouter();
  const { token, user, isAuthenticated } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!isAuthenticated || !['admin', 'finance'].includes(user?.role || '')) {
      router.push('/');
    }
  }, [isMounted, isAuthenticated, user, router]);

  if (!isMounted || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background/60 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-background transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Stats Panel */}
        <AdminStatsPanel token={token} />

        {/* Claims Management */}
        <ClaimsTable token={token} />
      </div>
    </div>
  );
}
```

---

#### 8.2 Dosya: components/admin/ClaimsTable.tsx (YENİ)

```typescript
// Win Room v2.0 - Claims Management Table
'use client';

import { useState, useEffect } from 'react';
import { ClaimWithMetrics } from '@/lib/types';
import { AdjustmentModal } from './AdjustmentModal';

interface ClaimsTableProps {
  token: string | null;
}

export function ClaimsTable({ token }: ClaimsTableProps) {
  const [claims, setClaims] = useState<ClaimWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithMetrics | null>(null);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);

  const fetchClaims = async () => {
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/claims?search=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setClaims(data);
      }
    } catch (error) {
      console.error('Failed to fetch claims:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [token, search]);

  const handleAdjustmentClick = (claim: ClaimWithMetrics) => {
    setSelectedClaim(claim);
    setAdjustmentModalOpen(true);
  };

  const handleAdjustmentSuccess = () => {
    setAdjustmentModalOpen(false);
    setSelectedClaim(null);
    fetchClaims(); // Refresh list
  };

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  if (loading) {
    return <div className="text-center text-foreground/60">Loading claims...</div>;
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-surface/70 p-6 shadow-[0_24px_45px_rgba(0,0,0,0.25)]">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Claims Management</h2>
        <input
          type="text"
          placeholder="Search by ID, email, name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Claimed By
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Original Margin
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Adjustments
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Final Margin
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => {
              const hasAdjustments = (claim.adjustment_count || 0) > 0;
              const finalMargin = claim.adjusted_margin_usd ?? claim.original_margin_usd ?? 0;

              return (
                <tr key={claim.id} className="border-b border-border/20 hover:bg-background/40 transition-colors">
                  <td className="px-4 py-3 text-sm text-foreground">{claim.subscription_id}</td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div>{claim.customer_name || 'N/A'}</div>
                    <div className="text-xs text-foreground/50">{claim.customer_email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{claim.claimed_by}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-accent/20 text-accent">
                      {claim.claim_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-foreground">
                    {currencyFormatter.format(claim.original_margin_usd || 0)}
                    <div className="text-xs text-foreground/50">
                      {((claim.original_margin_percent || 0) * 100).toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {hasAdjustments ? (
                      <div>
                        <span className="text-rose-400 font-semibold">
                          -{currencyFormatter.format(claim.total_additional_cost_usd || 0)}
                        </span>
                        <div className="text-xs text-foreground/50">
                          {claim.adjustment_count} adj.
                        </div>
                      </div>
                    ) : (
                      <span className="text-foreground/40">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <span className={hasAdjustments ? 'text-amber-300 font-semibold' : 'text-foreground'}>
                      {currencyFormatter.format(finalMargin)}
                    </span>
                    <div className="text-xs text-foreground/50">
                      {((claim.adjusted_margin_percent || claim.original_margin_percent || 0) * 100).toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleAdjustmentClick(claim)}
                      className="px-3 py-1 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                    >
                      {hasAdjustments ? 'Edit Adj.' : 'Add Adj.'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedClaim && (
        <AdjustmentModal
          isOpen={adjustmentModalOpen}
          onClose={() => {
            setAdjustmentModalOpen(false);
            setSelectedClaim(null);
          }}
          claim={selectedClaim}
          token={token}
          onSuccess={handleAdjustmentSuccess}
        />
      )}
    </div>
  );
}
```

---

### 9. Adjustment Modal Component

#### 9.1 Dosya: components/admin/AdjustmentModal.tsx (YENİ)

```typescript
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
```

---

### 10. Sales Overview - Comparison & User Filter

#### 10.1 Dosya: components/stats/AdminStatsPanel.tsx GÜNCELLEME

**EKLE (yeni state ve filter logic):**

```typescript
const [sellerFilter, setSellerFilter] = useState<string[]>([]);
const [sellers, setSellers] = useState<{ seller_id: string; display_name: string }[]>([]);

// Fetch sellers for filter
useEffect(() => {
  if (!token) return;

  const fetchSellers = async () => {
    try {
      const res = await fetch('/api/admin/sellers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSellers(data);
      }
    } catch (error) {
      console.error('Failed to fetch sellers:', error);
    }
  };

  fetchSellers();
}, [token]);

// Update stats fetch to include filter
const fetchStats = async () => {
  if (!token) return;

  try {
    const params = new URLSearchParams();
    if (sellerFilter.length > 0) {
      params.append('seller_ids', sellerFilter.join(','));
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
  }
};
```

**UI EKLE:**

```typescript
{/* User Filter */}
<div className="mb-4">
  <label className="block text-sm font-medium text-foreground mb-2">
    Filter by Seller (optional)
  </label>
  <select
    multiple
    value={sellerFilter}
    onChange={(e) => {
      const selected = Array.from(e.target.selectedOptions, option => option.value);
      setSellerFilter(selected);
    }}
    className="w-full px-4 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
    size={5}
  >
    <option value="">All Sellers</option>
    {sellers.map((seller) => (
      <option key={seller.seller_id} value={seller.seller_id}>
        {seller.display_name || seller.seller_id}
      </option>
    ))}
  </select>
  <p className="text-xs text-foreground/50 mt-1">
    Hold Ctrl/Cmd to select multiple
  </p>
</div>

{/* Comparison - Show adjustments impact */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
    <p className="text-xs uppercase tracking-[0.45em] text-foreground/40">Total Revenue</p>
    <p className="mt-2 text-2xl font-bold text-foreground">
      ${stats.total_revenue_usd?.toFixed(0) || 0}
    </p>
    {stats.previous && (
      <p className={`text-xs font-semibold ${
        stats.total_revenue_usd >= stats.previous.total_revenue_usd
          ? 'text-emerald-400'
          : 'text-rose-400'
      }`}>
        {stats.total_revenue_usd >= stats.previous.total_revenue_usd ? '↑' : '↓'}
        {' '}
        {Math.abs(
          ((stats.total_revenue_usd - stats.previous.total_revenue_usd) /
            stats.previous.total_revenue_usd) *
            100
        ).toFixed(1)}
        % vs previous period
      </p>
    )}
  </div>

  <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
    <p className="text-xs uppercase tracking-[0.45em] text-foreground/40">Total Margin</p>
    <p className="mt-2 text-2xl font-bold text-foreground">
      ${stats.total_margin_usd?.toFixed(0) || 0}
    </p>
    {stats.total_adjustments_usd > 0 && (
      <p className="text-xs text-amber-300">
        After ${stats.total_adjustments_usd.toFixed(0)} adjustments
      </p>
    )}
    {stats.previous && (
      <p className={`text-xs font-semibold ${
        stats.total_margin_usd >= stats.previous.total_margin_usd
          ? 'text-emerald-400'
          : 'text-rose-400'
      }`}>
        {stats.total_margin_usd >= stats.previous.total_margin_usd ? '↑' : '↓'}
        {' '}
        {Math.abs(
          ((stats.total_margin_usd - stats.previous.total_margin_usd) /
            stats.previous.total_margin_usd) *
            100
        ).toFixed(1)}
        % vs previous period
      </p>
    )}
  </div>

  {/* Similar for other metrics... */}
</div>
```

---

### 11. WebSocket Handler Güncelleme

#### 11.1 Dosya: app/page.tsx EKLE

```typescript
socket.on('claim.adjusted', (data) => {
  console.log('[Event] Claim adjusted', data);

  // Refresh leaderboards and metrics
  fetchLeaderboard();
  fetchRevenueLeaderboard();
  fetchMarginLeaderboard();
  fetchMetrics();

  // Show notification if it's user's claim
  if (data.payload?.claim_owner === user?.seller_id) {
    // Optional: Show toast notification
    console.log(`Your claim adjusted: ${data.payload.reason} (-$${data.payload.additional_cost_usd})`);
  }
});
```

---

### 12. API Endpoint: GET /api/admin/stats (GÜNCELLEME)

#### 12.1 Dosya: app/api/admin/stats/route.ts

**Query'yi filtre ile güncelle:**

```typescript
const { searchParams } = new URL(req.url);
const sellerIds = searchParams.get('seller_ids')?.split(',').filter(Boolean) || [];

// Build WHERE clause for seller filter
const sellerFilter = sellerIds.length > 0
  ? `AND a.closer_seller_id = ANY($2::text[])`
  : '';

const params: any[] = [startDate];
if (sellerIds.length > 0) {
  params.push(sellerIds);
}

const stats = await queryOne<any>(`
  SELECT
    COUNT(DISTINCT a.subscription_id) as total_sales,
    COALESCE(SUM(sm.revenue_usd), 0) as total_revenue_usd,
    -- Use adjusted margin
    COALESCE(SUM(COALESCE(cma.adjusted_margin_usd, sm.margin_amount_usd)), 0) as total_margin_usd,
    COALESCE(SUM(sm.margin_amount_usd), 0) as original_margin_usd,
    COALESCE(SUM(cma.total_additional_cost_usd), 0) as total_adjustments_usd,
    COALESCE(AVG(COALESCE(cma.adjusted_margin_percent, sm.margin_percent)), 0) as avg_margin_percent
  FROM wr.attribution a
  JOIN wr.subscription_metrics sm ON sm.subscription_id = a.subscription_id
  LEFT JOIN wr.claim_metrics_adjusted cma ON cma.subscription_id = a.subscription_id
  LEFT JOIN wr.refunds r ON r.subscription_id = a.subscription_id
  WHERE a.resolved_at >= $1::date
    AND r.id IS NULL
    ${sellerFilter}
`, params);
```

---

## 🚀 IMPLEMENTASYON SIRASI

1. ✅ Database migration çalıştır: `scripts/db/06_claim_adjustments.sql`
2. ✅ Types güncellemesi zaten yapıldı
3. ✅ API endpoints zaten oluşturuldu
4. ⏳ Leaderboard endpoints güncelle (5.1)
5. ⏳ GET /api/me/metrics güncelle (6.1)
6. ⏳ Helper functions ekle (7.1)
7. ⏳ Admin page oluştur (8.1)
8. ⏳ ClaimsTable component (8.2)
9. ⏳ AdjustmentModal component (9.1)
10. ⏳ AdminStatsPanel güncelle (10.1)
11. ⏳ WebSocket handler ekle (11.1)
12. ⏳ Stats API güncelle (12.1)

---

## 🧪 TEST PLANI

1. **Database Test:**
   ```sql
   -- Test adjustment ekleme
   INSERT INTO wr.claim_adjustments (subscription_id, claim_id, additional_cost_usd, reason, adjusted_by)
   VALUES (123, 1, 100, 'commission', 'admin');

   -- View refresh
   REFRESH MATERIALIZED VIEW CONCURRENTLY wr.claim_metrics_adjusted;

   -- Check adjusted metrics
   SELECT * FROM wr.claim_metrics_adjusted WHERE claim_id = 1;
   ```

2. **API Test:**
   ```bash
   # Add adjustment
   curl -X POST http://localhost:3000/api/admin/claims/1/adjustment \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"additional_cost_usd":100,"reason":"commission","notes":"PayPal fee"}'

   # Get adjustments
   curl http://localhost:3000/api/admin/claims/1/adjustment \
     -H "Authorization: Bearer TOKEN"

   # Delete adjustments
   curl -X DELETE http://localhost:3000/api/admin/claims/1/adjustment \
     -H "Authorization: Bearer TOKEN"
   ```

3. **UI Test:**
   - Admin dashboard'a git
   - Claims table'da adjustment olmayan bir claim seç
   - "Add Adj." butonuna tıkla
   - Adjustment ekle
   - Liste'nin refresh olduğunu doğrula
   - Leaderboard'da değişikliği gör
   - My metrics'te adjustment'ın yansıdığını doğrula

4. **WebSocket Test:**
   - İki farklı browser tab aç
   - Birinde admin olarak adjustment ekle
   - Diğer tab'da leaderboard'ın otomatik güncellendiğini gör

---

## 📝 NOTLAR

- Materialized view her adjustment'tan sonra refresh edilir (CONCURRENTLY ile blocking olmadan)
- Validation: Total adjustments original margin'ı aşamaz
- Audit trail: Tüm adjustments tarihçesi saklanır
- Event system: claim.adjusted eventi otomatik trigger ile oluşur
- Seller filter: Admin multiple seller seçebilir
- Comparison: Previous period ile karşılaştırma otomatik

---

## ⚠️ DİKKAT EDİLECEK NOKTALAR

1. **Materialized View Performance**: Çok fazla claim varsa refresh yavaş olabilir → Background job'a çevirebiliriz
2. **Validation**: Frontend ve backend'de double validation
3. **WebSocket**: Event trigger'dan emit edilir, manuel emit gerekmez
4. **Currency**: Tüm adjustments USD cinsinden
5. **Permissions**: Sadece admin/finance adjustment yapabilir

---

Bu dosyayı kaydet ve adım adım implementasyona devam edelim! 🚀
