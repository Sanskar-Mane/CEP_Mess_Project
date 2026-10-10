import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Loader2,
  QrCode,
  Radio,
  Bell,
  Users,
  IndianRupee,
  Scale,
  Settings2
} from 'lucide-react';
import { translations } from '../utils/translations';
import { API_URL } from '../utils/config';
import { getSocket } from '../utils/socket';

// Modular Components
import OwnerNavbar from '../components/owner/OwnerNavbar';
import OwnerHome from '../components/owner/OwnerHome';
import SectionPanel from '../components/owner/SectionPanel';
import QrScannerPanel from '../components/owner/QrScannerPanel';
import LiveStoriesPanel from '../components/owner/LiveStoriesPanel';
import NotificationsPanel from '../components/owner/NotificationsPanel';
import SubscribersPanel from '../components/owner/SubscribersPanel';
import RationEstimatorPanel from '../components/owner/RationEstimatorPanel';
import MessSettingsPanel from '../components/owner/MessSettingsPanel';
import CutoffPopup from '../components/owner/CutoffPopup';

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const OwnerDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // --- AUTHENTICATION LOGIC ---
  const [user, setUser] = useState(location.state?.user || null);
  const [isAuthLoading, setIsAuthLoading] = useState(!user);

  // Active Open Section (null = Home screen)
  const [activeSection, setActiveSection] = useState(null);

  // Language State
  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en');
  const t = translations[lang] || translations.en;

  // Menu State
  const [menuDate, setMenuDate] = useState(getLocalDateString(0));
  const [morningMenu, setMorningMenu] = useState(null);
  const [nightMenu, setNightMenu] = useState(null);

  // Menu Publishing State
  const [isPublishing, setIsPublishing] = useState(false);

  // Analytics & Members State
  const [analyticsShift, setAnalyticsShift] = useState('morning');
  const [stats, setStats] = useState({
    morning: { coming: 0, notComing: 0, consumed: 0, estimates: { requiredKg: { rice: 0, flour: 0, dal: 0, veggies: 0 }, foodSavedKg: 0 } },
    night: { coming: 0, notComing: 0, consumed: 0, estimates: { requiredKg: { rice: 0, flour: 0, dal: 0, veggies: 0 }, foodSavedKg: 0 } }
  });
  const [historyData, setHistoryData] = useState([]);
  const [members, setMembers] = useState([]);

  // Kitchen Ration Estimator State
  const [customRationConfig, setCustomRationConfig] = useState({
    riceGrams: 120,
    flourGrams: 110,
    dalGrams: 45,
    veggieGrams: 150
  });
  const [isSavingRation, setIsSavingRation] = useState(false);
  const [rationMsg, setRationMsg] = useState('');

  // QR Meal Pass Verification State
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [isVerifyingQr, setIsVerifyingQr] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  // UPI Configuration State
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [isSavingUpi, setIsSavingUpi] = useState(false);
  const [upiMsg, setUpiMsg] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);


  // Location State
  const [isSettingLocation, setIsSettingLocation] = useState(false);
  const [locationMsg, setLocationMsg] = useState('');
  const [savedLocation, setSavedLocation] = useState(null);

  // Cut-off Timers State (Set via popup right after saving menu)
  const [morningCutoff, setMorningCutoff] = useState(user?.morningCutoff || '09:30');
  const [nightCutoff, setNightCutoff] = useState(user?.nightCutoff || '17:30');
  const [isCutoffPopupOpen, setIsCutoffPopupOpen] = useState(false);
  const [cutoffPopupShift, setCutoffPopupShift] = useState('morning');

  // 24H Live Story State
  const [storyImage, setStoryImage] = useState('');
  const [storyCaption, setStoryCaption] = useState('');
  const [isPostingStory, setIsPostingStory] = useState(false);
  const [storyMsg, setStoryMsg] = useState('');
  const [myActiveStories, setMyActiveStories] = useState([]);
  const [isDeletingStory, setIsDeletingStory] = useState(null);

  // Canvas Image Compression (max width 1080px, JPEG 0.75 quality)
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 1080;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setStoryImage(compressed);
    } catch (err) {
      console.warn('Canvas image compression failed, falling back to raw data:', err);
      const reader = new FileReader();
      reader.onload = () => setStoryImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const fetchMyStories = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/stories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const groups = await res.json();
        const myGroup = groups.find(
          (g) =>
            g.ownerId === user?._id ||
            g.ownerId?._id === user?._id ||
            String(g.ownerId) === String(user?._id)
        );
        setMyActiveStories(myGroup ? myGroup.stories : []);
      }
    } catch (err) {
      console.warn('Failed to fetch stories:', err);
    }
  }, [user?._id]);

  const handleDeleteStory = async (storyId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this live story? It will be removed immediately from Cloudinary and students' feeds."
      )
    ) {
      return;
    }
    setIsDeletingStory(storyId);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/stories/${storyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMyActiveStories((prev) => prev.filter((s) => s._id !== storyId));
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete story');
      }
    } catch {
      alert('Network error deleting story');
    } finally {
      setIsDeletingStory(null);
    }
  };

  const handlePostStory = async (e) => {
    e.preventDefault();
    if (!storyImage) {
      alert('Please select or upload a live photo for your story!');
      return;
    }
    setIsPostingStory(true);
    setStoryMsg('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          imageUrl: storyImage,
          caption: storyCaption.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setStoryMsg('🎉 Live story published! It will appear on campus student feeds for 24 hours.');
        fetchMyStories();
        setTimeout(() => {
          setStoryImage('');
          setStoryCaption('');
          setStoryMsg('');
          setActiveSection(null);
        }, 1800);
      } else {
        alert(data.error || 'Failed to post story');
      }
    } catch {
      alert('Network error posting story');
    } finally {
      setIsPostingStory(false);
    }
  };

  const displayDate = new Date(menuDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  // 1. Verify User Session (Refresh Fix)
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.role !== 'owner') {
            navigate('/');
          } else {
            setUser(data);
            if (data.upiId) setUpiId(data.upiId);
            if (data.morningCutoff) setMorningCutoff(data.morningCutoff);
            if (data.nightCutoff) setNightCutoff(data.nightCutoff);
            if (data.rationConfig) setCustomRationConfig(data.rationConfig);
            if (data.location && data.location.coordinates && data.location.coordinates[0] !== 0) {
              setSavedLocation({
                lng: data.location.coordinates[0],
                lat: data.location.coordinates[1]
              });
            }
          }
        } else {
          localStorage.removeItem('token');
          navigate('/');
        }
      } catch (e) {
        console.error('Auth error', e);
      } finally {
        setIsAuthLoading(false);
      }
    };

    if (!user) verifyToken();
    else {
      if (user.upiId) setUpiId(user.upiId);
      if (user.morningCutoff) setMorningCutoff(user.morningCutoff);
      if (user.nightCutoff) setNightCutoff(user.nightCutoff);
      if (user.rationConfig) setCustomRationConfig(user.rationConfig);
      setIsAuthLoading(false);
    }
  }, [navigate, user]);

  // 2. Fetch both Morning and Night menus for menuDate
  const fetchDayMenus = useCallback(async () => {
    if (!user) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/menus/${menuDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const menus = await response.json();
        const mMorning = menus.find(
          (m) =>
            (m.ownerId?._id === user._id || m.ownerId === user._id) &&
            m.shift === 'morning'
        );
        const mNight = menus.find(
          (m) =>
            (m.ownerId?._id === user._id || m.ownerId === user._id) &&
            m.shift === 'night'
        );
        setMorningMenu(mMorning || null);
        setNightMenu(mNight || null);
      }
    } catch (e) {
      console.error('Failed to fetch menus', e);
    }
  }, [menuDate, user]);

  useEffect(() => {
    fetchDayMenus();
  }, [fetchDayMenus]);

  // 3. Fetch background stats, history, members, notifications, stories
  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(
          `${API_URL}/api/attendance/stats/${encodeURIComponent(user.messName || 'Partner Mess')}/${menuDate}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setStats(data);
          if (data.rationConfig) setCustomRationConfig(data.rationConfig);
        }

        const notifRes = await fetch(`${API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (notifRes.ok) {
          const notifs = await notifRes.json();
          setNotifications(notifs);
          setUnreadNotifsCount(notifs.filter((n) => !n.isRead).length);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const fetchHistory = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(
          `${API_URL}/api/attendance/history/${encodeURIComponent(user.messName || 'Partner Mess')}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) setHistoryData(await response.json());
      } catch (e) {
        console.error(e);
      }
    };

    const fetchMembers = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_URL}/api/subscriptions/mess`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setMembers(await res.json());
      } catch (e) {
        console.error('Failed to fetch members', e);
      }
    };

    fetchStats();
    fetchHistory();
    fetchMembers();
    fetchMyStories();

    const socket = getSocket();
    const onAttendanceUpdated = (data) => {
      if (!data?.messName || data.messName === user.messName) {
        fetchStats();
        fetchHistory();
      }
    };
    const onAttendanceConsumed = () => {
      fetchStats();
      fetchHistory();
    };
    const onSubscriptionUpdated = (data) => {
      if (!data?.messId || data.messId === user._id) {
        fetchMembers();
      }
    };
    const onNotificationNew = (data) => {
      if (!user) return;
      if (!data?.userIds || data.userIds.includes(user._id)) {
        setUnreadNotifsCount((prev) => prev + 1);
        const token = localStorage.getItem('token');
        if (token) {
          fetch(`${API_URL}/api/notifications`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((notifs) => {
              if (notifs) {
                setNotifications(notifs);
                setUnreadNotifsCount(notifs.filter((n) => !n.isRead).length);
              }
            });
        }
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
  }, [menuDate, user, fetchMyStories]);

  const handleOpenNotifications = async () => {
    setActiveSection('notifications');
    setUnreadNotifsCount(0);
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      // ignore
    }
  };

  const handleSaveUpi = async (e) => {
    e.preventDefault();
    if (!upiId.trim()) return;
    setIsSavingUpi(true);
    setUpiMsg('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/owner/upi`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ upiId: upiId.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setUpiMsg('✅ UPI ID saved successfully!');
        setUser((prev) => ({ ...prev, upiId: upiId.trim() }));
      } else {
        setUpiMsg(`❌ ${data.error || 'Failed to save UPI ID'}`);
      }
    } catch {
      setUpiMsg('❌ Network error saving UPI ID');
    } finally {
      setIsSavingUpi(false);
    }
  };

  const handleSaveRationConfig = async (e) => {
    e.preventDefault();
    setIsSavingRation(true);
    setRationMsg('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/owner/ration-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(customRationConfig)
      });
      const data = await res.json();
      if (res.ok) {
        setRationMsg('✅ Ration norms updated successfully!');
        setUser((prev) => ({ ...prev, rationConfig: customRationConfig }));
        forceStatsRefresh();
      } else {
        setRationMsg(`❌ ${data.error || 'Failed to update norms'}`);
      }
    } catch {
      setRationMsg('❌ Network error updating ration norms');
    } finally {
      setIsSavingRation(false);
    }
  };

  const handleVerifyQr = async (e) => {
    if (e) e.preventDefault();
    if (!qrTokenInput.trim() || isVerifyingQr) return;
    setIsVerifyingQr(true);
    setVerifyResult(null);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/attendance/verify-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ qrToken: qrTokenInput.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setVerifyResult({
          type: 'success',
          message: `Meal Verified for ${data.shift.toUpperCase()} Shift!`,
          studentName: data.studentName
        });
        setQrTokenInput('');
        forceStatsRefresh();
      } else {
        setVerifyResult({
          type: 'error',
          message: data.error || 'Failed to verify meal pass.'
        });
      }
    } catch {
      setVerifyResult({
        type: 'error',
        message: 'Network error connecting to verification server.'
      });
    } finally {
      setIsVerifyingQr(false);
    }
  };

  const handleConfirmCutoff = async ({ morningCutoff: newMorning, nightCutoff: newNight }) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/owner/cutoff`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ morningCutoff: newMorning, nightCutoff: newNight })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update cut-off times.');
    }
    setMorningCutoff(newMorning);
    setNightCutoff(newNight);
    setUser((prev) => ({ ...prev, morningCutoff: newMorning, nightCutoff: newNight }));
  };

  const forceMembersRefresh = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/mess`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setMembers(await res.json());
    } catch (e) {
      console.error('Failed to fetch members', e);
    }
  };

  const updateSubscription = async (subId, payload) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/${subId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) forceMembersRefresh();
    } catch (e) {
      console.error('Failed to update subscription', e);
    }
  };

  const togglePaymentStatus = (subId, currentStatus) => {
    if (currentStatus === 'paid') return;
    updateSubscription(subId, { status: 'paid' });
  };

  const handleSetFee = (subId, currentFee) => {
    const fee = window.prompt('Enter the custom monthly fee (₹) for this student:', currentFee || 0);
    if (fee !== null && !isNaN(fee)) updateSubscription(subId, { monthlyFee: Number(fee) });
  };

  const handleExtendDays = (subId) => {
    const days = window.prompt('How many days should be added to extend this membership?');
    if (days !== null && !isNaN(days)) updateSubscription(subId, { extendDays: Number(days) });
  };

  const handleEditSkips = (subId, currentSkips) => {
    const skips = window.prompt('Set the MAXIMUM number of skips allowed for this student:', currentSkips || 5);
    if (skips !== null && !isNaN(skips)) updateSubscription(subId, { allowedSkips: Number(skips) });
  };

  const forceStatsRefresh = async () => {
    const token = localStorage.getItem('token');
    try {
      const statsRes = await fetch(
        `${API_URL}/api/attendance/stats/${encodeURIComponent(user.messName || 'Partner Mess')}/${menuDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (statsRes.ok) setStats(await statsRes.json());
      const histRes = await fetch(
        `${API_URL}/api/attendance/history/${encodeURIComponent(user.messName || 'Partner Mess')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (histRes.ok) setHistoryData(await histRes.json());
      forceMembersRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveMenuDirect = async ({ date, shift, items, price }) => {
    setIsPublishing(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/menus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          messName: user?.messName || `${user?.name || 'Owner'}'s Mess`,
          date,
          shift,
          items,
          price: Number(price)
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Server rejected the menu');
      }

      await fetchDayMenus();

      // Automatically open the Cut-off popup for the meal just saved
      setCutoffPopupShift(shift || 'morning');
      setIsCutoffPopupOpen(true);

      return true;
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  // --- RENDER GUARDS ---
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  if (!user || user.role !== 'owner') {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-slate-900">
        <p className="text-white font-semibold text-lg">Session Expired</p>
        <button
          onClick={() => navigate('/')}
          className="text-orange-400 font-medium text-base underline cursor-pointer h-11 min-h-[44px] px-4 flex items-center"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pb-12 selection:bg-orange-500 selection:text-white">
      {/* 1. TOP NAVBAR WITH 3 QUICK-ACCESS ICONS */}
      <OwnerNavbar
        user={user}
        t={t}
        lang={lang}
        setLang={setLang}
        unreadNotifsCount={unreadNotifsCount}
        myActiveStoriesCount={myActiveStories.length}
        notifications={notifications}
        onOpenNotifications={handleOpenNotifications}
        onOpenQr={() => {
          setVerifyResult(null);
          setActiveSection('qr');
        }}
        onOpenStories={() => {
          setStoryMsg('');
          setActiveSection('stories');
        }}
        onLogout={handleLogout}
      />

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* HOME VIEW: MENU HERO CARD + 4 SECTION TILES + COMBINED HEADCOUNT & REVIEWS */}
        <OwnerHome
          user={user}
          t={t}
          menuDate={menuDate}
          setMenuDate={setMenuDate}
          getLocalDateString={getLocalDateString}
          displayDate={displayDate}
          morningMenu={morningMenu}
          nightMenu={nightMenu}
          analyticsShift={analyticsShift}
          setAnalyticsShift={setAnalyticsShift}
          stats={stats}
          forceStatsRefresh={forceStatsRefresh}
          historyData={historyData}
          members={members}
          morningCutoff={morningCutoff}
          nightCutoff={nightCutoff}
          savedLocation={savedLocation}
          onSaveMenu={handleSaveMenuDirect}
          isPublishing={isPublishing}
          onOpenSection={(section) => setActiveSection(section)}
        />

        {/* SECTION PANELS (Modal on Desktop, Bottom Sheet on Mobile) */}
        {/* A. QR Scanner Panel (from Navbar Quick-Action) */}
        <SectionPanel
          isOpen={activeSection === 'qr'}
          onClose={() => setActiveSection(null)}
          title={t.qrScannerTile || 'Verify Student Meal Pass'}
          subtitle="Counter QR Verification"
          icon={QrCode}
          color="emerald"
          maxWidth="max-w-lg"
        >
          <QrScannerPanel
            qrTokenInput={qrTokenInput}
            setQrTokenInput={setQrTokenInput}
            isVerifyingQr={isVerifyingQr}
            verifyResult={verifyResult}
            handleVerifyQr={handleVerifyQr}
          />
        </SectionPanel>

        {/* C. Live Stories Panel (from Navbar Quick-Action) */}
        <SectionPanel
          isOpen={activeSection === 'stories'}
          onClose={() => setActiveSection(null)}
          title={t.liveStoriesTile || '24H Live Campus Stories'}
          subtitle="Kitchen & Food Live Announcements"
          icon={Radio}
          color="rose"
          maxWidth="max-w-lg"
        >
          <LiveStoriesPanel
            storyImage={storyImage}
            setStoryImage={setStoryImage}
            storyCaption={storyCaption}
            setStoryCaption={setStoryCaption}
            isPostingStory={isPostingStory}
            storyMsg={storyMsg}
            myActiveStories={myActiveStories}
            isDeletingStory={isDeletingStory}
            handleImageUpload={handleImageUpload}
            handlePostStory={handlePostStory}
            handleDeleteStory={handleDeleteStory}
          />
        </SectionPanel>

        {/* D. Notifications Panel (from Navbar Quick-Action) */}
        <SectionPanel
          isOpen={activeSection === 'notifications'}
          onClose={() => setActiveSection(null)}
          title={t.notificationsTile || 'Notifications'}
          subtitle="Mess Alerts & Student Activities"
          icon={Bell}
          color="amber"
          maxWidth="max-w-lg"
        >
          <NotificationsPanel notifications={notifications} />
        </SectionPanel>

        {/* E. Subscribers Directory Panel (from Grid Tile) */}
        <SectionPanel
          isOpen={activeSection === 'subscribers'}
          onClose={() => setActiveSection(null)}
          title={t.subscribersTile || 'Monthly Members Directory'}
          subtitle={`Total Registered: ${members.length}`}
          icon={Users}
          color="violet"
          maxWidth="max-w-5xl"
        >
          <SubscribersPanel
            members={members}
            handleExtendDays={handleExtendDays}
            handleEditSkips={handleEditSkips}
            handleSetFee={handleSetFee}
            updateSubscription={updateSubscription}
            togglePaymentStatus={togglePaymentStatus}
          />
        </SectionPanel>

        {/* F. UPI & Payments Panel (from Grid Tile) */}
        <SectionPanel
          isOpen={activeSection === 'upi'}
          onClose={() => setActiveSection(null)}
          title={t.upiPaymentsTile || 'Payments & UPI Verification'}
          subtitle={t.upiPaymentsDesc || 'Manage QR ID & Verify Pending UTRs'}
          icon={IndianRupee}
          color="emerald"
          maxWidth="max-w-2xl"
        >
          <MessSettingsPanel
            t={t}
            mode="upi"
            morningCutoff={morningCutoff}
            nightCutoff={nightCutoff}
            upiId={upiId}
            setUpiId={setUpiId}
            isSavingUpi={isSavingUpi}
            upiMsg={upiMsg}
            handleSaveUpi={handleSaveUpi}
            members={members}
            updateSubscription={updateSubscription}
            savedLocation={savedLocation}
            setSavedLocation={setSavedLocation}
            isSettingLocation={isSettingLocation}
            setIsSettingLocation={setIsSettingLocation}
            locationMsg={locationMsg}
            setLocationMsg={setLocationMsg}
          />
        </SectionPanel>

        {/* G. Ration Norms Panel (from Grid Tile) */}
        <SectionPanel
          isOpen={activeSection === 'ration'}
          onClose={() => setActiveSection(null)}
          title={t.rationEstimatorTile || 'Kitchen Ration Estimator'}
          subtitle={`Raw ingredients calculator & custom norms (${analyticsShift})`}
          icon={Scale}
          color="amber"
          maxWidth="max-w-3xl"
        >
          <RationEstimatorPanel
            analyticsShift={analyticsShift}
            setAnalyticsShift={setAnalyticsShift}
            currentStats={stats[analyticsShift] || { coming: 0, notComing: 0, consumed: 0 }}
            customRationConfig={customRationConfig}
            setCustomRationConfig={setCustomRationConfig}
            isSavingRation={isSavingRation}
            rationMsg={rationMsg}
            handleSaveRationConfig={handleSaveRationConfig}
          />
        </SectionPanel>

        {/* H. Mess Settings Panel (Location & GPS - from Grid Tile) */}
        <SectionPanel
          isOpen={activeSection === 'mess_settings'}
          onClose={() => setActiveSection(null)}
          title={t.messSettingsTile || 'Mess Settings'}
          subtitle={t.messSettingsDesc || 'Location, GPS & mess operations'}
          icon={Settings2}
          color="orange"
          maxWidth="max-w-2xl"
        >
          <MessSettingsPanel
            t={t}
            mode="mess_settings"
            morningCutoff={morningCutoff}
            nightCutoff={nightCutoff}
            upiId={upiId}
            setUpiId={setUpiId}
            isSavingUpi={isSavingUpi}
            upiMsg={upiMsg}
            handleSaveUpi={handleSaveUpi}
            members={members}
            updateSubscription={updateSubscription}
            savedLocation={savedLocation}
            setSavedLocation={setSavedLocation}
            isSettingLocation={isSettingLocation}
            setIsSettingLocation={setIsSettingLocation}
            locationMsg={locationMsg}
            setLocationMsg={setLocationMsg}
          />
        </SectionPanel>

        {/* CUT-OFF TIME POPUP (Opens automatically right after saving menu) */}
        <CutoffPopup
          isOpen={isCutoffPopupOpen}
          onClose={() => setIsCutoffPopupOpen(false)}
          shift={cutoffPopupShift}
          initialMorningCutoff={morningCutoff}
          initialNightCutoff={nightCutoff}
          onConfirm={handleConfirmCutoff}
          t={t}
        />
      </main>
    </div>
  );
};

export default OwnerDashboard;