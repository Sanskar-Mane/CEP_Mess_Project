import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Sunrise, Moon, CheckCircle2, Loader2, X } from 'lucide-react';

const CutoffPopup = ({
  isOpen,
  onClose,
  shift = 'morning',
  initialMorningCutoff = '09:30',
  initialNightCutoff = '17:30',
  onConfirm,
  t
}) => {
  const [morningTime, setMorningTime] = useState(initialMorningCutoff);
  const [nightTime, setNightTime] = useState(initialNightCutoff);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync internal state when popup opens or initial props change
  useEffect(() => {
    if (isOpen) {
      setMorningTime(initialMorningCutoff || '09:30');
      setNightTime(initialNightCutoff || '17:30');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialMorningCutoff, initialNightCutoff]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await onConfirm({
        morningCutoff: morningTime,
        nightCutoff: nightTime
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update cut-off time.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMorning = shift === 'morning';
  const isNight = shift === 'night';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !isSubmitting && onClose()}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Modal / Bottom Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cutoff-popup-title"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 z-10 overflow-hidden"
          >
            {/* Top orange accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Clock size={22} />
                </div>
                <div>
                  <h3
                    id="cutoff-popup-title"
                    className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight"
                  >
                    {t?.cutoffPopupTitle || 'Set Attendance Cut-Off'}
                  </h3>
                  <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                    {t?.cutoffPopupHelper || "Students cannot change attendance or skip after this time."}
                  </p>
                </div>
              </div>

              {/* Close Button (44x44px target) */}
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="pt-4 space-y-4">
              {/* Morning Shift Time Picker */}
              {(isMorning || !isNight) && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="morning-cutoff-input"
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      <Sunrise size={18} className="text-amber-500" />
                      <span>{t?.morningCutoffLabel || 'Morning Cut-Off (Lunch)'}</span>
                    </label>
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                      Lunch Meal
                    </span>
                  </div>
                  <input
                    id="morning-cutoff-input"
                    type="time"
                    required
                    value={morningTime}
                    onChange={(e) => setMorningTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium text-base outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
              )}

              {/* Evening Shift Time Picker */}
              {(isNight || !isMorning) && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="evening-cutoff-input"
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      <Moon size={18} className="text-indigo-500" />
                      <span>{t?.nightCutoffLabel || 'Evening Cut-Off (Dinner)'}</span>
                    </label>
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-100/60 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                      Dinner Meal
                    </span>
                  </div>
                  <input
                    id="evening-cutoff-input"
                    type="time"
                    required
                    value={nightTime}
                    onChange={(e) => setNightTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium text-base outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
              )}

              {/* Error Message */}
              {errorMsg && (
                <p className="text-sm font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
                  {errorMsg}
                </p>
              )}

              {/* Action Buttons: Confirm & Keep current */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 min-h-[44px] bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-base cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  <span>
                    {isSubmitting
                      ? (t?.savingCutoff || 'Saving...')
                      : (t?.confirmCutoff || 'Confirm Cut-Off')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-full h-11 min-h-[44px] px-4 rounded-xl font-medium text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                >
                  {t?.skipCutoff || 'Keep Current / Skip for Now'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CutoffPopup;
