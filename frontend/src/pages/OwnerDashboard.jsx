import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChefHat, Users, CheckCircle2, XCircle, LogOut, Loader2, PlusCircle, TrendingUp, CalendarDays, LineChart, Calculator, MapPin, Navigation, IndianRupee, CalendarPlus, Edit3, Phone, Clock, Bell, QrCode, AlertCircle, X, Scale, Leaf, Settings2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import { translations } from '../utils/translations';
import { API_URL } from '../utils/config';
import { getSocket } from '../utils/socket';

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

const OwnerDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // --- AUTHENTICATION LOGIC ---
  const [user, setUser] = useState(location.state?.user || null);
  const [isAuthLoading, setIsAuthLoading] = useState(!user);

  // Language State
  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en');
  const t = translations[lang];

  // Publish Form State
  const [menuDate, setMenuDate] = useState(getLocalDateString(0));
  const [menuShift, setMenuShift] = useState('morning');
  const [menuItems, setMenuItems] = useState('');
  const [price, setPrice] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isMenuExisting, setIsMenuExisting] = useState(false);

  // Analytics & Members State
  const [analyticsShift, setAnalyticsShift] = useState('morning');
  const [stats, setStats] = useState({
    morning: { coming: 0, notComing: 0, consumed: 0, estimates: { requiredKg: { rice: 0, flour: 0, dal: 0, veggies: 0 }, foodSavedKg: 0 } },
    night: { coming: 0, notComing: 0, consumed: 0, estimates: { requiredKg: { rice: 0, flour: 0, dal: 0, veggies: 0 }, foodSavedKg: 0 } }
  });
  const [historyData, setHistoryData] = useState([]);
  const [members, setMembers] = useState([]);

  // Kitchen Ration Estimator State
  const [rationModalOpen, setRationModalOpen] = useState(false);
  const [customRationConfig, setCustomRationConfig] = useState({
    riceGrams: 120,
    flourGrams: 110,
    dalGrams: 45,
    veggieGrams: 150
  });
  const [isSavingRation, setIsSavingRation] = useState(false);
  const [rationMsg, setRationMsg] = useState('');

  // QR Meal Pass Verification Modal State
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [isVerifyingQr, setIsVerifyingQr] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  // UPI Configuration State
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [isSavingUpi, setIsSavingUpi] = useState(false);
  const [upiMsg, setUpiMsg] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);

  // Calculator State
  const [estThalis, setEstThalis] = useState('');

  // Location State
  const [isSettingLocation, setIsSettingLocation] = useState(false);
  const [locationMsg, setLocationMsg] = useState('');
  const [savedLocation, setSavedLocation] = useState(null);

  // Cut-off Timers State
  const [morningCutoff, setMorningCutoff] = useState(user?.morningCutoff || '09:30');
  const [nightCutoff, setNightCutoff] = useState(user?.nightCutoff || '17:30');
  const [isSavingCutoff, setIsSavingCutoff] = useState(false);
  const [cutoffMsg, setCutoffMsg] = useState('');

  const displayDate = new Date(menuDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // 1. Verify User Session (Refresh Fix)
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/'); return; }
      try {
        const res = await fetch(`${API_URL}/api/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data.role !== 'owner') navigate('/');
          else {
            setUser(data);
            if (data.upiId) setUpiId(data.upiId);
            if (data.morningCutoff) setMorningCutoff(data.morningCutoff);
            if (data.nightCutoff) setNightCutoff(data.nightCutoff);
            if (data.rationConfig) setCustomRationConfig(data.rationConfig);
            if (data.location && data.location.coordinates && data.location.coordinates[0] !== 0) {
              setSavedLocation({
                lng: data.location.coordinates[0],
                lat: data.location.coordinates[1]
              });
            }
          }
        } else {
          localStorage.removeItem('token');
          navigate('/');
        }
      } catch (e) { console.error("Auth error", e); }
      finally { setIsAuthLoading(false); }
    };

    if (!user) verifyToken();
    else {
      if (user.upiId) setUpiId(user.upiId);
      if (user.morningCutoff) setMorningCutoff(user.morningCutoff);
      if (user.nightCutoff) setNightCutoff(user.nightCutoff);
      if (user.rationConfig) setCustomRationConfig(user.rationConfig);
      setIsAuthLoading(false);
    }
  }, [navigate, user]);

  // 2. Fetch Menu whenever the date OR shift changes
  useEffect(() => {
    if (!user) return;
    const fetchExistingMenu = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_URL}/api/menus/${menuDate}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
          const menus = await response.json();
          const myMenu = menus.find(m => (m.ownerId._id === user._id || m.ownerId === user._id) && m.shift === menuShift);
          if (myMenu) {
            setMenuItems(myMenu.items.join(', '));
            setPrice(myMenu.price.toString());
            setIsMenuExisting(true);
          } else {
            setMenuItems('');
            setPrice('');
            setIsMenuExisting(false);
          }
        }
      } catch (e) { console.error("Failed to fetch menus", e); }
    };
    fetchExistingMenu();
  }, [menuDate, menuShift, user]);

  // 3. Fetch other stats based on date
  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_URL}/api/attendance/stats/${encodeURIComponent(user.messName || 'Partner Mess')}/${menuDate}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
          if (data.rationConfig) setCustomRationConfig(data.rationConfig);
        }

        const notifRes = await fetch(`${API_URL}/api/notifications`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (notifRes.ok) {
          const notifs = await notifRes.json();
          setNotifications(notifs);
          setUnreadNotifsCount(notifs.filter(n => !n.isRead).length);
        }
      } catch (e) { console.error(e); }
    };

    const fetchHistory = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${API_URL}/api/attendance/history/${encodeURIComponent(user.messName || 'Partner Mess')}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) setHistoryData(await response.json());
      } catch (e) { console.error(e); }
    };

    const fetchMembers = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_URL}/api/subscriptions/mess`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setMembers(await res.json());
      } catch (e) { console.error("Failed to fetch members", e); }
    };

    fetchStats();
    fetchHistory();
    fetchMembers();

    const socket = getSocket();
    const onAttendanceUpdated = (data) => {
      if (!data?.messName || data.messName === user.messName) {
        fetchStats();
        fetchHistory();
      }
    };
    const onAttendanceConsumed = () => {
      fetchStats();
      fetchHistory();
    };
    const onSubscriptionUpdated = (data) => {
      if (!data?.messId || data.messId === user._id) {
        fetchMembers();
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

    socket.on('attendance:updated', onAttendanceUpdated);
    socket.on('attendance:consumed', onAttendanceConsumed);
    socket.on('subscription:updated', onSubscriptionUpdated);
    socket.on('notification:new', onNotificationNew);

    return () => {
      socket.off('attendance:updated', onAttendanceUpdated);
      socket.off('attendance:consumed', onAttendanceConsumed);
      socket.off('subscription:updated', onSubscriptionUpdated);
      socket.off('notification:new', onNotificationNew);
    };
  }, [menuDate, user]);

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

  const handleSaveUpi = async (e) => {
    e.preventDefault();
    if (!upiId.trim()) return;
    setIsSavingUpi(true);
    setUpiMsg('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/owner/upi`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ upiId: upiId.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setUpiMsg('✅ UPI ID saved successfully!');
        setUser(prev => ({ ...prev, upiId: upiId.trim() }));
      } else {
        setUpiMsg(`❌ ${data.error || 'Failed to save UPI ID'}`);
      }
    } catch {
      setUpiMsg('❌ Network error saving UPI ID');
    } finally {
      setIsSavingUpi(false);
    }
  };

  const handleSaveRationConfig = async (e) => {
    e.preventDefault();
    setIsSavingRation(true);
    setRationMsg('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/owner/ration-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(customRationConfig)
      });
      const data = await res.json();
      if (res.ok) {
        setRationMsg('✅ Ration norms updated successfully!');
        setUser(prev => ({ ...prev, rationConfig: customRationConfig }));
        forceStatsRefresh();
      } else {
        setRationMsg(`❌ ${data.error || 'Failed to update norms'}`);
      }
    } catch {
      setRationMsg('❌ Network error updating ration norms');
    } finally {
      setIsSavingRation(false);
    }
  };

  const handleVerifyQr = async (e) => {
    if (e) e.preventDefault();
    if (!qrTokenInput.trim() || isVerifyingQr) return;
    setIsVerifyingQr(true);
    setVerifyResult(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/attendance/verify-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ qrToken: qrTokenInput.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setVerifyResult({
          type: 'success',
          message: `Meal Verified for ${data.shift.toUpperCase()} Shift!`,
          studentName: data.studentName
        });
        setQrTokenInput('');
        forceStatsRefresh();
      } else {
        setVerifyResult({
          type: 'error',
          message: data.error || 'Failed to verify meal pass.'
        });
      }
    } catch {
      setVerifyResult({
        type: 'error',
        message: 'Network error connecting to verification server.'
      });
    } finally {
      setIsVerifyingQr(false);
    }
  };

  const handleSaveCutoff = async (e) => {
    e.preventDefault();
    setIsSavingCutoff(true);
    setCutoffMsg('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/owner/cutoff`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ morningCutoff, nightCutoff })
      });
      const data = await res.json();
      if (res.ok) {
        setCutoffMsg('✅ Attendance cut-offs updated successfully!');
        setUser(prev => ({ ...prev, morningCutoff, nightCutoff }));
      } else {
        setCutoffMsg(`❌ ${data.error || 'Failed to update cut-offs'}`);
      }
    } catch {
      setCutoffMsg('❌ Network error saving cut-offs');
    } finally {
      setIsSavingCutoff(false);
    }
  };

  // --- RENDER GUARDS ---
  if (isAuthLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-orange-500" size={48} /></div>;
  if (!user || user.role !== 'owner') return <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-slate-900"><p className="text-white">Session Expired</p><button onClick={() => navigate('/')} className="text-orange-400 font-bold underline">Return to Login</button></div>;

  // --- HELPER FUNCTIONS ---
  const forceMembersRefresh = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/mess`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setMembers(await res.json());
    } catch (e) { console.error("Failed to fetch members", e); }
  };

  const updateSubscription = async (subId, payload) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/${subId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) forceMembersRefresh();
    } catch (e) { console.error("Failed to update subscription", e); }
  };

  const togglePaymentStatus = (subId, currentStatus) => {
    if (currentStatus === 'paid') return; // Do nothing if it's already paid!
    updateSubscription(subId, { status: 'paid' });
  };

  const handleSetFee = (subId, currentFee) => {
    const fee = window.prompt("Enter the custom monthly fee (₹) for this student:", currentFee || 0);
    if (fee !== null && !isNaN(fee)) updateSubscription(subId, { monthlyFee: Number(fee) });
  };

  const handleExtendDays = (subId) => {
    const days = window.prompt("How many days should be added to extend this membership?");
    if (days !== null && !isNaN(days)) updateSubscription(subId, { extendDays: Number(days) });
  };

  const handleEditSkips = (subId, currentSkips) => {
    const skips = window.prompt("Set the MAXIMUM number of skips allowed for this student:", currentSkips || 5);
    if (skips !== null && !isNaN(skips)) updateSubscription(subId, { allowedSkips: Number(skips) });
  };

  const forceStatsRefresh = async () => {
    const token = localStorage.getItem('token');
    try {
      const statsRes = await fetch(`${API_URL}/api/attendance/stats/${encodeURIComponent(user.messName || 'Partner Mess')}/${menuDate}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (statsRes.ok) setStats(await statsRes.json());
      const histRes = await fetch(`${API_URL}/api/attendance/history/${encodeURIComponent(user.messName || 'Partner Mess')}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (histRes.ok) setHistoryData(await histRes.json());
      forceMembersRefresh();
    } catch (e) { console.error(e); }
  }

  const handlePublishMenu = async (e) => {
    e.preventDefault();
    setIsPublishing(true);
    const token = localStorage.getItem('token');

    try {
      const itemsArray = menuItems.split(',').map(item => item.trim()).filter(Boolean);
      const response = await fetch(`${API_URL}/api/menus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          messName: user.messName || `${user.name || 'Owner'}'s Mess`,
          date: menuDate,
          shift: menuShift,
          items: itemsArray,
          price: Number(price)
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server rejected the menu`);
      }

      const data = await response.json();
      alert(data.message || `Menu saved successfully for ${displayDate.split(',')[0]} (${menuShift})!`);
      setIsMenuExisting(true); // Automatically switch to Edit Mode now
    } catch (error) {
      alert(`Failed to save menu: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 dark:bg-slate-800 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs font-bold">
          <p className="mb-2 text-slate-400 border-b border-slate-700 pb-1">{label}</p>
          <p className="text-emerald-400">{t.coming}: {payload[0].value}</p>
          <p className="text-rose-400">{t.skip}: {payload[1].value}</p>
        </div>
      );
    }
    return null;
  };

  const currentStats = stats[analyticsShift] || { coming: 0, notComing: 0, consumed: 0 };

  return (
    <div className="min-h-screen font-sans bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pb-12 selection:bg-orange-500 selection:text-white">

      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-rose-500 p-2 rounded-lg text-white shadow-md">
              <ChefHat size={20} />
            </div>
            <h1 className="font-black text-slate-900 dark:text-white text-lg tracking-tight hidden sm:block">{user.messName || 'Partner Mess'} <span className="text-orange-500">{t.partner}</span></h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => { setVerifyModalOpen(true); setVerifyResult(null); }}
              className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-2 rounded-xl transition-all border border-emerald-200 dark:border-emerald-500/20"
            >
              <QrCode size={16} /> <span className="hidden md:inline">Verify Meal Pass</span>
            </button>
            <button
              onClick={handleOpenNotifications}
              className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-orange-500 transition-colors"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </span>
              )}
            </button>
            <LanguageToggle lang={lang} setLang={setLang} />
            <ThemeToggle />
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-4 py-2 rounded-xl transition-all">
              <LogOut size={16} /> <span className="hidden sm:inline">{t.logout}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">{t.dashboardOverview} <span className="relative flex h-2 w-2 mb-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span></span></h2>
            <div className="flex flex-wrap items-center gap-2 mt-3 bg-white dark:bg-slate-800 p-1 w-fit rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <button onClick={() => setMenuDate(getLocalDateString(0))} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${menuDate === getLocalDateString(0) ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>{t.todaysData}</button>
              <button onClick={() => setMenuDate(getLocalDateString(1))} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${menuDate === getLocalDateString(1) ? 'bg-orange-500 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>{t.tomorrowsPreBookings}</button>
            </div>

            <div className="flex items-center gap-2 mt-3 bg-slate-100 dark:bg-slate-900 p-1 w-fit rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <button onClick={() => setAnalyticsShift('morning')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${analyticsShift === 'morning' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>☀️ Morning Shift</button>
              <button onClick={() => setAnalyticsShift('night')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${analyticsShift === 'night' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>🌙 Night Shift</button>
            </div>

          </div>
          <button onClick={() => forceStatsRefresh()} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm text-sm flex items-center gap-2"><LineChart size={16} /> {t.refreshMetrics}</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-[2rem] p-6 shadow-xl shadow-emerald-500/20 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-20 transition-transform group-hover:scale-110"><CheckCircle2 size={80} /></div>
            <p className="text-sm font-bold text-emerald-50 mb-1">{t.confirmedComing} ({analyticsShift})</p>
            <h3 className="text-4xl font-black">{currentStats.coming}</h3>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-900 bg-emerald-400/40 px-2.5 py-1 rounded-md backdrop-blur-sm">{t.prepareExactly} {currentStats.coming} {t.thali}</div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-6 shadow-xl shadow-indigo-500/20 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-20 transition-transform group-hover:scale-110"><QrCode size={80} /></div>
            <p className="text-sm font-bold text-indigo-100 mb-1">Served / Consumed ({analyticsShift})</p>
            <h3 className="text-4xl font-black">{currentStats.consumed || 0}</h3>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-900 bg-indigo-200/50 px-2.5 py-1 rounded-md backdrop-blur-sm">
              {currentStats.coming > 0 ? `${Math.round(((currentStats.consumed || 0) / currentStats.coming) * 100)}% Claimed` : 'Verified at Counter'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700 relative overflow-hidden transition-colors">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{t.skippedAttendance} ({analyticsShift})</p>
            <h3 className="text-4xl font-black text-rose-500">{currentStats.notComing}</h3>
            <div className="mt-4 inline-flex text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md">{t.savedRawMaterials}</div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] p-6 border border-amber-200 dark:border-amber-700/50 relative">
            <div className="flex items-center gap-2 mb-3 text-amber-900 dark:text-amber-500 font-black"><Calculator size={20} /> {t.quickWasteOptimizer}</div>
            <label className="text-xs font-bold text-amber-700 dark:text-amber-600 block mb-1">{t.howManyPrepared}</label>
            <input
              type="number"
              min="0"
              value={estThalis}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || Number(val) >= 0) {
                  setEstThalis(val);
                }
              }}
              placeholder={`e.g. ${currentStats.coming + 15}`}
              className="w-full bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/50 p-2 rounded-xl text-sm font-bold focus:outline-none mb-3 dark:text-white"
            />
            {estThalis !== '' && Number(estThalis) >= 0 && Number(estThalis) > currentStats.coming ? (
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 p-2 rounded-lg border border-rose-100 dark:border-rose-900/50">
                ⚠️ {t.overproducedBy} {Number(estThalis) - currentStats.coming} {t.thali}.
              </div>
            ) : estThalis !== '' && Number(estThalis) >= 0 && Number(estThalis) < currentStats.coming ? (
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 p-2 rounded-lg">
                🚨 {t.shortfallOf} {currentStats.coming - Number(estThalis)} {t.cookMore}
              </div>
            ) : null}
          </div>
        </div>

        {/* TASK 1: SMART KITCHEN RATION & FOOD WASTE ESTIMATOR */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Scale size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Smart Kitchen Ration Estimator ⚖️</h3>
                <p className="text-xs text-slate-400 font-bold">
                  Translates your live {analyticsShift} headcount ({currentStats.coming} students) into exact raw cooking ingredients
                </p>
              </div>
            </div>
            <button
              onClick={() => { setRationModalOpen(true); setRationMsg(''); }}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-4 py-2.5 rounded-xl transition-all w-fit active:scale-95"
            >
              <Settings2 size={15} /> Customize Per-Plate Norms
            </button>
          </div>

          {/* 4 Ingredient Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
              <span className="text-2xl">🍚</span>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">Rice Required</p>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {currentStats.estimates?.requiredKg?.rice !== undefined ? currentStats.estimates.requiredKg.rice : ((currentStats.coming * (customRationConfig.riceGrams || 120)) / 1000).toFixed(2)} <span className="text-sm font-bold text-slate-400">kg</span>
              </h4>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-md mt-2 inline-block">
                {customRationConfig.riceGrams || 120}g / student
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-800/40">
              <span className="text-2xl">🌾</span>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">Flour / Atta</p>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {currentStats.estimates?.requiredKg?.flour !== undefined ? currentStats.estimates.requiredKg.flour : ((currentStats.coming * (customRationConfig.flourGrams || 110)) / 1000).toFixed(2)} <span className="text-sm font-bold text-slate-400">kg</span>
              </h4>
              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 rounded-md mt-2 inline-block">
                {customRationConfig.flourGrams || 110}g / student
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-yellow-50/60 dark:bg-yellow-950/20 border border-yellow-200/60 dark:border-yellow-800/40">
              <span className="text-2xl">🥣</span>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">Dal & Lentils</p>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {currentStats.estimates?.requiredKg?.dal !== undefined ? currentStats.estimates.requiredKg.dal : ((currentStats.coming * (customRationConfig.dalGrams || 45)) / 1000).toFixed(2)} <span className="text-sm font-bold text-slate-400">kg</span>
              </h4>
              <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/40 px-2 py-0.5 rounded-md mt-2 inline-block">
                {customRationConfig.dalGrams || 45}g / student
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
              <span className="text-2xl">🥕</span>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">Fresh Veggies</p>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {currentStats.estimates?.requiredKg?.veggies !== undefined ? currentStats.estimates.requiredKg.veggies : ((currentStats.coming * (customRationConfig.veggieGrams || 150)) / 1000).toFixed(2)} <span className="text-sm font-bold text-slate-400">kg</span>
              </h4>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md mt-2 inline-block">
                {customRationConfig.veggieGrams || 150}g / student
              </span>
            </div>
          </div>

          {/* Food Waste Prevented Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-md">
                <Leaf size={20} />
              </div>
              <div>
                <h4 className="font-black text-emerald-900 dark:text-emerald-300 text-sm">🌱 Food Waste Prevented</h4>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Thanks to <strong>{currentStats.notComing}</strong> students skipping in advance for this {analyticsShift} shift, you saved raw ingredients!
                </p>
              </div>
            </div>
            <div className="text-right sm:border-l sm:border-emerald-200 dark:sm:border-emerald-800 sm:pl-6 shrink-0">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {currentStats.estimates?.foodSavedKg !== undefined ? currentStats.estimates.foodSavedKg : '0.00'} kg
              </span>
              <span className="block text-[10px] font-bold uppercase text-emerald-600/80 dark:text-emerald-400/80">Saved from bin</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white mb-8"><TrendingUp className="text-orange-500" /> {t.historicalTrends} (Combined)</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="date" tickFormatter={(tick) => tick.substring(5)} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                  <Bar dataKey="coming" name="Coming" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24}>
                    {historyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === historyData.length - 1 ? '#10b981' : '#34d399'} />
                    ))}
                  </Bar>
                  <Bar dataKey="notComing" name="Skipped" radius={[6, 6, 0, 0]} barSize={24}>
                    {historyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === historyData.length - 1 ? '#f43f5e' : '#fb7185'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors flex flex-col h-full">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white"><PlusCircle className="text-orange-500" /> {t.menuSetup}: {displayDate.split(',')[0]}</h2>

            <form onSubmit={handlePublishMenu} className="space-y-4 flex-grow flex flex-col justify-between">
              <div className="space-y-4">

                <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                  <button type="button" onClick={() => setMenuShift('morning')} className={`flex-1 py-2 text-xs rounded-lg font-bold transition-all ${menuShift === 'morning' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>☀️ Morning</button>
                  <button type="button" onClick={() => setMenuShift('night')} className={`flex-1 py-2 text-xs rounded-lg font-bold transition-all ${menuShift === 'night' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>🌙 Night</button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.menuItems}</label>
                  <textarea required rows="4" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-4 focus:ring-orange-500/10 outline-none resize-none" placeholder={t.menuPlaceholder} value={menuItems} onChange={(e) => setMenuItems(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.thaliPrice}</label>
                  <input type="number" required min="0" className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-4 font-bold outline-none" placeholder="60" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
              </div>
              <button disabled={isPublishing} type="submit" className="mt-6 w-full bg-slate-900 hover:bg-slate-800 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95 flex justify-center gap-2">
                {isPublishing ? <Loader2 className="animate-spin" size={20} /> : `${isMenuExisting ? 'Update' : 'Publish'} ${menuShift} Menu`}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Users className="text-indigo-500" /> Monthly Members Directory
            </h2>
            <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-lg text-sm font-bold border border-indigo-100 dark:border-indigo-500/20">
              Total Members: {members.length}
            </div>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
              <Users className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={32} />
              <p className="text-slate-500 dark:text-slate-400 font-bold">No active monthly members yet.</p>
              <p className="text-xs text-slate-400 mt-1">Students can subscribe to your mess from their dashboard.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700/50">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 text-[11px] tracking-wider uppercase text-slate-500 dark:text-slate-400">
                    <th className="py-4 px-5 font-black">Student Info</th>
                    <th className="py-4 px-5 font-black">Shift</th>
                    <th className="py-4 px-5 font-black">Membership Dates</th>
                    <th className="py-4 px-5 font-black">Skips (Used/Max)</th>
                    <th className="py-4 px-5 font-black">Monthly Fee</th>
                    <th className="py-4 px-5 font-black text-right">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {members.map(member => (
                    <tr key={member._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-5">
                        <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">{member.studentName}</p>
                        <p className="text-xs font-bold text-slate-400 mt-0.5 flex items-center gap-1"><Phone size={10} /> {member.studentPhone || 'N/A'}</p>
                        {member.status === 'verification_pending' && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50 flex items-center gap-1 w-fit mt-1">
                            <Clock size={10} /> Verification Pending
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${member.status === 'expired' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50' : member.shift === 'both' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                            {member.status === 'expired' ? 'Expired' : (member.shift || 'both')}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-xs">
                        <div className="text-slate-500 dark:text-slate-400 font-medium mb-1">
                          Start: <span className="font-bold">{new Date(member.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            End: <span className="font-bold text-slate-700 dark:text-slate-200">{member.endDate ? new Date(member.endDate).toLocaleDateString() : 'N/A'}</span>
                          </span>
                          <button onClick={() => handleExtendDays(member._id)} className="text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 p-1 rounded transition-colors" title="Extend Membership for Absences">
                            <CalendarPlus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                          <span>{member.usedSkips || 0} / {member.allowedSkips || 5}</span>
                          <button onClick={() => handleEditSkips(member._id, member.allowedSkips)} className="text-slate-400 hover:text-indigo-500 transition-colors" title="Edit Maximum Allowed Skips">
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2 text-sm font-bold text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 w-fit rounded-lg border border-orange-100 dark:border-orange-500/20">
                          <IndianRupee size={14} />{member.monthlyFee || 0}
                          {member.status !== 'paid' && member.status !== 'expired' && (
                            <button onClick={() => handleSetFee(member._id, member.monthlyFee)} className="text-slate-400 hover:text-orange-500 ml-1 transition-colors">
                              <Edit3 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        {member.status === 'verification_pending' ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-700/40">
                              UTR: {member.lastUtrNumber || 'N/A'}
                            </span>
                            <button
                              onClick={() => updateSubscription(member._id, { status: 'paid' })}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 active:scale-95"
                            >
                              <CheckCircle2 size={13} /> Approve Payment ✓
                            </button>
                          </div>
                        ) : member.status === 'expired' ? (
                          <button
                            onClick={() => updateSubscription(member._id, { renew: true, status: 'paid' })}
                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            Renew (30d)
                          </button>
                        ) : (
                          <button
                            onClick={() => togglePaymentStatus(member._id, member.status)}
                            disabled={member.status === 'paid'}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 ${member.status === 'paid'
                                ? 'bg-emerald-500 text-white shadow-emerald-500/20 cursor-not-allowed opacity-80'
                                : 'bg-rose-100 text-rose-600 border border-rose-200 hover:bg-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30 dark:hover:bg-rose-500/20'
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

        {/* CUT-OFF TIMERS SECTION */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors mb-8">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-slate-900 dark:text-white">
            <Clock className="text-orange-500" /> Attendance Cut-Off Timers (IST)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Lock attendance automatically so chefs get accurate headcounts before cooking begins.
          </p>

          <form onSubmit={handleSaveCutoff} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">☀️ Morning Shift Cut-Off</label>
              <input
                type="time"
                value={morningCutoff}
                onChange={(e) => setMorningCutoff(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">🌙 Night Shift Cut-Off</label>
              <input
                type="time"
                value={nightCutoff}
                onChange={(e) => setNightCutoff(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isSavingCutoff}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isSavingCutoff ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                Save Cut-Off Times
              </button>
            </div>
          </form>
          {cutoffMsg && <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">{cutoffMsg}</p>}
        </div>

        {/* UPI CONFIGURATION SECTION */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors mb-8">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="text-emerald-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">UPI Payment Configuration (Instant Student Fee Collection)</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Configure your mess UPI ID (VPA) so students can make direct 1-tap monthly subscription payments to your bank account via PhonePe, GPay, Paytm, etc.
          </p>

          <form onSubmit={handleSaveUpi} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Your UPI ID (VPA)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. messowner@okaxis or 9876543210@paytm"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isSavingUpi}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                {isSavingUpi ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                Save UPI ID
              </button>
            </div>
          </form>
          {upiMsg && <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">{upiMsg}</p>}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white"><MapPin className="text-indigo-500" /> {t.setMessLocation}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t.locationDesc}</p>

          {savedLocation && (
            <div className="mb-4 inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold text-sm rounded-lg border border-indigo-100 dark:border-indigo-500/20">
              <CheckCircle2 size={16} /> {t.locationSavedAt} {savedLocation.lat.toFixed(5)}, {savedLocation.lng.toFixed(5)}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={async () => {
                setIsSettingLocation(true); setLocationMsg('');
                if (!('geolocation' in navigator)) { setLocationMsg('❌ Geolocation not supported.'); setIsSettingLocation(false); return; }
                navigator.geolocation.getCurrentPosition(
                  async (pos) => {
                    const token = localStorage.getItem('token');
                    try {
                      const res = await fetch(`${API_URL}/api/owner/location`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
                      });
                      if (res.ok) {
                        setLocationMsg(`✅ Location saved! (${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)})`);
                        setSavedLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      } else {
                        setLocationMsg('❌ Failed to save location.');
                      }
                    } catch { setLocationMsg('❌ Connection failed.'); }
                    setIsSettingLocation(false);
                  },
                  () => { setLocationMsg('❌ Location access denied. Please enable GPS.'); setIsSettingLocation(false); },
                  { enableHighAccuracy: true, timeout: 15000 }
                );
              }}
              disabled={isSettingLocation}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-colors shadow-md disabled:opacity-50"
            >
              {isSettingLocation ? <Loader2 className="animate-spin" size={18} /> : <Navigation size={18} />}
              {isSettingLocation ? t.detecting : savedLocation ? `📍 ${t.updateCurrentLocation}` : `📍 ${t.useCurrentLocation}`}
            </button>
          </div>
          {locationMsg && <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">{locationMsg}</p>}
        </div>
      </main>

      {/* MEAL PASS VERIFICATION MODAL */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => { setVerifyModalOpen(false); setVerifyResult(null); }}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <QrCode size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Verify Student Meal Pass</h3>
                <p className="text-xs text-slate-400 font-bold">Counter Verification Scanner</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 mb-6">
              Paste or type the student's 15-minute signed Meal Pass Token to verify their attendance and mark meal as served.
            </p>

            <form onSubmit={handleVerifyQr} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">QR Token Payload</label>
                <textarea
                  rows={3}
                  value={qrTokenInput}
                  onChange={(e) => setQrTokenInput(e.target.value)}
                  placeholder="Paste student QR pass token here..."
                  required
                  className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {verifyResult && (
                <div
                  className={`p-4 rounded-xl border text-sm font-bold flex items-start gap-2.5 ${
                    verifyResult.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {verifyResult.type === 'success' ? (
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle size={18} className="shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  )}
                  <div>
                    <p>{verifyResult.message}</p>
                    {verifyResult.studentName && (
                      <p className="text-xs font-normal mt-0.5 opacity-90">Student: <strong>{verifyResult.studentName}</strong></p>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifyingQr || !qrTokenInput.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                {isVerifyingQr ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                Verify & Claim Meal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS DRAWER */}
      {notifDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setNotifDrawerOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-2xl">
                <Bell size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Mess Notifications</h3>
                <p className="text-xs text-slate-400 font-bold">Activity Feed & Alerts</p>
              </div>
            </div>

            <div className="overflow-y-auto space-y-3 flex-grow pr-1">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Bell className="mx-auto mb-2 opacity-30" size={32} />
                  <p className="font-bold text-sm">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    className={`p-4 rounded-2xl border transition-all ${
                      n.isRead
                        ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        : 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/50 text-slate-900 dark:text-white'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className="font-black text-sm">{n.title}</h4>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{n.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* RATION CONFIG MODAL */}
      {rationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setRationModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Scale size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Per-Plate Ration Norms</h3>
                <p className="text-xs text-slate-400 font-bold">Configure Kitchen Baselines (in grams)</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 mb-6">
              Adjust how many grams of raw ingredients your kitchen allocates per student for lunch or dinner thalis.
            </p>

            <form onSubmit={handleSaveRationConfig} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">🍚 Rice (g)</label>
                  <input
                    type="number"
                    min="1"
                    value={customRationConfig.riceGrams}
                    onChange={(e) => setCustomRationConfig({ ...customRationConfig, riceGrams: Number(e.target.value) })}
                    required
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">🌾 Atta / Flour (g)</label>
                  <input
                    type="number"
                    min="1"
                    value={customRationConfig.flourGrams}
                    onChange={(e) => setCustomRationConfig({ ...customRationConfig, flourGrams: Number(e.target.value) })}
                    required
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">🥣 Dal (g)</label>
                  <input
                    type="number"
                    min="1"
                    value={customRationConfig.dalGrams}
                    onChange={(e) => setCustomRationConfig({ ...customRationConfig, dalGrams: Number(e.target.value) })}
                    required
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">🥕 Veggies (g)</label>
                  <input
                    type="number"
                    min="1"
                    value={customRationConfig.veggieGrams}
                    onChange={(e) => setCustomRationConfig({ ...customRationConfig, veggieGrams: Number(e.target.value) })}
                    required
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {rationMsg && (
                <p className="text-xs font-bold p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {rationMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isSavingRation}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 mt-4"
              >
                {isSavingRation ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                Save Norms
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;