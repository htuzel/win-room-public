// Win Room v2.0 - Shared achievement metadata
import type { AchievementType } from '@/lib/types';

export type AchievementCelebrationVariant = 'member' | 'team' | 'daily';

export type AchievementSound =
  | 'member_mission'
  | 'team_mission'
  | 'happy'
  | 'sales_4k'
  | 'sales_8k'
  | 'sales_10k'
  | 'team_30k'
  | 'team_40k';

export interface RevenueMilestoneMeta {
  threshold: number;
  type:
    | 'personal_revenue_4k'
    | 'personal_revenue_8k'
    | 'personal_revenue_10k'
    | 'team_revenue_30k'
    | 'team_revenue_40k'
    | 'daily_revenue';
  title: string;
  description: string;
  celebrationSubtitle: string;
  sound: AchievementSound;
  celebrationVariant: AchievementCelebrationVariant;
}

export interface AchievementBroadcastMeta {
  title: string;
  description: string;
  celebrationSubtitle: string;
  sound: AchievementSound;
  celebrationVariant: AchievementCelebrationVariant;
}

export const PERSONAL_REVENUE_MILESTONES: Array<
  Omit<RevenueMilestoneMeta, 'type'> & { type: 'personal_revenue_4k' | 'personal_revenue_8k' | 'personal_revenue_10k' }
> = [
  {
    threshold: 4000,
    type: 'personal_revenue_4k',
    title: '4K Flow',
    description: 'On fire! You shattered the $4,000 daily line.',
    celebrationSubtitle: "You're on fire!",
    sound: 'sales_4k',
    celebrationVariant: 'member',
  },
  {
    threshold: 8000,
    type: 'personal_revenue_8k',
    title: '8K Momentum',
    description: 'Momentum locked in! You reached $8,000 daily revenue.',
    celebrationSubtitle: 'Momentum is yours!',
    sound: 'sales_8k',
    celebrationVariant: 'member',
  },
  {
    threshold: 10000,
    type: 'personal_revenue_10k',
    title: '10K Legend',
    description: 'Wow! $10,000 in a day puts you in the legends club.',
    celebrationSubtitle: 'Wow! Stellar performance!',
    sound: 'sales_10k',
    celebrationVariant: 'member',
  },
];

export const TEAM_REVENUE_MILESTONES: Array<
  Omit<RevenueMilestoneMeta, 'type'> & { type: 'team_revenue_30k' | 'team_revenue_40k' }
> = [
  {
    threshold: 30000,
    type: 'team_revenue_30k',
    title: '30K Squad',
    description: 'The team cleared the 30K revenue wall today. Squad is on fire!',
    celebrationSubtitle: 'The team is surging!',
    sound: 'team_30k',
    celebrationVariant: 'team',
  },
  {
    threshold: 40000,
    type: 'team_revenue_40k',
    title: '40K Power',
    description: '40K team revenue! Power is in full swing.',
    celebrationSubtitle: 'New team record!',
    sound: 'team_40k',
    celebrationVariant: 'team',
  },
];

export const DAILY_REVENUE_MILESTONE: RevenueMilestoneMeta = {
  threshold: 20000,
  type: 'daily_revenue',
  title: '20K Day',
  description: 'Daily revenue passed the 20K threshold.',
  celebrationSubtitle: '"Mission complete!"',
  sound: 'happy',
  celebrationVariant: 'daily',
};

export const PERSONAL_GOAL_META = {
  type: 'personal_goal',
  title: 'Personal Goal',
  description: 'The sales rep completed their personal goal.',
  celebrationSubtitle: '"Congrats!"',
  sound: 'member_mission',
  celebrationVariant: 'member',
} as const;

export const TEAM_GOAL_META = {
  type: 'team_goal',
  title: 'Team Goal',
  description: 'The sales team completed the goal.',
  celebrationSubtitle: '"Mission complete!"',
  sound: 'team_mission',
  celebrationVariant: 'team',
} as const;

export const ACHIEVEMENT_BROADCAST_META: Partial<Record<AchievementType, AchievementBroadcastMeta>> = {
  personal_goal: {
    title: PERSONAL_GOAL_META.title,
    description: PERSONAL_GOAL_META.description,
    celebrationSubtitle: PERSONAL_GOAL_META.celebrationSubtitle,
    sound: PERSONAL_GOAL_META.sound,
    celebrationVariant: PERSONAL_GOAL_META.celebrationVariant,
  },
  team_goal: {
    title: TEAM_GOAL_META.title,
    description: TEAM_GOAL_META.description,
    celebrationSubtitle: TEAM_GOAL_META.celebrationSubtitle,
    sound: TEAM_GOAL_META.sound,
    celebrationVariant: TEAM_GOAL_META.celebrationVariant,
  },
  daily_revenue: {
    title: DAILY_REVENUE_MILESTONE.title,
    description: DAILY_REVENUE_MILESTONE.description,
    celebrationSubtitle: DAILY_REVENUE_MILESTONE.celebrationSubtitle,
    sound: DAILY_REVENUE_MILESTONE.sound,
    celebrationVariant: DAILY_REVENUE_MILESTONE.celebrationVariant,
  },
  personal_revenue_4k: {
    title: PERSONAL_REVENUE_MILESTONES[0].title,
    description: PERSONAL_REVENUE_MILESTONES[0].description,
    celebrationSubtitle: PERSONAL_REVENUE_MILESTONES[0].celebrationSubtitle,
    sound: PERSONAL_REVENUE_MILESTONES[0].sound,
    celebrationVariant: PERSONAL_REVENUE_MILESTONES[0].celebrationVariant,
  },
  personal_revenue_8k: {
    title: PERSONAL_REVENUE_MILESTONES[1].title,
    description: PERSONAL_REVENUE_MILESTONES[1].description,
    celebrationSubtitle: PERSONAL_REVENUE_MILESTONES[1].celebrationSubtitle,
    sound: PERSONAL_REVENUE_MILESTONES[1].sound,
    celebrationVariant: PERSONAL_REVENUE_MILESTONES[1].celebrationVariant,
  },
  personal_revenue_10k: {
    title: PERSONAL_REVENUE_MILESTONES[2].title,
    description: PERSONAL_REVENUE_MILESTONES[2].description,
    celebrationSubtitle: PERSONAL_REVENUE_MILESTONES[2].celebrationSubtitle,
    sound: PERSONAL_REVENUE_MILESTONES[2].sound,
    celebrationVariant: PERSONAL_REVENUE_MILESTONES[2].celebrationVariant,
  },
  team_revenue_30k: {
    title: TEAM_REVENUE_MILESTONES[0].title,
    description: TEAM_REVENUE_MILESTONES[0].description,
    celebrationSubtitle: TEAM_REVENUE_MILESTONES[0].celebrationSubtitle,
    sound: TEAM_REVENUE_MILESTONES[0].sound,
    celebrationVariant: TEAM_REVENUE_MILESTONES[0].celebrationVariant,
  },
  team_revenue_40k: {
    title: TEAM_REVENUE_MILESTONES[1].title,
    description: TEAM_REVENUE_MILESTONES[1].description,
    celebrationSubtitle: TEAM_REVENUE_MILESTONES[1].celebrationSubtitle,
    sound: TEAM_REVENUE_MILESTONES[1].sound,
    celebrationVariant: TEAM_REVENUE_MILESTONES[1].celebrationVariant,
  },
};
