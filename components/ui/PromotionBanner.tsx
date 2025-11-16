// Win Room v2.0 - Promotion/Announcement Banner
//
// Usage Examples:
//
// <PromotionBanner
//   title="Black Friday Başladı! 🔥"
//   message="Şov zamanı! Bugün özel indirimler var."
//   variant="promo"
//   icon="🎯"
//   visible={true}
// />
//
// <PromotionBanner
//   title="Hedef: $50K"
//   message="Takım hedefine sadece $5K kaldı!"
//   variant="success"
//   icon="🏆"
// />
//
// <PromotionBanner
//   title="Yeni Özellik"
//   message="Taksit sistemi aktif! Artık taksitli satışları takip edebilirsiniz."
//   variant="info"
//   icon="✨"
// />
//
// <PromotionBanner
//   title="Dikkat!"
//   message="Bugün saat 18:00'de sistem bakımı olacak."
//   variant="warning"
//   icon="⚠️"
// />

'use client';

import { motion } from 'framer-motion';

type BannerVariant = 'promo' | 'info' | 'success' | 'warning';

interface PromotionBannerProps {
  title: string;
  message: string;
  variant?: BannerVariant;
  icon?: string;
  visible?: boolean;
}

const VARIANT_STYLES: Record<BannerVariant, {
  border: string;
  background: string;
  titleColor: string;
  messageColor: string;
  glow: string;
}> = {
  promo: {
    border: 'border-fuchsia-400/50',
    background: 'from-fuchsia-500/20 via-purple-500/15 to-pink-500/20',
    titleColor: 'text-fuchsia-200',
    messageColor: 'text-fuchsia-100/80',
    glow: 'shadow-[0_0_30px_rgba(232,121,249,0.15)]',
  },
  info: {
    border: 'border-sky-400/50',
    background: 'from-sky-500/20 via-blue-500/15 to-cyan-500/20',
    titleColor: 'text-sky-200',
    messageColor: 'text-sky-100/80',
    glow: 'shadow-[0_0_30px_rgba(56,189,248,0.15)]',
  },
  success: {
    border: 'border-emerald-400/50',
    background: 'from-emerald-500/20 via-green-500/15 to-teal-500/20',
    titleColor: 'text-emerald-200',
    messageColor: 'text-emerald-100/80',
    glow: 'shadow-[0_0_30px_rgba(52,211,153,0.15)]',
  },
  warning: {
    border: 'border-amber-400/50',
    background: 'from-amber-500/20 via-orange-500/15 to-yellow-500/20',
    titleColor: 'text-amber-200',
    messageColor: 'text-amber-100/80',
    glow: 'shadow-[0_0_30px_rgba(251,191,36,0.15)]',
  },
};

export function PromotionBanner({
  title,
  message,
  variant = 'promo',
  icon = '🎯',
  visible = true
}: PromotionBannerProps) {
  if (!visible) return null;

  const styles = VARIANT_STYLES[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-r p-5 backdrop-blur ${styles.border} ${styles.background} ${styles.glow}`}
    >
      {/* Animated background gradient with pulse */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1), transparent 70%)',
        }}
        animate={{
          opacity: [0.2, 0.45, 0.2],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Shimmer sweep effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: '-100%', skewX: -20 }}
        animate={{ x: '200%' }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatDelay: 1,
        }}
      />

      <div className="relative flex items-start gap-4">
        {/* Animated icon with floating effect */}
        <motion.div
          className="relative flex-shrink-0 text-3xl"
          animate={{
            y: [0, -3, 0],
            rotate: [0, -8, 8, -5, 5, 0],
          }}
          transition={{
            y: {
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            rotate: {
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
        >
          {icon}
          {/* Glow ring around icon */}
          <motion.div
            className="absolute inset-0 rounded-full blur-md"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent 70%)',
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>

        {/* Content with stagger animation */}
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
        >
          <motion.h3
            className={`text-base font-bold uppercase tracking-wider ${styles.titleColor}`}
            animate={{
              opacity: [1, 0.9, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {title}
          </motion.h3>
          <p className={`mt-1 text-sm leading-relaxed ${styles.messageColor}`}>
            {message}
          </p>
        </motion.div>

        {/* Pulse indicator with ripple effect */}
        <div className="relative flex-shrink-0">
          <motion.div
            className={`h-3 w-3 rounded-full ${styles.titleColor.replace('text-', 'bg-')}`}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          {/* Ripple rings */}
          {[0, 0.3, 0.6].map((delay, i) => (
            <motion.div
              key={i}
              className={`absolute inset-0 rounded-full ${styles.titleColor.replace('text-', 'border-')} border-2`}
              animate={{
                scale: [1, 2, 1],
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
        </div>
      </div>
    </motion.div>
  );
}
