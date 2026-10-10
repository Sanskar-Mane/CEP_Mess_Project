import React from 'react';
import {
  IndianRupee,
  MapPin,
  Navigation,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { API_URL } from '../../utils/config';

const MessSettingsPanel = ({
  t,
  mode = 'all',
  // UPI props
  upiId,
  setUpiId,
  isSavingUpi,
  upiMsg,
  handleSaveUpi,
  members = [],
  updateSubscription,
  // Location props
  savedLocation,
  setSavedLocation,
  isSettingLocation,
  setIsSettingLocation,
  locationMsg,
  setLocationMsg
}) => {
  const pendingMembers = members.filter((m) => m.status === 'verification_pending');

  const showUpi = mode === 'all' || mode === 'upi' || mode === 'mess_settings';
  const showLocation = mode === 'all' || mode === 'mess_settings';

  const handleDetectLocation = async () => {
    setIsSettingLocation(true);
    setLocationMsg('');
    if (!('geolocation' in navigator)) {
      setLocationMsg('Geolocation is not supported by your browser.');
      setIsSettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`${API_URL}/api/owner/location`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            })
          });
          if (res.ok) {
            setLocationMsg(
              `Location saved! (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`
            );
            setSavedLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          } else {
            setLocationMsg('Failed to save location.');
          }
        } catch {
          setLocationMsg('Connection failed.');
        } finally {
          setIsSettingLocation(false);
        }
      },
      () => {
        setLocationMsg('Location access denied. Please enable GPS permissions.');
        setIsSettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-4">
      {/* 1. UPI PAYMENT CONFIGURATION */}
      {showUpi && (
        <section className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <IndianRupee size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {t.upiPaymentsTile || 'UPI Payment Configuration'}
              </h3>
              <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
                VPA for direct student fee transfers via PhonePe, GPay, or Paytm
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveUpi} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Your Mess UPI ID / VPA
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. messowner@okaxis"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-medium text-base outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingUpi}
              className="w-full h-12 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer text-base"
            >
              {isSavingUpi ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              <span>Save UPI ID</span>
            </button>
          </form>

          {upiMsg && (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              {upiMsg}
            </p>
          )}

          {/* Pending UTR approvals quick list */}
          {pendingMembers.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertCircle size={16} />
                Pending Payment Approvals ({pendingMembers.length})
              </span>
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {pendingMembers.map((sub) => (
                  <div
                    key={sub._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm block">
                        {sub.studentName}
                      </span>
                      <span className="text-sm font-mono text-amber-800 dark:text-amber-300">
                        UTR: {sub.lastUtrNumber || 'N/A'} • ₹{sub.monthlyFee || 0}
                      </span>
                    </div>
                    {updateSubscription && (
                      <button
                        type="button"
                        onClick={() => updateSubscription(sub._id, { status: 'paid' })}
                        className="h-11 min-h-[44px] px-4 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center justify-center self-start sm:self-auto"
                      >
                        Approve Payment
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 2. MESS LOCATION (GPS) */}
      {showLocation && (
        <section className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <MapPin size={22} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {t.setMessLocation || 'Mess Location (GPS)'}
              </h3>
              <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
                Pins your mess on the student campus map so students can find directions
              </p>
            </div>
          </div>

          {savedLocation ? (
            <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-medium text-sm">
                <CheckCircle2 size={18} className="shrink-0" />
                <span>
                  {savedLocation.lat.toFixed(5)}, {savedLocation.lng.toFixed(5)}
                </span>
              </div>
              <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 bg-indigo-200/60 dark:bg-indigo-800/50 px-2.5 py-1 rounded-md">
                Active
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-normal">
              No GPS coordinates recorded yet. Click below while physically at your mess.
            </div>
          )}

          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isSettingLocation}
            className="w-full h-12 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer text-base"
          >
            {isSettingLocation ? <Loader2 className="animate-spin" size={18} /> : <Navigation size={18} />}
            <span>
              {isSettingLocation
                ? t.detecting
                : savedLocation
                ? `${t.updateCurrentLocation}`
                : `${t.useCurrentLocation}`}
            </span>
          </button>

          {locationMsg && (
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              {locationMsg}
            </p>
          )}
        </section>
      )}
    </div>
  );
};

export default MessSettingsPanel;
