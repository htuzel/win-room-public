// Win Room v2.0 - Achievement Stories Ribbon
'use client';

import Image from 'next/image';
import type { AchievementBadge, AchievementType, ReactionAggregate } from '@/lib/types';

interface AchievementStoriesProps {
  achievements: AchievementBadge[];
  className?: string;
  onReplay?: (achievement: AchievementBadge) => void;
  reactions?: Record<number, ReactionAggregate[]>;
  onReact?: (achievementId: number, emoji: string) => void;
}

const BADGE_META: Record<
  AchievementType,
  {
    label: string;
    badge: string;
    gradient: string;
  }
> = {
  streak: {
    label: 'Streak',
    badge: '/badges/streak.png',
    gradient: 'from-amber-400/30 via-orange-500/10 to-rose-500/10',
  },
  jackpot: {
    label: 'Jackpot',
    badge: '/badges/jackpot.png',
    gradient: 'from-amber-300/40 via-yellow-500/15 to-emerald-500/10',
  },
  personal_goal: {
    label: 'Mission Complete',
    badge: '/badges/missionCompleted.png',
    gradient: 'from-indigo-400/30 via-blue-500/10 to-cyan-500/10',
  },
  team_goal: {
    label: 'Team Goal',
    badge: '/badges/goalCompleted.png',
    gradient: 'from-emerald-400/30 via-lime-500/10 to-cyan-400/10',
  },
  daily_revenue: {
    label: '20K Day',
    badge: '/badges/20K.png',
    gradient: 'from-fuchsia-400/30 via-purple-500/10 to-indigo-500/10',
  },
  personal_revenue_4k: {
    label: '4K Formu',
    badge: '/badges/4K.jpg',
    gradient: 'from-sky-400/30 via-blue-500/10 to-cyan-500/10',
  },
  personal_revenue_8k: {
    label: '8K Momentum',
    badge: '/badges/8K.jpg',
    gradient: 'from-violet-400/30 via-purple-500/10 to-pink-500/10',
  },
  personal_revenue_10k: {
    label: '10K Legend',
    badge: '/badges/10K.png',
    gradient: 'from-amber-300/40 via-yellow-500/15 to-emerald-500/10',
  },
  team_revenue_30k: {
    label: '30K Squad',
    badge: '/badges/30K.jpg',
    gradient: 'from-fuchsia-400/30 via-rose-500/10 to-orange-500/10',
  },
  team_revenue_40k: {
    label: '40K Power',
    badge: '/badges/40K.jpg',
    gradient: 'from-red-400/35 via-amber-500/15 to-yellow-400/10',
  },
};

const formatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function AchievementStories({ achievements, className = '', onReplay, reactions, onReact }: AchievementStoriesProps) {
  if (!achievements || achievements.length === 0) {
    return null;
  }

  const items = achievements.slice(0, 12);

  return (
    <div
      className={`rounded-3xl border border-border/60 bg-surface/70 px-5 pt-4 pb-4 shadow-[0_20px_45px_rgba(0,0,0,0.35)] overflow-visible ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-foreground/40">Latest Highlights</p>
          <p className="text-sm text-foreground/70">Son başarılar • hover ile detay gör - tıklayarak yeniden oynayabilirsin</p>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {items.map((achievement) => {
          const meta = BADGE_META[achievement.type];
          const dateLabel = formatter.format(new Date(achievement.created_at));

          return (
            <div key={achievement.id} className="group relative shrink-0 w-28">
              <div
                className={`relative flex h-28 w-28 flex-col items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b ${meta.gradient} p-2 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden`}
                onClick={() => onReplay?.(achievement)}
              >
                {/* Default content - badge and title */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 transition-opacity duration-200 group-hover:opacity-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/5">
                    <Image
                      src={meta.badge}
                      alt={meta.label}
                      width={64}
                      height={64}
                      className="drop-shadow-xl object-contain"
                    />
                  </div>
                  <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/80 line-clamp-1">
                    {achievement.title || meta.label}
                  </span>
                </div>

                {/* Hover overlay - detailed info */}
                <div className="absolute inset-0 flex flex-col justify-center p-2.5 bg-black/80 backdrop-blur-sm opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-white/60 mb-1">
                    {achievement.seller_id ?? 'Team'}
                  </p>
                  <p className="text-[11px] font-bold text-white leading-tight mb-1.5">
                    {achievement.title || meta.label}
                  </p>
                  <p className="text-[9px] leading-snug text-white/80 line-clamp-3 mb-1.5">
                    {achievement.description}
                  </p>
                  <p className="text-[8px] uppercase tracking-widest text-white/40">
                    {dateLabel}
                  </p>
                </div>
              </div>

              {/* Reaction Bar - Always visible if onReact exists */}
              {onReact && (
                <div className="mt-2 w-28">
                  <div className="h-6 rounded-lg bg-white/5 border border-white/10 px-1.5 flex items-center justify-center gap-0.5 overflow-hidden">
                    {(reactions?.[Number(achievement.id)] || []).slice(0, 5).map((reaction, idx) => (
                      <button
                        key={idx}
                        onClick={() => onReact(Number(achievement.id), reaction.emoji)}
                        className="flex items-center gap-0.5 hover:bg-white/10 rounded px-0.5 transition-colors"
                        title={`${reaction.emoji} (${reaction.count})`}
                      >
                        <span className="text-xs">{reaction.emoji}</span>
                        <span className="text-[9px] font-semibold text-white/60">{reaction.count}</span>
                      </button>
                    ))}
                    {(!reactions?.[Number(achievement.id)] || reactions[Number(achievement.id)].length === 0) && (
                      <button
                        onClick={() => onReact(Number(achievement.id), '🔥')}
                        className="text-[10px] text-white/40 hover:text-white/60 transition-colors"
                      >
                        React
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
