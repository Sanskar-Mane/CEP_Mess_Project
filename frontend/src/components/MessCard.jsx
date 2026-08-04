import React, { useState } from 'react';
import { Utensils, MapPin, Navigation, Star, CheckCircle2, XCircle } from 'lucide-react';

const MessCard = ({ mess }) => {
  const [attendance, setAttendance] = useState(null); 
  const [isHovered, setIsHovered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAttendance = async (status) => {
    setIsSubmitting(true);
    
    const dataToSend = {
      messId: mess.id,
      messName: mess.name,
      status: status,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('http://localhost:3000/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        setAttendance(status);
      }
    } catch (error) {
      console.error("Failed to connect to backend.", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 mb-8 overflow-hidden transition-all duration-500 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`h-3 w-full bg-gradient-to-r ${mess.color}`}></div>
      
      <div className="p-6 sm:p-8 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Star size={10} className="text-amber-500 fill-amber-500" /> {mess.rating}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${mess.status === 'Open Now' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {mess.status}
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">{mess.name}</h3>
          </div>
          <div className={`bg-gradient-to-br ${mess.color} p-3 rounded-2xl shadow-lg opacity-90 group-hover:opacity-100 transition-opacity`}>
            <Utensils size={24} className="text-white" />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6">
          <p className="text-slate-500 flex items-center gap-1.5 text-sm font-semibold">
            <MapPin size={16} className="text-indigo-400" /> {mess.location}
          </p>
          <p className="text-slate-500 flex items-center gap-1.5 text-sm font-semibold">
            <Navigation size={16} className="text-indigo-400" /> {mess.distance}
          </p>
        </div>
      </div>

      <div className="bg-slate-50/80 px-6 sm:px-8 py-6 border-y border-slate-100/50 relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${mess.color} opacity-[0.03] rounded-full blur-2xl transform translate-x-10 -translate-y-10`}></div>
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
          Today's Feast
        </h4>
        <div className="flex flex-wrap gap-2">
          {mess.menu.map((item, idx) => (
            <span key={idx} className="bg-white text-slate-700 shadow-sm border border-slate-200/60 px-4 py-2 rounded-2xl text-sm font-bold hover:scale-105 transition-transform cursor-default">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="p-6 sm:p-8 pt-6 bg-white/50">
        <div className="flex gap-4">
          <button
            onClick={() => handleAttendance('coming')}
            disabled={isSubmitting || attendance === 'coming'}
            className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-2xl font-bold transition-all duration-300 active:scale-95 text-sm sm:text-base ${
              attendance === 'coming'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:shadow-md'
            }`}
          >
            <CheckCircle2 size={20} /> I'm Coming
          </button>

          <button
            onClick={() => handleAttendance('not_coming')}
            disabled={isSubmitting || attendance === 'not_coming'}
            className={`flex-1 flex justify-center items-center gap-2 py-4 rounded-2xl font-bold transition-all duration-300 active:scale-95 text-sm sm:text-base ${
              attendance === 'not_coming'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'bg-rose-50 text-rose-600 hover:bg-rose-100 hover:shadow-md'
            }`}
          >
            <XCircle size={20} /> Not Today
          </button>
        </div>
        
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${attendance ? 'max-h-20 opacity-100 mt-5' : 'max-h-0 opacity-0'}`}>
          <div className="p-3.5 bg-slate-900 text-white text-sm font-bold rounded-xl flex items-center justify-center shadow-lg">
            <CheckCircle2 size={18} className="mr-2 text-emerald-400" /> 
            Status sent! The owner has been notified.
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessCard;