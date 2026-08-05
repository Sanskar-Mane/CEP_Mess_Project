import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Utensils, MapPin, Navigation, Home, Phone, CheckCircle2, XCircle, LogOut, Loader2, IndianRupee, Star, AlertTriangle } from 'lucide-react';

const MOCK_DIRECTORY = {
  rickshaws: [
    { name: "Ramesh Auto", phone: "9876500001", area: "College to Stand", rating: "4.9", tag: "Fast" },
    { name: "Suresh Auto", phone: "9876500002", area: "Night Emergency", rating: "4.8", tag: "24/7" }
  ],
  rooms: [
    { name: "Sai PG for Boys", phone: "9998887771", status: "2 Beds Left", price: "₹1500/mo", features: ["Wifi", "Water"] },
    { name: "Gajanan Rooms", phone: "9998887772", status: "Full", price: "₹1200/mo", features: ["Parking"] }
  ],
  emergency: [
    { name: "Avasari Hospital", phone: "108", status: "24/7 Ambulance", tag: "Urgent" },
    { name: "Campus Security", phone: "9999900000", status: "Main Gate Guard", tag: "On Duty" }
  ]
};

const MessCard = ({ mess }) => {
  const [attendance, setAttendance] = useState(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAttendance = async (status) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('http://127.0.0.1:3000/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messId: mess._id, messName: mess.messName, status, timestamp: new Date().toISOString() })
      });
      if (response.ok) setAttendance(status);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 mb-8 overflow-hidden transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 group">
      <div className="h-3 w-full bg-gradient-to-r from-orange-500 to-rose-500"></div>
      
      <div className="p-6 sm:p-8 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Open Now</span>
              <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1"><IndianRupee size={12}/> {mess.price || '60'} Thali</span>
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
          <button onClick={() => handleAttendance('coming')} disabled={isSubmitting || attendance === 'coming'} className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] ${attendance === 'coming' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
            <CheckCircle2 size={20} /> Coming
          </button>
          <button onClick={() => handleAttendance('not_coming')} disabled={isSubmitting || attendance === 'not_coming'} className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] ${attendance === 'not_coming' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}>
            <XCircle size={20} /> Skip
          </button>
        </div>
        {attendance && (
          <div className="mt-5 p-3.5 bg-slate-900 text-white text-sm font-bold rounded-xl flex items-center justify-center shadow-lg animate-in slide-in-from-bottom-2">
            <CheckCircle2 size={18} className="mr-2 text-emerald-400" /> Attendance sent to owner!
          </div>
        )}
      </div>
    </div>
  );
};

const DirectoryCard = ({ title, items, icon: Icon, colorClass }) => (
  <div className="mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
    <h3 className="text-2xl font-extrabold text-slate-800 mb-6 flex items-center gap-3">
      <div className={`p-2.5 rounded-2xl text-white shadow-lg ${colorClass}`}><Icon size={24} /></div>
      {title}
    </h3>
    <div className="grid sm:grid-cols-2 gap-5">
      {items.map((item, idx) => (
        <div key={idx} className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 hover:-translate-y-1 transition-all hover:shadow-lg group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-extrabold text-slate-800 text-lg mb-1">{item.name}</h4>
              <p className="text-slate-500 font-medium text-sm">{item.area || item.status}</p>
            </div>
            {item.rating && (
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                <Star size={12} className="text-amber-500 fill-amber-500"/> {item.rating}
              </span>
            )}
          </div>
          
          <div className="mb-5 flex gap-2">
            {item.tag && <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase">{item.tag}</span>}
            {item.price && <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase">{item.price}</span>}
            {item.features && item.features.map(f => <span key={f} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase">{f}</span>)}
          </div>

          <a href={`tel:${item.phone}`} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-700 font-bold rounded-xl transition-colors">
            <Phone size={16} /> Call {item.phone}
          </a>
        </div>
      ))}
    </div>
  </div>
);

const StudentDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;

  if (!user || user.role !== 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 font-sans">
        <p>Unauthorized access.</p>
        <button onClick={() => navigate('/')} className="text-indigo-600 font-bold underline">Go to Login</button>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('menus');
  const [menus, setMenus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`http://127.0.0.1:3000/api/menus/${today}`);
      if (response.ok) setMenus(await response.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const studentName = (user.name || user.fullName || 'Engineer').split(' ')[0];

  return (
    <div className="pb-20 font-sans relative z-10">
      <nav className="bg-white/70 backdrop-blur-xl border-b border-slate-100 p-4 sticky top-0 z-40 mb-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="font-extrabold text-slate-800 text-lg flex items-center gap-2"><Utensils className="text-indigo-600"/>AvasariConnect</h1>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="pt-2 pb-12 px-4 text-center">
        <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4 animate-in fade-in slide-in-from-top-4 duration-500">Welcome, {studentName}! 🚀</h2>
        <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto animate-in fade-in slide-in-from-top-4 duration-700">Your one-stop dashboard for daily campus meals & local services.</p>
      </div>

      <main className="max-w-3xl mx-auto px-4">
        <div className="bg-white/60 backdrop-blur-xl p-1.5 rounded-[2rem] shadow-lg border border-white/80 mb-10 max-w-md mx-auto flex animate-in zoom-in-95 duration-500">
          <button onClick={() => setActiveTab('menus')} className={`flex-1 py-3.5 text-sm font-bold rounded-[1.5rem] transition-all flex items-center justify-center gap-2 ${activeTab === 'menus' ? 'bg-slate-900 text-white shadow-md scale-100' : 'text-slate-500 hover:text-slate-800 scale-95 hover:scale-100'}`}>
            <Utensils size={18} /> Daily Menus
          </button>
          <button onClick={() => setActiveTab('directory')} className={`flex-1 py-3.5 text-sm font-bold rounded-[1.5rem] transition-all flex items-center justify-center gap-2 ${activeTab === 'directory' ? 'bg-slate-900 text-white shadow-md scale-100' : 'text-slate-500 hover:text-slate-800 scale-95 hover:scale-100'}`}>
            <MapPin size={18} /> Directory
          </button>
        </div>

        <div className="min-h-[500px]">
          {activeTab === 'menus' ? (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              {isLoading ? (
                <div className="flex justify-center py-20 text-indigo-600"><Loader2 className="animate-spin" size={40}/></div>
              ) : menus.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-xl p-12 rounded-[2.5rem] text-center border border-white/80 shadow-sm">
                  <Utensils className="mx-auto text-slate-300 mb-4" size={56} />
                  <h3 className="font-extrabold text-slate-700 text-xl">No menus published yet.</h3>
                  <p className="text-slate-400 text-sm mt-2">Mess owners are still preparing today's meals. Check back soon!</p>
                </div>
              ) : (
                menus.map(mess => <MessCard key={mess._id} mess={mess} />)
              )}
            </div>
          ) : (
            <div>
              <DirectoryCard title="Auto Rickshaws" icon={Navigation} colorClass="bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30" items={MOCK_DIRECTORY.rickshaws} />
              <DirectoryCard title="PGs & Rooms" icon={Home} colorClass="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30" items={MOCK_DIRECTORY.rooms} />
              <DirectoryCard title="Emergency Contacts" icon={AlertTriangle} colorClass="bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/30" items={MOCK_DIRECTORY.emergency} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;