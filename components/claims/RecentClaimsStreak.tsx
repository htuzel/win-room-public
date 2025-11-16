// Win Room v2.0 - Recent Claims Streak Component (Duolingo-style)
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { ReactionAggregate } from '@/lib/types';
import { ReactionBar } from '@/components/social/ReactionBar';

interface RecentClaim {
  id: number;
  subscription_id: number;
  claimed_by: string;
  claim_type: string;
  revenue_usd: number | null;
  margin_amount_usd: number | null;
  created_at: string;
  tts: string | null;
  queue_is_manual: boolean;
  queue_created_by?: string | null;
  queue_created_by_email?: string | null;
}

interface RecentClaimsStreakProps {
  token: string | null;
  reactions?: Record<number, ReactionAggregate[]>;
  onReact?: (claimId: number, emoji: string) => void;
  onClaimsChange?: (claimIds: number[]) => void;
}

function classifyTTS(tts?: string | null): { color: string; label: string; tooltipBadgeColor: string } {
  if (!tts) return {
    color: 'bg-foreground/10 border-foreground/20',
    tooltipBadgeColor: 'bg-slate-100 border-slate-300 text-slate-700',
    label: 'Fresh'
  };

  const dayMatch = tts.match(/(\d+)g/);
  const hourMatch = tts.match(/(\d+)s/);
  const days = dayMatch ? parseInt(dayMatch[1], 10) : 0;
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const totalHours = days * 24 + hours;

  if (totalHours < 1) {
    return {
      color: 'bg-foreground/10 border-foreground/20',
      tooltipBadgeColor: 'bg-slate-100 border-slate-300 text-slate-700',
      label: '⚡ Lightning'
    };
  }
  if (totalHours < 24) {
    return {
      color: 'bg-emerald-500/25 border-emerald-400/40 text-emerald-200',
      tooltipBadgeColor: 'bg-emerald-100 border-emerald-400 text-emerald-700',
      label: 'Fresh'
    };
  }
  if (totalHours < 72) {
    return {
      color: 'bg-sky-500/25 border-sky-400/40 text-sky-200',
      tooltipBadgeColor: 'bg-sky-100 border-sky-400 text-sky-700',
      label: 'Steady'
    };
  }
  return {
    color: 'bg-amber-500/25 border-amber-400/40 text-amber-200',
    tooltipBadgeColor: 'bg-amber-100 border-amber-500 text-amber-700',
    label: 'Maraton'
  };
}

function formatUSD(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitials(sellerId: string): string {
  const parts = sellerId.split(/[_\s-]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return sellerId.substring(0, 2).toUpperCase();
}

function getClaimTypeLabel(claimType: string): string {
  const labels: Record<string, string> = {
    closer: 'Closer',
    setter: 'Setter',
    solo: 'Solo',
  };
  return labels[claimType] || claimType;
}

export function RecentClaimsStreak({ token, reactions, onReact, onClaimsChange }: RecentClaimsStreakProps) {
  const [claims, setClaims] = useState<RecentClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTooltipId, setOpenTooltipId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchRecentClaims = async () => {
      try {
        const res = await fetch('/api/claims/recent', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setClaims(data);
          onClaimsChange?.(data.map((claim: RecentClaim) => claim.id));
        }
      } catch (error) {
        console.error('Failed to fetch recent claims:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentClaims();

    // Listen for claim events to refresh
    const handleRefresh = () => {
      fetchRecentClaims();
    };

    window.addEventListener('claims:refresh', handleRefresh);

    return () => {
      window.removeEventListener('claims:refresh', handleRefresh);
    };
  }, [token, onClaimsChange]);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!openTooltipId) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-tooltip-container]')) {
        setOpenTooltipId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openTooltipId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-surface/70 p-4">
        <h3 className="text-sm font-semibold text-foreground/70 mb-3 uppercase tracking-wider">
          Recent Claims
        </h3>
        <div className="flex gap-2">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-12 w-12 rounded-full border border-border/30 bg-background/30 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-surface/70 p-4">
        <h3 className="text-sm font-semibold text-foreground/70 mb-3 uppercase tracking-wider">
          Recent Claims
        </h3>
        <p className="text-xs text-foreground/40">No recent claims</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-surface/70 p-4 shadow-lg">
      <h3 className="text-sm font-semibold text-foreground/70 mb-3 uppercase tracking-wider">
        🔥 Recent Claims Streak
      </h3>
      <div className="flex gap-2 flex-wrap">
        {claims.map((claim, index) => {
          const ttsInfo = classifyTTS(claim.tts);
          const initials = getInitials(claim.claimed_by);
          const timeSince = new Date(claim.created_at);
          const timeAgo = getTimeAgo(timeSince);
          const isManual = claim.queue_is_manual;
          const manualCreator = claim.queue_created_by_email || claim.queue_created_by || '';

          return (
            <motion.div
              key={claim.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
              data-tooltip-container
            >
              <div
                onClick={() => setOpenTooltipId(openTooltipId === claim.id ? null : claim.id)}
                className={`relative h-12 w-12 rounded-full border-2 ${ttsInfo.color}
                  flex items-center justify-center font-bold text-xs
                  transition-all duration-200
                  hover:scale-110 hover:shadow-lg cursor-pointer ${
                    isManual ? 'ring-2 ring-emerald-400/80 bg-emerald-500/15 text-emerald-100' : ''
                  }`}
              >
                {initials}
                {isManual && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center justify-center rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-black shadow">
                    M
                  </span>
                )}
              </div>

              {/* Tooltip */}
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 transition-opacity z-20 ${
                openTooltipId === claim.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}>
                <div className="bg-white backdrop-blur border border-slate-200 rounded-lg p-3 shadow-xl min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      {claim.claimed_by}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${ttsInfo.tooltipBadgeColor}`}>
                      {ttsInfo.label}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    {isManual && (
                      <div className="flex justify-between text-emerald-700 bg-emerald-500/15 px-2 py-1 rounded-lg mb-1">
                        <span>Manual:</span>
                        <span className="font-medium">{manualCreator || 'Manual entry'}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="font-medium text-slate-900">
                        {getClaimTypeLabel(claim.claim_type)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Revenue:</span>
                      <span className="font-medium text-slate-900">
                        {formatUSD(claim.revenue_usd)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Margin:</span>
                      <span className="font-medium text-emerald-600">
                        {formatUSD(claim.margin_amount_usd)}
                      </span>
                    </div>
                    {claim.tts && (
                      <div className="flex justify-between">
                        <span>TTS:</span>
                        <span className="font-medium text-sky-600">{claim.tts}</span>
                      </div>
                    )}
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span>Claimed:</span>
                    <span className="font-medium text-slate-900">{timeAgo}</span>
                  </div>
                    {onReact && (
                      <ReactionBar
                        summary={reactions?.[claim.id]}
                        onReact={(emoji) => onReact(Number(claim.id), emoji)}
                        compact
                        variant="light"
                        className="pt-2 border-t border-slate-200"
                      />
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="text-[10px] text-foreground/40 mt-2">
        Last {claims.length} claims • Click for details
      </p>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
