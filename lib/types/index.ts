// Win Room v2.0 - Type Definitions

import type { PeriodKey } from '../helpers/periods';

export type QueueStatus = 'pending' | 'claimed' | 'excluded' | 'expired' | 'refunded';

export type ClaimType = 'first_sales' | 'remarketing' | 'upgrade' | 'installment';

export type ObjectionReason = 'wrong_owner' | 'duplicate' | 'refund' | 'other';

export type ObjectionStatus = 'pending' | 'accepted' | 'rejected';

export type PeriodType = 'day' | '15d' | 'month';

export type TargetType = 'count' | 'revenue' | 'margin_amount';

export type EventType =
  | 'queue.new'
  | 'claimed'
  | 'streak'
  | 'jackpot'
  | 'goal.progress'
  | 'queue.excluded'
  | 'refund.applied'
  | 'objection.created'
  | 'objection.resolved'
  | 'claim.adjusted'
  | 'finance.status_changed'
  | 'emoji.added'
  | 'emoji.removed'
  | 'chat.message'
  | 'achievement.created';

export type AdjustmentReason = 'commission' | 'partial_refund' | 'chargeback' | 'other';

export type FinanceStatus = 'waiting' | 'approved' | 'installment' | 'problem';

export type InstallmentStatus = 'active' | 'completed' | 'frozen' | 'cancelled';

export type InstallmentPaymentStatus =
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'overdue'
  | 'waived'
  | 'rejected';

export interface QueueItem {
  id: number;
  subscription_id: number;
  user_id: number;
  source_created_at: string;
  status: QueueStatus;
  fingerprint?: string;
  created_at: string;
  created_by?: string;
  is_manual?: boolean;
  excluded_by?: string;
  excluded_at?: string;
  exclude_reason?: string;
  // Joined fields
  tts?: string; // Time to sale
  claim_suggested_seller?: string;
  margin_percent?: number;
  sales_person?: string;
  customer_email?: string;
  customer_name?: string;
  is_kid_account?: boolean;
  campaign_name?: string;
  revenue_usd?: number;
  cost_usd?: number;
  margin_amount_usd?: number;
  subs_amount?: number;
  currency?: string;
  payment_channel?: string;
  subscription_created_at?: string;
  custom_note?: string;
  subs_note?: string;
  created_by_email?: string;
  installment_count?: number;
  installment_plan_id?: number;
}

export interface Claim {
  id: number;
  subscription_id: number;
  claimed_by: string;
  claim_type: ClaimType;
  claimed_at: string;
  attribution_source: string;
  queue_created_by?: string | null;
  queue_created_by_email?: string | null;
  queue_is_manual?: boolean;
  closer_share_percent?: number;
  assisted_share_percent?: number;
  // Finance approval info
  finance_status?: FinanceStatus;
  finance_approved_by?: string;
  finance_approved_at?: string;
  finance_notes?: string;
  installment_count?: number;
  installment_plan_id?: number;
  // Adjustment info (from joined data)
  total_additional_cost_usd?: number;
  adjustment_count?: number;
  adjustment_reasons?: string;
  last_adjusted_at?: string;
}

export interface InstallmentPlan {
  id: number;
  subscription_id: number;
  claim_id?: number;
  customer_name?: string;
  customer_email?: string;
  total_amount?: number;
  currency?: string;
  total_installments: number;
  default_interval_days?: number;
  status: InstallmentStatus;
  next_due_payment_id?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  frozen_at?: string;
  frozen_by?: string;
  frozen_reason?: string;
  notes?: string;
  payments?: InstallmentPayment[];
  paid_count?: number;
  total_payments?: number;
  submitted_count?: number;
  overdue_count?: number;
}

export interface InstallmentPayment {
  id: number;
  installment_id: number;
  payment_number: number;
  due_date: string;
  amount?: number;
  status: InstallmentPaymentStatus;
  paid_at?: string;
  paid_amount?: number;
  payment_channel?: string;
  submitted_by?: string;
  submitted_at?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  rejection_reason?: string;
  notes?: string;
  tolerance_until?: string;
  tolerance_reason?: string;
  tolerance_given_by?: string;
  created_at: string;
  updated_at: string;
  overdue_days?: number;
  tolerance_active?: boolean;
}

export interface ClaimAdjustment {
  id: number;
  subscription_id: number;
  claim_id: number;
  additional_cost_usd: number;
  reason: AdjustmentReason;
  notes?: string;
  adjusted_by: string;
  created_at: string;
}

export interface ClaimWithMetrics extends Claim {
  revenue_usd?: number;
  cost_usd?: number;
  original_margin_usd?: number;
  original_margin_percent?: number;
  adjusted_margin_usd?: number;
  adjusted_margin_percent?: number;
  closer_seller_id?: string;
  closer_name?: string;
  assisted_seller_id?: string;
  customer_email?: string;
  customer_name?: string;
  payment_channel?: string;
  subs_amount?: number;
  currency?: string;
}

export interface Attribution {
  subscription_id: number;
  closer_seller_id: string;
  resolved_from: string;
  resolved_at: string;
  assisted_seller_id?: string;
}

export interface Seller {
  seller_id: string;
  display_name: string;
  pipedrive_owner_id?: number;
  core_sales_person?: string;
  email?: string;
  is_active: boolean;
}

export interface WREvent {
  id: number;
  type: EventType;
  subscription_id?: number;
  actor?: string;
  payload?: any;
  created_at: string;
}

export type AchievementType =
  | 'streak'
  | 'jackpot'
  | 'personal_goal'
  | 'team_goal'
  | 'daily_revenue'
  | 'personal_revenue_4k'
  | 'personal_revenue_8k'
  | 'personal_revenue_10k'
  | 'team_revenue_30k'
  | 'team_revenue_40k';

export interface AchievementBadge {
  id: string | number;
  type: AchievementType;
  title: string;
  description: string;
  seller_id?: string;
  payload?: Record<string, any> | null;
  dedupe_key?: string | null;
  created_at: string;
}

export type ReactionTargetType = 'queue' | 'claim' | 'badge';

export interface ReactionUser {
  seller_id: string;
  created_at: string;
}

export interface ReactionAggregate {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
  users: ReactionUser[];
}

export interface ChatMessage {
  id: number;
  seller_id: string;
  display_name?: string | null;
  message: string;
  created_at: string;
}

export interface SalesGoal {
  id: number;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  target_type: TargetType;
  target_value: number;
  visibility_scope: 'admin_only' | 'sales_percent_only';
  created_at: string;
  updated_at: string;
}

export interface PersonalGoal {
  id: number;
  seller_id: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  target_type: TargetType;
  target_value: number;
  visibility_scope: 'owner_only' | 'admin_only';
  created_at: string;
  updated_at: string;
}

export interface Objection {
  id: number;
  subscription_id: number;
  raised_by: string;
  reason: ObjectionReason;
  details?: string;
  status: ObjectionStatus;
  admin_note?: string;
  created_at: string;
  resolved_at?: string;
}

export interface SubscriptionMetrics {
  subscription_id: number;
  revenue_usd?: number;
  cost_usd?: number;
  margin_amount_usd?: number;
  margin_percent?: number;
  is_jackpot: boolean;
  computed_at: string;
  currency_source: string;
  notes?: string;
}

export interface LeaderboardEntry {
  seller_id: string;
  rank: number;
  bar_value_norm: number; // 0..1 normalized
  value?: number;
  value_unit?: 'count' | 'usd' | 'percent';
  leads_assigned?: number;
  wins?: number;
  you?: boolean;
}

export interface UserMetrics {
  wins: number;
  revenue_usd: number;
  margin_amount_usd: number; // adjusted margin
  avg_margin_percent: number; // adjusted margin percent
  original_margin_amount_usd?: number; // margin before adjustments
  total_adjustments_usd?: number; // total adjustments applied
  leads_assigned?: number;
  conversion_rate?: number;
  // Previous period comparison
  previous?: {
    wins: number;
    revenue_usd: number;
    margin_amount_usd: number;
    avg_margin_percent: number;
    leads_assigned?: number;
    conversion_rate?: number;
  };
  change?: {
    wins: number; // percentage change
    revenue_usd: number; // percentage change
    margin_amount_usd: number; // percentage change
    avg_margin_percent: number; // percentage change
    leads_assigned?: number;
    conversion_rate?: number;
  };
}

export interface GoalProgress {
  goal_id: number;
  period_type: PeriodType;
  target_type: TargetType;
  percent: number; // 0..1
  current_value?: number;
  target_value?: number;
}

// API Request/Response Types
export interface ClaimRequest {
  subscription_id: number;
  claimed_by: string;
  claim_type: ClaimType;
  installment_plan_id?: number;
  installment_count?: number;
}

export interface ObjectionRequest {
  subscription_id: number;
  reason: ObjectionReason;
  details?: string;
}

export interface ObjectionResolveRequest {
  status: 'accepted' | 'rejected';
  admin_note?: string;
  action?: 'reassign' | 'exclude' | 'refund';
  reassign_to?: string;
}

export interface ExcludeRequest {
  subscription_id: number;
  reason: string;
  notes?: string;
}

export interface ClaimAdjustmentRequest {
  additional_cost_usd: number;
  reason: AdjustmentReason;
  notes?: string;
}

export interface AdminStatsFilter {
  period?: PeriodKey | 'all';
  seller_ids?: string[]; // Filter by specific sellers
}

// JWT Payload
export interface JWTPayload {
  seller_id: string;
  email: string;
  role: 'sales' | 'sales_lead' | 'admin' | 'finance';
  iat?: number;
  exp?: number;
}
