// Win Room v2.0 - Hold to Claim Button
'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HoldToClaimButtonProps {
  onComplete: () => Promise<void> | void;
  disabled?: boolean;
  cooldownActive?: boolean;
  label?: string;
  holdLabel?: string;
}

const HOLD_DURATION = 700; // ms

export function HoldToClaimButton({
  onComplete,
  disabled,
  cooldownActive,
  label = 'Claim',
  holdLabel = 'Hold to claim',
}: HoldToClaimButtonProps) {
  const frame = useRef<number | undefined>(undefined);
  const startTime = useRef<number | null>(null);
  const cancelled = useRef(false);

  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [status, setStatus] = useState<'idle' | 'claiming' | 'cooldown'>('idle');

  const resetHold = () => {
    if (frame.current) {
      cancelAnimationFrame(frame.current);
    }
    startTime.current = null;
    setProgress(0);
    setIsHolding(false);
  };

  const handlePointerDown = () => {
    if (disabled || cooldownActive) return;
    cancelled.current = false;
    setIsHolding(true);
    startTime.current = performance.now();

    const step = () => {
      if (cancelled.current || !startTime.current) return;
      const elapsed = performance.now() - startTime.current;
      const ratio = Math.min(1, elapsed / HOLD_DURATION);
      setProgress(ratio);
      if (ratio >= 1) {
        resetHold();
        const outcome = onComplete();
        const isPromise = outcome && typeof (outcome as Promise<unknown>).then === 'function';
        if (isPromise) {
          setStatus('claiming');
          (outcome as Promise<void>)
            .catch(() => setStatus('idle'))
            .finally(() => {
              setTimeout(() => {
                setProgress(0);
                setStatus('idle');
              }, 1000);
            });
        } else {
          setStatus('idle');
        }
        return;
      }
      frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
  };

  const handlePointerUp = () => {
    cancelled.current = true;
    resetHold();
  };

  useEffect(() => {
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  useEffect(() => {
    if (cooldownActive) {
      setStatus('cooldown');
      setTimeout(() => setStatus('idle'), 1200);
    }
  }, [cooldownActive]);

  const effectiveDisabled = disabled || status === 'claiming';

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onKeyDown={(e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handlePointerDown();
        }
      }}
      onKeyUp={(e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handlePointerUp();
        }
      }}
      disabled={effectiveDisabled || cooldownActive}
      className={`relative overflow-hidden rounded-lg border border-accent/40 bg-accent/20 px-5 py-2 font-semibold text-accent transition-all
        ${effectiveDisabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-accent/70 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] focus:outline-none focus:ring-2 focus:ring-accent/50'}
      `}
    >
      <span className="relative z-10 flex items-center gap-2 text-sm uppercase tracking-wider">
        {status === 'claiming' ? (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-block"
            >
              ⚡
            </motion.span>
            Claiming…
          </>
        ) : status === 'cooldown' ? (
          <>
            ✓ Cooldown
          </>
        ) : isHolding ? (
          holdLabel
        ) : (
          label
        )}
      </span>

      <AnimatePresence>
        {isHolding && (
          <>
            {/* Progress fill */}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-0 bg-accent"
              style={{ transformOrigin: 'left' }}
            >
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-accent via-emerald-400 to-accent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: progress }}
                transition={{ ease: 'linear', duration: 0.1 }}
                style={{ transformOrigin: 'left' }}
              />
            </motion.span>

            {/* Shine effect during hold */}
            <motion.span
              className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '200%' }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          </>
        )}

        {/* Success burst effect */}
        {status === 'claiming' && (
          <motion.span
            className="absolute inset-0 z-0 bg-accent"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.8, 0], scale: 1.5 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Pulsing ring on hover */}
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-accent/20"
        whileHover={{
          boxShadow: ['0 0 0 0px rgba(34,197,94,0.4)', '0 0 0 4px rgba(34,197,94,0)'],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
        }}
      />
    </button>
  );
}
