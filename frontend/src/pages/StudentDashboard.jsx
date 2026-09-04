import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Utensils, MapPin, Navigation, Home, Phone, CheckCircle2, XCircle, LogOut, Loader2, IndianRupee, Star, AlertTriangle, Sparkles, CalendarDays, Trophy, MessageSquareQuote, Map } from 'lucide-react';
import MessMap from '../components/MessMap';
import ThemeToggle from '../components/ThemeToggle';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

const MessCard = ({ mess, initialAttendance, targetDate, globalHasCommitted, onAttendanceUpdate }) => {
  const [attendance, setAttendance] = useState(initialAttendance || null); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hasRated, setHasRated] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [showReviews, setShowReviews] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setAttendance(initialAttendance || null);
  }, [initialAttendance]);

  const fetchReviews = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/messes/${mess.ownerId._id}/reviews`, { headers: { 'Authorization': `Bearer ${token}` }});
      if (res.ok) setReviews(await res.json());
      setShowReviews(!showReviews);
    } catch (e) { console.error(e); }
  };

  const handleAttendance = async (status) => {
    setIsSubmitting(true); setErrorMsg('');
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messId: mess._id, messName: mess.messName, status, targetDate, timestamp: new Date().toISOString() })
      });
      const data = await response.json();
      if (response.ok) { setAttendance(status); onAttendanceUpdate(true); } 
      else setErrorMsg(data.error || "Action not allowed.");
    } catch (error) { setErrorMsg("Connection failed."); } 
    finally { setIsSubmitting(false); }
  };

  const handleRating = async (e) => {
    e.preventDefault();
    if(rating === 0) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/messes/${mess.ownerId._id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ rating, comment })
      });
      if (response.ok) setHasRated(true);
    } catch (error) { console.error("Failed to submit rating"); }
  };

  const currentRating = mess.ownerId?.rating ? Number(mess.ownerId.rating).toFixed(1) : 'New';
  const isLocked = attendance !== null; 
  const disableComing = isSubmitting || isLocked || (globalHasCommitted && attendance !== 'coming');
  const disableSkip = isSubmitting || isLocked;

  return (
    <div className={`relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2rem] border transition-all duration-300 hover:shadow-2xl group mb-8 overflow-hidden
      ${attendance === 'coming' ? 'border-emerald-400 dark:border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.15)]' : 
        attendance === 'not_coming' ? 'border-rose-200 dark:border-rose-900/50 opacity-80' : 'border-white/80 dark:border-slate-700 shadow-xl'}`}>
      
      <div className={`h-2 w-full transition-colors duration-500 ${attendance === 'coming' ? 'bg-emerald-500' : attendance === 'not_coming' ? 'bg-rose-500' : 'bg-gradient-to-r from-orange-500 to-rose-500'}`}></div>
      
      <div className="p-6 sm:p-8 pb-2">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 shadow-sm"><Star size={10} className="fill-amber-400 text-amber-400" /> {currentRating}</span>
              <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase flex items-center gap-1"><IndianRupee size={12}/> {mess.price || '60'} Thali</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{mess.messName}</h3>
          </div>
        </div>

        <div className="bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 relative overflow-hidden mb-6">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
          <h4 className="font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2 text-xs uppercase tracking-widest"><Sparkles size={14} className="text-orange-400"/> Feast Menu</h4>
          <div className="flex flex-wrap gap-2 relative z-10">
            {mess.items.map((item, idx) => (
              <span key={idx} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-600 px-3.5 py-1.5 rounded-xl text-sm font-semibold">{item}</span>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => handleAttendance('coming')} disabled={disableComing} className={`flex-1 flex justify-center items-center gap-2 py-3.5 rounded-xl font-bold transition-all duration-300 ${attendance === 'coming' ? 'bg-emerald-500 text-white shadow-lg ring-4 ring-emerald-500/20' : disableComing ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 cursor-not-allowed border border-transparent' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-600 active:scale-95 shadow-sm hover:shadow'}`}><CheckCircle2 size={20} /> Coming</button>
          <button onClick={() => handleAttendance('not_coming')} disabled={disableSkip} className={`flex-1 flex justify-center items-center gap-2 py-3.5 rounded-xl font-bold transition-all duration-300 ${attendance === 'not_coming' ? 'bg-rose-500 text-white shadow-lg ring-4 ring-rose-500/20' : disableSkip ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 cursor-not-allowed border border-transparent' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-600 active:scale-95 shadow-sm hover:shadow'}`}><XCircle size={20} /> Skip</button>
        </div>

        {errorMsg && <p className="text-rose-500 dark:text-rose-400 text-sm font-bold text-center mt-4">{errorMsg}</p>}
        
        {attendance === 'coming' && (
          <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-6 animate-in slide-in-from-bottom-2">
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
                <textarea rows="2" placeholder="How was the food?" value={comment} onChange={e => setComment(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none mb-3 dark:text-white" />
                <button type="submit" disabled={rating === 0} className="w-full bg-slate-900 dark:bg-orange-500 text-white font-bold py-2.5 rounded-xl disabled:opacity-50">Submit Review</button>
              </form>
            ) : (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 text-center text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-2"><CheckCircle2 size={18}/> Review Submitted</div>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-center">
          <button onClick={fetchReviews} className="text-xs font-bold text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 flex items-center gap-1"><MessageSquareQuote size={14}/> {showReviews ? 'Hide' : 'Read'} Student Reviews</button>
        </div>

        {showReviews && (
          <div className="mt-4 space-y-3 animate-in fade-in">
            {reviews.length === 0 ? <p className="text-xs text-center text-slate-400">No reviews yet.</p> : reviews.map(r => (
              <div key={r._id} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl text-sm border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{r.studentName}</span>
                  <span className="flex text-amber-400"><Star size={12} className="fill-amber-400"/> {r.rating}</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs italic">"{r.comment || 'No comment provided'}"</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DirectoryCard = ({ title, items, icon: Icon, colorClass }) => {
  if (items.length === 0) return null;
  return (
    <div className="mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3"><div className={`p-3 rounded-2xl text-white shadow-lg ${colorClass}`}><Icon size={20} /></div> {title}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((item, idx) => (
          <div key={idx} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/60 dark:border-slate-700 hover:-translate-y-1 transition-all hover:shadow-xl group flex flex-col justify-between">
            <div className="mb-4">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-lg">{item.name}</h4>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">{item.area || item.status}</p>
            </div>
            <a href={`tel:${item.phone}`} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 dark:bg-slate-700 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md">
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

  const [activeTab, setActiveTab] = useState('menus');
  const [targetDate, setTargetDate] = useState(getLocalDateString(0));
  
  const [menus, setMenus] = useState([]);
  const [myAttendance, setMyAttendance] = useState([]);
  const [globalHasCommitted, setGlobalHasCommitted] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [directory, setDirectory] = useState({ rickshaws: [], rooms: [], emergency: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [nearbyMesses, setNearbyMesses] = useState([]);

  if (!user || user.role !== 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900"><button onClick={() => navigate('/')} className="text-indigo-400 font-bold underline">Go to Login</button></div>
    );
  }

  useEffect(() => {
    fetchData(false); 
    fetchLeaderboard();

    const intervalId = setInterval(() => {
      fetchData(true);
      fetchLeaderboard();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [targetDate]);

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
        setGlobalHasCommitted(myAtt.some(a => a.status === 'coming'));
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

  const fetchNearbyMesses = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/messes/nearby`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setNearbyMesses(await res.json());
    } catch (e) { console.error(e); }
  };

  const getAttendanceStatus = (messName) => {
    const record = myAttendance.find(a => a.messName === messName);
    return record ? record.status : null;
  };

  const studentName = (user.name || user.fullName || 'Student').split(' ')[0];

  return (
    <div className="font-sans relative z-10 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-[100%] blur-[100px] -z-10 pointer-events-none"></div>
      
      <nav className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white dark:border-slate-800 p-4 sticky top-0 z-50 transition-colors duration-500">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/20"><Utensils size={20} /></div>
            <h1 className="font-black text-slate-900 dark:text-white text-xl tracking-tight hidden sm:block">AvasariConnect</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => { localStorage.removeItem('token'); navigate('/'); }} className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 px-4 py-2.5 rounded-xl transition-all"><LogOut size={16} /> Logout</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 pt-8 pb-24 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        <div className="lg:col-span-3">
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Hello, {studentName} 👋</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">Book your meals and discover campus services. <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span> Live</p>
          </div>

          <div className="bg-slate-200/50 dark:bg-slate-800/80 backdrop-blur-md p-1.5 rounded-full shadow-inner mb-6 flex relative z-20 w-fit">
            <button onClick={() => setActiveTab('menus')} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex gap-2 ${activeTab === 'menus' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}><Utensils size={18} /> Daily Menus</button>
            <button onClick={() => setActiveTab('directory')} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex gap-2 ${activeTab === 'directory' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}><MapPin size={18} /> Directory</button>
            <button onClick={() => { setActiveTab('map'); fetchNearbyMesses(); }} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex gap-2 ${activeTab === 'map' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'}`}><Map size={18} /> Map</button>
          </div>

          {activeTab === 'menus' && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              
              <div className="flex mb-8 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm w-fit">
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl">
                  <button onClick={() => setTargetDate(getLocalDateString(0))} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${targetDate === getLocalDateString(0) ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Today</button>
                  <button onClick={() => setTargetDate(getLocalDateString(1))} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1 ${targetDate === getLocalDateString(1) ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Tomorrow <Sparkles size={14}/></button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 text-indigo-600 dark:text-indigo-400"><Loader2 className="animate-spin mb-4" size={48}/><p className="font-bold text-slate-500 dark:text-slate-400">Loading menus...</p></div>
              ) : menus.length === 0 ? (
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-16 rounded-[2.5rem] text-center border border-white dark:border-slate-700 shadow-xl">
                  <div className="bg-slate-100 dark:bg-slate-700 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"><CalendarDays className="text-slate-400 dark:text-slate-500" size={40} /></div>
                  <h3 className="font-black text-slate-900 dark:text-white text-2xl mb-2">No Menus Found</h3>
                  <p className="text-slate-500 dark:text-slate-400">Owners haven't published meals for this date yet.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {menus.map(mess => (
                    <MessCard key={mess._id} mess={mess} targetDate={targetDate} initialAttendance={getAttendanceStatus(mess.messName)} globalHasCommitted={globalHasCommitted} onAttendanceUpdate={(silent = true) => fetchData(silent)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'directory' && (
            <div className="animate-in fade-in slide-in-from-bottom-8">
              <DirectoryCard title="Auto Rickshaws" icon={Navigation} colorClass="bg-gradient-to-br from-blue-500 to-indigo-600" items={directory.rickshaws} />
              <DirectoryCard title="PGs & Rooms" icon={Home} colorClass="bg-gradient-to-br from-emerald-500 to-teal-600" items={directory.rooms} />
              <DirectoryCard title="Emergency Contacts" icon={AlertTriangle} colorClass="bg-gradient-to-br from-rose-500 to-pink-600" items={directory.emergency} />
            </div>
          )}

          {activeTab === 'map' && (
            <MessMap messes={nearbyMesses} />
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gradient-to-b from-amber-100 to-orange-50 dark:from-amber-900/40 dark:to-orange-900/10 p-6 rounded-[2rem] border border-amber-200 dark:border-amber-700/50 shadow-xl shadow-amber-500/10 sticky top-24">
            <h3 className="font-black text-amber-900 dark:text-amber-400 text-xl mb-5 flex items-center gap-2"><Trophy size={24} className="text-amber-500"/> Top Rated Messes</h3>
            <div className="space-y-4">
              {leaderboard.length === 0 ? <p className="text-sm text-amber-700/60 dark:text-amber-500/60 font-bold text-center py-4">No ratings yet.</p> : leaderboard.map((mess, i) => (
                <div key={mess._id} className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-4 rounded-2xl flex items-center justify-between border border-white dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${i===0 ? 'bg-amber-400 text-white shadow-lg shadow-amber-400/40' : i===1 ? 'bg-slate-300 text-slate-700' : 'bg-orange-300 text-orange-900'}`}>{i+1}</div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-[120px]">{mess.messName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{mess.ratingCount} Reviews</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-black text-amber-600 dark:text-amber-400"><Star size={12} className="fill-amber-500"/> {Number(mess.rating).toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default StudentDashboard;