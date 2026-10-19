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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { agencyStaffService, StaffShiftItem, StaffLeaveRequestItem } from '@/services/agency-staff.service';
import { staffProfileService } from '@/services/staff-profile.service';
import { muaCalendarService, BlockedSlotItem } from '@/services/mua-calendar.service';
import { getTodayVN } from '@/utils/date';
import { AppBottomNavBar } from '@/components/common/AppBottomNavBar';
import { websocketService } from '@/services/websocket.service';
import { useAuthStore } from '@/store/auth.store';

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

export interface ShiftSlotDefinition {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  label: string;
}

// 3 mốc ca cố định chuẩn toàn hệ thống: Ca sáng, Ca chiều, Ca tối
export const FIXED_SHIFT_SLOTS: ShiftSlotDefinition[] = [
  {
    id: 'MORNING',
    name: 'Ca sáng',
    startTime: '08:00',
    endTime: '12:00',
    label: '08:00 - 12:00',
  },
  {
    id: 'AFTERNOON',
    name: 'Ca chiều',
    startTime: '13:00',
    endTime: '17:00',
    label: '13:00 - 17:00',
  },
  {
    id: 'EVENING',
    name: 'Ca tối',
    startTime: '18:00',
    endTime: '21:30',
    label: '18:00 - 21:30',
  },
];

export const BUSY_PRESET_SLOTS = [
  {
    id: 'MORNING',
    label: 'Ca sáng',
    start: '08:00',
    end: '12:00',
    timeRange: '08:00 - 12:00',
    desc: 'Khung giờ sáng tiêu chuẩn',
    duration: '4 tiếng',
    icon: 'sunny-outline',
  },
  {
    id: 'AFTERNOON',
    label: 'Ca chiều',
    start: '13:00',
    end: '17:00',
    timeRange: '13:00 - 17:00',
    desc: 'Khung giờ chiều tiêu chuẩn',
    duration: '4 tiếng',
    icon: 'partly-sunny-outline',
  },
  {
    id: 'EVENING',
    label: 'Ca tối',
    start: '18:00',
    end: '21:30',
    timeRange: '18:00 - 21:30',
    desc: 'Khung giờ tối tăng ca',
    duration: '3.5 tiếng',
    icon: 'moon-outline',
  },
  {
    id: 'ALL_DAY',
    label: 'Cả ngày',
    start: '08:00',
    end: '17:00',
    timeRange: '08:00 - 17:00',
    desc: 'Toàn bộ thời gian làm việc trong ngày',
    duration: '8 tiếng',
    icon: 'calendar-outline',
  },
];

export const BUSY_PRESET_REASONS = [
  'Việc cá nhân',
  'Bận việc gia đình',
  'Khám sức khỏe',
  'Nghỉ phép',
];

export interface SelectedCellInfo {
  slotId: string;
  dayOfWeek: number;
  dateStr: string;
  fullDayName: string;
  shift: StaffShiftItem;
  slot: ShiftSlotDefinition;
}

export interface WeekDayInfo {
  dayOfWeek: number;
  label: string;
  fullName: string;
  date: Date;
  dateStr: string;
  shortDate: string;
}

export default function StaffScheduleScreen() {
  const { userInfo } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'SHIFTS' | 'BUSY'>('SHIFTS');
  const [currentWeekBase, setCurrentWeekBase] = useState<Date>(new Date());
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedCell, setSelectedCell] = useState<SelectedCellInfo | null>(null);
  const [shifts, setShifts] = useState<StaffShiftItem[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [staffName, setStaffName] = useState<string>('');
  const [agencyName, setAgencyName] = useState<string>('');

  // Kiểm tra xem tuần đang xem có phải tuần hiện tại (hôm nay) không
  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const curMon = new Date(today.setDate(diffToMonday));
    curMon.setHours(0, 0, 0, 0);

    const base = new Date(currentWeekBase);
    const baseDay = base.getDay();
    const diffToBaseMon = base.getDate() - baseDay + (baseDay === 0 ? -6 : 1);
    const baseMon = new Date(base.setDate(diffToBaseMon));
    baseMon.setHours(0, 0, 0, 0);

    return curMon.getTime() === baseMon.getTime();
  }, [currentWeekBase]);

  const handleToday = () => {
    setSelectedCell(null);
    const now = new Date();
    setCurrentWeekBase(now);
    setCalendarMonth(now);
  };

  const handleOpenDatePicker = () => {
    setCalendarMonth(new Date(currentWeekBase));
    setShowDatePickerModal(true);
  };

  const handleSelectDateFromCalendar = (date: Date) => {
    setSelectedCell(null);
    setCurrentWeekBase(date);
    setShowDatePickerModal(false);
  };

  const handlePrevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Tính toán 7 ngày của tuần làm việc (Thứ 2 đến Chủ Nhật)
  const currentWeek = useMemo(() => {
    const current = new Date(currentWeekBase);
    const day = current.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
    const diffToMonday = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);

    const labels = ['Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'CN'];
    const fullNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    const dows = [2, 3, 4, 5, 6, 7, 1];

    const days: WeekDayInfo[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateNum = String(d.getDate()).padStart(2, '0');
      days.push({
        dayOfWeek: dows[i],
        label: labels[i],
        fullName: fullNames[i],
        date: d,
        dateStr: `${year}-${month}-${dateNum}`,
        shortDate: `${dateNum}/${month}`,
      });
    }

    return {
      days,
      startDate: days[0].dateStr,
      endDate: days[6].dateStr,
      startFormatted: days[0].shortDate,
      endFormatted: `${days[6].shortDate}/${days[6].date.getFullYear()}`,
    };
  }, [currentWeekBase]);

  // Tính ma trận các ngày trong tháng cho popup calendar
  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const offset = (firstDay + 6) % 7; // Thứ 2 = 0, CN = 6
    const totalDays = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const baseStr = `${currentWeekBase.getFullYear()}-${String(currentWeekBase.getMonth() + 1).padStart(2, '0')}-${String(currentWeekBase.getDate()).padStart(2, '0')}`;

    const cells: Array<{
      isEmpty: boolean;
      dayNum?: number;
      date?: Date;
      dateStr?: string;
      isInWeek?: boolean;
      isToday?: boolean;
      isSelected?: boolean;
      key: string;
    }> = [];

    for (let i = 0; i < offset; i++) {
      cells.push({ isEmpty: true, key: `empty-${i}` });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dObj = new Date(year, month, d);
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isInWeek = currentWeek.startDate <= dStr && dStr <= currentWeek.endDate;
      const isToday = dStr === todayStr;
      const isSelected = dStr === baseStr;

      cells.push({
        isEmpty: false,
        dayNum: d,
        date: dObj,
        dateStr: dStr,
        isInWeek,
        isToday,
        isSelected,
        key: `day-${d}`,
      });
    }

    return cells;
  }, [calendarMonth, currentWeekBase, currentWeek]);

  // Form khóa lịch bận cá nhân
  const [busyDate, setBusyDate] = useState(getTodayVN());
  const [busyStartTime, setBusyStartTime] = useState('08:00');
  const [busyEndTime, setBusyEndTime] = useState('12:00');
  const [busyReason, setBusyReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);

  // 6 ngày kế tiếp để người dùng bấm chọn nhanh ngày bận
  const quickDates = useMemo(() => {
    const list: Array<{ dateStr: string; label: string; subLabel: string }> = [];
    const base = new Date();
    const dowNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    for (let i = 0; i < 6; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateNum = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dateNum}`;

      let label = '';
      if (i === 0) label = 'Hôm nay';
      else if (i === 1) label = 'Ngày mai';
      else label = dowNames[d.getDay()];

      list.push({
        dateStr,
        label,
        subLabel: `${dateNum}/${month}`,
      });
    }
    return list;
  }, []);

  const formatBusyDateDisplay = (dateStr: string) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return '';
    try {
      const parts = dateStr.trim().split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (isNaN(d.getTime())) return '';
      const dows = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      return `${dows[d.getDay()]}, ${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch {
      return '';
    }
  };

  // Modal chọn ngày báo bận qua popup thời khóa biểu
  const [showBusyDatePickerModal, setShowBusyDatePickerModal] = useState<boolean>(false);
  const [busyCalendarMonth, setBusyCalendarMonth] = useState<Date>(new Date());

  const busyCalendarGrid = useMemo(() => {
    const year = busyCalendarMonth.getFullYear();
    const month = busyCalendarMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const offset = (firstDay + 6) % 7; // Thứ 2 = 0, CN = 6
    const totalDays = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const cells: Array<{
      isEmpty: boolean;
      dayNum?: number;
      date?: Date;
      dateStr?: string;
      isToday?: boolean;
      isSelected?: boolean;
      key: string;
    }> = [];

    for (let i = 0; i < offset; i++) {
      cells.push({ isEmpty: true, key: `busy-empty-${i}` });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dObj = new Date(year, month, d);
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dStr === todayStr;
      const isSelected = dStr === busyDate;

      cells.push({
        isEmpty: false,
        dayNum: d,
        date: dObj,
        dateStr: dStr,
        isToday,
        isSelected,
        key: `busy-day-${d}`,
      });
    }

    return cells;
  }, [busyCalendarMonth, busyDate]);

  const handlePrevBusyMonth = () => {
    setBusyCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextBusyMonth = () => {
    setBusyCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectBusyDateFromCalendar = (dateStr: string) => {
    setBusyDate(dateStr);
    setShowBusyDatePickerModal(false);
  };

  // Danh sách các đơn xin nghỉ ca của thợ
  const [leaveRequests, setLeaveRequests] = useState<StaffLeaveRequestItem[]>([]);
  const [isLoadingLeaveRequests, setIsLoadingLeaveRequests] = useState(false);

  const loadLeaveRequests = useCallback(async () => {
    try {
      setIsLoadingLeaveRequests(true);
      const list = await agencyStaffService.getMyLeaveRequests();
      setLeaveRequests(list || []);
    } catch {
      // Ignored
    } finally {
      setIsLoadingLeaveRequests(false);
    }
  }, []);

  // Danh sách các ca bận đã khóa (dùng cho MUA Freelancer)
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
        // Lọc ca trực đúng theo tuần hiện tại (từ thứ 2 đến chủ nhật)
        const shiftList = await agencyStaffService.getMyStaffShifts(profile.id, {
          startDate: currentWeek.startDate,
          endDate: currentWeek.endDate,
        });
        setShifts(shiftList);
      }
      await Promise.allSettled([loadLeaveRequests(), loadBlockedSlots()]);
    } catch {
      // Đơn vị chưa có profile hoặc lỗi mạng
    } finally {
      setIsLoadingShifts(false);
    }
  }, [loadLeaveRequests, loadBlockedSlots, currentWeek.startDate, currentWeek.endDate]);

  useEffect(() => {
    loadStaffData();
  }, [loadStaffData]);

  // Lắng nghe realtime WebSocket phản hồi phê duyệt / từ chối đơn xin nghỉ ca từ Studio
  useEffect(() => {
    const userId = userInfo?.id;
    if (!userId) return;

    const handleRealtimeLeaveUpdate = (payload: any) => {
      console.log('[StaffSchedule] Nhận sự kiện cập nhật trạng thái đơn xin nghỉ qua WebSocket:', payload);
      // Tự động reload ca trực và danh sách đơn xin nghỉ ngay tức thì
      loadStaffData();
    };

    const unsubUserTopic = websocketService.subscribe(
      `/topic/staff-leave-status/${userId}`,
      handleRealtimeLeaveUpdate
    );
    const unsubNotifTopic = websocketService.subscribe(
      `/topic/user-notifications/${userId}`,
      (payload) => {
        if (
          payload?.type === 'STAFF_LEAVE_APPROVED' ||
          payload?.type === 'STAFF_LEAVE_REJECTED' ||
          payload?.type === 'STAFF_LEAVE_REVIEWED'
        ) {
          handleRealtimeLeaveUpdate(payload);
        }
      }
    );

    return () => {
      unsubUserTopic();
      unsubNotifTopic();
    };
  }, [userInfo?.id, loadStaffData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStaffData();
    setRefreshing(false);
  };

  const handleBlockPersonalSlot = async () => {
    if (!busyDate || !busyStartTime || !busyEndTime) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn ngày và khung ca cần xin nghỉ.');
      return;
    }

    const validPresets = [
      { start: '08:00', end: '12:00' },
      { start: '13:00', end: '17:00' },
      { start: '18:00', end: '21:30' },
      { start: '08:00', end: '17:00' },
    ];
    const isPresetValid = validPresets.some(
      (p) => p.start === busyStartTime && p.end === busyEndTime
    );
    if (!isPresetValid) {
      Alert.alert(
        'Khung ca không hợp lệ',
        'Chỉ được đăng ký theo 4 ca chuẩn: Ca sáng (08:00-12:00), Ca chiều (13:00-17:00), Ca tối (18:00-21:30) hoặc Cả ngày (08:00-17:00).'
      );
      return;
    }

    try {
      setIsBlocking(true);
      const shiftSlot = BUSY_PRESET_SLOTS.find(
        (s) => s.start === busyStartTime && s.end === busyEndTime
      );
      const shiftName = shiftSlot ? shiftSlot.label : `${busyStartTime} - ${busyEndTime}`;

      await agencyStaffService.submitLeaveRequest({
        leaveDate: busyDate,
        startTime: busyStartTime.length === 5 ? `${busyStartTime}:00` : busyStartTime,
        endTime: busyEndTime.length === 5 ? `${busyEndTime}:00` : busyEndTime,
        shiftName: `${shiftName} (${busyStartTime} - ${busyEndTime})`,
        reason: busyReason.trim() || 'Bận việc cá nhân',
      });

      Alert.alert(
        'Gửi Đơn Thành Công',
        'Đơn xin nghỉ ca đã được gửi tới Quản lý Studio. Trạng thái: CHỜ DUYỆT. Sau khi được duyệt, ca làm việc sẽ tự động xóa khỏi lịch trực của bạn.'
      );
      setBusyReason('');
      await loadLeaveRequests();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể gửi đơn xin nghỉ ca.';
      Alert.alert('Lỗi gửi đơn', msg);
    } finally {
      setIsBlocking(false);
    }
  };

  const handleCancelLeaveRequest = (requestId: number) => {
    Alert.alert(
      'Hủy Đơn Xin Nghỉ',
      'Bạn có chắc chắn muốn hủy đơn xin nghỉ ca đang chờ duyệt này?',
      [
        { text: 'Đóng', style: 'cancel' },
        {
          text: 'Xác Nhận Hủy',
          style: 'destructive',
          onPress: async () => {
            try {
              await agencyStaffService.cancelMyLeaveRequest(requestId);
              Alert.alert('Thành công', 'Đã hủy đơn xin nghỉ ca.');
              await loadLeaveRequests();
            } catch (err: any) {
              const msg = err?.response?.data?.message || err?.message || 'Không thể hủy đơn.';
              Alert.alert('Lỗi', msg);
            }
          },
        },
      ]
    );
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

  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  };

  // Tìm ca trực theo khung giờ và ngày cụ thể trong tuần
  const getShiftAt = useCallback(
    (slot: ShiftSlotDefinition, weekday: WeekDayInfo) => {
      const slotStart = parseTimeToMinutes(slot.startTime);
      const slotEnd = parseTimeToMinutes(slot.endTime);

      // Chỉ lấy các ca thuộc ngày này của tuần hiện tại:
      // 1. Ca có workDate cụ thể: workDate khớp với ngày trong tuần (bỏ qua phần giờ/T)
      // 2. Ca không có workDate cụ thể (hoặc định kỳ): map theo dayOfWeek
      const dayShifts = shifts.filter((s) => {
        if (s.isActive === false) return false;
        if (s.workDate) {
          const sDateStr = String(s.workDate).split('T')[0];
          return sDateStr === weekday.dateStr;
        }
        return Number(s.dayOfWeek) === Number(weekday.dayOfWeek);
      });

      // 1. Khớp chính xác theo khung giờ của ca cố định (Sáng, Chiều, Tối)
      const exact = dayShifts.find((s) => {
        const sStart = parseTimeToMinutes(s.startTime);
        const sEnd = parseTimeToMinutes(s.endTime);
        return Math.abs(sStart - slotStart) <= 30 && Math.abs(sEnd - slotEnd) <= 30;
      });
      if (exact) return exact;

      // 3. Nếu là ca làm cả ngày nhưng người dùng xem các buổi sáng/chiều/tối,
      // ta cũng hiển thị để thợ biết buổi đó mình có lịch làm việc
      const coveringShift = dayShifts.find((s) => {
        const sStart = parseTimeToMinutes(s.startTime);
        const sEnd = parseTimeToMinutes(s.endTime);
        return sStart <= slotStart + 30 && sEnd >= slotEnd - 30;
      });
      if (coveringShift) return coveringShift;

      return undefined;
    },
    [shifts]
  );

  // Phân loại trạng thái Fulltime hoặc Parttime
  const getEmploymentType = useCallback(
    (shift: StaffShiftItem, dayOfWeek: number): 'Fulltime' | 'Parttime' => {
      const name = (shift.shiftName || '').toLowerCase();
      if (name.includes('full') || name.includes('cả ngày') || name.includes('toàn thời gian')) {
        return 'Fulltime';
      }
      if (name.includes('part') || name.includes('bán thời gian')) {
        return 'Parttime';
      }

      // Kiểm tra tổng thời lượng làm việc trong ngày của nhân sự
      const sameDayShifts = shifts.filter((s) => s.isActive && s.dayOfWeek === dayOfWeek);
      let totalMinutes = 0;
      let hasMorning = false;
      let hasAfternoon = false;

      sameDayShifts.forEach((s) => {
        const sMin = parseTimeToMinutes(s.startTime);
        const eMin = parseTimeToMinutes(s.endTime);
        if (eMin > sMin) {
          totalMinutes += eMin - sMin;
        }
        if (Math.max(sMin, 8 * 60) < Math.min(eMin, 12 * 60)) {
          hasMorning = true;
        }
        if (Math.max(sMin, 13 * 60) < Math.min(eMin, 17 * 60)) {
          hasAfternoon = true;
        }
      });

      if ((hasMorning && hasAfternoon) || totalMinutes >= 7 * 60) {
        return 'Fulltime';
      }
      return 'Parttime';
    },
    [shifts]
  );

  // Xử lý khi bấm vào 1 ô trên bảng ca: nếu có ca thì hiển thị chi tiết, không có thì ẩn chi tiết
  const handleCellPress = (slot: ShiftSlotDefinition, weekday: WeekDayInfo) => {
    const shift = getShiftAt(slot, weekday);
    if (shift) {
      setSelectedCell({
        slotId: slot.id,
        dayOfWeek: weekday.dayOfWeek,
        dateStr: weekday.dateStr,
        fullDayName: `${weekday.fullName}, ngày ${weekday.shortDate}/${weekday.date.getFullYear()}`,
        shift,
        slot,
      });
    } else {
      // Bấm vào ca không có thì không hiển thị gì bên dưới
      setSelectedCell(null);
    }
  };

  const totalActiveShifts = shifts.filter((s) => s.isActive).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Navbar: Bỏ nút back vì đã có thanh Tab bên dưới */}
      <View style={styles.navBar}>
        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle}>Lịch làm việc</Text>
          {agencyName ? (
            <Text style={styles.navSubtitle} numberOfLines={1}>
              {agencyName} {staffName ? `• ${staffName}` : ''}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Segmented Control */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'SHIFTS' && styles.tabItemActive]}
          onPress={() => setActiveTab('SHIFTS')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'SHIFTS' && styles.tabTextActive]}>
            Ca Trực Studio
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'BUSY' && styles.tabItemActive]}
          onPress={() => setActiveTab('BUSY')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'BUSY' && styles.tabTextActive]}>
            Đăng Ký Lịch Bận
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#991B1B']} />}
      >
        {activeTab === 'SHIFTS' ? (
          <>
            {/* Header Lịch làm việc & Các nút xem lịch khác / về hôm nay */}
            <View style={styles.timetableHeaderRow}>
              <View style={styles.timetableHeaderLeft}>
                <Text style={styles.timetableMainTitle}>Lịch làm việc</Text>
                <Text style={styles.weekRangeSubtitle}>
                  Tuần: {currentWeek.startFormatted} - {currentWeek.endFormatted}
                </Text>
              </View>

              <View style={styles.timetableHeaderRight}>
                {/* Nút: Mở Calendar Picker để xem các tuần khác */}
                <TouchableOpacity
                  style={styles.calendarIconBtn}
                  onPress={handleOpenDatePicker}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={20} color="#BE123C" />
                </TouchableOpacity>
              </View>
            </View>

            {isLoadingShifts ? (
              <ActivityIndicator size="small" color="#991B1B" style={{ marginTop: 40 }} />
            ) : (
              /* ======================= CHẾ ĐỘ XEM MA TRẬN LƯỚI TUẦN DUY NHẤT ======================= */
              <>
                {shifts.length === 0 ? (
                  <View style={styles.noShiftNotice}>
                    <Ionicons name="information-circle-outline" size={16} color="#991B1B" />
                    <Text style={styles.noShiftNoticeText}>
                      Chưa có ca làm việc nào được xếp trong tuần này.
                    </Text>
                  </View>
                ) : null}

                <View style={styles.matrixContainerCard}>
                  {/* Bảng Thời Khóa Biểu Cố Định Cân Đối Responsive */}
                  <View style={styles.matrixTable}>
                    {/* Dòng Tiêu Đề Header (Cột Khung Giờ + 7 Thứ) */}
                    <View style={styles.matrixHeaderRow}>
                      <View style={styles.matrixTimeHeaderCol} />
                      {currentWeek.days.map((w, wIdx) => {
                        const isColSelected = selectedCell?.dayOfWeek === w.dayOfWeek;
                        const isLastCol = wIdx === currentWeek.days.length - 1;
                        return (
                          <View
                            key={w.dayOfWeek}
                            style={[
                              styles.matrixDayHeaderCol,
                              isLastCol && styles.matrixLastCol,
                              isColSelected && styles.matrixDayHeaderColActive,
                            ]}
                          >
                            {w.label === 'CN' ? (
                              <Text
                                style={[
                                  styles.matrixDayHeaderText,
                                  isColSelected && styles.matrixDayTextActive,
                                ]}
                              >
                                CN
                              </Text>
                            ) : (
                              <View style={styles.matrixDayTextGroup}>
                                <Text
                                  style={[
                                    styles.matrixDaySubText,
                                    isColSelected && styles.matrixDayTextActive,
                                  ]}
                                >
                                  Th
                                </Text>
                                <Text
                                  style={[
                                    styles.matrixDayNumText,
                                    isColSelected && styles.matrixDayNumTextActive,
                                  ]}
                                >
                                  {w.label.replace('Th ', '')}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {/* Các dòng khung giờ cố định: Sáng (8h-12h), Chiều (13h-17h), Tối (18h-21h30) */}
                    {FIXED_SHIFT_SLOTS.map((slot, index) => (
                      <View
                        key={slot.id}
                        style={[
                          styles.matrixDataRow,
                          index === FIXED_SHIFT_SLOTS.length - 1 && styles.matrixLastRow,
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
                        {currentWeek.days.map((w, wIdx) => {
                          const shift = getShiftAt(slot, w);
                          const isSelected =
                            selectedCell !== null &&
                            selectedCell.slotId === slot.id &&
                            selectedCell.dayOfWeek === w.dayOfWeek;
                          const isLastCol = wIdx === currentWeek.days.length - 1;

                          return (
                            <TouchableOpacity
                              key={`${slot.id}-${w.dayOfWeek}`}
                              style={[
                                styles.matrixCell,
                                isLastCol && styles.matrixLastCol,
                                isSelected && styles.matrixCellSelected,
                              ]}
                              onPress={() => handleCellPress(slot, w)}
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
                </View>

                {/* Thẻ chi tiết ca làm việc khi người dùng bấm vào ca có chấm đỏ */}
                {selectedCell ? (
                  <View style={styles.shiftDetailCard}>
                    <View style={styles.shiftDetailHeader}>
                      <View style={styles.shiftDetailTitleRow}>
                        <View style={styles.shiftDetailDot} />
                        <Text style={styles.shiftDetailTitle}>
                          {selectedCell.shift.shiftName || selectedCell.slot.name}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.shiftDetailBadge,
                          getEmploymentType(selectedCell.shift, selectedCell.dayOfWeek) === 'Fulltime'
                            ? styles.badgeFulltime
                            : styles.badgeParttime,
                        ]}
                      >
                        <Text
                          style={[
                            styles.shiftDetailBadgeText,
                            getEmploymentType(selectedCell.shift, selectedCell.dayOfWeek) === 'Fulltime'
                              ? styles.badgeFulltimeText
                              : styles.badgeParttimeText,
                          ]}
                        >
                          {getEmploymentType(selectedCell.shift, selectedCell.dayOfWeek)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.shiftDetailBody}>
                      <View style={styles.shiftDetailInfoRow}>
                        <Ionicons name="calendar-outline" size={15} color="#991B1B" />
                        <Text style={styles.shiftDetailInfoText}>
                          {selectedCell.fullDayName}
                        </Text>
                      </View>
                      <View style={styles.shiftDetailInfoRow}>
                        <Ionicons name="time-outline" size={15} color="#991B1B" />
                        <Text style={styles.shiftDetailInfoText}>
                          {selectedCell.shift.startTime ? selectedCell.shift.startTime.substring(0, 5) : selectedCell.slot.startTime} - {selectedCell.shift.endTime ? selectedCell.shift.endTime.substring(0, 5) : selectedCell.slot.endTime} ({selectedCell.slot.name})
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
                    <Text style={styles.summaryNumber}>{FIXED_SHIFT_SLOTS.length}</Text>
                    <Text style={styles.summaryLabel}>Khung ca cố định</Text>
                  </View>
                </View>
              </>
            )}
          </>
        ) : (
          <>
            {/* Thẻ Đăng Ký Nghỉ Ca Tối Ưu UX (Không dùng Icon) */}
            <View style={styles.formCard}>
              <View style={styles.busyFormHeader}>
                <Text style={styles.busyFormTitle}>Đăng ký nghỉ ca làm việc</Text>
                <Text style={styles.busyFormDesc}>
                  Chọn ngày và ca làm việc bạn cần xin nghỉ. Đơn xin nghỉ sẽ được gửi tới Studio xét duyệt.
                </Text>
              </View>

              {/* 1. Chọn ngày bận */}
              <View style={styles.busyFieldGroup}>
                <View style={styles.busyFieldHeaderRow}>
                  <Text style={styles.fieldLabel}>1. Chọn ngày nghỉ *</Text>
                </View>

                {/* Danh sách chọn nhanh 6 ngày tới */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickChipsRow}
                >
                  {quickDates.map((item) => {
                    const isSelected = busyDate === item.dateStr;
                    return (
                      <TouchableOpacity
                        key={item.dateStr}
                        style={[styles.quickDateChip, isSelected && styles.quickDateChipActive]}
                        onPress={() => setBusyDate(item.dateStr)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.quickDateChipLabel,
                            isSelected && styles.quickDateChipLabelActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={[
                            styles.quickDateChipSub,
                            isSelected && styles.quickDateChipSubActive,
                          ]}
                        >
                          {item.subLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Chọn ngày qua popup lịch */}
                <TouchableOpacity
                  style={styles.dateSelectorBox}
                  onPress={() => {
                    const parsed = new Date(busyDate || new Date());
                    setBusyCalendarMonth(isNaN(parsed.getTime()) ? new Date() : parsed);
                    setShowBusyDatePickerModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.dateSelectorLeft}>
                    <View style={styles.calendarIconCircle}>
                      <Ionicons name="calendar" size={18} color="#BE123C" />
                    </View>
                    <View>
                      <Text style={styles.dateSelectorMainText}>
                        {formatBusyDateDisplay(busyDate) || busyDate}
                      </Text>
                      <Text style={styles.dateSelectorSubText}>
                        Chạm để mở lịch chọn ngày khác
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dateSelectorBadge}>
                    <Text style={styles.dateSelectorBadgeText}>Chọn ngày</Text>
                    <Ionicons name="chevron-forward" size={14} color="#BE123C" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* 2. Chọn khung ca xin nghỉ */}
              <View style={styles.busyFieldGroup}>
                <View style={styles.busyFieldHeaderRow}>
                  <Text style={styles.fieldLabel}>2. Chọn khung ca xin nghỉ *</Text>
                  <View style={styles.timeSummaryBadge}>
                    <Text style={styles.timeSummaryBadgeText}>
                      {busyStartTime} - {busyEndTime}
                    </Text>
                  </View>
                </View>

                {/* Danh sách khung ca làm việc tiêu chuẩn */}
                <Text style={styles.subFieldSectionLabel}>
                  Chọn 1 khung ca làm việc tiêu chuẩn cần xin nghỉ:
                </Text>
                <View style={styles.presetSlotList}>
                  {BUSY_PRESET_SLOTS.map((slot) => {
                    const isSelected =
                      busyStartTime === slot.start && busyEndTime === slot.end;
                    return (
                      <TouchableOpacity
                        key={slot.id}
                        style={[
                          styles.presetSlotCard,
                          isSelected && styles.presetSlotCardActive,
                        ]}
                        onPress={() => {
                          setBusyStartTime(slot.start);
                          setBusyEndTime(slot.end);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.presetSlotCardLeft}>
                          <View
                            style={[
                              styles.presetSlotIconCircle,
                              isSelected && styles.presetSlotIconCircleActive,
                            ]}
                          >
                            <Ionicons
                              name={slot.icon as any}
                              size={18}
                              color={isSelected ? '#E11D48' : '#64748B'}
                            />
                          </View>
                          <View style={styles.presetSlotTextCol}>
                            <View style={styles.presetSlotTitleRow}>
                              <Text
                                style={[
                                  styles.presetSlotTitle,
                                  isSelected && styles.presetSlotTitleActive,
                                ]}
                              >
                                {slot.label}
                              </Text>
                              {slot.duration && (
                                <Text
                                  style={[
                                    styles.presetSlotDurationText,
                                    isSelected && styles.presetSlotDurationTextActive,
                                  ]}
                                >
                                  • {slot.duration}
                                </Text>
                              )}
                            </View>
                            <Text style={styles.presetSlotDescText}>{slot.desc}</Text>
                          </View>
                        </View>

                        <View style={styles.presetSlotCardRight}>
                          <View
                            style={[
                              styles.presetSlotBadge,
                              isSelected && styles.presetSlotBadgeActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.presetSlotBadgeText,
                                isSelected && styles.presetSlotBadgeTextActive,
                              ]}
                            >
                              {slot.start} - {slot.end}
                            </Text>
                          </View>
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color={isSelected ? '#E11D48' : '#CBD5E1'}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. Lý do xin nghỉ */}
              <View style={styles.busyFieldGroup}>
                <Text style={styles.fieldLabel}>3. Lý do xin nghỉ *</Text>

                {/* Chọn nhanh lý do mẫu */}
                <View style={styles.presetReasonWrap}>
                  {BUSY_PRESET_REASONS.map((reason) => {
                    const isSelected = busyReason === reason;
                    return (
                      <TouchableOpacity
                        key={reason}
                        style={[
                          styles.presetReasonChip,
                          isSelected && styles.presetReasonChipActive,
                        ]}
                        onPress={() => setBusyReason(reason)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.presetReasonChipText,
                            isSelected && styles.presetReasonChipTextActive,
                          ]}
                        >
                          {reason}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={styles.input}
                  value={busyReason}
                  onChangeText={setBusyReason}
                  placeholder="Nhập lý do chi tiết..."
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {/* Nút bấm xác nhận gửi đơn - Không dùng Icon */}
              <TouchableOpacity
                style={[styles.blockBtn, isBlocking && styles.btnDisabled]}
                onPress={handleBlockPersonalSlot}
                disabled={isBlocking}
                activeOpacity={0.85}
              >
                {isBlocking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.blockBtnText}>Gửi đơn xin nghỉ ca</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Danh Sách Các Đơn Xin Nghỉ Ca Của Thợ */}
            <View style={styles.busyListSection}>
              <View style={styles.busyListHeader}>
                <Text style={styles.busyListTitle}>Danh sách đơn xin nghỉ ca</Text>
                <View style={styles.busyCountBadge}>
                  <Text style={styles.busyCountText}>{leaveRequests.length}</Text>
                </View>
              </View>

              {isLoadingLeaveRequests ? (
                <View style={styles.busyLoadingBox}>
                  <ActivityIndicator size="small" color="#E11D48" />
                </View>
              ) : leaveRequests.length === 0 ? (
                <View style={styles.emptyBusyCard}>
                  <Text style={styles.emptyBusyTitle}>Chưa có đơn xin nghỉ ca nào</Text>
                  <Text style={styles.emptyBusyText}>
                    Lịch làm việc của bạn đang ở trạng thái sẵn sàng nhận ca và tiếp nhận đơn đặt.
                  </Text>
                </View>
              ) : (
                leaveRequests.map((req) => {
                  const dateStr = req.leaveDate;
                  let displayDate = dateStr;
                  if (dateStr && dateStr.includes('-')) {
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                      displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    }
                  }

                  const startTimeStr = req.startTime ? req.startTime.slice(0, 5) : '--:--';
                  const endTimeStr = req.endTime ? req.endTime.slice(0, 5) : '--:--';

                  const isPending = req.status === 'PENDING';
                  const isApproved = req.status === 'APPROVED';
                  const isRejected = req.status === 'REJECTED';

                  return (
                    <View key={req.id} style={styles.busySlotCard}>
                      <View style={styles.busySlotMain}>
                        <View style={styles.busySlotTopRow}>
                          <Text style={styles.busySlotDateText}>{displayDate}</Text>
                          {isPending && (
                            <View style={styles.badgePending}>
                              <Text style={styles.badgePendingText}>CHỜ DUYỆT</Text>
                            </View>
                          )}
                          {isApproved && (
                            <View style={styles.badgeApproved}>
                              <Text style={styles.badgeApprovedText}>ĐÃ DUYỆT</Text>
                            </View>
                          )}
                          {isRejected && (
                            <View style={styles.badgeRejected}>
                              <Text style={styles.badgeRejectedText}>ĐÃ TỪ CHỐI</Text>
                            </View>
                          )}
                          {req.status === 'CANCELLED' && (
                            <View style={styles.badgeCancelled}>
                              <Text style={styles.badgeCancelledText}>ĐÃ HỦY</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.busySlotTimeText}>
                          {req.shiftName || `${startTimeStr} - ${endTimeStr}`}
                        </Text>
                        <Text style={styles.busySlotReasonText} numberOfLines={2}>
                          {req.reason ? `Lý do: ${req.reason}` : 'Lý do: Bận việc cá nhân'}
                        </Text>
                        {isApproved && (
                          <Text style={styles.leaveApprovedSub}>
                            Ca trực đã được xóa khỏi lịch làm việc.
                          </Text>
                        )}
                        {isRejected && (
                          <Text style={styles.leaveRejectedSub}>
                            Lý do từ chối: {req.rejectionReason || 'Theo sắp xếp vận hành'}
                          </Text>
                        )}
                      </View>
                      {isPending && (
                        <TouchableOpacity
                          style={styles.cancelLeaveBtn}
                          onPress={() => handleCancelLeaveRequest(req.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.cancelLeaveBtnText}>Hủy đơn</Text>
                        </TouchableOpacity>
                      )}
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

      {/* Modal Popup Lịch để xem và chuyển đến các tuần khác */}
      <Modal
        visible={showDatePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalBox}>
            {/* Modal Header: Chọn tháng */}
            <View style={styles.calendarModalHeader}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                style={styles.calendarMonthNavBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={20} color="#0F172A" />
              </TouchableOpacity>

              <Text style={styles.calendarModalMonthTitle}>
                Tháng {calendarMonth.getMonth() + 1} / {calendarMonth.getFullYear()}
              </Text>

              <TouchableOpacity
                onPress={handleNextMonth}
                style={styles.calendarMonthNavBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Thứ trong tuần */}
            <View style={styles.calendarWeekDaysRow}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                <View key={d} style={styles.calendarWeekDayCol}>
                  <Text style={[styles.calendarWeekDayText, d === 'CN' && styles.calendarSundayText]}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            {/* Lưới các ngày trong tháng */}
            <View style={styles.calendarDaysGrid}>
              {calendarGrid.map((c) => {
                if (c.isEmpty) {
                  return <View key={c.key} style={styles.calendarDayCell} />;
                }
                return (
                  <TouchableOpacity
                    key={c.key}
                    style={[
                      styles.calendarDayCell,
                      c.isInWeek && styles.calendarDayCellInWeek,
                      c.isSelected && styles.calendarDayCellSelected,
                    ]}
                    onPress={() => c.date && handleSelectDateFromCalendar(c.date)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.calendarDayNumText,
                        c.isToday && styles.calendarDayNumToday,
                        c.isInWeek && styles.calendarDayNumInWeek,
                        c.isSelected && styles.calendarDayNumSelected,
                      ]}
                    >
                      {c.dayNum}
                    </Text>
                    {c.isToday && !c.isSelected ? <View style={styles.calendarTodayDot} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer hành động của Modal */}
            <View style={styles.calendarModalFooter}>
              <TouchableOpacity
                style={styles.calendarModalTodayBtn}
                onPress={() => {
                  handleToday();
                  setShowDatePickerModal(false);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="today-outline" size={16} color="#991B1B" />
                <Text style={styles.calendarModalTodayBtnText}>Về tuần hiện tại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calendarModalCloseBtn}
                onPress={() => setShowDatePickerModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.calendarModalCloseBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Popup Lịch để chọn ngày báo bận (Icon Thời Khóa Biểu) */}
      <Modal
        visible={showBusyDatePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBusyDatePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalBox}>
            {/* Modal Header */}
            <View style={styles.calendarModalHeader}>
              <TouchableOpacity
                onPress={handlePrevBusyMonth}
                style={styles.calendarMonthNavBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={20} color="#0F172A" />
              </TouchableOpacity>

              <View style={{ alignItems: 'center' }}>
                <Text style={styles.busyModalSubTitle}>Chọn ngày báo bận</Text>
                <Text style={styles.calendarModalMonthTitle}>
                  Tháng {busyCalendarMonth.getMonth() + 1} / {busyCalendarMonth.getFullYear()}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleNextBusyMonth}
                style={styles.calendarMonthNavBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Thứ trong tuần */}
            <View style={styles.calendarWeekDaysRow}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                <View key={d} style={styles.calendarWeekDayCol}>
                  <Text style={[styles.calendarWeekDayText, d === 'CN' && styles.calendarSundayText]}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            {/* Lưới các ngày trong tháng */}
            <View style={styles.calendarDaysGrid}>
              {busyCalendarGrid.map((c) => {
                if (c.isEmpty) {
                  return <View key={c.key} style={styles.calendarDayCell} />;
                }
                return (
                  <TouchableOpacity
                    key={c.key}
                    style={[
                      styles.calendarDayCell,
                      c.isSelected && styles.calendarDayCellSelected,
                    ]}
                    onPress={() => c.dateStr && handleSelectBusyDateFromCalendar(c.dateStr)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.calendarDayNumText,
                        c.isToday && styles.calendarDayNumToday,
                        c.isSelected && styles.calendarDayNumSelected,
                      ]}
                    >
                      {c.dayNum}
                    </Text>
                    {c.isToday && !c.isSelected ? <View style={styles.calendarTodayDot} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer hành động của Modal */}
            <View style={styles.calendarModalFooter}>
              <TouchableOpacity
                style={styles.calendarModalTodayBtn}
                onPress={() => {
                  handleSelectBusyDateFromCalendar(getTodayVN());
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="today-outline" size={16} color="#BE123C" />
                <Text style={styles.calendarModalTodayBtnText}>Chọn hôm nay</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.calendarModalCloseBtn}
                onPress={() => setShowBusyDatePickerModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.calendarModalCloseBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    marginBottom: 12,
    marginTop: 4,
  },
  timetableHeaderLeft: {
    flex: 1,
  },
  timetableHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  todayIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#991B1B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  todayIconInner: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  todayIconNumber: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  noShiftNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  noShiftNoticeText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '500',
  },
  timetableMainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  weekRangeSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },

  // Modal Calendar Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModalBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calendarMonthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarModalMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  calendarWeekDaysRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  calendarWeekDayCol: {
    width: '14.28%',
    alignItems: 'center',
  },
  calendarWeekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  calendarSundayText: {
    color: '#DC2626',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    marginVertical: 2,
  },
  calendarDayCellInWeek: {
    backgroundColor: '#FFF1F2',
  },
  calendarDayCellSelected: {
    backgroundColor: '#991B1B',
  },
  calendarDayNumText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  calendarDayNumToday: {
    fontWeight: '800',
    color: '#991B1B',
  },
  calendarDayNumInWeek: {
    color: '#991B1B',
    fontWeight: '600',
  },
  calendarDayNumSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarTodayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#991B1B',
    position: 'absolute',
    bottom: 3,
  },
  calendarModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  calendarModalTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFF1F2',
  },
  calendarModalTodayBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  calendarModalCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  calendarModalCloseBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  matrixContainerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
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
    width: '100%',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  matrixTimeHeaderCol: {
    width: 62,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  matrixDayHeaderCol: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  matrixDayHeaderColActive: {
    backgroundColor: '#FFF1F2',
  },
  matrixLastCol: {
    borderRightWidth: 0,
  },
  matrixDayTextActive: {
    color: '#991B1B',
  },
  matrixDayNumTextActive: {
    color: '#991B1B',
    fontWeight: '800',
  },
  matrixDayTextGroup: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  matrixDaySubText: {
    fontSize: 10,
    color: '#334155',
    fontWeight: '600',
    lineHeight: 12,
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
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  matrixLastRow: {
    borderBottomWidth: 0,
  },
  matrixTimeCol: {
    width: 62,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  timePillBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    width: '92%',
  },
  timePillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#334155',
  },
  timePillDash: {
    fontSize: 8,
    color: '#64748B',
    lineHeight: 9,
  },
  matrixCell: {
    flex: 1,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  matrixCellSelected: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#991B1B',
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
  badgeFulltime: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  badgeFulltimeText: {
    color: '#059669',
  },
  badgeParttime: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  badgeParttimeText: {
    color: '#991B1B',
  },
  shiftDetailBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  busyFormHeader: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  busyFormTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  busyFormDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  busyFieldGroup: {
    marginBottom: 16,
  },
  busyFieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 6,
  },
  subFieldSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 2,
  },
  dateSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  dateSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  calendarIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  dateSelectorMainText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateSelectorSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  dateSelectorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 2,
  },
  dateSelectorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BE123C',
  },
  timeSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  timeSummaryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BE123C',
  },
  busyModalSubTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  busyDateHelperText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BE123C',
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
  },
  quickDateChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    minWidth: 64,
  },
  quickDateChipActive: {
    borderColor: '#E11D48',
    backgroundColor: '#FFF1F2',
  },
  quickDateChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  quickDateChipLabelActive: {
    color: '#BE123C',
    fontWeight: '700',
  },
  quickDateChipSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  quickDateChipSubActive: {
    color: '#E11D48',
    fontWeight: '600',
  },
  presetSlotList: {
    gap: 8,
    marginBottom: 8,
  },
  presetSlotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  presetSlotCardActive: {
    borderColor: '#E11D48',
    backgroundColor: '#FFF1F2',
  },
  presetSlotCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  presetSlotIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetSlotIconCircleActive: {
    backgroundColor: '#FFE4E6',
  },
  presetSlotTextCol: {
    flex: 1,
  },
  presetSlotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetSlotTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  presetSlotTitleActive: {
    color: '#BE123C',
  },
  presetSlotDurationText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  presetSlotDurationTextActive: {
    color: '#E11D48',
  },
  presetSlotDescText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  presetSlotCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 6,
  },
  presetSlotBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetSlotBadgeActive: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FECDD3',
  },
  presetSlotBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  presetSlotBadgeTextActive: {
    color: '#BE123C',
    fontWeight: '700',
  },
  presetTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  presetTimeChip: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  presetTimeChipActive: {
    borderColor: '#E11D48',
    backgroundColor: '#FFF1F2',
  },
  presetTimeChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  presetTimeChipLabelActive: {
    color: '#BE123C',
    fontWeight: '700',
  },
  presetTimeChipSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  presetTimeChipSubActive: {
    color: '#E11D48',
    fontWeight: '600',
  },
  presetReasonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  presetReasonChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  presetReasonChipActive: {
    borderColor: '#E11D48',
    backgroundColor: '#FFF1F2',
  },
  presetReasonChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
  },
  presetReasonChipTextActive: {
    color: '#BE123C',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
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
    marginTop: 24,
    marginBottom: 40,
  },
  busyListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    borderColor: '#E2E8F0',
  },
  emptyBusyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptyBusyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  busySlotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  busySlotMain: {
    flex: 1,
    marginRight: 12,
  },
  busySlotTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  busySlotDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  busySlotBadge: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  busySlotBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#BE123C',
  },
  busySlotTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E11D48',
    marginBottom: 2,
  },
  busySlotReasonText: {
    fontSize: 12,
    color: '#64748B',
  },
  unblockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  unblockBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BE123C',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgePendingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
  },
  badgeApproved: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeApprovedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#047857',
  },
  badgeRejected: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  badgeRejectedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#BE123C',
  },
  badgeCancelled: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeCancelledText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  leaveApprovedSub: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '500',
    marginTop: 3,
  },
  leaveRejectedSub: {
    fontSize: 11,
    color: '#BE123C',
    fontWeight: '500',
    marginTop: 3,
  },
  cancelLeaveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  cancelLeaveBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
});
