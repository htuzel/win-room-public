// Win Room v2.0 - Objection Modal Component
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ObjectionReason } from '@/lib/types';

interface ObjectionModalProps {
  isOpen: boolean;
  subscriptionId: number;
  onClose: () => void;
  onSubmit: (reason: ObjectionReason, details: string) => void;
}

const objectionReasons: Array<{ value: ObjectionReason; label: string }> = [
  { value: 'wrong_owner', label: 'Wrong Owner - Another seller\'s sale' },
  { value: 'duplicate', label: 'Duplicate - Repeat sale' },
  { value: 'refund', label: 'Refund - Returned' },
  { value: 'other', label: 'Other' },
];

export function ObjectionModal({
  isOpen,
  subscriptionId,
  onClose,
  onSubmit,
}: ObjectionModalProps) {
  const [selectedReason, setSelectedReason] = useState<ObjectionReason | null>(null);
  const [details, setDetails] = useState('');

  const handleSubmit = () => {
    if (selectedReason) {
      onSubmit(selectedReason, details);
      // Reset form
      setSelectedReason(null);
      setDetails('');
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDetails('');
    onClose();
  };

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
            className="fixed inset-0 bg-black/60 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-surface border border-border rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-foreground mb-2">
                Raise Objection
              </h2>
              <p className="text-sm text-foreground/60 mb-6">
                Subscription ID: {subscriptionId}
              </p>

              {/* Reason Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reason
                </label>
                <select
                  value={selectedReason || ''}
                  onChange={(e) => setSelectedReason(e.target.value as ObjectionReason)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-accent"
                >
                  <option value="">Select a reason...</option>
                  {objectionReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Details */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Details (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                  placeholder="Provide additional details..."
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground resize-none focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-surface border border-border text-foreground rounded-lg hover:bg-background transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedReason}
                  className="flex-1 px-4 py-2 bg-error text-white font-medium rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
