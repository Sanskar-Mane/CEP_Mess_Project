import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  TextInput,
  SafeAreaView,
  Platform,
  StatusBar,
  RefreshControl,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { API_URL } from '@/constants/config';

interface UserItem {
  _id: string;
  name: string;
  phone: string;
  role: 'student' | 'owner' | 'admin';
  messName?: string;
  messAddress?: string;
  fssaiNumber?: string;
  isVerified?: boolean;
}

interface DirectoryItem {
  _id: string;
  category: 'rickshaws' | 'rooms' | 'emergency';
  name: string;
  phone: string;
  area?: string;
  tag?: string;
  rentPerMonth?: number;
  vacancies?: number;
  genderPreference?: 'boys' | 'girls' | 'any';
  amenities?: string[];
  isAvailable?: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'directory'>('pending');

  const [users, setUsers] = useState<UserItem[]>([]);
  const [directory, setDirectory] = useState<DirectoryItem[]>([]);

  // Directory Form State
  const [dirCategory, setDirCategory] = useState<'rickshaws' | 'rooms' | 'emergency'>('rickshaws');
  const [dirName, setDirName] = useState('');
  const [dirPhone, setDirPhone] = useState('');
  const [dirArea, setDirArea] = useState('');
  const [dirRent, setDirRent] = useState('');
  const [dirVacancies, setDirVacancies] = useState('1');
  const [dirGender, setDirGender] = useState<'boys' | 'girls' | 'any'>('any');
  const [dirAmenities, setDirAmenities] = useState('WiFi, RO Water, Bed');
  const [isSubmittingDir, setIsSubmittingDir] = useState(false);

  // Check auth and role
  const checkAdminAuth = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return false;
      }
      const res = await fetch(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const userData = await res.json();
        if (userData.role !== 'admin') {
          Alert.alert('Unauthorized', 'Admin privileges required.');
          router.replace('/');
          return false;
        }
        return true;
      } else {
        router.replace('/');
        return false;
      }
    } catch {
      router.replace('/');
      return false;
    }
  }, [router]);

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchDirectory = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/directory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDirectory(data);
      }
    } catch (err) {
      console.error('Failed to fetch directory:', err);
    }
  };

  const loadData = useCallback(async () => {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) return;
    await Promise.all([fetchUsers(), fetchDirectory()]);
    setIsLoading(false);
  }, [checkAdminAuth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchUsers(), fetchDirectory()]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('token');
          router.replace('/');
        },
      },
    ]);
  };

  const verifyOwner = async (id: string, name: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/verify/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        Alert.alert('Approved', `${name} has been verified successfully.`);
        fetchUsers();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to verify owner.');
      }
    } catch {
      Alert.alert('Error', 'Network request failed.');
    }
  };

  const deleteUser = (id: string, name: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                Alert.alert('Success', 'User deleted.');
                fetchUsers();
              } else {
                const err = await res.json();
                Alert.alert('Error', err.error || 'Failed to delete user.');
              }
            } catch {
              Alert.alert('Error', 'Network error while deleting user.');
            }
          },
        },
      ]
    );
  };

  const handleAddDirectory = async () => {
    if (!dirName.trim()) {
      Alert.alert('Missing Field', 'Please enter a service name.');
      return;
    }
    if (!dirPhone.trim()) {
      Alert.alert('Missing Field', 'Please enter a phone number.');
      return;
    }

    setIsSubmittingDir(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/directory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: dirCategory,
          name: dirName.trim(),
          phone: dirPhone.trim(),
          area: dirArea.trim(),
          rentPerMonth: dirCategory === 'rooms' && dirRent ? Number(dirRent) : undefined,
          vacancies: dirCategory === 'rooms' && dirVacancies ? Number(dirVacancies) : undefined,
          genderPreference: dirCategory === 'rooms' ? dirGender : undefined,
          amenities: dirCategory === 'rooms' ? dirAmenities.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        }),
      });

      if (res.ok) {
        Alert.alert('Success', 'Directory service added successfully.');
        setDirName('');
        setDirPhone('');
        setDirArea('');
        setDirRent('');
        setDirVacancies('1');
        fetchDirectory();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to add directory item.');
      }
    } catch {
      Alert.alert('Error', 'Network request failed.');
    } finally {
      setIsSubmittingDir(false);
    }
  };

  const updateDirectoryItem = async (id: string, updates: Partial<DirectoryItem>) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/directory/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        fetchDirectory();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to update directory item');
      }
    } catch {
      Alert.alert('Error', 'Network error updating directory item');
    }
  };

  const deleteDirectoryItem = (id: string, name: string) => {
    Alert.alert('Delete Service', `Delete "${name}" from directory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/admin/directory/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              fetchDirectory();
            } else {
              Alert.alert('Error', 'Failed to delete service.');
            }
          } catch {
            Alert.alert('Error', 'Network error.');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading Admin Panel...</Text>
      </View>
    );
  }

  const pendingOwners = users.filter((u) => u.role === 'owner' && !u.isVerified);
  const regularUsers = users.filter((u) => u.role !== 'admin');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.shieldIconContainer}>
            <Feather name="shield" size={22} color="#fb923c" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSubtitle}>Avasari Connect Control</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={16} color="#f87171" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pending' && styles.tabButtonActiveOrange]}
          onPress={() => setActiveTab('pending')}
        >
          <Feather
            name="clock"
            size={16}
            color={activeTab === 'pending' ? '#ffffff' : '#64748b'}
          />
          <Text
            style={[styles.tabButtonText, activeTab === 'pending' && styles.tabButtonTextActive]}
          >
            Pending
          </Text>
          {pendingOwners.length > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{pendingOwners.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'users' && styles.tabButtonActiveDark]}
          onPress={() => setActiveTab('users')}
        >
          <Feather
            name="users"
            size={16}
            color={activeTab === 'users' ? '#ffffff' : '#64748b'}
          />
          <Text
            style={[styles.tabButtonText, activeTab === 'users' && styles.tabButtonTextActive]}
          >
            Users ({regularUsers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'directory' && styles.tabButtonActiveIndigo]}
          onPress={() => setActiveTab('directory')}
        >
          <Feather
            name="book-open"
            size={16}
            color={activeTab === 'directory' ? '#ffffff' : '#64748b'}
          />
          <Text
            style={[styles.tabButtonText, activeTab === 'directory' && styles.tabButtonTextActive]}
          >
            Directory
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f97316']} />}
      >
        {/* --- TAB 1: PENDING APPROVALS --- */}
        {activeTab === 'pending' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Messes Awaiting FSSAI Verification</Text>
              <Text style={styles.sectionSubtitle}>
                Review credentials before making mess listings public to students.
              </Text>
            </View>

            {pendingOwners.length === 0 ? (
              <View style={styles.emptyCard}>
                <Feather name="check-circle" size={42} color="#10b981" />
                <Text style={styles.emptyTitle}>All Clear!</Text>
                <Text style={styles.emptySubtitle}>No pending mess verifications at this time.</Text>
              </View>
            ) : (
              pendingOwners.map((owner) => (
                <View key={owner._id} style={styles.card}>
                  <View style={styles.ownerHeader}>
                    <Text style={styles.ownerMessName}>{owner.messName || 'Unnamed Mess'}</Text>
                    <View style={styles.unverifiedBadge}>
                      <Text style={styles.unverifiedBadgeText}>Pending</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Feather name="user" size={14} color="#64748b" />
                    <Text style={styles.metaText}>Owner: {owner.name}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Feather name="phone" size={14} color="#64748b" />
                    <Text style={styles.metaText}>{owner.phone}</Text>
                  </View>
                  <View style={styles.fssaiRow}>
                    <Text style={styles.fssaiLabel}>FSSAI License:</Text>
                    <Text style={styles.fssaiValue}>{owner.fssaiNumber || 'Not Provided'}</Text>
                  </View>
                  {owner.messAddress && (
                    <Text style={styles.addressText}>Address: {owner.messAddress}</Text>
                  )}

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => verifyOwner(owner._id, owner.messName || owner.name)}
                    >
                      <Feather name="check" size={16} color="#ffffff" />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => deleteUser(owner._id, owner.messName || owner.name)}
                    >
                      <Feather name="trash-2" size={16} color="#e11d48" />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* --- TAB 2: USER ACCOUNTS --- */}
        {activeTab === 'users' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Registered Accounts</Text>
              <Text style={styles.sectionSubtitle}>
                Total active accounts registered on the platform ({regularUsers.length}).
              </Text>
            </View>

            {regularUsers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Feather name="users" size={42} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No users found</Text>
              </View>
            ) : (
              regularUsers.map((user) => (
                <View key={user._id} style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <View style={styles.userTitleRow}>
                      <Text style={styles.userName}>
                        {user.role === 'owner' ? user.messName || user.name : user.name}
                      </Text>
                      <View
                        style={[
                          styles.roleBadge,
                          user.role === 'owner' ? styles.ownerBadge : styles.studentBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleBadgeText,
                            user.role === 'owner' ? styles.ownerBadgeText : styles.studentBadgeText,
                          ]}
                        >
                          {user.role}
                        </Text>
                      </View>
                    </View>
                    {user.role === 'owner' && (
                      <Text style={styles.userSubName}>Owner: {user.name}</Text>
                    )}
                    <View style={styles.metaRow}>
                      <Feather name="phone" size={13} color="#64748b" />
                      <Text style={styles.metaText}>{user.phone}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteUserBtn}
                    onPress={() => deleteUser(user._id, user.name)}
                  >
                    <Feather name="trash-2" size={18} color="#f43f5e" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* --- TAB 3: SERVICE DIRECTORY --- */}
        {activeTab === 'directory' && (
          <View>
            {/* Add Service Card */}
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Feather name="plus-circle" size={18} color="#4f46e5" />
                <Text style={styles.formTitle}>Add New Service</Text>
              </View>

              {/* Category Selector */}
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryPickerRow}>
                {(['rickshaws', 'rooms', 'emergency'] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOption,
                      dirCategory === cat && styles.categoryOptionActive,
                    ]}
                    onPress={() => setDirCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        dirCategory === cat && styles.categoryOptionTextActive,
                      ]}
                    >
                      {cat === 'rickshaws' ? 'Rickshaw' : cat === 'rooms' ? 'Rooms/PG' : 'Emergency'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Service Name / Contact</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Ramesh Auto / Om Sai PG"
                placeholderTextColor="#94a3b8"
                value={dirName}
                onChangeText={setDirName}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={dirPhone}
                onChangeText={setDirPhone}
              />

              <Text style={styles.inputLabel}>Area / Details</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. College Stand / Near Gate 2"
                placeholderTextColor="#94a3b8"
                value={dirArea}
                onChangeText={setDirArea}
              />

              {dirCategory === 'rooms' && (
                <>
                  <Text style={styles.inputLabel}>Monthly Rent ({'\u20B9'}/student)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2500"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={dirRent}
                    onChangeText={setDirRent}
                  />

                  <Text style={styles.inputLabel}>Vacancies</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={dirVacancies}
                    onChangeText={setDirVacancies}
                  />

                  <Text style={styles.inputLabel}>Gender Preference</Text>
                  <View style={styles.categoryPickerRow}>
                    {(['boys', 'girls', 'any'] as const).map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.categoryOption,
                          dirGender === g && styles.categoryOptionActive,
                        ]}
                        onPress={() => setDirGender(g)}
                      >
                        <Text
                          style={[
                            styles.categoryOptionText,
                            dirGender === g && styles.categoryOptionTextActive,
                          ]}
                        >
                          {g === 'boys' ? 'Boys' : g === 'girls' ? 'Girls' : 'Any'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Amenities (comma-separated)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. WiFi, Hot Water, Bed, Study Table"
                    placeholderTextColor="#94a3b8"
                    value={dirAmenities}
                    onChangeText={setDirAmenities}
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.submitBtn, isSubmittingDir && styles.submitBtnDisabled]}
                disabled={isSubmittingDir}
                onPress={handleAddDirectory}
              >
                {isSubmittingDir ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Feather name="plus" size={18} color="#ffffff" />
                    <Text style={styles.submitBtnText}>Add to Directory</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Existing Services List */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Directory Entries ({directory.length})</Text>
            </View>

            {directory.length === 0 ? (
              <View style={styles.emptyCard}>
                <Feather name="book-open" size={42} color="#94a3b8" />
                <Text style={styles.emptyTitle}>Directory is empty</Text>
                <Text style={styles.emptySubtitle}>Use the form above to add campus services.</Text>
              </View>
            ) : (
              directory.map((item) => (
                <View key={item._id} style={styles.dirCard}>
                  <View style={styles.dirContent}>
                    <View style={styles.dirBadgeRow}>
                      <View
                        style={[
                          styles.dirCatBadge,
                          item.category === 'emergency'
                            ? styles.catBadgeEmergency
                            : item.category === 'rooms'
                            ? styles.catBadgeRooms
                            : styles.catBadgeRickshaw,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dirCatText,
                            item.category === 'emergency'
                              ? styles.catTextEmergency
                              : item.category === 'rooms'
                              ? styles.catTextRooms
                              : styles.catTextRickshaw,
                          ]}
                        >
                          {item.category.toUpperCase()}
                        </Text>
                      </View>

                      {item.category === 'rooms' && item.isAvailable === false && (
                        <View style={styles.unlistedBadge}>
                          <Text style={styles.unlistedBadgeText}>Unlisted</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.dirName}>{item.name}</Text>
                    <TouchableOpacity
                      style={styles.phoneClickable}
                      onPress={() => Linking.openURL(`tel:${item.phone}`)}
                    >
                      <Feather name="phone" size={13} color="#2563eb" />
                      <Text style={styles.dirPhone}>{item.phone}</Text>
                    </TouchableOpacity>
                    {item.area ? <Text style={styles.dirArea}>{item.area}</Text> : null}

                    {item.category === 'rooms' && (
                      <View style={styles.roomDetailsBox}>
                        <View style={styles.roomMetaRow}>
                          {item.rentPerMonth ? (
                            <View style={styles.rentPill}>
                              <Text style={styles.rentPillText}>{'\u20B9'}{item.rentPerMonth}/mo</Text>
                            </View>
                          ) : null}
                          <View
                            style={[
                              styles.vacancyPill,
                              (item.vacancies ?? 0) === 0 ? styles.vacancyPillFull : styles.vacancyPillAvailable,
                            ]}
                          >
                            <Text
                              style={[
                                styles.vacancyPillText,
                                (item.vacancies ?? 0) === 0 ? styles.vacancyTextFull : styles.vacancyTextAvailable,
                              ]}
                            >
                              {(item.vacancies ?? 0) > 0 ? `${item.vacancies} Beds Open` : 'Full'}
                            </Text>
                          </View>
                          {item.genderPreference && (
                            <View style={styles.genderPill}>
                              <Text style={styles.genderPillText}>
                                {item.genderPreference === 'boys' ? 'Boys' : item.genderPreference === 'girls' ? 'Girls' : 'Any'}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Quick Vacancy & Availability Controls */}
                        <View style={styles.quickControlsRow}>
                          <View style={styles.counterGroup}>
                            <Text style={styles.quickLabel}>Vacancies:</Text>
                            <TouchableOpacity
                              style={styles.counterBtn}
                              onPress={() => updateDirectoryItem(item._id, { vacancies: Math.max(0, (item.vacancies ?? 0) - 1) })}
                            >
                              <Text style={styles.counterBtnText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.counterVal}>{item.vacancies ?? 0}</Text>
                            <TouchableOpacity
                              style={styles.counterBtn}
                              onPress={() => updateDirectoryItem(item._id, { vacancies: (item.vacancies ?? 0) + 1 })}
                            >
                              <Text style={styles.counterBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.toggleListingBtn,
                              item.isAvailable !== false ? styles.toggleBtnActive : styles.toggleBtnInactive,
                            ]}
                            onPress={() => updateDirectoryItem(item._id, { isAvailable: item.isAvailable === false ? true : false })}
                          >
                            <Text style={styles.toggleBtnText}>
                              {item.isAvailable !== false ? 'Active' : 'Show'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {item.amenities && item.amenities.length > 0 && (
                          <View style={styles.amenityChipsRow}>
                            {item.amenities.map((a, aIdx) => (
                              <View key={aIdx} style={styles.amenityChip}>
                                <Text style={styles.amenityChipText}>{a}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.deleteDirBtn}
                    onPress={() => deleteDirectoryItem(item._id, item.name)}
                  >
                    <Feather name="trash-2" size={17} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 36 : 10,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shieldIconContainer: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f87171',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 6,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabButtonActiveOrange: {
    backgroundColor: '#f97316',
  },
  tabButtonActiveDark: {
    backgroundColor: '#334155',
  },
  tabButtonActiveIndigo: {
    backgroundColor: '#4f46e5',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  badgeCount: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#f97316',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '100%',
    marginTop: 10,
  },
  sectionHeader: {
    marginBottom: 14,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  ownerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ownerMessName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  unverifiedBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  unverifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  fssaiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  fssaiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  fssaiValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  addressText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#ffe4e6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  rejectBtnText: {
    color: '#e11d48',
    fontSize: 13,
    fontWeight: '800',
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flex: 1,
  },
  userTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  userSubName: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  ownerBadge: {
    backgroundColor: '#ffedd5',
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c2410c',
    textTransform: 'uppercase',
  },
  studentBadge: {
    backgroundColor: '#e0e7ff',
  },
  studentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338ca',
    textTransform: 'uppercase',
  },
  deleteUserBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff1f2',
  },
  formCard: {
    backgroundColor: '#f5f7ff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#312e81',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  categoryOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  categoryOptionActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  categoryOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  categoryOptionTextActive: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
  },
  submitBtn: {
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 14,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  dirCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dirContent: {
    flex: 1,
  },
  dirCatBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  catBadgeEmergency: {
    backgroundColor: '#ffe4e6',
  },
  catTextEmergency: {
    color: '#e11d48',
    fontSize: 9,
    fontWeight: '800',
  },
  catBadgeRooms: {
    backgroundColor: '#dcfce7',
  },
  catTextRooms: {
    color: '#15803d',
    fontSize: 9,
    fontWeight: '800',
  },
  catBadgeRickshaw: {
    backgroundColor: '#e0f2fe',
  },
  catTextRickshaw: {
    color: '#0369a1',
    fontSize: 9,
    fontWeight: '800',
  },
  dirCatText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dirName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  phoneClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  dirPhone: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '700',
  },
  dirArea: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  deleteDirBtn: {
    padding: 8,
  },
  dirBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  unlistedBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  unlistedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  roomDetailsBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  roomMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  rentPill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  rentPillText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  vacancyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  vacancyPillAvailable: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  vacancyPillFull: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  vacancyPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  vacancyTextAvailable: {
    color: '#2563eb',
  },
  vacancyTextFull: {
    color: '#dc2626',
  },
  genderPill: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  genderPillText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  quickControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  counterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  counterBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 16,
  },
  counterVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 16,
    textAlign: 'center',
  },
  toggleListingBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  toggleBtnInactive: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  amenityChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  amenityChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  amenityChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
});
