import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { muaCalendarService, BlockedSlotItem } from '@/services/mua-calendar.service';
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

const WEEKDAYS = [
  { dayOfWeek: 2, label: 'Th 2', fullName: 'Thứ Hai' },
  { dayOfWeek: 3, label: 'Th 3', fullName: 'Thứ Ba' },
  { dayOfWeek: 4, label: 'Th 4', fullName: 'Thứ Tư' },
  { dayOfWeek: 5, label: 'Th 5', fullName: 'Thứ Năm' },
  { dayOfWeek: 6, label: 'Th 6', fullName: 'Thứ Sáu' },
  { dayOfWeek: 7, label: 'Th 7', fullName: 'Thứ Bảy' },
  { dayOfWeek: 1, label: 'CN', fullName: 'Chủ Nhật' },
];

export default function StaffScheduleScreen() {
  const [activeTab, setActiveTab] = useState<'SHIFTS' | 'BUSY'>('SHIFTS');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [selectedShift, setSelectedShift] = useState<StaffShiftItem | null>(null);
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

  // Danh sách các ca bận đã khóa
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlotItem[]>([]);
  const [isLoadingBlockedSlots, setIsLoadingBlockedSlots] = useState(false);

  const loadBlockedSlots = useCallback(async () => {
    try {
      setIsLoadingBlockedSlots(true);
      const list = await muaCalendarService.getMyBlockedSlots();
      setBlockedSlots(list || []);
    } catch {
      // lỗi fetch
    } finally {
      setIsLoadingBlockedSlots(false);
    }
  }, []);

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
      await loadBlockedSlots();
    } catch {
      // Đơn vị chưa có profile hoặc lỗi mạng
    } finally {
      setIsLoadingShifts(false);
    }
  }, [loadBlockedSlots]);

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

      Alert.alert('Thành công', 'Đã khóa khung giờ bận cá nhân. Studio và hệ thống sẽ không gán đơn vào giờ này.');
      setBusyReason('');
      await loadBlockedSlots();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể khóa khung giờ.';
      Alert.alert('Lỗi khóa giờ', msg);
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblockPersonalSlot = (calendarId: number) => {
    Alert.alert(
      'Mở Khóa Khung Giờ',
      'Bạn có chắc chắn muốn mở lại khung giờ này để tiếp tục nhận đơn và ca trực bình thường?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Mở Khóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await muaCalendarService.unblockPersonalSlot(calendarId);
              Alert.alert('Thành công', 'Đã mở khóa khung giờ bận thành công.');
              await loadBlockedSlots();
            } catch (err: any) {
              const msg = err?.response?.data?.message || err?.message || 'Không thể mở khóa.';
              Alert.alert('Lỗi', msg);
            }
          },
        },
      ]
    );
  };

  // Trích xuất các khung giờ độc nhất từ danh sách ca trực
  const timeSlots = useMemo(() => {
    const slotsMap = new Map<string, { startTime: string; endTime: string; label: string }>();
    shifts.forEach((s) => {
      if (s.isActive) {
        const start = s.startTime.slice(0, 5);
        const end = s.endTime.slice(0, 5);
        const key = `${start}-${end}`;
        if (!slotsMap.has(key)) {
          slotsMap.set(key, {
            startTime: start,
            endTime: end,
            label: `${start} - ${end}`,
          });
        }
      }
    });

    const list = Array.from(slotsMap.values());
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return list;
  }, [shifts]);

  // Tìm ca trực theo khung giờ và thứ trong tuần
  const getShiftAt = (slot: { startTime: string; endTime: string }, dayOfWeek: number) => {
    return shifts.find(
      (s) =>
        s.isActive &&
        s.dayOfWeek === dayOfWeek &&
        s.startTime.startsWith(slot.startTime) &&
        s.endTime.startsWith(slot.endTime)
    );
  };

  // Tự động chọn ca trực đầu tiên khi load xong shifts
  useEffect(() => {
    if (shifts.length > 0 && !selectedShift) {
      const firstActive = shifts.find((s) => s.isActive);
      if (firstActive) setSelectedShift(firstActive);
    }
  }, [shifts, selectedShift]);

  // Nhóm ca làm theo ngày trong tuần (2 đến 7, sau đó là 1 CN)
  const groupedShifts = [2, 3, 4, 5, 6, 7, 1].map((day) => ({
    dayOfWeek: day,
    dayName: DAY_NAMES[day],
    items: shifts.filter((s) => s.dayOfWeek === day && s.isActive),
  }));

  const totalActiveShifts = shifts.filter((s) => s.isActive).length;

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
          activeOpacity={0.8}
        >
          <Ionicons
            name="calendar"
            size={16}
            color={activeTab === 'SHIFTS' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === 'SHIFTS' && styles.tabTextActive]}>
            Ca Trực Studio
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'BUSY' && styles.tabItemActive]}
          onPress={() => setActiveTab('BUSY')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="lock-closed"
            size={16}
            color={activeTab === 'BUSY' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === 'BUSY' && styles.tabTextActive]}>
            Khóa Giờ Bận
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#991B1B']} />}
      >
        {activeTab === 'SHIFTS' ? (
          /* ========================================================================= */
          /* TAB 1: CA TRỰC STUDIO CỦA NHÂN VIÊN (DẠNG MA TRẬN THỜI KHÓA BIỂU TUẦN)   */
          /* ========================================================================= */
          <>
            {/* Header Lịch làm việc + Toggle Buttons (chuẩn theo mockup) */}
            <View style={styles.timetableHeaderRow}>
              <Text style={styles.timetableMainTitle}>Lịch làm việc</Text>
              <View style={styles.toggleButtonGroup}>
                <TouchableOpacity
                  style={[
                    styles.toggleRoundBtn,
                    viewMode === 'GRID' ? styles.toggleRoundBtnActive : styles.toggleRoundBtnInactive,
                  ]}
                  onPress={() => setViewMode('GRID')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="grid"
                    size={17}
                    color={viewMode === 'GRID' ? '#FFFFFF' : '#991B1B'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleRoundBtn,
                    viewMode === 'LIST' ? styles.toggleRoundBtnActive : styles.toggleRoundBtnInactive,
                  ]}
                  onPress={() => setViewMode('LIST')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="list"
                    size={18}
                    color={viewMode === 'LIST' ? '#FFFFFF' : '#991B1B'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {isLoadingShifts ? (
              <ActivityIndicator size="small" color="#991B1B" style={{ marginTop: 40 }} />
            ) : shifts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={36} color="#FDA4AF" style={{ marginBottom: 10 }} />
                <Text style={styles.emptyTitle}>Chưa có ca làm việc</Text>
                <Text style={styles.emptyText}>
                  Studio chưa xếp ca trực cố định cho bạn trong tuần này.
                </Text>
              </View>
            ) : viewMode === 'GRID' ? (
              /* ======================= CHẾ ĐỘ XEM MA TRẬN LƯỚI TUẦN ======================= */
              <>
                <View style={styles.matrixContainerCard}>
                  {/* Bảng Thời Khóa Biểu Cuộn Ngang / Đảm bảo hiển thị hoàn hảo */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.matrixTable}>
                      {/* Dòng Tiêu Đề Header (Cột Khung Giờ + 7 Thứ) */}
                      <View style={styles.matrixHeaderRow}>
                        <View style={styles.matrixTimeHeaderCol} />
                        {WEEKDAYS.map((w) => (
                          <View key={w.dayOfWeek} style={styles.matrixDayHeaderCol}>
                            {w.label === 'CN' ? (
                              <Text style={styles.matrixDayHeaderText}>CN</Text>
                            ) : (
                              <View style={styles.matrixDayTextGroup}>
                                <Text style={styles.matrixDaySubText}>Th</Text>
                                <Text style={styles.matrixDayNumText}>{w.label.replace('Th ', '')}</Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>

                      {/* Các dòng khung giờ (Time Slots) */}
                      {timeSlots.map((slot, index) => (
                        <View
                          key={slot.label}
                          style={[
                            styles.matrixDataRow,
                            index === timeSlots.length - 1 && styles.matrixLastRow,
                          ]}
                        >
                          {/* Cột 1: Khung Giờ Pill */}
                          <View style={styles.matrixTimeCol}>
                            <View style={styles.timePillBadge}>
                              <Text style={styles.timePillText}>{slot.startTime}</Text>
                              <Text style={styles.timePillDash}>-</Text>
                              <Text style={styles.timePillText}>{slot.endTime}</Text>
                            </View>
                          </View>

                          {/* 7 Cột Ngày Trong Tuần */}
                          {WEEKDAYS.map((w) => {
                            const shift = getShiftAt(slot, w.dayOfWeek);
                            const isSelected = selectedShift && shift && selectedShift.id === shift.id;

                            return (
                              <TouchableOpacity
                                key={`${slot.label}-${w.dayOfWeek}`}
                                style={[
                                  styles.matrixCell,
                                  isSelected && styles.matrixCellSelected,
                                ]}
                                disabled={!shift}
                                onPress={() => shift && setSelectedShift(shift)}
                                activeOpacity={0.7}
                              >
                                {shift ? (
                                  <View
                                    style={[
                                      styles.shiftDotCircle,
                                      isSelected && styles.shiftDotCircleActive,
                                    ]}
                                  />
                                ) : null}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Thẻ chi tiết ca làm việc khi người dùng bấm vào chấm đỏ */}
                {selectedShift ? (
                  <View style={styles.shiftDetailCard}>
                    <View style={styles.shiftDetailHeader}>
                      <View style={styles.shiftDetailTitleRow}>
                        <View style={styles.shiftDetailDot} />
                        <Text style={styles.shiftDetailTitle}>
                          {selectedShift.shiftName || 'Ca Trực Studio'}
                        </Text>
                      </View>
                      <View style={styles.shiftDetailBadge}>
                        <Text style={styles.shiftDetailBadgeText}>
                          {selectedShift.isRecurring ? 'Hàng tuần' : 'Ca linh hoạt'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.shiftDetailBody}>
                      <View style={styles.shiftDetailInfoRow}>
                        <Ionicons name="calendar-outline" size={15} color="#991B1B" />
                        <Text style={styles.shiftDetailInfoText}>
                          {DAY_NAMES[selectedShift.dayOfWeek]}
                        </Text>
                      </View>
                      <View style={styles.shiftDetailInfoRow}>
                        <Ionicons name="time-outline" size={15} color="#991B1B" />
                        <Text style={styles.shiftDetailInfoText}>
                          {selectedShift.startTime.slice(0, 5)} - {selectedShift.endTime.slice(0, 5)}
                        </Text>
                      </View>
                      {agencyName ? (
                        <View style={styles.shiftDetailInfoRow}>
                          <Ionicons name="business-outline" size={15} color="#64748B" />
                          <Text style={styles.shiftDetailAgencyText}>{agencyName}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {/* Tóm tắt ca trực trong tuần */}
                <View style={styles.summaryBar}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumber}>{totalActiveShifts}</Text>
                    <Text style={styles.summaryLabel}>Ca trực / tuần</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryNumber}>{timeSlots.length}</Text>
                    <Text style={styles.summaryLabel}>Khung giờ làm việc</Text>
                  </View>
                </View>
              </>
            ) : (
              /* ======================= CHẾ ĐỘ XEM DANH SÁCH CHI TIẾT ======================= */
              groupedShifts.map((group) => (
                <View key={group.dayOfWeek} style={styles.dayGroup}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayName}>{group.dayName}</Text>
                    <View style={[styles.dayCountBadge, group.items.length > 0 && styles.dayCountBadgeActive]}>
                      <Text style={[styles.dayCountText, group.items.length > 0 && styles.dayCountTextActive]}>
                        {group.items.length > 0 ? `${group.items.length} ca trực` : 'Nghỉ'}
                      </Text>
                    </View>
                  </View>

                  {group.items.length > 0 ? (
                    group.items.map((shift) => (
                      <View key={shift.id} style={styles.shiftCard}>
                        <View style={styles.shiftHeader}>
                          <View style={styles.shiftNameRow}>
                            <View style={styles.shiftDot} />
                            <Text style={styles.shiftName}>{shift.shiftName}</Text>
                          </View>
                          <View style={styles.shiftRecurringBadge}>
                            <Text style={styles.shiftRecurringText}>
                              {shift.isRecurring ? 'Hàng tuần' : 'Ca đột xuất'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.shiftTimeRow}>
                          <Ionicons name="time" size={15} color="#991B1B" />
                          <Text style={styles.shiftTime}>
                            {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                          </Text>
                        </View>
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
              <View style={styles.introHeaderRow}>
                <View style={styles.introIconBox}>
                  <Ionicons name="lock-closed" size={17} color="#E11D48" />
                </View>
                <Text style={styles.introTitle}>Khóa Khung Giờ Bận</Text>
              </View>
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
                activeOpacity={0.85}
              >
                {isBlocking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.blockBtnText}>Xác nhận khóa giờ này</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Danh Sách Các Khung Giờ Bận Đã Khóa */}
            <View style={styles.busyListSection}>
              <View style={styles.busyListHeader}>
                <View style={styles.busyListHeaderLeft}>
                  <Ionicons name="calendar-outline" size={18} color="#E11D48" />
                  <Text style={styles.busyListTitle}>Khung giờ bận đã đăng ký</Text>
                </View>
                <View style={styles.busyCountBadge}>
                  <Text style={styles.busyCountText}>{blockedSlots.length}</Text>
                </View>
              </View>

              {isLoadingBlockedSlots ? (
                <View style={styles.busyLoadingBox}>
                  <ActivityIndicator size="small" color="#E11D48" />
                </View>
              ) : blockedSlots.length === 0 ? (
                <View style={styles.emptyBusyCard}>
                  <Ionicons name="shield-checkmark-outline" size={26} color="#FDA4AF" />
                  <Text style={styles.emptyBusyText}>
                    Bạn chưa có khung giờ bận nào. Lịch làm việc luôn sẵn sàng nhận ca!
                  </Text>
                </View>
              ) : (
                blockedSlots.map((slot) => {
                  const slotId = slot.id || slot.calendar_id;
                  const dateStr = slot.bookingDate || slot.booking_date;
                  let displayDate = dateStr;
                  if (dateStr && dateStr.includes('-')) {
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                      displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    }
                  }

                  const rawStart = slot.startTime || slot.start_at || slot.startAt || '';
                  const rawEnd = slot.endTime || slot.end_at || slot.endAt || '';
                  const startTimeStr = rawStart.includes('T') ? rawStart.slice(11, 16) : (rawStart ? rawStart.slice(0, 5) : '--:--');
                  const endTimeStr = rawEnd.includes('T') ? rawEnd.slice(11, 16) : (rawEnd ? rawEnd.slice(0, 5) : '--:--');

                  return (
                    <View key={slotId} style={styles.busySlotCard}>
                      <View style={styles.busySlotLeft}>
                        <View style={styles.busySlotDateRow}>
                          <Ionicons name="time" size={14} color="#E11D48" />
                          <Text style={styles.busySlotDate}>
                            {displayDate} &bull; {startTimeStr} - {endTimeStr}
                          </Text>
                        </View>
                        <Text style={styles.busySlotReason} numberOfLines={2}>
                          {slot.reason || 'Bận việc cá nhân'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.unblockBtn}
                        onPress={() => handleUnblockPersonalSlot(slotId)}
                      >
                        <Ionicons name="lock-open-outline" size={13} color="#DC2626" />
                        <Text style={styles.unblockBtnText}>Mở khóa</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
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
    fontWeight: '700',
    color: '#0F172A',
  },
  navSubtitle: {
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '500',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  tabItemActive: {
    backgroundColor: '#E11D48',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 90,
  },
  introCard: {
    backgroundColor: '#FFF5F7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderLeftWidth: 4,
    borderLeftColor: '#E11D48',
  },
  introHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  introIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9F1239',
  },
  introSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE4E6',
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
  // Styles cho Lịch làm việc - Weekly Timetable Matrix Grid
  timetableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  timetableMainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  toggleButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleRoundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRoundBtnActive: {
    backgroundColor: '#991B1B',
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleRoundBtnInactive: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  matrixContainerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  matrixTable: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  matrixTimeHeaderCol: {
    width: 74,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  matrixDayHeaderCol: {
    width: 39,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  matrixDayTextGroup: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  matrixDaySubText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
    lineHeight: 13,
  },
  matrixDayNumText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    lineHeight: 14,
  },
  matrixDayHeaderText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  matrixDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  matrixLastRow: {
    borderBottomWidth: 0,
  },
  matrixTimeCol: {
    width: 74,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  timePillBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  timePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  timePillDash: {
    fontSize: 9,
    color: '#64748B',
    lineHeight: 10,
  },
  matrixCell: {
    width: 39,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  matrixCellSelected: {
    backgroundColor: '#FFF1F2',
  },
  shiftDotCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#991B1B',
  },
  shiftDotCircleActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#991B1B',
    borderWidth: 2,
    borderColor: '#FECDD3',
  },
  shiftDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderLeftWidth: 4,
    borderLeftColor: '#991B1B',
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  shiftDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  shiftDetailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shiftDetailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#991B1B',
  },
  shiftDetailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  shiftDetailBadge: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  shiftDetailBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991B1B',
  },
  shiftDetailBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingTop: 4,
  },
  shiftDetailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  shiftDetailInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  shiftDetailAgencyText: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#991B1B',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#E2E8F0',
  },
  dayGroup: {
    marginBottom: 14,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  dayName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  dayCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  dayCountBadgeActive: {
    backgroundColor: '#FFE4E6',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  dayCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  dayCountTextActive: {
    color: '#BE123C',
    fontWeight: '700',
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderLeftWidth: 4,
    borderLeftColor: '#E11D48',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  shiftNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E11D48',
  },
  shiftName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  shiftRecurringBadge: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  shiftRecurringText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#BE123C',
  },
  shiftTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E11D48',
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
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
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
    backgroundColor: '#E11D48',
    paddingVertical: 13,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  blockBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.7,
  },

  // Khung giờ bận đã đăng ký styles
  busyListSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  busyListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  busyListHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  busyListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  busyCountBadge: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  busyCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BE123C',
  },
  busyLoadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyBusyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    gap: 8,
  },
  emptyBusyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  busySlotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderLeftWidth: 3,
    borderLeftColor: '#E11D48',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  busySlotLeft: {
    flex: 1,
    marginRight: 10,
  },
  busySlotDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  busySlotDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  busySlotReason: {
    fontSize: 12,
    color: '#64748B',
  },
  unblockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  unblockBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
});
