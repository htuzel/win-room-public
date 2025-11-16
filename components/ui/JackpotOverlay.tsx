// Win Room v2.0 - Jackpot Overlay
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ParticleEffects } from './ParticleEffects';

interface JackpotOverlayProps {
  sellerId: string;
  visible: boolean;
}

export function JackpotOverlay({ sellerId, visible }: JackpotOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Money/coin particles explosion */}
          <ParticleEffects variant="coins" count={60} />

          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            transition={{
              type: 'spring',
              damping: 18,
              stiffness: 200,
              mass: 1,
            }}
            className="fixed inset-x-0 top-0 z-40 flex justify-center"
          >
            <motion.div
              className="relative w-full max-w-3xl overflow-hidden rounded-b-3xl border border-accent-installment/40 bg-gradient-to-r from-emerald-500/20 via-sky-500/15 to-fuchsia-500/20 px-10 py-6 shadow-[0_0_60px_rgba(34,211,238,0.25)] backdrop-blur"
              animate={{
                boxShadow: [
                  '0 0 60px rgba(34,211,238,0.25)',
                  '0 0 100px rgba(34,211,238,0.5), 0 0 140px rgba(236,72,153,0.3)',
                  '0 0 60px rgba(34,211,238,0.25)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {/* Multiple animated gradient layers */}
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_55%)]"
                animate={{
                  opacity: [0.35, 0.6, 0.35],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Sweeping shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: '-100%', skewX: -15 }}
                animate={{ x: '200%' }}
                transition={{
                  duration: 1.8,
                  ease: 'easeInOut',
                  delay: 0.2,
                }}
              />

              {/* Rotating color gradient */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-fuchsia-500/10 to-sky-500/0"
                animate={{
                  rotate: [0, 360],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  rotate: {
                    duration: 4,
                    repeat: Infinity,
                    ease: 'linear',
                  },
                  opacity: {
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }}
                style={{ transformOrigin: 'center' }}
              />

              <div className="relative flex items-center justify-between gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
                >
                  <motion.p
                    className="text-xs uppercase tracking-[0.52em] text-foreground/70"
                    animate={{
                      opacity: [0.7, 1, 0.7],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    💰 Jackpot!
                  </motion.p>
                  <motion.p
                    className="mt-1 text-3xl font-semibold text-foreground"
                    animate={{
                      scale: [1, 1.02, 1],
                    }}
                    transition={{
                      duration: 1,
                      repeat: 3,
                      ease: 'easeInOut',
                      delay: 0.5,
                    }}
                  >
                    {sellerId} just cracked the jackpot.
                  </motion.p>
                  <p className="text-sm text-foreground/60">Massive win detected — keep the streak alive!</p>
                </motion.div>

                <motion.div
                  className="relative rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-center text-lg font-semibold uppercase tracking-widest text-white shadow-[0_0_30px_rgba(255,255,255,0.25)]"
                  initial={{ rotate: -25, scale: 0, opacity: 0 }}
                  animate={{
                    rotate: [0, -5, 5, -3, 3, 0],
                    scale: 1,
                    opacity: 1,
                  }}
                  transition={{
                    rotate: {
                      duration: 0.8,
                      ease: 'easeInOut',
                      delay: 0.4,
                    },
                    scale: {
                      type: 'spring',
                      damping: 10,
                      stiffness: 150,
                      delay: 0.3,
                    },
                    opacity: {
                      duration: 0.3,
                      delay: 0.3,
                    },
                  }}
                >
                  {/* Pulsing background glow */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-sky-500/20 to-fuchsia-500/20"
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

                  {/* Multiple expanding rings */}
                  {[0, 0.3, 0.6].map((delay, i) => (
                    <motion.span
                      key={i}
                      className="absolute inset-0 rounded-2xl border-2 border-white/40"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.6, 0, 0.6],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeOut',
                        delay,
                      }}
                    />
                  ))}

                  {/* Jackpot text with bounce */}
                  <motion.span
                    className="relative z-10 inline-block"
                    animate={{
                      y: [0, -4, 0, -2, 0],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: 0.7,
                    }}
                  >
                    Jackpot
                  </motion.span>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
