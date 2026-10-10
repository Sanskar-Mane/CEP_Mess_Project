import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, Alert, TextInput, Modal, SafeAreaView, Platform, StatusBar, RefreshControl, Image, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { API_URL } from '@/constants/config';
import { getSocket } from '@/utils/socket';
import { registerForPushNotificationsAsync } from '@/utils/notifications';
import { translations, Language } from '@/utils/translations';

const getLocalDateString = (offsetDays = 0) => {
    const d = new Date(); d.setDate(d.getDate() + offsetDays);
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

export default function OwnerDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Language State & Persistence
    const [language, setLanguage] = useState<Language>('en');

    useEffect(() => {
        AsyncStorage.getItem('owner_language').then((val) => {
            if (val === 'mr' || val === 'en') setLanguage(val);
        });
    }, []);

    const toggleLanguage = async () => {
        const newLang = language === 'en' ? 'mr' : 'en';
        setLanguage(newLang);
        await AsyncStorage.setItem('owner_language', newLang);
    };

    // Active Navigation Tab State
    const [activeTab, setActiveTab] = useState<'kitchen' | 'menu' | 'members' | 'settings'>('kitchen');

    // Members Search & Filter State
    const [memberSearch, setMemberSearch] = useState('');
    const [memberFilter, setMemberFilter] = useState<'all' | 'verification_pending' | 'paid' | 'pending' | 'expired'>('all');

    // Publish Form State
    const [menuDate, setMenuDate] = useState(getLocalDateString(0));
    const [menuShift, setMenuShift] = useState('morning');
    const [menuItems, setMenuItems] = useState('');
    const [price, setPrice] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    // Analytics & Members State
    const [analyticsShift, setAnalyticsShift] = useState('morning');
    const [stats, setStats] = useState({ morning: { coming: 0, notComing: 0, consumed: 0 }, night: { coming: 0, notComing: 0, consumed: 0 } });
    const [historyData, setHistoryData] = useState([]);
    const [members, setMembers] = useState<any[]>([]);

    // Cut-Off Timers State
    const [morningCutoff, setMorningCutoff] = useState('09:30');
    const [nightCutoff, setNightCutoff] = useState('17:30');
    const [isSavingCutoff, setIsSavingCutoff] = useState(false);

    // Location State
    const [isSettingLocation, setIsSettingLocation] = useState(false);
    const [savedLocation, setSavedLocation] = useState<any>(null);

    // QR Scanner State
    const [permission, requestPermission] = useCameraPermissions();
    const [scannerVisible, setScannerVisible] = useState(false);
    const [isVerifyingQr, setIsVerifyingQr] = useState(false);
    const [scanResult, setScanResult] = useState<{ type: 'success' | 'error', message: string, studentName?: string } | null>(null);
    const [manualQrInput, setManualQrInput] = useState('');

    // UPI ID State
    const [upiId, setUpiId] = useState('');
    const [isSavingUpi, setIsSavingUpi] = useState(false);

    // Notifications State
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [notifModalVisible, setNotifModalVisible] = useState(false);

    // Kitchen Ration Config State
    const [rationConfig, setRationConfig] = useState({
        riceGrams: 120,
        flourGrams: 110,
        dalGrams: 45,
        veggieGrams: 150
    });
    const [rationModalVisible, setRationModalVisible] = useState(false);
    const [isSavingRation, setIsSavingRation] = useState(false);
    const [tempRationConfig, setTempRationConfig] = useState({
        riceGrams: '120',
        flourGrams: '110',
        dalGrams: '45',
        veggieGrams: '150'
    });

    // Native Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({ type: '', subId: '', title: '', placeholder: '' });
    const [modalInput, setModalInput] = useState('');

    // Story / Live Update State
    const [storyModalVisible, setStoryModalVisible] = useState(false);
    const [storyImageUri, setStoryImageUri] = useState<string | null>(null);
    const [storyBase64, setStoryBase64] = useState<string | null>(null);
    const [storyCaption, setStoryCaption] = useState('');
    const [isPostingStory, setIsPostingStory] = useState(false);

    // Active Stories & Viewer State
    const [myActiveStories, setMyActiveStories] = useState<any[]>([]);
    const [isDeletingStory, setIsDeletingStory] = useState<string | null>(null);
    const [viewStoryModalVisible, setViewStoryModalVisible] = useState(false);
    const [selectedActiveStory, setSelectedActiveStory] = useState<any | null>(null);

    const fetchMyStories = async () => {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/stories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const groups = await res.json();
                const myGroup = groups.find((g: any) =>
                    g.ownerId === user?._id ||
                    g.ownerId?._id === user?._id ||
                    String(g.ownerId) === String(user?._id)
                );
                setMyActiveStories(myGroup ? myGroup.stories : []);
            }
        } catch (e) {
            console.warn("Failed to fetch owner stories", e);
        }
    };

    const handlePickStoryImage = async (useCamera: boolean) => {
        try {
            let result;
            if (useCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert("Permission Required", "Camera permission is required to snap live kitchen photos.");
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [4, 5],
                    quality: 0.6,
                    base64: true,
                });
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert("Permission Required", "Gallery permission is required to choose live photos.");
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [4, 5],
                    quality: 0.6,
                    base64: true,
                });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setStoryImageUri(asset.uri);
                const base64Str = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
                setStoryBase64(base64Str);
                setStoryModalVisible(true);
            }
        } catch (e: any) {
            Alert.alert("Error", `Could not pick image: ${e.message}`);
        }
    };

    const handlePostStory = async () => {
        if (!storyBase64) {
            Alert.alert("Missing Photo", "Please snap or select a photo first.");
            return;
        }
        setIsPostingStory(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/stories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    imageUrl: storyBase64,
                    caption: storyCaption.trim()
                })
            });
            const data = await res.json();
            if (res.ok) {
                Alert.alert("🎉 Live Story Published!", "Your live update is now featured in the campus stories feed for the next 24 hours!");
                setStoryModalVisible(false);
                setStoryImageUri(null);
                setStoryBase64(null);
                setStoryCaption('');
                fetchMyStories();
            } else {
                Alert.alert("Error", data.error || "Failed to post story.");
            }
        } catch (e: any) {
            Alert.alert("Network Error", e.message || "Failed to reach server.");
        } finally {
            setIsPostingStory(false);
        }
    };

    const handleDeleteStory = (storyId: string) => {
        Alert.alert(
            "Delete Story",
            "Are you sure you want to delete this live story? It will be removed immediately from Cloudinary and students' feeds.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setIsDeletingStory(storyId);
                        try {
                            const token = await AsyncStorage.getItem('token');
                            const res = await fetch(`${API_URL}/api/stories/${storyId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (res.ok) {
                                setMyActiveStories(prev => prev.filter(s => s._id !== storyId));
                                if (selectedActiveStory?._id === storyId) {
                                    setViewStoryModalVisible(false);
                                    setSelectedActiveStory(null);
                                }
                                Alert.alert("Story Deleted", "Your story has been deleted successfully.");
                            } else {
                                const d = await res.json();
                                Alert.alert("Error", d.error || "Failed to delete story.");
                            }
                        } catch (e: any) {
                            Alert.alert("Network Error", e.message || "Failed to reach server.");
                        } finally {
                            setIsDeletingStory(null);
                        }
                    }
                }
            ]
        );
    };

    const handleViewStory = (story: any) => {
        setSelectedActiveStory(story);
        setViewStoryModalVisible(true);
    };

    const promptStoryChoice = () => {
        Alert.alert(
            "📸 Post Live Story",
            "Share what's hot and fresh in your kitchen right now! Story disappears in 24 hours.",
            [
                { text: "Snap Photo 📷", onPress: () => handlePickStoryImage(true) },
                { text: "Choose from Gallery 🖼️", onPress: () => handlePickStoryImage(false) },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const displayDate = new Date(menuDate).toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });

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
                        if (data.upiId) setUpiId(data.upiId);
                        if (data.morningCutoff) setMorningCutoff(data.morningCutoff);
                        if (data.nightCutoff) setNightCutoff(data.nightCutoff);
                        if (data.rationConfig) {
                            setRationConfig(data.rationConfig);
                            setTempRationConfig({
                                riceGrams: String(data.rationConfig.riceGrams || 120),
                                flourGrams: String(data.rationConfig.flourGrams || 110),
                                dalGrams: String(data.rationConfig.dalGrams || 45),
                                veggieGrams: String(data.rationConfig.veggieGrams || 150),
                            });
                        }
                        if (data.location && data.location.coordinates && data.location.coordinates[0] !== 0) {
                            setSavedLocation({ lng: data.location.coordinates[0], lat: data.location.coordinates[1] });
                        }
                        registerForPushNotificationsAsync();
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
            await fetchMyStories();
        } catch (e) { console.error(e); }
    };

    // 3. Fetch ONLY Live Stats, Members, & Notifications
    const fetchLiveStats = async (headers: any) => {
        try {
            const statsRes = await fetch(`${API_URL}/api/attendance/stats/${encodeURIComponent(user?.messName || 'Partner Mess')}/${menuDate}`, { headers });
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
                if (statsData.rationConfig) {
                    setRationConfig(statsData.rationConfig);
                    setTempRationConfig({
                        riceGrams: String(statsData.rationConfig.riceGrams || 120),
                        flourGrams: String(statsData.rationConfig.flourGrams || 110),
                        dalGrams: String(statsData.rationConfig.dalGrams || 45),
                        veggieGrams: String(statsData.rationConfig.veggieGrams || 150),
                    });
                }
            }

            const memRes = await fetch(`${API_URL}/api/subscriptions/mess`, { headers });
            if (memRes.ok) setMembers(await memRes.json());

            const notifRes = await fetch(`${API_URL}/api/notifications`, { headers });
            if (notifRes.ok) {
                const notifs = await notifRes.json();
                setNotifications(notifs);
                setUnreadCount(notifs.filter((n: any) => !n.isRead).length);
            }
        } catch (e) { console.error(e); }
    };

    // --- REAL-TIME ENGINE (Socket.io) ---
    useEffect(() => {
        fetchData();

        const socket = getSocket();

        const onAttendanceUpdated = (data: any) => {
            if (!user) return;
            const currentMess = user.messName || 'Partner Mess';
            if (data.messName === currentMess && data.targetDate === menuDate) {
                AsyncStorage.getItem('token').then(token => {
                    if (token) {
                        fetchLiveStats({ 'Authorization': `Bearer ${token}` });
                        fetch(`${API_URL}/api/attendance/history/${encodeURIComponent(currentMess)}`, { headers: { 'Authorization': `Bearer ${token}` } })
                            .then(res => res.ok ? res.json() : null)
                            .then(hist => { if (hist) setHistoryData(hist); });
                    }
                });
            }
        };

        const onAttendanceConsumed = () => {
            AsyncStorage.getItem('token').then(token => {
                if (token) {
                    fetchLiveStats({ 'Authorization': `Bearer ${token}` });
                }
            });
        };

        const onSubscriptionUpdated = () => {
            AsyncStorage.getItem('token').then(token => {
                if (token) {
                    fetchLiveStats({ 'Authorization': `Bearer ${token}` });
                    fetch(`${API_URL}/api/subscriptions/mess`, { headers: { 'Authorization': `Bearer ${token}` } })
                        .then(res => res.ok ? res.json() : null)
                        .then(memList => { if (memList) setMembers(memList); });
                }
            });
        };

        const onNotificationNew = (data: any) => {
            if (!user) return;
            if (!data?.userIds || data.userIds.includes(user._id)) {
                setUnreadCount(prev => prev + 1);
                AsyncStorage.getItem('token').then(token => {
                    if (token) {
                        fetch(`${API_URL}/api/notifications`, { headers: { 'Authorization': `Bearer ${token}` } })
                            .then(r => r.ok ? r.json() : null)
                            .then(notifs => {
                                if (notifs) {
                                    setNotifications(notifs);
                                    setUnreadCount(notifs.filter((n: any) => !n.isRead).length);
                                }
                            });
                    }
                });
            }
        };

        const onStoryEvent = () => {
            fetchMyStories();
        };

        socket.on('attendance:updated', onAttendanceUpdated);
        socket.on('attendance:consumed', onAttendanceConsumed);
        socket.on('subscription:updated', onSubscriptionUpdated);
        socket.on('notification:new', onNotificationNew);
        socket.on('story:new', onStoryEvent);
        socket.on('story:deleted', onStoryEvent);

        return () => {
            socket.off('attendance:updated', onAttendanceUpdated);
            socket.off('attendance:consumed', onAttendanceConsumed);
            socket.off('subscription:updated', onSubscriptionUpdated);
            socket.off('notification:new', onNotificationNew);
            socket.off('story:new', onStoryEvent);
            socket.off('story:deleted', onStoryEvent);
        };
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

    const handleSaveUpi = async () => {
        if (!upiId.trim()) {
            Alert.alert("Notice", "Please enter a valid UPI ID (e.g. messowner@okaxis)");
            return;
        }
        setIsSavingUpi(true);
        const token = await AsyncStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/owner/upi`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ upiId: upiId.trim() })
            });
            const data = await res.json();
            if (res.ok) {
                Alert.alert("Success", "UPI ID updated successfully!");
            } else {
                Alert.alert("Error", data.error || "Failed to update UPI ID");
            }
        } catch (e) {
            Alert.alert("Error", "Network connection failed");
        } finally {
            setIsSavingUpi(false);
        }
    };

    const handleOpenScanner = async () => {
        if (!permission?.granted) {
            const res = await requestPermission();
            if (!res.granted) {
                Alert.alert("Camera Permission Required", "Please grant camera permission in your phone settings to scan meal QR passes.");
                return;
            }
        }
        setScanResult(null);
        setScannerVisible(true);
    };

    const handleVerifyQrToken = async (tokenString: string) => {
        if (!tokenString || isVerifyingQr) return;
        setIsVerifyingQr(true);
        const token = await AsyncStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/attendance/verify-qr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ qrToken: tokenString.trim() })
            });
            const data = await res.json();
            if (res.ok) {
                setScanResult({ type: 'success', message: `Meal Claimed for ${data.shift.toUpperCase()} Shift!`, studentName: data.studentName });
                if (token) fetchLiveStats({ 'Authorization': `Bearer ${token}` });
            } else {
                setScanResult({ type: 'error', message: data.error || "Failed to verify meal pass." });
            }
        } catch (e) {
            setScanResult({ type: 'error', message: "Network error while verifying meal pass." });
        } finally {
            setIsVerifyingQr(false);
        }
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

    const handleSaveCutoff = async () => {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(morningCutoff)) {
            Alert.alert('Invalid Format', 'Morning cut-off must be in HH:mm format (e.g. 09:30)');
            return;
        }
        if (!timeRegex.test(nightCutoff)) {
            Alert.alert('Invalid Format', 'Night cut-off must be in HH:mm format (e.g. 17:30)');
            return;
        }
        setIsSavingCutoff(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/owner/cutoff`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ morningCutoff, nightCutoff })
            });
            if (res.ok) {
                Alert.alert('Success', 'Cut-off times updated successfully!');
            } else {
                Alert.alert('Error', 'Failed to update cut-off times.');
            }
        } catch {
            Alert.alert('Error', 'Network connection failed.');
        } finally {
            setIsSavingCutoff(false);
        }
    };

    const updateSubscription = async (subId: string, payload: any) => {
        const token = await AsyncStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/subscriptions/${subId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                fetchLiveStats({ 'Authorization': `Bearer ${token}` });
                const memRes = await fetch(`${API_URL}/api/subscriptions/mess`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (memRes.ok) setMembers(await memRes.json());
            }
        } catch (e) { Alert.alert("Error", "Failed to update"); }
    };

    const handleRenewMember = (subId: string) => {
        Alert.alert(
            'Renew Membership',
            'Renew this membership for 30 days and reset skips?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Renew (30d)',
                    onPress: () => updateSubscription(subId, { renew: true, status: 'paid' }),
                },
            ]
        );
    };

    const togglePaymentStatus = (subId: string, currentStatus: string) => updateSubscription(subId, { status: currentStatus === 'paid' ? 'pending' : 'paid' });

    const openModal = (type: string, subId: string, currentValue: any, title: string, placeholder: string) => {
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

    const handleSaveRationConfig = async () => {
        const r = Number(tempRationConfig.riceGrams);
        const f = Number(tempRationConfig.flourGrams);
        const d = Number(tempRationConfig.dalGrams);
        const v = Number(tempRationConfig.veggieGrams);
        if (isNaN(r) || isNaN(f) || isNaN(d) || isNaN(v) || r <= 0 || f <= 0 || d <= 0 || v <= 0) {
            Alert.alert("Invalid Input", "Please enter positive gram quantities for all ingredients.");
            return;
        }
        setIsSavingRation(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/owner/ration-config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    riceGrams: r,
                    flourGrams: f,
                    dalGrams: d,
                    veggieGrams: v
                })
            });
            const data = await res.json();
            if (res.ok) {
                setRationConfig(data.rationConfig);
                setRationModalVisible(false);
                Alert.alert("Success", "Per-plate kitchen norms updated!");
                if (token) fetchLiveStats({ 'Authorization': `Bearer ${token}` });
            } else {
                Alert.alert("Error", data.error || "Failed to update ration norms.");
            }
        } catch {
            Alert.alert("Error", "Network error updating kitchen norms.");
        } finally {
            setIsSavingRation(false);
        }
    };

    if (isAuthLoading || !user) return <View style={styles.center}><ActivityIndicator size="large" color="#f97316" /></View>;

    const t = translations[language];
    const currentStats = stats[analyticsShift] || { coming: 0, notComing: 0, consumed: 0 };
    const currentShiftEstimates = (stats as any)?.estimates?.[analyticsShift]?.requiredKg || {
        rice: ((currentStats.coming * (rationConfig.riceGrams || 120)) / 1000).toFixed(1),
        flour: ((currentStats.coming * (rationConfig.flourGrams || 110)) / 1000).toFixed(1),
        dal: ((currentStats.coming * (rationConfig.dalGrams || 45)) / 1000).toFixed(1),
        veggies: ((currentStats.coming * (rationConfig.veggieGrams || 150)) / 1000).toFixed(1),
    };
    const foodSavedKg = (stats as any)?.estimates?.[analyticsShift]?.foodSavedKg ??
        (((currentStats.notComing || 0) * ((rationConfig.riceGrams || 120) + (rationConfig.flourGrams || 110) + (rationConfig.dalGrams || 45) + (rationConfig.veggieGrams || 150))) / 1000).toFixed(1);

    const pendingVerifications = members.filter(m => m.status === 'verification_pending').length;

    // Filter & sort members for Members tab
    const filteredMembers = members
        .filter(member => {
            const q = memberSearch.trim().toLowerCase();
            const matchesSearch = !q ||
                (member.studentName && member.studentName.toLowerCase().includes(q)) ||
                (member.studentPhone && member.studentPhone.toLowerCase().includes(q));
            const matchesFilter = memberFilter === 'all' || member.status === memberFilter;
            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            if (a.status === 'verification_pending' && b.status !== 'verification_pending') return -1;
            if (b.status === 'verification_pending' && a.status !== 'verification_pending') return 1;
            return 0;
        });

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

            {/* PERSISTENT TOP HEADER */}
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.greeting}>{t.chef} {user.name.split(' ')[0]} 👨‍🍳</Text>
                        {user.isTopChef && (
                            <View style={styles.topChefBadgeHeader}>
                                <Text style={styles.topChefBadgeHeaderText}>{t.topChef}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.subtitle}>{user.messName || 'Owner Dashboard'}</Text>
                    {user.topTags && user.topTags.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                            {user.topTags.map((tag: string, i: number) => (
                                <View key={i} style={styles.tagBadge}>
                                    <Text style={styles.tagBadgeText}>🏷️ {tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity onPress={handleOpenScanner} style={styles.scannerHeaderBtn}>
                        <Feather name="camera" size={15} color="#ffffff" />
                        <Text style={styles.scannerHeaderBtnText}>{t.scanQrHeader}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleOpenNotifications} style={styles.bellBtn}>
                        <Feather name="bell" size={18} color="#4f46e5" />
                        {unreadCount > 0 && (
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleLanguage} style={styles.langToggleBtn} activeOpacity={0.8}>
                        <Text style={styles.langToggleBadgeText}>अ/A</Text>
                        <Text style={styles.langToggleText}>{language === 'en' ? 'मराठी' : 'EN'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                        <Feather name="log-out" size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* TAB CONTENTS SCROLLVIEW */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#4f46e5']}
                        tintColor="#4f46e5"
                    />
                }
            >
                {/* TAB 1: KITCHEN (Live Operations) */}
                {activeTab === 'kitchen' && (
                    <View>
                        {/* Date Selector */}
                        <View style={styles.dateSelector}>
                            <TouchableOpacity
                                style={[styles.dateBtn, menuDate === getLocalDateString(0) && styles.dateBtnActive]}
                                onPress={() => setMenuDate(getLocalDateString(0))}
                            >
                                <Text style={[styles.dateBtnText, menuDate === getLocalDateString(0) && styles.dateBtnTextActive]}>{t.today}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.dateBtn, menuDate === getLocalDateString(1) && styles.dateBtnActive]}
                                onPress={() => setMenuDate(getLocalDateString(1))}
                            >
                                <Text style={[styles.dateBtnText, menuDate === getLocalDateString(1) && styles.dateBtnTextActive]}>{t.tomorrow}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Prominent QR Scanner Hero Banner */}
                        <TouchableOpacity
                            style={styles.qrScannerHeroCard}
                            onPress={handleOpenScanner}
                            activeOpacity={0.85}
                        >
                            <View style={styles.qrScannerHeroIconBox}>
                                <Feather name="camera" size={24} color="#ffffff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.qrScannerHeroTitle}>{t.scanStudentMealQr}</Text>
                                <Text style={styles.qrScannerHeroSub}>{t.scanStudentMealQrSub}</Text>
                            </View>
                            <Feather name="chevron-right" size={22} color="#ffffff" />
                        </TouchableOpacity>

                        {/* Attendance Stats Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>{t.attendanceStats}</Text>
                                <View style={styles.shiftToggleRow}>
                                    <TouchableOpacity
                                        onPress={() => setAnalyticsShift('morning')}
                                        style={[styles.shiftBtn, analyticsShift === 'morning' && styles.shiftBtnActive]}
                                    >
                                        <Text style={[styles.shiftBtnText, analyticsShift === 'morning' && styles.shiftBtnTextActive]}>{t.morning}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setAnalyticsShift('night')}
                                        style={[styles.shiftBtn, analyticsShift === 'night' && styles.shiftBtnActive]}
                                    >
                                        <Text style={[styles.shiftBtnText, analyticsShift === 'night' && styles.shiftBtnTextActive]}>{t.night}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={[styles.statCard, { backgroundColor: '#10b981' }]}>
                                    <Feather name="users" size={20} color="rgba(255,255,255,0.3)" style={styles.statBgIcon} />
                                    <Text style={styles.statLabel}>{t.statComing}</Text>
                                    <Text style={styles.statValue}>{currentStats.coming}</Text>
                                </View>
                                <View style={[styles.statCard, { backgroundColor: '#4f46e5' }]}>
                                    <Feather name="check-circle" size={20} color="rgba(255,255,255,0.3)" style={styles.statBgIcon} />
                                    <Text style={styles.statLabel}>{t.statServed}</Text>
                                    <Text style={styles.statValue}>{currentStats.consumed || 0}</Text>
                                </View>
                                <View style={[styles.statCard, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' }]}>
                                    <Feather name="user-x" size={20} color="rgba(244,63,94,0.1)" style={styles.statBgIcon} />
                                    <Text style={[styles.statLabel, { color: '#64748b' }]}>{t.statSkipped}</Text>
                                    <Text style={[styles.statValue, { color: '#f43f5e' }]}>{currentStats.notComing}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Kitchen Ration Estimator Card */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.sectionTitle}>{t.kitchenRationEstimator}</Text>
                                    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
                                        {t.rawIngredientQuantities} {currentStats.coming} {t.diners} ({analyticsShift === 'morning' ? t.morning : t.night})
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setRationModalVisible(true)}
                                    style={styles.customNormsBtn}
                                >
                                    <Feather name="sliders" size={13} color="#4f46e5" />
                                    <Text style={styles.customNormsBtnText}>{t.norms}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.rationGrid}>
                                <View style={styles.rationCard}>
                                    <Text style={styles.rationEmoji}>🍚</Text>
                                    <Text style={styles.rationValue}>{currentShiftEstimates.rice} kg</Text>
                                    <Text style={styles.rationTitle}>{t.rawRice}</Text>
                                    <Text style={styles.rationNorm}>{rationConfig.riceGrams}{t.perPlate}</Text>
                                </View>
                                <View style={styles.rationCard}>
                                    <Text style={styles.rationEmoji}>🌾</Text>
                                    <Text style={styles.rationValue}>{currentShiftEstimates.flour} kg</Text>
                                    <Text style={styles.rationTitle}>{t.attaFlour}</Text>
                                    <Text style={styles.rationNorm}>{rationConfig.flourGrams}{t.perPlate}</Text>
                                </View>
                                <View style={styles.rationCard}>
                                    <Text style={styles.rationEmoji}>🥣</Text>
                                    <Text style={styles.rationValue}>{currentShiftEstimates.dal} kg</Text>
                                    <Text style={styles.rationTitle}>{t.dalPulses}</Text>
                                    <Text style={styles.rationNorm}>{rationConfig.dalGrams}{t.perPlate}</Text>
                                </View>
                                <View style={styles.rationCard}>
                                    <Text style={styles.rationEmoji}>🥬</Text>
                                    <Text style={styles.rationValue}>{currentShiftEstimates.veggies} kg</Text>
                                    <Text style={styles.rationTitle}>{t.vegetables}</Text>
                                    <Text style={styles.rationNorm}>{rationConfig.veggieGrams}{t.perPlate}</Text>
                                </View>
                            </View>

                            <View style={styles.wastePreventedBanner}>
                                <Feather name="award" size={18} color="#059669" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.wastePreventedTitle}>🌱 {t.statFoodSaved}</Text>
                                    <Text style={styles.wastePreventedDesc}>
                                        ~{foodSavedKg} kg {t.wastePreventedDesc}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* TAB 2: MENU (Daily Menu & Stories) */}
                {activeTab === 'menu' && (
                    <View>
                        {/* Date Selector */}
                        <View style={styles.dateSelector}>
                            <TouchableOpacity
                                style={[styles.dateBtn, menuDate === getLocalDateString(0) && styles.dateBtnActive]}
                                onPress={() => setMenuDate(getLocalDateString(0))}
                            >
                                <Text style={[styles.dateBtnText, menuDate === getLocalDateString(0) && styles.dateBtnTextActive]}>{t.today}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.dateBtn, menuDate === getLocalDateString(1) && styles.dateBtnActive]}
                                onPress={() => setMenuDate(getLocalDateString(1))}
                            >
                                <Text style={[styles.dateBtnText, menuDate === getLocalDateString(1) && styles.dateBtnTextActive]}>{t.tomorrow}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Publish Menu Card */}
                        <View style={styles.section}>
                            <View style={{ marginBottom: 12 }}>
                                <Text style={styles.sectionTitle}>{t.publishMenuTitle}</Text>
                                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: -10 }}>
                                    {t.publishMealItemsFor} {displayDate}
                                </Text>
                            </View>
                            <View style={styles.premiumCard}>
                                <View style={[styles.shiftToggleRow, { marginBottom: 20 }]}>
                                    <TouchableOpacity
                                        onPress={() => setMenuShift('morning')}
                                        style={[styles.shiftBtn, menuShift === 'morning' && styles.shiftBtnActive]}
                                    >
                                        <Feather name="sun" size={14} color={menuShift === 'morning' ? '#4f46e5' : '#64748b'} style={{ marginRight: 6 }} />
                                        <Text style={[styles.shiftBtnText, menuShift === 'morning' && styles.shiftBtnTextActive]}>{t.morning}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setMenuShift('night')}
                                        style={[styles.shiftBtn, menuShift === 'night' && styles.shiftBtnActive]}
                                    >
                                        <Feather name="moon" size={14} color={menuShift === 'night' ? '#4f46e5' : '#64748b'} style={{ marginRight: 6 }} />
                                        <Text style={[styles.shiftBtnText, menuShift === 'night' && styles.shiftBtnTextActive]}>{t.night}</Text>
                                    </TouchableOpacity>
                                </View>

                                <TextInput
                                    style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                                    placeholder={t.dishesPlaceholder}
                                    placeholderTextColor="#94a3b8"
                                    multiline
                                    value={menuItems}
                                    onChangeText={setMenuItems}
                                />
                                <View style={styles.priceInputWrapper}>
                                    <Text style={styles.currencySymbol}>₹</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        placeholder={t.thaliPrice}
                                        placeholderTextColor="#94a3b8"
                                        keyboardType="numeric"
                                        value={price}
                                        onChangeText={setPrice}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={styles.publishBtn}
                                    onPress={handlePublishMenu}
                                    disabled={isPublishing}
                                >
                                    {isPublishing ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Feather name="send" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                                            <Text style={styles.publishBtnText}>{t.publishButton} ({menuShift === 'morning' ? t.morning : t.night})</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Live 24H Story Card */}
                        <View style={styles.section}>
                            <View style={{ marginBottom: 12 }}>
                                <Text style={styles.sectionTitle}>{t.liveKitchenFeed}</Text>
                                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: -10 }}>
                                    {t.liveFeedSub}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.postStoryBtn}
                                onPress={promptStoryChoice}
                                activeOpacity={0.8}
                            >
                                <View style={styles.storyIconCircle}>
                                    <Feather name="camera" size={20} color="#ffffff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.postStoryBtnTitle}>{t.postLiveUpdate}</Text>
                                        <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>24H LIVE</Text></View>
                                    </View>
                                    <Text style={styles.postStoryBtnSub}>{t.postLiveUpdateSub}</Text>
                                </View>
                                <Feather name="plus-circle" size={22} color="#ea580c" />
                            </TouchableOpacity>

                            {/* Active Stories List */}
                            {myActiveStories && myActiveStories.length > 0 && (
                                <View style={{ marginTop: 16 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <Text style={styles.activeStoriesTitle}>
                                            {t.activeStories} ({myActiveStories.length})
                                        </Text>
                                        <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>{t.tapToView}</Text>
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
                                        {myActiveStories.map((s) => (
                                            <TouchableOpacity
                                                key={s._id}
                                                style={styles.activeStoryThumbCard}
                                                onPress={() => handleViewStory(s)}
                                                activeOpacity={0.85}
                                            >
                                                <Image source={{ uri: s.imageUrl }} style={styles.activeStoryThumbImg} resizeMode="cover" />
                                                <View style={styles.activeStoryGradientOverlay}>
                                                    <TouchableOpacity
                                                        style={styles.activeStoryCardTrashBtn}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteStory(s._id);
                                                        }}
                                                    >
                                                        <Feather name="trash-2" size={13} color="#ffffff" />
                                                    </TouchableOpacity>
                                                    {s.caption ? (
                                                        <Text style={styles.activeStoryCardCaption} numberOfLines={1}>{s.caption}</Text>
                                                    ) : null}
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* TAB 3: MEMBERS (Subscriptions & UPI Verification) */}
                {activeTab === 'members' && (
                    <View style={styles.section}>
                        <View style={{ marginBottom: 14 }}>
                            <Text style={styles.sectionTitle}>{t.monthlyMembers} ({members.length})</Text>
                            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: -10 }}>
                                {t.monthlyMembersSub}
                            </Text>
                        </View>

                        {/* Search Bar */}
                        <View style={styles.searchBarWrapper}>
                            <Feather name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={t.searchMemberPlaceholder}
                                placeholderTextColor="#94a3b8"
                                value={memberSearch}
                                onChangeText={setMemberSearch}
                            />
                            {memberSearch.length > 0 && (
                                <TouchableOpacity onPress={() => setMemberSearch('')} style={{ padding: 4 }}>
                                    <Feather name="x" size={16} color="#94a3b8" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Horizontal Filter Pills */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.filterPillsScroll}
                            contentContainerStyle={styles.filterPillsContent}
                        >
                            <TouchableOpacity
                                style={[styles.filterPill, memberFilter === 'all' && styles.filterPillActive]}
                                onPress={() => setMemberFilter('all')}
                            >
                                <Text style={[styles.filterPillText, memberFilter === 'all' && styles.filterPillTextActive]}>
                                    {t.filterAll} ({members.length})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterPill, memberFilter === 'verification_pending' && styles.filterPillActive, pendingVerifications > 0 && styles.filterPillPending]}
                                onPress={() => setMemberFilter('verification_pending')}
                            >
                                <Text style={[styles.filterPillText, memberFilter === 'verification_pending' && styles.filterPillTextActive, pendingVerifications > 0 && { color: memberFilter === 'verification_pending' ? '#ffffff' : '#ea580c' }]}>
                                    {t.filterVerifyUpi} ({pendingVerifications})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterPill, memberFilter === 'paid' && styles.filterPillActive]}
                                onPress={() => setMemberFilter('paid')}
                            >
                                <Text style={[styles.filterPillText, memberFilter === 'paid' && styles.filterPillTextActive]}>
                                    {t.filterPaid} ({members.filter(m => m.status === 'paid').length})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterPill, memberFilter === 'pending' && styles.filterPillActive]}
                                onPress={() => setMemberFilter('pending')}
                            >
                                <Text style={[styles.filterPillText, memberFilter === 'pending' && styles.filterPillTextActive]}>
                                    {t.filterUnpaid} ({members.filter(m => m.status === 'pending').length})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.filterPill, memberFilter === 'expired' && styles.filterPillActive]}
                                onPress={() => setMemberFilter('expired')}
                            >
                                <Text style={[styles.filterPillText, memberFilter === 'expired' && styles.filterPillTextActive]}>
                                    {t.filterExpired} ({members.filter(m => m.status === 'expired').length})
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Filtered Members List */}
                        {filteredMembers.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Feather name="users" size={32} color="#cbd5e1" />
                                <Text style={styles.emptyText}>
                                    {memberSearch || memberFilter !== 'all' ? t.noMembersMatch : t.noMembersYet}
                                </Text>
                            </View>
                        ) : (
                            filteredMembers.map(member => (
                                <View
                                    key={member._id}
                                    style={[
                                        styles.memberCard,
                                        member.status === 'verification_pending' && { borderColor: '#f59e0b', borderWidth: 2 }
                                    ]}
                                >
                                    <View style={styles.memberHeader}>
                                        <View style={styles.memberAvatar}>
                                            <Text style={styles.avatarText}>{(member.studentName || 'S').charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.memberName}>{member.studentName}</Text>
                                            <Text style={styles.memberPhone}><Feather name="phone" size={10} /> {member.studentPhone || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.memberShift}>
                                            <Text style={styles.memberShiftText}>
                                                {member.shift === 'both' ? (language === 'mr' ? 'दोन्ही' : 'Both') : member.shift === 'morning' ? t.morning : t.night} {t.shift}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.memberMetrics}>
                                        <TouchableOpacity style={styles.metricBtn} onPress={() => openModal('skips', member._id, member.allowedSkips, 'Max Skips', 'Enter total allowed skips')}>
                                            <Text style={styles.metricLabel}>{t.skips}</Text>
                                            <Text style={styles.metricValue}>{member.usedSkips}/{member.allowedSkips} <Feather name="edit-2" size={10} color="#94a3b8" /></Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.metricBtn} onPress={() => openModal('fee', member._id, member.monthlyFee, 'Monthly Fee (₹)', 'Enter fee amount')}>
                                            <Text style={styles.metricLabel}>{t.fee}</Text>
                                            <Text style={[styles.metricValue, { color: '#f97316' }]}>₹{member.monthlyFee} <Feather name="edit-2" size={10} color="#94a3b8" /></Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.metricBtn} onPress={() => openModal('days', member._id, '', 'Extend Days', 'Add days for absenteeism')}>
                                            <Text style={styles.metricLabel}>{t.expires}</Text>
                                            <Text style={styles.metricValue}>{member.endDate ? new Date(member.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A'} <Feather name="plus-circle" size={10} color="#94a3b8" /></Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Verification Pending Highlighting */}
                                    {member.status === 'verification_pending' ? (
                                        <View style={styles.pendingVerifyCard}>
                                            <View style={styles.pendingVerifyHeader}>
                                                <Feather name="alert-triangle" size={14} color="#ea580c" />
                                                <Text style={styles.pendingVerifyTitle}>{t.upiVerificationRequested}</Text>
                                            </View>
                                            <Text style={styles.utrText}>
                                                UTR: <Text style={{ fontWeight: '900', color: '#0f172a' }}>{member.lastUtrNumber || 'Not provided'}</Text>
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.approvePaymentBtn}
                                                onPress={() => updateSubscription(member._id, { status: 'paid' })}
                                            >
                                                <Feather name="check" size={15} color="#ffffff" />
                                                <Text style={styles.approvePaymentBtnText}>{t.approvePaymentBtn}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : member.status === 'expired' ? (
                                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                                            <View style={[styles.payBtn, { flex: 1, backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
                                                <Text style={[styles.payBtnText, { color: '#b45309' }]}>{t.statusExpired}</Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleRenewMember(member._id)}
                                                style={[styles.payBtn, { flex: 1, backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                                                <Text style={[styles.payBtnText, { color: '#16a34a' }]}>{t.renew30d}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => togglePaymentStatus(member._id, member.status)}
                                            style={[styles.payBtn, member.status === 'paid' ? styles.payBtnPaid : styles.payBtnPending]}>
                                            <Text style={[styles.payBtnText, member.status === 'paid' ? { color: '#059669' } : { color: '#dc2626' }]}>
                                                {member.status === 'paid' ? t.statusPaid : t.markAsPaidBtn}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* TAB 4: SETTINGS (Mess Configuration) */}
                {activeTab === 'settings' && (
                    <View>
                        {/* Mess Profile Card */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t.messProfile}</Text>
                            <View style={styles.premiumCard}>
                                <View style={styles.messProfileHeader}>
                                    <View style={styles.messProfileAvatar}>
                                        <Feather name="coffee" size={24} color="#4f46e5" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.messProfileTitle}>{user?.messName || t.messProfile}</Text>
                                        <Text style={styles.messProfileSubtitle}>{t.registeredMessAccount}</Text>
                                    </View>
                                    {user?.isVerified ? (
                                        <View style={styles.verifiedBadgePill}>
                                            <Feather name="check-circle" size={12} color="#16a34a" />
                                            <Text style={styles.verifiedBadgeText}>{t.verified}</Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.verifiedBadgePill, { backgroundColor: '#fef3c7' }]}>
                                            <Feather name="clock" size={12} color="#d97706" />
                                            <Text style={[styles.verifiedBadgeText, { color: '#d97706' }]}>{t.pending}</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.messProfileDivider} />

                                <View style={styles.messProfileGrid}>
                                    <View style={styles.messProfileItem}>
                                        <Text style={styles.messProfileItemLabel}>{t.ownerName}</Text>
                                        <Text style={styles.messProfileItemValue}>{user?.name || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.messProfileItem}>
                                        <Text style={styles.messProfileItemLabel}>{t.contactPhone}</Text>
                                        <Text style={styles.messProfileItemValue}>{user?.phone || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.messProfileItem}>
                                        <Text style={styles.messProfileItemLabel}>{t.messName}</Text>
                                        <Text style={styles.messProfileItemValue}>{user?.messName || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.messProfileItem}>
                                        <Text style={styles.messProfileItemLabel}>{t.fssaiLicenseNumber}</Text>
                                        <Text style={styles.messProfileItemValue}>{user?.fssaiNumber || t.notSpecified}</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.settingsLogoutBtn}
                                    onPress={handleLogout}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="log-out" size={16} color="#ef4444" />
                                    <Text style={styles.settingsLogoutBtnText}>{t.logoutAccount}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Attendance Cut-Off Timers */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t.cutoffTimersTitle}</Text>
                            <View style={styles.premiumCard}>
                                <Text style={{ color: '#64748b', fontSize: 13, marginBottom: 16, lineHeight: 20 }}>
                                    {t.cutoffTimersDesc}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>{t.morningCutoff}</Text>
                                        <TextInput
                                            style={[styles.input, { marginBottom: 0 }]}
                                            placeholder="09:30"
                                            placeholderTextColor="#94a3b8"
                                            value={morningCutoff}
                                            onChangeText={setMorningCutoff}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>{t.nightCutoff}</Text>
                                        <TextInput
                                            style={[styles.input, { marginBottom: 0 }]}
                                            placeholder="17:30"
                                            placeholderTextColor="#94a3b8"
                                            value={nightCutoff}
                                            onChangeText={setNightCutoff}
                                        />
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={[styles.publishBtn, { backgroundColor: '#4f46e5' }, isSavingCutoff && { opacity: 0.7 }]}
                                    disabled={isSavingCutoff}
                                    onPress={handleSaveCutoff}
                                >
                                    {isSavingCutoff ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Feather name="clock" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                                            <Text style={styles.publishBtnText}>{t.saveCutoffTimes}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* UPI Payment Configuration */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t.upiConfigTitle}</Text>
                            <View style={styles.premiumCard}>
                                <Text style={{ color: '#64748b', fontSize: 13, marginBottom: 16, lineHeight: 20 }}>
                                    {t.upiConfigDesc}
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. messname@okhdfcbank"
                                    placeholderTextColor="#94a3b8"
                                    value={upiId}
                                    onChangeText={setUpiId}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    style={[styles.publishBtn, { backgroundColor: '#10b981' }, isSavingUpi && { opacity: 0.7 }]}
                                    disabled={isSavingUpi}
                                    onPress={handleSaveUpi}
                                >
                                    {isSavingUpi ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Feather name="credit-card" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                                            <Text style={styles.publishBtnText}>{t.saveUpiId}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Kitchen Ration Norms Card */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t.kitchenRationNorms}</Text>
                            <View style={styles.premiumCard}>
                                <Text style={{ color: '#64748b', fontSize: 13, marginBottom: 14, lineHeight: 20 }}>
                                    {t.rationNormsDesc}
                                </Text>
                                <View style={styles.rationGrid}>
                                    <View style={styles.rationCard}>
                                        <Text style={styles.rationEmoji}>🍚</Text>
                                        <Text style={styles.rationValue}>{rationConfig.riceGrams || 120}g</Text>
                                        <Text style={styles.rationTitle}>{t.rawRice}</Text>
                                    </View>
                                    <View style={styles.rationCard}>
                                        <Text style={styles.rationEmoji}>🌾</Text>
                                        <Text style={styles.rationValue}>{rationConfig.flourGrams || 110}g</Text>
                                        <Text style={styles.rationTitle}>{t.attaFlour}</Text>
                                    </View>
                                    <View style={styles.rationCard}>
                                        <Text style={styles.rationEmoji}>🥣</Text>
                                        <Text style={styles.rationValue}>{rationConfig.dalGrams || 45}g</Text>
                                        <Text style={styles.rationTitle}>{t.dalPulses}</Text>
                                    </View>
                                    <View style={styles.rationCard}>
                                        <Text style={styles.rationEmoji}>🥬</Text>
                                        <Text style={styles.rationValue}>{rationConfig.veggieGrams || 150}g</Text>
                                        <Text style={styles.rationTitle}>{t.vegetables}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={[styles.publishBtn, { backgroundColor: '#4f46e5', marginTop: 4 }]}
                                    onPress={() => setRationModalVisible(true)}
                                >
                                    <Feather name="sliders" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                                    <Text style={styles.publishBtnText}>{t.editGramBaselines}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Mess Location Map */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t.messLocationMap}</Text>
                            <View style={styles.premiumCard}>
                                <Text style={{ color: '#64748b', fontSize: 13, marginBottom: 16, lineHeight: 20 }}>
                                    {t.messLocationDesc}
                                </Text>

                                {savedLocation && (
                                    <View style={styles.locationActiveBanner}>
                                        <Feather name="map-pin" size={16} color="#4338ca" />
                                        <Text style={styles.locationActiveText}>{t.locationActive}</Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.publishBtn, { backgroundColor: '#4f46e5' }]}
                                    onPress={handleSetLocation}
                                    disabled={isSettingLocation}
                                >
                                    {isSettingLocation ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Feather name="navigation" size={16} color="#fff" style={{ marginRight: 8 }} />
                                            <Text style={styles.publishBtnText}>
                                                {savedLocation ? t.updateLocation : t.setLocationGps}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* FLOATING BOTTOM TAB BAR */}
            <View style={styles.floatingTabBar}>
                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => setActiveTab('kitchen')}
                    activeOpacity={0.7}
                >
                    <Feather name="activity" size={20} color={activeTab === 'kitchen' ? '#4f46e5' : '#94a3b8'} />
                    <Text style={[styles.bottomTabText, activeTab === 'kitchen' && styles.bottomTabTextActive]}>
                        {t.tabKitchen}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => setActiveTab('menu')}
                    activeOpacity={0.7}
                >
                    <Feather name="book-open" size={20} color={activeTab === 'menu' ? '#4f46e5' : '#94a3b8'} />
                    <Text style={[styles.bottomTabText, activeTab === 'menu' && styles.bottomTabTextActive]}>
                        {t.tabMenu}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => setActiveTab('members')}
                    activeOpacity={0.7}
                >
                    <View style={{ position: 'relative' }}>
                        <Feather name="users" size={20} color={activeTab === 'members' ? '#4f46e5' : '#94a3b8'} />
                        {pendingVerifications > 0 && (
                            <View style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>
                                    {pendingVerifications > 9 ? '9+' : pendingVerifications}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.bottomTabText, activeTab === 'members' && styles.bottomTabTextActive]}>
                        {t.tabMembers}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.bottomTabBtn}
                    onPress={() => setActiveTab('settings')}
                    activeOpacity={0.7}
                >
                    <Feather name="sliders" size={20} color={activeTab === 'settings' ? '#4f46e5' : '#94a3b8'} />
                    <Text style={[styles.bottomTabText, activeTab === 'settings' && styles.bottomTabTextActive]}>
                        {t.tabSettings}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* SCANNER MODAL */}
            <Modal visible={scannerVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
                    <View style={styles.scannerHeader}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>{t.scanMealQrPass}</Text>
                        <TouchableOpacity onPress={() => setScannerVisible(false)} style={{ padding: 6 }}>
                            <Feather name="x" size={26} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.cameraContainer}>
                        <CameraView
                            style={StyleSheet.absoluteFill}
                            facing="back"
                            onBarcodeScanned={isVerifyingQr ? undefined : (scanned) => handleVerifyQrToken(scanned.data)}
                        />
                        <View style={styles.scanTargetOverlay}>
                            <View style={styles.scanTargetBox} />
                        </View>
                    </View>

                    {/* Scan Result Banner */}
                    {scanResult && (
                        <View style={[styles.resultBanner, scanResult.type === 'success' ? styles.resultSuccess : styles.resultError]}>
                            <Feather name={scanResult.type === 'success' ? "check-circle" : "alert-circle"} size={24} color="#fff" />
                            <View style={{ flex: 1 }}>
                                {scanResult.studentName && (
                                    <Text style={styles.resultStudent}>{scanResult.studentName}</Text>
                                )}
                                <Text style={styles.resultMessage}>{scanResult.message}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setScanResult(null)} style={{ padding: 4 }}>
                                <Feather name="x" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Manual token input option for fallback */}
                    <View style={styles.manualInputWrapper}>
                        <TextInput
                            style={styles.manualInput}
                            placeholder="Or paste QR token manually..."
                            placeholderTextColor="#94a3b8"
                            value={manualQrInput}
                            onChangeText={setManualQrInput}
                        />
                        <TouchableOpacity
                            style={styles.manualVerifyBtn}
                            onPress={() => {
                                if (manualQrInput.trim()) {
                                    handleVerifyQrToken(manualQrInput.trim());
                                    setManualQrInput('');
                                }
                            }}
                            disabled={isVerifyingQr}
                        >
                            {isVerifyingQr ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Verify</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
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

            {/* EDIT SUBSCRIPTION METRIC MODAL */}
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

            {/* RATION NORMS MODAL */}
            <Modal visible={rationModalVisible} transparent animationType="fade" onRequestClose={() => setRationModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Feather name="sliders" size={20} color="#4f46e5" />
                                <Text style={[styles.modalTitle, { marginBottom: 0, textAlign: 'left' }]}>Per-Plate Norms</Text>
                            </View>
                            <TouchableOpacity onPress={() => setRationModalVisible(false)}>
                                <Feather name="x-circle" size={22} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                            Customize per-student ingredient norms (in grams) for kitchen prep estimates.
                        </Text>

                        <View style={{ gap: 10, marginBottom: 16 }}>
                            <View style={styles.rationInputRow}>
                                <Text style={styles.rationInputLabel}>🍚 Raw Rice (grams):</Text>
                                <TextInput
                                    style={styles.rationInputField}
                                    keyboardType="numeric"
                                    value={tempRationConfig.riceGrams}
                                    onChangeText={(v) => setTempRationConfig(p => ({ ...p, riceGrams: v }))}
                                />
                            </View>

                            <View style={styles.rationInputRow}>
                                <Text style={styles.rationInputLabel}>🌾 Atta / Flour (grams):</Text>
                                <TextInput
                                    style={styles.rationInputField}
                                    keyboardType="numeric"
                                    value={tempRationConfig.flourGrams}
                                    onChangeText={(v) => setTempRationConfig(p => ({ ...p, flourGrams: v }))}
                                />
                            </View>

                            <View style={styles.rationInputRow}>
                                <Text style={styles.rationInputLabel}>🥣 Dal / Lentils (grams):</Text>
                                <TextInput
                                    style={styles.rationInputField}
                                    keyboardType="numeric"
                                    value={tempRationConfig.dalGrams}
                                    onChangeText={(v) => setTempRationConfig(p => ({ ...p, dalGrams: v }))}
                                />
                            </View>

                            <View style={styles.rationInputRow}>
                                <Text style={styles.rationInputLabel}>🥬 Vegetables (grams):</Text>
                                <TextInput
                                    style={styles.rationInputField}
                                    keyboardType="numeric"
                                    value={tempRationConfig.veggieGrams}
                                    onChangeText={(v) => setTempRationConfig(p => ({ ...p, veggieGrams: v }))}
                                />
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setRationModalVisible(false)} style={styles.modalBtnCancel}>
                                <Text style={{ color: '#64748b', fontWeight: '900' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSaveRationConfig} style={styles.modalBtnSave} disabled={isSavingRation}>
                                {isSavingRation ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={{ color: '#fff', fontWeight: '900' }}>Save Norms</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* POST 24H STORY MODAL */}
            <Modal visible={storyModalVisible} transparent animationType="slide" onRequestClose={() => setStoryModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.storyModalBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Feather name="camera" size={20} color="#ea580c" />
                                <Text style={[styles.modalTitle, { marginBottom: 0, textAlign: 'left' }]}>New Live Story 📸</Text>
                            </View>
                            <TouchableOpacity onPress={() => setStoryModalVisible(false)}>
                                <Feather name="x-circle" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                            This update will be shown to all college students on the home screen for 24 hours.
                        </Text>

                        {storyImageUri && (
                            <View style={styles.storyPreviewContainer}>
                                <Image source={{ uri: storyImageUri }} style={styles.storyPreviewImage} resizeMode="cover" />
                            </View>
                        )}

                        <Text style={styles.storyCaptionLabel}>Caption (e.g. "Fresh piping-hot jalebis ready!"):</Text>
                        <TextInput
                            style={styles.storyCaptionInput}
                            placeholder="Add a short caption (max 100 chars)..."
                            placeholderTextColor="#94a3b8"
                            maxLength={100}
                            value={storyCaption}
                            onChangeText={setStoryCaption}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                onPress={() => setStoryModalVisible(false)}
                                style={styles.modalBtnCancel}
                                disabled={isPostingStory}
                            >
                                <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handlePostStory}
                                style={[styles.modalBtnSave, { backgroundColor: '#ea580c' }]}
                                disabled={isPostingStory}
                            >
                                <Text style={{ color: '#fff', fontWeight: '900' }}>Publish Live 🚀</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* VIEW ACTIVE STORY MODAL */}
            <Modal visible={viewStoryModalVisible} transparent animationType="fade" onRequestClose={() => setViewStoryModalVisible(false)}>
                <View style={styles.storyViewerOverlay}>
                    <SafeAreaView style={styles.storyViewerContainer}>
                        <View style={styles.storyViewerHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>24H LIVE</Text></View>
                                <Text style={styles.storyViewerTime}>
                                    {selectedActiveStory ? new Date(selectedActiveStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                {selectedActiveStory && (
                                    <TouchableOpacity
                                        onPress={() => handleDeleteStory(selectedActiveStory._id)}
                                        style={styles.storyViewerDeleteBtn}
                                        disabled={isDeletingStory === selectedActiveStory._id}
                                    >
                                        {isDeletingStory === selectedActiveStory._id ? (
                                            <ActivityIndicator size="small" color="#ffffff" />
                                        ) : (
                                            <>
                                                <Feather name="trash-2" size={16} color="#ffffff" />
                                                <Text style={styles.storyViewerDeleteBtnText}>Delete</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => setViewStoryModalVisible(false)} style={styles.storyViewerCloseBtn}>
                                    <Feather name="x" size={22} color="#ffffff" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {selectedActiveStory && (
                            <View style={styles.storyViewerContent}>
                                <Image
                                    source={{ uri: selectedActiveStory.imageUrl }}
                                    style={styles.storyViewerImage}
                                    resizeMode="contain"
                                />
                                {selectedActiveStory.caption ? (
                                    <View style={styles.storyViewerCaptionBox}>
                                        <Text style={styles.storyViewerCaptionText}>{selectedActiveStory.caption}</Text>
                                    </View>
                                ) : null}
                            </View>
                        )}
                    </SafeAreaView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f8fafc', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#f8fafc' },
    greeting: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
    logoutBtn: { backgroundColor: '#fee2e2', padding: 10, borderRadius: 12 },

    scannerHeaderBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
    scannerHeaderBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

    bellBtn: { padding: 10, borderRadius: 12, backgroundColor: '#e0e7ff', position: 'relative' },
    notifBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    notifBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: 'bold' },

    langToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3e8ff',
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d8b4fe',
        gap: 5,
    },
    langToggleBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#7e22ce',
        backgroundColor: '#ede9fe',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        overflow: 'hidden',
    },
    langToggleText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#6b21a8',
    },

    content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
    sectionTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 16 },

    dateSelector: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 16, padding: 4, marginBottom: 20, alignSelf: 'center' },
    dateBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12 },
    dateBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    dateBtnText: { fontWeight: 'bold', color: '#64748b', fontSize: 15 },
    dateBtnTextActive: { color: '#0f172a' },

    section: { marginBottom: 28 },
    sectionHeader: { flexDirection: 'column', alignItems: 'flex-start', marginBottom: 16 },

    shiftToggleRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, width: '100%' },
    shiftBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, flexDirection: 'row', justifyContent: 'center' },
    shiftBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    shiftBtnText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
    shiftBtnTextActive: { color: '#4f46e5' },

    // Prominent QR Hero CTA Card
    qrScannerHeroCard: {
        backgroundColor: '#4f46e5',
        borderRadius: 22,
        padding: 16,
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#4f46e5',
        shadowOpacity: 0.28,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    qrScannerHeroIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    qrScannerHeroTitle: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '900',
    },
    qrScannerHeroSub: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 11,
        marginTop: 2,
        fontWeight: '500',
    },

    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1, padding: 16, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    statBgIcon: { position: 'absolute', right: -6, bottom: -6, transform: [{ scale: 2.2 }] },
    statLabel: { color: '#ecfdf5', fontWeight: 'bold', fontSize: 12, marginBottom: 6 },
    statValue: { color: '#ffffff', fontWeight: '900', fontSize: 28 },

    premiumCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
    input: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 16, marginBottom: 16, fontSize: 15, color: '#0f172a' },
    priceInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 16, marginBottom: 20, paddingHorizontal: 16 },
    currencySymbol: { fontSize: 16, fontWeight: 'bold', color: '#64748b', marginRight: 8 },
    priceInput: { flex: 1, paddingVertical: 16, fontSize: 15, color: '#0f172a' },

    publishBtn: { backgroundColor: '#0f172a', paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    publishBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 15 },

    emptyState: { alignItems: 'center', padding: 40, backgroundColor: '#ffffff', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
    emptyText: { color: '#94a3b8', fontWeight: 'bold', marginTop: 12, fontSize: 14, textAlign: 'center' },

    // Members Tab Specific Styles
    searchBarWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: '#0f172a',
        paddingVertical: 10,
    },
    filterPillsScroll: {
        marginBottom: 16,
    },
    filterPillsContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 2,
    },
    filterPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    filterPillActive: {
        backgroundColor: '#4f46e5',
        borderColor: '#4338ca',
    },
    filterPillPending: {
        borderColor: '#fed7aa',
        backgroundColor: '#fff7ed',
    },
    filterPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
    },
    filterPillTextActive: {
        color: '#ffffff',
        fontWeight: '800',
    },

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

    pendingVerifyCard: { backgroundColor: '#fff7ed', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#fed7aa', marginTop: 10 },
    pendingVerifyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    pendingVerifyTitle: { fontSize: 12, fontWeight: 'bold', color: '#ea580c' },
    utrText: { fontSize: 13, color: '#475569', marginBottom: 10 },
    approvePaymentBtn: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
    approvePaymentBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },

    payBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    payBtnPaid: { backgroundColor: '#ecfdf5' },
    payBtnPending: { backgroundColor: '#fef2f2' },
    payBtnText: { fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },

    locationActiveBanner: { backgroundColor: '#e0e7ff', padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
    locationActiveText: { color: '#4338ca', fontWeight: 'bold', fontSize: 13 },

    // Floating Tab Bar Styles
    floatingTabBar: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        borderRadius: 24,
        paddingVertical: 10,
        paddingHorizontal: 8,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    bottomTabBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingVertical: 4,
    },
    bottomTabText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#94a3b8',
        marginTop: 4,
    },
    bottomTabTextActive: {
        color: '#4f46e5',
        fontWeight: '900',
    },
    tabBadge: {
        position: 'absolute',
        top: -4,
        right: -10,
        backgroundColor: '#ea580c',
        borderRadius: 10,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#ffffff',
    },
    tabBadgeText: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: '900',
    },

    // Scanner Styles
    scannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#0f172a' },
    cameraContainer: { flex: 1, position: 'relative', overflow: 'hidden' },
    scanTargetOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
    scanTargetBox: { width: 250, height: 250, borderWidth: 2, borderColor: '#10b981', borderRadius: 24, backgroundColor: 'transparent' },
    resultBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, margin: 16, borderRadius: 16, gap: 12 },
    resultSuccess: { backgroundColor: '#10b981' },
    resultError: { backgroundColor: '#ef4444' },
    resultStudent: { color: '#fff', fontWeight: '900', fontSize: 16 },
    resultMessage: { color: '#fff', fontSize: 13, marginTop: 2 },
    manualInputWrapper: { flexDirection: 'row', padding: 16, backgroundColor: '#1e293b', gap: 10, alignItems: 'center' },
    manualInput: { flex: 1, backgroundColor: '#334155', color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14 },
    manualVerifyBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },

    // Notification Styles
    notifItem: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    notifUnread: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
    notifTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
    notifBody: { fontSize: 13, color: '#475569', marginBottom: 6 },
    notifDate: { fontSize: 11, color: '#94a3b8' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalBox: { width: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 20, color: '#0f172a', textAlign: 'center' },
    modalInput: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, marginBottom: 24, fontSize: 20, textAlign: 'center', fontWeight: '900', color: '#4f46e5' },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtnCancel: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 16 },
    modalBtnSave: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#4f46e5', borderRadius: 16 },

    // Kitchen Ration Estimator Styles
    customNormsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 5 },
    customNormsBtnText: { color: '#4f46e5', fontWeight: '800', fontSize: 12 },
    rationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    rationCard: { flex: 1, minWidth: '45%', backgroundColor: '#ffffff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
    rationEmoji: { fontSize: 24, marginBottom: 4 },
    rationValue: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    rationTitle: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 2 },
    rationNorm: { fontSize: 10, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
    wastePreventedBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ecfdf5', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#a7f3d0' },
    wastePreventedTitle: { fontSize: 13, fontWeight: '800', color: '#065f46', marginBottom: 2 },
    wastePreventedDesc: { fontSize: 12, color: '#047857', lineHeight: 18, fontWeight: '500' },
    rationInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rationInputLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },
    rationInputField: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontWeight: '800', color: '#0f172a', width: 90, textAlign: 'center' },

    // Post Live Story & Top Chef Styles
    postStoryBtn: {
        backgroundColor: '#fff7ed',
        borderWidth: 1.5,
        borderColor: '#fed7aa',
        borderRadius: 20,
        padding: 14,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#ea580c',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    storyIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#ea580c',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    postStoryBtnTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#9a3412',
    },
    postStoryBtnSub: {
        fontSize: 11,
        fontWeight: '600',
        color: '#c2410c',
        marginTop: 2,
    },
    liveBadge: {
        backgroundColor: '#ea580c',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6,
    },
    liveBadgeText: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: '900',
    },
    topChefBadgeHeader: {
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#f59e0b',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    topChefBadgeHeaderText: {
        color: '#b45309',
        fontSize: 11,
        fontWeight: '900',
    },
    tagBadge: {
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    tagBadgeText: {
        color: '#3730a3',
        fontSize: 10,
        fontWeight: '700',
    },
    storyModalBox: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 28,
        padding: 22,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12,
    },
    storyPreviewContainer: {
        width: '100%',
        height: 220,
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 14,
        backgroundColor: '#0f172a',
    },
    storyPreviewImage: {
        width: '100%',
        height: '100%',
    },
    storyCaptionLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#475569',
        marginBottom: 6,
    },
    storyCaptionInput: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        padding: 12,
        fontSize: 14,
        color: '#0f172a',
        marginBottom: 16,
    },
    activeStoriesTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
    activeStoryThumbCard: {
        width: 100,
        height: 130,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#0f172a',
        position: 'relative',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    activeStoryThumbImg: { width: '100%', height: '100%' },
    activeStoryGradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
        padding: 6,
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    activeStoryCardTrashBtn: {
        alignSelf: 'flex-end',
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
        padding: 6,
        borderRadius: 10,
    },
    activeStoryCardCaption: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowRadius: 3,
    },
    storyViewerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
    },
    storyViewerContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    storyViewerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    storyViewerTime: {
        color: '#cbd5e1',
        fontSize: 12,
        fontWeight: '600',
    },
    storyViewerDeleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ef4444',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    storyViewerDeleteBtnText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    storyViewerCloseBtn: {
        padding: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    storyViewerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    storyViewerImage: {
        width: '100%',
        height: '80%',
        borderRadius: 16,
    },
    storyViewerCaptionBox: {
        marginTop: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        maxWidth: '90%',
    },
    storyViewerCaptionText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    messProfileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    messProfileAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#e0e7ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    messProfileTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },
    messProfileSubtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    verifiedBadgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#dcfce7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    verifiedBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#15803d',
    },
    messProfileDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 12,
    },
    messProfileGrid: {
        gap: 10,
        marginBottom: 16,
    },
    messProfileItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    messProfileItemLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    messProfileItemValue: {
        fontSize: 13,
        color: '#0f172a',
        fontWeight: '700',
    },
    settingsLogoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        paddingVertical: 12,
        borderRadius: 14,
        marginTop: 4,
    },
    settingsLogoutBtnText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '700',
    },
});