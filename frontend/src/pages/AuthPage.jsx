import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, UserPlus, ChevronRight, ChevronLeft,
  User, Phone, Lock, BookOpen, ChefHat,
  MapPin, FileText, CheckCircle2, AlertCircle, LogIn,
  Mail, KeyRound, RefreshCw, ArrowLeft
} from 'lucide-react';

import { API_URL } from '../utils/config';

const AuthPage = () => {
  const navigate = useNavigate();
  // 'login' | 'register' | 'verifyOtp'
  const [authMode, setAuthMode] = useState('login');
  const [role, setRole] = useState('student');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState('');
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpEmail, setOtpEmail] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    yearBranch: '',
    hostelRoom: '',
    messName: '',
    messAddress: '',
    fssaiNumber: '',
    latitude: null,
    longitude: null,
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Countdown timer for Resend OTP
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    setError('');
    if (step === 1) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!formData.name.trim()) {
        setError('Owner name is required.');
        return;
      }
      if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!formData.phone.trim() || !phoneRegex.test(formData.phone.trim())) {
        setError('Please enter a valid 10-digit Indian mobile number.');
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
    } else if (step === 2) {
      if (!formData.messName.trim()) {
        setError('Mess name is required.');
        return;
      }
      if (!formData.messAddress.trim()) {
        setError('Mess address is required.');
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const routeByRole = (user) => {
    if (user.role === 'admin') navigate('/admin', { state: { user } });
    else if (user.role === 'owner') navigate('/owner', { state: { user } });
    else navigate('/student', { state: { user } });
  };

  // Handle Login & Registration Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResendSuccess('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = (formData.email || '').trim().toLowerCase();

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    if (authMode === 'register') {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        setError('Please enter a valid 10-digit Indian mobile number.');
        setIsLoading(false);
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setIsLoading(false);
        return;
      }
    }

    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    const payload = authMode === 'login'
      ? { email: cleanEmail, password: formData.password }
      : { ...formData, email: cleanEmail, phone: formData.phone.trim(), role };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (response.status === 403 && data.unverified) {
        // Email not verified -> switch to OTP verification screen
        setOtpEmail(data.email || cleanEmail);
        setOtp('');
        setAuthMode('verifyOtp');
        setResendCooldown(60);
        setError('Your email is not verified yet. We have sent a 6-digit OTP to your inbox.');
        return;
      }

      if (response.ok) {
        if (authMode === 'register') {
          // Registration successful -> prompt for OTP verification
          setOtpEmail(data.email || cleanEmail);
          setOtp('');
          setAuthMode('verifyOtp');
          setResendCooldown(60);
        } else {
          // Login successful
          localStorage.setItem('token', data.token);
          routeByRole(data.user);
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Cannot connect to server. Ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Verify OTP Submit
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP sent to your email.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResendSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otpEmail || formData.email.trim().toLowerCase(),
          otp: otp.trim()
        })
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        routeByRole(data.user);
      } else {
        setError(data.error || 'Invalid or expired OTP code.');
      }
    } catch (err) {
      setError('Failed to reach server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resend OTP Request
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError('');
    setResendSuccess('');

    try {
      const targetEmail = otpEmail || formData.email.trim().toLowerCase();
      const response = await fetch(`${API_URL}/api/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      const data = await response.json();

      if (response.ok) {
        setResendSuccess('A fresh verification code has been dispatched to your email.');
        setResendCooldown(60);
      } else {
        setError(data.error || 'Unable to resend OTP at this time.');
      }
    } catch (err) {
      setError('Failed to request new code. Ensure backend is running.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 font-sans relative z-10">
      <div className="bg-white/70 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/80 w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        {/* --- HEADER --- */}
        <div className="text-center mb-8 mt-2">
          <div className="inline-flex bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-[2rem] mb-4 shadow-inner border border-white">
            {authMode === 'verifyOtp' ? (
              <KeyRound size={36} className="text-indigo-600" />
            ) : authMode === 'login' ? (
              <LogIn size={36} className="text-indigo-600" />
            ) : (
              <UserPlus size={36} className="text-purple-600" />
            )}
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {authMode === 'verifyOtp'
              ? 'Verify Email'
              : authMode === 'login'
              ? 'Welcome Back'
              : 'Join AvasariConnect'}
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            {authMode === 'verifyOtp'
              ? 'Enter the 6-digit code sent to your email'
              : 'Your campus dining and living network'}
          </p>
        </div>

        {/* --- ALERTS --- */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-2xl mb-6 flex items-center gap-2 text-sm font-semibold border border-red-100 animate-in fade-in">
            <AlertCircle size={18} className="shrink-0" /> <span>{error}</span>
          </div>
        )}

        {resendSuccess && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-2xl mb-6 flex items-center gap-2 text-sm font-semibold border border-emerald-100 animate-in fade-in">
            <CheckCircle2 size={18} className="shrink-0" /> <span>{resendSuccess}</span>
          </div>
        )}

        {/* --- VERIFY OTP VIEW --- */}
        {authMode === 'verifyOtp' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Sent code to</span>
              <span className="text-sm font-extrabold text-slate-800 break-all">{otpEmail || formData.email}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1 text-center">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  autoFocus
                  required
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl py-4 rounded-2xl bg-white/80 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-extrabold text-slate-800 shadow-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : <><ShieldCheck size={20} /> Verify Account</>}
            </button>

            <div className="flex items-center justify-between pt-2 px-1 text-sm">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(''); setResendSuccess(''); }}
                className="text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isResending}
                className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        ) : (
          /* --- LOGIN & REGISTER FORMS --- */
          <form onSubmit={handleSubmit} className="space-y-5">
            {authMode === 'login' ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      name="email"
                      placeholder="student@example.com"
                      autoComplete="email"
                      required
                      value={formData.email}
                      className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-800 shadow-sm transition-all"
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      required
                      value={formData.password}
                      className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-800 shadow-sm transition-all"
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-900/10 transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? 'Signing In...' : <><LogIn size={20} /> Sign In</>}
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex bg-slate-200/50 p-1 rounded-2xl mb-6">
                  <button
                    type="button"
                    onClick={() => { setRole('student'); setError(''); }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${role === 'student' ? 'bg-white shadow-sm text-indigo-600 scale-100' : 'text-slate-500 hover:text-slate-700 scale-95 hover:scale-100'}`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRole('owner'); setError(''); }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${role === 'owner' ? 'bg-white shadow-sm text-purple-600 scale-100' : 'text-slate-500 hover:text-slate-700 scale-95 hover:scale-100'}`}
                  >
                    Mess Owner
                  </button>
                </div>

                {role === 'student' ? (
                  <div className="space-y-4 animate-in fade-in zoom-in-95">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        name="name"
                        placeholder="Full Name"
                        required
                        value={formData.name}
                        className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 shadow-sm transition-all"
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="email"
                        name="email"
                        placeholder="College Email Address"
                        autoComplete="email"
                        required
                        value={formData.email}
                        className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 shadow-sm transition-all"
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Mobile Number (for rides & contacts)"
                        maxLength="10"
                        pattern="[6-9][0-9]{9}"
                        title="Please enter a valid 10-digit mobile number starting with 6-9"
                        required
                        value={formData.phone}
                        className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 shadow-sm transition-all"
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="relative">
                      <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        name="yearBranch"
                        placeholder="Year & Branch (e.g. 2nd Yr Computer)"
                        value={formData.yearBranch}
                        className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 shadow-sm transition-all"
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="password"
                        name="password"
                        placeholder="Create Password (min. 6 chars)"
                        required
                        value={formData.password}
                        className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-800 shadow-sm transition-all"
                        onChange={handleInputChange}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98] disabled:opacity-50"
                    >
                      {isLoading ? 'Sending OTP...' : <><UserPlus size={20} /> Register Student</>}
                    </button>
                  </div>
                ) : (
                  <div className="animate-in fade-in zoom-in-95">
                    <div className="flex justify-between mb-6 relative">
                      <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 -translate-y-1/2 rounded"></div>
                      <div className={`absolute top-1/2 left-0 h-1 bg-orange-500 -z-10 -translate-y-1/2 rounded transition-all duration-300 ${step === 1 ? 'w-0' : step === 2 ? 'w-1/2' : 'w-full'}`}></div>
                      {[1, 2, 3].map((num) => (
                        <div
                          key={num}
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors duration-300 ${step >= num ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-300 text-slate-400'}`}
                        >
                          {step > num ? <CheckCircle2 size={16} /> : num}
                        </div>
                      ))}
                    </div>

                    {step === 1 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="text"
                            name="name"
                            placeholder="Owner Full Name"
                            required
                            className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-slate-800 shadow-sm"
                            onChange={handleInputChange}
                            value={formData.name}
                          />
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="email"
                            name="email"
                            placeholder="Owner Email Address"
                            autoComplete="email"
                            required
                            className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-slate-800 shadow-sm"
                            onChange={handleInputChange}
                            value={formData.email}
                          />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="tel"
                            name="phone"
                            placeholder="Mobile Number (for student contact)"
                            maxLength="10"
                            pattern="[6-9][0-9]{9}"
                            title="Please enter a valid 10-digit mobile number starting with 6-9"
                            required
                            className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-slate-800 shadow-sm"
                            onChange={handleInputChange}
                            value={formData.phone}
                          />
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="password"
                            name="password"
                            placeholder="Create Password (min. 6 chars)"
                            required
                            className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-slate-800 shadow-sm"
                            onChange={handleInputChange}
                            value={formData.password}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={nextStep}
                          className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all"
                        >
                          Next Step <ChevronRight size={20} />
                        </button>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="relative">
                          <ChefHat className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="text"
                            name="messName"
                            placeholder="Mess Name"
                            required
                            className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-slate-800 shadow-sm"
                            onChange={handleInputChange}
                            value={formData.messName}
                          />
                        </div>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="text"
                            name="messAddress"
                            placeholder="Full Address / Landmark"
                            required
                            className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-slate-800 shadow-sm"
                            onChange={handleInputChange}
                            value={formData.messAddress}
                          />
                        </div>
                        <button
                          type="button"
                          disabled={isGettingLocation}
                          onClick={() => {
                            setIsGettingLocation(true);
                            navigator.geolocation.getCurrentPosition(
                              (pos) => {
                                setFormData(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
                                setIsGettingLocation(false);
                              },
                              () => setIsGettingLocation(false),
                              { enableHighAccuracy: true, timeout: 10000 }
                            );
                          }}
                          className="w-full bg-indigo-50 text-indigo-600 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-50 text-sm"
                        >
                          <MapPin size={16} />
                          {formData.latitude
                            ? `✅ Location captured (${formData.latitude.toFixed(4)}, ${formData.longitude.toFixed(4)})`
                            : isGettingLocation
                            ? 'Detecting...'
                            : '📍 Use My Current Location (Optional)'}
                        </button>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={prevStep}
                            className="w-1/3 bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl flex items-center justify-center hover:bg-slate-300 transition-colors"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button
                            type="button"
                            onClick={nextStep}
                            className="w-2/3 bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all"
                          >
                            Next Step <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="relative">
                          <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="text"
                            name="fssaiNumber"
                            placeholder="FSSAI License Number (Optional)"
                            className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:border-orange-500 font-bold text-slate-800 shadow-sm"
                            onChange={handleInputChange}
                            value={formData.fssaiNumber}
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={prevStep}
                            className="w-1/3 bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl flex items-center justify-center hover:bg-slate-300 transition-colors"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-2/3 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 hover:shadow-orange-500/30 active:scale-[0.98] transition-all"
                          >
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
        )}

        {/* --- FOOTER MODE TOGGLE --- */}
        {authMode !== 'verifyOtp' && (
          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setError('');
                setResendSuccess('');
                setStep(1);
              }}
              className="text-sm font-extrabold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {authMode === 'login'
                ? "Don't have an account? Sign up here"
                : "Already have an account? Sign in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;