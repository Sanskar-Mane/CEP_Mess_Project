import React, { useState } from 'react';
import { Utensils, MapPin, Navigation, Home, Phone, Star } from 'lucide-react';
import MessCard from '../components/MessCard';
import { MOCK_MESSES, MOCK_DIRECTORY } from '../data';

const DirectoryCard = ({ title, items, icon: Icon, colorClass }) => (
  <div className="mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
    <h3 className="text-2xl font-extrabold text-slate-800 mb-6 flex items-center gap-3">
      <div className={`p-2.5 rounded-2xl text-white shadow-lg ${colorClass}`}>
        <Icon size={24} />
      </div>
      {title}
    </h3>
    <div className="grid sm:grid-cols-2 gap-5">
      {items.map((item, idx) => (
        <div key={idx} className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_15px_35px_rgb(0,0,0,0.06)] group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-extrabold text-slate-800 text-lg">{item.name}</h4>
              <p className="text-slate-500 font-medium text-sm mt-1">{item.area || item.status}</p>
            </div>
            {item.rating && (
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                <Star size={12} className="text-amber-500 fill-amber-500"/> {item.rating}
              </span>
            )}
          </div>
          
          {(item.tag || item.price) && (
            <div className="mb-5 flex gap-2">
              {item.tag && <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase">{item.tag}</span>}
              {item.price && <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase">{item.price}</span>}
              {item.features && item.features.map(f => <span key={f} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase">{f}</span>)}
            </div>
          )}

          <a href={`tel:${item.phone}`} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors group-hover:bg-slate-900 group-hover:text-white">
            <Phone size={16} /> Call {item.phone}
          </a>
        </div>
      ))}
    </div>
  </div>
);

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState('menus');

  return (
    <div className="pb-20">
      <div className="pt-8 pb-12 px-4 text-center">
        <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
          Welcome, Engineers! 🚀
        </h2>
        <p className="text-slate-500 text-lg max-w-xl mx-auto font-medium animate-in fade-in slide-in-from-top-4 duration-700">
          Your one-stop dashboard for daily mess menus, room availability, and local Avasari services.
        </p>
      </div>

      <main className="max-w-3xl mx-auto px-4">
        <div className="bg-white/60 backdrop-blur-xl p-1.5 rounded-[2rem] shadow-lg border border-white/80 mb-10 max-w-md mx-auto relative z-10 flex animate-in zoom-in-95 duration-500">
          <button
            onClick={() => setActiveTab('menus')}
            className={`flex-1 py-3.5 text-sm font-bold rounded-[1.5rem] transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'menus' ? 'bg-slate-900 text-white shadow-md scale-100' : 'text-slate-500 hover:text-slate-800 scale-95 hover:scale-100'
            }`}
          >
            <Utensils size={18} /> Daily Menus
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex-1 py-3.5 text-sm font-bold rounded-[1.5rem] transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'directory' ? 'bg-slate-900 text-white shadow-md scale-100' : 'text-slate-500 hover:text-slate-800 scale-95 hover:scale-100'
            }`}
          >
            <MapPin size={18} /> Directory
          </button>
        </div>

        <div className="min-h-[500px]">
          {activeTab === 'menus' ? (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              {MOCK_MESSES.map(mess => (
                <MessCard key={mess.id} mess={mess} />
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <DirectoryCard title="Auto Rickshaws" icon={Navigation} colorClass="bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30" items={MOCK_DIRECTORY.rickshaws} />
              <DirectoryCard title="PGs & Rooms" icon={Home} colorClass="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30" items={MOCK_DIRECTORY.rooms} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;