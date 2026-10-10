import React, { useState, useEffect, useRef } from 'react';
import { ChefHat, Bell, QrCode, Radio, LogOut, X } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import LanguageToggle from '../LanguageToggle';
import NavIconButton from './NavIconButton';

const OwnerNavbar = ({
  user,
  t,
  lang,
  setLang,
  unreadNotifsCount,
  myActiveStoriesCount,
  notifications = [],
  onOpenNotifications,
  onOpenQr,
  onOpenStories,
  onLogout
}) => {
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Toggle notifications and trigger mark-read
  const handleToggleNotifications = () => {
    const nextState = !isNotifDropdownOpen;
    setIsNotifDropdownOpen(nextState);
    if (nextState && onOpenNotifications) {
      onOpenNotifications();
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsNotifDropdownOpen(false);
      }
    };
    if (isNotifDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isNotifDropdownOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isNotifDropdownOpen) {
        setIsNotifDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotifDropdownOpen]);

  return (
    <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 h-16 flex items-center justify-between gap-1 sm:gap-4">
        {/* Left Section: Brand, Mess Name & 3 Quick-Access Buttons with Icon + Label */}
        <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 flex-1 sm:flex-initial">
          {/* Logo icon (min 36x36 on mobile, 44x44 on desktop) */}
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0" aria-hidden="true">
            <ChefHat size={20} className="sm:hidden" />
            <ChefHat size={22} className="hidden sm:block" />
          </div>

          {/* Mess Name: Truncates with ellipsis on small 360px screen */}
          <div className="min-w-0 max-w-[75px] xs:max-w-[110px] sm:max-w-[200px] md:max-w-xs shrink">
            <h1 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate leading-tight">
              {user?.messName || 'Partner Mess'}
            </h1>
          </div>

          {/* 3 Quick-Access Icon + Short Label Buttons (Comfortable spacing: gap-3 mobile, gap-5 tablet, gap-6 desktop) */}
          <div className="flex items-center gap-3 sm:gap-5 lg:gap-6 ml-3 sm:ml-5 lg:ml-6 pl-3 sm:pl-4 border-l border-slate-200 dark:border-slate-700 shrink-0 relative">
            {/* 1. Notifications (Bell) with "Alerts" / "सूचना" label & unread-count badge */}
            <div className="relative" ref={dropdownRef}>
              <NavIconButton
                icon={Bell}
                label={t.navAlerts || 'Alerts'}
                onClick={handleToggleNotifications}
                badgeCount={unreadNotifsCount}
                title={`${t.notificationsTile || 'Notifications'}${unreadNotifsCount > 0 ? ` (${unreadNotifsCount})` : ''}`}
                ariaLabel={t.navAlerts || 'Alerts'}
                ariaExpanded={isNotifDropdownOpen}
                activeColor="hover:text-orange-600 dark:hover:text-orange-400"
              />

              {/* Notifications Dropdown */}
              {isNotifDropdownOpen && (
                <div
                  className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-[310px] sm:w-[380px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  role="dialog"
                  aria-label={t.notificationsTile || 'Notifications'}
                >
                  <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <Bell size={18} className="text-orange-500" />
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {t.notificationsTile || 'Notifications'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNotifDropdownOpen(false)}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                      title={t.closePanel || 'Close'}
                      aria-label={t.closePanel || 'Close'}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2">
                    {notifications.length === 0 ? (
                      <div className="py-8 px-4 text-center">
                        <Bell className="mx-auto mb-2 text-slate-300 dark:text-slate-600" size={32} />
                        <p className="font-medium text-sm text-slate-600 dark:text-slate-400">
                          {t.noReviewsYet ? 'No notifications yet' : 'No notifications'}
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          className={`p-3 rounded-xl transition-colors ${
                            n.isRead
                              ? 'bg-transparent text-slate-700 dark:text-slate-300'
                              : 'bg-orange-50/80 dark:bg-orange-950/30 text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-base leading-snug">
                              {n.title}
                            </h4>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 shrink-0">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm font-normal text-slate-600 dark:text-slate-400 leading-relaxed">
                            {n.body}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. QR Meal Pass with "QR Pass" / "क्यूआर पास" label */}
            <NavIconButton
              icon={QrCode}
              label={t.navQrPass || 'QR Pass'}
              onClick={onOpenQr}
              title={t.qrScannerTile || 'Verify Student Meal Pass'}
              ariaLabel={t.navQrPass || 'QR Pass'}
              activeColor="hover:text-emerald-600 dark:hover:text-emerald-400"
            />

            {/* 3. Live Stories with "Stories" / "स्टोरीज" label & live dot indicator */}
            <NavIconButton
              icon={Radio}
              label={t.navStories || 'Stories'}
              onClick={onOpenStories}
              hasLiveDot={myActiveStoriesCount > 0}
              title={t.liveStoriesTile || 'Post 24H Live Food Story'}
              ariaLabel={t.navStories || 'Stories'}
              activeColor="hover:text-rose-600 dark:hover:text-rose-400"
            />
          </div>
        </div>

        {/* Divider between quick-access buttons and right controls */}
        <div className="hidden xs:block h-7 border-l border-slate-200 dark:border-slate-700 mx-1 sm:mx-2 lg:mx-3 shrink-0" aria-hidden="true" />

        {/* Right Section: LanguageToggle, ThemeToggle, Logout with comfortable gap-2 to gap-3 */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LanguageToggle lang={lang} setLang={setLang} />
          <ThemeToggle />
          <button
            type="button"
            onClick={onLogout}
            className="h-11 min-h-[44px] px-2.5 sm:px-3 rounded-xl text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-medium text-sm flex items-center gap-1.5 cursor-pointer"
            title={t.logout}
            aria-label={t.logout}
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">{t.logout}</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default OwnerNavbar;
