import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';

const colorStyles = {
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
};

const SectionPanel = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  color = 'orange',
  children,
  maxWidth = 'max-w-4xl'
}) => {
  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const chipColor = colorStyles[color] || colorStyles.orange;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex sm:items-center sm:justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Modal / Bottom Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={`relative z-10 w-full ${maxWidth} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-3xl overflow-hidden mt-auto sm:mt-0`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Mobile swipe / pull indicator */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1">
              <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Panel Header */}
            <div className="px-4 sm:px-8 py-3.5 sm:py-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="sm:hidden w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Back"
                >
                  <ArrowLeft size={20} />
                </button>
                {Icon && (
                  <div className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center shrink-0 ${chipColor}`}>
                    <Icon size={22} />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-sm font-normal text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0 ml-2 flex items-center justify-center cursor-pointer"
                title="Close (Esc)"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Panel Content (Scrollable) */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-grow overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SectionPanel;
