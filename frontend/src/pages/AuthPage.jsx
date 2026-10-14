import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, UserPlus, ChevronRight, ChevronLeft,
  User, Phone, Lock, BookOpen, ChefHat, Mail, KeyRound,
  MapPin, FileText, CheckCircle2, AlertCircle, LogIn, RefreshCw, ArrowLeft
} from 'lucide-react';

import { API_URL } from '../utils/config';

const AuthPage = () => {
  const navigate = useNavigate();
  // UI Mode: 'login' | 'register' | 'verifyOtp'
  const [authMode, setAuthMode] = useState('login');
  const [role, setRole] = useState('student');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

  const [otp, setOtp] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    setError('');
    // Step 1 validation for mess owner
    if (step === 1) {
      if (!formData.name.trim()) {
        setError('Owner full name is required.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setError('Please enter a valid email address.');
        return;
      }
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        setError('Please enter a valid 10-digit Indian mobile number.');
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        setError('Password must be at least 6 characters.');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    if (authMode === 'login') {
      try {
        const response = await fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email.trim(),
            password: formData.password,
          }),
        });
        const data = await response.json();

        if (response.status === 403 && data.unverified) {
          // Email not verified yet -> jump directly to verify OTP screen
          setAuthMode('verifyOtp');
          setSuccessMsg(data.error || 'Email not verified. An OTP has been sent to your email.');
          return;
        }

        if (response.ok) {
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
    } else if (authMode === 'register') {
      // Validate phone number
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        setError('Please enter a valid 10-digit Indian mobile number.');
        setIsLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters.');
        setIsLoading(false);
        return;
      }

      const payload = {
        ...formData,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role,
      };

      try {
        const response = await fetch(`${API_URL}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (response.ok) {
          setAuthMode('verifyOtp');
          setSuccessMsg(data.message || 'OTP sent! Please check your email.');
        } else {
          setError(data.error || 'Registration failed');
        }
      } catch (err) {
        setError('Cannot connect to server. Ensure backend is running.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          otp: otp.trim(),
        }),
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        if (data.user.role === 'admin') navigate('/admin', { state: { user: data.user } });
        else if (data.user.role === 'owner') navigate('/owner', { state: { user: data.user } });
        else navigate('/student', { state: { user: data.user } });
      } else {
        setError(data.error || 'OTP verification failed');
      }
    } catch (err) {
      setError('Cannot connect to server. Ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!formData.email.trim()) {
      setError('Please enter your email address to resend OTP.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setIsResending(true);

    try {
      const response = await fetch(`${API_URL}/api/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim() }),
      });
      const data = await response.json();

      if (response.ok) {
        setSuccessMsg(data.message || 'A fresh verification OTP has been sent to your email.');
      } else {
        setError(data.error || 'Failed to resend OTP.');
      }
    } catch (err) {
      setError('Failed to contact server to resend OTP.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 font-sans relative z-10">
      <div className="bg-white/70 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-white/80 w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        <div className="text-center mb-8 mt-2">
          <div className="inline-flex bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-[2rem] mb-4 shadow-inner border border-white">
            {authMode === 'verifyOtp' ? (
              <KeyRound size={36} className="text-indigo-600 animate-pulse" />
            ) : authMode === 'login' ? (
              <LogIn size={36} className="text-indigo-600" />
            ) : (
              <UserPlus size={36} className="text-purple-600" />
            )}
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {authMode === 'verifyOtp' ? 'Verify Email' : authMode === 'login' ? 'Welcome Back' : 'Join AvasariConnect'}
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1">
            {authMode === 'verifyOtp'
              ? `Enter the 6-digit code sent to ${formData.email || 'your email'}`
              : 'Your campus dining and living network'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-2xl mb-6 flex items-center gap-2 text-sm font-semibold border border-red-100 animate-in fade-in">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-2xl mb-6 flex items-center gap-2 text-sm font-semibold border border-emerald-100 animate-in fade-in">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" /> {successMsg}
          </div>
        )}

        {/* ----------------- OTP VERIFICATION STEP ----------------- */}
        {authMode === 'verifyOtp' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                6-Digit OTP Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  inputMode="numeric"
                  name="otp"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  className="w-full pl-11 pr-5 py-4 text-center tracking-[0.5em] font-mono text-2xl font-black rounded-2xl bg-white/80 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 shadow-sm transition-all"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                OTP valid for 10 minutes. Check your spam/junk folder if not visible.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : <><ShieldCheck size={20} /> Verify & Access Account</>}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending}
                className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
                {isResending ? 'Resending...' : 'Resend Code'}
              </button>
            </div>
          </form>
        ) : (
          /* ----------------- LOGIN & REGISTRATION FORMS ----------------- */
          <form onSubmit={handleSubmit} className="space-y-5">
            {authMode === 'login' ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      name="email"
                      placeholder="student@example.com"
                      required
                      value={formData.email}
                      className="w-full pl-11 pr-5 py-4 rounded-2xl bg-white/60 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-800 shadow-sm transition-all"
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Password
                  </label>
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
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      role === 'student'
                        ? 'bg-white shadow-sm text-indigo-600 scale-100'
                        : 'text-slate-500 hover:text-slate-700 scale-95 hover:scale-100'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRole('owner'); setError(''); }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      role === 'owner'
                        ? 'bg-white shadow-sm text-purple-600 scale-100'
                        : 'text-slate-500 hover:text-slate-700 scale-95 hover:scale-100'
                    }`}
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
                        placeholder="Email Address (Login ID)"
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
                        placeholder="Mobile Number (Contact for Ride Pools & Mess)"
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
                        placeholder="Create Password"
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
                      <div
                        className={`absolute top-1/2 left-0 h-1 bg-orange-500 -z-10 -translate-y-1/2 rounded transition-all duration-300 ${
                          step === 1 ? 'w-0' : step === 2 ? 'w-1/2' : 'w-full'
                        }`}
                      ></div>
                      {[1, 2, 3].map((num) => (
                        <div
                          key={num}
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors duration-300 ${
                            step >= num
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'bg-white border-slate-300 text-slate-400'
                          }`}
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
                            placeholder="Email Address (Login ID)"
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
                            placeholder="Mobile Number (Direct Contact)"
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
                            placeholder="Create Password"
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
                                setFormData((prev) => ({
                                  ...prev,
                                  latitude: pos.coords.latitude,
                                  longitude: pos.coords.longitude,
                                }));
                                setIsGettingLocation(false);
                              },
                              () => setIsGettingLocation(false),
                              { enableHighAccuracy: true, timeout: 10000 }
                            );
                          }}
                          className="w-full bg-indigo-50 text-indigo-600 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-50 text-sm"
                        >
                          <MapPin size={16} />{' '}
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
                            {isLoading ? 'Submitting...' : <><ShieldCheck size={20} /> Complete Registration</>}
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

        {/* Bottom toggle between Login and Register */}
        {authMode !== 'verifyOtp' && (
          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setError('');
                setSuccessMsg('');
                setStep(1);
              }}
              className="text-sm font-extrabold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {authMode === 'login'
                ? "Don't have an account? Sign up here"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;