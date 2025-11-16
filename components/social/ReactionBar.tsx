// Win Room v2.0 - Emoji Reaction Bar
'use client';

import { useMemo } from 'react';
import type { ReactionAggregate } from '@/lib/types';

interface ReactionBarProps {
  summary?: ReactionAggregate[];
  onReact: (emoji: string) => void;
  compact?: boolean;
  className?: string;
  variant?: 'dark' | 'light';
}

const DEFAULT_REACTIONS = ['🔥', '⚡', '🚀', '❤️', '👏'];

export function ReactionBar({ summary = [], onReact, compact, className = '', variant = 'dark' }: ReactionBarProps) {
  const reactionMap = useMemo(() => {
    const map: Record<string, ReactionAggregate> = {};
    summary.forEach((item) => {
      map[item.emoji] = item;
    });
    return map;
  }, [summary]);

  const containerClasses = variant === 'light'
    ? 'border-slate-200 bg-slate-50'
    : 'border-white/5 bg-white/5';

  const getButtonClasses = (reacted: boolean, count: number) => {
    if (variant === 'light') {
      return reacted
        ? 'border-emerald-500 bg-emerald-100 text-emerald-700'
        : count > 0
          ? 'border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400 hover:bg-slate-200'
          : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50';
    }
    return reacted
      ? 'border-accent/60 bg-accent/15 text-accent'
      : count > 0
        ? 'border-white/20 bg-white/10 text-white/80 hover:border-white/40'
        : 'border-white/5 bg-transparent text-white/40 hover:border-white/20';
  };

  return (
    <div
      className={`inline-flex flex-wrap gap-1.5 rounded-full border px-1.5 py-1 text-xs ${compact ? 'text-[11px]' : 'text-sm'} ${containerClasses} ${className}`}
      role="group"
      aria-label="Reactions"
    >
      {DEFAULT_REACTIONS.map((emoji) => {
        const data = reactionMap[emoji];
        const count = data?.count || 0;
        const reacted = Boolean(data?.reacted_by_me);
        const userList = data?.users || [];
        const tooltipLabel =
          userList.length > 0
            ? `${userList.slice(0, 4).map((user) => user.seller_id).join(', ')}${
                userList.length > 4 ? ` +${userList.length - 4}` : ''
              }`
            : 'Be the first!';

        return (
          <div key={emoji} className="relative group/reaction">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onReact(emoji);
              }}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 cursor-pointer ${getButtonClasses(reacted, count)}`}
              aria-pressed={reacted}
            >
              <span className="text-base select-none">{emoji}</span>
              {count > 0 && <span className="font-semibold select-none">{count}</span>}
            </button>
            <div className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 opacity-0 group-hover/reaction:opacity-100 transition-opacity z-20">
              <div className="rounded-xl border border-black/5 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 shadow-lg whitespace-nowrap">
                {tooltipLabel}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
