// Win Room v2.0 - Leaderboard Bar Component
'use client';

import { motion } from 'framer-motion';
import { LeaderboardEntry } from '@/lib/types';

interface LeaderboardBarProps {
  entry: LeaderboardEntry;
  metricLabel?: string;
}

export function LeaderboardBar({ entry, metricLabel }: LeaderboardBarProps) {
  const normalized = Math.max(0, Math.min(1, entry.bar_value_norm ?? 0));
  const widthPercent = Math.max(0.04, normalized) * 100;
  const sparkVisible = normalized > 0.05;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-[0.35em] text-foreground/40">#{entry.rank}</span>
          <span className="text-sm font-semibold text-foreground">{entry.seller_id}</span>
          {entry.you && (
            <span className="rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-accent">
              You
            </span>
          )}
        </div>
        {metricLabel && (
          <span
            className={`text-xs font-semibold ${entry.you ? 'text-accent' : 'text-foreground/60'}`}
            title={metricLabel}
          >
            {metricLabel}
          </span>
        )}
      </div>

      <div className="relative mt-2 h-8 overflow-hidden rounded-xl border border-border/60 bg-surface/70">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPercent}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={`relative h-full rounded-xl ${entry.you ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300' : 'bg-gradient-to-r from-emerald-500/40 via-sky-500/40 to-fuchsia-500/40'}`}
        />
        {sparkVisible && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ repeat: Infinity, repeatDelay: 2.4, duration: 1.2, ease: 'easeInOut' }}
            className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white/60 blur-[2px]"
            style={{ left: `${widthPercent}%` }}
          />
        )}
      </div>
    </div>
  );
}
