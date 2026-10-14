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
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { API_URL } from '@/constants/config';

export default function AuthScreen() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [role, setRole] = useState('student');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');

  // Smooth transition animation for OTP screen
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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
    setFormData({ ...formData, [name]: value });
  };

  const showOtpScreen = () => {
    setIsVerifyingOtp(true);
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideOtpScreen = () => {
    setIsVerifyingOtp(false);
    setError('');
  };

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!formData.name.trim()) {
        setError('Owner name is required.');
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

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    if (isLogin) {
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
          Alert.alert('Verification Required', 'Your email is not verified yet. A 6-digit OTP has been sent to your email.');
          showOtpScreen();
          return;
        }

        if (response.ok) {
          await AsyncStorage.setItem('token', data.token);
          if (data.user.role === 'admin') router.replace('/admin');
          else if (data.user.role === 'owner') router.replace('/owner');
          else router.replace('/student');
        } else {
          setError(data.error || 'Authentication failed');
        }
      } catch (err) {
        setError('Cannot connect to server. Ensure backend is running.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // STRICT PHONE VALIDATION (10 digits, starts with 6,7,8,9)
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
          Alert.alert('OTP Sent', `A 6-digit verification code was sent to ${formData.email.trim()}.`);
          showOtpScreen();
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

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    setError('');

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
        await AsyncStorage.setItem('token', data.token);
        if (data.user.role === 'admin') router.replace('/admin');
        else if (data.user.role === 'owner') router.replace('/owner');
        else router.replace('/student');
      } else {
        setError(data.error || 'Invalid OTP code.');
      }
    } catch (err) {
      setError('Cannot connect to server. Ensure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email to resend OTP.');
      return;
    }

    setIsResending(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'A new verification code has been sent to your email.');
      } else {
        setError(data.error || 'Failed to resend OTP.');
      }
    } catch (err) {
      setError('Could not connect to server.');
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
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Feather
                name={isVerifyingOtp ? "shield" : isLogin ? "log-in" : "user-plus"}
                size={28}
                color="#4f46e5"
              />
            </View>
            <Text style={styles.title}>
              {isVerifyingOtp ? 'Verify Account' : isLogin ? 'Welcome Back' : 'Join AvasariConnect'}
            </Text>
            <Text style={styles.subtitle}>
              {isVerifyingOtp
                ? `Enter 6-digit OTP sent to\n${formData.email || 'your email'}`
                : 'Your campus dining and living network'}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* ------------------ OTP SCREEN WITH ANIMATED VIEW ------------------ */}
          {isVerifyingOtp ? (
            <Animated.View
              style={[
                styles.formGroup,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.otpInputWrapper}>
                <Feather name="key" size={20} color="#4f46e5" style={styles.inputIcon} />
                <TextInput
                  style={styles.otpInput}
                  placeholder="000000"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(val) => setOtp(val.replace(/\D/g, ''))}
                  autoFocus
                />
              </View>

              <Text style={styles.otpHelperText}>
                Code expires in 10 minutes. Check spam folder if necessary.
              </Text>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleVerifyOtp}
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify Account</Text>
                )}
              </TouchableOpacity>

              <View style={styles.otpActionRow}>
                <TouchableOpacity onPress={hideOtpScreen} style={styles.textActionBtn}>
                  <Feather name="arrow-left" size={14} color="#64748b" />
                  <Text style={styles.textActionText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={isResending}
                  style={styles.textActionBtn}
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color="#4f46e5" />
                  ) : (
                    <>
                      <Feather name="refresh-cw" size={14} color="#4f46e5" />
                      <Text style={[styles.textActionText, { color: '#4f46e5', fontWeight: 'bold' }]}>
                        Resend Code
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : isLogin ? (
            /* ------------------ LOGIN SCREEN ------------------ */
            <View style={styles.formGroup}>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
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
            /* ------------------ REGISTRATION SCREENS ------------------ */
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
                      placeholder="Email Address (Login ID)"
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
                      placeholder="Mobile Number (Direct Contact)"
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
                      placeholder="Create Password"
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
                          placeholder="Email Address (Login ID)"
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
                          placeholder="Mobile Number (Direct Contact)"
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
                          placeholder="Create Password"
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

                      <TouchableOpacity
                        style={styles.locationBtn}
                        onPress={handleLocationCapture}
                        disabled={isGettingLocation}
                      >
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
                          {isLoading ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.primaryBtnText}>Complete Registration</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Bottom toggle between Login and Sign Up */}
          {!isVerifyingOtp && (
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setStep(1);
                }}
              >
                <Text style={styles.footerText}>
                  {isLogin ? "Don't have an account? Sign up here" : "Already have an account? Sign in"}
                </Text>
              </TouchableOpacity>
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

  formGroup: { gap: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, fontWeight: 'bold', color: '#0f172a' },

  otpInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 4
  },
  otpInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 10,
    textAlign: 'center',
    color: '#312e81',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  otpHelperText: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: -4 },
  otpActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 },
  textActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 6 },
  textActionText: { fontSize: 13, color: '#64748b', fontWeight: '600' },

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