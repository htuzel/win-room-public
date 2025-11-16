// Win Room v2.0 - Queue Card Component
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { QueueItem, ReactionAggregate } from '@/lib/types';
import { formatPercent, formatUSD } from '@/lib/helpers/format';
import { HoldToClaimButton } from '@/components/ui/HoldToClaimButton';
import { ReactionBar } from '@/components/social/ReactionBar';

interface QueueCardProps {
  item: QueueItem;
  onClaim: (subscriptionId: number) => Promise<void> | void;
  claimCooldownActive?: boolean;
  disabled?: boolean;
  reactions?: ReactionAggregate[];
  onReact?: (emoji: string) => void;
}

const MARGIN_STOPS: Array<{ threshold: number; className: string; label: string }> = [
  { threshold: 0.4, className: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300', label: 'High margin' },
  { threshold: 0.2, className: 'border-amber-400/40 bg-amber-500/10 text-amber-200', label: 'Healthy margin' },
  { threshold: 0.1, className: 'border-orange-400/40 bg-orange-500/10 text-orange-200', label: 'Risky margin' },
  { threshold: -Infinity, className: 'border-rose-400/40 bg-rose-500/10 text-rose-200', label: 'Watch margin' },
];

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

export function QueueCard({
  item,
  onClaim,
  claimCooldownActive,
  disabled,
  reactions,
  onReact,
}: QueueCardProps) {
  const isManual = item.is_manual ?? Boolean(item.created_by);
  const manualCreator = item.created_by_email || item.created_by || '';
  const marginDescriptor = useMemo(() => getMarginDescriptor(item.margin_percent), [item.margin_percent]);
  const ttsDescriptor = useMemo(() => classifyTTS(item.tts), [item.tts]);
  const revenueDisplay = item.revenue_usd != null ? formatUSD(item.revenue_usd) : '—';
  const costDisplay = item.cost_usd != null ? formatUSD(item.cost_usd) : '—';
  const marginAmountDisplay = item.margin_amount_usd != null ? formatUSD(item.margin_amount_usd) : '—';
  const marginPercentDisplay = item.margin_percent != null ? formatPercent(item.margin_percent * 100) : '–';
  const marginProgress = Math.max(0, Math.min(1, item.margin_percent ?? 0));

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
      className={`relative flex flex-col gap-3 rounded-2xl border ${isManual ? 'border-accent/60 bg-accent/10 shadow-[0_20px_40px_rgba(16,185,129,0.25)]' : 'border-border/60 bg-surface/90 shadow-[0_18px_35px_rgba(0,0,0,0.25)]'} p-4 backdrop-blur transition-all
        before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:border before:border-white/5 before:opacity-0 before:transition-opacity
        hover:border-accent/40 hover:shadow-[0_22px_45px_rgba(34,197,94,0.15)] hover:before:opacity-40
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full border border-white/5 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
              {item.campaign_name || 'Unknown'}
            </span>
            {isManual && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black">
                Manual
                {manualCreator && <span className="text-black/70 normal-case">{manualCreator}</span>}
              </span>
            )}
            <div className="relative inline-flex group/tts">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${ttsDescriptor.badge}`}
              >
                {ttsDescriptor.label}
              </span>

              <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 opacity-0 group-hover/tts:opacity-100 transition-opacity z-20">
                <div className="rounded-xl border border-black/5 bg-white px-3 py-2 text-[11px] text-slate-700 shadow-xl min-w-[180px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900 text-xs">Time to Sale</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${ttsDescriptor.badge}`}
                      >
                      {ttsDescriptor.label}
                    </span>
                  </div>
                  {item.tts ? (
                    <>
                      <div className="flex justify-between text-[10px]">
                        <span>Duration:</span>
                        <span className="font-semibold text-slate-900">{item.tts}</span>
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
                        {(function () {
                          const dayMatch = item.tts?.match(/(\d+)g/);
                          const hourMatch = item.tts?.match(/(\d+)s/);
                          const days = dayMatch ? parseInt(dayMatch[1], 10) : 0;
                          const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
                          const totalHours = days * 24 + hours;

                          if (totalHours < 1) {
                            return '⚡ Lightning fast!';
                          }
                          if (totalHours < 24) {
                            return '⚡ Closed within 24 hours - Fresh';
                          }
                          if (totalHours < 72) {
                            return '✅ Closed within 3 days - Steady progress';
                          }
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
            <span>Sub #{item.subscription_id}</span>
            {item.subscription_created_at && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-foreground/30" />
                <span title="Package opened">📦 {new Date(item.subscription_created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</span>
              </>
            )}
            <span className="h-0.5 w-0.5 rounded-full bg-foreground/30" />
            <span title="Added to queue">⏱️ {item.created_at ? new Date(item.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
            <span className="h-0.5 w-0.5 rounded-full bg-foreground/30" />
            <span
              title="Who triggered this subscription"
              className={isManual ? 'text-accent' : item.created_by_email ? 'text-sky-300' : 'text-foreground/40'}
            >
              👤 {isManual ? manualCreator || 'Manual' : item.created_by_email || 'Auto'}
            </span>
          </div>
        </div>
        <div className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${marginDescriptor.className}`}>
          {marginDescriptor.label}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="space-y-1.5 min-w-0">
          {(item.customer_email || item.customer_name) && (
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[10px] uppercase tracking-wider text-foreground/40">Customer</p>
                {item.is_kid_account !== undefined && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                    item.is_kid_account
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-400/30'
                      : 'bg-blue-500/15 text-blue-300 border border-blue-400/30'
                  }`}>
                    {item.is_kid_account ? 'Kid' : 'Adult'}
                  </span>
                )}
              </div>
              {item.customer_name && (
                <p className="text-xs font-medium text-foreground/90 truncate">{item.customer_name}</p>
              )}
              {item.customer_email && (
                <p className="font-mono text-[10px] text-foreground/60">{item.customer_email}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-foreground/60">
            {item.payment_channel && (
              <span className="rounded border border-border/50 bg-background/80 px-1.5 py-0.5">
                {item.payment_channel}
              </span>
            )}
            {item.sales_person && (
              <span className="rounded border border-border/50 bg-background/80 px-1.5 py-0.5 max-w-[100px] truncate">
                {item.sales_person}
              </span>
            )}
            {item.claim_suggested_seller && (
              <span className="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-accent/80 max-w-[100px] truncate">
                {item.claim_suggested_seller}
              </span>
            )}
          </div>

          {(item.custom_note || item.subs_note) && (
            <div className="mt-1.5 rounded-lg border border-border/30 bg-background/50 p-2 space-y-1">
              {item.custom_note && (
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-foreground/40 mb-0.5">Custom Note</p>
                  <p className="text-[10px] text-foreground/80 leading-relaxed">{item.custom_note}</p>
                </div>
              )}
              {item.subs_note && (
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-foreground/40 mb-0.5">Subs Note</p>
                  <p className="text-[10px] text-foreground/80 leading-relaxed">{item.subs_note}</p>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border/40 bg-background/30 p-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-foreground/40">Ekonomi (USD)</p>
              <p className="text-xs font-semibold text-foreground">
                {marginPercentDisplay}
              </p>
            </div>
            <dl className="mt-1.5 space-y-1 text-[11px] text-foreground/70">
              <div className="flex items-center justify-between">
                <dt className="uppercase text-foreground/50">Satış</dt>
                <dd className="font-semibold text-foreground">{revenueDisplay}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="uppercase text-foreground/50">Maliyet</dt>
                <dd className="text-foreground/80">{costDisplay}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="uppercase text-foreground/50">Marj</dt>
                <dd className="font-semibold text-foreground">{marginAmountDisplay}</dd>
              </div>
            </dl>
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
          <HoldToClaimButton
            label="Claim"
            holdLabel="Keep holding…"
            onComplete={() => onClaim(item.subscription_id)}
            disabled={disabled}
            cooldownActive={claimCooldownActive}
          />
          {onReact && (
            <ReactionBar summary={reactions} onReact={onReact} compact className="justify-end" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
