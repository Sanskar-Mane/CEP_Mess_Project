import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { API_URL } from '@/constants/config';

export default function AuthScreen() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 'login' | 'register' | 'verifyOtp'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'verifyOtp'>('login');
  const [role, setRole] = useState<'student' | 'owner'>('student');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [otp, setOtp] = useState('');
  const [otpEmail, setOtpEmail] = useState('');

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Cooldown countdown for resend OTP
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const response = await fetch(`${API_URL}/api/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const user = await response.json();
            if (user?.role === 'admin') {
              router.replace('/admin');
              return;
            } else if (user?.role === 'owner') {
              router.replace('/owner');
              return;
            } else {
              router.replace('/student');
              return;
            }
          } else {
            await AsyncStorage.removeItem('token');
          }
        }
      } catch (err) {
        // Network or server error - fallback to login screen
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    yearBranch: '',
    messName: '',
    messAddress: '',
    fssaiNumber: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    setError('');
    if (step === 1) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!formData.name.trim()) {
        setError('Owner full name is required.');
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

  const handleLocationCapture = async () => {
    setIsGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to detect coordinates.');
        setIsGettingLocation(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setFormData(prev => ({ ...prev, latitude: location.coords.latitude, longitude: location.coords.longitude }));
      Alert.alert('Success', 'GPS coordinates captured successfully!');
    } catch (err) {
      Alert.alert('Error', 'Could not fetch current location.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const routeUser = (user: { role: string }) => {
    if (user.role === 'admin') router.replace('/admin');
    else if (user.role === 'owner') router.replace('/owner');
    else router.replace('/student');
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

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
        setError('Password must be at least 6 characters.');
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
        // Needs OTP Verification
        setOtpEmail(data.email || cleanEmail);
        setOtp('');
        setAuthMode('verifyOtp');
        setResendCooldown(60);
        animateTransition();
        setError('Your email is not verified. An OTP has been sent to your email.');
        return;
      }

      if (response.ok) {
        if (authMode === 'register') {
          setOtpEmail(data.email || cleanEmail);
          setOtp('');
          setAuthMode('verifyOtp');
          setResendCooldown(60);
          animateTransition();
        } else {
          await AsyncStorage.setItem('token', data.token);
          routeUser(data.user);
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

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP sent to your email.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const targetEmail = (otpEmail || formData.email).trim().toLowerCase();
      const response = await fetch(`${API_URL}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, otp: otp.trim() }),
      });
      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('token', data.token);
        routeUser(data.user);
      } else {
        setError(data.error || 'Invalid or expired OTP code.');
      }
    } catch (err) {
      setError('Failed to reach server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError('');
    setSuccessMsg('');

    try {
      const targetEmail = (otpEmail || formData.email).trim().toLowerCase();
      const response = await fetch(`${API_URL}/api/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await response.json();

      if (response.ok) {
        setSuccessMsg('A new OTP has been dispatched to your email.');
        setResendCooldown(60);
      } else {
        setError(data.error || 'Unable to resend OTP at this moment.');
      }
    } catch (err) {
      setError('Failed to contact server. Ensure backend is active.');
    } finally {
      setIsResending(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <View style={styles.iconCircle}>
              <Feather name="coffee" size={32} color="#4f46e5" />
            </View>
            <Text style={styles.title}>AvasariConnect</Text>
            <Text style={styles.subtitle}>Checking your campus session...</Text>
            <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 24 }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.card}>
          {authMode === 'verifyOtp' ? (
            /* --- OTP VERIFICATION SCREEN (ANIMATED) --- */
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <View style={styles.header}>
                <View style={[styles.iconCircle, { backgroundColor: '#e0e7ff' }]}>
                  <Feather name="shield" size={28} color="#4f46e5" />
                </View>
                <Text style={styles.title}>Verify Your Email</Text>
                <Text style={styles.subtitle}>
                  Enter the 6-digit code sent to{'\n'}
                  <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>{otpEmail || formData.email}</Text>
                </Text>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={16} color="#dc2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {successMsg ? (
                <View style={styles.successBox}>
                  <Feather name="check-circle" size={16} color="#16a34a" />
                  <Text style={styles.successText}>{successMsg}</Text>
                </View>
              ) : null}

              <View style={styles.formGroup}>
                <TextInput
                  style={styles.otpInput}
                  placeholder="••••••"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(val) => setOtp(val.replace(/\D/g, ''))}
                  autoFocus
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, { opacity: otp.length === 6 ? 1 : 0.6 }]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify Account</Text>}
                </TouchableOpacity>

                <View style={styles.otpActionRow}>
                  <TouchableOpacity
                    onPress={() => { setAuthMode('login'); setError(''); setSuccessMsg(''); }}
                    style={styles.backLink}
                  >
                    <Feather name="arrow-left" size={14} color="#64748b" />
                    <Text style={styles.backLinkText}>Back to Sign In</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={resendCooldown > 0 || isResending}
                  >
                    <Text style={[styles.resendLinkText, resendCooldown > 0 && { color: '#94a3b8' }]}>
                      {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          ) : (
            /* --- LOGIN & REGISTRATION SCREEN --- */
            <View>
              <View style={styles.header}>
                <View style={styles.iconCircle}>
                  <Feather name={authMode === 'login' ? "log-in" : "user-plus"} size={28} color="#4f46e5" />
                </View>
                <Text style={styles.title}>{authMode === 'login' ? 'Welcome Back' : 'Join AvasariConnect'}</Text>
                <Text style={styles.subtitle}>Your campus dining and living network</Text>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={16} color="#dc2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {authMode === 'login' ? (
                <View style={styles.formGroup}>
                  <View style={styles.inputWrapper}>
                    <Feather name="mail" size={18} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email Address (e.g. user@gmail.com)"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={formData.email}
                      onChangeText={(val) => handleInputChange('email', val)}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Feather name="lock" size={18} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry
                      value={formData.password}
                      onChangeText={(val) => handleInputChange('password', val)}
                    />
                  </View>

                  <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.formGroup}>
                  <View style={styles.roleToggleRow}>
                    <TouchableOpacity
                      style={[styles.roleBtn, role === 'student' && styles.roleBtnActive]}
                      onPress={() => { setRole('student'); setError(''); }}
                    >
                      <Text style={[styles.roleBtnText, role === 'student' && styles.roleBtnTextActive]}>Student</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.roleBtn, role === 'owner' && styles.roleBtnActive]}
                      onPress={() => { setRole('owner'); setError(''); }}
                    >
                      <Text style={[styles.roleBtnText, role === 'owner' && styles.roleBtnTextActive]}>Mess Owner</Text>
                    </TouchableOpacity>
                  </View>

                  {role === 'student' ? (
                    <View style={styles.formGroup}>
                      <View style={styles.inputWrapper}>
                        <Feather name="user" size={18} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Full Name"
                          placeholderTextColor="#94a3b8"
                          value={formData.name}
                          onChangeText={(val) => handleInputChange('name', val)}
                        />
                      </View>

                      <View style={styles.inputWrapper}>
                        <Feather name="mail" size={18} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="College Email Address"
                          placeholderTextColor="#94a3b8"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          value={formData.email}
                          onChangeText={(val) => handleInputChange('email', val)}
                        />
                      </View>

                      <View style={styles.inputWrapper}>
                        <Feather name="phone" size={18} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Mobile Number (for rides & contacts)"
                          placeholderTextColor="#94a3b8"
                          keyboardType="phone-pad"
                          maxLength={10}
                          value={formData.phone}
                          onChangeText={(val) => handleInputChange('phone', val)}
                        />
                      </View>

                      <View style={styles.inputWrapper}>
                        <Feather name="book" size={18} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Year & Branch (e.g. 2nd Yr Computer)"
                          placeholderTextColor="#94a3b8"
                          value={formData.yearBranch}
                          onChangeText={(val) => handleInputChange('yearBranch', val)}
                        />
                      </View>

                      <View style={styles.inputWrapper}>
                        <Feather name="lock" size={18} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Create Password (min. 6 chars)"
                          placeholderTextColor="#94a3b8"
                          secureTextEntry
                          value={formData.password}
                          onChangeText={(val) => handleInputChange('password', val)}
                        />
                      </View>

                      <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={isLoading}>
                        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Register Student</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.stepperRow}>
                        {[1, 2, 3].map((num) => (
                          <View key={num} style={[styles.stepCircle, step >= num && styles.stepCircleActive]}>
                            <Text style={[styles.stepText, step >= num && styles.stepTextActive]}>{num}</Text>
                          </View>
                        ))}
                      </View>

                      {step === 1 && (
                        <View style={styles.formGroup}>
                          <View style={styles.inputWrapper}>
                            <Feather name="user" size={18} color="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                              style={styles.input}
                              placeholder="Owner Full Name"
                              placeholderTextColor="#94a3b8"
                              value={formData.name}
                              onChangeText={(val) => handleInputChange('name', val)}
                            />
                          </View>
                          <View style={styles.inputWrapper}>
                            <Feather name="mail" size={18} color="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                              style={styles.input}
                              placeholder="Owner Email Address"
                              placeholderTextColor="#94a3b8"
                              keyboardType="email-address"
                              autoCapitalize="none"
                              autoCorrect={false}
                              value={formData.email}
                              onChangeText={(val) => handleInputChange('email', val)}
                            />
                          </View>
                          <View style={styles.inputWrapper}>
                            <Feather name="phone" size={18} color="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                              style={styles.input}
                              placeholder="Mobile Number (for student contact)"
                              placeholderTextColor="#94a3b8"
                              keyboardType="phone-pad"
                              maxLength={10}
                              value={formData.phone}
                              onChangeText={(val) => handleInputChange('phone', val)}
                            />
                          </View>
                          <View style={styles.inputWrapper}>
                            <Feather name="lock" size={18} color="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                              style={styles.input}
                              placeholder="Create Password (min. 6 chars)"
                              placeholderTextColor="#94a3b8"
                              secureTextEntry
                              value={formData.password}
                              onChangeText={(val) => handleInputChange('password', val)}
                            />
                          </View>
                          <TouchableOpacity style={styles.blackBtn} onPress={nextStep}>
                            <Text style={styles.blackBtnText}>Next Step</Text>
                            <Feather name="chevron-right" size={18} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      )}

                      {step === 2 && (
                        <View style={styles.formGroup}>
                          <View style={styles.inputWrapper}>
                            <Feather name="coffee" size={18} color="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                              style={styles.input}
                              placeholder="Mess Name"
                              placeholderTextColor="#94a3b8"
                              value={formData.messName}
                              onChangeText={(val) => handleInputChange('messName', val)}
                            />
                          </View>
                          <View style={styles.inputWrapper}>
                            <Feather name="map-pin" size={18} color="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                              style={styles.input}
                              placeholder="Full Address / Landmark"
                              placeholderTextColor="#94a3b8"
                              value={formData.messAddress}
                              onChangeText={(val) => handleInputChange('messAddress', val)}
                            />
                          </View>

                          <TouchableOpacity style={styles.locationBtn} onPress={handleLocationCapture} disabled={isGettingLocation}>
                            <Feather name="map-pin" size={16} color="#4f46e5" />
                            <Text style={styles.locationBtnText}>
                              {formData.latitude ? `✅ Location captured` : isGettingLocation ? 'Detecting...' : '📍 Use Current Location'}
                            </Text>
                          </TouchableOpacity>

                          <View style={styles.stepBtnRow}>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={prevStep}>
                              <Feather name="chevron-left" size={18} color="#334155" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.blackBtn, { flex: 1 }]} onPress={nextStep}>
                              <Text style={styles.blackBtnText}>Next Step</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {step === 3 && (
                        <View style={styles.formGroup}>
                          <View style={styles.inputWrapper}>
                            <Feather name="file-text" size={18} color="#94a3b8" style={styles.inputIcon} />
                            <TextInput
                              style={styles.input}
                              placeholder="FSSAI License (Optional)"
                              placeholderTextColor="#94a3b8"
                              value={formData.fssaiNumber}
                              onChangeText={(val) => handleInputChange('fssaiNumber', val)}
                            />
                          </View>

                          <View style={styles.stepBtnRow}>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={prevStep}>
                              <Feather name="chevron-left" size={18} color="#334155" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.primaryBtn, { flex: 1, backgroundColor: '#f97316' }]}
                              onPress={handleSubmit}
                              disabled={isLoading}
                            >
                              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Complete Registration</Text>}
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.footer}>
                <TouchableOpacity onPress={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); setSuccessMsg(''); setStep(1); }}>
                  <Text style={styles.footerText}>
                    {authMode === 'login' ? "Don't have an account? Sign up here" : "Already have an account? Sign in"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingCard: { backgroundColor: '#ffffff', width: '100%', maxWidth: 360, borderRadius: 28, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 6 },
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#ffffff', width: '100%', maxWidth: 400, borderRadius: 32, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 6 },
  header: { alignItems: 'center', marginBottom: 24 },
  iconCircle: { backgroundColor: '#e0e7ff', padding: 16, borderRadius: 20, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4, textAlign: 'center', lineHeight: 18 },

  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 12, marginBottom: 16, gap: 8 },
  errorText: { color: '#dc2626', fontSize: 13, fontWeight: 'bold', flex: 1 },

  successBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', padding: 12, borderRadius: 12, marginBottom: 16, gap: 8 },
  successText: { color: '#16a34a', fontSize: 13, fontWeight: 'bold', flex: 1 },

  formGroup: { gap: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, fontWeight: 'bold', color: '#0f172a' },

  otpInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#c7d2fe',
    borderRadius: 18,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: '900',
    color: '#1e1b4b',
    textAlign: 'center',
    letterSpacing: 10,
  },
  otpActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748b',
  },
  resendLinkText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4f46e5',
  },

  primaryBtn: { backgroundColor: '#4f46e5', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },

  roleToggleRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 14, padding: 4, marginBottom: 8 },
  roleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  roleBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  roleBtnText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  roleBtnTextActive: { color: '#4f46e5' },

  stepperRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  stepCircleActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  stepText: { fontSize: 13, fontWeight: 'bold', color: '#94a3b8' },
  stepTextActive: { color: '#fff' },

  blackBtn: { backgroundColor: '#0f172a', paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  blackBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  secondaryBtn: { width: 60, backgroundColor: '#e2e8f0', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  stepBtnRow: { flexDirection: 'row', gap: 12 },

  locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0e7ff', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#c7d2fe', gap: 8 },
  locationBtnText: { color: '#4338ca', fontWeight: 'bold', fontSize: 13 },

  footer: { marginTop: 24, alignItems: 'center', borderTopWidth: 1, borderColor: '#f1f5f9', paddingTop: 16 },
  footerText: { fontSize: 13, fontWeight: 'bold', color: '#4f46e5' }
});