import React from 'react';
import { Bell } from 'lucide-react';

const NotificationsPanel = ({ notifications }) => {
  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {notifications.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <Bell className="mx-auto mb-2 text-slate-300 dark:text-slate-600" size={36} />
          <p className="font-semibold text-base text-slate-700 dark:text-slate-300">No notifications yet.</p>
          <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
            You will receive alerts here when students submit fees or leave reviews.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n._id}
              className={`p-4 rounded-2xl border transition-all ${
                n.isRead
                  ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  : 'bg-orange-50/70 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/50 text-slate-900 dark:text-white'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-1.5">
                <h4 className="font-semibold text-base text-slate-900 dark:text-slate-100">{n.title}</h4>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 shrink-0">
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                  {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-sm font-normal text-slate-600 dark:text-slate-400 leading-relaxed">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;
