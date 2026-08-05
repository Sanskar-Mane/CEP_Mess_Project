import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChefHat, MapPin, CheckCircle2, XCircle, Clock, Info, Settings, Star, Plus, Users, LogOut, Send, IndianRupee } from 'lucide-react';

const OwnerDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;

  if (!user || user.role !== 'owner') {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 font-sans">
        <p>Unauthorized access.</p>
        <button onClick={() => navigate('/')} className="text-indigo-600 underline font-bold">Go to Login</button>
      </div>
    );
  }

  const [menuItems, setMenuItems] = useState(['Chapati', 'Rice', 'Dal Tadka', 'Paneer Masala']);
  const [newItem, setNewItem] = useState('');
  const [price, setPrice] = useState('65');
  const [isPublishing, setIsPublishing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [stats, setStats] = useState({ coming: 0, notComing: 0, total: 0 });

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000); // Check attendance every 15s
    return () => clearInterval(interval);
  }, [user.messName]);

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`http://127.0.0.1:3000/api/attendance/stats/${encodeURIComponent(user.messName)}/${today}`);
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    setIsPublishing(true);
    setSuccessMsg('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('http://127.0.0.1:3000/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: user._id, messName: user.messName, date: today, items: menuItems, price: Number(price) })
      });

      if (res.ok) {
        setSuccessMsg("Menu published live to all student dashboards!");
        setTimeout(() => setSuccessMsg(""), 5000);
      }
    } catch (err) {
      alert("Failed to publish menu.");
    } finally {
      setIsPublishing(false);
    }
  };

  const comingPercent = stats.total > 0 ? Math.round((stats.coming / stats.total) * 100) : 0;
  const notComingPercent = stats.total > 0 ? Math.round((stats.notComing / stats.total) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 mt-8 pb-12 animate-in fade-in duration-700 font-sans relative z-10">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{user.messName}</h2>
          <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
            <MapPin size={16} className="text-indigo-400"/> {user.messAddress}
          </p>
        </div>
        <button onClick={() => navigate('/')} className="px-4 py-3 bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)] font-bold text-sm flex items-center gap-2">
          <LogOut size={18} /> Logout
        </button>
      </div>

      {!user.isVerified && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-5 mb-8 rounded-2xl shadow-sm font-semibold text-sm flex items-center gap-3 animate-in fade-in">
          ⚠️ Students cannot see your menu yet. Waiting for Admin to approve FSSAI license ({user.fssaiNumber || 'N/A'}).
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Coming</p>
          <h3 className="text-4xl font-black text-slate-800 relative z-10">{stats.coming}</h3>
        </div>
        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Not Coming</p>
          <h3 className="text-4xl font-black text-slate-800 relative z-10">{stats.notComing}</h3>
        </div>
        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Total Votes</p>
          <h3 className="text-4xl font-black text-slate-800 relative z-10">{stats.total}</h3>
        </div>
        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-center items-center gap-2 hover:-translate-y-1 transition-transform">
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider text-center">Mess Status</p>
          <button onClick={() => setIsOpen(!isOpen)} className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {isOpen ? <><CheckCircle2 size={16}/> Open</> : <><XCircle size={16}/> Closed</>}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-400/5 to-rose-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          <h3 className="text-xl font-extrabold text-slate-800 mb-8 flex items-center gap-3 relative z-10">
            <div className="bg-gradient-to-br from-orange-400 to-rose-500 p-2.5 rounded-2xl text-white shadow-lg shadow-orange-500/30"><ChefHat size={20}/></div>
            Daily Menu Builder
          </h3>
          
          <div className="mb-8 relative z-10">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">Current Menu Items</label>
            <div className="flex flex-wrap gap-2 p-5 bg-slate-50/50 rounded-3xl border border-slate-200/60 min-h-[120px] content-start shadow-inner">
              {menuItems.map((item, idx) => (
                <div key={idx} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-sm animate-in zoom-in group">
                  {item}
                  <button onClick={() => setMenuItems(menuItems.filter(i => i !== item))} className="text-slate-300 hover:text-rose-500 transition-colors ml-1 focus:outline-none"><XCircle size={16} className="group-hover:scale-110 transition-transform" /></button>
                </div>
              ))}
              {menuItems.length === 0 && <span className="text-slate-400 text-sm font-bold m-auto flex items-center gap-2"><Info size={16}/> No items added.</span>}
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if (newItem.trim()) { setMenuItems([...menuItems, newItem.trim()]); setNewItem(''); } }} className="mb-10 flex gap-3 relative z-10">
            <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Type a dish (e.g. Aloo Gobi)..." className="flex-1 px-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800 shadow-sm" />
            <button type="submit" disabled={!newItem.trim()} className="bg-slate-900 text-white px-6 rounded-2xl font-bold hover:bg-slate-800 shadow-lg hover:shadow-slate-900/20 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"><Plus size={20} /> Add</button>
          </form>

          <div className="flex flex-col sm:flex-row gap-4 items-end relative z-10 border-t border-slate-100 pt-8">
            <div className="w-full sm:w-1/2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Thali Price (₹)</label>
              <div className="relative">
                <IndianRupee size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm" />
              </div>
            </div>
            <button onClick={handlePublish} disabled={isPublishing || !user.isVerified || menuItems.length === 0} className="w-full sm:w-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-4 rounded-2xl hover:shadow-xl hover:shadow-indigo-500/30 transition-all active:scale-[0.98] text-lg flex justify-center items-center gap-2 disabled:opacity-50">
              <Send size={22} /> {isPublishing ? 'Publishing...' : 'Publish Menu'}
            </button>
          </div>

          {successMsg && (
            <div className="mt-6 p-4 bg-emerald-50 text-emerald-700 font-bold rounded-2xl flex items-center border border-emerald-100 animate-in slide-in-from-bottom-4 shadow-sm">
              <CheckCircle2 size={20} className="mr-3 text-emerald-500" /> {successMsg}
            </div>
          )}
        </div>

        <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-indigo-400/30 transition-colors duration-700"></div>
          
          <h3 className="text-xl font-extrabold mb-8 flex items-center gap-3 text-white relative z-10">
            <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg"><Users size={20} className="text-indigo-300" /></div>
            Attendance Pulse
          </h3>

          <div className="space-y-8 relative z-10 flex-1">
            <div>
              <div className="flex justify-between items-end mb-3">
                <span className="text-emerald-400 flex items-center gap-2 font-bold"><CheckCircle2 size={18}/> Coming</span>
                <span className="text-slate-300 font-black text-xl">{comingPercent}%</span>
              </div>
              <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden shadow-inner p-0.5">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-lg transition-all duration-1000" style={{ width: `${comingPercent}%` }}></div>
              </div>
              <p className="text-slate-400 text-xs font-bold mt-2 text-right">{stats.coming} Students</p>
            </div>

            <div>
              <div className="flex justify-between items-end mb-3">
                <span className="text-rose-400 flex items-center gap-2 font-bold"><XCircle size={18}/> Not Coming</span>
                <span className="text-slate-300 font-black text-xl">{notComingPercent}%</span>
              </div>
              <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden shadow-inner p-0.5">
                <div className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full shadow-lg transition-all duration-1000" style={{ width: `${notComingPercent}%` }}></div>
              </div>
              <p className="text-slate-400 text-xs font-bold mt-2 text-right">{stats.notComing} Students</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OwnerDashboard;