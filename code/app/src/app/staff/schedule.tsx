import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { agencyStaffService, StaffShiftItem } from '@/services/agency-staff.service';
import { staffProfileService } from '@/services/staff-profile.service';
import { muaCalendarService } from '@/services/mua-calendar.service';
import { getTodayVN } from '@/utils/date';
import { AppBottomNavBar } from '@/components/common/AppBottomNavBar';

const DAY_NAMES: Record<number, string> = {
  1: 'Chủ Nhật',
  2: 'Thứ Hai',
  3: 'Thứ Ba',
  4: 'Thứ Tư',
  5: 'Thứ Năm',
  6: 'Thứ Sáu',
  7: 'Thứ Bảy',
};

export default function StaffScheduleScreen() {
  const [activeTab, setActiveTab] = useState<'SHIFTS' | 'BUSY'>('SHIFTS');
  const [shifts, setShifts] = useState<StaffShiftItem[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [staffName, setStaffName] = useState<string>('');
  const [agencyName, setAgencyName] = useState<string>('');

  // Form khóa lịch bận cá nhân
  const [busyDate, setBusyDate] = useState(getTodayVN());
  const [busyStartTime, setBusyStartTime] = useState('08:00');
  const [busyEndTime, setBusyEndTime] = useState('11:00');
  const [busyReason, setBusyReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);

  const loadStaffData = useCallback(async () => {
    try {
      setIsLoadingShifts(true);
      const profile = await staffProfileService.getMyStaffProfile();
      if (profile) {
        setStaffName(profile.fullName);
        setAgencyName(profile.agencyName);
        const shiftList = await agencyStaffService.getMyStaffShifts(profile.id);
        setShifts(shiftList);
      }
    } catch {
      // Đơn vị chưa có profile hoặc lỗi mạng
    } finally {
      setIsLoadingShifts(false);
    }
  }, []);

  useEffect(() => {
    loadStaffData();
  }, [loadStaffData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStaffData();
    setRefreshing(false);
  };

  const handleBlockPersonalSlot = async () => {
    if (!busyDate || !busyStartTime || !busyEndTime) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập ngày và khung giờ cần khóa.');
      return;
    }

    try {
      setIsBlocking(true);
      await muaCalendarService.blockPersonalSlot({
        booking_date: busyDate,
        start_time: busyStartTime.length === 5 ? `${busyStartTime}:00` : busyStartTime,
        end_time: busyEndTime.length === 5 ? `${busyEndTime}:00` : busyEndTime,
        reason: busyReason.trim() || 'Bận việc cá nhân',
      });

      Alert.alert('Thành công', 'Đã khóa khung giờ bận cá nhân. Studio sẽ không gán đơn vào giờ này.');
      setBusyReason('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể khóa khung giờ.';
      Alert.alert('Lỗi khóa giờ', msg);
    } finally {
      setIsBlocking(false);
    }
  };

  // Nhóm ca làm theo ngày trong tuần (2 đến 7, sau đó là 1 CN)
  const groupedShifts = [2, 3, 4, 5, 6, 7, 1].map((day) => ({
    dayOfWeek: day,
    dayName: DAY_NAMES[day],
    items: shifts.filter((s) => s.dayOfWeek === day && s.isActive),
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back-outline" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle}>Lịch Trực & Lịch Bận</Text>
          {agencyName ? (
            <Text style={styles.navSubtitle} numberOfLines={1}>
              {agencyName} {staffName ? `• ${staffName}` : ''}
            </Text>
          ) : null}
        </View>
        <View style={{ width: 22 }} />
      </View>

      {/* Segmented Control */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'SHIFTS' && styles.tabItemActive]}
          onPress={() => setActiveTab('SHIFTS')}
        >
          <Text style={[styles.tabText, activeTab === 'SHIFTS' && styles.tabTextActive]}>
            Ca Trực Studio
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'BUSY' && styles.tabItemActive]}
          onPress={() => setActiveTab('BUSY')}
        >
          <Text style={[styles.tabText, activeTab === 'BUSY' && styles.tabTextActive]}>
            Khóa Giờ Bận
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'SHIFTS' ? (
          /* ========================================================================= */
          /* TAB 1: CA TRỰC STUDIO CỦA NHÂN VIÊN                                        */
          /* ========================================================================= */
          <>
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>Thời Khóa Biểu Tuần</Text>
              <Text style={styles.introSubtitle}>
                Các ca làm việc cố định do Studio xếp. Khách hàng đặt hẹn sẽ được ưu tiên điều phối cho bạn trong các ca này.
              </Text>
            </View>

            {isLoadingShifts ? (
              <ActivityIndicator size="small" color="#0F172A" style={{ marginTop: 30 }} />
            ) : shifts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Chưa có ca làm việc</Text>
                <Text style={styles.emptyText}>
                  Studio chưa xếp ca trực cố định cho bạn trong tuần này.
                </Text>
              </View>
            ) : (
              groupedShifts.map((group) => (
                <View key={group.dayOfWeek} style={styles.dayGroup}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayName}>{group.dayName}</Text>
                    <Text style={styles.dayCount}>
                      {group.items.length > 0 ? `${group.items.length} ca trực` : 'Nghỉ'}
                    </Text>
                  </View>

                  {group.items.length > 0 ? (
                    group.items.map((shift) => (
                      <View key={shift.id} style={styles.shiftCard}>
                        <View style={styles.shiftHeader}>
                          <Text style={styles.shiftName}>{shift.shiftName}</Text>
                          <Text style={styles.shiftRecurring}>
                            {shift.isRecurring ? 'Hàng tuần' : 'Ca đột xuất'}
                          </Text>
                        </View>
                        <Text style={styles.shiftTime}>
                          {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.offDayCard}>
                      <Text style={styles.offDayText}>Không có ca phân công</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        ) : (
          /* ========================================================================= */
          /* TAB 2: KHÓA KHUNG GIỜ BẬN CÁ NHÂN                                         */
          /* ========================================================================= */
          <>
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>Khóa Khung Giờ Bận</Text>
              <Text style={styles.introSubtitle}>
                Khi có việc gia đình, học tập hoặc lý do riêng, bạn có thể tự khóa khung giờ để hệ thống và Studio không gán đơn trùng lịch.
              </Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.fieldLabel}>Ngày bận (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                value={busyDate}
                onChangeText={setBusyDate}
                placeholder="2026-10-08"
                placeholderTextColor="#94A3B8"
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Từ giờ (HH:mm) *</Text>
                  <TextInput
                    style={styles.input}
                    value={busyStartTime}
                    onChangeText={setBusyStartTime}
                    placeholder="08:00"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Đến giờ (HH:mm) *</Text>
                  <TextInput
                    style={styles.input}
                    value={busyEndTime}
                    onChangeText={setBusyEndTime}
                    placeholder="11:00"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Lý do bận (tùy chọn)</Text>
              <TextInput
                style={styles.input}
                value={busyReason}
                onChangeText={setBusyReason}
                placeholder="Ví dụ: Bận việc gia đình, đi học nâng cao..."
                placeholderTextColor="#94A3B8"
              />

              <TouchableOpacity
                style={[styles.blockBtn, isBlocking && styles.btnDisabled]}
                onPress={handleBlockPersonalSlot}
                disabled={isBlocking}
              >
                {isBlocking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.blockBtnText}>Xác nhận khóa giờ này</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Thanh điều hướng dưới đáy (Active tab Ca Studio) */}
      <AppBottomNavBar activeTab="explore" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 4,
  },
  navTitleContainer: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  navSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  tabItemActive: {
    backgroundColor: '#0F172A',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 90,
  },
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  introTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  dayGroup: {
    marginBottom: 14,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  dayName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  dayCount: {
    fontSize: 12,
    color: '#64748B',
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shiftName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  shiftRecurring: {
    fontSize: 11,
    color: '#64748B',
  },
  shiftTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  offDayCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  offDayText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  blockBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  blockBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
