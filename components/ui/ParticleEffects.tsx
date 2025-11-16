// Win Room v2.0 - Particle Effects for Celebrations
'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface ParticleEffectsProps {
  variant?: 'confetti' | 'sparkles' | 'coins' | 'stars';
  count?: number;
  colors?: string[];
}

const VARIANT_CONFIGS = {
  confetti: {
    shapes: ['▢', '●', '◆', '▲'],
    baseColors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'],
    duration: 3,
  },
  sparkles: {
    shapes: ['✨', '⭐', '💫', '✦'],
    baseColors: ['#fbbf24', '#fcd34d', '#fef3c7', '#fffbeb'],
    duration: 2,
  },
  coins: {
    shapes: ['💰', '💵', '💸', '💳'],
    baseColors: ['#fbbf24', '#f59e0b', '#d97706'],
    duration: 2.5,
  },
  stars: {
    shapes: ['⭐', '🌟', '✨'],
    baseColors: ['#fbbf24', '#fcd34d', '#fef3c7'],
    duration: 2,
  },
};

export function ParticleEffects({ variant = 'confetti', count = 40, colors }: ParticleEffectsProps) {
  const config = VARIANT_CONFIGS[variant];
  const effectiveColors = colors || config.baseColors;

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.random() * 360 * Math.PI) / 180;
      const velocity = 200 + Math.random() * 300;
      const x = Math.cos(angle) * velocity;
      const y = Math.sin(angle) * velocity - Math.random() * 100; // Bias upward

      return {
        id: i,
        shape: config.shapes[Math.floor(Math.random() * config.shapes.length)],
        color: effectiveColors[Math.floor(Math.random() * effectiveColors.length)],
        x,
        y,
        rotation: Math.random() * 720 - 360,
        delay: Math.random() * 0.2,
        scale: 0.6 + Math.random() * 0.8,
      };
    });
  }, [count, config.shapes, effectiveColors]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute left-1/2 top-1/2 text-2xl"
          style={{
            color: particle.color,
          }}
          initial={{
            x: 0,
            y: 0,
            opacity: 1,
            scale: 0,
            rotate: 0,
          }}
          animate={{
            x: particle.x,
            y: particle.y,
            opacity: 0,
            scale: particle.scale,
            rotate: particle.rotation,
          }}
          transition={{
            duration: config.duration,
            delay: particle.delay,
            ease: [0.36, 0, 0.66, -0.56], // Custom easing for gravity effect
          }}
        >
          {particle.shape}
        </motion.div>
      ))}
    </div>
  );
}
