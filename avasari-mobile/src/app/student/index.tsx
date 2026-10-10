import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Linking, SafeAreaView, Platform, StatusBar, Modal, TextInput, RefreshControl, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

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
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
                body: JSON.stringify({ rating, comment, tags: selectedTags })
            });

            if (response.ok) {
                Alert.alert("Success", "Thank you for your feedback!");
                setReviewModalVisible(false);
                setRating(0);
                setComment('');
                setSelectedTags([]);
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

    const isTopChef = Boolean(mess.ownerId?.isTopChef || mess.isTopChef);
    const topTags: string[] = (mess.ownerId?.topTags || mess.topTags || []);

    return (
        <View style={[styles.card, attendance === 'coming' ? styles.cardComing : attendance === 'not_coming' ? styles.cardSkip : null]}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <View style={styles.badgeRow}>
                        {isTopChef && (
                            <View style={styles.topChefBadgeHeader}>
                                <Text style={styles.topChefBadgeHeaderText}>👑 Campus Top Chef</Text>
                            </View>
                        )}
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
                    {topTags.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                            {topTags.map((tag: string, idx: number) => (
                                <View key={idx} style={styles.tagBadge}>
                                    <Text style={styles.tagBadgeText}>🏷️ {tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}
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

            {targetDate === todayIST && (attendance === 'coming' || (mySub?.status === 'paid' && attendance !== 'not_coming')) && (
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

                        <Text style={styles.ratingTagPrompt}>Select quality tags (tap to choose):</Text>
                        <View style={styles.ratingTagsContainer}>
                            {['Hygiene', 'Taste', 'Portion Size', 'Speed', 'Value for Money', 'Friendly Staff'].map(tag => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                    <TouchableOpacity
                                        key={tag}
                                        style={[styles.ratingTagChip, isSelected && styles.ratingTagChipActive]}
                                        onPress={() => {
                                            setSelectedTags(prev =>
                                                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                            );
                                        }}
                                    >
                                        <Text style={[styles.ratingTagChipText, isSelected && styles.ratingTagChipTextActive]}>
                                            {isSelected ? '✓ ' : '+ '}{tag}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
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
                                        {rev.tags && rev.tags.length > 0 && (
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                                {rev.tags.map((t: string, tIdx: number) => (
                                                    <View key={tIdx} style={styles.reviewTagBadge}>
                                                        <Text style={styles.reviewTagText}>🏷️ {t}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
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

    // Profile Modal State
    const [profileModalVisible, setProfileModalVisible] = useState<boolean>(false);

    // UPI Payment & QR Fallback State
    const [paymentModalVisible, setPaymentModalVisible] = useState<boolean>(false);
    const [fallbackQrModalVisible, setFallbackQrModalVisible] = useState<boolean>(false);
    const [paymentQrString, setPaymentQrString] = useState<string>('');
    const [selectedSubForPayment, setSelectedSubForPayment] = useState<any>(null);
    const [utrInput, setUtrInput] = useState<string>('');
    const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

    // 24H Mess Stories State
    const [storiesGroups, setStoriesGroups] = useState<any[]>([]);
    const [selectedStoryGroup, setSelectedStoryGroup] = useState<any | null>(null);
    const [storyModalVisible, setStoryModalVisible] = useState<boolean>(false);
    const [currentStoryIndex, setCurrentStoryIndex] = useState<number>(0);

    // Dedicated Top-Level Digital Meal Pass State
    const [topMealPassShift, setTopMealPassShift] = useState<'morning' | 'night'>(new Date().getHours() < 15 ? 'morning' : 'night');
    const [topMealModalVisible, setTopMealModalVisible] = useState<boolean>(false);
    const [topMealQrToken, setTopMealQrToken] = useState<string>('');
    const [topMealQrLoading, setTopMealQrLoading] = useState<boolean>(false);
    const [topMealQrExpirySeconds, setTopMealQrExpirySeconds] = useState<number>(900);
    const [topMealCelebration, setTopMealCelebration] = useState<boolean>(false);
    const [topMealMessData, setTopMealMessData] = useState<{ messName: string; shift: string }>({ messName: '', shift: '' });

    // Student ID OCR Verification State
    const [verifyIdModalOpen, setVerifyIdModalOpen] = useState<boolean>(false);
    const [idImageUri, setIdImageUri] = useState<string | null>(null);
    const [idBase64, setIdBase64] = useState<string | null>(null);
    const [isVerifyingId, setIsVerifyingId] = useState<boolean>(false);
    const [ocrErrorMsg, setOcrErrorMsg] = useState<string | null>(null);

    const fetchStories = async () => {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/stories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStoriesGroups(data);
            }
        } catch (e) {
            console.warn("Failed to fetch stories", e);
        }
    };

    const promptPickIdCard = async (useCamera: boolean) => {
        try {
            let result;
            if (useCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert("Permission Required", "Camera access is needed to capture your student ID card.");
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [16, 10],
                    quality: 0.85,
                    base64: true,
                });
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert("Permission Required", "Gallery access is needed to select your student ID card photo.");
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [16, 10],
                    quality: 0.85,
                    base64: true,
                });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setIdImageUri(asset.uri);
                const b64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
                setIdBase64(b64);
                setVerifyIdModalOpen(true);
            }
        } catch (e: any) {
            Alert.alert("Error", `Could not select photo: ${e.message}`);
        }
    };

    const handleVerifyStudentId = async () => {
        if (!idBase64) {
            Alert.alert("Missing Photo", "Please snap or select your college ID card first.");
            return;
        }
        setIsVerifyingId(true);
        setOcrErrorMsg(null);
        const token = await AsyncStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/users/verify-id`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ base64Image: idBase64 })
            });
            const data = await res.json();
            if (res.ok) {
                Alert.alert("🎉 Verification Success!", "Verified GCOEARA Student ✓! Your identity has been verified with AI OCR. Your profile and ride pool listings now display the verified trust badge.");
                setUser((prev: any) => ({ ...prev, isStudentVerified: true }));
                setVerifyIdModalOpen(false);
                setIdImageUri(null);
                setIdBase64(null);
                setOcrErrorMsg(null);
                fetchRides();
            } else {
                setOcrErrorMsg(data.error || "ID verification failed. Make sure the college name 'Government College of Engineering, Avasari' is visible in the frame.");
            }
        } catch (e: any) {
            setOcrErrorMsg("Network error contacting OCR server. Try again or submit for manual approval.");
        } finally {
            setIsVerifyingId(false);
        }
    };

    const handleManualApproveStudentId = async () => {
        setIsVerifyingId(true);
        setOcrErrorMsg(null);
        const token = await AsyncStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/users/verify-id`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ manualApproval: true })
            });
            const data = await res.json();
            if (res.ok) {
                Alert.alert("🎉 Approved!", "Verified GCOEARA Student ✓! Your student identity has been approved.");
                setUser((prev: any) => ({ ...prev, isStudentVerified: true }));
                setVerifyIdModalOpen(false);
                setIdImageUri(null);
                setIdBase64(null);
                setOcrErrorMsg(null);
                fetchRides();
            } else {
                Alert.alert("Error", data.error || "Manual approval failed.");
            }
        } catch {
            Alert.alert("Error", "Network error submitting manual approval.");
        } finally {
            setIsVerifyingId(false);
        }
    };

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
                fetchStories();
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

        const onStoryNew = () => {
            fetchStories();
        };

        socket.on('menu:updated', onMenuUpdated);
        socket.on('attendance:updated', onAttendanceUpdated);
        socket.on('subscription:updated', onSubscriptionUpdated);
        socket.on('notification:new', onNotificationNew);
        socket.on('ride:updated', onRideUpdated);
        socket.on('story:new', onStoryNew);

        return () => {
            socket.off('menu:updated', onMenuUpdated);
            socket.off('attendance:updated', onAttendanceUpdated);
            socket.off('subscription:updated', onSubscriptionUpdated);
            socket.off('notification:new', onNotificationNew);
            socket.off('ride:updated', onRideUpdated);
            socket.off('story:new', onStoryNew);
        };
    }, [targetDate, activeTab, user]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchData(), fetchStories()]);
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

    const openFallbackQrModal = (upiUrl: string, sub?: any) => {
        if (sub) setSelectedSubForPayment(sub);
        setPaymentQrString(upiUrl);
        setFallbackQrModalVisible(true);
        setPaymentModalVisible(true);
    };

    const handlePayViaUPI = async (sub: any) => {
        if (!sub) return;
        setSelectedSubForPayment(sub);
        setUtrInput('');
        const ownerUpiId = sub.messId?.upiId || sub.upiId || '';
        const ownerName = encodeURIComponent(sub.messId?.name || sub.messName || 'Mess Owner');
        const amount = sub.monthlyFee;

        if (!ownerUpiId) {
            Alert.alert(
                "UPI ID Not Found",
                "The mess owner has not added their UPI ID yet. You can submit your payment UTR transaction number below.",
                [{ text: "Enter UTR", onPress: () => {
                    setPaymentQrString('');
                    setPaymentModalVisible(true);
                    setFallbackQrModalVisible(true);
                }}]
            );
            return;
        }

        const upiUrl = `upi://pay?pa=${ownerUpiId}&pn=${ownerName}&am=${amount}&cu=INR`;
        setPaymentQrString(upiUrl);

        try {
            // Attempt to open native UPI apps (GPay, PhonePe, Paytm)
            await Linking.openURL(upiUrl);
            setPaymentModalVisible(true);
            setFallbackQrModalVisible(true);
        } catch (err) {
            // Fallback if no UPI app is installed or intent fails
            openFallbackQrModal(upiUrl, sub);
        }
    };

    const handleOpenPayment = (sub: any) => {
        setSelectedSubForPayment(sub);
        setUtrInput('');
        const ownerUpiId = sub.messId?.upiId || sub.upiId || '';
        const ownerName = encodeURIComponent(sub.messId?.name || sub.messName || 'Mess Owner');
        const amount = sub.monthlyFee;
        const upiUrl = ownerUpiId ? `upi://pay?pa=${ownerUpiId}&pn=${ownerName}&am=${amount}&cu=INR` : '';
        setPaymentQrString(upiUrl);
        setPaymentModalVisible(true);
        setFallbackQrModalVisible(true);
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
                setFallbackQrModalVisible(false);
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

    // Dedicated Top-Level Digital Meal Pass Computations
    const todayStr = getLocalDateString(0);
    const activePaidSub = mySubscriptions.find((s: any) => s.status === 'paid' && (s.shift === 'both' || s.shift === topMealPassShift)) || mySubscriptions.find((s: any) => s.status === 'paid');
    const todayAtt = myAttendance.find((a: any) => a.shift === topMealPassShift && (!a.targetDate || a.targetDate === todayStr));
    const hasTopMealPass = Boolean(
        (activePaidSub && (!todayAtt || todayAtt.status !== 'not_coming')) ||
        (todayAtt && todayAtt.status === 'coming')
    );
    const topMealPassMessId = todayAtt?.messId || (activePaidSub?.messId?._id || activePaidSub?.messId);
    const topMealPassMessName = todayAtt?.messName || activePaidSub?.messName || 'Your Mess';
    const topMealPassIsConsumed = Boolean(todayAtt?.isConsumed);

    // Live timer effect for QR pass expiry
    useEffect(() => {
        if (!topMealModalVisible) return;
        const timer = setInterval(() => {
            setTopMealQrExpirySeconds(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [topMealModalVisible]);

    // Socket.io listener for counter QR scan verification
    useEffect(() => {
        const socket = getSocket();
        const onAttendanceConsumed = (data: any) => {
            if (data?.studentId === user?._id && data?.shift === topMealPassShift) {
                setTopMealCelebration(true);
                fetchData();
                setTimeout(() => {
                    setTopMealCelebration(false);
                    setTopMealModalVisible(false);
                }, 3200);
            }
        };
        socket.on('attendance:consumed', onAttendanceConsumed);
        return () => {
            socket.off('attendance:consumed', onAttendanceConsumed);
        };
    }, [user, topMealPassShift]);

    const handleOpenTopMealQr = async (shift: 'morning' | 'night') => {
        if (!topMealPassMessId) {
            Alert.alert("Notice", "No active mess subscription found.");
            return;
        }
        setTopMealQrLoading(true);
        setTopMealQrToken('');
        setTopMealModalVisible(true);
        setTopMealQrExpirySeconds(900);
        setTopMealCelebration(false);
        const token = await AsyncStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/attendance/qr/${topMealPassMessId}/${todayStr}/${shift}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.qrToken) {
                setTopMealQrToken(data.qrToken);
                setTopMealMessData({
                    messName: data.messName || topMealPassMessName,
                    shift: data.shift || shift
                });
            } else {
                Alert.alert("Notice", data.error || "Could not generate meal pass.");
                setTopMealModalVisible(false);
            }
        } catch {
            Alert.alert("Error", "Network connection failed.");
            setTopMealModalVisible(false);
        } finally {
            setTopMealQrLoading(false);
        }
    };

    const handleRefreshTopMealQr = () => {
        handleOpenTopMealQr(topMealPassShift);
    };

    if (!user) return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

            <View style={styles.header}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.greeting}>Hi, {user.name.split(' ')[0]} 👋</Text>
                        {user.isStudentVerified ? (
                            <View style={styles.verifiedHeaderBadge}>
                                <Feather name="check-circle" size={11} color="#2563eb" />
                                <Text style={styles.verifiedHeaderText}>Verified GCOEARA Student ✓</Text>
                            </View>
                        ) : null}
                    </View>
                    {!user.isStudentVerified ? (
                        <TouchableOpacity
                            style={styles.verifyPromptBanner}
                            onPress={() => {
                                Alert.alert(
                                    "Verify College ID 🪪",
                                    "Scan your GCOEARA student ID card using AI OCR to earn the verified student trust badge for auto pooling.",
                                    [
                                        { text: "Take Photo 📷", onPress: () => promptPickIdCard(true) },
                                        { text: "Choose from Gallery 🖼️", onPress: () => promptPickIdCard(false) },
                                        { text: "Cancel", style: "cancel" }
                                    ]
                                );
                            }}
                        >
                            <Feather name="shield" size={12} color="#ea580c" />
                            <Text style={styles.verifyPromptText}>Verify College ID 🪪 (Tap to scan)</Text>
                        </TouchableOpacity>
                    ) : null}
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
                    <TouchableOpacity onPress={() => setProfileModalVisible(true)} style={styles.profileHeaderBtn} activeOpacity={0.8}>
                        <Feather name="user" size={16} color="#4f46e5" />
                        <Text style={styles.profileHeaderBtnText}>My Profile</Text>
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
                        {/* --- 24-HOUR LIVE MESS STORIES FEED --- */}
                        {storiesGroups.length > 0 && (
                            <View style={styles.storiesContainer}>
                                <View style={styles.storiesSectionHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Feather name="camera" size={15} color="#ea580c" />
                                        <Text style={styles.storiesSectionTitle}>Live Mess Stories</Text>
                                    </View>
                                    <View style={styles.liveIndicatorPill}>
                                        <View style={styles.liveDot} />
                                        <Text style={styles.liveIndicatorText}>24H LIVE</Text>
                                    </View>
                                </View>

                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
                                    {storiesGroups.map((group, gIdx) => {
                                        const latest = group.latestStory || (group.stories && group.stories[0]);
                                        const imageUrl = latest?.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200';
                                        return (
                                            <TouchableOpacity
                                                key={group.ownerId || gIdx}
                                                style={styles.storyBubbleItem}
                                                onPress={() => {
                                                    setSelectedStoryGroup(group);
                                                    setCurrentStoryIndex(0);
                                                    setStoryModalVisible(true);
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <View style={styles.storyGradientRing}>
                                                    <View style={styles.storyImageWrapper}>
                                                        <Image source={{ uri: imageUrl }} style={styles.storyAvatarImage} resizeMode="cover" />
                                                    </View>
                                                </View>
                                                <Text style={styles.storyBubbleLabel} numberOfLines={1}>
                                                    {group.messName || 'Mess'}
                                                </Text>
                                                <View style={styles.storyLiveBadge}>
                                                    <Text style={styles.storyLiveBadgeText}>LIVE</Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

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

                                            {/* Membership Expiry Visibility */}
                                            {isPaid && sub.endDate && (() => {
                                                const daysRemaining = Math.ceil((new Date(sub.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                                const formattedDate = new Date(sub.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                                return (
                                                    <View style={{ marginTop: 10 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                            <Feather name="calendar" size={13} color="#4f46e5" />
                                                            <Text style={styles.subExpiryDateText}>
                                                                Valid until: {formattedDate}
                                                            </Text>
                                                        </View>
                                                        {daysRemaining <= 3 && (
                                                            <View style={styles.subExpiryWarningBadge}>
                                                                <Feather name="alert-triangle" size={13} color="#b45309" />
                                                                <Text style={styles.subExpiryWarningText}>
                                                                    {daysRemaining <= 0
                                                                        ? '⚠️ Expiring today! Renew soon.'
                                                                        : `⚠️ Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}! Renew soon.`}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                );
                                            })()}

                                            {/* 1-TAP UPI PAYMENT ACTIONS */}
                                            {(isPending || isExpired) && sub.monthlyFee > 0 && (
                                                <View style={{ marginTop: 12, gap: 8 }}>
                                                    <TouchableOpacity
                                                        style={styles.payUpiBtn}
                                                        onPress={() => handlePayViaUPI(sub)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Feather name="zap" size={15} color="#ffffff" />
                                                        <Text style={styles.payUpiBtnText}>Pay via UPI App 💸 (₹{sub.monthlyFee})</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={styles.secondaryQrBtn}
                                                        onPress={() => handleOpenPayment(sub)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Feather name="maximize" size={14} color="#4f46e5" />
                                                        <Text style={styles.secondaryQrBtnText}>Show Payment QR / Enter UTR</Text>
                                                    </TouchableOpacity>
                                                </View>
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

                        {/* DEDICATED TOP-LEVEL DIGITAL MEAL PASS SECTION (ALWAYS ACCESSIBLE EVEN WHEN NO MENU PUBLISHED) */}
                        {hasTopMealPass && (
                            <View style={styles.topMealPassCard}>
                                <View style={styles.topMealPassHeader}>
                                    <View style={styles.topMealPassBadge}>
                                        <Feather name="maximize" size={13} color="#a5b4fc" />
                                        <Text style={styles.topMealPassBadgeText}>🎟️ Digital Meal Pass</Text>
                                    </View>
                                    <Text style={styles.topMealPassDateText}>Today ({todayStr})</Text>
                                </View>

                                <Text style={styles.topMealPassTitle}>{topMealPassMessName}</Text>
                                <Text style={styles.topMealPassSub}>Instant student counter pass for dining service</Text>

                                <View style={styles.topMealPassActionRow}>
                                    {/* Shift Toggle */}
                                    <View style={styles.topMealPassShiftToggle}>
                                        <TouchableOpacity
                                            style={[styles.topMealPassShiftBtn, topMealPassShift === 'morning' && styles.topMealPassShiftBtnActive]}
                                            onPress={() => setTopMealPassShift('morning')}
                                        >
                                            <Text style={[styles.topMealPassShiftBtnText, topMealPassShift === 'morning' && styles.topMealPassShiftBtnTextActive]}>
                                                ☀️ Morning
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.topMealPassShiftBtn, topMealPassShift === 'night' && styles.topMealPassShiftBtnActive]}
                                            onPress={() => setTopMealPassShift('night')}
                                        >
                                            <Text style={[styles.topMealPassShiftBtnText, topMealPassShift === 'night' && styles.topMealPassShiftBtnTextActive]}>
                                                🌙 Night
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Pass Action Button */}
                                    {topMealPassIsConsumed ? (
                                        <View style={styles.topMealPassClaimedBadge}>
                                            <Feather name="check-circle" size={15} color="#34d399" />
                                            <Text style={styles.topMealPassClaimedText}>Meal Claimed ✓</Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.topMealPassShowBtn}
                                            onPress={() => handleOpenTopMealQr(topMealPassShift)}
                                            activeOpacity={0.8}
                                        >
                                            <Feather name="maximize" size={15} color="#ffffff" />
                                            <Text style={styles.topMealPassShowBtnText}>Show Meal Pass QR 🎟️</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
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
                    <View style={styles.nearbySection}>
                        <View style={styles.nearbyHeaderRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionTitle}>Nearby Messes 🍲</Text>
                                <Text style={styles.sectionSubtitle}>
                                    Find verified dining spots near campus with live distance & directions
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.nearbyRefreshBtn}
                                onPress={fetchData}
                                activeOpacity={0.7}
                            >
                                <Feather name="refresh-cw" size={16} color="#4f46e5" />
                            </TouchableOpacity>
                        </View>

                        {nearbyMesses.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconCircle}>
                                    <Feather name="map-pin" size={32} color="#94a3b8" />
                                </View>
                                <Text style={styles.emptyStateTitle}>No nearby messes found</Text>
                                <Text style={styles.emptyStateSub}>Turn on GPS location or check back soon!</Text>
                                <TouchableOpacity style={styles.emptyStateBtn} onPress={fetchData}>
                                    <Feather name="refresh-cw" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                                    <Text style={styles.emptyStateBtnText}>Refresh Messes</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.nearbyListContainer}>
                                {nearbyMesses.map((mess) => {
                                    const lng = mess.location?.coordinates?.[0] ?? 0;
                                    const lat = mess.location?.coordinates?.[1] ?? 0;
                                    const hasCoordinates = lat !== 0 || lng !== 0;

                                    return (
                                        <View key={mess._id} style={styles.nearbyMessCard}>
                                            <View style={styles.nearbyMessCardTop}>
                                                <View style={{ flex: 1, paddingRight: 8 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        <Text style={styles.nearbyMessTitle}>{mess.messName}</Text>
                                                        {mess.isTopChef && (
                                                            <View style={styles.topChefBadgeHeader}>
                                                                <Text style={styles.topChefBadgeHeaderText}>👑 Top Chef</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={styles.nearbyMessAddress} numberOfLines={2}>
                                                        {mess.messAddress || 'Avasari Khurd, Campus Area'}
                                                    </Text>
                                                </View>

                                                {mess.distanceKm !== undefined ? (
                                                    <View style={styles.distanceBadge}>
                                                        <Text style={styles.distanceBadgeText}>📍 {mess.distanceKm} km</Text>
                                                    </View>
                                                ) : (
                                                    <View style={[styles.distanceBadge, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
                                                        <Text style={[styles.distanceBadgeText, { color: '#64748b' }]}>📍 Nearby</Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.nearbyMessMetaRow}>
                                                <View style={styles.nearbyMetaPill}>
                                                    <Text style={styles.ratingText}>
                                                        ⭐ {mess.ratingCount > 0 ? Number(mess.rating).toFixed(1) : 'New'}
                                                    </Text>
                                                    <Text style={styles.ratingCountText}>
                                                        ({mess.ratingCount || 0} reviews)
                                                    </Text>
                                                </View>

                                                <View style={[styles.nearbyMetaPill, { backgroundColor: '#ecfdf5' }]}>
                                                    <Feather name="check-circle" size={12} color="#059669" />
                                                    <Text style={[styles.ratingCountText, { color: '#065f46', fontWeight: '700' }]}>
                                                        FSSAI: {mess.fssaiNumber || 'Verified'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {mess.topTags && mess.topTags.length > 0 && (
                                                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                                    {mess.topTags.slice(0, 3).map((tag: string, idx: number) => (
                                                        <View key={idx} style={styles.tagBadge}>
                                                            <Text style={styles.tagBadgeText}>🏷️ {tag}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}

                                            <TouchableOpacity
                                                style={[styles.getDirectionsBtn, !hasCoordinates && styles.directionsBtnDisabled]}
                                                onPress={() => {
                                                    if (hasCoordinates) {
                                                        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                                                        Linking.openURL(url);
                                                    } else {
                                                        Alert.alert("Notice", "Location coordinates not available for this mess.");
                                                    }
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <Feather name="navigation" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                                                <Text style={styles.getDirectionsBtnText}>Get Directions 🗺️</Text>
                                            </TouchableOpacity>
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
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                {ride.creatorIsVerified && (
                                                    <View style={styles.verifiedStudentChip}>
                                                        <Feather name="check-circle" size={11} color="#2563eb" />
                                                        <Text style={styles.verifiedStudentChipText}>Verified ✓</Text>
                                                    </View>
                                                )}
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
                                                            {p.studentName?.split(' ')[0] || p.name?.split(' ')[0] || 'Student'} {p.studentId === user?._id || p.userId === user?._id ? '(You)' : ''}
                                                        </Text>
                                                        {p.isStudentVerified ? (
                                                            <View style={{ marginLeft: 3, flexDirection: 'row', alignItems: 'center' }}>
                                                                <Feather name="check-circle" size={11} color="#2563eb" />
                                                            </View>
                                                        ) : null}
                                                        {hasJoined && p.phone && p.studentId !== user?._id && (
                                                            <TouchableOpacity
                                                                onPress={() => Linking.openURL(`tel:${p.phone}`)}
                                                                style={{ padding: 2, marginLeft: 2 }}
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
                    <Text style={[styles.bottomTabText, activeTab === 'map' && styles.bottomTabTextActive]}>Nearby</Text>
                </TouchableOpacity>
            </View>

            {/* STUDENT PROFILE MODAL */}
            <Modal visible={profileModalVisible} transparent animationType="slide" onRequestClose={() => setProfileModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={styles.profileAvatarIcon}>
                                    <Feather name="user" size={18} color="#4f46e5" />
                                </View>
                                <Text style={styles.modalTitle}>My Student Profile</Text>
                            </View>
                            <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                                <Feather name="x" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.profileDetailsCard}>
                            <View style={styles.profileUserHeader}>
                                <View style={styles.profileBigAvatar}>
                                    <Text style={styles.profileAvatarInitials}>
                                        {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'}
                                    </Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <Text style={styles.profileFullName}>{user?.name || 'Student'}</Text>
                                        {user?.isStudentVerified && (
                                            <View style={styles.blueVerifiedBadge}>
                                                <Feather name="check-circle" size={12} color="#2563eb" />
                                                <Text style={styles.blueVerifiedText}>Verified</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.profileRoleText}>Role: {user?.role ? user.role.toUpperCase() : 'STUDENT'}</Text>
                                </View>
                            </View>

                            <View style={styles.profileDivider} />

                            <View style={styles.profileRowsContainer}>
                                <View style={styles.profileRowItem}>
                                    <Feather name="phone" size={15} color="#6366f1" />
                                    <Text style={styles.profileRowLabel}>Phone Number:</Text>
                                    <Text style={styles.profileRowValue}>{user?.phone || 'Not available'}</Text>
                                </View>

                                <View style={styles.profileRowItem}>
                                    <Feather name="book" size={15} color="#6366f1" />
                                    <Text style={styles.profileRowLabel}>Year & Branch:</Text>
                                    <Text style={styles.profileRowValue}>{user?.yearBranch || 'Not specified'}</Text>
                                </View>

                                <View style={styles.profileRowItem}>
                                    <Feather name="shield" size={15} color={user?.isStudentVerified ? '#2563eb' : '#f59e0b'} />
                                    <Text style={styles.profileRowLabel}>Verification:</Text>
                                    <Text style={[styles.profileRowValue, { color: user?.isStudentVerified ? '#2563eb' : '#d97706', fontWeight: '800' }]}>
                                        {user?.isStudentVerified ? 'Blue Badge Verified ✓' : 'Unverified ID'}
                                    </Text>
                                </View>
                            </View>

                            {/* Logout button moved inside Profile Section */}
                            <TouchableOpacity
                                style={styles.profileLogoutBtn}
                                onPress={() => {
                                    setProfileModalVisible(false);
                                    handleLogout();
                                }}
                                activeOpacity={0.8}
                            >
                                <Feather name="log-out" size={16} color="#ef4444" />
                                <Text style={styles.profileLogoutBtnText}>Log Out of Account</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* UPI PAYMENT & FALLBACK QR MODAL */}
            <Modal visible={paymentModalVisible || fallbackQrModalVisible} transparent animationType="slide" onRequestClose={() => { setPaymentModalVisible(false); setFallbackQrModalVisible(false); }}>
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
                        <View style={styles.modalBox}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Feather name="credit-card" size={20} color="#4f46e5" />
                                    <Text style={styles.modalTitle}>Pay Mess Fee 💳</Text>
                                </View>
                                <TouchableOpacity onPress={() => { setPaymentModalVisible(false); setFallbackQrModalVisible(false); }}>
                                    <Feather name="x" size={24} color="#64748b" />
                                </TouchableOpacity>
                            </View>

                            {selectedSubForPayment && (
                                <View style={{ marginBottom: 16 }}>
                                    <View style={styles.paymentSummaryCard}>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>
                                            {selectedSubForPayment.messName}
                                        </Text>
                                        <Text style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                                            Amount Due: <Text style={{ fontWeight: 'bold', color: '#10b981', fontSize: 16 }}>₹{selectedSubForPayment.monthlyFee}</Text>
                                        </Text>
                                        {(selectedSubForPayment.messId?.upiId || selectedSubForPayment.upiId) ? (
                                            <Text style={{ fontSize: 13, color: '#6366f1', marginTop: 4, fontWeight: '600' }}>
                                                UPI ID: {selectedSubForPayment.messId?.upiId || selectedSubForPayment.upiId}
                                            </Text>
                                        ) : (
                                            <Text style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
                                                ⚠️ Mess owner has not configured a custom UPI ID.
                                            </Text>
                                        )}
                                    </View>

                                    {/* 1-Tap UPI Launch Button */}
                                    <TouchableOpacity
                                        style={styles.upiAppBtn}
                                        onPress={() => handlePayViaUPI(selectedSubForPayment)}
                                        activeOpacity={0.8}
                                    >
                                        <Feather name="zap" size={16} color="#ffffff" />
                                        <Text style={styles.upiAppBtnText}>Pay via UPI App 💸 (GPay / PhonePe / Paytm)</Text>
                                    </TouchableOpacity>

                                    {/* Fallback QR Modal Display */}
                                    {paymentQrString ? (
                                        <View style={styles.paymentQrSection}>
                                            <View style={styles.qrCodeWrapper}>
                                                <QRCode value={paymentQrString} size={200} />
                                            </View>
                                            <Text style={styles.paymentQrHelperText}>
                                                Scan this with any UPI app on another phone to pay ₹{selectedSubForPayment.monthlyFee}
                                            </Text>
                                        </View>
                                    ) : null}

                                    {/* UTR Submission Form */}
                                    <View style={{ marginTop: 14 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
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
                                            activeOpacity={0.8}
                                        >
                                            {isSubmittingPayment ? (
                                                <ActivityIndicator color="#ffffff" size="small" />
                                            ) : (
                                                <Text style={styles.submitPaymentBtnText}>I Have Paid ✓ Submit UTR</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    </ScrollView>
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

            {/* 24H STORY VIEWER MODAL */}
            <Modal visible={storyModalVisible} transparent animationType="fade" onRequestClose={() => setStoryModalVisible(false)}>
                <SafeAreaView style={styles.storyViewerContainer}>
                    <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
                    {selectedStoryGroup && (() => {
                        const stories = selectedStoryGroup.stories && selectedStoryGroup.stories.length > 0
                            ? selectedStoryGroup.stories
                            : [selectedStoryGroup.latestStory];
                        const currentStory = stories[currentStoryIndex] || stories[0];
                        const totalStories = stories.length;

                        return (
                            <View style={styles.storyViewerInner}>
                                {/* Segmented Progress Bars */}
                                <View style={styles.storyProgressRow}>
                                    {stories.map((_: any, idx: number) => (
                                        <View
                                            key={idx}
                                            style={[
                                                styles.storyProgressSegment,
                                                idx === currentStoryIndex && styles.storyProgressSegmentActive,
                                                idx < currentStoryIndex && styles.storyProgressSegmentPassed
                                            ]}
                                        />
                                    ))}
                                </View>

                                {/* Top Header */}
                                <View style={styles.storyTopBar}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <View style={styles.storyTopAvatarRing}>
                                            <Feather name="coffee" size={14} color="#ffffff" />
                                        </View>
                                        <View>
                                            <Text style={styles.storyTopMessName}>{selectedStoryGroup.messName}</Text>
                                            <Text style={styles.storyTopTimeText}>
                                                {currentStory?.createdAt ? new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'} • 24h Story
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => setStoryModalVisible(false)} style={styles.storyCloseBtn}>
                                        <Feather name="x" size={24} color="#ffffff" />
                                    </TouchableOpacity>
                                </View>

                                {/* Image with Navigation Tap Zones */}
                                <View style={styles.storyImageContainer}>
                                    {currentStory?.imageUrl && (
                                        <Image
                                            source={{ uri: currentStory.imageUrl }}
                                            style={styles.storyFullImage}
                                            resizeMode="contain"
                                        />
                                    )}

                                    <TouchableOpacity
                                        style={styles.storyTouchLeft}
                                        onPress={() => {
                                            if (currentStoryIndex > 0) setCurrentStoryIndex(prev => prev - 1);
                                        }}
                                    />
                                    <TouchableOpacity
                                        style={styles.storyTouchRight}
                                        onPress={() => {
                                            if (currentStoryIndex < totalStories - 1) setCurrentStoryIndex(prev => prev + 1);
                                            else setStoryModalVisible(false);
                                        }}
                                    />
                                </View>

                                {/* Bottom Caption & Control Overlay */}
                                <View style={styles.storyCaptionOverlay}>
                                    {currentStory?.caption ? (
                                        <View style={styles.storyCaptionCard}>
                                            <Text style={styles.storyCaptionText}>
                                                {currentStory.caption}
                                            </Text>
                                        </View>
                                    ) : null}

                                    <View style={styles.storyBottomNavRow}>
                                        <Text style={styles.storyCountText}>{currentStoryIndex + 1} of {totalStories}</Text>
                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            {currentStoryIndex > 0 && (
                                                <TouchableOpacity
                                                    style={styles.storyNavBtn}
                                                    onPress={() => setCurrentStoryIndex(prev => prev - 1)}
                                                >
                                                    <Feather name="chevron-left" size={18} color="#ffffff" />
                                                </TouchableOpacity>
                                            )}
                                            {currentStoryIndex < totalStories - 1 ? (
                                                <TouchableOpacity
                                                    style={styles.storyNavBtn}
                                                    onPress={() => setCurrentStoryIndex(prev => prev + 1)}
                                                >
                                                    <Feather name="chevron-right" size={18} color="#ffffff" />
                                                </TouchableOpacity>
                                            ) : (
                                                <TouchableOpacity
                                                    style={[styles.storyNavBtn, { backgroundColor: '#ea580c' }]}
                                                    onPress={() => setStoryModalVisible(false)}
                                                >
                                                    <Feather name="check" size={18} color="#ffffff" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    })()}
                </SafeAreaView>
            </Modal>

            {/* VERIFY COLLEGE ID MODAL */}
            <Modal visible={verifyIdModalOpen} transparent animationType="slide" onRequestClose={() => setVerifyIdModalOpen(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.verifyModalBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Feather name="shield" size={20} color="#2563eb" />
                                <Text style={styles.modalTitle}>Verify College ID 🪪</Text>
                            </View>
                            <TouchableOpacity onPress={() => setVerifyIdModalOpen(false)}>
                                <Feather name="x" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 18 }}>
                            Scan your GCOEARA identity card using instant AI OCR. Verified students get trusted status for ride-pooling and community services.
                        </Text>

                        {idImageUri ? (
                            <View style={styles.idPreviewBox}>
                                <Image source={{ uri: idImageUri }} style={styles.idPreviewImage} resizeMode="contain" />
                            </View>
                        ) : null}

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                            <TouchableOpacity style={styles.pickPhotoBtn} onPress={() => promptPickIdCard(true)}>
                                <Feather name="camera" size={16} color="#2563eb" />
                                <Text style={styles.pickPhotoBtnText}>Snap Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.pickPhotoBtn} onPress={() => promptPickIdCard(false)}>
                                <Feather name="image" size={16} color="#2563eb" />
                                <Text style={styles.pickPhotoBtnText}>From Gallery</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.ocrTipsBox}>
                            <Feather name="info" size={14} color="#0369a1" />
                            <Text style={styles.ocrTipsText}>
                                Ensure "GCOEARA" or "Government College of Engineering" is clearly visible in good lighting.
                            </Text>
                        </View>

                        {ocrErrorMsg && (
                            <View style={{ marginBottom: 14 }}>
                                <View style={{ backgroundColor: '#fee2e2', borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, borderWidth: 1, borderColor: '#fca5a5' }}>
                                    <Feather name="alert-triangle" size={15} color="#dc2626" />
                                    <Text style={{ flex: 1, fontSize: 11, color: '#dc2626', fontWeight: 'bold' }}>
                                        {ocrErrorMsg}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={{ backgroundColor: '#0f172a', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                                    onPress={handleManualApproveStudentId}
                                    disabled={isVerifyingId}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Feather name="check-circle" size={14} color="#ffffff" />
                                        <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>
                                            Submit for Manual Approval
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.verifySubmitBtn, (!idBase64 || isVerifyingId) && { opacity: 0.6 }]}
                            onPress={handleVerifyStudentId}
                            disabled={!idBase64 || isVerifyingId}
                        >
                            {isVerifyingId ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text style={styles.verifySubmitBtnText}>Scanning ID with AI OCR...</Text>
                                </View>
                            ) : (
                                <Text style={styles.verifySubmitBtnText}>Verify ID with OCR 🔍</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* TOP-LEVEL DEDICATED MEAL QR PASS MODAL */}
            <Modal visible={topMealModalVisible} transparent animationType="fade" onRequestClose={() => setTopMealModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { alignItems: 'center' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={styles.modalTitle}>Digital Meal Pass 🎟️</Text>
                            <TouchableOpacity onPress={() => setTopMealModalVisible(false)}>
                                <Feather name="x" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 13, color: '#64748b', fontWeight: 'bold', marginBottom: 2 }}>
                            {topMealMessData.messName || topMealPassMessName}
                        </Text>
                        <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a', marginBottom: 16 }}>
                            {user?.name || 'Student'} • {topMealPassShift === 'morning' ? '☀️ Morning' : '🌙 Night'}
                        </Text>

                        {topMealCelebration ? (
                            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                    <Feather name="check" size={36} color="#16a34a" />
                                </View>
                                <Text style={{ fontSize: 20, fontWeight: '900', color: '#16a34a', marginBottom: 4 }}>
                                    ✅ Meal Claimed!
                                </Text>
                                <Text style={{ fontSize: 14, color: '#475569', fontWeight: '600' }}>
                                    Enjoy your meal.
                                </Text>
                            </View>
                        ) : topMealQrLoading ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#4f46e5" />
                                <Text style={{ marginTop: 12, fontSize: 13, color: '#64748b', fontWeight: 'bold' }}>
                                    Generating secure pass...
                                </Text>
                            </View>
                        ) : topMealQrToken ? (
                            <>
                                <View style={styles.qrContainer}>
                                    <QRCode value={topMealQrToken} size={200} />
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 8 }}>
                                    <View style={styles.timerBadge}>
                                        <Feather name="clock" size={14} color="#d97706" />
                                        <Text style={styles.timerText}>
                                            Expires in {Math.floor(topMealQrExpirySeconds / 60)}:
                                            {topMealQrExpirySeconds % 60 < 10 ? `0${topMealQrExpirySeconds % 60}` : topMealQrExpirySeconds % 60}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.refreshQrBtn}
                                        onPress={handleRefreshTopMealQr}
                                    >
                                        <Feather name="rotate-cw" size={14} color="#4f46e5" />
                                    </TouchableOpacity>
                                </View>

                                <Text style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>
                                    Show this QR code to the mess owner at the counter to verify your meal.
                                </Text>
                            </>
                        ) : null}
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
    subExpiryDateText: { fontSize: 12, fontWeight: '700', color: '#475569' },
    subExpiryWarningBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 },
    subExpiryWarningText: { fontSize: 12, fontWeight: '800', color: '#b45309' },

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
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    nearbyMessCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
    },
    nearbyMessTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },
    nearbyMessAddress: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 3,
        lineHeight: 18,
    },
    nearbyMessMetaRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        alignItems: 'center',
    },
    nearbyMetaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fef3c7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    distanceBadge: {
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 8,
        paddingVertical: 4,
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
    getDirectionsBtn: {
        backgroundColor: '#4f46e5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        marginTop: 12,
        shadowColor: '#4f46e5',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 2,
    },
    getDirectionsBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '800',
    },
    directionsBtnDisabled: {
        opacity: 0.5,
    },

    // --- TOP CHEF & QUALITY TAGS STYLES ---
    topChefBadgeHeader: {
        backgroundColor: '#fef3c7',
        borderWidth: 1.5,
        borderColor: '#f59e0b',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 12,
        shadowColor: '#f59e0b',
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 2,
    },
    topChefBadgeHeaderText: {
        color: '#b45309',
        fontSize: 11,
        fontWeight: '900',
    },
    tagBadge: {
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 8,
    },
    tagBadgeText: {
        color: '#3730a3',
        fontSize: 10,
        fontWeight: '700',
    },
    ratingTagPrompt: {
        fontSize: 12,
        fontWeight: '800',
        color: '#475569',
        marginBottom: 8,
    },
    ratingTagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 14,
    },
    ratingTagChip: {
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    ratingTagChipActive: {
        backgroundColor: '#4f46e5',
        borderColor: '#4338ca',
    },
    ratingTagChipText: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '700',
    },
    ratingTagChipTextActive: {
        color: '#ffffff',
        fontWeight: '800',
    },
    reviewTagBadge: {
        backgroundColor: '#eef2ff',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    reviewTagText: {
        color: '#4338ca',
        fontSize: 10,
        fontWeight: '700',
    },

    // --- VERIFIED STUDENT STYLES ---
    verifiedHeaderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    verifiedHeaderText: {
        color: '#1d4ed8',
        fontSize: 11,
        fontWeight: '800',
    },
    verifyPromptBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#fff7ed',
        borderWidth: 1,
        borderColor: '#fed7aa',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 10,
        marginTop: 4,
        marginBottom: 2,
        alignSelf: 'flex-start',
    },
    verifyPromptText: {
        color: '#c2410c',
        fontSize: 11,
        fontWeight: '800',
    },
    verifiedStudentChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    verifiedStudentChipText: {
        color: '#1d4ed8',
        fontSize: 10,
        fontWeight: '800',
    },
    verifyModalBox: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 28,
        padding: 22,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12,
    },
    idPreviewBox: {
        width: '100%',
        height: 180,
        borderRadius: 16,
        backgroundColor: '#0f172a',
        overflow: 'hidden',
        marginBottom: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    idPreviewImage: {
        width: '100%',
        height: '100%',
    },
    pickPhotoBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        paddingVertical: 10,
        borderRadius: 12,
    },
    pickPhotoBtnText: {
        color: '#1d4ed8',
        fontSize: 12,
        fontWeight: '800',
    },
    ocrTipsBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#f0f9ff',
        borderWidth: 1,
        borderColor: '#bae6fd',
        padding: 10,
        borderRadius: 12,
        marginBottom: 16,
    },
    ocrTipsText: {
        flex: 1,
        fontSize: 11,
        color: '#0369a1',
        fontWeight: '600',
        lineHeight: 16,
    },
    verifySubmitBtn: {
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2563eb',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    verifySubmitBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '900',
    },

    // --- 24-HOUR MESS STORIES FEED STYLES ---
    storiesContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    storiesSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    storiesSectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#0f172a',
    },
    liveIndicatorPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#fff1f2',
        borderWidth: 1,
        borderColor: '#fecdd3',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#e11d48',
    },
    liveIndicatorText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#e11d48',
    },
    storiesScroll: {
        paddingRight: 10,
        gap: 14,
    },
    storyBubbleItem: {
        alignItems: 'center',
        width: 72,
    },
    storyGradientRing: {
        width: 66,
        height: 66,
        borderRadius: 33,
        padding: 3,
        backgroundColor: '#ea580c',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#ea580c',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    storyImageWrapper: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#ffffff',
        overflow: 'hidden',
        backgroundColor: '#f1f5f9',
    },
    storyAvatarImage: {
        width: '100%',
        height: '100%',
    },
    storyBubbleLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#334155',
        marginTop: 6,
        textAlign: 'center',
        width: '100%',
    },
    storyLiveBadge: {
        position: 'absolute',
        top: 48,
        backgroundColor: '#ea580c',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#ffffff',
    },
    storyLiveBadgeText: {
        color: '#ffffff',
        fontSize: 8,
        fontWeight: '900',
    },

    // --- FULL-SCREEN STORY VIEWER STYLES ---
    storyViewerContainer: {
        flex: 1,
        backgroundColor: '#090d16',
    },
    storyViewerInner: {
        flex: 1,
        backgroundColor: '#090d16',
        justifyContent: 'space-between',
    },
    storyProgressRow: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 10 : 10,
        gap: 4,
        marginBottom: 10,
    },
    storyProgressSegment: {
        flex: 1,
        height: 3,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    storyProgressSegmentPassed: {
        backgroundColor: '#ffffff',
    },
    storyProgressSegmentActive: {
        backgroundColor: '#ea580c',
    },
    storyTopBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    storyTopAvatarRing: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ea580c',
        alignItems: 'center',
        justifyContent: 'center',
    },
    storyTopMessName: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '900',
    },
    storyTopTimeText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 11,
        fontWeight: '600',
    },
    storyCloseBtn: {
        padding: 6,
    },
    storyImageContainer: {
        flex: 1,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
    },
    storyFullImage: {
        width: '100%',
        height: '100%',
    },
    storyTouchLeft: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: '35%',
    },
    storyTouchRight: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        width: '65%',
    },
    storyCaptionOverlay: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        paddingTop: 12,
        backgroundColor: 'rgba(9, 13, 22, 0.85)',
    },
    storyCaptionCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    storyCaptionText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 20,
    },
    storyBottomNavRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    storyCountText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        fontWeight: '700',
    },
    storyNavBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // --- TOP-LEVEL DIGITAL MEAL PASS STYLES ---
    topMealPassCard: {
        backgroundColor: '#0f172a',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#312e81',
        shadowColor: '#4338ca',
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    topMealPassHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    topMealPassBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(79, 70, 229, 0.2)',
        borderColor: 'rgba(99, 102, 241, 0.4)',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    topMealPassBadgeText: {
        color: '#a5b4fc',
        fontSize: 11,
        fontWeight: '900',
    },
    topMealPassDateText: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '700',
    },
    topMealPassTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#ffffff',
        marginBottom: 4,
    },
    topMealPassSub: {
        fontSize: 12,
        color: '#cbd5e1',
        fontWeight: '500',
        marginBottom: 16,
    },
    topMealPassActionRow: {
        flexDirection: 'column',
        gap: 12,
    },
    topMealPassShiftToggle: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        borderRadius: 14,
        padding: 4,
    },
    topMealPassShiftBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    topMealPassShiftBtnActive: {
        backgroundColor: '#4f46e5',
        shadowColor: '#4f46e5',
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2,
    },
    topMealPassShiftBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#94a3b8',
    },
    topMealPassShiftBtnTextActive: {
        color: '#ffffff',
    },
    topMealPassShowBtn: {
        backgroundColor: '#4f46e5',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        shadowColor: '#4f46e5',
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
    },
    topMealPassShowBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '900',
    },
    topMealPassClaimedBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    topMealPassClaimedText: {
        color: '#34d399',
        fontSize: 13,
        fontWeight: '900',
    },
    refreshQrBtn: {
        backgroundColor: '#eef2ff',
        padding: 8,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#c7d2fe',
    },
    profileHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
    },
    profileHeaderBtnText: {
        color: '#4f46e5',
        fontWeight: '800',
        fontSize: 13,
    },
    profileAvatarIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e0e7ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileDetailsCard: {
        marginTop: 4,
    },
    profileUserHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 12,
    },
    profileBigAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#4f46e5',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4f46e5',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    profileAvatarInitials: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: '900',
    },
    profileFullName: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0f172a',
    },
    blueVerifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#dbeafe',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    blueVerifiedText: {
        color: '#2563eb',
        fontSize: 11,
        fontWeight: '800',
    },
    profileRoleText: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '700',
        marginTop: 2,
    },
    profileDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 12,
    },
    profileRowsContainer: {
        gap: 10,
        marginBottom: 18,
    },
    profileRowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#f8fafc',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    profileRowLabel: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
    },
    profileRowValue: {
        fontSize: 13,
        color: '#0f172a',
        fontWeight: '700',
        marginLeft: 'auto',
    },
    profileLogoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#ef4444',
        paddingVertical: 14,
        borderRadius: 14,
        shadowColor: '#ef4444',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
    },
    profileLogoutBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '800',
    },
    paymentSummaryCard: {
        backgroundColor: '#f8fafc',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 14,
    },
    paymentQrSection: {
        marginTop: 14,
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    qrCodeWrapper: {
        padding: 16,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
        marginBottom: 12,
    },
    paymentQrHelperText: {
        fontSize: 12,
        color: '#64748b',
        textAlign: 'center',
        fontWeight: '600',
        paddingHorizontal: 10,
    },
    secondaryQrBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eef2ff',
        borderWidth: 1,
        borderColor: '#c7d2fe',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    secondaryQrBtnText: {
        color: '#4f46e5',
        fontWeight: '700',
        fontSize: 13,
    },
    nearbySection: {
        marginTop: 4,
    },
    nearbyHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    nearbyRefreshBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#e0e7ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nearbyListContainer: {
        gap: 12,
    },
    emptyStateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4f46e5',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 14,
    },
    emptyStateBtnText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '700',
    },
});