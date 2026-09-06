import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Linking, SafeAreaView, Platform, StatusBar, Modal, TextInput, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import MessMap from '../../components/MessMap';

const API_URL = 'http://192.168.0.101:3000'; // ⚠️ IP CONFIGURED

const getLocalDateString = (offsetDays = 0) => {
    const d = new Date(); d.setDate(d.getDate() + offsetDays);
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

// --- PREMIUM MESS CARD ---
const MessCard = ({ mess, initialAttendance, targetDate, mySub, onRefresh }) => {
    const [attendance, setAttendance] = useState(initialAttendance || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSubForm, setShowSubForm] = useState(false);

    // Rate Modal State
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    // View Reviews State
    const [readReviewsModalVisible, setReadReviewsModalVisible] = useState(false);
    const [messReviews, setMessReviews] = useState([]);
    const [isLoadingReviews, setIsLoadingReviews] = useState(false);

    useEffect(() => {
        if (mySub && initialAttendance === undefined) setAttendance('coming');
        else setAttendance(initialAttendance || null);
    }, [initialAttendance, mySub]);

    const handleAttendance = async (status) => {
        setIsSubmitting(true);
        const token = await AsyncStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/api/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ messId: mess.ownerId._id, messName: mess.messName, shift: mess.shift, status, targetDate, timestamp: new Date().toISOString() })
            });
            const data = await response.json();
            if (response.ok) { setAttendance(status); onRefresh(); }
            else { Alert.alert("Notice", data.error || "Action not allowed."); }
        } catch (error) { Alert.alert("Error", "Connection failed."); }
        finally { setIsSubmitting(false); }
    };

    const handleSubscribe = async (shiftType) => {
        const token = await AsyncStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/subscriptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ messId: mess.ownerId._id, messName: mess.messName, shift: shiftType })
            });
            if (res.ok) { Alert.alert("Success", "Subscribed successfully!"); setShowSubForm(false); onRefresh(); }
            else { const d = await res.json(); Alert.alert("Failed", d.error); }
        } catch (e) { Alert.alert("Error", "Failed to subscribe"); }
    };

    // Submit Review
    const submitReview = async () => {
        if (rating === 0) { Alert.alert("Notice", "Please select a star rating first."); return; }
        setIsSubmitting(true);
        const token = await AsyncStorage.getItem('token');
        const messId = mess.ownerId?._id || mess.ownerId;

        try {
            const response = await fetch(`${API_URL}/api/messes/${messId}/rate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ rating, comment })
            });

            if (response.ok) {
                Alert.alert("Success", "Thank you for your feedback!");
                setReviewModalVisible(false);
                setRating(0);
                setComment('');
                onRefresh(); // Refresh dashboard to update average stars
            } else {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    Alert.alert("Error", data.error || "Failed to submit review.");
                } catch { Alert.alert("Server Error", "Endpoint not found."); }
            }
        } catch (e) { Alert.alert("Network Error", `Details: ${e.message}`); }
        finally { setIsSubmitting(false); }
    };

    // 🛠️ NEW: Fetch Reviews to display them
    const fetchReviews = async () => {
        setIsLoadingReviews(true);
        setReadReviewsModalVisible(true);
        const token = await AsyncStorage.getItem('token');
        const messId = mess.ownerId?._id || mess.ownerId;

        try {
            const response = await fetch(`${API_URL}/api/messes/${messId}/reviews`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setMessReviews(data);
            }
        } catch (e) { console.error("Failed to fetch reviews", e); }
        finally { setIsLoadingReviews(false); }
    };

    const disableComing = isSubmitting || attendance === 'coming';
    const disableSkip = isSubmitting || attendance === 'not_coming';

    return (
        <View style={[styles.card, attendance === 'coming' ? styles.cardComing : attendance === 'not_coming' ? styles.cardSkip : null]}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <View style={styles.badgeRow}>
                        <View style={styles.priceBadge}><Text style={styles.priceText}>₹{mess.price || 60} Thali</Text></View>
                        <View style={[styles.shiftBadge, mess.shift === 'morning' ? styles.shiftMorning : styles.shiftNight]}>
                            <Feather name={mess.shift === 'morning' ? "sun" : "moon"} size={12} color={mess.shift === 'morning' ? "#d97706" : "#4338ca"} style={{ marginRight: 4 }} />
                            <Text style={[styles.shiftText, mess.shift === 'morning' ? styles.shiftTextMorning : styles.shiftTextNight]}>
                                {mess.shift === 'morning' ? 'Morning' : 'Night'}
                            </Text>
                        </View>
                        <View style={[styles.shiftBadge, { backgroundColor: '#fef3c7' }]}>
                            <Text style={[styles.shiftText, { color: '#d97706' }]}>⭐ {mess.rating ? mess.rating.toFixed(1) : 'New'}</Text>
                        </View>
                    </View>
                    <Text style={styles.messName}>{mess.messName}</Text>
                </View>
            </View>

            {!mySub && !showSubForm && (
                <TouchableOpacity style={styles.joinBtn} onPress={() => setShowSubForm(true)}>
                    <Feather name="plus" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.joinBtnText}>Join Monthly</Text>
                </TouchableOpacity>
            )}

            {showSubForm && (
                <View style={styles.subForm}>
                    <Text style={styles.subFormLabel}>Select your shift:</Text>
                    <View style={styles.subFormButtons}>
                        <TouchableOpacity style={styles.shiftSelectBtn} onPress={() => handleSubscribe('morning')}><Text style={styles.shiftSelectText}>Morning</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.shiftSelectBtn} onPress={() => handleSubscribe('night')}><Text style={styles.shiftSelectText}>Night</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.shiftSelectBtnBoth} onPress={() => handleSubscribe('both')}><Text style={styles.shiftSelectTextBoth}>Both</Text></TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => setShowSubForm(false)} style={{ marginTop: 8 }}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                </View>
            )}

            <View style={styles.menuContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Feather name="star" size={16} color="#f59e0b" />
                        <Text style={styles.menuTitle}> Today's Feast</Text>
                    </View>

                    {/* BUTTON ROW FOR REVIEWS */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={fetchReviews} style={[styles.rateBtn, { backgroundColor: '#f1f5f9' }]}>
                            <Text style={[styles.rateBtnText, { color: '#64748b' }]}>Reviews</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setReviewModalVisible(true)} style={styles.rateBtn}>
                            <Text style={styles.rateBtnText}>Rate ⭐</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.itemsRow}>
                    {mess.items.map((item, idx) => (
                        <View key={idx} style={styles.itemBadge}><Text style={styles.itemText}>{item}</Text></View>
                    ))}
                </View>
            </View>

            <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, attendance === 'coming' ? styles.btnComingActive : disableComing ? styles.btnDisabled : styles.btnComing]} onPress={() => handleAttendance('coming')} disabled={disableComing}>
                    <Feather name="check" size={20} color={attendance === 'coming' ? '#fff' : disableComing ? '#94a3b8' : '#10b981'} />
                    <Text style={[styles.actionBtnText, attendance === 'coming' ? { color: '#fff' } : disableComing ? { color: '#94a3b8' } : { color: '#10b981' }]}>Coming</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, attendance === 'not_coming' ? styles.btnSkipActive : disableSkip ? styles.btnDisabled : styles.btnSkip]} onPress={() => handleAttendance('not_coming')} disabled={disableSkip}>
                    <Feather name="x" size={20} color={attendance === 'not_coming' ? '#fff' : disableSkip ? '#94a3b8' : '#f43f5e'} />
                    <Text style={[styles.actionBtnText, attendance === 'not_coming' ? { color: '#fff' } : disableSkip ? { color: '#94a3b8' } : { color: '#f43f5e' }]}>Skip</Text>
                </TouchableOpacity>
            </View>

            {/* WRITE REVIEW MODAL */}
            <Modal visible={reviewModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Rate {mess.messName}</Text>

                        <View style={styles.starRow}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                    <Feather
                                        name="star"
                                        size={36}
                                        color={rating >= star ? '#f59e0b' : '#e2e8f0'}
                                        style={rating >= star && { transform: [{ scale: 1.1 }] }}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                            placeholder="Write a review (optional)..."
                            multiline
                            value={comment}
                            onChangeText={setComment}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setReviewModalVisible(false)} style={styles.modalBtnCancel}>
                                <Text style={{ color: '#64748b', fontWeight: '900' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={submitReview} style={styles.modalBtnSave} disabled={isSubmitting}>
                                {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '900' }}>Submit</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* READ REVIEWS MODAL */}
            <Modal visible={readReviewsModalVisible} transparent animationType="slide">
                <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
                    <View style={[styles.modalBox, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '80%' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={styles.modalTitle}>Reviews</Text>
                            <TouchableOpacity onPress={() => setReadReviewsModalVisible(false)}>
                                <Feather name="x-circle" size={28} color="#cbd5e1" />
                            </TouchableOpacity>
                        </View>

                        {isLoadingReviews ? (
                            <ActivityIndicator size="large" color="#4f46e5" style={{ marginVertical: 40 }} />
                        ) : messReviews.length === 0 ? (
                            <View style={{ alignItems: 'center', padding: 20 }}>
                                <Feather name="message-square" size={32} color="#cbd5e1" style={{ marginBottom: 12 }} />
                                <Text style={{ color: '#64748b', fontSize: 16 }}>No reviews yet. Be the first to rate!</Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {messReviews.map((rev, index) => (
                                    <View key={index} style={styles.reviewCard}>
                                        <View style={styles.reviewHeader}>
                                            <Text style={styles.reviewAuthor}>{rev.studentName || 'Student'}</Text>
                                            <Text style={styles.reviewRating}>
                                                {Array(rev.rating).fill('⭐').join('')}
                                            </Text>
                                        </View>
                                        {rev.comment ? <Text style={styles.reviewComment}>{rev.comment}</Text> : null}
                                    </View>
                                ))}
                                <View style={{ height: 40 }} />
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// --- DIRECTORY CARD ---
const DirectoryCard = ({ item }) => {
    const handleCall = () => {
        Linking.openURL(`tel:${item.phone}`).catch(() => Alert.alert('Error', 'Could not open the phone dialer.'));
    };

    return (
        <View style={styles.dirCard}>
            <View style={styles.dirInfo}>
                <Text style={styles.dirType}>{item.type || 'Contact'}</Text>
                <Text style={styles.dirName}>{item.name}</Text>
                {item.description && <Text style={styles.dirDesc}>{item.description}</Text>}
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
                <Feather name="phone-call" size={20} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
};


// --- MAIN DASHBOARD SCREEN ---
export default function StudentDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('menus');
    const [targetDate, setTargetDate] = useState(getLocalDateString(0));

    // UI State
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [menus, setMenus] = useState([]);
    const [myAttendance, setMyAttendance] = useState([]);
    const [mySubscriptions, setMySubscriptions] = useState([]);
    const [nearbyMesses, setNearbyMesses] = useState([]);
    const [directoryData, setDirectoryData] = useState([]);

    useEffect(() => {
        const fetchUser = async () => {
            const token = await AsyncStorage.getItem('token');
            if (!token) { router.replace('/'); return; }
            try {
                const res = await fetch(`${API_URL}/api/me`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) setUser(await res.json());
                else { await AsyncStorage.removeItem('token'); router.replace('/'); }
            } catch (e) { console.error(e); }
        };
        fetchUser();
    }, []);

    const fetchData = async () => {
        const token = await AsyncStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        try {
            if (activeTab === 'menus') {
                const [menuRes, attRes, subRes] = await Promise.all([
                    fetch(`${API_URL}/api/menus/${targetDate}`, { headers }),
                    fetch(`${API_URL}/api/attendance/me/${targetDate}`, { headers }),
                    fetch(`${API_URL}/api/subscriptions/me`, { headers })
                ]);
                if (menuRes.ok) setMenus(await menuRes.json());
                if (attRes.ok) setMyAttendance(await attRes.json());
                if (subRes.ok) setMySubscriptions(await subRes.json());
            } else if (activeTab === 'map') {
                const res = await fetch(`${API_URL}/api/messes/nearby`, { headers });
                if (res.ok) setNearbyMesses(await res.json());
            } else if (activeTab === 'directory') {
                const res = await fetch(`${API_URL}/api/directory`, { headers });
                if (res.ok) setDirectoryData(await res.json());
            }
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            fetchData().finally(() => setIsLoading(false));

            const interval = setInterval(() => fetchData(), 5000);
            return () => clearInterval(interval);
        }
    }, [targetDate, activeTab, user]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, [targetDate, activeTab, user]);

    const handleLogout = async () => {
        await AsyncStorage.removeItem('token');
        router.replace('/');
    };

    const getAttendanceStatus = (messName, shift) => {
        const record = myAttendance.find(a => a.messName === messName && a.shift === shift);
        return record ? record.status : undefined;
    };

    if (!user) return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hi, {user.name.split(' ')[0]} 👋</Text>
                    <Text style={styles.subtitle}>What are you craving today?</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Feather name="log-out" size={18} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4f46e5']} tintColor="#4f46e5" />}
            >

                {activeTab === 'menus' && (
                    <>
                        <View style={styles.dateSelector}>
                            <TouchableOpacity style={[styles.dateBtn, targetDate === getLocalDateString(0) && styles.dateBtnActive]} onPress={() => setTargetDate(getLocalDateString(0))}>
                                <Text style={[styles.dateBtnText, targetDate === getLocalDateString(0) && styles.dateBtnTextActive]}>Today</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.dateBtn, targetDate === getLocalDateString(1) && styles.dateBtnActive]} onPress={() => setTargetDate(getLocalDateString(1))}>
                                <Text style={[styles.dateBtnText, targetDate === getLocalDateString(1) && styles.dateBtnTextActive]}>Tomorrow</Text>
                            </TouchableOpacity>
                        </View>

                        {mySubscriptions.length > 0 && !isLoading && (
                            <View style={{ marginBottom: 20 }}>
                                {mySubscriptions.map(sub => (
                                    <View key={sub._id} style={styles.subBanner}>
                                        <View style={styles.subBannerTop}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={styles.iconCircle}><Feather name="award" size={16} color="#4f46e5" /></View>
                                                <Text style={styles.subBannerTitle}>{sub.messName}</Text>
                                            </View>
                                            <Text style={[styles.subStatusText, sub.status === 'paid' ? { color: '#10b981' } : { color: '#f43f5e' }]}>{sub.status.toUpperCase()}</Text>
                                        </View>
                                        <View style={styles.subBadgeRow}>
                                            <View style={styles.subBadge}><Text style={styles.subBadgeText}>{sub.shift} Shift</Text></View>
                                            <View style={[styles.subBadge, { backgroundColor: '#fffbeb' }]}><Text style={[styles.subBadgeText, { color: '#d97706' }]}>Skips: {sub.usedSkips}/{sub.allowedSkips}</Text></View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {isLoading && menus.length === 0 ? (
                            <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />
                        ) : menus.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconCircle}><Feather name="coffee" size={32} color="#94a3b8" /></View>
                                <Text style={styles.emptyStateTitle}>No menus yet</Text>
                                <Text style={styles.emptyStateSub}>Chefs are still preparing the menu!</Text>
                            </View>
                        ) : (
                            menus.map(mess => (
                                <MessCard key={mess._id} mess={mess} initialAttendance={getAttendanceStatus(mess.messName, mess.shift)} targetDate={targetDate} mySub={mySubscriptions.find(s => s.messId === mess.ownerId._id)} onRefresh={fetchData} />
                            ))
                        )}
                    </>
                )}

                {activeTab === 'map' && (
                    <View>
                        <Text style={styles.sectionTitle}>Messes Near You</Text>
                        <MessMap messes={nearbyMesses} />
                    </View>
                )}

                {activeTab === 'directory' && (
                    <View>
                        <Text style={styles.sectionTitle}>Campus Directory</Text>
                        {isLoading && directoryData.length === 0 ? (
                            <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />
                        ) : directoryData.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconCircle}><Feather name="book-open" size={32} color="#94a3b8" /></View>
                                <Text style={styles.emptyStateTitle}>Directory Empty</Text>
                            </View>
                        ) : (
                            directoryData.map((item, idx) => (
                                <DirectoryCard key={item._id || idx} item={item} />
                            ))
                        )}
                    </View>
                )}

            </ScrollView>

            <View style={styles.floatingTabBar}>
                <TouchableOpacity style={styles.bottomTabBtn} onPress={() => setActiveTab('menus')}>
                    <Feather name="home" size={22} color={activeTab === 'menus' ? '#4f46e5' : '#94a3b8'} />
                    <Text style={[styles.bottomTabText, activeTab === 'menus' && styles.bottomTabTextActive]}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.bottomTabBtn} onPress={() => setActiveTab('map')}>
                    <Feather name="map-pin" size={22} color={activeTab === 'map' ? '#4f46e5' : '#94a3b8'} />
                    <Text style={[styles.bottomTabText, activeTab === 'map' && styles.bottomTabTextActive]}>Map</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.bottomTabBtn} onPress={() => setActiveTab('directory')}>
                    <Feather name="phone" size={22} color={activeTab === 'directory' ? '#4f46e5' : '#94a3b8'} />
                    <Text style={[styles.bottomTabText, activeTab === 'directory' && styles.bottomTabTextActive]}>Directory</Text>
                </TouchableOpacity>
            </View>

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
    sectionTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 16 },

    dateSelector: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 16, padding: 4, marginBottom: 24, alignSelf: 'center' },
    dateBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12 },
    dateBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    dateBtnText: { fontWeight: 'bold', color: '#64748b', fontSize: 15 },
    dateBtnTextActive: { color: '#0f172a' },

    subBanner: { backgroundColor: '#ffffff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#e0e7ff', shadowColor: '#4f46e5', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
    subBannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    iconCircle: { backgroundColor: '#e0e7ff', padding: 8, borderRadius: 12, marginRight: 10 },
    subBannerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    subStatusText: { fontWeight: '900', fontSize: 12 },
    subBadgeRow: { flexDirection: 'row', gap: 8 },
    subBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    subBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#475569' },

    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
    emptyIconCircle: { backgroundColor: '#f1f5f9', padding: 24, borderRadius: 100, marginBottom: 16 },
    emptyStateTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
    emptyStateSub: { fontSize: 14, color: '#64748b', marginTop: 8 },

    card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 5, borderWidth: 2, borderColor: 'transparent' },
    cardComing: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
    cardSkip: { borderColor: '#f43f5e', opacity: 0.7 },
    cardHeader: { marginBottom: 20 },
    badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    priceBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    priceText: { color: '#0f172a', fontSize: 12, fontWeight: '900' },
    shiftBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    shiftMorning: { backgroundColor: '#fffbeb' },
    shiftNight: { backgroundColor: '#e0e7ff' },
    shiftText: { fontSize: 12, fontWeight: '900' },
    shiftTextMorning: { color: '#d97706' },
    shiftTextNight: { color: '#4338ca' },
    messName: { fontSize: 26, fontWeight: '900', color: '#0f172a' },

    joinBtn: { flexDirection: 'row', backgroundColor: '#4f46e5', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginBottom: 16 },
    joinBtnText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },

    subForm: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, marginBottom: 16 },
    subFormLabel: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginBottom: 12 },
    subFormButtons: { flexDirection: 'row', gap: 8 },
    shiftSelectBtn: { flex: 1, backgroundColor: '#e2e8f0', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    shiftSelectBtnBoth: { flex: 1, backgroundColor: '#4f46e5', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    shiftSelectText: { color: '#0f172a', fontSize: 13, fontWeight: 'bold' },
    shiftSelectTextBoth: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
    cancelText: { color: '#ef4444', fontSize: 13, fontWeight: 'bold', textAlign: 'center', padding: 8 },

    menuContainer: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, marginBottom: 20 },
    menuTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
    rateBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#e0e7ff', borderRadius: 8 },
    rateBtnText: { fontSize: 11, fontWeight: 'bold', color: '#4f46e5' },
    itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    itemBadge: { backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    itemText: { fontSize: 14, fontWeight: '700', color: '#334155' },

    actionsRow: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
    btnComing: { backgroundColor: '#ffffff', borderColor: '#e2e8f0' },
    btnSkip: { backgroundColor: '#ffffff', borderColor: '#e2e8f0' },
    btnComingActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
    btnSkipActive: { backgroundColor: '#f43f5e', borderColor: '#f43f5e' },
    btnDisabled: { backgroundColor: '#f1f5f9', borderColor: '#f1f5f9' },
    actionBtnText: { fontSize: 16, fontWeight: '900' },

    dirCard: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 16, borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, alignItems: 'center' },
    dirInfo: { flex: 1, paddingRight: 12 },
    dirType: { fontSize: 11, fontWeight: '900', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    dirName: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
    dirDesc: { fontSize: 13, color: '#64748b' },
    callBtn: { backgroundColor: '#10b981', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },

    floatingTabBar: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#ffffff', flexDirection: 'row', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10, justifyContent: 'space-around' },
    bottomTabBtn: { alignItems: 'center', justifyContent: 'center', flex: 1 },
    bottomTabText: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', marginTop: 4 },
    bottomTabTextActive: { color: '#4f46e5' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalBox: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 20, color: '#0f172a', textAlign: 'center' },
    starRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
    input: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 16, marginBottom: 24, fontSize: 15, color: '#0f172a' },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtnCancel: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 16 },
    modalBtnSave: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#4f46e5', borderRadius: 16 },

    // Review List Styles
    reviewCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    reviewAuthor: { fontWeight: 'bold', color: '#0f172a', fontSize: 14 },
    reviewRating: { fontSize: 12 },
    reviewComment: { color: '#475569', fontSize: 14, lineHeight: 20 },
});