import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChefHat, Users, CheckCircle2, XCircle, LogOut, Loader2, PlusCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const OwnerDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;

  if (!user || user.role !== 'owner') {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p>Unauthorized access.</p>
        <button onClick={() => navigate('/')} className="text-orange-600 font-bold underline">Go to Login</button>
      </div>
    );
  }

  const [menuItems, setMenuItems] = useState('');
  const [price, setPrice] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [stats, setStats] = useState({ coming: 0, notComing: 0, total: 0 });
  
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/attendance/stats/${encodeURIComponent(user.messName)}/${today}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setStats(await response.json());
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handlePublishMenu = async (e) => {
    e.preventDefault();
    setIsPublishing(true);
    const token = localStorage.getItem('token');
    
    try {
      const itemsArray = menuItems.split(',').map(item => item.trim()).filter(Boolean);
      await fetch(`${API_URL}/api/menus`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ownerId: user._id,
          messName: user.messName,
          date: today,
          items: itemsArray,
          price: Number(price)
        })
      });
      alert('Menu published successfully!');
    } catch (error) {
      alert('Failed to publish menu.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="min-h-screen font-sans bg-slate-50">
      <nav className="bg-orange-500 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ChefHat size={24} />
          <h1 className="font-bold text-xl">{user.messName} Dashboard</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm bg-orange-600 px-4 py-2 rounded-lg hover:bg-orange-700 transition">
          <LogOut size={16} /> Logout
        </button>
      </nav>

      <div className="max-w-4xl mx-auto p-6 mt-6 grid md:grid-cols-2 gap-8">
        
        {/* Menu Publish Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><PlusCircle className="text-orange-500"/> Publish Today's Menu</h2>
          <form onSubmit={handlePublishMenu} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Menu Items (comma separated)</label>
              <textarea 
                required
                rows="3"
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="e.g. Dal Tadka, Paneer Masala, Chapati, Rice"
                value={menuItems}
                onChange={(e) => setMenuItems(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Thali Price (₹)</label>
              <input 
                type="number" 
                required
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="60"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <button disabled={isPublishing} type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition flex justify-center items-center gap-2">
              {isPublishing ? <Loader2 className="animate-spin" size={18} /> : 'Publish Menu'}
            </button>
          </form>
        </div>

        {/* Attendance Stats Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Users className="text-indigo-500"/> Today's Headcount</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-emerald-700">Coming</p>
              <p className="text-3xl font-black text-emerald-600">{stats.coming}</p>
            </div>
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 text-center">
              <XCircle size={32} className="text-rose-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-rose-700">Not Coming</p>
              <p className="text-3xl font-black text-rose-600">{stats.notComing}</p>
            </div>
          </div>
          <button onClick={fetchStats} className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition text-sm">
            Refresh Stats
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;