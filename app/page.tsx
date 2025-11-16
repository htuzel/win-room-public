// Win Room v2.0 - Main Dashboard
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { QueueCard } from '@/components/queue/QueueCard';
import { ManualQueueEntryModal } from '@/components/queue/ManualQueueEntryModal';
import { LeaderboardBar } from '@/components/leaderboard/LeaderboardBar';
import { GoalProgress } from '@/components/goals/GoalProgress';
import { AchievementStories } from '@/components/achievements/AchievementStories';
import { ClaimModal } from '@/components/ui/ClaimModal';
import { ConversionLatencyNotice } from '@/components/ui/ConversionLatencyNotice';
import { PeriodFilter } from '@/components/ui/PeriodFilter';
import { StreakOverlay } from '@/components/ui/StreakOverlay';
import { JackpotOverlay } from '@/components/ui/JackpotOverlay';
import { GoalCelebrationOverlay, type GoalCelebrationPayload } from '@/components/ui/GoalCelebrationOverlay';
import { PromotionBanner } from '@/components/ui/PromotionBanner';
import { GlobalGoalProgress } from '@/components/stats/GlobalGoalProgress';
import { AdminStatsPanel } from '@/components/stats/AdminStatsPanel';
import { PersonalGoalsPanel } from '@/components/goals/PersonalGoalsPanel';
import { RecentClaimsStreak } from '@/components/claims/RecentClaimsStreak';
import { TeamChat } from '@/components/social/TeamChat';
import { useSocket } from '@/lib/hooks/useSocket';
import { useAudio, type SoundName } from '@/lib/hooks/useAudio';
import { useReactions } from '@/lib/hooks/useReactions';
import { celebrateJackpot, celebrateStreak, celebrateClaim } from '@/lib/helpers/confetti';
import { ACHIEVEMENT_BROADCAST_META } from '@/lib/constants/achievements';
import type {
  QueueItem,
  LeaderboardEntry,
  GoalProgress as GoalProgressType,
  UserMetrics,
  ClaimType,
  AchievementBadge,
  ChatMessage,
  AchievementType,
} from '@/lib/types';
import type { PeriodKey } from '@/lib/helpers/periods';

type CelebrationVariant = GoalCelebrationPayload['variant'];

export default function Dashboard() {
  const router = useRouter();
  const { token, user, logout, isAuthenticated } = useAuth();

  // Hydration state
  const [isMounted, setIsMounted] = useState(false);

  // Data state
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [revenueLeaderboard, setRevenueLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [marginLeaderboard, setMarginLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [conversionLeaderboard, setConversionLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [goals, setGoals] = useState<GoalProgressType[]>([]);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [leaderboardType, setLeaderboardType] = useState<'revenue' | 'wins' | 'margin' | 'conversion'>('revenue');
  const [claimCooldownActive, setClaimCooldownActive] = useState(false);
  const [streakOverlay, setStreakOverlay] = useState({ visible: false, sellerId: '', count: 0 });
  const [jackpotOverlay, setJackpotOverlay] = useState({ visible: false, sellerId: '' });
  const [audioUnlocking, setAudioUnlocking] = useState(false);
  const [personalGoals, setPersonalGoals] = useState<GoalProgressType[]>([]);
  const [personalGoalsLoading, setPersonalGoalsLoading] = useState(true);
  const [goalCelebration, setGoalCelebration] = useState<GoalCelebrationPayload | null>(null);
  const [currentPromotion, setCurrentPromotion] = useState<{
    title: string;
    message: string;
    variant: 'promo' | 'info' | 'success' | 'warning';
    icon: string;
    visible: boolean;
  } | null>(null);
  const [achievements, setAchievements] = useState<AchievementBadge[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatSending, setChatSending] = useState(false);
  const [queueEmailFilter, setQueueEmailFilter] = useState('');
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const averageGoalEnergy = useMemo(() => {
    if (!goals.length) return 0.35;
    const avg = goals.reduce((acc, goal) => acc + goal.percent, 0) / goals.length;
    return Math.min(0.85, Math.max(0.2, avg));
  }, [goals]);

  const upsertAchievement = useCallback((entry: AchievementBadge) => {
    setAchievements((prev) => {
      const filtered = prev.filter((item) => item.id !== entry.id);
      return [entry, ...filtered].slice(0, 12);
    });
  }, []);

  const currencyFormatterExact = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }),
    [],
  );

  const currencyFormatterRounded = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }),
    [],
  );

  const formatLeaderboardUSD = (value: number) =>
    Math.abs(value) < 1000 ? currencyFormatterExact.format(value) : currencyFormatterRounded.format(value);

  useEffect(() => {
    document.body.style.setProperty('--energy-level', averageGoalEnergy.toFixed(2));
    return () => {
      document.body.style.setProperty('--energy-level', '0.35');
    };
  }, [averageGoalEnergy]);

  // Modal state
  const [claimModal, setClaimModal] = useState<{ isOpen: boolean; subscriptionId: number | null }>({
    isOpen: false,
    subscriptionId: null,
  });
  const [manualQueueModalOpen, setManualQueueModalOpen] = useState(false);

  // WebSocket
  const { socket, connected } = useSocket(token);
  const { play, audioUnlocked, unlockAudio, setVolume } = useAudio();
  const queueReactionsHook = useReactions('queue', token, socket);
  const badgeReactionsHook = useReactions('badge', token, socket);
  const claimReactionsHook = useReactions('claim', token, socket);
  const { summaries: queueReactionMap, fetchReactions: fetchQueueReactions, toggleReaction: toggleQueueReaction } =
    queueReactionsHook;
  const { summaries: badgeReactionMap, fetchReactions: fetchBadgeReactions, toggleReaction: toggleBadgeReaction } =
    badgeReactionsHook;
  const { summaries: claimReactionMap, fetchReactions: fetchClaimReactions, toggleReaction: toggleClaimReaction } =
    claimReactionsHook;

  const fetchAchievements = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/achievements?limit=12', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAchievements(data);
        const ids = data
          .map((item: AchievementBadge) => Number(item.id))
          .filter((id: number) => Number.isFinite(id) && id > 0);
        if (ids.length) {
          fetchBadgeReactions(ids);
        }
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    }
  }, [token, fetchBadgeReactions]);

  // Goal celebration handler
  const triggerGoalCelebration = useCallback((payload: GoalCelebrationPayload) => {
    setGoalCelebration(payload);
    if (celebrationTimerRef.current) {
      clearTimeout(celebrationTimerRef.current);
    }
    celebrationTimerRef.current = setTimeout(() => setGoalCelebration(null), 3200);
  }, []);

  // Chat functions
  const fetchChats = useCallback(async () => {
    if (!token) return;
    try {
      setChatLoading(true);
      const res = await fetch('/api/chats?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setChatLoading(false);
    }
  }, [token]);

  const handleSendChat = useCallback(
    async (message: string) => {
      if (!token) return;
      try {
        setChatSending(true);
        const res = await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message }),
        });
        if (res.ok) {
          const data = await res.json();
          setChatMessages((prev) => [data, ...prev.filter((msg) => msg.id !== data.id)].slice(0, 50));
        }
      } catch (error) {
        console.error('Failed to send chat message:', error);
      } finally {
        setChatSending(false);
      }
    },
    [token]
  );

  // Mark as mounted after client-side hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load audio preference from localStorage
  useEffect(() => {
    const savedPref = localStorage.getItem('audioEnabled');
    if (savedPref !== null) {
      const enabled = savedPref === 'true';
      setAudioEnabled(enabled);
      setVolume(enabled ? 0.7 : 0);
    }
  }, [setVolume]);

  // Update volume when audio toggle changes
  useEffect(() => {
    localStorage.setItem('audioEnabled', audioEnabled.toString());
    setVolume(audioEnabled ? 0.7 : 0);
  }, [audioEnabled, setVolume]);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) {
        clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isMounted) return; // Wait for hydration

    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isMounted, isAuthenticated, router]);

  // Fetch initial data
  useEffect(() => {
    if (!token) return;

    fetchQueue();
    fetchLeaderboard();
    fetchRevenueLeaderboard();
    fetchMarginLeaderboard();
    fetchConversionLeaderboard();
    fetchGoals();
    fetchMetrics();
    fetchCurrentPromotion();
  }, [token, period]);

  useEffect(() => {
    if (!token) return;
    fetchAchievements();
  }, [token, fetchAchievements]);

  useEffect(() => {
    if (!token) return;
    fetchChats();
  }, [token, fetchChats]);

  useEffect(() => {
    if (!token) return;
    setPersonalGoalsLoading(true);
    fetchPersonalGoals();
  }, [token]);

  // Personal/team goal and revenue achievements are now emitted by worker; client listens for broadcasts.

  // Achievement broadcast handler
  const handleAchievementBroadcast = useCallback(
    (eventPayload: any) => {
      if (!eventPayload) return;

      const achievementType = eventPayload.achievement_type as AchievementType | undefined;
      if (!achievementType) return;

      if (eventPayload.seller_id && eventPayload.seller_id === user?.seller_id) {
        return;
      }

      const celebration = eventPayload.celebration ?? eventPayload.data?.celebration ?? {};
      const meta = ACHIEVEMENT_BROADCAST_META[achievementType];
      const sound = (celebration.sound as SoundName) || (meta?.sound as SoundName | undefined);
      const variant =
        (celebration.variant as CelebrationVariant) || (meta?.celebrationVariant as CelebrationVariant | undefined);
      const title = celebration.title ?? eventPayload.title ?? meta?.title;
      const subtitle = celebration.subtitle ?? eventPayload.description ?? meta?.celebrationSubtitle;

      if (!sound || !variant || !title) {
        return;
      }

      play(sound);
      triggerGoalCelebration({
        variant,
        title,
        subtitle: subtitle ?? '',
      });
    },
    [play, triggerGoalCelebration, user?.seller_id]
  );

  // WebSocket event handlers
  useEffect(() => {
    if (!socket) return;

    let streakTimer: ReturnType<typeof setTimeout> | undefined;
    let jackpotTimer: ReturnType<typeof setTimeout> | undefined;

    socket.on('queue.new', (data) => {
      console.log('[Event] New sale in queue', data);
      play('notification');
      fetchQueue();
    });

    socket.on('claimed', (data) => {
      console.log('[Event] Sale claimed', data);

      // Trigger celebratory feedback for everyone except the original claimer
      // (they already got instant feedback when submitting the claim)
      if (data?.actor !== user?.seller_id) {
        play('claim');
        celebrateClaim();
      }

      fetchQueue();
      fetchLeaderboard();
      fetchRevenueLeaderboard();
      fetchMarginLeaderboard();
      fetchConversionLeaderboard();
      fetchMetrics();
      setStatsRefreshKey((prev) => prev + 1); // Refresh admin stats

      // Trigger refresh for recent claims component
      window.dispatchEvent(new CustomEvent('claims:refresh'));
    });

    socket.on('streak', (data) => {
      console.log('[Event] Streak!', data);
      play('streak');
      celebrateStreak();
      const streakCount = data?.payload?.count ?? 3;
      const sellerId = data?.actor ?? 'Unknown';
      setStreakOverlay({ visible: true, sellerId, count: streakCount });
      fetchAchievements();
      if (streakTimer) clearTimeout(streakTimer);
      streakTimer = setTimeout(() => setStreakOverlay((prev) => ({ ...prev, visible: false })), 2600);
    });

    socket.on('jackpot', (data) => {
      console.log('[Event] JACKPOT!', data);
      play('jackpot');
      celebrateJackpot();
      const sellerId = data?.actor ?? 'Unknown';
      setJackpotOverlay({ visible: true, sellerId });
      fetchAchievements();
      if (jackpotTimer) clearTimeout(jackpotTimer);
      jackpotTimer = setTimeout(() => setJackpotOverlay((prev) => ({ ...prev, visible: false })), 3200);
    });

    socket.on('goal.progress', () => {
      fetchGoals();
      fetchPersonalGoals();
    });

    socket.on('achievement.created', (event) => {
      console.log('[Event] Achievement created', event);
      fetchAchievements();
      handleAchievementBroadcast(event?.payload);
    });

    socket.on('queue.excluded', (data) => {
      fetchQueue();
      fetchLeaderboard();
      fetchRevenueLeaderboard();
      fetchMarginLeaderboard();
      fetchConversionLeaderboard();
      fetchMetrics();
      setStatsRefreshKey((prev) => prev + 1);
    });

    socket.on('refund.applied', () => {
      fetchQueue();
      fetchLeaderboard();
      fetchRevenueLeaderboard();
      fetchMarginLeaderboard();
      fetchConversionLeaderboard();
      fetchMetrics();
      setStatsRefreshKey((prev) => prev + 1);
    });

    socket.on('objection.resolved', (data) => {
      fetchQueue();
      fetchLeaderboard();
      fetchRevenueLeaderboard();
      fetchMarginLeaderboard();
      fetchConversionLeaderboard();
      fetchMetrics();
      setStatsRefreshKey((prev) => prev + 1);
    });

    socket.on('claim.adjusted', (data) => {
      console.log('[Event] Claim adjusted', data);

      // Refresh leaderboards and metrics to reflect adjustment
      fetchLeaderboard();
      fetchRevenueLeaderboard();
      fetchMarginLeaderboard();
      fetchConversionLeaderboard();
      fetchMetrics();
      setStatsRefreshKey((prev) => prev + 1);

      // Optional: Show notification if it's user's claim
      if (data.payload?.claim_owner === user?.seller_id) {
        console.log(`Your claim adjusted: ${data.payload.reason} (-$${data.payload.additional_cost_usd})`);
      }
    });

    socket.on('finance.status_changed', (data) => {
      console.log('[Event] Finance status changed', data);

      // Refresh leaderboards and metrics
      fetchLeaderboard();
      fetchRevenueLeaderboard();
      fetchMarginLeaderboard();
      fetchConversionLeaderboard();
      fetchMetrics();
      setStatsRefreshKey((prev) => prev + 1);

      // Show notification if it's user's claim
      if (data.payload?.claimed_by === user?.seller_id) {
        console.log(`Finance status updated for your claim: ${data.payload.new_status}`);
      }
    });

    socket.on('chat.message', (event) => {
      const message = event?.payload;
      if (message) {
        setChatMessages((prev) => [message, ...prev.filter((msg) => msg.id !== message.id)].slice(0, 50));
      }
    });

    return () => {
      if (streakTimer) clearTimeout(streakTimer);
      if (jackpotTimer) clearTimeout(jackpotTimer);
      socket.off('queue.new');
      socket.off('claimed');
      socket.off('streak');
      socket.off('jackpot');
      socket.off('goal.progress');
      socket.off('achievement.created');
      socket.off('queue.excluded');
      socket.off('refund.applied');
      socket.off('objection.resolved');
      socket.off('claim.adjusted');
      socket.off('finance.status_changed');
      socket.off('chat.message');
    };
  }, [socket, user, play, fetchAchievements, handleAchievementBroadcast]);

  // API calls
  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/queue', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        console.log('[Queue] Fetched queue items:', data.length);

        // Log first item to check structure
        if (data.length > 0) {
          console.log('[Queue] First item sample:', {
            id: data[0].id,
            subscription_id: data[0].subscription_id,
            has_subscription_id: !!data[0].subscription_id,
            type: typeof data[0].subscription_id,
          });
        }

        setQueue(data);
        const ids = data.map((item: QueueItem) => Number(item.subscription_id)).filter((id: number) => Number.isFinite(id) && id > 0);
        if (ids.length) {
          fetchQueueReactions(ids as number[]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`/api/leaderboard/wins?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const fetchRevenueLeaderboard = async () => {
    try {
      const res = await fetch(`/api/leaderboard/revenue?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRevenueLeaderboard(data);
      }
    } catch (error) {
      console.error('Failed to fetch revenue leaderboard:', error);
    }
  };

  const fetchMarginLeaderboard = async () => {
    try {
      const res = await fetch(`/api/leaderboard/margin?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMarginLeaderboard(data);
      }
    } catch (error) {
      console.error('Failed to fetch margin leaderboard:', error);
    }
  };

  const fetchConversionLeaderboard = async () => {
    try {
      const res = await fetch(`/api/leaderboard/conversion?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversionLeaderboard(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversion leaderboard:', error);
    }
  };

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals/progress', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGoals(data);
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    }
  };

  const fetchPersonalGoals = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/me/goals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPersonalGoals(data);
      }
    } catch (error) {
      console.error('Failed to fetch personal goals:', error);
    } finally {
      setPersonalGoalsLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`/api/me/metrics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const fetchCurrentPromotion = async () => {
    try {
      const res = await fetch('/api/promotions/current');
      if (res.ok) {
        const data = await res.json();
        setCurrentPromotion(data);
      }
    } catch (error) {
      console.error('Failed to fetch promotion:', error);
    }
  };

  const triggerClaimCooldown = () => {
    setClaimCooldownActive(true);
    setTimeout(() => setClaimCooldownActive(false), 3000);
  };

  const handleUnlockAudio = async () => {
    if (audioUnlocked || audioUnlocking) return;
    setAudioUnlocking(true);
    const unlocked = await unlockAudio();
    if (!unlocked) {
      alert('Tarayıcı sesi şu anda açamadı, lütfen tekrar deneyin.');
    }
    setAudioUnlocking(false);
  };

  const handleClaimsLoaded = useCallback(
    (ids: number[]) => {
      fetchClaimReactions(ids);
    },
    [fetchClaimReactions]
  );

  const handleAchievementReplay = useCallback(
    (achievement: AchievementBadge) => {
      switch (achievement.type) {
        case 'streak':
          play('streak');
          celebrateStreak();
          break;
        case 'jackpot':
          play('jackpot');
          celebrateJackpot();
          break;
        case 'personal_goal':
          play('member_mission');
          triggerGoalCelebration({
            variant: 'member',
            title: achievement.title,
            subtitle: achievement.description || '',
          });
          break;
        case 'team_goal':
          play('team_mission');
          triggerGoalCelebration({
            variant: 'team',
            title: achievement.title,
            subtitle: achievement.description || '',
          });
          break;
        case 'daily_revenue':
          play('happy');
          triggerGoalCelebration({
            variant: 'daily',
            title: achievement.title,
            subtitle: achievement.description || '',
          });
          break;
        case 'personal_revenue_4k':
        case 'personal_revenue_8k':
        case 'personal_revenue_10k':
        case 'team_revenue_30k':
        case 'team_revenue_40k': {
          const meta = ACHIEVEMENT_BROADCAST_META[achievement.type];
          if (meta) {
            play(meta.sound);
            triggerGoalCelebration({
              variant: meta.celebrationVariant,
              title: achievement.title,
              subtitle: achievement.description || meta.celebrationSubtitle,
            });
          }
          break;
        }
        default:
          break;
      }
    },
    [play, triggerGoalCelebration]
  );

  const handleAchievementReact = useCallback(
    (achievementId: number, emoji: string) => {
      toggleBadgeReaction(achievementId, emoji);
    },
    [toggleBadgeReaction]
  );

  // Handlers
  const handleHoldClaim = async (subscriptionId: number) => {
    console.log('[Claim] handleHoldClaim called with:', {
      subscriptionId,
      type: typeof subscriptionId,
      isNumber: typeof subscriptionId === 'number',
      parsed: Number(subscriptionId),
    });

    // Convert to number if needed (handles string inputs)
    const subId = typeof subscriptionId === 'string' ? parseInt(subscriptionId, 10) : subscriptionId;

    if (!subId || isNaN(subId) || subId <= 0) {
      console.error('[Claim Error] Invalid subscription_id after parsing:', {
        original: subscriptionId,
        parsed: subId,
      });
      alert('Invalid subscription ID. Please refresh the page and try again.');
      return;
    }

    console.log('[Claim] Opening modal for subscription:', subId);
    setClaimModal({ isOpen: true, subscriptionId: subId });
  };

  const handleClaimConfirm = async ({
    claimType,
    installmentPlanId,
    installmentCount,
  }: {
    claimType: ClaimType;
    installmentPlanId?: number;
    installmentCount?: number;
  }) => {
    if (!user) {
      alert('User not authenticated');
      return;
    }

    if (!claimModal.subscriptionId || typeof claimModal.subscriptionId !== 'number') {
      console.error('[Claim Error] Invalid subscription_id in modal:', claimModal.subscriptionId);
      alert('Invalid subscription ID. Please close this modal and try again.');
      setClaimModal({ isOpen: false, subscriptionId: null });
      return;
    }

    const subscriptionId = claimModal.subscriptionId;

    console.log('[Claim] Submitting claim:', {
      subscription_id: subscriptionId,
      claimed_by: user.seller_id,
      claim_type: claimType,
    });

    // Optimistically close modal so UI remains interactive while request runs
    setClaimModal({ isOpen: false, subscriptionId: null });

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          claimed_by: user.seller_id,
          claim_type: claimType,
          installment_plan_id: installmentPlanId,
          installment_count: installmentCount,
        }),
      });

      if (res.ok) {
        // Immediate feedback for successful claim (before WebSocket event)
        play('claim');
        celebrateClaim();

        triggerClaimCooldown();

        // Refresh all data after claim
        fetchQueue();
        fetchLeaderboard();
        fetchRevenueLeaderboard();
        fetchMarginLeaderboard();
        fetchConversionLeaderboard();
        fetchMetrics();
        fetchGoals();
        fetchPersonalGoals();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to claim');
      }
    } catch (error) {
      console.error('Claim error:', error);
      alert('Failed to claim');
    }
  };

  // Don't render until after hydration to prevent mismatch
  if (!isMounted) {
    return null;
  }

  // Show loading while checking auth
  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <>
      <StreakOverlay visible={streakOverlay.visible} sellerId={streakOverlay.sellerId} streakCount={streakOverlay.count} />
      <JackpotOverlay visible={jackpotOverlay.visible} sellerId={jackpotOverlay.sellerId} />
      <GoalCelebrationOverlay celebration={goalCelebration} />
      <div className="min-h-screen bg-background/60 p-6">
        <div className="mx-auto max-w-7xl space-y-8">
          {!audioUnlocked && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-5 py-4 text-sm text-foreground/80">
              <div>
                <p className="font-semibold text-foreground">Sesleri etkinleştir</p>
                <p className="text-xs text-foreground/60">Claim, streak ve jackpot uyarılarını duyabilmek için tarayıcıya izin ver.</p>
              </div>
              <button
                onClick={handleUnlockAudio}
                disabled={audioUnlocking}
                className="rounded-lg border border-amber-400 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-100 hover:bg-amber-400/20 disabled:opacity-50"
              >
                {audioUnlocking ? 'Etkinleştiriliyor...' : 'Sesleri Aç'}
              </button>
            </div>
          )}

          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/flalingoLogo.webp"
                alt="Flalingo"
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">Win Room</h1>
                <p className="text-sm text-accent font-medium">Built for ⚡ Challenge</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-foreground mb-1">
                  {user?.seller_id}
                </div>
                <div className="flex items-center gap-2 justify-end">
                  {connected && (
                    <span className="px-2 py-1 bg-success/20 text-success text-xs rounded">
                      Live
                    </span>
                  )}
                  <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded capitalize">
                    {user?.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAudioEnabled((prev) => !prev)}
                className={`p-2 rounded-lg border transition-colors ${
                  audioEnabled
                    ? 'bg-accent/20 text-accent border-accent/40 hover:bg-accent/30'
                    : 'bg-surface border-border text-foreground/40 hover:bg-background'
                }`}
                title={audioEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
              >
                {audioEnabled ? '🔊' : '🔇'}
              </button>
              <PeriodFilter value={period} onChange={setPeriod} />
              <button
                onClick={() => router.push('/recent-sales')}
                className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-400/40 font-medium rounded-lg hover:bg-amber-500/30 transition-colors"
              >
                Son 120h
              </button>
              <button
                onClick={() => router.push('/my-sales')}
                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 font-medium rounded-lg hover:bg-emerald-500/30 transition-colors"
              >
                Benim Satışlarım
              </button>
              <button
                onClick={() => router.push('/installments')}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-400/40 font-medium rounded-lg hover:bg-blue-500/30 transition-colors"
              >
                Installments
              </button>
              {['admin', 'finance', 'sales_lead'].includes(user?.role || '') && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 bg-accent text-black font-medium rounded-lg hover:bg-accent-hover transition-colors"
                >
                  Admin
                </button>
              )}
              <button
                onClick={logout}
                className="px-4 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-background transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          {achievements.length > 0 && (
            <AchievementStories
              achievements={achievements}
              className="mb-8"
              onReplay={handleAchievementReplay}
              reactions={badgeReactionMap}
              onReact={(achievementId, emoji) => handleAchievementReact(achievementId, emoji)}
            />
          )}

          {/* Admin Stats Panel - Only for admin/finance */}
          {['admin', 'finance', 'sales_lead'].includes(user?.role || '') && (
            <AdminStatsPanel token={token} period={period} refreshKey={statsRefreshKey} />
          )}

          {/* Global Goal Progress - Visible to all */}
          <GlobalGoalProgress token={token} />

          {/* Personal Goals - Owner only */}
          <PersonalGoalsPanel goals={personalGoals} loading={personalGoalsLoading} />

          {/* Personal Metrics */}
          {!['admin', 'finance'].includes(user?.role || '') && metrics && (
            <div className="grid grid-cols-1 gap-4 rounded-3xl border border-border/60 bg-surface/70 p-6 shadow-[0_24px_45px_rgba(0,0,0,0.25)] md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.45em] text-foreground/40">Wins</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{metrics.wins}</p>
                {metrics.change && (
                  <p className={`text-xs font-semibold ${metrics.change.wins >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {metrics.change.wins >= 0 ? '↑' : '↓'} {Math.abs(metrics.change.wins).toFixed(1)}% vs önceki dönem
                  </p>
                )}
                <p className="text-xs text-foreground/50">Toplam claim sayın.</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.45em] text-foreground/40">Revenue</p>
                <p className="mt-2 text-2xl font-bold text-foreground">${metrics.revenue_usd.toFixed(0)}</p>
                {metrics.change && (
                  <p className={`text-xs font-semibold ${metrics.change.revenue_usd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {metrics.change.revenue_usd >= 0 ? '↑' : '↓'} {Math.abs(metrics.change.revenue_usd).toFixed(1)}% vs önceki dönem
                  </p>
                )}
                <p className="text-xs text-foreground/50">Sadece sen görürsün.</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.45em] text-foreground/40">Margin</p>
                <p className="mt-2 text-2xl font-bold text-foreground">${metrics.margin_amount_usd.toFixed(0)}</p>
                {metrics.change && (
                  <p className={`text-xs font-semibold ${metrics.change.margin_amount_usd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {metrics.change.margin_amount_usd >= 0 ? '↑' : '↓'} {Math.abs(metrics.change.margin_amount_usd).toFixed(1)}% vs önceki dönem
                  </p>
                )}
                <p className="text-xs text-foreground/50">Net katkın.</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.45em] text-foreground/40">Avg %</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{(metrics.avg_margin_percent * 100).toFixed(1)}%</p>
                {metrics.change && (
                  <p className={`text-xs font-semibold ${metrics.change.avg_margin_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {metrics.change.avg_margin_percent >= 0 ? '↑' : '↓'} {Math.abs(metrics.change.avg_margin_percent).toFixed(1)}% vs önceki dönem
                  </p>
                )}
                <p className="text-xs text-foreground/50">Kalite skorun.</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.45em] text-foreground/40">Leads</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{metrics.leads_assigned ?? 0}</p>
                {metrics.change && metrics.change.leads_assigned !== undefined && (
                  <p className={`text-xs font-semibold ${metrics.change.leads_assigned >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {metrics.change.leads_assigned >= 0 ? '↑' : '↓'} {Math.abs(metrics.change.leads_assigned).toFixed(1)}% vs önceki dönem
                  </p>
                )}
                <p className="text-xs text-foreground/50">24h/haftalık lead atanması.</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.45em] text-foreground/40">Conversion</p>
                <p className="mt-2 text-2xl font-bold text-accent">
                  {((metrics.conversion_rate || 0) * 100).toFixed(1)}%
                </p>
                {metrics.change && metrics.change.conversion_rate !== undefined && (
                  <p className={`text-xs font-semibold ${metrics.change.conversion_rate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {metrics.change.conversion_rate >= 0 ? '↑' : '↓'} {Math.abs(metrics.change.conversion_rate).toFixed(1)}% vs önceki dönem
                  </p>
                )}
                <p className="text-xs text-foreground/50">Wins / Leads oranı.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Queue */}
            <div className="lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Live Queue</h2>
                <p className="text-sm text-foreground/50">Claim edilmemiş tüm satışlar. Email ile filtrele.</p>
              </div>
              <div className="flex items-center gap-3">
                {user && ['sales_lead', 'admin', 'finance'].includes(user.role) && (
                  <button
                    onClick={() => setManualQueueModalOpen(true)}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-hover transition-colors"
                  >
                    + Manual Entry
                  </button>
                )}
                {queue.length > 0 && (
                  <>
                    <span className="rounded-full bg-accent/20 px-3 py-1 text-sm font-bold text-accent">
                      {queue.length}
                    </span>
                    {['admin', 'finance', 'sales_lead'].includes(user?.role || '') && (
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-bold text-emerald-400">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 0,
                        }).format(
                          queue.reduce((sum, item) => sum + (item.revenue_usd || 0), 0)
                        )}
                      </span>
                    )}
                  </>
                )}
                {claimCooldownActive && (
                  <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-200">
                    Claim cooldown
                  </span>
                )}
              </div>
            </div>

            {/* Email Search */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Email veya isim ile ara..."
                  value={queueEmailFilter}
                  onChange={(e) => setQueueEmailFilter(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-4 py-2 pl-10 text-foreground placeholder-foreground/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40">
                  🔍
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {(() => {
                const filteredQueue = queueEmailFilter
                  ? queue.filter(item =>
                      (item.customer_email?.toLowerCase().includes(queueEmailFilter.toLowerCase())) ||
                      (item.customer_name?.toLowerCase().includes(queueEmailFilter.toLowerCase()))
                    )
                  : queue;

                return filteredQueue.length === 0 ? (
                  <div className="bg-surface border border-border rounded-lg p-8 text-center text-foreground/40">
                    {queueEmailFilter ? 'Filtreye uygun satış bulunamadı.' : 'No pending sales'}
                  </div>
                ) : (
                  filteredQueue.map((item) => (
                    <QueueCard
                      key={item.id}
                      item={item}
                      onClaim={handleHoldClaim}
                      claimCooldownActive={claimCooldownActive}
                      disabled={claimModal.isOpen}
                      reactions={queueReactionMap[item.subscription_id]}
                      onReact={(emoji) => toggleQueueReaction(item.subscription_id, emoji)}
                    />
                  ))
                );
              })()}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Promotion/Announcement Banner */}
            {currentPromotion && (
              <PromotionBanner
                title={currentPromotion.title}
                message={currentPromotion.message}
                variant={currentPromotion.variant}
                icon={currentPromotion.icon}
                visible={currentPromotion.visible}
              />
            )}

            {/* Goals */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Goals</h2>
              <div className="space-y-3">
                {goals.map((goal) => (
                  <GoalProgress key={goal.goal_id} goal={goal} />
                ))}
              </div>
            </div>

            {/* Recent Claims Streak */}
            <RecentClaimsStreak
              token={token}
              reactions={claimReactionMap}
              onReact={(claimId, emoji) => toggleClaimReaction(claimId, emoji)}
              onClaimsChange={handleClaimsLoaded}
            />

            {/* Leaderboard */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">Leaderboard</h2>
                  {leaderboardType === 'conversion' && <ConversionLatencyNotice />}
                </div>
                <div className="flex gap-2 bg-surface border border-border rounded-lg p-1">
                  <button
                    onClick={() => setLeaderboardType('revenue')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      leaderboardType === 'revenue'
                        ? 'bg-accent text-black'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Sales $
                  </button>
                  <button
                    onClick={() => setLeaderboardType('wins')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      leaderboardType === 'wins'
                        ? 'bg-accent text-black'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Wins
                  </button>
                  <button
                    onClick={() => setLeaderboardType('margin')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      leaderboardType === 'margin'
                        ? 'bg-accent text-black'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Margin
                  </button>
                  <button
                    onClick={() => setLeaderboardType('conversion')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      leaderboardType === 'conversion'
                        ? 'bg-accent text-black'
                        : 'text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    Conv %
                  </button>
                </div>
              </div>
              {(leaderboardType === 'wins'
                ? leaderboard
                : leaderboardType === 'margin'
                  ? marginLeaderboard
                  : leaderboardType === 'conversion'
                    ? conversionLeaderboard
                    : revenueLeaderboard
              ).map((entry) => {
                const metricLabel =
                  entry.value == null
                    ? '—'
                    : leaderboardType === 'wins'
                      ? `${Math.round(entry.value).toLocaleString('en-US')} wins`
                    : leaderboardType === 'conversion'
                      ? `${(entry.value * 100).toFixed(1)}% (${entry.leads_assigned || 0} leads)`
                      : `${formatLeaderboardUSD(entry.value)} ${
                          leaderboardType === 'margin' ? 'margin' : 'sales'
                        }`;

                return <LeaderboardBar key={entry.seller_id} entry={entry} metricLabel={metricLabel} />;
              })}
              </div>

            {/* Team Chat */}
            <TeamChat
              messages={chatMessages}
              onSend={handleSendChat}
              disabled={chatSending}
              loading={chatLoading}
              currentSellerId={user?.seller_id}
            />
          </div>
        </div>
        </div>
      </div>

      {/* Modals */}
      <ManualQueueEntryModal
        isOpen={manualQueueModalOpen}
        onClose={() => setManualQueueModalOpen(false)}
        token={token}
        onSuccess={fetchQueue}
      />
      <ClaimModal
        isOpen={claimModal.isOpen}
        subscriptionId={claimModal.subscriptionId ?? 0}
        token={token}
        onClose={() => setClaimModal({ isOpen: false, subscriptionId: null })}
        onConfirm={handleClaimConfirm}
      />
    </>
  );
}
