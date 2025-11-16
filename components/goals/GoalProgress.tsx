// Win Room v2.0 - Goal Progress Component
'use client';

import { motion } from 'framer-motion';
import { GoalProgress as GoalProgressType } from '@/lib/types';

interface GoalProgressProps {
  goal: GoalProgressType;
  isPersonal?: boolean;
}

export function GoalProgress({ goal, isPersonal = false }: GoalProgressProps) {
  const percentage = Math.round(goal.percent * 100);
  const clampedPercent = Math.min(percentage, 999);

  const status = (() => {
    if (clampedPercent >= 100) return { label: '🔥 On fire', tone: 'text-emerald-300', bg: 'bg-emerald-500/10' };
    if (clampedPercent >= 90) return { label: '🎯 Great job', tone: 'text-sky-300', bg: 'bg-sky-500/10' };
    if (clampedPercent >= 80) return { label: '🏁 On track', tone: 'text-sky-300', bg: 'bg-sky-500/10' };
    if (clampedPercent >= 70) return { label: '💪Good progress', tone: 'text-amber-200', bg: 'bg-amber-500/10' };
    if (clampedPercent >= 60) return { label: '💪 Keep pushing', tone: 'text-amber-200', bg: 'bg-amber-500/10' };
    if (clampedPercent >= 50) return { label: '💪 Halfway there', tone: 'text-orange-200', bg: 'bg-orange-500/10' };
    if (clampedPercent >= 40) return { label: '💪 You can do it', tone: 'text-rose-200', bg: 'bg-rose-500/10' };
    if (clampedPercent >= 30) return { label: '🏃 Warming up', tone: 'text-rose-200', bg: 'bg-rose-500/10' };
    if (clampedPercent >= 20) return { label: '🏃 Starting slow', tone: 'text-orange-200', bg: 'bg-orange-500/10' };
    if (clampedPercent >= 10) return { label: '🏃 Just started', tone: 'text-rose-200', bg: 'bg-rose-500/10' };
    return { label: '🏃 New goal', tone: 'text-rose-200', bg: 'bg-rose-500/10' };
  })();

  const lid = goal.period_type === 'day' ? 'Daily Goal' : goal.period_type === '15d' ? '15-Day Goal' : 'Monthly Goal';

  return (
    <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border/60 bg-surface/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur">
      <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full border border-white/10"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(var(--accent) ${Math.min(clampedPercent, 100)}%, rgba(255,255,255,0.04) 0)`
          }}
        />
        <div className="absolute inset-[6px] rounded-full bg-background/80" />
        <span className="relative text-sm font-semibold text-foreground">{clampedPercent}%</span>
      </div>

      <div className="flex-1">
        <p className="text-xs uppercase tracking-[0.35em] text-foreground/40">{lid}</p>
        <p className="mt-1 text-sm font-medium text-foreground">{status.label}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest ${status.bg} ${status.tone}`}>
            {isPersonal ? 'Personal' : 'Team'}
          </span>
          <span className="text-[11px] text-foreground/50">Target: {goal.target_type}</span>
        </div>
      </div>
    </div>
  );
}
