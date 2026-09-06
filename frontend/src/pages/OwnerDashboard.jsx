import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChefHat, Users, CheckCircle2, XCircle, LogOut, Loader2, PlusCircle, TrendingUp, CalendarDays, LineChart, Calculator, MapPin, Navigation, IndianRupee, CalendarPlus, Edit3, Phone } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import ThemeToggle from '../components/ThemeToggle';
import LanguageToggle from '../components/LanguageToggle';
import { translations } from '../utils/translations';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

const OwnerDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // --- NEW AUTHENTICATION LOGIC ---
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

  // Analytics & Members State
  const [analyticsShift, setAnalyticsShift] = useState('morning');
  const [stats, setStats] = useState({
    morning: { coming: 0, notComing: 0 },
    night: { coming: 0, notComing: 0 }
  });
  const [historyData, setHistoryData] = useState([]);
  const [members, setMembers] = useState([]);

  // Calculator State
  const [estThalis, setEstThalis] = useState('');

  // Location State
  const [isSettingLocation, setIsSettingLocation] = useState(false);
  const [locationMsg, setLocationMsg] = useState('');
  const [savedLocation, setSavedLocation] = useState(null);

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
    else setIsAuthLoading(false);
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
          } else {
            setMenuItems('');
            setPrice('');
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
        if (response.ok) setStats(await response.json());
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

    const intervalId = setInterval(() => {
      fetchStats();
      fetchHistory();
      fetchMembers();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [menuDate, user]);

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

  const togglePaymentStatus = (subId, currentStatus) => updateSubscription(subId, { status: currentStatus === 'paid' ? 'pending' : 'paid' });

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
      alert(`Menu published successfully for ${displayDate.split(',')[0]} (${menuShift})!`);
    } catch (error) {
      alert(`Failed to publish menu: ${error.message}`);
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

  const currentStats = stats[analyticsShift] || { coming: 0, notComing: 0 };

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
          <div className="flex items-center gap-3">
            <LanguageToggle lang={lang} setLang={setLang} />
            <ThemeToggle />
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-4 py-2 rounded-xl transition-all">
              <LogOut size={16} /> {t.logout}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-[2rem] p-6 shadow-xl shadow-emerald-500/20 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-20 transition-transform group-hover:scale-110"><CheckCircle2 size={80} /></div>
            <p className="text-sm font-bold text-emerald-50 mb-1">{t.confirmedComing} ({analyticsShift})</p>
            <h3 className="text-4xl font-black">{currentStats.coming}</h3>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-900 bg-emerald-400/40 px-2.5 py-1 rounded-md backdrop-blur-sm">{t.prepareExactly} {currentStats.coming} {t.thali}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700 relative overflow-hidden transition-colors">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{t.skippedAttendance} ({analyticsShift})</p>
            <h3 className="text-4xl font-black text-rose-500">{currentStats.notComing}</h3>
            <div className="mt-4 inline-flex text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md">{t.savedRawMaterials}</div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] p-6 border border-amber-200 dark:border-amber-700/50 relative">
            <div className="flex items-center gap-2 mb-3 text-amber-900 dark:text-amber-500 font-black"><Calculator size={20} /> {t.quickWasteOptimizer}</div>
            <label className="text-xs font-bold text-amber-700 dark:text-amber-600 block mb-1">{t.howManyPrepared}</label>
            <input type="number" value={estThalis} onChange={e => setEstThalis(e.target.value)} placeholder={`e.g. ${currentStats.coming + 15}`} className="w-full bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/50 p-2 rounded-xl text-sm font-bold focus:outline-none mb-3 dark:text-white" />
            {estThalis && Number(estThalis) > currentStats.coming ? (
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 p-2 rounded-lg border border-rose-100 dark:border-rose-900/50">
                ⚠️ {t.overproducedBy} {Number(estThalis) - currentStats.coming} {t.thali}.
              </div>
            ) : estThalis && Number(estThalis) < currentStats.coming ? (
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 p-2 rounded-lg">
                🚨 {t.shortfallOf} {currentStats.coming - Number(estThalis)} {t.cookMore}
              </div>
            ) : null}
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
                  <input type="number" required className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-4 font-bold outline-none" placeholder="60" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
              </div>
              <button disabled={isPublishing} type="submit" className="mt-6 w-full bg-slate-900 hover:bg-slate-800 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95 flex justify-center gap-2">
                {isPublishing ? <Loader2 className="animate-spin" size={20} /> : `Publish ${menuShift} Menu`}
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
                      </td>
                      <td className="py-4 px-5">
                        <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${member.shift === 'both' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {member.shift || 'both'}
                        </span>
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
                          <button onClick={() => handleSetFee(member._id, member.monthlyFee)} className="text-slate-400 hover:text-orange-500 ml-1 transition-colors">
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => togglePaymentStatus(member._id, member.status)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 ${member.status === 'paid'
                            ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                            : 'bg-rose-100 text-rose-600 border border-rose-200 hover:bg-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30 dark:hover:bg-rose-500/20'
                            }`}
                        >
                          {member.status === 'paid' ? 'Paid ✓' : 'Mark as Paid'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
    </div>
  );
};

export default OwnerDashboard;