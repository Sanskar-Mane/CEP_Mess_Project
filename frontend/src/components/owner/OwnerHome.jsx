import React from 'react';
import {
  Users,
  IndianRupee,
  Scale,
  Settings2
} from 'lucide-react';
import MenuHeroCard from './MenuHeroCard';
import SectionTile from './SectionTile';
import HeadcountReviewsCard from './HeadcountReviewsCard';

const OwnerHome = ({
  user,
  t,
  menuDate,
  setMenuDate,
  getLocalDateString,
  displayDate,
  morningMenu,
  nightMenu,
  stats,
  historyData = [],
  members = [],
  morningCutoff,
  nightCutoff,
  savedLocation,
  onSaveMenu,
  isPublishing,
  onOpenSection
}) => {
  const pendingPaymentsCount = members.filter((m) => m.status === 'verification_pending').length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* 1. HERO COMPONENT: TODAY'S MENU (The most prominent element on the page) */}
      <MenuHeroCard
        t={t}
        menuDate={menuDate}
        setMenuDate={setMenuDate}
        getLocalDateString={getLocalDateString}
        displayDate={displayDate}
        morningMenu={morningMenu}
        nightMenu={nightMenu}
        morningCutoff={morningCutoff}
        nightCutoff={nightCutoff}
        onSaveMenu={onSaveMenu}
        isPublishing={isPublishing}
      />

      {/* 2. ICON GRID FOR REMAINING SECTIONS */}
      <section aria-labelledby="operations-grid-title" className="space-y-3">
        <h3
          id="operations-grid-title"
          className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1"
        >
          {t.quickGlance || 'Quick Operations'}
        </h3>

        {/* Responsive grid: 3 columns on mobile, 4 on tablet, 4 on desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Tile 1: Subscribers */}
          <SectionTile
            id="subscribers"
            icon={Users}
            title={t.subscribersTile || 'Subscribers'}
            subtitle={t.subscribersDesc || 'Member directory'}
            color="violet"
            badge={`${members.length}`}
            badgeType="default"
            onClick={() => onOpenSection('subscribers')}
          />

          {/* Tile 2: Payments / UPI */}
          <SectionTile
            id="upi"
            icon={IndianRupee}
            title={t.upiPaymentsTile || 'Payments/UPI'}
            subtitle={t.upiPaymentsDesc || 'UPI ID & UTR check'}
            color="emerald"
            badge={
              pendingPaymentsCount > 0
                ? `${pendingPaymentsCount} Pending`
                : user?.upiId
                ? 'Active'
                : 'Setup'
            }
            badgeType={pendingPaymentsCount > 0 ? 'alert' : 'success'}
            pulseBadge={pendingPaymentsCount > 0}
            onClick={() => onOpenSection('upi')}
          />

          {/* Tile 3: Ration Estimator */}
          <SectionTile
            id="ration"
            icon={Scale}
            title={t.rationEstimatorTile || 'Ration Norms'}
            subtitle={t.rationEstimatorDesc || 'Plate calculator'}
            color="amber"
            badge={
              stats?.morning?.estimates?.foodSavedKg
                ? `${stats.morning.estimates.foodSavedKg}kg saved`
                : 'Estimator'
            }
            badgeType="default"
            onClick={() => onOpenSection('ration')}
          />

          {/* Tile 4: Mess Settings (Location & Operations) */}
          <SectionTile
            id="mess_settings"
            icon={Settings2}
            title={t.messSettingsTile || 'Mess'}
            subtitle={t.messSettingsDesc || 'Location & GPS'}
            color="orange"
            badge={savedLocation ? 'GPS Set' : 'Set GPS'}
            badgeType={savedLocation ? 'success' : 'warning'}
            onClick={() => onOpenSection('mess_settings')}
          />
        </div>
      </section>

      {/* 3. COMBINED "HEADCOUNT & REVIEWS" SECTION AT THE VERY BOTTOM */}
      <HeadcountReviewsCard
        t={t}
        user={user}
        stats={stats}
        historyData={historyData}
      />
    </div>
  );
};

export default OwnerHome;
