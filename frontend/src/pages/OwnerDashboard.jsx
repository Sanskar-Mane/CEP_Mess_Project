import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChefHat, Users, CheckCircle2, XCircle, LogOut, Loader2, PlusCircle, TrendingUp, CalendarDays, LineChart, Calculator } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import ThemeToggle from '../components/ThemeToggle';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

const OwnerDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;

  if (!user || user.role !== 'owner') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900"><button onClick={() => navigate('/')} className="text-orange-600 font-bold underline">Go to Login</button></div>
    );
  }

  // Publish Form State
  const [menuDate, setMenuDate] = useState(getLocalDateString(0));
  const [menuItems, setMenuItems] = useState('');
  const [price, setPrice] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Analytics State
  const [stats, setStats] = useState({ coming: 0, notComing: 0, total: 0 });
  const [historyData, setHistoryData] = useState([]);
  
  // Calculator State
  const [estThalis, setEstThalis] = useState('');

  const displayDate = new Date(menuDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // REAL TIME POLLING LOGIC
  useEffect(() => {
    fetchStats(); 
    fetchHistory();
    
    // Background silent fetch every 10 seconds for LIVE attendance
    const intervalId = setInterval(() => {
      fetchStats();
      fetchHistory();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [menuDate]);

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/attendance/stats/${encodeURIComponent(user.messName)}/${menuDate}`, { headers: { 'Authorization': `Bearer ${token}` }});
      if (response.ok) setStats(await response.json());
    } catch (e) { console.error(e); }
  };

  const fetchHistory = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/attendance/history/${encodeURIComponent(user.messName)}`, { headers: { 'Authorization': `Bearer ${token}` }});
      if (response.ok) setHistoryData(await response.json());
    } catch (e) { console.error(e); }
  };

  const handlePublishMenu = async (e) => {
    e.preventDefault();
    setIsPublishing(true);
    const token = localStorage.getItem('token');
    try {
      const itemsArray = menuItems.split(',').map(item => item.trim()).filter(Boolean);
      await fetch(`${API_URL}/api/menus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ownerId: user._id, messName: user.messName, date: menuDate, items: itemsArray, price: Number(price) })
      });
      alert(`Menu published for ${displayDate}!`);
    } catch (error) { alert('Failed to publish menu.'); } 
    finally { setIsPublishing(false); }
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
          <p className="text-emerald-400">Coming: {payload[0].value}</p>
          <p className="text-rose-400">Skipped: {payload[1].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen font-sans bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pb-12 selection:bg-orange-500 selection:text-white">
      
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-rose-500 p-2 rounded-lg text-white shadow-md">
              <ChefHat size={20} />
            </div>
            <h1 className="font-black text-slate-900 dark:text-white text-lg tracking-tight hidden sm:block">{user.messName} <span className="text-orange-500">Partner</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-4 py-2 rounded-xl transition-all">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">Dashboard Overview <span className="relative flex h-2 w-2 mb-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span></span></h2>
            <div className="flex items-center gap-2 mt-3 bg-white dark:bg-slate-800 p-1 w-fit rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
               <button onClick={() => setMenuDate(getLocalDateString(0))} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${menuDate === getLocalDateString(0) ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Today's Data</button>
               <button onClick={() => setMenuDate(getLocalDateString(1))} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${menuDate === getLocalDateString(1) ? 'bg-orange-500 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Tomorrow's Pre-Bookings</button>
            </div>
          </div>
          <button onClick={() => { fetchStats(); fetchHistory(); }} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm text-sm flex items-center gap-2"><LineChart size={16} /> Refresh Metrics</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-[2rem] p-6 shadow-xl shadow-emerald-500/20 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-20 transition-transform group-hover:scale-110"><CheckCircle2 size={80} /></div>
            <p className="text-sm font-bold text-emerald-50 mb-1">Confirmed Coming</p>
            <h3 className="text-4xl font-black">{stats.coming}</h3>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-900 bg-emerald-400/40 px-2.5 py-1 rounded-md backdrop-blur-sm">Prepare exactly {stats.coming} thalis</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-700 relative overflow-hidden transition-colors">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Skipped Attendance</p>
            <h3 className="text-4xl font-black text-rose-500">{stats.notComing}</h3>
            <div className="mt-4 inline-flex text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md">Saved raw materials</div>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] p-6 border border-amber-200 dark:border-amber-700/50 relative">
             <div className="flex items-center gap-2 mb-3 text-amber-900 dark:text-amber-500 font-black"><Calculator size={20}/> Quick Waste Optimizer</div>
             <label className="text-xs font-bold text-amber-700 dark:text-amber-600 block mb-1">How many thalis did you prepare?</label>
             <input type="number" value={estThalis} onChange={e=>setEstThalis(e.target.value)} placeholder={`e.g. ${stats.coming + 15}`} className="w-full bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700/50 p-2 rounded-xl text-sm font-bold focus:outline-none mb-3 dark:text-white"/>
             {estThalis && Number(estThalis) > stats.coming ? (
                <div className="text-sm font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 p-2 rounded-lg border border-rose-100 dark:border-rose-900/50">
                  ⚠️ Overproduced by {Number(estThalis) - stats.coming} thalis.
                </div>
             ) : estThalis && Number(estThalis) < stats.coming ? (
                <div className="text-sm font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 p-2 rounded-lg">
                  🚨 Shortfall of {stats.coming - Number(estThalis)} thalis! Cook more.
                </div>
             ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white mb-8"><TrendingUp className="text-orange-500"/> Historical Headcount Trends</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="date" tickFormatter={(tick) => tick.substring(5)} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(148, 163, 184, 0.1)'}} />
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
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white"><PlusCircle className="text-orange-500"/> Menu Setup: {displayDate.split(',')[0]}</h2>
            <form onSubmit={handlePublishMenu} className="space-y-4 flex-grow flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Menu Items</label>
                  <textarea required rows="5" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-4 focus:ring-orange-500/10 outline-none resize-none" placeholder="Dal, Rice, Paneer (Comma separated)" value={menuItems} onChange={(e) => setMenuItems(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Thali Price (₹)</label>
                  <input type="number" required className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-4 font-bold outline-none" placeholder="60" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
              </div>
              <button disabled={isPublishing} type="submit" className="mt-6 w-full bg-slate-900 hover:bg-slate-800 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95 flex justify-center gap-2">
                {isPublishing ? <Loader2 className="animate-spin" size={20} /> : `Publish for ${displayDate.split(',')[0]}`}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OwnerDashboard;