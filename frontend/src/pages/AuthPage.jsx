import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, UserPlus, ChevronRight, ChevronLeft, 
  User, Phone, Lock, BookOpen, ChefHat, 
  MapPin, FileText, CheckCircle2, AlertCircle, LogIn 
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('student');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '', phone: '', password: '', yearBranch: '', hostelRoom: '', messName: '', messAddress: '', fssaiNumber: '', latitude: null, longitude: null,
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/login' : '/api/register';
    const payload = isLogin ? { phone: formData.phone, password: formData.password } : { ...formData, role };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.ok) {
        // Save JWT to localStorage
        localStorage.setItem('token', data.token);
        
        if (data.user.role === 'admin') navigate('/admin', { state: { user: data.user } });
        else if (data.user.role === 'owner') navigate('/owner', { state: { user: data.user } });
        else navigate('/student', { state: { user: data.user } });
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Cannot connect to server. Ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 font-sans relative z-10">
      <div className="bg-white/70 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/80 w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        <div className="text-center mb-8 mt-2">
          <div className="inline-flex bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-[2rem] mb-4 shadow-inner border border-white">
            {isLogin ? <LogIn size={36} className="text-indigo-600" /> : <UserPlus size={36} className="text-purple-600" />}
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{isLogin ? 'Welcome Back' : 'Join AvasariConnect'}</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Your campus dining and living network</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-2xl mb-6 flex items-center gap-2 text-sm font-semibold border border-red-100 animate-in fade-in">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isLogin ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="tel" name="phone" placeholder="9876543210" required className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-800 shadow-sm transition-all" onChange={handleInputChange} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="password" name="password" placeholder="••••••••" required className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-800 shadow-sm transition-all" onChange={handleInputChange} />
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-900/10 transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98] disabled:opacity-50">
                {isLoading ? 'Signing In...' : <><LogIn size={20} /> Sign In</>}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex bg-slate-200/50 p-1 rounded-2xl mb-6">
                <button type="button" onClick={() => setRole('student')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${role === 'student' ? 'bg-white shadow-sm text-indigo-600 scale-100' : 'text-slate-500 hover:text-slate-700 scale-95 hover:scale-100'}`}>Student</button>
                <button type="button" onClick={() => setRole('owner')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${role === 'owner' ? 'bg-white shadow-sm text-purple-600 scale-100' : 'text-slate-500 hover:text-slate-700 scale-95 hover:scale-100'}`}>Mess Owner</button>
              </div>

              {role === 'student' ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" name="name" placeholder="Full Name" required className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 shadow-sm transition-all" onChange={handleInputChange} />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="tel" name="phone" placeholder="Mobile Number" required className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 shadow-sm transition-all" onChange={handleInputChange} />
                  </div>
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" name="yearBranch" placeholder="Year & Branch (e.g. 2nd Yr Computer)" className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 shadow-sm transition-all" onChange={handleInputChange} />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="password" name="password" placeholder="Create Password" required className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 shadow-sm transition-all" onChange={handleInputChange} />
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98] disabled:opacity-50">
                    {isLoading ? 'Creating...' : <><UserPlus size={20} /> Register Student</>}
                  </button>
                </div>
              ) : (
                <div className="animate-in fade-in zoom-in-95">
                  <div className="flex justify-between mb-6 relative">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 -translate-y-1/2 rounded"></div>
                    <div className={`absolute top-1/2 left-0 h-1 bg-orange-500 -z-10 -translate-y-1/2 rounded transition-all duration-300 ${step === 1 ? 'w-0' : step === 2 ? 'w-1/2' : 'w-full'}`}></div>
                    {[1, 2, 3].map((num) => (
                      <div key={num} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors duration-300 ${step >= num ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                        {step > num ? <CheckCircle2 size={16} /> : num}
                      </div>
                    ))}
                  </div>

                  {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" name="name" placeholder="Owner Full Name" required className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-slate-800 shadow-sm" onChange={handleInputChange} value={formData.name} />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="tel" name="phone" placeholder="Mobile Number" required className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-slate-800 shadow-sm" onChange={handleInputChange} value={formData.phone} />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="password" name="password" placeholder="Create Password" required className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-slate-800 shadow-sm" onChange={handleInputChange} value={formData.password} />
                      </div>
                      <button type="button" onClick={nextStep} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all">Next Step <ChevronRight size={20} /></button>
                    </div>
                  )}
                  {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                      <div className="relative">
                        <ChefHat className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" name="messName" placeholder="Mess Name" required className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-slate-800 shadow-sm" onChange={handleInputChange} value={formData.messName} />
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" name="messAddress" placeholder="Full Address / Landmark" required className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-slate-800 shadow-sm" onChange={handleInputChange} value={formData.messAddress} />
                      </div>
                      <button
                        type="button"
                        disabled={isGettingLocation}
                        onClick={() => {
                          setIsGettingLocation(true);
                          navigator.geolocation.getCurrentPosition(
                            (pos) => { setFormData(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude })); setIsGettingLocation(false); },
                            () => setIsGettingLocation(false),
                            { enableHighAccuracy: true, timeout: 10000 }
                          );
                        }}
                        className="w-full bg-indigo-50 text-indigo-600 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-50 text-sm"
                      >
                        <MapPin size={16} /> {formData.latitude ? `✅ Location captured (${formData.latitude.toFixed(4)}, ${formData.longitude.toFixed(4)})` : isGettingLocation ? 'Detecting...' : '📍 Use My Current Location (Optional)'}
                      </button>
                      <div className="flex gap-3">
                        <button type="button" onClick={prevStep} className="w-1/3 bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl flex items-center justify-center hover:bg-slate-300 transition-colors"><ChevronLeft size={20} /></button>
                        <button type="button" onClick={nextStep} className="w-2/3 bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all">Next Step <ChevronRight size={20} /></button>
                      </div>
                    </div>
                  )}
                  {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                      <div className="relative">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" name="fssaiNumber" placeholder="FSSAI License Number (Optional)" className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-slate-800 shadow-sm" onChange={handleInputChange} value={formData.fssaiNumber} />
                      </div>
                      <div className="flex gap-3">
                        <button type="button" onClick={prevStep} className="w-1/3 bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl flex items-center justify-center hover:bg-slate-300 transition-colors"><ChevronLeft size={20} /></button>
                        <button type="submit" disabled={isLoading} className="w-2/3 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 hover:shadow-orange-500/30 active:scale-[0.98] transition-all">
                          {isLoading ? 'Submitting...' : <><ShieldCheck size={20} /> Complete</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-sm font-extrabold text-indigo-600 hover:text-indigo-700 transition-colors">
            {isLogin ? "Don't have an account? Sign up here" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;