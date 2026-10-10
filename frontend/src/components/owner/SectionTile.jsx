import React from 'react';
import { motion } from 'framer-motion';

const colorStyles = {
  orange: {
    bg: 'bg-orange-500/10 dark:bg-orange-500/20',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'hover:border-orange-300 dark:hover:border-orange-500/40'
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'hover:border-emerald-300 dark:hover:border-emerald-500/40'
  },
  indigo: {
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'hover:border-indigo-300 dark:hover:border-indigo-500/40'
  },
  violet: {
    bg: 'bg-violet-500/10 dark:bg-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'hover:border-violet-300 dark:hover:border-violet-500/40'
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'hover:border-amber-300 dark:hover:border-amber-500/40'
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'hover:border-rose-300 dark:hover:border-rose-500/40'
  }
};

const badgeStyles = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  alert: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-800'
};

const SectionTile = ({
  icon: Icon,
  title,
  subtitle,
  badge,
  badgeType = 'default',
  color = 'orange',
  onClick,
  pulseBadge = false
}) => {
  const scheme = colorStyles[color] || colorStyles.orange;
  const badgeCls = badgeStyles[badgeType] || badgeStyles.default;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`group relative flex flex-col items-center justify-between p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all text-center w-full min-h-[135px] sm:min-h-[145px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${scheme.border}`}
    >
      {/* Live Badge in top-right */}
      {badge !== undefined && badge !== null && badge !== '' && (
        <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 flex items-center gap-1 z-10">
          {pulseBadge && (
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          )}
          <span
            className={`text-sm font-medium px-2 py-0.5 rounded-full border shadow-2xs truncate max-w-[100px] sm:max-w-[140px] ${badgeCls}`}
          >
            {badge}
          </span>
        </div>
      )}

      {/* Center Icon Chip */}
      <div className="mt-2 mb-2 sm:mb-3">
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-inner ${scheme.bg} ${scheme.text}`}
        >
          {Icon && <Icon className="w-6 h-6 sm:w-7 sm:h-7" />}
        </div>
      </div>

      {/* Title & Short Description */}
      <div className="w-full">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>
    </motion.button>
  );
};

export default SectionTile;
