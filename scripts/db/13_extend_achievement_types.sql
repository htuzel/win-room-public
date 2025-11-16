-- Win Room v2.0 - Extend achievement enum with revenue milestones
-- IMPORTANT: Review before running!

ALTER TYPE wr.achievement_type ADD VALUE IF NOT EXISTS 'personal_revenue_4k';
ALTER TYPE wr.achievement_type ADD VALUE IF NOT EXISTS 'personal_revenue_8k';
ALTER TYPE wr.achievement_type ADD VALUE IF NOT EXISTS 'personal_revenue_10k';
ALTER TYPE wr.achievement_type ADD VALUE IF NOT EXISTS 'team_revenue_30k';
ALTER TYPE wr.achievement_type ADD VALUE IF NOT EXISTS 'team_revenue_40k';
