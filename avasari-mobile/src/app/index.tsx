import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, SafeAreaView, Platform, StatusBar, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';

const API_URL = 'http://192.168.0.101:3000'; // ⚠️ IP CONFIGURED

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('student');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '', phone: '', password: '', yearBranch: '', messName: '', messAddress: '', fssaiNumber: '', latitude: null, longitude: null,
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleInputChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

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

    // STRICT PHONE VALIDATION (10 digits, starts with 6,7,8,9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      setIsLoading(false);
      return;
    }

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
        // Save JWT to AsyncStorage for Mobile
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
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Feather name={isLogin ? "log-in" : "user-plus"} size={28} color="#4f46e5" />
            </View>
            <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Join AvasariConnect'}</Text>
            <Text style={styles.subtitle}>Your campus dining and living network</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {isLogin ? (
            <View style={styles.formGroup}>
              <View style={styles.inputWrapper}>
                <Feather name="phone" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number (e.g. 9876543210)"
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
              {/* ROLE SELECTOR */}
              <View style={styles.roleToggleRow}>
                <TouchableOpacity style={[styles.roleBtn, role === 'student' && styles.roleBtnActive]} onPress={() => setRole('student')}>
                  <Text style={[styles.roleBtnText, role === 'student' && styles.roleBtnTextActive]}>Student</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.roleBtn, role === 'owner' && styles.roleBtnActive]} onPress={() => setRole('owner')}>
                  <Text style={[styles.roleBtnText, role === 'owner' && styles.roleBtnTextActive]}>Mess Owner</Text>
                </TouchableOpacity>
              </View>

              {role === 'student' ? (
                <View style={styles.formGroup}>
                  <View style={styles.inputWrapper}>
                    <Feather name="user" size={18} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#94a3b8" value={formData.name} onChangeText={(val) => handleInputChange('name', val)} />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Feather name="phone" size={18} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Mobile Number" placeholderTextColor="#94a3b8" keyboardType="phone-pad" maxLength={10} value={formData.phone} onChangeText={(val) => handleInputChange('phone', val)} />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Feather name="book" size={18} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Year & Branch (e.g. 2nd Yr Computer)" placeholderTextColor="#94a3b8" value={formData.yearBranch} onChangeText={(val) => handleInputChange('yearBranch', val)} />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Feather name="lock" size={18} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="Create Password" placeholderTextColor="#94a3b8" secureTextEntry value={formData.password} onChangeText={(val) => handleInputChange('password', val)} />
                  </View>

                  <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Register Student</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  {/* STEPPER INDICATOR */}
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
                        <TextInput style={styles.input} placeholder="Owner Full Name" placeholderTextColor="#94a3b8" value={formData.name} onChangeText={(val) => handleInputChange('name', val)} />
                      </View>
                      <View style={styles.inputWrapper}>
                        <Feather name="phone" size={18} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput style={styles.input} placeholder="Mobile Number" placeholderTextColor="#94a3b8" keyboardType="phone-pad" maxLength={10} value={formData.phone} onChangeText={(val) => handleInputChange('phone', val)} />
                      </View>
                      <View style={styles.inputWrapper}>
                        <Feather name="lock" size={18} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput style={styles.input} placeholder="Create Password" placeholderTextColor="#94a3b8" secureTextEntry value={formData.password} onChangeText={(val) => handleInputChange('password', val)} />
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
                        <TextInput style={styles.input} placeholder="Mess Name" placeholderTextColor="#94a3b8" value={formData.messName} onChangeText={(val) => handleInputChange('messName', val)} />
                      </View>
                      <View style={styles.inputWrapper}>
                        <Feather name="map-pin" size={18} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput style={styles.input} placeholder="Full Address / Landmark" placeholderTextColor="#94a3b8" value={formData.messAddress} onChangeText={(val) => handleInputChange('messAddress', val)} />
                      </View>

                      <TouchableOpacity style={styles.locationBtn} onPress={handleLocationCapture} disabled={isGettingLocation}>
                        <Feather name="map-pin" size={16} color="#4f46e5" />
                        <Text style={styles.locationBtnText}>
                          {formData.latitude ? `✅ Location captured` : isGettingLocation ? 'Detecting...' : '📍 Use Current Location'}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.stepBtnRow}>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={prevStep}><Feather name="chevron-left" size={18} color="#334155" /></TouchableOpacity>
                        <TouchableOpacity style={[styles.blackBtn, { flex: 1 }]} onPress={nextStep}><Text style={styles.blackBtnText}>Next Step</Text></TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {step === 3 && (
                    <View style={styles.formGroup}>
                      <View style={styles.inputWrapper}>
                        <Feather name="file-text" size={18} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput style={styles.input} placeholder="FSSAI License (Optional)" placeholderTextColor="#94a3b8" value={formData.fssaiNumber} onChangeText={(val) => handleInputChange('fssaiNumber', val)} />
                      </View>

                      <View style={styles.stepBtnRow}>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={prevStep}><Feather name="chevron-left" size={18} color="#334155" /></TouchableOpacity>
                        <TouchableOpacity style={[styles.primaryBtn, { flex: 1, backgroundColor: '#f97316' }]} onPress={handleSubmit} disabled={isLoading}>
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
            <TouchableOpacity onPress={() => { setIsLogin(!isLogin); setError(''); setStep(1); }}>
              <Text style={styles.footerText}>
                {isLogin ? "Don't have an account? Sign up here" : "Already have an account? Sign in"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#ffffff', width: '100%', maxWidth: 400, borderRadius: 32, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 6 },
  header: { alignItems: 'center', marginBottom: 24 },
  iconCircle: { backgroundColor: '#e0e7ff', padding: 16, borderRadius: 20, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4, textAlign: 'center' },

  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 12, marginBottom: 16, gap: 8 },
  errorText: { color: '#dc2626', fontSize: 13, fontWeight: 'bold', flex: 1 },

  formGroup: { gap: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, fontWeight: 'bold', color: '#0f172a' },

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