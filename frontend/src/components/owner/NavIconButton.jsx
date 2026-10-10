import React from 'react';

const NavIconButton = ({
  icon: Icon,
  label,
  onClick,
  badgeCount = 0,
  hasLiveDot = false,
  title,
  ariaLabel,
  ariaExpanded,
  className = '',
  activeColor = 'hover:text-orange-600 dark:hover:text-orange-400'
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center min-h-[46px] min-w-[52px] xs:min-w-[56px] px-2 sm:px-3 py-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${activeColor} ${className}`}
      title={title || label}
      aria-label={ariaLabel || label}
      aria-expanded={ariaExpanded}
    >
      {/* Icon with potential badges */}
      <div className="relative flex items-center justify-center shrink-0">
        {Icon && <Icon size={21} className="transition-transform group-hover:scale-105" />}

        {/* Badge counter (e.g. Notifications unread count) */}
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-xs">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}

        {/* Live indicator dot/ring (e.g. Live active stories) */}
        {hasLiveDot && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
        )}
      </div>

      {/* Short Text Label stacked below icon (text-xs, normal weight, single line, no wrap) */}
      <span className="text-[11px] sm:text-xs font-normal text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 tracking-normal leading-tight mt-0.5 whitespace-nowrap select-none">
        {label}
      </span>
    </button>
  );
};

export default NavIconButton;
