import React, { useState } from 'react';
import { Utensils, MapPin, CheckCircle2, XCircle, Clock, Info, Settings, TrendingUp, Star, Plus, Users } from 'lucide-react';

const OwnerDashboard = () => {
  const [menuItems, setMenuItems] = useState(["Dal Tadka", "Paneer Butter Masala", "Chapati", "Jeera Rice"]);
  const [newItem, setNewItem] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (newItem.trim() && !menuItems.includes(newItem.trim())) {
      setMenuItems([...menuItems, newItem.trim()]);
      setNewItem("");
    }
  };

  const handleRemoveItem = (itemToRemove) => {
    setMenuItems(menuItems.filter(item => item !== itemToRemove));
  };

  const handlePublish = () => {
    setStatusMsg("Menu & Status published! Live on student dashboards.");
    setTimeout(() => setStatusMsg(""), 4000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 mt-8 pb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Shree Swami Samarth</h2>
          <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
            <MapPin size={16} className="text-indigo-400"/> Near GCOEARA Main Gate
          </p>
        </div>
        <div className="flex gap-3">
          <button className="p-3 bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl text-slate-600 hover:bg-white hover:text-indigo-600 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Coming</p>
          <div className="flex items-end gap-3 relative z-10">
            <h3 className="text-4xl font-black text-slate-800">142</h3>
            <span className="text-emerald-500 font-bold text-sm flex items-center mb-1">+12% <TrendingUp size={14} className="ml-1"/></span>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Not Coming</p>
          <h3 className="text-4xl font-black text-slate-800 relative z-10">18</h3>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-transform">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Rating</p>
          <div className="flex items-center gap-2 relative z-10">
            <h3 className="text-4xl font-black text-slate-800">4.8</h3>
            <Star size={24} className="text-amber-400 fill-amber-400" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-center items-center gap-2 hover:-translate-y-1 transition-transform">
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider text-center">Mess Status</p>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${isOpen ? 'bg-emerald-100 text-emerald-700 shadow-inner' : 'bg-rose-100 text-rose-700 shadow-inner'}`}
          >
            {isOpen ? <><CheckCircle2 size={18}/> Open Now</> : <><XCircle size={18}/> Closed</>}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-400/5 to-rose-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          <h3 className="text-xl font-extrabold text-slate-800 mb-8 flex items-center gap-3 relative z-10">
            <div className="bg-gradient-to-br from-orange-400 to-rose-500 p-2.5 rounded-2xl shadow-lg shadow-orange-500/30">
              <Utensils className="text-white" size={20} />
            </div>
            Daily Menu Builder
          </h3>
          
          <div className="mb-8 relative z-10">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">Current Menu Items</label>
            <div className="flex flex-wrap gap-2 p-5 bg-slate-50/50 rounded-3xl border border-slate-200/60 min-h-[120px] content-start shadow-inner">
              {menuItems.map((item, idx) => (
                <div key={idx} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-sm animate-in zoom-in duration-300 group">
                  {item}
                  <button onClick={() => handleRemoveItem(item)} className="text-slate-300 hover:text-rose-500 transition-colors ml-1 focus:outline-none">
                    <XCircle size={16} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              ))}
              {menuItems.length === 0 && <span className="text-slate-400 text-sm font-bold m-auto flex items-center gap-2"><Info size={16}/> No items added. Start typing below!</span>}
            </div>
          </div>

          <form onSubmit={handleAddItem} className="mb-10 flex gap-3 relative z-10">
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800 shadow-sm" 
                placeholder="Type a dish (e.g. Aloo Gobi) and press Enter..." 
              />
            </div>
            <button type="submit" disabled={!newItem.trim()} className="bg-slate-900 text-white px-6 rounded-2xl font-bold hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95">
              <Plus size={20} /> Add
            </button>
          </form>

          <div className="flex flex-col sm:flex-row gap-4 items-end relative z-10 border-t border-slate-100 pt-8">
            <div className="w-full sm:w-1/2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Serving Time</label>
              <div className="relative">
                <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                <input type="text" defaultValue="7:00 PM - 9:30 PM" className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm" />
              </div>
            </div>
            <button 
              onClick={handlePublish}
              className="w-full sm:w-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-4 rounded-2xl hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 active:scale-[0.98] text-lg flex justify-center items-center gap-2"
            >
              <CheckCircle2 size={22} /> Publish Menu
            </button>
          </div>

          {statusMsg && (
            <div className="mt-6 p-4 bg-emerald-50 text-emerald-700 font-bold rounded-2xl flex items-center border border-emerald-100 animate-in slide-in-from-bottom-4 duration-300 shadow-sm">
              <CheckCircle2 size={20} className="mr-3 text-emerald-500" /> {statusMsg}
            </div>
          )}
        </div>

        <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-indigo-400/30 transition-colors duration-700"></div>
          
          <h3 className="text-xl font-extrabold mb-8 flex items-center gap-3 text-white relative z-10">
            <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
              <Users size={20} className="text-indigo-300" />
            </div>
            Attendance Pulse
          </h3>

          <div className="space-y-8 relative z-10 flex-1">
            <div>
              <div className="flex justify-between items-end mb-3">
                <span className="text-emerald-400 flex items-center gap-2 font-bold"><CheckCircle2 size={18}/> Coming</span>
                <span className="text-slate-300 font-black text-xl">88%</span>
              </div>
              <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden shadow-inner p-0.5">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-lg" style={{ width: '88%' }}></div>
              </div>
              <p className="text-slate-400 text-xs font-bold mt-2 text-right">142 Students</p>
            </div>

            <div>
              <div className="flex justify-between items-end mb-3">
                <span className="text-rose-400 flex items-center gap-2 font-bold"><XCircle size={18}/> Not Coming</span>
                <span className="text-slate-300 font-black text-xl">12%</span>
              </div>
              <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden shadow-inner p-0.5">
                <div className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full shadow-lg" style={{ width: '12%' }}></div>
              </div>
              <p className="text-slate-400 text-xs font-bold mt-2 text-right">18 Students</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Star size={14}/> Recent Feedback</p>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/5 hover:bg-white/10 transition-colors cursor-default">
              <div className="flex items-center gap-1.5 mb-3">
                {[1,2,3,4,5].map(i => <Star key={i} size={14} className="text-amber-400 fill-amber-400 drop-shadow-sm" />)}
              </div>
              <p className="text-sm text-slate-200 italic leading-relaxed">"The Paneer Butter Masala was excellent today! Much better consistency than last week."</p>
              <div className="flex justify-between items-center mt-4">
                <p className="text-xs text-indigo-300 font-bold bg-indigo-500/20 px-2 py-1 rounded-md">TE Student</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">2 hrs ago</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;