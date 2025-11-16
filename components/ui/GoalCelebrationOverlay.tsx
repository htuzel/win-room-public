// Win Room v2.0 - Goal Celebration Overlay
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ParticleEffects } from './ParticleEffects';

type CelebrationVariant = 'member' | 'team' | 'daily';

export interface GoalCelebrationPayload {
  title: string;
  subtitle: string;
  variant: CelebrationVariant;
}

interface GoalCelebrationOverlayProps {
  celebration: GoalCelebrationPayload | null;
}

const VARIANT_STYLES: Record<
  CelebrationVariant,
  { border: string; background: string; accent: string; glow: string; particles: 'confetti' | 'sparkles' | 'stars' }
> = {
  member: {
    border: 'border-emerald-400/60',
    background: 'from-emerald-500/20 via-sky-500/15 to-emerald-400/20',
    accent: 'text-emerald-200',
    glow: 'shadow-[0_0_80px_rgba(34,197,94,0.4)]',
    particles: 'sparkles',
  },
  team: {
    border: 'border-accent/60',
    background: 'from-amber-400/20 via-accent/15 to-emerald-400/20',
    accent: 'text-accent',
    glow: 'shadow-[0_0_80px_rgba(34,197,94,0.5)]',
    particles: 'confetti',
  },
  daily: {
    border: 'border-fuchsia-400/60',
    background: 'from-fuchsia-500/25 via-rose-500/15 to-amber-400/20',
    accent: 'text-fuchsia-200',
    glow: 'shadow-[0_0_80px_rgba(236,72,153,0.4)]',
    particles: 'stars',
  },
};

export function GoalCelebrationOverlay({ celebration }: GoalCelebrationOverlayProps) {
  return (
    <AnimatePresence>
      {celebration && (
        <>
          {/* Particle Effects */}
          <ParticleEffects variant={VARIANT_STYLES[celebration.variant].particles} count={50} />

          {/* Main Celebration Banner */}
          <motion.div
            className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4"
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={{
              type: 'spring',
              damping: 20,
              stiffness: 300,
              mass: 0.8,
            }}
          >
            <motion.div
              className={`relative w-full max-w-lg overflow-hidden rounded-3xl border bg-gradient-to-r px-6 py-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur ${
                VARIANT_STYLES[celebration.variant].border
              } ${VARIANT_STYLES[celebration.variant].background} ${VARIANT_STYLES[celebration.variant].glow}`}
              animate={{
                boxShadow: [
                  '0 20px 50px rgba(0,0,0,0.35)',
                  '0 20px 60px rgba(34,197,94,0.25), 0 0 80px rgba(34,197,94,0.3)',
                  '0 20px 50px rgba(0,0,0,0.35)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {/* Animated shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{
                  duration: 1.5,
                  ease: 'easeInOut',
                  delay: 0.2,
                }}
              />

              {/* Radial glow pulse */}
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.15),_transparent_70%)]"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              <div className="relative flex items-center justify-between gap-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <motion.p
                    className={`text-base font-semibold uppercase tracking-[0.3em] ${VARIANT_STYLES[celebration.variant].accent}`}
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: 3,
                      ease: 'easeInOut',
                    }}
                  >
                    {celebration.title}
                  </motion.p>
                  <p className="mt-1 text-sm text-foreground/70">{celebration.subtitle}</p>
                </motion.div>

                <motion.div
                  className="relative rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold uppercase tracking-widest text-white shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                  initial={{ rotate: -20, scale: 0, opacity: 0 }}
                  animate={{
                    rotate: [0, 10, -10, 5, -5, 0],
                    scale: 1,
                    opacity: 1,
                  }}
                  transition={{
                    rotate: {
                      duration: 0.6,
                      ease: 'easeInOut',
                      delay: 0.3,
                    },
                    scale: {
                      type: 'spring',
                      damping: 10,
                      stiffness: 200,
                      delay: 0.2,
                    },
                    opacity: {
                      duration: 0.2,
                      delay: 0.2,
                    },
                  }}
                >
                  {/* Bouncing emoji */}
                  <motion.span
                    className="inline-block"
                    animate={{
                      y: [0, -3, 0, -2, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: 0.5,
                    }}
                  >
                    🎯
                  </motion.span>

                  {/* Rotating ring effect */}
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-white/30"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                  />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
