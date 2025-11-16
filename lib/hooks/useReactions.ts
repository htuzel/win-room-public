// Win Room v2.0 - Reaction helper hook
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ReactionAggregate, ReactionTargetType } from '@/lib/types';

interface ReactionMap {
  [targetId: number]: ReactionAggregate[];
}

export function useReactions(targetType: ReactionTargetType, token: string | null, socket?: Socket | null) {
  const [summaries, setSummaries] = useState<ReactionMap>({});

  const fetchReactions = useCallback(
    async (targetIds: number[]) => {
      if (!token || !targetIds.length) return;
      try {
        const params = new URLSearchParams({
          target_type: targetType,
          target_ids: targetIds.join(','),
        });
        const res = await fetch(`/api/emojis?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as Record<string, ReactionAggregate[]>;
          setSummaries((prev) => {
            const next = { ...prev };
            Object.entries(data).forEach(([id, summary]) => {
              next[Number(id)] = summary;
            });
            return next;
          });
        }
      } catch (error) {
        console.error('Failed to fetch reactions:', error);
      }
    },
    [targetType, token]
  );

  const toggleReaction = useCallback(
    async (targetId: number, emoji: string) => {
      if (!token) return;
      try {
        const res = await fetch('/api/emojis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            target_type: targetType,
            target_id: targetId,
            emoji,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSummaries((prev) => ({
            ...prev,
            [targetId]: data.summary || [],
          }));
        }
      } catch (error) {
        console.error('Failed to toggle reaction:', error);
      }
    },
    [targetType, token]
  );

  useEffect(() => {
    if (!socket) return;

    const handleReactionEvent = (event: any) => {
      if (event?.payload?.target_type === targetType) {
        const id = Number(event.payload.target_id);
        if (!Number.isNaN(id)) {
          fetchReactions([id]);
        }
      }
    };

    socket.on('emoji.added', handleReactionEvent);
    socket.on('emoji.removed', handleReactionEvent);

    return () => {
      socket.off('emoji.added', handleReactionEvent);
      socket.off('emoji.removed', handleReactionEvent);
    };
  }, [socket, targetType, fetchReactions]);

  return { summaries, fetchReactions, toggleReaction };
}
