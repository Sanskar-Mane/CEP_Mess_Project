import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, LogIn } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="sticky top-4 z-50 px-4">
      <div className="max-w-4xl mx-auto bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl px-5 py-3 flex justify-between items-center transition-all">
        <Link to="/" className="flex items-center gap-3 no-underline group">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
            <BookOpen size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight m-0">Avasari Connect</h1>
            <p className="text-indigo-600 font-bold text-[9px] uppercase tracking-widest m-0 opacity-80">GCOEARA Project</p>
          </div>
        </Link>
        
        <Link to="/login" className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 transition-all active:scale-95 flex items-center gap-2">
          <LogIn size={16} /> Login
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;