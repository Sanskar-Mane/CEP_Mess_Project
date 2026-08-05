import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// Added Phone and User to the lucide-react imports
import { Shield, CheckCircle, Trash2, Users, Store, Clock, LogOut, Phone, User } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3000/api/admin/users');
      if(response.ok) setUsers(await response.json());
    } catch (error) {
      console.error(error);
    }
  };

  const verifyOwner = async (id) => {
    try {
      const response = await fetch(`http://127.0.0.1:3000/api/admin/verify/${id}`, { method: 'PUT' });
      if (response.ok) fetchUsers();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      const response = await fetch(`http://127.0.0.1:3000/api/admin/users/${id}`, { method: 'DELETE' });
      if (response.ok) fetchUsers();
    } catch (error) {
      console.error(error);
    }
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
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm font-bold bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 px-4 py-2.5 rounded-xl transition-all">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 mt-6">
        <div className="flex gap-4 mb-8 border-b border-slate-200/60 pb-2">
          <button onClick={() => setActiveTab('pending')} className={`flex items-center gap-2 px-6 py-3 font-extrabold rounded-t-2xl transition-all ${activeTab === 'pending' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'}`}>
            <Clock size={18} /> Pending Approvals <span className="bg-white/20 px-2 py-0.5 rounded-md ml-1">{pendingOwners.length}</span>
          </button>
          <button onClick={() => setActiveTab('directory')} className={`flex items-center gap-2 px-6 py-3 font-extrabold rounded-t-2xl transition-all ${activeTab === 'directory' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'}`}>
            <Users size={18} /> User Directory <span className="bg-white/20 px-2 py-0.5 rounded-md ml-1">{directoryUsers.length}</span>
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
                  <div key={owner._id} className="border border-amber-200/60 bg-amber-50/40 p-6 rounded-3xl flex flex-col md:flex-row justify-between md:items-center gap-6 shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2">{owner.messName}</h3>
                      <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-600">
                        <span className="flex items-center gap-1.5"><User size={16} className="text-slate-400"/> {owner.name}</span>
                        <span className="flex items-center gap-1.5"><Phone size={16} className="text-slate-400"/> {owner.phone}</span>
                      </div>
                      <div className="mt-3 inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-amber-100 shadow-sm text-xs font-bold text-slate-700">
                        <Shield size={14} className="text-amber-500"/> FSSAI: {owner.fssaiNumber || 'Not Provided'}
                      </div>
                      <p className="text-xs font-bold text-slate-400 mt-2 ml-1">Address: {owner.messAddress}</p>
                    </div>
                    <div className="flex gap-3 md:flex-col lg:flex-row">
                      <button onClick={() => verifyOwner(owner._id)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                        <CheckCircle size={18} /> Approve
                      </button>
                      <button onClick={() => deleteUser(owner._id)} className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border border-rose-100">
                        <Trash2 size={18} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'directory' && (
          <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 overflow-x-auto animate-in fade-in duration-500">
            <h2 className="text-2xl font-extrabold mb-8 text-slate-800 flex items-center gap-3"><div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl"><Users size={24}/></div> Complete Community Directory</h2>
            <div className="min-w-[700px]">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-100/80 rounded-2xl text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                <div className="col-span-2">Role</div>
                <div className="col-span-4">Name / Mess</div>
                <div className="col-span-3">Phone</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 text-right">Action</div>
              </div>
              <div className="space-y-3">
                {directoryUsers.map(user => (
                  <div key={user._id} className="grid grid-cols-12 gap-4 px-6 py-5 bg-white border border-slate-100 rounded-2xl items-center shadow-sm hover:shadow-md transition-all hover:border-indigo-100 group">
                    <div className="col-span-2">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase ${user.role === 'owner' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="col-span-4">
                      <div className="font-extrabold text-slate-800 text-base">{user.role === 'owner' ? user.messName : (user.name || user.fullName || 'Student')}</div>
                      <div className="text-xs text-slate-400 font-bold mt-0.5">{user.role === 'owner' ? `Owner: ${user.name || user.fullName || 'Unknown'}` : user.yearBranch || 'Student'}</div>
                    </div>
                    <div className="col-span-3 font-bold text-slate-600 flex items-center gap-2">
                      <Phone size={14} className="text-slate-300"/> {user.phone}
                    </div>
                    <div className="col-span-2 text-sm">
                      {user.role === 'owner' ? (
                        user.isVerified ? <span className="text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-lg w-fit"><CheckCircle size={14}/> Verified</span> : <span className="text-amber-600 font-bold flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-lg w-fit"><Clock size={14}/> Pending</span>
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )}
                    </div>
                    <div className="col-span-1 text-right">
                      <button onClick={() => deleteUser(user._id)} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2.5 rounded-xl transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;