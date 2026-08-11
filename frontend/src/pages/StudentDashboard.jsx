import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Utensils, MapPin, Navigation, Home, Phone, CheckCircle2, XCircle, LogOut, Loader2, IndianRupee, Star, AlertTriangle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const MessCard = ({ mess, initialAttendance, globalHasCommitted, onAttendanceUpdate }) => {
  const [attendance, setAttendance] = useState(initialAttendance || null); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAttendance = async (status) => {
    setIsSubmitting(true);
    setErrorMsg('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messId: mess._id, messName: mess.messName, status, timestamp: new Date().toISOString() })
      });
      const data = await response.json();
      
      if (response.ok) {
        setAttendance(status);
        onAttendanceUpdate(); // Refresh the parent to disable other mess buttons
      } else {
        setErrorMsg(data.error || "Action not allowed.");
      }
    } catch (error) {
      setErrorMsg("Connection failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRating = async (stars) => {
    setRating(stars);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/messes/${mess.ownerId._id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ rating: stars })
      });
      if (response.ok) setHasRated(true);
    } catch (error) {
      console.error("Failed to submit rating");
    }
  };

  const currentRating = mess.ownerId?.rating ? Number(mess.ownerId.rating).toFixed(1) : 'New';
  
  // Logic to lock buttons
  const isLocked = attendance !== null; 
  // Disable 'Coming' if already committed to another mess
  const disableComing = isSubmitting || isLocked || (globalHasCommitted && attendance !== 'coming');
  const disableSkip = isSubmitting || isLocked;

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 mb-8 overflow-hidden transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] group">
      <div className="h-3 w-full bg-gradient-to-r from-orange-500 to-rose-500"></div>
      
      <div className="p-6 sm:p-8 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                <Star size={10} className="fill-amber-700" /> {currentRating}
              </span>
              <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center gap-1"><IndianRupee size={12}/> {mess.price || '60'} Thali</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">{mess.messName}</h3>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-rose-500 p-3 rounded-2xl shadow-lg shadow-orange-500/30 text-white group-hover:scale-105 transition-transform">
            <Utensils size={24} />
          </div>
        </div>
      </div>

      <div className="bg-slate-50/80 px-6 sm:px-8 py-6 border-y border-slate-100/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500 opacity-[0.03] rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">Today's Feast</h4>
        <div className="flex flex-wrap gap-2">
          {mess.items.map((item, idx) => (
            <span key={idx} className="bg-white text-slate-700 shadow-sm border border-slate-200/60 px-4 py-2 rounded-2xl text-sm font-bold cursor-default hover:border-orange-300 transition-colors">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="p-6 sm:p-8 pt-6 bg-white/50">
        <div className="flex gap-4">
          <button 
            onClick={() => handleAttendance('coming')} 
            disabled={disableComing} 
            className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-2xl font-bold transition-all ${attendance === 'coming' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : disableComing ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 active:scale-[0.98]'}`}>
            <CheckCircle2 size={20} /> Coming
          </button>
          
          <button 
            onClick={() => handleAttendance('not_coming')} 
            disabled={disableSkip} 
            className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-2xl font-bold transition-all ${attendance === 'not_coming' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : disableSkip ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 active:scale-[0.98]'}`}>
            <XCircle size={20} /> Skip
          </button>
        </div>

        {errorMsg && <p className="text-rose-500 text-sm font-bold text-center mt-4 bg-rose-50 p-2 rounded-xl border border-rose-100">{errorMsg}</p>}
        
        {/* Rating System */}
        {attendance === 'coming' && (
          <div className="mt-6 p-5 bg-white border border-slate-100 rounded-2xl text-center shadow-sm animate-in slide-in-from-bottom-2">
            {!hasRated ? (
              <>
                <p className="text-sm font-bold text-slate-600 mb-3">How was the food today?</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => handleRating(star)}
                      onMouseEnter={() => setRating(star)}
                      onMouseLeave={() => setRating(0)}
                      className="p-1 transition-transform hover:scale-125"
                    >
                      <Star size={28} className={star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm font-bold text-emerald-600 flex items-center justify-center gap-2">
                <CheckCircle2 size={18} /> Thanks for your feedback!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const DirectoryCard = ({ title, items, icon: Icon, colorClass }) => {
  if (items.length === 0) return null;
  return (
    <div className="mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <h3 className="text-2xl font-extrabold text-slate-800 mb-6 flex items-center gap-3">
        <div className={`p-2.5 rounded-2xl text-white shadow-lg ${colorClass}`}><Icon size={24} /></div>
        {title}
      </h3>
      <div className="grid sm:grid-cols-2 gap-5">
        {items.map((item, idx) => (
          <div key={idx} className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 hover:-translate-y-1 transition-all hover:shadow-lg">
            <h4 className="font-extrabold text-slate-800 text-lg mb-1">{item.name}</h4>
            <p className="text-slate-500 font-medium text-sm mb-4">{item.area || item.status}</p>
            <a href={`tel:${item.phone}`} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-700 font-bold rounded-xl transition-colors">
              <Phone size={16} /> Call {item.phone}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;

  if (!user || user.role !== 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <button onClick={() => navigate('/')} className="text-indigo-600 font-bold underline">Go to Login</button>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('menus');
  const [menus, setMenus] = useState([]);
  const [myAttendance, setMyAttendance] = useState([]);
  const [globalHasCommitted, setGlobalHasCommitted] = useState(false);
  const [directory, setDirectory] = useState({ rickshaws: [], rooms: [], emergency: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    
    try {
      const menuRes = await fetch(`${API_URL}/api/menus/${today}`, { headers });
      if (menuRes.ok) setMenus(await menuRes.json());

      const attRes = await fetch(`${API_URL}/api/attendance/me/${today}`, { headers });
      if (attRes.ok) {
        const myAtt = await attRes.json();
        setMyAttendance(myAtt);
        // Determine if the user has already marked "coming" anywhere today
        setGlobalHasCommitted(myAtt.some(a => a.status === 'coming'));
      }

      const dirRes = await fetch(`${API_URL}/api/directory`, { headers });
      if (dirRes.ok) {
        const rawDir = await dirRes.json();
        setDirectory({
          rickshaws: rawDir.filter(d => d.category === 'rickshaws'),
          rooms: rawDir.filter(d => d.category === 'rooms'),
          emergency: rawDir.filter(d => d.category === 'emergency')
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAttendanceStatus = (messName) => {
    const record = myAttendance.find(a => a.messName === messName);
    return record ? record.status : null;
  };

  const studentName = (user.name || user.fullName || 'Student').split(' ')[0];

  return (
    <div className="pb-20 font-sans relative z-10">
      <nav className="bg-white/70 backdrop-blur-xl border-b border-slate-100 p-4 sticky top-0 z-40 mb-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="font-extrabold text-slate-800 text-lg flex items-center gap-2"><Utensils className="text-indigo-600"/>AvasariConnect</h1>
          <button onClick={() => { localStorage.removeItem('token'); navigate('/'); }} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="pt-2 pb-12 px-4 text-center">
        <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4 animate-in fade-in">Welcome, {studentName}! 🚀</h2>
        <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto animate-in fade-in">Your one-stop dashboard for daily campus meals & local services.</p>
      </div>

      <main className="max-w-3xl mx-auto px-4">
        <div className="bg-white/60 backdrop-blur-xl p-1.5 rounded-[2rem] shadow-lg border border-white/80 mb-10 max-w-md mx-auto flex">
          <button onClick={() => setActiveTab('menus')} className={`flex-1 py-3.5 text-sm font-bold rounded-[1.5rem] transition-all flex items-center justify-center gap-2 ${activeTab === 'menus' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
            <Utensils size={18} /> Daily Menus
          </button>
          <button onClick={() => setActiveTab('directory')} className={`flex-1 py-3.5 text-sm font-bold rounded-[1.5rem] transition-all flex items-center justify-center gap-2 ${activeTab === 'directory' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
            <MapPin size={18} /> Directory
          </button>
        </div>

        <div className="min-h-[500px]">
          {activeTab === 'menus' ? (
            <div className="animate-in fade-in slide-in-from-bottom-8">
              {isLoading ? (
                <div className="flex justify-center py-20 text-indigo-600"><Loader2 className="animate-spin" size={40}/></div>
              ) : menus.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-xl p-12 rounded-[2.5rem] text-center border border-white/80 shadow-sm">
                  <Utensils className="mx-auto text-slate-300 mb-4" size={56} />
                  <h3 className="font-extrabold text-slate-700 text-xl">No menus published yet.</h3>
                </div>
              ) : (
                menus.map(mess => (
                  <MessCard 
                    key={mess._id} 
                    mess={mess} 
                    initialAttendance={getAttendanceStatus(mess.messName)} 
                    globalHasCommitted={globalHasCommitted}
                    onAttendanceUpdate={fetchData} // Refreshes page state when clicked
                  />
                ))
              )}
            </div>
          ) : (
            <div>
              <DirectoryCard title="Auto Rickshaws" icon={Navigation} colorClass="bg-gradient-to-br from-blue-500 to-indigo-600" items={directory.rickshaws} />
              <DirectoryCard title="PGs & Rooms" icon={Home} colorClass="bg-gradient-to-br from-emerald-500 to-teal-600" items={directory.rooms} />
              <DirectoryCard title="Emergency Contacts" icon={AlertTriangle} colorClass="bg-gradient-to-br from-rose-500 to-pink-600" items={directory.emergency} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;