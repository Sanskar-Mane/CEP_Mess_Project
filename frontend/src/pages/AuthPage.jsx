import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, UserPlus, ChevronRight, ChevronLeft, 
  User, Phone, Lock, BookOpen, Home, ChefHat, 
  MapPin, Clock, FileText, IndianRupee, CheckCircle2 
} from 'lucide-react';

const AuthPage = () => {
  const navigate = useNavigate();
  
  // UI State
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('student');
  const [ownerStep, setOwnerStep] = useState(1);

  // Form Data State - Captures everything the user types
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    fullName: '',
    yearBranch: '',
    hostel: '',
    messName: '',
    messAddress: '',
    messType: 'veg',
    timings: '7:00 PM - 9:30 PM',
    fssai: '',
    price: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNextStep = () => setOwnerStep(prev => Math.min(prev + 1, 3));
  const handlePrevStep = () => setOwnerStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form Submitted Data:", formData);
    console.log("Role:", role);
    console.log("Is Login?", isLogin);
    
    // Here we would normally send data to Node.js or Firebase.
    // For now, route to the correct dashboard based on the selected role.
    navigate(role === 'owner' ? '/owner-dashboard' : '/student-dashboard');
  };

  const renderLoginForm = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Phone Number</label>
        <div className="relative">
          <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-slate-800" placeholder="+91 98765 43210" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Password</label>
        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-slate-800" placeholder="••••••••" />
        </div>
      </div>
      <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:shadow-xl hover:shadow-slate-900/20 transition-all duration-300 active:scale-[0.98] flex justify-center items-center gap-2 mt-4 text-lg">
        Sign In <ChevronRight size={20} />
      </button>
    </div>
  );

  const renderStudentSignup = () => (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Full Name</label>
        <div className="relative">
          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-slate-800" placeholder="Rahul Patil" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Phone</label>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="w-full px-4 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-slate-800" placeholder="9876543210" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Password</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full px-4 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-slate-800" placeholder="••••••••" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Year & Branch <span className="text-slate-400 lowercase font-normal">(Optional)</span></label>
        <div className="relative">
          <BookOpen size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" name="yearBranch" value={formData.yearBranch} onChange={handleChange} className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-slate-800" placeholder="e.g. SY Computer" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Hostel / PG <span className="text-slate-400 lowercase font-normal">(Optional)</span></label>
        <div className="relative">
          <Home size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" name="hostel" value={formData.hostel} onChange={handleChange} className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-slate-800" placeholder="e.g. Sai PG" />
        </div>
      </div>
      <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-4 rounded-2xl hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 active:scale-[0.98] flex justify-center items-center gap-2 mt-2 text-lg">
        Create Student Account <ChevronRight size={20} />
      </button>
    </div>
  );

  const renderOwnerSignup = () => (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* Stepper Indicator */}
      <div className="flex justify-center items-center mb-8">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${ownerStep === step ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-110' : ownerStep > step ? 'bg-purple-200 text-purple-700' : 'bg-slate-200 text-slate-400'}`}>
              {ownerStep > step ? <CheckCircle2 size={16} /> : step}
            </div>
            {step < 3 && <div className={`w-12 h-1 rounded-full mx-2 transition-all duration-300 ${ownerStep > step ? 'bg-purple-300' : 'bg-slate-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="min-h-[280px]">
        {/* Step 1: Personal Details */}
        {ownerStep === 1 && (
          <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
            <h4 className="font-extrabold text-slate-800 text-lg mb-4 text-center">Owner Details</h4>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Full Name</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-semibold text-slate-800" placeholder="e.g. Ramesh Deshmukh" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Mobile Number</label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-semibold text-slate-800" placeholder="9876543210" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-semibold text-slate-800" placeholder="••••••••" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Business Details */}
        {ownerStep === 2 && (
          <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
            <h4 className="font-extrabold text-slate-800 text-lg mb-4 text-center">Mess Information</h4>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Mess Name</label>
              <div className="relative">
                <ChefHat size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" name="messName" value={formData.messName} onChange={handleChange} required className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-semibold text-slate-800" placeholder="Shree Swami Samarth Mess" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Address / Landmark</label>
              <div className="relative">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" name="messAddress" value={formData.messAddress} onChange={handleChange} required className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-semibold text-slate-800" placeholder="Near Main Gate" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Mess Type</label>
                <select name="messType" value={formData.messType} onChange={handleChange} className="w-full px-4 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-semibold text-slate-800 appearance-none">
                  <option value="veg">Pure Veg</option>
                  <option value="non-veg">Non-Veg</option>
                  <option value="both">Veg & Non-Veg</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Standard Timings</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" name="timings" value={formData.timings} onChange={handleChange} className="w-full pl-9 pr-3 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-semibold text-slate-800 text-sm" placeholder="7:00 PM - 9:30 PM" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Compliance & Pricing */}
        {ownerStep === 3 && (
          <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-300">
            <h4 className="font-extrabold text-slate-800 text-lg mb-4 text-center">Pricing & Compliance</h4>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">FSSAI License Number <span className="text-slate-400 lowercase font-normal">(Optional)</span></label>
              <div className="relative">
                <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" name="fssai" value={formData.fssai} onChange={handleChange} className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-semibold text-slate-800" placeholder="14-digit FSSAI Number" />
              </div>
              <p className="text-[10px] text-slate-500 ml-2 mt-1.5">* Builds trust with students</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Monthly Subscription Price <span className="text-slate-400 lowercase font-normal">(Optional)</span></label>
              <div className="relative">
                <IndianRupee size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-semibold text-slate-800" placeholder="e.g. 2500" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Navigation Buttons */}
      <div className="flex gap-3 mt-8">
        {ownerStep > 1 && (
          <button type="button" onClick={handlePrevStep} className="px-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center">
            <ChevronLeft size={20} />
          </button>
        )}
        
        {ownerStep < 3 ? (
          <button type="button" onClick={handleNextStep} className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-[0.98] flex justify-center items-center gap-2 text-lg shadow-lg shadow-slate-900/20">
            Continue <ChevronRight size={20} />
          </button>
        ) : (
          <button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-2xl hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 active:scale-[0.98] flex justify-center items-center gap-2 text-lg">
            Register Mess <CheckCircle2 size={20} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-500 pb-12">
      <div className="bg-white/60 backdrop-blur-2xl p-6 sm:p-10 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/80 w-full max-w-lg relative overflow-hidden transition-all duration-500">
        
        {/* Top Decorative Gradient */}
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${role === 'student' ? 'from-indigo-500 via-purple-500 to-pink-500' : 'from-purple-500 via-pink-500 to-rose-500'} transition-all duration-700`}></div>

        {/* Header Section */}
        <div className="text-center mb-8 mt-2">
          <div className="inline-flex bg-gradient-to-br from-white to-slate-50 p-4 rounded-[2rem] mb-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80">
            {isLogin ? <ShieldCheck size={36} className="text-slate-800" /> : <UserPlus size={36} className={role === 'student' ? 'text-indigo-600' : 'text-purple-600'} />}
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{isLogin ? 'Welcome Back' : 'Join Avasari Connect'}</h2>
          <p className="text-slate-500 font-medium mt-2">{isLogin ? 'Sign in to manage your daily meals' : 'Create an account to get started'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* Role Toggle (Only show if logging in, or if on step 1 of signup) */}
          {(isLogin || (!isLogin && ownerStep === 1)) && (
            <div className="flex bg-slate-200/50 p-1.5 rounded-2xl backdrop-blur-sm mb-8">
              <button type="button" onClick={() => setRole('student')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${role === 'student' ? 'bg-white shadow-sm text-indigo-600 scale-100' : 'text-slate-500 hover:text-slate-700 scale-95'}`}>
                Student
              </button>
              <button type="button" onClick={() => setRole('owner')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${role === 'owner' ? 'bg-white shadow-sm text-purple-600 scale-100' : 'text-slate-500 hover:text-slate-700 scale-95'}`}>
                Mess Owner
              </button>
            </div>
          )}

          {/* Dynamic Form Rendering */}
          <div className="min-h-[220px]">
            {isLogin 
              ? renderLoginForm() 
              : role === 'student' 
                ? renderStudentSignup() 
                : renderOwnerSignup()
            }
          </div>

        </form>

        {/* Footer Toggle */}
        {(!(!isLogin && role === 'owner' && ownerStep > 1)) && (
          <div className="mt-8 text-center pt-6 border-t border-slate-200/50">
            <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
              {isLogin ? "New to Avasari? Create an account here" : "Already registered? Sign in instead"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default AuthPage;