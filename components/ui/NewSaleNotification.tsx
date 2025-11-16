// Win Room v2.0 - New Sale Notification
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ParticleEffects } from './ParticleEffects';

interface NewSaleNotificationProps {
  sellerId: string;
  amount?: string;
  visible: boolean;
}

export function NewSaleNotification({ sellerId, amount, visible }: NewSaleNotificationProps) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Celebration particles */}
          <ParticleEffects variant="sparkles" count={25} colors={['#22c55e', '#3b82f6', '#f59e0b']} />

          <motion.div
            initial={{ opacity: 0, scale: 0.3, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{
              type: 'spring',
              damping: 20,
              stiffness: 300,
            }}
            className="fixed right-6 top-24 z-50"
          >
            <motion.div
              className="relative overflow-hidden rounded-2xl border border-emerald-400/50 bg-gradient-to-r from-emerald-500/20 via-sky-500/15 to-emerald-400/20 px-6 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur"
              animate={{
                boxShadow: [
                  '0 20px 50px rgba(0,0,0,0.3)',
                  '0 20px 60px rgba(34,197,94,0.4), 0 0 60px rgba(34,197,94,0.2)',
                  '0 20px 50px rgba(0,0,0,0.3)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {/* Sweeping shine */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{
                  duration: 1.5,
                  ease: 'easeInOut',
                  delay: 0.2,
                }}
              />

              {/* Pulsing glow */}
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.15),_transparent_70%)]"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [0.95, 1.05, 0.95],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              <div className="relative flex items-center gap-4">
                {/* Animated icon */}
                <motion.div
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-400/60 bg-emerald-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{
                    scale: 1,
                    rotate: 0,
                  }}
                  transition={{
                    type: 'spring',
                    damping: 15,
                    stiffness: 200,
                    delay: 0.1,
                  }}
                >
                  <motion.span
                    className="text-2xl"
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 0.6,
                      delay: 0.3,
                      ease: 'easeInOut',
                    }}
                  >
                    💰
                  </motion.span>

                  {/* Rotating ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-emerald-400/40"
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.6, 0, 0.6],
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                </motion.div>

                {/* Content */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25, type: 'spring', stiffness: 150 }}
                  className="min-w-0"
                >
                  <motion.p
                    className="text-xs uppercase tracking-[0.3em] text-emerald-300"
                    animate={{
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    🎉 New Sale!
                  </motion.p>
                  <motion.p
                    className="text-base font-semibold text-foreground"
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: 2,
                      ease: 'easeInOut',
                      delay: 0.4,
                    }}
                  >
                    {sellerId}
                  </motion.p>
                  {amount && <p className="text-xs text-foreground/60">{amount}</p>}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
