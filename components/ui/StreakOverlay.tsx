// Win Room v2.0 - Streak Overlay
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ParticleEffects } from './ParticleEffects';

interface StreakOverlayProps {
  sellerId: string;
  streakCount: number;
  visible: boolean;
}

export function StreakOverlay({ sellerId, streakCount, visible }: StreakOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Fire particles for streak */}
          <ParticleEffects variant="sparkles" count={30} colors={['#22c55e', '#84cc16', '#fbbf24', '#f59e0b']} />

          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.8 }}
            transition={{
              type: 'spring',
              damping: 15,
              stiffness: 250,
            }}
            className="fixed left-1/2 top-10 z-40 -translate-x-1/2"
          >
            <motion.div
              className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-accent/50 bg-surface/90 px-8 py-4 shadow-[0_0_40px_rgba(34,197,94,0.35)] backdrop-blur"
              animate={{
                boxShadow: [
                  '0 0 40px rgba(34,197,94,0.35)',
                  '0 0 60px rgba(34,197,94,0.6), 0 0 80px rgba(34,197,94,0.3)',
                  '0 0 40px rgba(34,197,94,0.35)',
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {/* Animated shine sweep */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/30 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{
                  duration: 1.2,
                  ease: 'easeInOut',
                  delay: 0.1,
                }}
              />

              {/* Pulsing glow */}
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.15),_transparent_70%)]"
                animate={{
                  opacity: [0.4, 0.8, 0.4],
                  scale: [0.95, 1.05, 0.95],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Streak counter badge */}
              <motion.div
                className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-accent/60 bg-accent/20 text-center leading-[52px] text-2xl font-bold text-accent shadow-[0_0_25px_rgba(34,197,94,0.4)]"
                initial={{ scale: 0, rotate: -180 }}
                animate={{
                  scale: 1,
                  rotate: 0,
                }}
                transition={{
                  type: 'spring',
                  damping: 12,
                  stiffness: 200,
                  delay: 0.1,
                }}
              >
                {/* Rotating ring effect */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-accent/40"
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.6, 0, 0.6],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />

                {/* Counter with bounce */}
                <motion.span
                  className="relative z-10"
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 0.4,
                    delay: 0.3,
                    ease: 'easeOut',
                  }}
                >
                  ×{streakCount}
                </motion.span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 150 }}
              >
                <motion.p
                  className="text-xs uppercase tracking-[0.4em] text-accent/70"
                  animate={{
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  🔥 Streak
                </motion.p>
                <motion.p
                  className="text-xl font-semibold text-foreground"
                  animate={{
                    scale: [1, 1.03, 1],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: 2,
                    ease: 'easeInOut',
                    delay: 0.4,
                  }}
                >
                  {sellerId} ate up the queue!
                </motion.p>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
