// Win Room v2.0 - Claims Management Table
'use client';

import { useState, useEffect, Fragment } from 'react';
import { ClaimWithMetrics } from '@/lib/types';
import { AdjustmentModal } from './AdjustmentModal';
import { FinanceStatusModal } from './FinanceStatusModal';

interface ClaimsTableProps {
  token: string | null;
}

// Payment channels that require finance approval
const FINANCE_REVIEW_CHANNELS = [
  'admin',
  'craftgate',
  'admin-extra',
  'setcard',
  'free-western-user',
  'company',
  'free-setcard',
  'free-craftgate',
];

export function ClaimsTable({ token }: ClaimsTableProps) {
  const [claims, setClaims] = useState<ClaimWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(100);
  const [pagination, setPagination] = useState<{
    limit: number;
    offset: number;
    totalCount: number;
    totalPages: number;
    currentPage: number;
  } | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithMetrics | null>(null);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [financeModalOpen, setFinanceModalOpen] = useState(false);

  const fetchClaims = async () => {
    if (!token) return;

    try {
      const offset = (page - 1) * perPage;
      const params = new URLSearchParams({
        search: search,
        limit: perPage.toString(),
        offset: offset.toString(),
      });
      const res = await fetch(`/api/admin/claims?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch claims:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [token, search, page]);

  const handleAdjustmentClick = (claim: ClaimWithMetrics) => {
    setSelectedClaim(claim);
    setAdjustmentModalOpen(true);
  };

  const handleAdjustmentSuccess = () => {
    setAdjustmentModalOpen(false);
    setSelectedClaim(null);
    fetchClaims(); // Refresh list
  };

  const handleFinanceClick = (claim: ClaimWithMetrics) => {
    setSelectedClaim(claim);
    setFinanceModalOpen(true);
  };

  const handleFinanceSuccess = () => {
    setFinanceModalOpen(false);
    setSelectedClaim(null);
    fetchClaims(); // Refresh list
  };

  const requiresFinanceReview = (paymentChannel?: string) => {
    return paymentChannel && FINANCE_REVIEW_CHANNELS.includes(paymentChannel);
  };

  const getFinanceStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'text-emerald-400';
      case 'problem':
        return 'text-rose-400';
      case 'installment':
        return 'text-amber-400';
      case 'waiting':
      default:
        return 'text-foreground/60';
    }
  };

  const getFinanceStatusBg = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-400/20';
      case 'problem':
        return 'bg-rose-400/20';
      case 'installment':
        return 'bg-amber-400/20';
      case 'waiting':
      default:
        return 'bg-foreground/10';
    }
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
                Claimed At
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Claimed By
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Finance Status
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
              const needsFinanceReview = requiresFinanceReview(claim.payment_channel);
              const financeStatus = claim.finance_status || 'waiting';
              const isManual = claim.queue_is_manual;
              const manualCreator = claim.queue_created_by || claim.queue_created_by_email || '';

              // Highlight row if it requires finance review and status is not approved
              const rowBgClass = [
                needsFinanceReview && financeStatus !== 'approved' ? 'bg-amber-500/10 hover:bg-amber-500/20' : 'hover:bg-background/40',
                isManual ? 'ring-1 ring-emerald-500/40 bg-emerald-500/10' : '',
              ].join(' ').trim();

              return (
                <tr key={claim.id} className={`border-b border-border/20 ${rowBgClass} transition-colors`}>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">#{claim.subscription_id}</span>
                        {isManual && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                            Manual
                          </span>
                        )}
                      </div>
                      {isManual && (
                        <span className="text-xs text-foreground/60">
                          Created by: {manualCreator || 'Manual'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div className="text-xs text-foreground/80">
                      {new Date(claim.claimed_at).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-foreground/50">
                      {new Date(claim.claimed_at).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div>{claim.customer_name || 'N/A'}</div>
                    <div className="text-xs text-foreground/50">{claim.customer_email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{claim.claimed_by}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                      needsFinanceReview ? 'bg-amber-500/30 text-amber-200' : 'bg-foreground/10 text-foreground/70'
                    }`}>
                      {claim.payment_channel || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-accent/20 text-accent">
                      {claim.claim_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getFinanceStatusBg(financeStatus)} ${getFinanceStatusColor(financeStatus)}`}>
                      {financeStatus}
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
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleAdjustmentClick(claim)}
                        className="px-3 py-1 text-xs font-medium rounded bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                      >
                        {hasAdjustments ? 'Edit Adj.' : 'Add Adj.'}
                      </button>
                      {needsFinanceReview && (
                        <button
                          onClick={() => handleFinanceClick(claim)}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            financeStatus === 'approved'
                              ? 'bg-emerald-400/20 text-emerald-300 hover:bg-emerald-400/30'
                              : financeStatus === 'problem'
                              ? 'bg-rose-400/20 text-rose-300 hover:bg-rose-400/30'
                              : 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30'
                          }`}
                        >
                          Finance
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-foreground/60">
            Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.totalCount)} of {pagination.totalCount} items
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-surface border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(p => {
                  // Show first, last, current, and pages around current
                  return p === 1 ||
                         p === pagination.totalPages ||
                         Math.abs(p - page) <= 1;
                })
                .map((p, idx, arr) => {
                  // Add ellipsis
                  const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <Fragment key={p}>
                      {showEllipsisBefore && <span className="px-2 text-foreground/40">...</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          p === page
                            ? 'bg-accent text-black font-semibold'
                            : 'bg-surface border border-border text-foreground hover:bg-background'
                        }`}
                      >
                        {p}
                      </button>
                    </Fragment>
                  );
                })}
            </div>
            <button
              onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 rounded-lg bg-surface border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedClaim && (
        <>
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
          <FinanceStatusModal
            isOpen={financeModalOpen}
            onClose={() => {
              setFinanceModalOpen(false);
              setSelectedClaim(null);
            }}
            claim={selectedClaim}
            token={token}
            onSuccess={handleFinanceSuccess}
          />
        </>
      )}
    </div>
  );
}
