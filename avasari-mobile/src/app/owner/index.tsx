import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, Alert, TextInput, Modal, SafeAreaView, Platform, StatusBar, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';

const API_URL = 'http://192.168.0.101:3000'; // ⚠️ IP CONFIGURED

const getLocalDateString = (offsetDays = 0) => {
    const d = new Date(); d.setDate(d.getDate() + offsetDays);
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

export default function OwnerDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false); // <-- Pull-to-refresh state

    // Publish Form State
    const [menuDate, setMenuDate] = useState(getLocalDateString(0));
    const [menuShift, setMenuShift] = useState('morning');
    const [menuItems, setMenuItems] = useState('');
    const [price, setPrice] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    // Analytics & Members State
    const [analyticsShift, setAnalyticsShift] = useState('morning');
    const [stats, setStats] = useState({ morning: { coming: 0, notComing: 0 }, night: { coming: 0, notComing: 0 } });
    const [historyData, setHistoryData] = useState([]);
    const [members, setMembers] = useState([]);

    // Location State
    const [isSettingLocation, setIsSettingLocation] = useState(false);
    const [savedLocation, setSavedLocation] = useState(null);

    // Native Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({ type: '', subId: '', title: '', placeholder: '' });
    const [modalInput, setModalInput] = useState('');

    const displayDate = new Date(menuDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    // 1. Authenticate User
    useEffect(() => {
        const fetchUser = async () => {
            const token = await AsyncStorage.getItem('token');
            if (!token) { router.replace('/'); return; }
            try {
                const res = await fetch(`${API_URL}/api/me`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) {
                    const data = await res.json();
                    if (data.role !== 'owner') router.replace('/');
                    else {
                        setUser(data);
                        if (data.location && data.location.coordinates && data.location.coordinates[0] !== 0) {
                            setSavedLocation({ lng: data.location.coordinates[0], lat: data.location.coordinates[1] });
                        }
                    }
                } else {
                    await AsyncStorage.removeItem('token'); router.replace('/');
                }
            } catch (e) { console.error(e); }
            finally { setIsAuthLoading(false); }
        };
        fetchUser();
    }, []);

    // 2. Fetch All Data (Used for initial load and Pull-to-Refresh)
    const fetchData = async () => {
        if (!user) return;
        const token = await AsyncStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const menuRes = await fetch(`${API_URL}/api/menus/${menuDate}`, { headers });
            if (menuRes.ok) {
                const menus = await menuRes.json();
                const myMenu = menus.find(m => (m.ownerId._id === user._id || m.ownerId === user._id) && m.shift === menuShift);
                if (myMenu) { setMenuItems(myMenu.items.join(', ')); setPrice(myMenu.price.toString()); }
                else { setMenuItems(''); setPrice(''); }
            }
            await fetchLiveStats(headers);
        } catch (e) { console.error(e); }
    };

    // 3. Fetch ONLY Live Stats (Used for background polling so we don't erase your typing)
    const fetchLiveStats = async (headers) => {
        try {
            const statsRes = await fetch(`${API_URL}/api/attendance/stats/${encodeURIComponent(user.messName || 'Partner Mess')}/${menuDate}`, { headers });
            if (statsRes.ok) setStats(await statsRes.json());

            const memRes = await fetch(`${API_URL}/api/subscriptions/mess`, { headers });
            if (memRes.ok) setMembers(await memRes.json());
        } catch (e) { console.error(e); }
    };

    // --- REAL-TIME ENGINE ---
    useEffect(() => {
        fetchData(); // Load everything when tab/date changes

        // Polling: Silently fetch live stats every 5 seconds
        const interval = setInterval(async () => {
            const token = await AsyncStorage.getItem('token');
            if (token) fetchLiveStats({ 'Authorization': `Bearer ${token}` });
        }, 5000);

        return () => clearInterval(interval); // Clean up on unmount
    }, [menuDate, menuShift, user]);

    // Pull-to-Refresh Handler
    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, [menuDate, menuShift, user]);

    const handleLogout = async () => {
        await AsyncStorage.removeItem('token');
        router.replace('/');
    };

    const handlePublishMenu = async () => {
        if (!menuItems || !price) { Alert.alert("Error", "Please fill all fields"); return; }
        setIsPublishing(true);
        const token = await AsyncStorage.getItem('token');
        const itemsArray = menuItems.split(',').map(item => item.trim()).filter(Boolean);

        try {
            const response = await fetch(`${API_URL}/api/menus`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ messName: user.messName || 'Mess', date: menuDate, shift: menuShift, items: itemsArray, price: Number(price) })
            });
            if (response.ok) Alert.alert("Success", `Menu published for ${displayDate} (${menuShift})!`);
            else Alert.alert("Error", "Failed to publish menu");
        } catch (error) { Alert.alert("Error", "Network failed"); }
        finally { setIsPublishing(false); fetchData(); }
    };

    const updateSubscription = async (subId, payload) => {
        const token = await AsyncStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/subscriptions/${subId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) fetchLiveStats({ 'Authorization': `Bearer ${token}` });
        } catch (e) { Alert.alert("Error", "Failed to update"); }
    };

    const togglePaymentStatus = (subId, currentStatus) => updateSubscription(subId, { status: currentStatus === 'paid' ? 'pending' : 'paid' });

    const openModal = (type, subId, currentValue, title, placeholder) => {
        setModalConfig({ type, subId, title, placeholder });
        setModalInput(currentValue ? currentValue.toString() : '');
        setModalVisible(true);
    };

    const handleModalSubmit = () => {
        const val = Number(modalInput);
        if (isNaN(val)) { Alert.alert("Error", "Please enter a valid number"); return; }
        if (modalConfig.type === 'fee') updateSubscription(modalConfig.subId, { monthlyFee: val });
        else if (modalConfig.type === 'days') updateSubscription(modalConfig.subId, { extendDays: val });
        else if (modalConfig.type === 'skips') updateSubscription(modalConfig.subId, { allowedSkips: val });
        setModalVisible(false); setModalInput('');
    };

    const handleSetLocation = async () => {
        setIsSettingLocation(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Please allow location access in your phone settings to set your mess location.');
                setIsSettingLocation(false); return;
            }
            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = location.coords;
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/owner/location`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ latitude, longitude })
            });
            if (res.ok) {
                setSavedLocation({ lat: latitude, lng: longitude });
                Alert.alert('Success', 'Your mess location has been updated on the map!');
            } else { Alert.alert('Error', 'Failed to save location.'); }
        } catch (error) { Alert.alert('Error', 'Could not fetch GPS location.'); }
        finally { setIsSettingLocation(false); }
    };

    if (isAuthLoading || !user) return <View style={styles.center}><ActivityIndicator size="large" color="#f97316" /></View>;

    const currentStats = stats[analyticsShift] || { coming: 0, notComing: 0 };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Chef {user.name.split(' ')[0]} 👨‍🍳</Text>
                    <Text style={styles.subtitle}>{user.messName || 'Owner Dashboard'}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Feather name="log-out" size={18} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: 60 }}
                showsVerticalScrollIndicator={false}
                // --- PULL TO REFRESH IMPLEMENTED HERE ---
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4f46e5']} tintColor="#4f46e5" />}
            >

                <View style={styles.dateSelector}>
                    <TouchableOpacity style={[styles.dateBtn, menuDate === getLocalDateString(0) && styles.dateBtnActive]} onPress={() => setMenuDate(getLocalDateString(0))}>
                        <Text style={[styles.dateBtnText, menuDate === getLocalDateString(0) && styles.dateBtnTextActive]}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.dateBtn, menuDate === getLocalDateString(1) && styles.dateBtnActive]} onPress={() => setMenuDate(getLocalDateString(1))}>
                        <Text style={[styles.dateBtnText, menuDate === getLocalDateString(1) && styles.dateBtnTextActive]}>Tomorrow</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Attendance Stats</Text>
                        <View style={styles.shiftToggleRow}>
                            <TouchableOpacity onPress={() => setAnalyticsShift('morning')} style={[styles.shiftBtn, analyticsShift === 'morning' && styles.shiftBtnActive]}>
                                <Text style={[styles.shiftBtnText, analyticsShift === 'morning' && styles.shiftBtnTextActive]}>Morning</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setAnalyticsShift('night')} style={[styles.shiftBtn, analyticsShift === 'night' && styles.shiftBtnActive]}>
                                <Text style={[styles.shiftBtnText, analyticsShift === 'night' && styles.shiftBtnTextActive]}>Night</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={[styles.statCard, { backgroundColor: '#10b981' }]}>
                            <Feather name="users" size={24} color="rgba(255,255,255,0.3)" style={styles.statBgIcon} />
                            <Text style={styles.statLabel}>Coming</Text>
                            <Text style={styles.statValue}>{currentStats.coming}</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' }]}>
                            <Feather name="user-x" size={24} color="rgba(244,63,94,0.1)" style={styles.statBgIcon} />
                            <Text style={[styles.statLabel, { color: '#64748b' }]}>Skipped</Text>
                            <Text style={[styles.statValue, { color: '#f43f5e' }]}>{currentStats.notComing}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Publish Menu</Text>
                    <View style={styles.premiumCard}>
                        <View style={[styles.shiftToggleRow, { marginBottom: 20 }]}>
                            <TouchableOpacity onPress={() => setMenuShift('morning')} style={[styles.shiftBtn, menuShift === 'morning' && styles.shiftBtnActive]}>
                                <Feather name="sun" size={14} color={menuShift === 'morning' ? '#4f46e5' : '#64748b'} style={{ marginRight: 6 }} />
                                <Text style={[styles.shiftBtnText, menuShift === 'morning' && styles.shiftBtnTextActive]}>Morning</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setMenuShift('night')} style={[styles.shiftBtn, menuShift === 'night' && styles.shiftBtnActive]}>
                                <Feather name="moon" size={14} color={menuShift === 'night' ? '#4f46e5' : '#64748b'} style={{ marginRight: 6 }} />
                                <Text style={[styles.shiftBtnText, menuShift === 'night' && styles.shiftBtnTextActive]}>Night</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]} placeholder="Items (e.g. Dal, Roti, Paneer)" multiline value={menuItems} onChangeText={setMenuItems} />
                        <View style={styles.priceInputWrapper}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput style={styles.priceInput} placeholder="Thali Price" keyboardType="numeric" value={price} onChangeText={setPrice} />
                        </View>

                        <TouchableOpacity style={styles.publishBtn} onPress={handlePublishMenu} disabled={isPublishing}>
                            {isPublishing ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Feather name="send" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                                    <Text style={styles.publishBtnText}>Publish {menuShift} Menu</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Monthly Members ({members.length})</Text>
                    {members.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Feather name="users" size={32} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No monthly members yet.</Text>
                        </View>
                    ) : (
                        members.map(member => (
                            <View key={member._id} style={styles.memberCard}>
                                <View style={styles.memberHeader}>
                                    <View style={styles.memberAvatar}>
                                        <Text style={styles.avatarText}>{member.studentName.charAt(0).toUpperCase()}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.memberName}>{member.studentName}</Text>
                                        <Text style={styles.memberPhone}><Feather name="phone" size={10} /> {member.studentPhone || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.memberShift}><Text style={styles.memberShiftText}>{member.shift} Shift</Text></View>
                                </View>

                                <View style={styles.memberMetrics}>
                                    <TouchableOpacity style={styles.metricBtn} onPress={() => openModal('skips', member._id, member.allowedSkips, 'Max Skips', 'Enter total allowed skips')}>
                                        <Text style={styles.metricLabel}>Skips</Text>
                                        <Text style={styles.metricValue}>{member.usedSkips}/{member.allowedSkips} <Feather name="edit-2" size={10} color="#94a3b8" /></Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.metricBtn} onPress={() => openModal('fee', member._id, member.monthlyFee, 'Monthly Fee (₹)', 'Enter fee amount')}>
                                        <Text style={styles.metricLabel}>Fee</Text>
                                        <Text style={[styles.metricValue, { color: '#f97316' }]}>₹{member.monthlyFee} <Feather name="edit-2" size={10} color="#94a3b8" /></Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.metricBtn} onPress={() => openModal('days', member._id, '', 'Extend Days', 'Add days for absenteeism')}>
                                        <Text style={styles.metricLabel}>Expires</Text>
                                        <Text style={styles.metricValue}>{member.endDate ? new Date(member.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A'} <Feather name="plus-circle" size={10} color="#94a3b8" /></Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    onPress={() => togglePaymentStatus(member._id, member.status)}
                                    style={[styles.payBtn, member.status === 'paid' ? styles.payBtnPaid : styles.payBtnPending]}>
                                    <Text style={[styles.payBtnText, member.status === 'paid' ? { color: '#059669' } : { color: '#dc2626' }]}>
                                        {member.status === 'paid' ? 'STATUS: PAID ✓' : 'MARK AS PAID'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Mess Location Map</Text>
                    <View style={styles.premiumCard}>
                        <Text style={{ color: '#64748b', fontSize: 13, marginBottom: 16, lineHeight: 20 }}>Allow students to find your mess on the interactive map by saving your current GPS coordinates.</Text>

                        {savedLocation && (
                            <View style={styles.locationActiveBanner}>
                                <Feather name="map-pin" size={16} color="#4338ca" />
                                <Text style={styles.locationActiveText}>Location is active on map</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.publishBtn, { backgroundColor: '#4f46e5' }]}
                            onPress={handleSetLocation}
                            disabled={isSettingLocation}
                        >
                            {isSettingLocation ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Feather name="navigation" size={16} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.publishBtnText}>
                                        {savedLocation ? 'Update Current Location' : 'Set Location via GPS'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>

            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>{modalConfig.title}</Text>
                        <TextInput
                            style={styles.modalInput}
                            keyboardType="numeric"
                            placeholder={modalConfig.placeholder}
                            value={modalInput}
                            onChangeText={setModalInput}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBtnCancel}><Text style={{ color: '#64748b', fontWeight: '900' }}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity onPress={handleModalSubmit} style={styles.modalBtnSave}><Text style={{ color: '#fff', fontWeight: '900' }}>Save</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f8fafc', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#f8fafc' },
    greeting: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
    logoutBtn: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 12 },

    content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
    sectionTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 16 },

    dateSelector: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 16, padding: 4, marginBottom: 24, alignSelf: 'center' },
    dateBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12 },
    dateBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    dateBtnText: { fontWeight: 'bold', color: '#64748b', fontSize: 15 },
    dateBtnTextActive: { color: '#0f172a' },

    section: { marginBottom: 32 },

    sectionHeader: { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16 },

    shiftToggleRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, width: '100%' },
    shiftBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, flexDirection: 'row', justifyContent: 'center' },
    shiftBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    shiftBtnText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
    shiftBtnTextActive: { color: '#4f46e5' },

    statsRow: { flexDirection: 'row', gap: 16 },
    statCard: { flex: 1, padding: 20, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    statBgIcon: { position: 'absolute', right: -10, bottom: -10, transform: [{ scale: 3 }] },
    statLabel: { color: '#ecfdf5', fontWeight: 'bold', fontSize: 14, marginBottom: 8 },
    statValue: { color: '#ffffff', fontWeight: '900', fontSize: 40 },

    premiumCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
    input: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 16, marginBottom: 16, fontSize: 15, color: '#0f172a' },
    priceInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 16, marginBottom: 20, paddingHorizontal: 16 },
    currencySymbol: { fontSize: 16, fontWeight: 'bold', color: '#64748b', marginRight: 8 },
    priceInput: { flex: 1, paddingVertical: 16, fontSize: 15, color: '#0f172a' },

    publishBtn: { backgroundColor: '#0f172a', paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    publishBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 15 },

    emptyState: { alignItems: 'center', padding: 40, backgroundColor: '#ffffff', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
    emptyText: { color: '#94a3b8', fontWeight: 'bold', marginTop: 12, fontSize: 15 },

    memberCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 24, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontSize: 18, fontWeight: '900', color: '#4f46e5' },
    memberName: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
    memberPhone: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600' },
    memberShift: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    memberShiftText: { fontSize: 11, fontWeight: '900', color: '#475569', textTransform: 'uppercase' },

    memberMetrics: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    metricBtn: { flex: 1, backgroundColor: '#f8fafc', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
    metricLabel: { fontSize: 10, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', fontWeight: '900' },
    metricValue: { fontSize: 13, fontWeight: '900', color: '#0f172a' },

    payBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    payBtnPaid: { backgroundColor: '#ecfdf5' },
    payBtnPending: { backgroundColor: '#fef2f2' },
    payBtnText: { fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },

    locationActiveBanner: { backgroundColor: '#e0e7ff', padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
    locationActiveText: { color: '#4338ca', fontWeight: 'bold', fontSize: 13 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalBox: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 20, color: '#0f172a', textAlign: 'center' },
    modalInput: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, marginBottom: 24, fontSize: 20, textAlign: 'center', fontWeight: '900', color: '#4f46e5' },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtnCancel: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 16 },
    modalBtnSave: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#4f46e5', borderRadius: 16 },
});