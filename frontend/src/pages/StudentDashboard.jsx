import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Utensils, MapPin, Navigation, Home, Phone, CheckCircle2, XCircle, LogOut, Loader2, IndianRupee, Star, AlertTriangle, Sparkles, CalendarDays, Trophy, MessageSquareQuote, Map, Award, Clock, Lock, Bell, QrCode, X, ExternalLink, Search, Plus, Users as UsersIcon, Car, ArrowRight, Camera, ShieldCheck, ChevronLeft, ChevronRight, Upload, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import MessMap from '../components/MessMap';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import { translations } from '../utils/translations';

import { API_URL } from '../utils/config';
import { getSocket } from '../utils/socket';

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

const getISTDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

const getISTTime = () => {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());
};

const MessCard = ({ messData, user, targetDate, globalCommitted, onAttendanceUpdate, mySub, onSubscribe, attendanceStatus, attendanceRecords, t }) => {
  const [attMorning, setAttMorning] = useState(null);
  const [attNight, setAttNight] = useState(null);
  const [isSubmittingMorning, setIsSubmittingMorning] = useState(false);
  const [isSubmittingNight, setIsSubmittingNight] = useState(false);
  const [errorMsg, setErrorMsg] = useState({ morning: '', night: '' });

  const [showSubForm, setShowSubForm] = useState(false);
  const [selectedShift, setSelectedShift] = useState('both');

  // --- REVIEW STATE ---
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [hasRated, setHasRated] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [showReviews, setShowReviews] = useState(false);

  const AVAILABLE_TAGS = ['Hygiene', 'Taste', 'Portion Size', 'Speed', 'Best Hygiene', 'Spicy Food'];

  const toggleTag = (tg) => {
    setSelectedTags(prev => prev.includes(tg) ? prev.filter(t => t !== tg) : [...prev, tg]);
  };

  // --- MEAL QR PASS STATE ---
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrShift, setQrShift] = useState('');
  const [qrTimeLeft, setQrTimeLeft] = useState(900);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCelebration, setQrCelebration] = useState(false);

  const ownerId = messData.ownerId?._id || messData.ownerId;

  useEffect(() => {
    let m = attendanceStatus?.morning;
    let n = attendanceStatus?.night;

    if (mySub) {
      if ((mySub.shift === 'morning' || mySub.shift === 'both') && m === undefined) m = 'coming';
      if ((mySub.shift === 'night' || mySub.shift === 'both') && n === undefined) n = 'coming';
    }
    setAttMorning(m || null);
    setAttNight(n || null);
  }, [attendanceStatus, mySub]);

  // --- MEAL QR TIMER & SOCKET ---
  useEffect(() => {
    if (!qrModalOpen || !qrToken) return;
    const timer = setInterval(() => {
      setQrTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setQrModalOpen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const socket = getSocket();
    const onConsumed = (data) => {
      if (data.studentId === user?._id && data.shift === qrShift) {
        setQrCelebration(true);
        setTimeout(() => {
          setQrModalOpen(false);
          setQrCelebration(false);
          onAttendanceUpdate(true);
        }, 2200);
      }
    };
    socket.on('attendance:consumed', onConsumed);

    return () => {
      clearInterval(timer);
      socket.off('attendance:consumed', onConsumed);
    };
  }, [qrModalOpen, qrToken, qrShift, user]);

  const handleOpenMealQr = async (shift) => {
    setQrShift(shift);
    setQrLoading(true);
    setQrToken('');
    setQrModalOpen(true);
    setQrTimeLeft(900);
    setQrCelebration(false);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/attendance/qr/${ownerId}/${targetDate}/${shift}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQrToken(data.qrToken);
      } else {
        alert(data.error || "Failed to generate meal QR pass");
        setQrModalOpen(false);
      }
    } catch (e) {
      alert("Network error fetching meal pass.");
      setQrModalOpen(false);
    } finally {
      setQrLoading(false);
    }
  };

  // --- REVIEW FUNCTIONS ---
  const fetchReviews = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/messes/${ownerId}/reviews`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setReviews(await res.json());
      setShowReviews(!showReviews);
    } catch (e) { console.error(e); }
  };

  const handleRating = async (e) => {
    e.preventDefault();
    if (rating === 0) { alert("Please select a star rating before submitting your review!"); return; }
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/messes/${ownerId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ rating, comment, tags: selectedTags, studentName: user?.name || 'Student' })
      });
      const data = await response.json();
      if (response.ok) { setHasRated(true); fetchReviews(); }
      else { alert(`Server Error: ${data.error}`); }
    } catch (error) { alert("Network error: Failed to connect to server."); }
  };

  // --- ATTENDANCE & SUBSCRIPTION FUNCTIONS ---
  const handleAttendance = async (shift, status) => {
    shift === 'morning' ? setIsSubmittingMorning(true) : setIsSubmittingNight(true);
    setErrorMsg(prev => ({ ...prev, [shift]: '' }));

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          messId: ownerId,
          messName: messData.messName,
          shift: shift,
          status,
          targetDate,
          timestamp: new Date().toISOString()
        })
      });
      const data = await response.json();
      if (response.ok) {
        shift === 'morning' ? setAttMorning(status) : setAttNight(status);
        onAttendanceUpdate(true);
      } else {
        setErrorMsg(prev => ({ ...prev, [shift]: data.error || "Action not allowed." }));
      }
    } catch (error) {
      setErrorMsg(prev => ({ ...prev, [shift]: "Connection failed." }));
    } finally {
      shift === 'morning' ? setIsSubmittingMorning(false) : setIsSubmittingNight(false);
    }
  };

  const handleSubscribe = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          messId: ownerId,
          messName: messData.messName,
          shift: selectedShift
        })
      });
      if (res.ok) {
        alert("Subscribed successfully! The owner will set your exact monthly fee.");
        setShowSubForm(false);
        onSubscribe();
      }
      else { const d = await res.json(); alert(d.error); }
    } catch (e) { alert("Failed to subscribe"); }
  };

  const currentRating = messData.ownerId?.rating ? Number(messData.ownerId.rating).toFixed(1) : 'New';
  const isTopChef = Boolean(messData.ownerId?.isTopChef || messData.isTopChef);
  const topTags = messData.ownerId?.topTags || messData.topTags || [];

  const renderShiftBlock = (shiftLabel, shiftKey, menuData, currentAtt, isSubmitting) => {
    const isCommittedToOther = globalCommitted[shiftKey] && currentAtt !== 'coming';

    const cutoff = shiftKey === 'morning'
      ? (messData.ownerId?.morningCutoff || '09:30')
      : (messData.ownerId?.nightCutoff || '17:30');

    const todayIST = getISTDate();
    const currentISTTime = getISTTime();
    const isPastDate = targetDate < todayIST;
    const isToday = targetDate === todayIST;
    const isCutoffPassed = isPastDate || (isToday && currentISTTime >= cutoff);

    const disableComing = isSubmitting || currentAtt === 'coming' || isCommittedToOther || isCutoffPassed;
    const disableSkip = isSubmitting || currentAtt === 'not_coming' || isCutoffPassed;

    const attRecord = attendanceRecords?.[shiftKey];
    const isClaimed = attRecord?.isConsumed;

    return (
      <div className={`p-5 rounded-3xl border transition-all duration-300 shadow-sm flex flex-col justify-between ${currentAtt === 'coming' ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/50' : currentAtt === 'not_coming' ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800/50 opacity-80' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50'}`}>
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-black text-slate-800 dark:text-slate-200 tracking-tight">{shiftLabel}</h4>
            <div className="flex items-center gap-2">
              {isCutoffPassed ? (
                <span className="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                  <Lock size={12} /> Locked ({cutoff})
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                  <Clock size={12} /> Cut-off: {cutoff}
                </span>
              )}
              {menuData && <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 text-xs font-bold px-2 py-1 rounded-lg uppercase flex items-center gap-1"><IndianRupee size={12} /> {menuData.price || '60'}</span>}
            </div>
          </div>

          {!menuData ? (
            <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl mb-4">
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Menu not published yet</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-6">
              {menuData.items.map((item, idx) => (
                <span key={idx} className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/60 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold">{item}</span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex gap-2 mt-auto">
            <button onClick={() => handleAttendance(shiftKey, 'coming')} disabled={disableComing} className={`flex-1 flex justify-center items-center gap-1 py-2.5 rounded-xl font-bold transition-all text-sm ${currentAtt === 'coming' ? 'bg-emerald-500 text-white shadow-md' : disableComing ? 'bg-slate-200 dark:bg-slate-700/50 text-slate-400 cursor-not-allowed' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-emerald-500 hover:text-emerald-500 shadow-sm'}`}><CheckCircle2 size={16} /> Coming</button>
            <button onClick={() => handleAttendance(shiftKey, 'not_coming')} disabled={disableSkip} className={`flex-1 flex justify-center items-center gap-1 py-2.5 rounded-xl font-bold transition-all text-sm ${currentAtt === 'not_coming' ? 'bg-rose-500 text-white shadow-md' : disableSkip ? 'bg-slate-200 dark:bg-slate-700/50 text-slate-400 cursor-not-allowed' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-rose-500 hover:text-rose-500 shadow-sm'}`}><XCircle size={16} /> Skip</button>
          </div>

          {/* MEAL PASS QR BUTTON / CLAIMED BADGE */}
          {((currentAtt === 'coming') || (mySub?.status === 'paid' && currentAtt !== 'not_coming')) && targetDate === getLocalDateString(0) && (
            <div>
              {isClaimed ? (
                <div className="mt-3 py-2 px-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border border-emerald-300 dark:border-emerald-700 shadow-sm">
                  <CheckCircle2 size={14} /> Meal Claimed ✓
                </div>
              ) : (
                <button
                  onClick={() => handleOpenMealQr(shiftKey)}
                  className="mt-3 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/25 transition-all"
                >
                  <QrCode size={15} /> Show Meal QR 🎟️
                </button>
              )}
            </div>
          )}

          {errorMsg[shiftKey] && <div className="mt-2 text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg text-center">{errorMsg[shiftKey]}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="relative bg-white/80 dark:bg-slate-900/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/80 dark:border-slate-700/50 shadow-xl mb-8 overflow-hidden group">

      <div className="h-2 w-full bg-gradient-to-r from-orange-400 to-rose-400"></div>

      <div className="p-6 sm:p-8">

        {/* MESS HEADER & SUBSCRIPTION */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{messData.messName}</h3>
              {isTopChef && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-white font-black text-xs shadow-md shadow-amber-500/30 animate-pulse">
                  👑 Campus Top Chef
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black px-3 py-1 rounded-full uppercase items-center gap-1 shadow-sm"><Star size={10} className="fill-amber-400 text-amber-400" /> {currentRating} Rating</span>
              {topTags.map((tag, tIdx) => (
                <span key={tIdx} className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-lg text-[10px] font-black border border-amber-200/50 dark:border-amber-800/40">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            {mySub && mySub.status !== 'expired' ? (
              <div className="text-right">
                <span className={`inline-flex text-xs font-black px-3 py-1.5 rounded-lg uppercase items-center gap-1 shadow-sm ${mySub.status === 'paid' ? 'bg-emerald-500 text-white' : 'bg-rose-100 text-rose-600 border border-rose-200'}`}>
                  <Award size={14} /> Member: {mySub.status}
                </span>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase text-right w-full">Shift: {mySub.shift} • Skips: {mySub.usedSkips}/{mySub.allowedSkips}</p>
              </div>
            ) : showSubForm ? (
              <div className="flex flex-col items-end gap-2 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)} className="text-xs font-bold px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer w-full">
                  <option value="morning">Morning Only</option>
                  <option value="night">Night Only</option>
                  <option value="both">Both Shifts</option>
                </select>
                <div className="flex gap-2 w-full">
                  <button onClick={() => setShowSubForm(false)} className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold py-2 rounded-xl uppercase transition-colors">Cancel</button>
                  <button onClick={handleSubscribe} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl uppercase transition-colors shadow-md">Confirm</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1">
                {mySub?.status === 'expired' && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded uppercase">
                    Subscription Expired
                  </span>
                )}
                <button onClick={() => setShowSubForm(true)} className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 text-xs font-black px-5 py-2.5 rounded-xl uppercase transition-colors flex items-center gap-2 shadow-sm">
                  <Award size={16} /> {mySub?.status === 'expired' ? 'Re-Subscribe' : 'Join Monthly'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* COMBINED SHIFTS GRID */}
        <div className="grid md:grid-cols-2 gap-4">
          {renderShiftBlock('☀️ Morning Shift', 'morning', messData.morning, attMorning, isSubmittingMorning)}
          {renderShiftBlock('🌙 Night Shift', 'night', messData.night, attNight, isSubmittingNight)}
        </div>

        {/* --- REVIEW SECTION RESTORED --- */}
        <div className="mt-8 border-t border-slate-100 dark:border-slate-700 pt-6 animate-in slide-in-from-bottom-2">
          {!hasRated ? (
            <form onSubmit={handleRating} className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">Leave a review!</p>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                    <Star size={24} className={star <= rating ? "text-amber-400 fill-amber-400 drop-shadow-md" : "text-slate-300 dark:text-slate-600"} />
                  </button>
                ))}
              </div>

              {/* Tag Selection Chips */}
              <div className="mb-3">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Select Highlights (Tags):</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TAGS.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-xl transition-all ${
                          isSelected
                            ? 'bg-orange-500 text-white shadow-sm scale-105'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-400'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <textarea rows="2" placeholder="How was the food?" value={comment} onChange={e => setComment(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none mb-3 dark:text-white" />
              <button type="submit" className="w-full bg-slate-900 dark:bg-orange-500 hover:bg-slate-800 dark:hover:bg-orange-600 transition-colors text-white font-bold py-2.5 rounded-xl">Submit Review</button>
            </form>
          ) : (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 text-center text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-2"><CheckCircle2 size={18} /> Review Submitted</div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-center">
          <button onClick={fetchReviews} className="text-xs font-bold text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 flex items-center gap-1"><MessageSquareQuote size={14} /> {showReviews ? t.hideReviews : t.readReviews}</button>
        </div>

        {showReviews && (
          <div className="mt-4 space-y-3 animate-in fade-in">
            {reviews.length === 0 ? <p className="text-xs text-center text-slate-400">No reviews yet.</p> : reviews.map(r => (
              <div key={r._id} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl text-sm border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{r.studentName}</span>
                  <span className="flex text-amber-400"><Star size={12} className="fill-amber-400" /> {r.rating}</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs italic">"{r.comment || 'No comment provided'}"</p>
                {r.tags && r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {r.tags.map((tg, idx) => (
                      <span key={idx} className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        #{tg}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MEAL QR PASS MODAL */}
        {qrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative text-center">
              <button
                onClick={() => setQrModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1">Meal Pass 🎟️</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{messData.messName} • {qrShift} Shift</p>

              {qrCelebration ? (
                <div className="py-10 animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <CheckCircle2 size={48} />
                  </div>
                  <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-1">Meal Verified! 🎉</h4>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Enjoy your meal!</p>
                </div>
              ) : qrLoading ? (
                <div className="py-16 flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 mb-3" size={40} />
                  <p className="text-xs font-bold text-slate-400">Generating Secure Pass...</p>
                </div>
              ) : qrToken ? (
                <div>
                  <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 inline-block shadow-sm mb-4">
                    <QRCodeSVG value={qrToken} size={200} level="H" />
                  </div>
                  <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-xl text-xs font-black w-fit mx-auto border border-amber-200 dark:border-amber-800/50 mb-3">
                    <Clock size={13} /> Expires in {Math.floor(qrTimeLeft / 60)}:{('0' + (qrTimeLeft % 60)).slice(-2)}
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    Show this QR code at the counter for chef verification.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const DirectoryCard = ({ title, items, icon: Icon, colorClass, t, category }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-2xl text-white shadow-lg ${colorClass}`}><Icon size={18} /></div> {title}
      </h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((item, idx) => {
          const isRoom = item.category === 'rooms' || category === 'rooms';
          return (
            <div key={item._id || idx} className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/60 dark:border-slate-700 hover:-translate-y-0.5 transition-all hover:shadow-lg group flex flex-col justify-between">
              <div className="mb-4">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-lg">{item.name}</h4>
                  {isRoom && (
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shrink-0">
                      ₹{item.rentPerMonth || 0}/mo
                    </span>
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">{item.area || item.status || 'Campus Area'}</p>

                {isRoom && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded-md capitalize">
                        👤 {item.genderPreference || 'any'}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                        item.isAvailable !== false && (item.vacancies || 0) > 0
                          ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                      }`}>
                        {item.isAvailable !== false && (item.vacancies || 0) > 0 ? `🟢 ${item.vacancies} vacancies left` : '🔴 Full'}
                      </span>
                    </div>
                    {item.amenities && item.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.amenities.map((amenity, aIdx) => (
                          <span key={aIdx} className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-md">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <a href={`tel:${item.phone}`} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-95">
                <Phone size={16} /> {t.call} {item.phone}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(location.state?.user || null);
  const [isAuthLoading, setIsAuthLoading] = useState(!user);

  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en');
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState('menus');
  const [targetDate, setTargetDate] = useState(getLocalDateString(0));

  const [menus, setMenus] = useState([]);
  const [myAttendance, setMyAttendance] = useState([]);
  const [mySubscriptions, setMySubscriptions] = useState([]);

  const [globalHasCommitted, setGlobalHasCommitted] = useState({ morning: false, night: false });

  const [leaderboard, setLeaderboard] = useState([]);
  const [directory, setDirectory] = useState({ rickshaws: [], rooms: [], emergency: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [nearbyMesses, setNearbyMesses] = useState([]);

  // Directory Filter & Search
  const [dirCategoryFilter, setDirCategoryFilter] = useState('all');
  const [dirSearchQuery, setDirSearchQuery] = useState('');

  // Auto-Pooling (Rides) State
  const [rides, setRides] = useState([]);
  const [isRidesLoading, setIsRidesLoading] = useState(false);
  const [rideModalOpen, setRideModalOpen] = useState(false);
  const [isSubmittingRide, setIsSubmittingRide] = useState(false);
  const [newRideForm, setNewRideForm] = useState({
    from: 'GCOEARA Campus Gate',
    to: 'Manchar Bus Stand',
    date: getLocalDateString(0),
    departureTime: '17:30',
    totalSeats: 3,
    totalFare: 60
  });

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);

  // UPI Payment State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedSubForPayment, setSelectedSubForPayment] = useState(null);
  const [utrInput, setUtrInput] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Mess Stories State (24h Live Feed)
  const [storiesGroups, setStoriesGroups] = useState([]);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);

  // Dedicated Top-Level Digital Meal Pass State
  const [topMealPassShift, setTopMealPassShift] = useState(new Date().getHours() < 15 ? 'morning' : 'night');
  const [topMealModalOpen, setTopMealModalOpen] = useState(false);
  const [topMealQrToken, setTopMealQrToken] = useState('');
  const [topMealQrLoading, setTopMealQrLoading] = useState(false);
  const [topMealQrTimeLeft, setTopMealQrTimeLeft] = useState(900);
  const [topMealQrCelebration, setTopMealQrCelebration] = useState(false);
  const [topMealMessData, setTopMealMessData] = useState({ messName: '', shift: '' });

  // Student OCR ID Verification State
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [idImagePreview, setIdImagePreview] = useState(null);
  const [isVerifyingId, setIsVerifyingId] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [ocrSuccess, setOcrSuccess] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/'); return; }
      try {
        const res = await fetch(`${API_URL}/api/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data.role !== 'student') navigate('/');
          else setUser(data);
        } else {
          localStorage.removeItem('token');
          navigate('/');
        }
      } catch (e) { console.error("Auth error", e); }
      finally { setIsAuthLoading(false); }
    };

    if (!user) verifyToken();
    else setIsAuthLoading(false);
  }, [navigate, user]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async (isSilent = false) => {
      if (!isSilent) setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      try {
        const menuRes = await fetch(`${API_URL}/api/menus/${targetDate}`, { headers });
        if (menuRes.ok) setMenus(await menuRes.json());

        const attRes = await fetch(`${API_URL}/api/attendance/me/${targetDate}`, { headers });
        if (attRes.ok) {
          const myAtt = await attRes.json();
          setMyAttendance(myAtt);
          setGlobalHasCommitted({
            morning: myAtt.some(a => a.status === 'coming' && a.shift === 'morning'),
            night: myAtt.some(a => a.status === 'coming' && a.shift === 'night')
          });
        }

        const subRes = await fetch(`${API_URL}/api/subscriptions/me`, { headers });
        if (subRes.ok) setMySubscriptions(await subRes.json());

        const notifRes = await fetch(`${API_URL}/api/notifications`, { headers });
        if (notifRes.ok) {
          const notifs = await notifRes.json();
          setNotifications(notifs);
          setUnreadNotifsCount(notifs.filter(n => !n.isRead).length);
        }

        const dirRes = await fetch(`${API_URL}/api/directory`, { headers });
        if (dirRes.ok) {
          const rawDir = await dirRes.json();
          setDirectory({ rickshaws: rawDir.filter(d => d.category === 'rickshaws'), rooms: rawDir.filter(d => d.category === 'rooms'), emergency: rawDir.filter(d => d.category === 'emergency') });
        }
      } catch (error) { console.error(error); }
      finally { if (!isSilent) setIsLoading(false); }
    };

    const fetchLeaderboard = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_URL}/api/messes/leaderboard`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setLeaderboard(await res.json());
      } catch (e) { console.error(e); }
    };

    const fetchStories = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_URL}/api/stories`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setStoriesGroups(await res.json());
      } catch (e) { console.error('Failed to fetch stories', e); }
    };

    fetchData(false);
    fetchLeaderboard();
    fetchRides();
    fetchStories();

    const socket = getSocket();

    const onMenuUpdated = (data) => {
      if (!data?.date || data.date === targetDate) {
        fetchData(true);
      }
    };

    const onAttendanceUpdated = (data) => {
      if (!data?.targetDate || data.targetDate === targetDate) {
        fetchData(true);
      }
    };

    const onSubscriptionUpdated = (data) => {
      if (!data?.studentId || data.studentId === user._id) {
        fetchData(true);
      }
    };

    const onNotificationNew = (data) => {
      if (!user) return;
      if (!data?.userIds || data.userIds.includes(user._id)) {
        setUnreadNotifsCount(prev => prev + 1);
        const token = localStorage.getItem('token');
        if (token) {
          fetch(`${API_URL}/api/notifications`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(notifs => {
              if (notifs) {
                setNotifications(notifs);
                setUnreadNotifsCount(notifs.filter(n => !n.isRead).length);
              }
            });
        }
      }
    };

    const onRideUpdated = () => {
      fetchRides();
    };

    const onStoryNew = () => {
      fetchStories();
    };

    socket.on('menu:updated', onMenuUpdated);
    socket.on('attendance:updated', onAttendanceUpdated);
    socket.on('subscription:updated', onSubscriptionUpdated);
    socket.on('notification:new', onNotificationNew);
    socket.on('ride:updated', onRideUpdated);
    socket.on('story:new', onStoryNew);

    return () => {
      socket.off('menu:updated', onMenuUpdated);
      socket.off('attendance:updated', onAttendanceUpdated);
      socket.off('subscription:updated', onSubscriptionUpdated);
      socket.off('notification:new', onNotificationNew);
      socket.off('ride:updated', onRideUpdated);
      socket.off('story:new', onStoryNew);
    };
  }, [targetDate, user]);

  // Auto-advance stories every 5 seconds
  useEffect(() => {
    if (!storyViewerOpen || !selectedStoryGroup) return;
    const stories = selectedStoryGroup.stories || [];
    if (stories.length === 0) return;

    const timer = setTimeout(() => {
      if (activeStoryIdx < stories.length - 1) {
        setActiveStoryIdx(prev => prev + 1);
      } else {
        setStoryViewerOpen(false);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [storyViewerOpen, selectedStoryGroup, activeStoryIdx]);

  const handleOpenStoryViewer = (group) => {
    setSelectedStoryGroup(group);
    setActiveStoryIdx(0);
    setStoryViewerOpen(true);
  };

  const handlePrevStory = (e) => {
    e?.stopPropagation();
    if (activeStoryIdx > 0) {
      setActiveStoryIdx(prev => prev - 1);
    }
  };

  const handleNextStory = (e) => {
    e?.stopPropagation();
    const stories = selectedStoryGroup?.stories || [];
    if (activeStoryIdx < stories.length - 1) {
      setActiveStoryIdx(prev => prev + 1);
    } else {
      setStoryViewerOpen(false);
    }
  };

  const handleIdImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrError('');
    setOcrSuccess('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result;
      if (!rawDataUrl) return;

      // Canvas pre-processing: auto-scale >= 1600px width, grayscale & +25% contrast boost
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const targetWidth = Math.max(1600, img.width);
          const scale = targetWidth / img.width;
          canvas.width = targetWidth;
          canvas.height = Math.round(img.height * scale);

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            const factor = 1.25; // +25% contrast boost

            for (let i = 0; i < data.length; i += 4) {
              const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              const contrasted = Math.min(255, Math.max(0, ((gray - 128) * factor) + 128));
              data[i] = contrasted;
              data[i + 1] = contrasted;
              data[i + 2] = contrasted;
            }

            ctx.putImageData(imgData, 0, 0);
            const processedUrl = canvas.toDataURL('image/jpeg', 0.92);
            setIdImagePreview(processedUrl);
            return;
          }
        } catch (canvasErr) {
          console.warn("Canvas pre-processing fallback:", canvasErr);
        }
        setIdImagePreview(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyId = async () => {
    if (!idImagePreview) {
      setOcrError('Please upload a clear photo of your student ID card.');
      return;
    }
    setIsVerifyingId(true);
    setOcrError('');
    setOcrSuccess('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/users/verify-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ base64Image: idImagePreview })
      });
      const data = await res.json();
      if (res.ok) {
        setOcrSuccess(data.message || 'Verified GCOEARA Student ✓!');
        setUser(prev => ({ ...prev, isStudentVerified: true }));
        fetchRides();
        setTimeout(() => {
          setOcrModalOpen(false);
        }, 2200);
      } else {
        setOcrError(data.error || "ID verification failed. Make sure the college name 'Government College of Engineering, Avasari' is visible in the frame.");
      }
    } catch (err) {
      setOcrError('Failed to verify ID card. Please try again or submit for manual approval.');
    } finally {
      setIsVerifyingId(false);
    }
  };

  const handleManualApproveId = async () => {
    setIsVerifyingId(true);
    setOcrError('');
    setOcrSuccess('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/users/verify-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ manualApproval: true })
      });
      const data = await res.json();
      if (res.ok) {
        setOcrSuccess('Verified GCOEARA Student ✓! Identity approved.');
        setUser(prev => ({ ...prev, isStudentVerified: true }));
        fetchRides();
        setTimeout(() => {
          setOcrModalOpen(false);
        }, 2000);
      } else {
        setOcrError(data.error || 'Failed to submit manual approval.');
      }
    } catch {
      setOcrError('Network error submitting manual approval.');
    } finally {
      setIsVerifyingId(false);
    }
  };

  if (isAuthLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;
  }

  if (!user || user.role !== 'student') {
    return <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-slate-900"><p className="text-white">Session Expired</p><button onClick={() => navigate('/')} className="text-indigo-400 font-bold underline">Return to Login</button></div>;
  }

  const fetchNearbyMesses = async () => {
    const token = localStorage.getItem('token');
    const doFetch = async (coords) => {
      try {
        let url = `${API_URL}/api/messes/nearby`;
        if (coords && coords.latitude && coords.longitude) {
          url += `?lat=${coords.latitude}&lng=${coords.longitude}`;
        }
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setNearbyMesses(await res.json());
      } catch (e) { console.error('Error fetching nearby messes:', e); }
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => doFetch(pos.coords),
        () => doFetch(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      doFetch(null);
    }
  };

  const fetchRides = async () => {
    setIsRidesLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/rides`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setRides(await res.json());
    } catch (e) {
      console.error("Error fetching rides", e);
    } finally {
      setIsRidesLoading(false);
    }
  };

  const handleCreateRide = async (e) => {
    e.preventDefault();
    if (!newRideForm.from.trim() || !newRideForm.to.trim()) {
      alert("Please specify pickup and drop locations");
      return;
    }
    setIsSubmittingRide(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newRideForm)
      });
      const data = await res.json();
      if (res.ok) {
        setRideModalOpen(false);
        fetchRides();
      } else {
        alert(data.error || "Failed to create ride pool");
      }
    } catch (err) {
      alert("Network error creating ride pool");
    } finally {
      setIsSubmittingRide(false);
    }
  };

  const handleToggleJoinRide = async (rideId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/rides/${rideId}/toggle-join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchRides();
      } else {
        alert(data.error || "Failed to update pool membership");
      }
    } catch (err) {
      alert("Network error updating ride pool");
    }
  };

  const handleCancelRide = async (rideId) => {
    if (!confirm("Are you sure you want to cancel this ride pool?")) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/rides/${rideId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchRides();
      } else {
        alert(data.error || "Failed to cancel ride pool");
      }
    } catch (err) {
      alert("Network error cancelling ride pool");
    }
  };

  const handleOpenNotifications = async () => {
    setNotifDrawerOpen(true);
    setUnreadNotifsCount(0);
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {}
  };

  const handleOpenPayment = (sub) => {
    setSelectedSubForPayment(sub);
    setUtrInput('');
    setPaymentModalOpen(true);
  };

  const handleSubmitUtr = async (e) => {
    e.preventDefault();
    if (!selectedSubForPayment) return;
    if (!utrInput.trim()) {
      alert("Please enter the 12-digit UPI reference / UTR number.");
      return;
    }
    setIsSubmittingPayment(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/${selectedSubForPayment._id}/submit-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ utrNumber: utrInput.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Payment submitted! The mess owner will verify and activate your membership.");
        setPaymentModalOpen(false);
        forceDataRefresh();
      } else {
        alert(data.error || "Failed to submit payment");
      }
    } catch (e) {
      alert("Network error submitting payment.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Group menus so there is only ONE card per Mess (combining Morning & Night)
  const groupedMesses = Object.values(menus.reduce((acc, menu) => {
    const id = menu.ownerId._id || menu.ownerId;
    if (!acc[id]) {
      acc[id] = { ownerId: menu.ownerId, messName: menu.messName, morning: null, night: null };
    }
    acc[id][menu.shift] = menu;
    return acc;
  }, {}));

  const getAttendanceStatus = (messName) => {
    return {
      morning: myAttendance.find(a => a.messName === messName && a.shift === 'morning')?.status,
      night: myAttendance.find(a => a.messName === messName && a.shift === 'night')?.status,
    };
  };

  const getAttendanceRecord = (messName) => {
    return {
      morning: myAttendance.find(a => a.messName === messName && a.shift === 'morning'),
      night: myAttendance.find(a => a.messName === messName && a.shift === 'night'),
    };
  };

  // Top-Level Digital Meal Pass Computations
  const todayStr = getLocalDateString(0);
  const activePaidSub = mySubscriptions.find(s => s.status === 'paid' && (s.shift === 'both' || s.shift === topMealPassShift)) || mySubscriptions.find(s => s.status === 'paid');
  const todayAtt = myAttendance.find(a => a.shift === topMealPassShift && (!a.targetDate || a.targetDate === todayStr));
  const hasTopMealPass = Boolean(
    (activePaidSub && (!todayAtt || todayAtt.status !== 'not_coming')) ||
    (todayAtt && todayAtt.status === 'coming')
  );
  const topMealPassMessId = todayAtt?.messId || (activePaidSub?.messId?._id || activePaidSub?.messId);
  const topMealPassMessName = todayAtt?.messName || activePaidSub?.messName || 'Your Mess';
  const topMealPassIsConsumed = Boolean(todayAtt?.isConsumed);

  // Live timer & real-time socket listener for top meal pass modal
  useEffect(() => {
    if (!topMealModalOpen || !topMealQrToken) return;
    const timer = setInterval(() => {
      setTopMealQrTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const socket = getSocket();
    const onConsumed = (data) => {
      if (data?.studentId === user?._id && data?.shift === topMealPassShift) {
        setTopMealQrCelebration(true);
        forceDataRefresh();
        setTimeout(() => {
          setTopMealQrCelebration(false);
        }, 3200);
      }
    };
    socket.on('attendance:consumed', onConsumed);

    return () => {
      clearInterval(timer);
      socket.off('attendance:consumed', onConsumed);
    };
  }, [topMealModalOpen, topMealQrToken, topMealPassShift, user]);

  const handleOpenTopMealQr = async (shift) => {
    if (!topMealPassMessId) {
      alert("No active mess subscription found.");
      return;
    }
    setTopMealQrLoading(true);
    setTopMealQrToken('');
    setTopMealModalOpen(true);
    setTopMealQrTimeLeft(900);
    setTopMealQrCelebration(false);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/attendance/qr/${topMealPassMessId}/${todayStr}/${shift}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.qrToken) {
        setTopMealQrToken(data.qrToken);
        setTopMealMessData({
          messName: data.messName || topMealPassMessName,
          shift: data.shift || shift
        });
      } else {
        alert(data.error || "Could not generate meal pass");
        setTopMealModalOpen(false);
      }
    } catch (e) {
      alert("Network error fetching meal pass.");
      setTopMealModalOpen(false);
    } finally {
      setTopMealQrLoading(false);
    }
  };

  const handleRefreshTopMealQr = () => {
    handleOpenTopMealQr(topMealPassShift);
  };

  const forceDataRefresh = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    const menuRes = await fetch(`${API_URL}/api/menus/${targetDate}`, { headers });
    if (menuRes.ok) setMenus(await menuRes.json());

    const attRes = await fetch(`${API_URL}/api/attendance/me/${targetDate}`, { headers });
    if (attRes.ok) {
      const myAtt = await attRes.json();
      setMyAttendance(myAtt);
      setGlobalHasCommitted({
        morning: myAtt.some(a => a.status === 'coming' && a.shift === 'morning'),
        night: myAtt.some(a => a.status === 'coming' && a.shift === 'night')
      });
    }
    const subRes = await fetch(`${API_URL}/api/subscriptions/me`, { headers });
    if (subRes.ok) setMySubscriptions(await subRes.json());
  };

  const studentName = (user.name || user.fullName || 'Student').split(' ')[0];

  return (
    <div className="font-sans relative z-10 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-[100%] blur-[100px] -z-10 pointer-events-none"></div>

      <nav className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white dark:border-slate-800 p-4 sticky top-0 z-50 transition-colors duration-500">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/20"><Utensils size={20} /></div>
            <h1 className="font-black text-slate-900 dark:text-white text-xl tracking-tight hidden sm:block">{t.appName || 'AvasariConnect'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenNotifications}
              className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </span>
              )}
            </button>
            <LanguageToggle lang={lang} setLang={setLang} />
            <ThemeToggle />
            <button onClick={() => { localStorage.removeItem('token'); navigate('/'); }} className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 px-4 py-2.5 rounded-xl transition-all"><LogOut size={16} /> {t.logout}</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 pt-8 pb-24 grid grid-cols-1 lg:grid-cols-4 gap-8">

        <div className="lg:col-span-3">
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{t.greeting}, {studentName} 👋</h2>
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">{t.subtitle} <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span> Live</p>
                {user?.isStudentVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-black shadow-sm">
                    <CheckCircle2 size={13} className="text-blue-500" /> Verified GCOEARA Student ✓
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setOcrError('');
                      setOcrSuccess('');
                      setIdImagePreview(null);
                      setOcrModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-500/20 transition-all active:scale-95"
                  >
                    Verify College ID 🪪
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-200/50 dark:bg-slate-800/80 backdrop-blur-md p-1.5 rounded-full shadow-inner mb-6 flex flex-wrap gap-1 relative z-20 w-fit">
            <button onClick={() => setActiveTab('menus')} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'menus' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}><Utensils size={18} /> {t.dailyMenus}</button>
            <button onClick={() => setActiveTab('directory')} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'directory' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}><MapPin size={18} /> {t.directory}</button>
            <button onClick={() => { setActiveTab('rides'); fetchRides(); }} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'rides' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}><Car size={18} /> {t.rides || '🛺 Pool'}</button>
            <button onClick={() => { setActiveTab('map'); fetchNearbyMesses(); }} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'map' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}><Map size={18} /> {t.map}</button>
          </div>

          {activeTab === 'menus' && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">

              {/* 24-HOUR MESS STORIES FEED */}
              {storiesGroups.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-orange-500" /> Live Campus Stories (24h)
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400">Tap to view live kitchen updates</span>
                  </div>
                  <div className="flex items-center gap-4 overflow-x-auto pb-3 scrollbar-none">
                    {storiesGroups.map((group) => (
                      <div
                        key={group.ownerId}
                        onClick={() => handleOpenStoryViewer(group)}
                        className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group/bubble select-none"
                      >
                        <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 shadow-md group-hover/bubble:scale-105 transition-all">
                          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-white dark:border-slate-900 overflow-hidden bg-slate-900 relative flex items-center justify-center">
                            {group.latestStory?.imageUrl ? (
                              <img
                                src={group.latestStory.imageUrl}
                                alt={group.messName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white font-black text-lg">
                                {group.messName?.charAt(0) || 'M'}
                              </div>
                            )}
                            {group.stories?.length > 1 && (
                              <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white/40">
                                {group.stories.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[76px] text-center">
                          {group.messName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex mb-8 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm w-fit">
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
                  <button onClick={() => setTargetDate(getLocalDateString(0))} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${targetDate === getLocalDateString(0) ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>{t.today}</button>
                  <button onClick={() => setTargetDate(getLocalDateString(1))} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1 ${targetDate === getLocalDateString(1) ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>{t.tomorrow} <Sparkles size={14} /></button>
                </div>
              </div>

              {/* SUBSCRIPTION CARDS WITH UPI PAYMENT FLOW */}
              {mySubscriptions.length > 0 && !isLoading && (
                <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {mySubscriptions.map(sub => {
                    const isExpired = sub.status === 'expired';
                    const isPaid = sub.status === 'paid';
                    const isPending = sub.status === 'pending';
                    const isVerifying = sub.status === 'verification_pending';
                    return (
                      <div key={sub._id} className={`p-5 rounded-3xl border transition-all ${isExpired ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-700/50' : isVerifying ? 'bg-orange-50/50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-700/50' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'}`}>
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-xl ${isExpired ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20' : isVerifying ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20'}`}>
                              <Award size={18} />
                            </div>
                            <h4 className="font-black text-slate-900 dark:text-white text-base">{sub.messName}</h4>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase ${isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : isVerifying ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' : isExpired ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20'}`}>
                            {isVerifying ? 'Verifying Payment' : sub.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold mb-3">
                          <span>Shift: {sub.shift}</span>
                          <span>{isExpired ? 'Membership Expired' : `Skips: ${sub.usedSkips}/${sub.allowedSkips}`}</span>
                        </div>

                        {/* UPI Payment Button for Pending Subscriptions */}
                        {isPending && sub.monthlyFee > 0 && (
                          <button
                            onClick={() => handleOpenPayment(sub)}
                            className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                          >
                            <IndianRupee size={14} /> Pay ₹{sub.monthlyFee} via UPI 💳
                          </button>
                        )}

                        {/* Amber Verification Badge */}
                        {isVerifying && (
                          <div className="mt-2 py-2 px-3 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-2 border border-amber-300 dark:border-amber-800">
                            <Clock size={14} className="text-amber-600" />
                            <span>VERIFYING PAYMENT ⏳ {sub.lastUtrNumber ? `(UTR: ${sub.lastUtrNumber})` : ''}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DEDICATED TOP-LEVEL DIGITAL MEAL PASS SECTION (ALWAYS ACCESSIBLE EVEN WHEN NO MENU PUBLISHED) */}
              {hasTopMealPass && (
                <div className="mb-8 p-6 sm:p-7 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-[2rem] border border-indigo-500/30 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                          <QrCode size={13} /> 🎟️ Digital Meal Pass
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          • Today ({todayStr})
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        {topMealPassMessName}
                      </h3>
                      <p className="text-xs text-slate-300 font-medium mt-1">
                        Instant counter pass valid for today's dining service. Scan at the mess counter.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      {/* Morning / Night Shift Toggle */}
                      <div className="flex bg-slate-900/80 p-1 rounded-2xl border border-indigo-500/20 shadow-inner">
                        <button
                          onClick={() => setTopMealPassShift('morning')}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${topMealPassShift === 'morning' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                          ☀️ Morning
                        </button>
                        <button
                          onClick={() => setTopMealPassShift('night')}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${topMealPassShift === 'night' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                          🌙 Night
                        </button>
                      </div>

                      {topMealPassIsConsumed ? (
                        <div className="py-3 px-5 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10">
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          <span>Meal Claimed ✓</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenTopMealQr(topMealPassShift)}
                          className="py-3 px-6 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <QrCode size={17} />
                          <span>Show Meal Pass QR 🎟️</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 text-indigo-600 dark:text-indigo-400"><Loader2 className="animate-spin mb-4" size={48} /><p className="font-bold text-slate-500 dark:text-slate-400">Loading menus...</p></div>
              ) : groupedMesses.length === 0 ? (
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-16 rounded-[2.5rem] text-center border border-white dark:border-slate-700 shadow-xl">
                  <div className="bg-slate-100 dark:bg-slate-700 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"><CalendarDays className="text-slate-400 dark:text-slate-500" size={40} /></div>
                  <h3 className="font-black text-slate-900 dark:text-white text-2xl mb-2">{t.noMenus}</h3>
                  <p className="text-slate-500 dark:text-slate-400">{t.noMenusDesc}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {groupedMesses.map(messData => (
                    <MessCard
                      key={messData.ownerId._id || messData.ownerId}
                      messData={messData}
                      user={user}
                      targetDate={targetDate}
                      initialAttendance={getAttendanceStatus(messData.messName)}
                      globalCommitted={globalHasCommitted}
                      mySub={mySubscriptions.find(s => s.messId === (messData.ownerId._id || messData.ownerId))}
                      onSubscribe={() => forceDataRefresh()}
                      onAttendanceUpdate={() => forceDataRefresh()}
                      attendanceStatus={getAttendanceStatus(messData.messName)}
                      attendanceRecords={getAttendanceRecord(messData.messName)}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'directory' && (
            <div className="animate-in fade-in slide-in-from-bottom-8">
              {/* Category Filter Pills & Search */}
              <div className="mb-6 space-y-4">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, area, or amenities..."
                    value={dirSearchQuery}
                    onChange={(e) => setDirSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  />
                  {dirSearchQuery && (
                    <button
                      onClick={() => setDirSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'All Services' },
                    { id: 'rooms', label: '🏠 PGs & Rooms' },
                    { id: 'rickshaws', label: '🛺 Auto Rickshaws' },
                    { id: 'emergency', label: '🚨 Emergency' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDirCategoryFilter(tab.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${dirCategoryFilter === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtered Directory Cards */}
              {(() => {
                const filterItems = (list) => {
                  if (!dirSearchQuery.trim()) return list;
                  const q = dirSearchQuery.toLowerCase();
                  return list.filter(item =>
                    (item.name && item.name.toLowerCase().includes(q)) ||
                    (item.area && item.area.toLowerCase().includes(q)) ||
                    (item.amenities && item.amenities.some(a => a.toLowerCase().includes(q)))
                  );
                };

                const filteredRickshaws = filterItems(directory.rickshaws);
                const filteredRooms = filterItems(directory.rooms);
                const filteredEmergency = filterItems(directory.emergency);

                const hasAny = (dirCategoryFilter === 'all' && (filteredRickshaws.length > 0 || filteredRooms.length > 0 || filteredEmergency.length > 0)) ||
                  (dirCategoryFilter === 'rickshaws' && filteredRickshaws.length > 0) ||
                  (dirCategoryFilter === 'rooms' && filteredRooms.length > 0) ||
                  (dirCategoryFilter === 'emergency' && filteredEmergency.length > 0);

                if (!hasAny) {
                  return (
                    <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                      <Search size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="font-bold text-slate-600 dark:text-slate-300">No directory listings match your search.</p>
                      <p className="text-xs text-slate-400 mt-1">Try searching a different keyword or resetting filters.</p>
                    </div>
                  );
                }

                return (
                  <>
                    {(dirCategoryFilter === 'all' || dirCategoryFilter === 'rooms') && (
                      <DirectoryCard title={t.pgRooms} icon={Home} colorClass="bg-gradient-to-br from-emerald-500 to-teal-600" items={filteredRooms} t={t} />
                    )}
                    {(dirCategoryFilter === 'all' || dirCategoryFilter === 'rickshaws') && (
                      <DirectoryCard title={t.autoRickshaws} icon={Navigation} colorClass="bg-gradient-to-br from-blue-500 to-indigo-600" items={filteredRickshaws} t={t} />
                    )}
                    {(dirCategoryFilter === 'all' || dirCategoryFilter === 'emergency') && (
                      <DirectoryCard title={t.emergency} icon={AlertTriangle} colorClass="bg-gradient-to-br from-rose-500 to-pink-600" items={filteredEmergency} t={t} />
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {activeTab === 'rides' && (
            <div className="animate-in fade-in slide-in-from-bottom-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🛺</span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Campus Auto-Pooling Board</h3>
                  </div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Share auto rickshaws between GCOEARA Campus, Manchar, and Narayangaon to split the fare!
                  </p>
                </div>
                <button
                  onClick={() => setRideModalOpen(true)}
                  className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all shrink-0"
                >
                  <Plus size={18} /> Create Ride Pool
                </button>
              </div>

              {isRidesLoading ? (
                <div className="p-16 flex items-center justify-center">
                  <Loader2 className="animate-spin text-indigo-500" size={36} />
                </div>
              ) : rides.length === 0 ? (
                <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                  <Car size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <h4 className="font-black text-slate-800 dark:text-slate-200 text-base mb-1">No Active Pools Yet</h4>
                  <p className="text-xs text-slate-400 mb-5">Be the first to create a ride pool and travel together affordably.</p>
                  <button
                    onClick={() => setRideModalOpen(true)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2"
                  >
                    <Plus size={16} /> Create Pool
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rides.map(ride => {
                    const isCreator = user?._id === ride.creatorId;
                    const hasJoined = ride.passengers.some(p => p.studentId === user?._id);
                    const isFull = ride.passengers.length >= ride.totalSeats;
                    const currentPerPerson = Math.ceil(ride.totalFare / Math.max(1, ride.passengers.length));
                    const fullPerPerson = Math.ceil(ride.totalFare / ride.totalSeats);

                    return (
                      <div
                        key={ride._id}
                        className={`p-5 rounded-3xl border transition-all ${hasJoined ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'}`}
                      >
                        {/* Route Title */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 flex-wrap text-sm font-black text-slate-900 dark:text-white">
                            <span>{ride.from}</span>
                            <ArrowRight size={14} className="text-indigo-500 shrink-0" />
                            <span>{ride.to}</span>
                          </div>
                          {isCreator && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shrink-0 flex items-center gap-1">
                              Host
                              {ride.creatorIsVerified && (
                                <span className="text-blue-600 dark:text-blue-400 font-black text-xs" title="Verified GCOEARA Student">
                                  ✓
                                </span>
                              )}
                            </span>
                          )}
                          {!isCreator && hasJoined && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 shrink-0">
                              Joined
                            </span>
                          )}
                        </div>

                        {/* Date & Time */}
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 mb-4">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays size={14} className="text-indigo-500" />
                            <span>{ride.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-indigo-500" />
                            <span>{ride.departureTime}</span>
                          </div>
                        </div>

                        {/* Fare & Seats Matrix */}
                        <div className="grid grid-cols-2 gap-2 mb-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Current Fare</span>
                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">₹{currentPerPerson}</span>
                            <span className="text-[10px] text-slate-400 block">/ person</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Seats Occupied</span>
                            <span className="text-base font-black text-slate-800 dark:text-slate-200">
                              {ride.passengers.length} / {ride.totalSeats}
                            </span>
                            <span className="text-[10px] text-slate-400 block">(₹{fullPerPerson} when full)</span>
                          </div>
                        </div>

                        {/* Passenger Avatars / Names */}
                        <div className="mb-4">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Riders:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {ride.passengers.map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className="flex items-center gap-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl text-slate-700 dark:text-slate-300"
                              >
                                <span>{p.studentName?.split(' ')[0]}</span>
                                {p.isStudentVerified && (
                                  <span className="inline-flex items-center justify-center w-3.5 h-3.5 bg-blue-500 text-white rounded-full text-[9px] font-black" title="Verified GCOEARA Student">
                                    ✓
                                  </span>
                                )}
                                {p.studentId === user?._id && <span className="text-[10px] text-indigo-500 font-bold">(You)</span>}
                                {hasJoined && p.phone && p.studentId !== user?._id && (
                                  <a href={`tel:${p.phone}`} className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 p-0.5" title={`Call ${p.studentName}`}>
                                    <Phone size={11} />
                                  </a>
                                )}
                              </div>
                            ))}
                            {Array.from({ length: Math.max(0, ride.totalSeats - ride.passengers.length) }).map((_, emptyIdx) => (
                              <div
                                key={`empty-${emptyIdx}`}
                                className="text-xs font-medium border border-dashed border-slate-300 dark:border-slate-700 px-2.5 py-1 rounded-xl text-slate-400"
                              >
                                Empty Seat
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-400">
                            Total: ₹{ride.totalFare}
                          </span>

                          {isCreator ? (
                            <button
                              onClick={() => handleCancelRide(ride._id)}
                              className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all"
                            >
                              Cancel Pool
                            </button>
                          ) : hasJoined ? (
                            <button
                              onClick={() => handleToggleJoinRide(ride._id)}
                              className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md transition-all active:scale-95"
                            >
                              Leave Pool
                            </button>
                          ) : isFull ? (
                            <button
                              disabled
                              className="px-4 py-2 text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-400 rounded-xl cursor-not-allowed"
                            >
                              Full
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleJoinRide(ride._id)}
                              className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                            >
                              Join Pool (Save ₹{Math.max(0, ride.totalFare - currentPerPerson)})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'map' && (
            <MessMap messes={nearbyMesses} />
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gradient-to-b from-amber-100 to-orange-50 dark:from-amber-900/40 dark:to-orange-900/10 p-6 rounded-[2rem] border border-amber-200 dark:border-amber-700/50 shadow-xl shadow-amber-500/10 sticky top-24">
            <h3 className="font-black text-amber-900 dark:text-amber-400 text-xl mb-5 flex items-center gap-2"><Trophy size={24} className="text-amber-500" /> {t.topRated}</h3>
            <div className="space-y-4">
              {leaderboard.length === 0 ? <p className="text-sm text-amber-700/60 dark:text-amber-500/60 font-bold text-center py-4">No ratings yet.</p> : leaderboard.map((mess, i) => (
                <div key={mess._id} className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-4 rounded-2xl flex items-center justify-between border border-white dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-amber-400 text-white shadow-lg shadow-amber-400/40' : i === 1 ? 'bg-slate-300 text-slate-700' : 'bg-orange-300 text-orange-900'}`}>{i + 1}</div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-[110px]">{mess.messName}</p>
                        {(mess.isTopChef || i === 0) && (
                          <span className="text-xs" title="Campus Top Chef">👑</span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{mess.ratingCount} {t.reviews}</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400"><Star size={12} className="fill-amber-500" /> {Number(mess.rating).toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* NOTIFICATIONS DRAWER / MODAL */}
      {notifDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <Bell size={18} />
                </div>
                <h3 className="font-black text-slate-900 dark:text-white text-lg">Notifications</h3>
              </div>
              <button
                onClick={() => setNotifDrawerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Bell size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n._id}
                    className={`p-3.5 rounded-2xl border transition-all ${!n.isRead ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'}`}
                  >
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{n.title}</h4>
                    <p className="text-slate-600 dark:text-slate-300 text-xs mb-2 leading-relaxed">{n.body}</p>
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* UPI PAYMENT MODAL */}
      {paymentModalOpen && selectedSubForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setPaymentModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl">
                <IndianRupee size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Pay Mess Fee</h3>
                <p className="text-xs font-bold text-slate-400">{selectedSubForPayment.messName}</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 mb-5">
              <div className="flex justify-between items-center mb-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                <span>Monthly Fee:</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{selectedSubForPayment.monthlyFee}</span>
              </div>
              {selectedSubForPayment.messId?.upiId ? (
                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                  <span>Owner UPI ID:</span>
                  <span className="font-mono bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded">{selectedSubForPayment.messId.upiId}</span>
                </div>
              ) : (
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  ⚠️ Owner has not set custom UPI ID. Please check with your mess owner.
                </p>
              )}
            </div>

            {/* UPI Intent Deep Link Button */}
            <a
              href={`upi://pay?pa=${selectedSubForPayment.messId?.upiId || 'messowner@upi'}&pn=${encodeURIComponent(selectedSubForPayment.messName)}&am=${selectedSubForPayment.monthlyFee}&cu=INR&tn=${encodeURIComponent('Mess Fee - ' + (user?.name || 'Student'))}`}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 mb-5 transition-all"
            >
              <ExternalLink size={16} /> Pay via UPI App (GPay / PhonePe / Paytm)
            </a>

            <form onSubmit={handleSubmitUtr} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  12-digit UPI Reference / UTR Number:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 439201948201"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                  maxLength={16}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingPayment}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isSubmittingPayment ? <Loader2 size={16} className="animate-spin" /> : "I Have Paid ✓"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE RIDE POOL MODAL */}
      {rideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setRideModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl">
                <Car size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Create Auto Pool</h3>
                <p className="text-xs font-bold text-slate-400">Post your ride and split the fare with fellow students</p>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 mb-2">Quick Route Presets:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { from: 'GCOEARA Campus Gate', to: 'Manchar Bus Stand', fare: 60, seats: 3 },
                  { from: 'Manchar Bus Stand', to: 'GCOEARA Campus Gate', fare: 60, seats: 3 },
                  { from: 'GCOEARA Campus', to: 'Narayangaon Bypass', fare: 100, seats: 3 },
                  { from: 'GCOEARA Campus', to: 'Pune Shivajinagar', fare: 400, seats: 4 }
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNewRideForm(prev => ({ ...prev, from: p.from, to: p.to, totalFare: p.fare, totalSeats: p.seats }))}
                    className="p-2 text-left bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <div className="truncate">{p.from} ➔ {p.to}</div>
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">₹{p.fare} • {p.seats} seats</div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateRide} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">From (Pickup):</label>
                  <input
                    type="text"
                    required
                    value={newRideForm.from}
                    onChange={(e) => setNewRideForm(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">To (Drop):</label>
                  <input
                    type="text"
                    required
                    value={newRideForm.to}
                    onChange={(e) => setNewRideForm(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date:</label>
                  <input
                    type="date"
                    required
                    value={newRideForm.date}
                    onChange={(e) => setNewRideForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Departure Time:</label>
                  <input
                    type="time"
                    required
                    value={newRideForm.departureTime}
                    onChange={(e) => setNewRideForm(prev => ({ ...prev, departureTime: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Total Available Seats:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newRideForm.totalSeats}
                    onChange={(e) => setNewRideForm(prev => ({ ...prev, totalSeats: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Total Auto Fare (₹):</label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={newRideForm.totalFare}
                    onChange={(e) => setNewRideForm(prev => ({ ...prev, totalFare: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Cost Split Summary Box */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">Estimated Split Per Person (when full):</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  ₹{Math.ceil(newRideForm.totalFare / Math.max(1, newRideForm.totalSeats))}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmittingRide}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black rounded-xl text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                {isSubmittingRide ? <Loader2 size={16} className="animate-spin" /> : "Publish Ride Pool 🛺"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 24-HOUR STORY VIEWER MODAL */}
      {storyViewerOpen && selectedStoryGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in select-none">
          <div className="relative max-w-sm w-full h-[620px] rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl flex flex-col justify-between">
            {/* Top Bar with Segments & Header */}
            <div className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
              {/* Progress Segments */}
              <div className="flex gap-1.5 mb-3">
                {selectedStoryGroup.stories.map((st, idx) => (
                  <div key={st._id || idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-white transition-all duration-300 ${
                        idx < activeStoryIdx ? 'w-full' : idx === activeStoryIdx ? 'w-full animate-[progress_5s_linear]' : 'w-0'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Mess Details Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 p-0.5">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xs overflow-hidden">
                      {selectedStoryGroup.latestStory?.imageUrl ? (
                        <img src={selectedStoryGroup.latestStory.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        selectedStoryGroup.messName?.charAt(0) || 'M'
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-white font-black text-sm tracking-tight">{selectedStoryGroup.messName}</h4>
                    <p className="text-[10px] font-bold text-white/70">
                      {selectedStoryGroup.stories[activeStoryIdx]?.createdAt
                        ? new Date(selectedStoryGroup.stories[activeStoryIdx].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Live Update'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setStoryViewerOpen(false)}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Story Image */}
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {selectedStoryGroup.stories[activeStoryIdx]?.imageUrl ? (
                <img
                  src={selectedStoryGroup.stories[activeStoryIdx].imageUrl}
                  alt={selectedStoryGroup.stories[activeStoryIdx].caption || "Live story"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-white/40 font-bold">No image</div>
              )}

              {/* Navigation Click Zones */}
              <div
                onClick={handlePrevStory}
                className="absolute inset-y-0 left-0 w-1/3 cursor-pointer z-10 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition-opacity"
              >
                <div className="p-2 rounded-full bg-black/40 text-white">
                  <ChevronLeft size={20} />
                </div>
              </div>
              <div
                onClick={handleNextStory}
                className="absolute inset-y-0 right-0 w-1/3 cursor-pointer z-10 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition-opacity"
              >
                <div className="p-2 rounded-full bg-black/40 text-white">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>

            {/* Bottom Caption Overlay */}
            {selectedStoryGroup.stories[activeStoryIdx]?.caption && (
              <div className="absolute bottom-0 inset-x-0 z-30 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-white text-xs font-semibold leading-relaxed">
                  {selectedStoryGroup.stories[activeStoryIdx].caption}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STUDENT OCR ID VERIFICATION MODAL */}
      {ocrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setOcrModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Verify College ID 🪪</h3>
                <p className="text-xs font-bold text-slate-400">GCOEARA Attendance & Ride Pool Trust</p>
              </div>
            </div>

            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Upload a clear photo of your GCOEARA College ID card. Our on-device OCR engine scans for college accreditation credentials to grant your blue verified trust badge.
            </p>

            {/* ID Image Upload Box */}
            <div className="mb-4">
              {idImagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-500/40 bg-slate-950">
                  <img src={idImagePreview} alt="ID Preview" className="w-full h-48 object-contain" />
                  <button
                    onClick={() => setIdImagePreview(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 transition-colors text-xs font-bold flex items-center gap-1"
                  >
                    <X size={14} /> Change
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-800/40 transition-colors group">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Upload size={22} />
                  </div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 mb-0.5">Upload or Snap College ID</span>
                  <span className="text-[10px] font-bold text-slate-400">PNG, JPG, or JPEG (Ensure text is sharp)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIdImageSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Error or Success Feedback */}
            {ocrError && (
              <div className="mb-4 space-y-3">
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{ocrError}</span>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-bold mb-1">💡 Tips for instant verification:</p>
                  <p className="leading-relaxed">Make sure the college name 'Government College of Engineering, Avasari' is visible in the frame.</p>
                </div>
                <button
                  type="button"
                  onClick={handleManualApproveId}
                  disabled={isVerifyingId}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <ShieldCheck size={14} /> Submit for Manual Approval
                </button>
              </div>
            )}

            {ocrSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-in zoom-in-95">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                <span>{ocrSuccess}</span>
              </div>
            )}

            <button
              onClick={handleVerifyId}
              disabled={isVerifyingId || !idImagePreview || Boolean(ocrSuccess)}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {isVerifyingId ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Scanning ID with OCR...</span>
                </>
              ) : ocrSuccess ? (
                "Verified Successfully ✓"
              ) : (
                "Scan & Verify ID 🪪"
              )}
            </button>
          </div>
        </div>
      )}

      {/* TOP-LEVEL DEDICATED DIGITAL MEAL PASS MODAL */}
      {topMealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative text-center">
            <button
              onClick={() => setTopMealModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1">Digital Meal Pass 🎟️</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              {topMealMessData.messName || topMealPassMessName} • {topMealPassShift.toUpperCase()} SHIFT
            </p>

            {topMealQrCelebration ? (
              <div className="py-8 animate-in zoom-in-95">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-bounce">
                  <CheckCircle2 size={48} />
                </div>
                <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-1">✅ Meal Claimed!</h4>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Enjoy your meal.</p>
              </div>
            ) : topMealQrLoading ? (
              <div className="py-16 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400 mb-3" size={40} />
                <p className="text-xs font-bold text-slate-400">Generating Secure Pass...</p>
              </div>
            ) : topMealQrToken ? (
              <div>
                <div className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  Student: <span className="font-black text-slate-900 dark:text-white">{user?.name}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 inline-block shadow-sm mb-4">
                  <QRCodeSVG value={topMealQrToken} size={200} level="H" />
                </div>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-xl text-xs font-black border border-amber-200 dark:border-amber-800/50">
                    <Clock size={13} /> Expires in {Math.floor(topMealQrTimeLeft / 60)}:{('0' + (topMealQrTimeLeft % 60)).slice(-2)}
                  </div>
                  <button
                    onClick={handleRefreshTopMealQr}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors"
                    title="Refresh QR"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-relaxed">
                  Show this QR code to the mess owner at the counter to verify your meal.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentDashboard;