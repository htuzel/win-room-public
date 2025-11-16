// Win Room v2.0 - Audio Hook using Howler (Unified)
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Howl, Howler } from 'howler';

export type SoundName =
  | 'claim'
  | 'streak'
  | 'jackpot'
  | 'notification'
  | 'member_mission'
  | 'team_mission'
  | 'happy'
  | 'sales_4k'
  | 'sales_8k'
  | 'sales_10k'
  | 'team_30k'
  | 'team_40k';

interface AudioConfig {
  [key: string]: string;
}

const defaultSounds: AudioConfig = {
  claim: '/sounds/claim.mp3',
  streak: '/sounds/streak.mp3',
  jackpot: '/sounds/jackpot.mp3',
  notification: '/sounds/notification.mp3',
  member_mission: '/sounds/member_mission.mp3',
  team_mission: '/sounds/team_mission.mp3',
  happy: '/sounds/happy.mp3',
  sales_4k: '/sounds/4K.mp3',
  sales_8k: '/sounds/member_8K.mp3',
  sales_10k: '/sounds/10K.mp3',
  team_30k: '/sounds/30K.mp3',
  team_40k: '/sounds/40K.mp3',
};

function isAudioUnlocked(): boolean {
  if (typeof window === 'undefined') return true;
  const context = Howler?.ctx;
  if (!context) return true;
  return context.state === 'running';
}

export function useAudio(config: AudioConfig = defaultSounds) {
  const soundsRef = useRef<Record<string, Howl>>({});
  const volumeRef = useRef<number>(0.7);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(isAudioUnlocked);

  useEffect(() => {
    setAudioUnlocked(isAudioUnlocked());

    // Initialize sounds
    Object.entries(config).forEach(([key, src]) => {
      if (src) {
        try {
          soundsRef.current[key] = new Howl({
            src: [src],
            volume: volumeRef.current,
            preload: true,
            html5: true, // Better mobile support
            onloaderror: (id, error) => {
              console.warn(`[Audio] Failed to load ${key}:`, error);
            },
            onplayerror: (id, error) => {
              console.warn(`[Audio] Failed to play ${key}:`, error);
            },
          });
        } catch (error) {
          console.error(`[Audio] Error initializing ${key}:`, error);
        }
      }
    });

    // Cleanup
    return () => {
      Object.values(soundsRef.current).forEach((sound) => {
        try {
          sound.unload();
        } catch (error) {
          console.warn('[Audio] Error unloading sound:', error);
        }
      });
      soundsRef.current = {};
    };
  }, [config]);

  const play = useCallback((soundName: SoundName) => {
    const sound = soundsRef.current[soundName];
    if (sound) {
      try {
        sound.play();
      } catch (error) {
        console.warn(`[Audio] Error playing ${soundName}:`, error);
      }
    } else {
      console.warn(`[Audio] Sound "${soundName}" not found`);
    }
  }, []);

  const stop = useCallback((soundName: SoundName) => {
    const sound = soundsRef.current[soundName];
    if (sound) {
      try {
        sound.stop();
      } catch (error) {
        console.warn(`[Audio] Error stopping ${soundName}:`, error);
      }
    }
  }, []);

  const setVolume = useCallback((volume: number, soundName?: SoundName) => {
    const normalizedVolume = Math.max(0, Math.min(1, volume));
    volumeRef.current = normalizedVolume;

    if (soundName) {
      // Set volume for specific sound
      const sound = soundsRef.current[soundName];
      if (sound) {
        sound.volume(normalizedVolume);
      }
    } else {
      // Set volume for all sounds
      Object.values(soundsRef.current).forEach((sound) => {
        sound.volume(normalizedVolume);
      });
    }
  }, []);

  const unlockAudio = useCallback(async () => {
    if (typeof window === 'undefined') {
      setAudioUnlocked(true);
      return true;
    }

    try {
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        await Howler.ctx.resume();
      }
      setAudioUnlocked(true);
      return true;
    } catch (error) {
      console.warn('[Audio] Failed to unlock audio context:', error);
      setAudioUnlocked(isAudioUnlocked());
      return false;
    }
  }, []);

  return { play, stop, setVolume, unlockAudio, audioUnlocked };
}
