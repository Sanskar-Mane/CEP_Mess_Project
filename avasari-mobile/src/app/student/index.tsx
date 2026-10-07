import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Linking, SafeAreaView, Platform, StatusBar, Modal, TextInput, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import MessMap from '../../components/MessMap';

import { API_URL } from '@/constants/config';
import { getSocket } from '@/utils/socket';
import QRCode from 'react-native-qrcode-svg';
import * as Location from 'expo-location';
import { registerForPushNotificationsAsync } from '@/utils/notifications';

const getLocalDateString = (offsetDays = 0) => {
    const d = new Date(); d.setDate(d.getDate() + offsetDays);
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

const getISTDate = () => {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
};

const getISTTime = () => {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(new Date());
};

// --- PREMIUM MESS CARD ---
const MessCard = ({ mess, initialAttendance, initialAttendanceRecord, targetDate, mySub, onRefresh, user }: { mess: any; initialAttendance?: string | null; initialAttendanceRecord?: any; targetDate: string; mySub?: any; onRefresh: () => void; user: any }) => {
    const [attendance, setAttendance] = useState<string | null>(initialAttendance || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSubForm, setShowSubForm] = useState(false);
    const [isClaimed, setIsClaimed] = useState<boolean>(Boolean(initialAttendanceRecord?.isConsumed));

    // QR State
    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [qrToken, setQrToken] = useState('');
    const [qrExpirySeconds, setQrExpirySeconds] = useState(900);
    const [isLoadingQr, setIsLoadingQr] = useState(false);

    // Rate Modal State
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    // View Reviews State
    const [readReviewsModalVisible, setReadReviewsModalVisible] = useState(false);
    const [messReviews, setMessReviews] = useState<any[]>([]);
    const [isLoadingReviews, setIsLoadingReviews] = useState(false);

    useEffect(() => {
        if (mySub && initialAttendance === undefined) setAttendance('coming');
        else setAttendance(initialAttendance || null);
        setIsClaimed(Boolean(initialAttendanceRecord?.isConsumed));
    }, [initialAttendance, initialAttendanceRecord, mySub]);

    // Timer effect for QR expiry
    useEffect(() => {
        if (!qrModalVisible) return;
        const timer = setInterval(() => {
            setQrExpirySeconds(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setQrModalVisible(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [qrModalVisible]);

    // Listen for attendance:consumed event
    useEffect(() => {
        const socket = getSocket();
        const onAttendanceConsumed = (data: any) => {
            if (data?.studentId === user?._id && data?.shift === mess.shift && data?.targetDate === targetDate) {
                setQrModalVisible(false);
                setIsClaimed(true);
                Alert.alert("🎉 Meal Verified!", `Your ${mess.shift} meal at ${mess.messName} has been verified and claimed. Enjoy!`);
                onRefresh();
            }
        };
        socket.on('attendance:consumed', onAttendanceConsumed);
        return () => {
            socket.off('attendance:consumed', onAttendanceConsumed);
        };
    }, [user, mess, targetDate]);

    const fetchQrPass = async () => {
        setIsLoadingQr(true);
        const token = await AsyncStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/attendance/qr/${mess.ownerId._id}/${targetDate}/${mess.shift}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.qrToken) {
                setQrToken(data.qrToken);
                setQrExpirySeconds(900);
                setQrModalVisible(true);
            } else {
                Alert.alert("Notice", data.error || "Could not generate meal pass.");
            }
        } catch (e) {
            Alert.alert("Error", "Network connection failed.");
        } finally {
            setIsLoadingQr(false);
        }
    };

    const handleAttendance = async (status: string) => {
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

    const handleSubscribe = async (shiftType: string) => {
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
        } catch (e: any) { Alert.alert("Network Error", `Details: ${e.message}`); }
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

    const cutoffTime = mess.shift === 'morning'
        ? (mess.ownerId?.morningCutoff || '09:30')
        : (mess.ownerId?.nightCutoff || '17:30');

    const todayIST = getISTDate();
    const currentISTTime = getISTTime();
    const isPastDate = targetDate < todayIST;
    const isToday = targetDate === todayIST;
    const isCutoffPassed = isPastDate || (isToday && currentISTTime >= cutoffTime);

    const disableComing = isSubmitting || attendance === 'coming' || isCutoffPassed;
    const disableSkip = isSubmitting || attendance === 'not_coming' || isCutoffPassed;

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
                        <View style={[styles.shiftBadge, isCutoffPassed ? { backgroundColor: '#fee2e2' } : { backgroundColor: '#f0fdf4' }]}>
                            <Feather name={isCutoffPassed ? "lock" : "clock"} size={12} color={isCutoffPassed ? "#ef4444" : "#16a34a"} style={{ marginRight: 4 }} />
                            <Text style={[styles.shiftText, { color: isCutoffPassed ? "#ef4444" : "#16a34a" }]}>
                                {isCutoffPassed ? `Locked (${cutoffTime})` : `Cut-off: ${cutoffTime}`}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.messName}>{mess.messName}</Text>
                </View>
            </View>

            {(!mySub || mySub.status === 'expired') && !showSubForm && (
                <TouchableOpacity style={styles.joinBtn} onPress={() => setShowSubForm(true)}>
                    <Feather name="plus" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.joinBtnText}>{mySub?.status === 'expired' ? 'Re-Subscribe' : 'Join Monthly'}</Text>
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
                    {mess.items.map((item: string, idx: number) => (
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

            {targetDate === todayIST && attendance === 'coming' && (
                <View style={{ marginTop: 12 }}>
                    {isClaimed ? (
                        <View style={styles.mealClaimedBadge}>
                            <Feather name="check-circle" size={16} color="#10b981" />
                            <Text style={styles.mealClaimedText}>Meal Claimed ✓</Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.mealQrBtn} onPress={fetchQrPass} disabled={isLoadingQr}>
                            {isLoadingQr ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Feather name="maximize" size={16} color="#fff" />
                                    <Text style={styles.mealQrBtnText}>Show Meal QR 🎟️</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* MEAL QR CODE PASS MODAL */}
            <Modal visible={qrModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { alignItems: 'center' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={styles.modalTitle}>Meal Pass 🎟️</Text>
                            <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                                <Feather name="x" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 13, color: '#64748b', fontWeight: 'bold', marginBottom: 2 }}>{mess.messName}</Text>
                        <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a', marginBottom: 16 }}>
                            {user?.name || 'Student'} • {mess.shift === 'morning' ? '☀️ Morning' : '🌙 Night'}
                        </Text>

                        {qrToken ? (
                            <View style={styles.qrContainer}>
                                <QRCode value={qrToken} size={200} />
                            </View>
                        ) : (
                            <ActivityIndicator size="large" color="#4f46e5" style={{ marginVertical: 40 }} />
                        )}

                        <View style={styles.timerBadge}>
                            <Feather name="clock" size={14} color="#d97706" />
                            <Text style={styles.timerText}>
                                Expires in {Math.floor(qrExpirySeconds / 60)}:{('0' + (qrExpirySeconds % 60)).slice(-2)}
                            </Text>
                        </View>

                        <Text style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>
                            Show this QR code at the counter for chef verification.
                        </Text>
                    </View>
                </View>
            </Modal>

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
const DirectoryCard = ({ item }: { item: any }) => {
    const handleCall = () => {
        Linking.openURL(`tel:${item.phone}`).catch(() => Alert.alert('Error', 'Could not open the phone dialer.'));
    };

    const isRoom = item.category === 'rooms';
    const isEmergency = item.category === 'emergency';

    return (
        <View style={styles.dirCard}>
            <View style={styles.dirInfo}>
                <View style={styles.dirBadgeRow}>
                    <View style={[
                        styles.dirCatBadge,
                        isEmergency ? styles.catBadgeEmergency : isRoom ? styles.catBadgeRooms : styles.catBadgeRickshaw
                    ]}>
                        <Text style={[
                            styles.dirCatBadgeText,
                            isEmergency ? styles.catTextEmergency : isRoom ? styles.catTextRooms : styles.catTextRickshaw
                        ]}>
                            {isEmergency ? '🚨 Emergency' : isRoom ? '🏠 PG / Room' : '🛺 Auto'}
                        </Text>
                    </View>
                    {isRoom && item.vacancies !== undefined && (
                        <View style={[styles.dirVacancyBadge, item.vacancies === 0 ? styles.dirVacancyFull : styles.dirVacancyOpen]}>
                            <Text style={[styles.dirVacancyBadgeText, item.vacancies === 0 ? { color: '#dc2626' } : { color: '#2563eb' }]}>
                                {item.vacancies > 0 ? `${item.vacancies} Beds Open` : 'Full'}
                            </Text>
                        </View>
                    )}
                </View>

                <Text style={styles.dirName}>{item.name}</Text>
                {item.area ? <Text style={styles.dirArea}>{item.area}</Text> : null}

                {isRoom && (
                    <View style={{ marginTop: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            {item.rentPerMonth ? (
                                <Text style={styles.dirRentText}>₹{item.rentPerMonth}/mo</Text>
                            ) : null}
                            {item.genderPreference && (
                                <View style={styles.dirGenderTag}>
                                    <Text style={styles.dirGenderText}>
                                        {item.genderPreference === 'boys' ? 'Boys' : item.genderPreference === 'girls' ? 'Girls' : 'Any'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {item.amenities && item.amenities.length > 0 && (
                            <View style={styles.dirAmenitiesRow}>
                                {item.amenities.map((a: string, idx: number) => (
                                    <View key={idx} style={styles.dirAmenityChip}>
                                        <Text style={styles.dirAmenityText}>{a}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </View>

            <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
                <Feather name="phone-call" size={18} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
};


// --- MAIN DASHBOARD SCREEN ---
export default function StudentDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('menus');
    const [targetDate, setTargetDate] = useState(getLocalDateString(0));

    // UI State
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [menus, setMenus] = useState<any[]>([]);
    const [myAttendance, setMyAttendance] = useState<any[]>([]);
    const [mySubscriptions, setMySubscriptions] = useState<any[]>([]);
    const [nearbyMesses, setNearbyMesses] = useState<any[]>([]);
    const [directoryData, setDirectoryData] = useState<any[]>([]);

    // Directory Filter & Search
    const [dirCategoryFilter, setDirCategoryFilter] = useState<'all' | 'rooms' | 'rickshaws' | 'emergency'>('all');
    const [dirSearchQuery, setDirSearchQuery] = useState('');

    // Rides State
    const [rides, setRides] = useState<any[]>([]);
    const [isRidesLoading, setIsRidesLoading] = useState(false);
    const [rideModalVisible, setRideModalVisible] = useState(false);
    const [isSubmittingRide, setIsSubmittingRide] = useState(false);
    const [newRideForm, setNewRideForm] = useState({
        from: 'GCOEARA Campus Gate',
        to: 'Manchar Bus Stand',
        date: getLocalDateString(0),
        departureTime: '17:30',
        totalSeats: '3',
        totalFare: '60'
    });

    // Notifications State
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [notifModalVisible, setNotifModalVisible] = useState<boolean>(false);

    // Offline State
    const [isOffline, setIsOffline] = useState<boolean>(false);

    // UPI Payment State
    const [paymentModalVisible, setPaymentModalVisible] = useState<boolean>(false);
    const [selectedSubForPayment, setSelectedSubForPayment] = useState<any>(null);
    const [utrInput, setUtrInput] = useState<string>('');
    const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

    useEffect(() => {
        const fetchUser = async () => {
            const token = await AsyncStorage.getItem('token');
            if (!token) { router.replace('/'); return; }
            try {
                const res = await fetch(`${API_URL}/api/me`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) {
                    const u = await res.json();
                    setUser(u);
                    registerForPushNotificationsAsync();
                } else {
                    await AsyncStorage.removeItem('token');
                    router.replace('/');
                }
            } catch (e) { console.error(e); }
        };
        fetchUser();
    }, []);

    const fetchData = async () => {
        const token = await AsyncStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        try {
            if (activeTab === 'menus') {
                const [menuRes, attRes, subRes, notifRes] = await Promise.all([
                    fetch(`${API_URL}/api/menus/${targetDate}`, { headers }),
                    fetch(`${API_URL}/api/attendance/me/${targetDate}`, { headers }),
                    fetch(`${API_URL}/api/subscriptions/me`, { headers }),
                    fetch(`${API_URL}/api/notifications`, { headers })
                ]);
                if (menuRes.ok) {
                    const menuData = await menuRes.json();
                    setMenus(menuData);
                    AsyncStorage.setItem(`cache_menus_${targetDate}`, JSON.stringify(menuData)).catch(() => {});
                }
                if (attRes.ok) setMyAttendance(await attRes.json());
                if (subRes.ok) setMySubscriptions(await subRes.json());
                if (notifRes.ok) {
                    const notifs = await notifRes.json();
                    setNotifications(notifs);
                    setUnreadCount(notifs.filter((n: any) => !n.isRead).length);
                }
                setIsOffline(false);
            } else if (activeTab === 'map') {
                let url = `${API_URL}/api/messes/nearby`;
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        if (loc && loc.coords) {
                            url += `?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}`;
                        }
                    }
                } catch {
                    // Location permission denied or unavailable
                }
                const res = await fetch(url, { headers });
                if (res.ok) {
                    setNearbyMesses(await res.json());
                    setIsOffline(false);
                }
            } else if (activeTab === 'directory') {
                const res = await fetch(`${API_URL}/api/directory`, { headers });
                if (res.ok) {
                    const dirData = await res.json();
                    setDirectoryData(dirData);
                    AsyncStorage.setItem('cache_directory', JSON.stringify(dirData)).catch(() => {});
                    setIsOffline(false);
                }
            } else if (activeTab === 'rides') {
                await fetchRides();
                setIsOffline(false);
            }
        } catch (error) {
            console.warn('Network request failed, loading offline cache:', error);
            setIsOffline(true);
            try {
                if (activeTab === 'menus') {
                    const cachedMenus = await AsyncStorage.getItem(`cache_menus_${targetDate}`);
                    if (cachedMenus) setMenus(JSON.parse(cachedMenus));
                } else if (activeTab === 'directory') {
                    const cachedDir = await AsyncStorage.getItem('cache_directory');
                    if (cachedDir) setDirectoryData(JSON.parse(cachedDir));
                }
            } catch (cacheErr) {
                console.error('Error loading offline cache:', cacheErr);
            }
        }
    };

    const fetchRides = async () => {
        setIsRidesLoading(true);
        const token = await AsyncStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/rides`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setRides(await res.json());
        } catch (e) {
            console.error("Error fetching rides", e);
        } finally {
            setIsRidesLoading(false);
        }
    };

    const handleCreateRide = async () => {
        if (!newRideForm.from.trim() || !newRideForm.to.trim()) {
            Alert.alert("Missing Fields", "Please enter pickup and drop locations.");
            return;
        }
        setIsSubmittingRide(true);
        const token = await AsyncStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/rides`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    from: newRideForm.from.trim(),
                    to: newRideForm.to.trim(),
                    date: newRideForm.date,
                    departureTime: newRideForm.departureTime,
                    totalSeats: Number(newRideForm.totalSeats) || 3,
                    totalFare: Number(newRideForm.totalFare) || 60
                })
            });
            const data = await res.json();
            if (res.ok) {
                setRideModalVisible(false);
                fetchRides();
                Alert.alert("Success", "Ride pool published! Other students can now join.");
            } else {
                Alert.alert("Error", data.error || "Failed to create ride pool");
            }
        } catch {
            Alert.alert("Error", "Network error creating ride pool");
        } finally {
            setIsSubmittingRide(false);
        }
    };

    const handleToggleJoinRide = async (rideId: string) => {
        const token = await AsyncStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/rides/${rideId}/toggle-join`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                fetchRides();
            } else {
                Alert.alert("Error", data.error || "Failed to update pool membership");
            }
        } catch {
            Alert.alert("Error", "Network error updating pool membership");
        }
    };

    const handleCancelRide = (rideId: string) => {
        Alert.alert("Cancel Pool", "Are you sure you want to cancel this ride pool?", [
            { text: "No", style: "cancel" },
            {
                text: "Yes, Cancel",
                style: "destructive",
                onPress: async () => {
                    const token = await AsyncStorage.getItem('token');
                    try {
                        const res = await fetch(`${API_URL}/api/rides/${rideId}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        const data = await res.json();
                        if (res.ok) fetchRides();
                        else Alert.alert("Error", data.error || "Failed to cancel ride pool");
                    } catch {
                        Alert.alert("Error", "Network error cancelling ride pool");
                    }
                }
            }
        ]);
    };

    useEffect(() => {
        if (!user) return;

        setIsLoading(true);
        fetchData().finally(() => setIsLoading(false));

        const socket = getSocket();

        const onMenuUpdated = (data: any) => {
            if (!data?.date || data.date === targetDate) {
                fetchData();
            }
        };

        const onAttendanceUpdated = (data: any) => {
            if (!data?.targetDate || data.targetDate === targetDate) {
                fetchData();
            }
        };

        const onSubscriptionUpdated = (data: any) => {
            if (!data?.studentId || data.studentId === user._id) {
                fetchData();
            }
        };

        const onNotificationNew = (data: any) => {
            if (!data?.userIds || data.userIds.includes(user._id)) {
                setUnreadCount(prev => prev + 1);
                fetchData();
            }
        };

        const onRideUpdated = () => {
            fetchRides();
        };

        socket.on('menu:updated', onMenuUpdated);
        socket.on('attendance:updated', onAttendanceUpdated);
        socket.on('subscription:updated', onSubscriptionUpdated);
        socket.on('notification:new', onNotificationNew);
        socket.on('ride:updated', onRideUpdated);

        return () => {
            socket.off('menu:updated', onMenuUpdated);
            socket.off('attendance:updated', onAttendanceUpdated);
            socket.off('subscription:updated', onSubscriptionUpdated);
            socket.off('notification:new', onNotificationNew);
            socket.off('ride:updated', onRideUpdated);
        };
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

    const handleOpenNotifications = async () => {
        setNotifModalVisible(true);
        setUnreadCount(0);
        const token = await AsyncStorage.getItem('token');
        try {
            await fetch(`${API_URL}/api/notifications/read-all`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (e) {}
    };

    const handleOpenPayment = (sub: any) => {
        setSelectedSubForPayment(sub);
        setUtrInput('');
        setPaymentModalVisible(true);
    };

    const handleLaunchUPIApp = () => {
        if (!selectedSubForPayment) return;
        const ownerUpi = selectedSubForPayment.messId?.upiId || '';
        if (!ownerUpi) {
            Alert.alert("Notice", "The mess owner has not added their UPI ID yet. You can pay via QR/cash and enter your UTR number below.");
            return;
        }
        const upiUrl = `upi://pay?pa=${ownerUpi}&pn=${encodeURIComponent(selectedSubForPayment.messName)}&am=${selectedSubForPayment.monthlyFee}&cu=INR&tn=${encodeURIComponent('Mess Fee - ' + (user?.name || 'Student'))}`;
        Linking.openURL(upiUrl).catch(() => {
            Alert.alert("Notice", `Could not automatically launch UPI app. Please pay to ${ownerUpi} and enter the 12-digit UTR below.`);
        });
    };

    const handleSubmitUtr = async () => {
        if (!selectedSubForPayment) return;
        if (!utrInput.trim()) {
            Alert.alert("Notice", "Please enter the 12-digit UPI Reference / UTR number.");
            return;
        }
        setIsSubmittingPayment(true);
        const token = await AsyncStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/subscriptions/${selectedSubForPayment._id}/submit-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ utrNumber: utrInput.trim() })
            });
            const data = await res.json();
            if (res.ok) {
                Alert.alert("Success", "Payment submitted! The mess owner will verify and activate your membership.");
                setPaymentModalVisible(false);
                fetchData();
            } else {
                Alert.alert("Notice", data.error || "Failed to submit payment.");
            }
        } catch (e) {
            Alert.alert("Error", "Network connection failed.");
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const getAttendanceStatus = (messName: string, shift: string) => {
        const record = myAttendance.find(a => a.messName === messName && a.shift === shift);
        return record ? record.status : undefined;
    };

    const getAttendanceRecord = (messName: string, shift: string) => {
        return myAttendance.find(a => a.messName === messName && a.shift === shift);
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
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <TouchableOpacity onPress={handleOpenNotifications} style={styles.bellBtn}>
                        <Feather name="bell" size={18} color="#4f46e5" />
                        {unreadCount > 0 && (
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                        <Feather name="log-out" size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4f46e5']} tintColor="#4f46e5" />}
            >

                {isOffline && (
                    <View style={styles.offlineBanner}>
                        <Feather name="wifi-off" size={15} color="#b45309" />
                        <Text style={styles.offlineBannerText}>⚡ Offline Mode — Showing last synced campus data</Text>
                    </View>
                )}

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
                                {mySubscriptions.map(sub => {
                                    const isExpired = sub.status === 'expired';
                                    const isPaid = sub.status === 'paid';
                                    const isVerifying = sub.status === 'verification_pending';
                                    const isPending = sub.status === 'pending';

                                    return (
                                        <View key={sub._id} style={[styles.subBanner, isExpired && { borderColor: '#fde68a', backgroundColor: '#fffbeb' }, isVerifying && { borderColor: '#fed7aa', backgroundColor: '#fff7ed' }]}>
                                            <View style={styles.subBannerTop}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <View style={[styles.iconCircle, isExpired && { backgroundColor: '#fef3c7' }, isVerifying && { backgroundColor: '#ffedd5' }]}>
                                                        <Feather name={isExpired ? "alert-circle" : isVerifying ? "clock" : "award"} size={16} color={isExpired ? "#d97706" : isVerifying ? "#ea580c" : "#4f46e5"} />
                                                    </View>
                                                    <Text style={styles.subBannerTitle}>{sub.messName}</Text>
                                                </View>
                                                <Text style={[
                                                    styles.subStatusText,
                                                    isPaid ? { color: '#10b981' } : isVerifying ? { color: '#ea580c' } : isExpired ? { color: '#d97706' } : { color: '#f43f5e' }
                                                ]}>
                                                    {isVerifying ? 'VERIFYING' : sub.status.toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={styles.subBadgeRow}>
                                                <View style={styles.subBadge}><Text style={styles.subBadgeText}>{sub.shift} Shift</Text></View>
                                                <View style={[styles.subBadge, { backgroundColor: isExpired ? '#fee2e2' : '#fffbeb' }]}>
                                                    <Text style={[styles.subBadgeText, { color: isExpired ? '#ef4444' : '#d97706' }]}>
                                                        {isExpired ? 'Expired' : `Skips: ${sub.usedSkips}/${sub.allowedSkips}`}
                                                    </Text>
                                                </View>
                                                {isExpired && (
                                                    <View style={[styles.subBadge, { backgroundColor: '#fef3c7' }]}>
                                                        <Text style={[styles.subBadgeText, { color: '#b45309' }]}>Re-subscribe below</Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* UPI PAYMENT ACTIONS */}
                                            {isPending && sub.monthlyFee > 0 && (
                                                <TouchableOpacity style={styles.payUpiBtn} onPress={() => handleOpenPayment(sub)}>
                                                    <Feather name="credit-card" size={14} color="#ffffff" />
                                                    <Text style={styles.payUpiBtnText}>Pay ₹{sub.monthlyFee} via UPI 💳</Text>
                                                </TouchableOpacity>
                                            )}

                                            {isVerifying && (
                                                <View style={styles.verifyingBadge}>
                                                    <Feather name="clock" size={13} color="#ea580c" />
                                                    <Text style={styles.verifyingText}>VERIFYING PAYMENT ⏳ {sub.lastUtrNumber ? `(UTR: ${sub.lastUtrNumber})` : ''}</Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
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
                                <MessCard
                                    key={mess._id}
                                    mess={mess}
                                    initialAttendance={getAttendanceStatus(mess.messName, mess.shift)}
                                    initialAttendanceRecord={getAttendanceRecord(mess.messName, mess.shift)}
                                    targetDate={targetDate}
                                    mySub={mySubscriptions.find(s => s.messId === mess.ownerId._id || s.messId?._id === mess.ownerId._id)}
                                    onRefresh={fetchData}
                                    user={user}
                                />
                            ))
                        )}
                    </>
                )}

                {activeTab === 'map' && (
                    <View>
                        <Text style={styles.sectionTitle}>Messes Near You</Text>
                        <MessMap messes={nearbyMesses} />

                        {nearbyMesses.length > 0 && (
                            <View style={{ marginTop: 18 }}>
                                <Text style={[styles.sectionSubtitle, { marginBottom: 12 }]}>All Verified Messes ({nearbyMesses.length})</Text>
                                {nearbyMesses.map((mess) => {
                                    const [lng, lat] = mess.location?.coordinates || [0, 0];
                                    return (
                                        <View key={mess._id} style={styles.nearbyMessCard}>
                                            <View style={{ flex: 1, paddingRight: 8 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <Text style={styles.nearbyMessTitle}>{mess.messName}</Text>
                                                    {mess.distanceKm !== undefined && (
                                                        <View style={styles.distanceBadge}>
                                                            <Text style={styles.distanceBadgeText}>📍 {mess.distanceKm} km away</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={styles.nearbyMessAddress} numberOfLines={1}>{mess.messAddress || 'Avasari Khurd'}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                    <Text style={styles.ratingText}>⭐ {mess.ratingCount > 0 ? Number(mess.rating).toFixed(1) : 'New'}</Text>
                                                    <Text style={styles.ratingCountText}>({mess.ratingCount || 0} reviews)</Text>
                                                </View>
                                            </View>
                                            {lat !== 0 && (
                                                <TouchableOpacity
                                                    style={styles.directionsBtn}
                                                    onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)}
                                                >
                                                    <Feather name="navigation" size={14} color="#ffffff" />
                                                    <Text style={styles.directionsBtnText}>Go</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                {activeTab === 'directory' && (
                    <View>
                        <Text style={styles.sectionTitle}>Campus Directory</Text>

                        {/* Search Bar */}
                        <View style={styles.searchBarWrapper}>
                            <Feather name="search" size={16} color="#94a3b8" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by name, area, or amenities..."
                                placeholderTextColor="#94a3b8"
                                value={dirSearchQuery}
                                onChangeText={setDirSearchQuery}
                            />
                            {dirSearchQuery ? (
                                <TouchableOpacity onPress={() => setDirSearchQuery('')}>
                                    <Feather name="x" size={16} color="#94a3b8" />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {/* Category Filter Pills */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                {[
                                    { id: 'all', label: 'All Services' },
                                    { id: 'rooms', label: '🏠 Rooms' },
                                    { id: 'rickshaws', label: '🛺 Rickshaws' },
                                    { id: 'emergency', label: '🚨 Emergency' },
                                ].map((tab) => (
                                    <TouchableOpacity
                                        key={tab.id}
                                        style={[
                                            styles.dirPill,
                                            dirCategoryFilter === tab.id && styles.dirPillActive,
                                        ]}
                                        onPress={() => setDirCategoryFilter(tab.id as any)}
                                    >
                                        <Text
                                            style={[
                                                styles.dirPillText,
                                                dirCategoryFilter === tab.id && styles.dirPillTextActive,
                                            ]}
                                        >
                                            {tab.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {(() => {
                            const filtered = directoryData.filter((item) => {
                                if (dirCategoryFilter !== 'all' && item.category !== dirCategoryFilter) return false;
                                if (!dirSearchQuery.trim()) return true;
                                const q = dirSearchQuery.toLowerCase();
                                return (
                                    (item.name && item.name.toLowerCase().includes(q)) ||
                                    (item.area && item.area.toLowerCase().includes(q)) ||
                                    (item.amenities && item.amenities.some((a: string) => a.toLowerCase().includes(q)))
                                );
                            });

                            if (isLoading && directoryData.length === 0) {
                                return <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />;
                            }
                            if (filtered.length === 0) {
                                return (
                                    <View style={styles.emptyState}>
                                        <View style={styles.emptyIconCircle}><Feather name="search" size={32} color="#94a3b8" /></View>
                                        <Text style={styles.emptyStateTitle}>No listings found</Text>
                                        <Text style={styles.emptyStateSub}>Try clearing filters or search with another term.</Text>
                                    </View>
                                );
                            }

                            return filtered.map((item, idx) => (
                                <DirectoryCard key={item._id || idx} item={item} />
                            ));
                        })()}
                    </View>
                )}

                {activeTab === 'rides' && (
                    <View>
                        <View style={styles.ridesHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionTitle}>Campus Auto-Pool 🛺</Text>
                                <Text style={styles.sectionSubtitle}>
                                    Share rides & split fares between Campus, Manchar & Pune
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.createPoolBtn}
                                onPress={() => setRideModalVisible(true)}
                            >
                                <Feather name="plus" size={16} color="#ffffff" />
                                <Text style={styles.createPoolBtnText}>Post Ride</Text>
                            </TouchableOpacity>
                        </View>

                        {isRidesLoading && rides.length === 0 ? (
                            <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 40 }} />
                        ) : rides.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconCircle}>
                                    <Feather name="navigation" size={32} color="#94a3b8" />
                                </View>
                                <Text style={styles.emptyStateTitle}>No Active Pools</Text>
                                <Text style={styles.emptyStateSub}>Be the first to post an auto ride and split the fare!</Text>
                                <TouchableOpacity
                                    style={[styles.createPoolBtn, { marginTop: 14 }]}
                                    onPress={() => setRideModalVisible(true)}
                                >
                                    <Text style={styles.createPoolBtnText}>Create Ride Pool</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            rides.map((ride) => {
                                const isCreator = user?._id === ride.creatorId;
                                const hasJoined = ride.passengers.some((p: any) => p.studentId === user?._id);
                                const isFull = ride.passengers.length >= ride.totalSeats;
                                const currentFarePerHead = Math.ceil(ride.totalFare / Math.max(1, ride.passengers.length));
                                const fullFarePerHead = Math.ceil(ride.totalFare / ride.totalSeats);

                                return (
                                    <View key={ride._id} style={[styles.rideCard, hasJoined && styles.rideCardJoined]}>
                                        {/* Route Header */}
                                        <View style={styles.rideRouteRow}>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <Text style={styles.rideLocationText}>{ride.from}</Text>
                                                    <Feather name="arrow-right" size={14} color="#4f46e5" />
                                                    <Text style={styles.rideLocationText}>{ride.to}</Text>
                                                </View>
                                            </View>
                                            {isCreator ? (
                                                <View style={styles.hostBadge}>
                                                    <Text style={styles.hostBadgeText}>HOST</Text>
                                                </View>
                                            ) : hasJoined ? (
                                                <View style={styles.joinedBadge}>
                                                    <Text style={styles.joinedBadgeText}>JOINED</Text>
                                                </View>
                                            ) : null}
                                        </View>

                                        {/* Date & Time Row */}
                                        <View style={styles.rideMetaRow}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Feather name="calendar" size={13} color="#64748b" />
                                                <Text style={styles.rideMetaText}>{ride.date}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Feather name="clock" size={13} color="#64748b" />
                                                <Text style={styles.rideMetaText}>{ride.departureTime}</Text>
                                            </View>
                                        </View>

                                        {/* Fare Matrix */}
                                        <View style={styles.rideFareMatrix}>
                                            <View>
                                                <Text style={styles.fareLabel}>SPLIT FARE</Text>
                                                <Text style={styles.fareValue}>₹{currentFarePerHead}</Text>
                                                <Text style={styles.fareSubText}>/ person now</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={styles.fareLabel}>SEATS FILLED</Text>
                                                <Text style={styles.fareSeatsText}>
                                                    {ride.passengers.length} / {ride.totalSeats}
                                                </Text>
                                                <Text style={styles.fareSubText}>₹{fullFarePerHead} when full</Text>
                                            </View>
                                        </View>

                                        {/* Passenger List with Call Icon */}
                                        <View style={{ marginTop: 10 }}>
                                            <Text style={styles.passengersTitle}>CO-PASSENGERS:</Text>
                                            <View style={styles.passengersRow}>
                                                {ride.passengers.map((p: any, pIdx: number) => (
                                                    <View key={pIdx} style={styles.passengerChip}>
                                                        <Text style={styles.passengerName}>
                                                            {p.studentName?.split(' ')[0]} {p.studentId === user?._id ? '(You)' : ''}
                                                        </Text>
                                                        {hasJoined && p.phone && p.studentId !== user?._id && (
                                                            <TouchableOpacity
                                                                onPress={() => Linking.openURL(`tel:${p.phone}`)}
                                                                style={{ padding: 2 }}
                                                            >
                                                                <Feather name="phone" size={11} color="#059669" />
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                ))}
                                                {Array.from({ length: Math.max(0, ride.totalSeats - ride.passengers.length) }).map((_, eIdx) => (
                                                    <View key={`empty-${eIdx}`} style={styles.emptySeatChip}>
                                                        <Text style={styles.emptySeatText}>Open Seat</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>

                                        {/* Action Button Row */}
                                        <View style={styles.rideActionRow}>
                                            <Text style={styles.totalFareText}>Total Auto: ₹{ride.totalFare}</Text>
                                            {isCreator ? (
                                                <TouchableOpacity
                                                    style={styles.cancelPoolBtn}
                                                    onPress={() => handleCancelRide(ride._id)}
                                                >
                                                    <Text style={styles.cancelPoolText}>Cancel Pool</Text>
                                                </TouchableOpacity>
                                            ) : hasJoined ? (
                                                <TouchableOpacity
                                                    style={styles.leavePoolBtn}
                                                    onPress={() => handleToggleJoinRide(ride._id)}
                                                >
                                                    <Text style={styles.leavePoolText}>Leave Pool</Text>
                                                </TouchableOpacity>
                                            ) : isFull ? (
                                                <View style={styles.fullPoolBadge}>
                                                    <Text style={styles.fullPoolText}>Full</Text>
                                                </View>
                                            ) : (
                                                <TouchableOpacity
                                                    style={styles.joinPoolBtn}
                                                    onPress={() => handleToggleJoinRide(ride._id)}
                                                >
                                                    <Text style={styles.joinPoolText}>
                                                        Join Pool (Save ₹{Math.max(0, ride.totalFare - currentFarePerHead)})
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}

            </ScrollView>

            <View style={styles.floatingTabBar}>
                <TouchableOpacity style={styles.bottomTabBtn} onPress={() => setActiveTab('menus')}>
                    <Feather name="home" size={20} color={activeTab === 'menus' ? '#4f46e5' : '#94a3b8'} />
                    <Text style={[styles.bottomTabText, activeTab === 'menus' && styles.bottomTabTextActive]}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.bottomTabBtn} onPress={() => setActiveTab('directory')}>
                    <Feather name="book-open" size={20} color={activeTab === 'directory' ? '#4f46e5' : '#94a3b8'} />
                    <Text style={[styles.bottomTabText, activeTab === 'directory' && styles.bottomTabTextActive]}>Services</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.bottomTabBtn} onPress={() => setActiveTab('rides')}>
                    <Feather name="navigation" size={20} color={activeTab === 'rides' ? '#4f46e5' : '#94a3b8'} />
                    <Text style={[styles.bottomTabText, activeTab === 'rides' && styles.bottomTabTextActive]}>Pool 🛺</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.bottomTabBtn} onPress={() => setActiveTab('map')}>
                    <Feather name="map-pin" size={20} color={activeTab === 'map' ? '#4f46e5' : '#94a3b8'} />
                    <Text style={[styles.bottomTabText, activeTab === 'map' && styles.bottomTabTextActive]}>Map</Text>
                </TouchableOpacity>
            </View>

            {/* UPI PAYMENT MODAL */}
            <Modal visible={paymentModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={styles.modalTitle}>Pay Mess Fee 💳</Text>
                            <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                                <Feather name="x" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {selectedSubForPayment && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>
                                    {selectedSubForPayment.messName}
                                </Text>
                                <Text style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                                    Amount Due: <Text style={{ fontWeight: 'bold', color: '#10b981' }}>₹{selectedSubForPayment.monthlyFee}</Text>
                                </Text>
                                {selectedSubForPayment.messId?.upiId ? (
                                    <Text style={{ fontSize: 13, color: '#6366f1', marginTop: 4 }}>
                                        UPI ID: {selectedSubForPayment.messId.upiId}
                                    </Text>
                                ) : (
                                    <Text style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
                                        ⚠️ Mess owner has not set a custom UPI ID. Please confirm with the owner.
                                    </Text>
                                )}

                                <TouchableOpacity
                                    style={styles.upiAppBtn}
                                    onPress={() => {
                                        const upiId = selectedSubForPayment.messId?.upiId || 'messowner@upi';
                                        const url = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(selectedSubForPayment.messName)}&am=${selectedSubForPayment.monthlyFee}&cu=INR&tn=${encodeURIComponent('Mess Fee - ' + (user?.name || 'Student'))}`;
                                        Linking.openURL(url).catch(() => {
                                            Alert.alert("Notice", "Could not open a UPI app. You can manually pay to " + upiId + " and submit the UTR below.");
                                        });
                                    }}
                                >
                                    <Feather name="external-link" size={16} color="#ffffff" />
                                    <Text style={styles.upiAppBtnText}>Open UPI App (GPay / PhonePe / Paytm)</Text>
                                </TouchableOpacity>

                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 16, marginBottom: 6 }}>
                                    Enter 12-digit UPI Ref / UTR Number:
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 324109849201"
                                    placeholderTextColor="#94a3b8"
                                    value={utrInput}
                                    onChangeText={setUtrInput}
                                    keyboardType="numeric"
                                    maxLength={16}
                                />

                                <TouchableOpacity
                                    style={styles.submitPaymentBtn}
                                    onPress={handleSubmitUtr}
                                    disabled={isSubmittingPayment}
                                >
                                    {isSubmittingPayment ? (
                                        <ActivityIndicator color="#ffffff" size="small" />
                                    ) : (
                                        <Text style={styles.submitPaymentBtnText}>I Have Paid ✓</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* NOTIFICATIONS MODAL */}
            <Modal visible={notifModalVisible} transparent animationType="slide">
                <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
                    <View style={[styles.modalBox, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '80%' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Feather name="bell" size={20} color="#4f46e5" />
                                <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Notifications</Text>
                            </View>
                            <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                                <Feather name="x-circle" size={26} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        {notifications.length === 0 ? (
                            <View style={{ alignItems: 'center', padding: 32 }}>
                                <Feather name="bell-off" size={32} color="#cbd5e1" style={{ marginBottom: 12 }} />
                                <Text style={{ color: '#64748b', fontSize: 15 }}>No notifications yet</Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {notifications.map(n => (
                                    <View key={n._id} style={[styles.notifItem, !n.isRead && styles.notifUnread]}>
                                        <Text style={styles.notifTitle}>{n.title}</Text>
                                        <Text style={styles.notifBody}>{n.body}</Text>
                                        <Text style={styles.notifDate}>
                                            {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                ))}
                                <View style={{ height: 20 }} />
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* CREATE RIDE POOL MODAL */}
            <Modal visible={rideModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Feather name="navigation" size={20} color="#4f46e5" />
                                <Text style={styles.modalTitle}>Post Ride Pool 🛺</Text>
                            </View>
                            <TouchableOpacity onPress={() => setRideModalVisible(false)}>
                                <Feather name="x" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                            Split auto fare with students traveling in the same direction.
                        </Text>

                        {/* Presets */}
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Quick Route Presets:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                            {[
                                { from: 'GCOEARA Gate', to: 'Manchar Stand', fare: '60', seats: '3' },
                                { from: 'Manchar Stand', to: 'GCOEARA Gate', fare: '60', seats: '3' },
                                { from: 'Campus Gate', to: 'Narayangaon', fare: '100', seats: '3' },
                                { from: 'Campus Gate', to: 'Pune Shivajinagar', fare: '400', seats: '4' },
                            ].map((p, pIdx) => (
                                <TouchableOpacity
                                    key={pIdx}
                                    style={styles.presetChip}
                                    onPress={() => setNewRideForm(prev => ({ ...prev, from: p.from, to: p.to, totalFare: p.fare, totalSeats: p.seats }))}
                                >
                                    <Text style={styles.presetChipText}>{p.from} ➔ {p.to} (₹{p.fare})</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.formInputLabel}>Pickup From:</Text>
                        <TextInput
                            style={styles.modalTextInput}
                            placeholder="e.g. GCOEARA Campus Gate"
                            value={newRideForm.from}
                            onChangeText={(v) => setNewRideForm(p => ({ ...p, from: v }))}
                        />

                        <Text style={styles.formInputLabel}>Drop To:</Text>
                        <TextInput
                            style={styles.modalTextInput}
                            placeholder="e.g. Manchar Bus Stand"
                            value={newRideForm.to}
                            onChangeText={(v) => setNewRideForm(p => ({ ...p, to: v }))}
                        />

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.formInputLabel}>Date (YYYY-MM-DD):</Text>
                                <TextInput
                                    style={styles.modalTextInput}
                                    value={newRideForm.date}
                                    onChangeText={(v) => setNewRideForm(p => ({ ...p, date: v }))}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.formInputLabel}>Time (HH:mm):</Text>
                                <TextInput
                                    style={styles.modalTextInput}
                                    value={newRideForm.departureTime}
                                    onChangeText={(v) => setNewRideForm(p => ({ ...p, departureTime: v }))}
                                />
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.formInputLabel}>Seats:</Text>
                                <TextInput
                                    style={styles.modalTextInput}
                                    keyboardType="numeric"
                                    value={newRideForm.totalSeats}
                                    onChangeText={(v) => setNewRideForm(p => ({ ...p, totalSeats: v }))}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.formInputLabel}>Total Auto Fare (₹):</Text>
                                <TextInput
                                    style={styles.modalTextInput}
                                    keyboardType="numeric"
                                    value={newRideForm.totalFare}
                                    onChangeText={(v) => setNewRideForm(p => ({ ...p, totalFare: v }))}
                                />
                            </View>
                        </View>

                        <View style={styles.estimatedSplitBanner}>
                            <Text style={styles.estimatedSplitLabel}>Split Per Person (Full):</Text>
                            <Text style={styles.estimatedSplitValue}>
                                ₹{Math.ceil((Number(newRideForm.totalFare) || 60) / Math.max(1, Number(newRideForm.totalSeats) || 3))}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitRideBtn, isSubmittingRide && { opacity: 0.6 }]}
                            onPress={handleCreateRide}
                            disabled={isSubmittingRide}
                        >
                            {isSubmittingRide ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.submitRideBtnText}>Publish Ride Pool 🛺</Text>
                            )}
                        </TouchableOpacity>
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

    // Phase 3 Styles
    bellBtn: { padding: 10, borderRadius: 12, backgroundColor: '#e0e7ff', position: 'relative' },
    notifBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    notifBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },
    payUpiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4f46e5', paddingVertical: 10, borderRadius: 12, marginTop: 12, gap: 8 },
    payUpiBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
    verifyingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffedd5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 10, gap: 6 },
    verifyingText: { color: '#c2410c', fontSize: 12, fontWeight: 'bold' },
    mealQrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 14, marginBottom: 16, gap: 8 },
    mealQrBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
    mealClaimedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#dcfce7', paddingVertical: 10, borderRadius: 12, marginBottom: 16, gap: 6, borderWidth: 1, borderColor: '#86efac' },
    mealClaimedText: { color: '#15803d', fontSize: 13, fontWeight: 'bold' },
    qrContainer: { padding: 16, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 16 },
    timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    timerText: { color: '#b45309', fontWeight: 'bold', fontSize: 13 },
    upiAppBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 12, marginTop: 14, gap: 8 },
    upiAppBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
    submitPaymentBtn: { backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
    submitPaymentBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 15 },
    notifItem: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    notifUnread: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
    notifTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
    notifBody: { fontSize: 13, color: '#475569', marginBottom: 6 },
    notifDate: { fontSize: 11, color: '#94a3b8' },

    // Directory Filters & Search Styles
    searchBarWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, gap: 8 },
    searchInput: { flex: 1, fontSize: 13, color: '#0f172a', padding: 0 },
    dirPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
    dirPillActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
    dirPillText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    dirPillTextActive: { color: '#ffffff' },
    dirBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    dirCatBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    dirCatBadgeText: { fontSize: 10, fontWeight: '800' },
    catBadgeEmergency: { backgroundColor: '#ffe4e6' },
    catBadgeRooms: { backgroundColor: '#dcfce7' },
    catBadgeRickshaw: { backgroundColor: '#e0f2fe' },
    catTextEmergency: { color: '#e11d48' },
    catTextRooms: { color: '#15803d' },
    catTextRickshaw: { color: '#0369a1' },
    dirVacancyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    dirVacancyBadgeText: { fontSize: 10, fontWeight: '800' },
    dirVacancyOpen: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
    dirVacancyFull: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
    dirRentText: { fontSize: 13, fontWeight: '900', color: '#059669' },
    dirGenderTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    dirGenderText: { fontSize: 10, fontWeight: '700', color: '#475569' },
    dirAmenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    dirAmenityChip: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    dirAmenityText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
    dirArea: { fontSize: 11, color: '#64748b', marginTop: 2 },

    // Rides Styles
    ridesHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    sectionSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
    createPoolBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
    createPoolBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
    rideCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
    rideCardJoined: { borderColor: '#c7d2fe', backgroundColor: '#f5f7ff' },
    rideRouteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    rideLocationText: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
    hostBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    hostBadgeText: { color: '#b45309', fontSize: 10, fontWeight: '900' },
    joinedBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    joinedBadgeText: { color: '#4338ca', fontSize: 10, fontWeight: '900' },
    rideMetaRow: { flexDirection: 'row', gap: 14, marginBottom: 10 },
    rideMetaText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    rideFareMatrix: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, marginBottom: 8 },
    fareLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5 },
    fareValue: { fontSize: 18, fontWeight: '900', color: '#059669' },
    fareSeatsText: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
    fareSubText: { fontSize: 10, color: '#94a3b8' },
    passengersTitle: { fontSize: 10, fontWeight: '800', color: '#94a3b8', marginBottom: 4, letterSpacing: 0.5 },
    passengersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    passengerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    passengerName: { fontSize: 11, fontWeight: '700', color: '#334155' },
    emptySeatChip: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    emptySeatText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
    rideActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 4 },
    totalFareText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    cancelPoolBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fee2e2' },
    cancelPoolText: { color: '#dc2626', fontWeight: 'bold', fontSize: 12 },
    leavePoolBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fef3c7' },
    leavePoolText: { color: '#b45309', fontWeight: 'bold', fontSize: 12 },
    fullPoolBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
    fullPoolText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 12 },
    joinPoolBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#4f46e5' },
    joinPoolText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

    // Create Ride Modal Styles
    presetChip: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#e2e8f0' },
    presetChipText: { fontSize: 11, fontWeight: '700', color: '#4338ca' },
    formInputLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4, marginTop: 4 },
    modalTextInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: '#0f172a', marginBottom: 4 },
    estimatedSplitBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ecfdf5', borderRadius: 10, padding: 10, marginVertical: 8, borderWidth: 1, borderColor: '#a7f3d0' },
    estimatedSplitLabel: { fontSize: 12, fontWeight: '700', color: '#065f46' },
    estimatedSplitValue: { fontSize: 16, fontWeight: '900', color: '#059669' },
    submitRideBtn: { backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 4 },
    submitRideBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },

    // Offline Banner & Nearby Mess Styles
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fde68a',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        marginBottom: 16,
    },
    offlineBannerText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#92400e',
        flex: 1,
    },
    nearbyMessCard: {
        backgroundColor: '#ffffff',
        padding: 14,
        borderRadius: 18,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    nearbyMessTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0f172a',
    },
    nearbyMessAddress: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    distanceBadge: {
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#d1fae5',
    },
    distanceBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#065f46',
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#b45309',
    },
    ratingCountText: {
        fontSize: 11,
        color: '#94a3b8',
    },
    directionsBtn: {
        backgroundColor: '#4f46e5',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        marginLeft: 8,
    },
    directionsBtnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
    },
});