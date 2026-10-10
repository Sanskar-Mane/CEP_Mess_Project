import React from 'react';
import { Users, Phone, Clock, CalendarPlus, Edit3, IndianRupee, CheckCircle2 } from 'lucide-react';

const SubscribersPanel = ({
  members,
  handleExtendDays,
  handleEditSkips,
  handleSetFee,
  updateSubscription,
  togglePaymentStatus
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Active Members & Payment Records
          </h3>
          <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-0.5">
            Manage student subscription shifts, skip allowances, custom fees, and approve UPI payments.
          </p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3.5 py-1.5 rounded-xl text-sm font-semibold border border-indigo-200 dark:border-indigo-800 w-fit shrink-0">
          Total Members: {members.length}
        </div>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <Users className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={36} />
          <p className="text-slate-700 dark:text-slate-300 font-semibold text-base">No active monthly members yet.</p>
          <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">Students can subscribe to your mess from their mobile dashboard.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm sm:text-base">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                <th className="py-3.5 px-4 font-black">Student Info</th>
                <th className="py-3.5 px-4 font-black">Shift</th>
                <th className="py-3.5 px-4 font-black">Membership Dates</th>
                <th className="py-3.5 px-4 font-black">Skips (Used/Max)</th>
                <th className="py-3.5 px-4 font-black">Monthly Fee</th>
                <th className="py-3.5 px-4 font-black text-right">Payment Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
              {members.map((member) => (
                <tr key={member._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-900 dark:text-white text-base">
                      {member.studentName}
                    </p>
                    <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                      <Phone size={14} /> {member.studentPhone || 'N/A'}
                    </p>
                    {member.status === 'verification_pending' && (
                      <span className="text-sm font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50 flex items-center gap-1 w-fit mt-1.5">
                        <Clock size={14} /> Verification Pending
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-sm font-medium px-2.5 py-1 rounded-lg ${
                        member.status === 'expired'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50'
                          : member.shift === 'both'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {member.status === 'expired' ? 'Expired' : (member.shift || 'both')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-sm">
                    <div className="text-slate-600 dark:text-slate-400 font-normal mb-1">
                      Start: <span className="font-medium text-slate-800 dark:text-slate-200">{new Date(member.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-400 font-normal">
                        End: <span className="font-medium text-slate-800 dark:text-slate-200">{member.endDate ? new Date(member.endDate).toLocaleDateString() : 'N/A'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleExtendDays(member._id)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                        title="Extend Membership for Absences"
                        aria-label="Extend Membership"
                      >
                        <CalendarPlus size={18} />
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                      <span>{member.usedSkips || 0} / {member.allowedSkips || 5}</span>
                      <button
                        type="button"
                        onClick={() => handleEditSkips(member._id, member.allowedSkips)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] text-slate-500 hover:text-indigo-600 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit Maximum Allowed Skips"
                        aria-label="Edit Skips"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-base font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-3 py-1.5 w-fit rounded-xl border border-orange-200 dark:border-orange-800/40">
                      <IndianRupee size={16} />
                      <span>{member.monthlyFee || 0}</span>
                      {member.status !== 'paid' && member.status !== 'expired' && (
                        <button
                          type="button"
                          onClick={() => handleSetFee(member._id, member.monthlyFee)}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] text-slate-500 hover:text-orange-600 ml-1 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                          title="Set Custom Monthly Fee"
                          aria-label="Set Fee"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {member.status === 'verification_pending' ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-sm font-mono font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-700/40">
                          UTR: {member.lastUtrNumber || 'N/A'}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateSubscription(member._id, { status: 'paid' })}
                          className="h-11 min-h-[44px] px-4 rounded-xl text-sm font-bold transition-colors shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 size={16} /> Approve Payment ✓
                        </button>
                      </div>
                    ) : member.status === 'expired' ? (
                      <button
                        type="button"
                        onClick={() => updateSubscription(member._id, { renew: true, status: 'paid' })}
                        className="h-11 min-h-[44px] px-4 rounded-xl text-sm font-bold transition-colors shadow-2xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                      >
                        Renew (30d)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => togglePaymentStatus(member._id, member.status)}
                        disabled={member.status === 'paid'}
                        className={`h-11 min-h-[44px] px-4 rounded-xl text-sm font-bold transition-colors shadow-2xs cursor-pointer ${
                          member.status === 'paid'
                            ? 'bg-emerald-600 text-white shadow-emerald-500/20 cursor-not-allowed opacity-90'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {member.status === 'paid' ? 'Paid ✓' : 'Mark as Paid'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SubscribersPanel;
