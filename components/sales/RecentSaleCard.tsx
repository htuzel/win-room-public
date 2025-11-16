// Win Room v2.0 - Recent Sale Card Component
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatPercent } from '@/lib/helpers/format';
import type { ReactionAggregate } from '@/lib/types';
import { ReactionBar } from '@/components/social/ReactionBar';

interface RecentSale {
  id: number;
  subscription_id: number;
  claimed_by: string;
  claim_type: string;
  claimed_at: string;
  queue_created_at?: string | null;
  queue_is_manual?: boolean;
  queue_created_by?: string | null;
  queue_created_by_email?: string | null;
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

interface RecentSaleCardProps {
  sale: RecentSale;
  onObjection: (subscriptionId: number) => void;
  currentUserId: string;
  disabled?: boolean;
  reactions?: ReactionAggregate[];
  onReact?: (emoji: string) => void;
  hideObjectionButton?: boolean;
}

const MARGIN_STOPS: Array<{ threshold: number; className: string; label: string }> = [
  { threshold: 0.4, className: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300', label: 'High margin' },
  { threshold: 0.2, className: 'border-amber-400/40 bg-amber-500/10 text-amber-200', label: 'Healthy margin' },
  { threshold: 0.1, className: 'border-orange-400/40 bg-orange-500/10 text-orange-200', label: 'Risky margin' },
  { threshold: -Infinity, className: 'border-rose-400/40 bg-rose-500/10 text-rose-200', label: 'Watch margin' },
];

const CLAIM_TYPE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  first_sales: { label: 'First Sales', emoji: '🆕', color: 'bg-emerald-500/15 text-emerald-200' },
  remarketing: { label: 'Remarketing', emoji: '♻️', color: 'bg-amber-500/15 text-amber-200' },
  upgrade: { label: 'Upgrade', emoji: '⬆️', color: 'bg-sky-500/15 text-sky-200' },
  installment: { label: 'Installment', emoji: '💳', color: 'bg-rose-500/15 text-rose-200' },
};

function getMarginDescriptor(marginPercent?: number) {
  if (marginPercent === undefined || marginPercent === null) {
    return { className: 'border-border/40 bg-foreground/5 text-foreground/60', label: 'Margin pending' };
  }
  const match = MARGIN_STOPS.find((stop) => marginPercent >= stop.threshold) ?? MARGIN_STOPS[MARGIN_STOPS.length - 1];
  return match;
}

function classifyTTS(tts?: string) {
  if (!tts) return { label: 'Fresh lead', badge: 'bg-foreground/10 text-foreground/60' };
  const dayMatch = tts.match(/(\d+)g/);
  const hourMatch = tts.match(/(\d+)s/);
  const days = dayMatch ? parseInt(dayMatch[1], 10) : 0;
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const totalHours = days * 24 + hours;

  if (totalHours < 1) {
    return { label: '⚡ Lightning', badge: 'bg-emerald-500/15 text-emerald-200' };
  }
  if (totalHours < 24) {
    return { label: 'Fresh', badge: 'bg-emerald-500/15 text-emerald-200' };
  }
  if (totalHours < 72) {
    return { label: 'Steady', badge: 'bg-sky-500/15 text-sky-200' };
  }
  return { label: 'Maraton', badge: 'bg-amber-500/15 text-amber-200' };
}

function getTimeSince(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Az önce';
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export function RecentSaleCard({
  sale,
  onObjection,
  currentUserId,
  disabled,
  reactions,
  onReact,
  hideObjectionButton,
}: RecentSaleCardProps) {
  const marginDescriptor = useMemo(() => getMarginDescriptor(sale.margin_percent), [sale.margin_percent]);
  const ttsDescriptor = useMemo(() => classifyTTS(sale.tts), [sale.tts]);
  const claimTypeInfo = CLAIM_TYPE_LABELS[sale.claim_type] || { label: sale.claim_type, emoji: '📋', color: 'bg-foreground/10 text-foreground/60' };
  const marginPercentDisplay = sale.margin_percent != null ? formatPercent(sale.margin_percent * 100) : '–';
  const marginProgress = sale.margin_percent != null ? Math.max(0, Math.min(1, sale.margin_percent)) : 0;
  const isOwnClaim = sale.claimed_by === currentUserId;
  const canObjection = !isOwnClaim && !sale.has_objection;
  const isManual = Boolean(sale.queue_is_manual);
  const manualCreator = sale.queue_created_by_email || sale.queue_created_by || '';

  const cardVariants = {
    initial: { opacity: 0, y: 24, rotateX: 12, scale: 0.98 },
    animate: { opacity: 1, y: 0, rotateX: 0, scale: 1 },
    exit: { opacity: 0, x: -80, rotateX: -8 },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-surface/90 p-4 shadow-[0_18px_35px_rgba(0,0,0,0.25)] backdrop-blur transition-all
        before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:border before:border-white/5 before:opacity-0 before:transition-opacity
        hover:border-accent/40 hover:shadow-[0_22px_45px_rgba(34,197,94,0.15)] hover:before:opacity-40
        ${isOwnClaim ? 'ring-1 ring-accent/30' : ''} ${isManual ? 'ring-2 ring-emerald-500/40 bg-emerald-500/10' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full border border-white/5 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
              {sale.campaign_name || 'Unknown'}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${claimTypeInfo.color}`}>
              {claimTypeInfo.emoji} {claimTypeInfo.label}
            </span>
            {isManual && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black">
                Manual
                {manualCreator && <span className="text-black/70 normal-case">{manualCreator}</span>}
              </span>
            )}
            <div className="relative inline-flex group/tts">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${ttsDescriptor.badge}`}>
                {ttsDescriptor.label}
              </span>
              <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 opacity-0 transition-opacity z-20 group-hover/tts:opacity-100">
                <div className="rounded-xl border border-black/5 bg-white px-3 py-2 text-[11px] text-slate-700 shadow-xl min-w-[180px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900 text-xs">Time to Sale</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${ttsDescriptor.badge}`}>{ttsDescriptor.label}</span>
                  </div>
                  {sale.tts ? (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span>Duration:</span>
                        <span className="font-semibold text-slate-900">{sale.tts}</span>
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
                        {(function () {
                          const dayMatch = sale.tts?.match(/(\d+)g/);
                          const hourMatch = sale.tts?.match(/(\d+)s/);
                          const days = dayMatch ? parseInt(dayMatch[1], 10) : 0;
                          const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
                          const totalHours = days * 24 + hours;
                          if (totalHours < 1) return '⚡ Lightning fast!';
                          if (totalHours < 24) return '⚡ Closed within 24 hours - Fresh';
                          if (totalHours < 72) return '✅ Closed within 3 days - Steady progress';
                          return '⏰ Took more than 3 days - Marathon sale';
                        })()}
                      </p>
                    </>
                  ) : (
                    <p className="text-center text-[10px] text-slate-600">🎯 Fresh lead - just arrived!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-foreground/50 flex-wrap">
            <span>Sub #{sale.subscription_id}</span>
            <span className="h-0.5 w-0.5 rounded-full bg-foreground/30" />
            <span title="Claimed by" className="text-accent">
              🎯 {sale.claimed_by}
            </span>
            {sale.queue_created_at && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-foreground/30" />
                <span title="Queue created" className="text-sky-300">
                  ⏱️ {new Date(sale.queue_created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                </span>
              </>
            )}
            <span className="h-0.5 w-0.5 rounded-full bg-foreground/30" />
            <span title="Claimed at">
              ✅ {getTimeSince(sale.claimed_at)}
            </span>
            {sale.subscription_created_at && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-foreground/30" />
                <span title="Package opened">📦 {new Date(sale.subscription_created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</span>
              </>
            )}
            {isManual && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-foreground/30" />
                <span title="Manual entry owner" className="text-emerald-200">
                  ✋ {manualCreator || 'Manual entry'}
                </span>
              </>
            )}
          </div>
        </div>
        <div className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${marginDescriptor.className}`}>
          {marginDescriptor.label}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="space-y-1.5 min-w-0">
          {(sale.customer_email || sale.customer_name) && (
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[10px] uppercase tracking-wider text-foreground/40">Customer</p>
              </div>
              {sale.customer_name && (
                <p className="text-xs font-medium text-foreground/90 truncate">{sale.customer_name}</p>
              )}
              {sale.customer_email && (
                <p className="font-mono text-[10px] text-foreground/60">{sale.customer_email}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-foreground/60">
            {sale.payment_channel && (
              <span className="rounded border border-border/50 bg-background/80 px-1.5 py-0.5">
                {sale.payment_channel}
              </span>
            )}
            {sale.sales_person && (
              <span className="rounded border border-border/50 bg-background/80 px-1.5 py-0.5 max-w-[100px] truncate">
                {sale.sales_person}
              </span>
            )}
          </div>

          <div className="rounded-xl border border-border/40 bg-background/30 p-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-foreground/40">Margin (%)</p>
              <p className="text-xs font-semibold text-foreground">
                {marginPercentDisplay}
              </p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-fuchsia-400"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: marginProgress }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ transformOrigin: 'left' }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end justify-between gap-2 min-w-[110px]">
          {!hideObjectionButton && (
            <>
              {canObjection ? (
                <button
                  onClick={() => onObjection(sale.subscription_id)}
                  disabled={disabled}
                  className="whitespace-nowrap rounded-lg bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed border border-amber-400/30"
                >
                  İtiraz Et
                </button>
              ) : isOwnClaim ? (
                <div className="whitespace-nowrap rounded-lg bg-accent/10 px-3 py-2 text-xs font-semibold text-accent border border-accent/30">
                  Senin Claim'in
                </div>
              ) : sale.has_objection ? (
                <div className="whitespace-nowrap rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 border border-rose-400/30">
                  İtiraz Var
                </div>
              ) : null}
            </>
          )}

          <div className="text-[10px] text-foreground/50 text-right">120h içinde</div>
          {onReact && (
            <ReactionBar summary={reactions} onReact={onReact} compact className="justify-end" />
          )}
        </div>
      </div>

      {sale.has_objection && sale.objection_status && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs">
          <span className="font-semibold text-amber-200">İtiraz Durumu:</span>{' '}
          <span className="text-amber-100/80">{sale.objection_status}</span>
        </div>
      )}
    </motion.div>
  );
}
