// Win Room v2.0 - Global Goal Progress Component
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface GlobalGoal {
  period_type: 'day' | '15d' | 'month';
  target_type: 'count' | 'revenue' | 'margin_amount';
  target_value: number;
  period_start: string;
  period_end: string;
}

interface PeriodStats {
  period: string;
  wins: number;
  revenue: number;
  margin: number;
}

interface GlobalGoalProgressProps {
  token: string | null;
}

export function GlobalGoalProgress({ token }: GlobalGoalProgressProps) {
  const [goals, setGoals] = useState<GlobalGoal[]>([]);
  const [stats, setStats] = useState<PeriodStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [token]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGoals(data.activeGoals || []);
        setStats(data.stats || []);
      }
    } catch (error) {
      console.error('Failed to fetch global goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatsForPeriod = (periodType: string): PeriodStats | undefined => {
    const mapping: Record<string, string> = {
      'day': 'today',
      '15d': '15d',
      'month': 'month',
    };
    return stats.find(s => s.period === mapping[periodType]);
  };

  const calculateProgress = (goal: GlobalGoal): number => {
    const periodStats = getStatsForPeriod(goal.period_type);
    if (!periodStats) return 0;

    let current = 0;
    switch (goal.target_type) {
      case 'count':
        current = periodStats.wins;
        break;
      case 'revenue':
        current = periodStats.revenue;
        break;
      case 'margin_amount':
        current = periodStats.margin;
        break;
    }

    return Math.min(1, current / goal.target_value);
  };

  const formatValue = (value: number, type: string): string => {
    if (type === 'count') return value.toString();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPeriodLabel = (periodType: string): string => {
    const labels: Record<string, string> = {
      'day': 'Today',
      '15d': '15 Days',
      'month': 'This Month',
    };
    return labels[periodType] || periodType;
  };

  const getTargetLabel = (targetType: string): string => {
    const labels: Record<string, string> = {
      'count': 'Wins',
      'revenue': 'Revenue',
      'margin_amount': 'Margin',
    };
    return labels[targetType] || targetType;
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-6 rounded-full bg-accent/20 animate-pulse" />
          <div className="h-4 w-32 bg-foreground/10 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-16 bg-foreground/5 rounded animate-pulse" />
          <div className="h-16 bg-foreground/5 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return null; // Don't show if no active goals
  }

  return (
    <div className="rounded-2xl border border-border bg-surface/50 backdrop-blur p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Team Goals</h3>
      </div>

      <div className="space-y-4">
        {goals.map((goal, index) => {
          const progress = calculateProgress(goal);
          const periodStats = getStatsForPeriod(goal.period_type);
          const currentValue = periodStats
            ? goal.target_type === 'count'
              ? periodStats.wins
              : goal.target_type === 'revenue'
              ? periodStats.revenue
              : periodStats.margin
            : 0;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-xl border border-border/50 bg-background/50 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                    {getPeriodLabel(goal.period_type)}
                  </span>
                  <span className="text-xs text-foreground/40">•</span>
                  <span className="text-xs font-medium text-foreground/80">
                    {getTargetLabel(goal.target_type)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">
                    {Math.round(progress * 100)}%
                  </div>
                  <div className="text-[10px] text-foreground/50 font-mono">
                    {formatValue(currentValue, goal.target_type)} / {formatValue(goal.target_value, goal.target_type)}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 overflow-hidden rounded-full bg-foreground/10">
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    progress >= 1
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                      : progress >= 0.75
                      ? 'bg-gradient-to-r from-accent to-emerald-400'
                      : progress >= 0.5
                      ? 'bg-gradient-to-r from-amber-400 to-accent'
                      : 'bg-gradient-to-r from-rose-400 to-amber-400'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>

              {/* Status label */}
              {progress >= 1 && (
                <div className="mt-2 text-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                    🎯 Goal Achieved!
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
