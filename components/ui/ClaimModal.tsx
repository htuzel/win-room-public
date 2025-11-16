// Win Room v2.0 - Claim Modal Component
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClaimType } from '@/lib/types';
import { InstallmentPlanBuilder } from '@/components/installments/InstallmentPlanBuilder';

interface ClaimModalProps {
  isOpen: boolean;
  subscriptionId: number;
  onClose: () => void;
  token: string | null;
  onConfirm: (payload: { claimType: ClaimType; installmentPlanId?: number; installmentCount?: number }) => void;
}

const claimTypes: Array<{
  value: ClaimType;
  label: string;
  description: string;
  badge: string;
  accentClass: string;
}> = [
  {
    value: 'first_sales',
    label: 'First Sales',
    description: 'New customer, sale won from scratch.',
    badge: '🆕',
    accentClass: 'ring-emerald-400/60 bg-emerald-500/10 text-emerald-200',
  },
  {
    value: 'remarketing',
    label: 'Remarketing',
    description: 'Customer re-engaged.',
    badge: '♻️',
    accentClass: 'ring-amber-400/60 bg-amber-500/10 text-amber-200',
  },
  {
    value: 'upgrade',
    label: 'Upgrade',
    description: 'Package upgrade or upsell.',
    badge: '⬆️',
    accentClass: 'ring-sky-400/60 bg-sky-500/10 text-sky-200',
  },
  {
    value: 'installment',
    label: 'Installment',
    description: 'Installment or split payment sale.',
    badge: '💳',
    accentClass: 'ring-rose-400/60 bg-rose-500/10 text-rose-200',
  },
];

export function ClaimModal({ isOpen, subscriptionId, onClose, onConfirm, token }: ClaimModalProps) {
  const [selectedType, setSelectedType] = useState<ClaimType | null>(null);
  const [installmentPlan, setInstallmentPlan] = useState<{ planId: number; installmentCount: number } | null>(null);

  const handleConfirm = () => {
    if (selectedType) {
      onConfirm({
        claimType: selectedType,
        installmentPlanId: isInstallmentSelected ? installmentPlan?.planId : undefined,
        installmentCount: isInstallmentSelected ? installmentPlan?.installmentCount : undefined,
      });
      setSelectedType(null);
      setInstallmentPlan(null);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setInstallmentPlan(null);
    onClose();
  };

  const isInstallmentSelected = selectedType === 'installment';
  const canSubmit = selectedType !== null && (!isInstallmentSelected || Boolean(installmentPlan));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <motion.div
              className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border/70 bg-surface/90 p-6 shadow-[0_34px_55px_rgba(0,0,0,0.35)] backdrop-blur pointer-events-auto"
              animate={{
                boxShadow: [
                  '0 34px 55px rgba(0,0,0,0.35)',
                  '0 34px 65px rgba(34,197,94,0.15), 0 0 40px rgba(34,197,94,0.1)',
                  '0 34px 55px rgba(0,0,0,0.35)',
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {/* Animated gradient overlay */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none"
                animate={{
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Content */}
              <div className="relative">
                <motion.h2
                  className="text-2xl font-semibold text-foreground"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                >
                  Hold steady. Identify your win.
                </motion.h2>
                <motion.p
                  className="mt-1 text-sm text-foreground/60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Subscription #{subscriptionId}. Set the claim type, then lock it with hold-to-claim.
                </motion.p>
              </div>

              <motion.div
                className="relative z-10 mt-6 grid gap-3 sm:grid-cols-2"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1,
                      delayChildren: 0.3,
                    },
                  },
                }}
              >
                {claimTypes.map((type) => {
                  const isActive = selectedType === type.value;
                  return (
                    <motion.button
                      key={type.value}
                      variants={{
                        hidden: { opacity: 0, y: 20, scale: 0.9 },
                        visible: { opacity: 1, y: 0, scale: 1 },
                      }}
                      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedType(type.value);
                        if (type.value !== 'installment') {
                          setInstallmentPlan(null);
                        }
                      }}
                      className={`relative flex h-full flex-col gap-2 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                        isActive
                          ? 'border-accent bg-accent/10 shadow-[0_0_25px_rgba(34,197,94,0.25)]'
                          : 'border-border/60 bg-background/40 hover:border-accent/40'
                      }`}
                    >
                      <span className={`inline-flex w-max items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-widest ring-1 ${type.accentClass}`}>
                        <span>{type.badge}</span>
                        {type.label}
                      </span>
                      <p className="text-xs text-foreground/60">{type.description}</p>
                      {isActive && (
                        <motion.div
                          layoutId="claimTypeHalo"
                          className="pointer-events-none absolute inset-1 rounded-[18px] border border-accent/30"
                          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>

              {isInstallmentSelected && (
                <div className="relative z-10 mt-4 space-y-3 rounded-2xl border border-border/40 bg-surface/40 p-4">
                  {installmentPlan ? (
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                      Plan #{installmentPlan.planId} created. Finance team can see the schedule.
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-foreground">Cannot claim without an installment plan.</p>
                      <p className="text-xs text-foreground/60">
                        Create the number of installments and payment plan, it will automatically notify the finance team.
                      </p>
                      <InstallmentPlanBuilder
                        subscriptionId={subscriptionId}
                        token={token}
                        endpoint="/api/installments"
                        onPlanCreated={(payload) => setInstallmentPlan(payload)}
                      />
                    </>
                  )}
                </div>
              )}

              <motion.div
                className="relative z-10 mt-6 flex gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 150 }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-background transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={canSubmit ? { scale: 1.03, boxShadow: '0 0 20px rgba(34,197,94,0.3)' } : {}}
                  whileTap={canSubmit ? { scale: 0.98 } : {}}
                  onClick={handleConfirm}
                  disabled={!canSubmit}
                  className="relative flex-1 overflow-hidden rounded-lg bg-accent px-4 py-2 font-semibold uppercase tracking-wider text-black transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {canSubmit && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    />
                  )}
                  <span className="relative">Prime Claim</span>
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
