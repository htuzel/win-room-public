// Win Room v2.0 - Personal Goals Panel Component
'use client';

import { GoalProgress } from './GoalProgress';
import type { GoalProgress as GoalProgressType } from '@/lib/types';

interface PersonalGoalsPanelProps {
  goals: GoalProgressType[];
  loading?: boolean;
}

export function PersonalGoalsPanel({ goals, loading = false }: PersonalGoalsPanelProps) {
  if (loading || goals.length === 0) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-surface/70 p-6 shadow-[0_24px_45px_rgba(0,0,0,0.25)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">My Goals</h2>
        <span className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent">
          Personal
        </span>
      </div>
      <p className="mb-4 text-sm text-foreground/50">
        Only you can see these. Your personal goals.
      </p>
      <div className="space-y-3">
        {goals.map((goal) => (
          <GoalProgress key={goal.goal_id} goal={goal} isPersonal />
        ))}
      </div>
    </div>
  );
}
