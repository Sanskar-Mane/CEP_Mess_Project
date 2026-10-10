import React, { useState, useEffect } from 'react';
import { Sunrise, Moon, Star, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';
import { API_URL } from '../../utils/config';

const HeadcountReviewsCard = ({
  t,
  user,
  stats,
  historyData = []
}) => {
  const morningCount = stats?.morning?.coming ?? 0;
  const eveningCount = stats?.night?.coming ?? 0;

  // Reviews state (fetches 3 most recent reviews via existing endpoint)
  const [reviews, setReviews] = useState([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);

  useEffect(() => {
    if (!user?._id) return;
    const fetchReviews = async () => {
      setIsReviewsLoading(true);
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_URL}/api/messes/${user._id}/reviews`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReviews(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch reviews:', err);
      } finally {
        setIsReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [user?._id]);

  const ratingValue = user?.rating ? Number(user.rating).toFixed(1) : '0.0';
  const totalReviewsCount = user?.ratingCount || reviews.length || 0;
  const recentThreeReviews = reviews.slice(0, 3);

  // Custom Tooltip for Recharts Attendance BarChart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 dark:bg-slate-800 text-white p-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-bold">
          <p className="mb-1 text-slate-400 border-b border-slate-700 pb-1">{label}</p>
          <p className="text-emerald-400">{t?.coming || 'Coming'}: {payload[0]?.value}</p>
          {payload[1] && <p className="text-rose-400">{t?.skip || 'Skip'}: {payload[1]?.value}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <section className="rounded-2xl p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80 dark:divide-slate-800">
        {/* LEFT COLUMN: TODAY'S HEADCOUNT + 7-DAY STATS GRAPH */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <TrendingUp size={18} className="text-orange-500" />
              {t.todayHeadcount || "Today's Headcount"}
            </h3>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t.liveBadge || 'Live'}
            </span>
          </div>

          {/* Two plain numbers */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Morning Headcount */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center gap-2 mb-1">
                <Sunrise size={18} className="text-amber-500 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t.morningHeadcount || 'Morning'}
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                {morningCount}
              </p>
            </div>

            {/* Evening Headcount */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center gap-2 mb-1">
                <Moon size={18} className="text-indigo-500 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t.eveningHeadcount || 'Evening'}
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                {eveningCount}
              </p>
            </div>
          </div>

          {/* 7-DAY ATTENDANCE STATS GRAPH (BarChart) */}
          <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t.historicalTrends || '7-Day Attendance Trends'}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Green = Coming · Pink = Skip
              </span>
            </div>
            <div className="h-[185px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historyData || []} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(tick) => (tick && tick.length > 5 ? tick.substring(5) : tick)}
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                  <Bar dataKey="coming" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14}>
                    {(historyData || []).map((_, index) => (
                      <Cell
                        key={`coming-${index}`}
                        fill={index === (historyData || []).length - 1 ? '#10b981' : '#34d399'}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="notComing" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={14}>
                    {(historyData || []).map((_, index) => (
                      <Cell
                        key={`skip-${index}`}
                        fill={index === (historyData || []).length - 1 ? '#f43f5e' : '#fb7185'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: STUDENT REVIEWS */}
        <div className="space-y-3 pt-6 lg:pt-0 lg:pl-8">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {t.reviewsAndRatings || 'Student Reviews'}
            </h3>
            <span className="text-xs font-bold text-slate-400">
              {totalReviewsCount} {t.reviewsCountLabel || 'reviews'}
            </span>
          </div>

          {/* Average Rating Line */}
          <div className="flex items-center gap-2.5 flex-wrap p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {ratingValue}
            </span>
            <div className="flex items-center gap-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={18}
                  className={
                    star <= Math.round(Number(ratingValue))
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300 dark:text-slate-700'
                  }
                />
              ))}
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
              · {totalReviewsCount} {t.reviewsCountLabel || 'ratings'}
            </span>
          </div>

          {/* 3 Most Recent Reviews (or Friendly Empty State) */}
          <div className="space-y-2.5 pt-1">
            {isReviewsLoading ? (
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 py-3 text-center">
                Loading reviews...
              </p>
            ) : recentThreeReviews.length === 0 ? (
              <div className="py-6 px-4 text-center rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  {t.noReviewsYet || 'No reviews yet'}
                </p>
              </div>
            ) : (
              recentThreeReviews.map((rev) => (
                <div
                  key={rev._id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {rev.studentName || 'Student'}
                    </span>
                    <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          className={
                            s <= rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300 dark:text-slate-700'
                          }
                        />
                      ))}
                    </div>
                  </div>
                  {rev.comment ? (
                    <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      "{rev.comment}"
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeadcountReviewsCard;
