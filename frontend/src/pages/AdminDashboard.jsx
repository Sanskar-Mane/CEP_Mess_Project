import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, CheckCircle, Trash2, Users, Store, Clock, LogOut, Phone, User, BookOpen, Plus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const adminData = location.state?.user;

  if (!adminData || adminData.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 font-sans">
        <p>Unauthorized access.</p>
        <button onClick={() => navigate('/')} className="text-indigo-600 underline font-bold">Go to Login</button>
      </div>
    );
  }

  const [users, setUsers] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Form state for new directory item
  const [dirForm, setDirForm] = useState({ category: 'rickshaws', name: '', phone: '', area: '', tag: '' });

  useEffect(() => {
    fetchUsers();
    fetchDirectory();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
      if(response.ok) setUsers(await response.json());
    } catch (error) { console.error(error); }
  };

  const fetchDirectory = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/directory`, { headers: { 'Authorization': `Bearer ${token}` } });
      if(response.ok) setDirectory(await response.json());
    } catch (error) { console.error(error); }
  };

  const verifyOwner = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/admin/verify/${id}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) fetchUsers();
    } catch (error) { console.error(error); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) fetchUsers();
    } catch (error) { console.error(error); }
  };

  const addDirectoryItem = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/admin/directory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(dirForm)
      });
      if (response.ok) {
        setDirForm({ category: 'rickshaws', name: '', phone: '', area: '', tag: '' });
        fetchDirectory();
      }
    } catch (error) { console.error(error); }
  };

  const deleteDirectoryItem = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/admin/directory/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) fetchDirectory();
    } catch (error) { console.error(error); }
  };

  const pendingOwners = users.filter(u => u.role === 'owner' && !u.isVerified);
  const directoryUsers = users.filter(u => u.role !== 'admin');

  return (
    <div className="min-h-screen font-sans relative z-10 pb-12">
      <nav className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10"><Shield className="text-orange-400" size={24} /></div>
            <h1 className="text-2xl font-extrabold tracking-tight">Admin Control Panel</h1>
          </div>
          <button onClick={() => { localStorage.removeItem('token'); navigate('/'); }} className="flex items-center gap-2 text-sm font-bold bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 px-4 py-2.5 rounded-xl transition-all">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 mt-6">
        <div className="flex gap-4 mb-8 border-b border-slate-200/60 pb-2 overflow-x-auto">
          <button onClick={() => setActiveTab('pending')} className={`flex items-center gap-2 px-6 py-3 font-extrabold rounded-t-2xl whitespace-nowrap transition-all ${activeTab === 'pending' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'}`}>
            <Clock size={18} /> Pending Approvals <span className="bg-white/20 px-2 py-0.5 rounded-md ml-1">{pendingOwners.length}</span>
          </button>
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-6 py-3 font-extrabold rounded-t-2xl whitespace-nowrap transition-all ${activeTab === 'users' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'}`}>
            <Users size={18} /> User Accounts
          </button>
          <button onClick={() => setActiveTab('directory')} className={`flex items-center gap-2 px-6 py-3 font-extrabold rounded-t-2xl whitespace-nowrap transition-all ${activeTab === 'directory' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'}`}>
            <BookOpen size={18} /> Service Directory
          </button>
        </div>

        {activeTab === 'pending' && (
          <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 animate-in fade-in duration-500">
            <h2 className="text-2xl font-extrabold mb-8 flex items-center gap-3 text-slate-800"><div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl"><Store size={24}/></div> Messes Awaiting FSSAI Verification</h2>
            {pendingOwners.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                <p className="text-slate-500 font-bold text-lg">No pending verifications at this time. All clear!</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {pendingOwners.map(owner => (
                  <div key={owner._id} className="border border-amber-200/60 bg-amber-50/40 p-6 rounded-3xl flex flex-col md:flex-row justify-between md:items-center gap-6 shadow-sm">
                    {/* ... (Existing pending code) ... */}
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2">{owner.messName}</h3>
                      <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-600">
                        <span className="flex items-center gap-1.5"><User size={16} className="text-slate-400"/> {owner.name}</span>
                        <span className="flex items-center gap-1.5"><Phone size={16} className="text-slate-400"/> {owner.phone}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-400 mt-2 ml-1">FSSAI: {owner.fssaiNumber || 'None'}</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => verifyOwner(owner._id)} className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><CheckCircle size={18} /> Approve</button>
                      <button onClick={() => deleteUser(owner._id)} className="bg-rose-50 text-rose-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Trash2 size={18} /> Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-10 shadow-sm border border-white/80 overflow-x-auto animate-in fade-in">
             <h2 className="text-2xl font-extrabold mb-8 text-slate-800 flex items-center gap-3"><div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl"><Users size={24}/></div> All Users</h2>
             {/* ... (Keep existing User table loop here, simplified for brevity) ... */}
             <div className="space-y-3">
                {directoryUsers.map(user => (
                  <div key={user._id} className="grid grid-cols-12 gap-4 px-6 py-4 bg-white border border-slate-100 rounded-2xl items-center shadow-sm">
                    <div className="col-span-3 font-extrabold text-slate-800">{user.role === 'owner' ? user.messName : user.name}</div>
                    <div className="col-span-2 text-xs font-bold uppercase">{user.role}</div>
                    <div className="col-span-3 font-bold text-slate-600">{user.phone}</div>
                    <div className="col-span-4 text-right">
                      <button onClick={() => deleteUser(user._id)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
          </div>
        )}

        {activeTab === 'directory' && (
          <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-10 shadow-sm border border-white/80 animate-in fade-in">
             <h2 className="text-2xl font-extrabold mb-8 text-slate-800 flex items-center gap-3"><div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl"><BookOpen size={24}/></div> Service Directory Manager</h2>
             
             {/* Form to Add Service */}
             <form onSubmit={addDirectoryItem} className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mb-8 grid md:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Category</label>
                  <select value={dirForm.category} onChange={e => setDirForm({...dirForm, category: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200">
                    <option value="rickshaws">Auto Rickshaws</option>
                    <option value="rooms">PGs & Rooms</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Service Name</label>
                  <input required value={dirForm.name} onChange={e => setDirForm({...dirForm, name: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="e.g. Ramesh Auto"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number</label>
                  <input required value={dirForm.phone} onChange={e => setDirForm({...dirForm, phone: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="e.g. 9876543210"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Area / Details</label>
                  <input value={dirForm.area} onChange={e => setDirForm({...dirForm, area: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="e.g. College Stand"/>
                </div>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  <Plus size={18} /> Add Service
                </button>
             </form>

             {/* List Directory */}
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
               {directory.map(item => (
                 <div key={item._id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-start">
                   <div>
                     <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase mb-2 inline-block ${item.category === 'emergency' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{item.category}</span>
                     <h4 className="font-extrabold text-slate-800">{item.name}</h4>
                     <p className="text-sm font-bold text-slate-500 flex items-center gap-1 mt-1"><Phone size={14}/> {item.phone}</p>
                     <p className="text-xs text-slate-400 mt-1">{item.area}</p>
                   </div>
                   <button onClick={() => deleteDirectoryItem(item._id)} className="text-slate-300 hover:text-rose-500 p-2"><Trash2 size={18}/></button>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;