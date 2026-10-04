import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import {
  muaCalendarService,
  CalendarDayOverview,
  TimeSlotItem,
} from '@/services/mua-calendar.service';
import { SwipeableBottomSheet } from '@/components/common/SwipeableBottomSheet';

type TimePeriod = 'early' | 'morning' | 'afternoon' | 'evening';

interface PeriodTabItem {
  id: TimePeriod;
  label: string;
  timeRange: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PERIOD_TABS: PeriodTabItem[] = [
  { id: 'early', label: 'Sáng sớm', timeRange: '<07h', icon: 'flash' },
  { id: 'morning', label: 'Buổi sáng', timeRange: '07-12h', icon: 'sunny' },
  { id: 'afternoon', label: 'Buổi chiều', timeRange: '12-18h', icon: 'partly-sunny' },
  { id: 'evening', label: 'Buổi tối', timeRange: '18-24h', icon: 'moon' },
];

const WEEKDAY_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function getSlotPeriod(startTime: string): TimePeriod {
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour >= 4 && hour < 7) return 'early';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'early';
}

function formatDayOfWeekVietnamese(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const day = dateObj.getDay();
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return `${days[day]}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

interface Props {
  muaId: number;
  durationMinutes?: number;
  selectedDate: string; // YYYY-MM-DD
  selectedTimeSlot: string; // HH:mm
  onSelectDate: (date: string) => void;
  onSelectTimeSlot: (timeSlot: string) => void;
}

export const DateTimeSelector: React.FC<Props> = ({
  muaId,
  durationMinutes = 60,
  selectedDate,
  selectedTimeSlot,
  onSelectDate,
  onSelectTimeSlot,
}) => {
  const [calendarDays, setCalendarDays] = useState<CalendarDayOverview[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlotItem[]>([]);
  const [isLoadingDays, setIsLoadingDays] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Trạng thái hiển thị Modal chọn khung giờ
  const [isTimeModalVisible, setIsTimeModalVisible] = useState(false);

  // Khung giờ tạm thời được chọn trong Modal trước khi người dùng bấm Xác Nhận
  const [tempTimeSlot, setTempTimeSlot] = useState<string>(selectedTimeSlot || '');

  // Tháng và năm đang xem trên biểu lịch
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });

  const [activePeriod, setActivePeriod] = useState<TimePeriod>(() => {
    return selectedTimeSlot ? getSlotPeriod(selectedTimeSlot) : 'morning';
  });

  // Đồng bộ tempTimeSlot khi selectedTimeSlot bên ngoài thay đổi
  useEffect(() => {
    if (selectedTimeSlot) {
      setTempTimeSlot(selectedTimeSlot);
      setActivePeriod(getSlotPeriod(selectedTimeSlot));
    }
  }, [selectedTimeSlot]);

  // Đồng bộ viewDate nếu selectedDate thay đổi
  useEffect(() => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      setViewDate((prev) => {
        if (prev.getFullYear() !== y || prev.getMonth() !== m - 1) {
          return new Date(y, m - 1, d);
        }
        return prev;
      });
    }
  }, [selectedDate]);

  // 1. Tải danh sách tổng quan 30 ngày từ Backend
  useEffect(() => {
    let isMounted = true;
    async function fetchDays() {
      if (!muaId) return;
      setIsLoadingDays(true);
      try {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const startDate = `${y}-${m}-${d}`;

        const days = await muaCalendarService.getCalendarDays(muaId, startDate, 30, durationMinutes);
        if (isMounted) {
          setCalendarDays(days);

          // Chỉ tự động đổi ngày nếu ngày người dùng đang chọn trước đó bị kín lịch
          if (selectedDate) {
            const currentDayObj = days.find((item) => item.date === selectedDate);
            if (currentDayObj?.is_fully_booked) {
              const firstAvailable = days.find((item) => !item.is_fully_booked);
              if (firstAvailable) {
                onSelectDate(firstAvailable.date);
              }
            }
          }
        }
      } catch {
        // Giữ state cũ nếu có lỗi
      } finally {
        if (isMounted) setIsLoadingDays(false);
      }
    }
    fetchDays();
    return () => {
      isMounted = false;
    };
  }, [muaId, durationMinutes]);

  // 2. Tải danh sách các khung giờ của ngày được chọn từ Backend
  useEffect(() => {
    let isMounted = true;
    async function fetchSlots() {
      if (!muaId || !selectedDate) return;
      setIsLoadingSlots(true);
      try {
        const res = await muaCalendarService.getAvailableSlots(
          muaId,
          selectedDate,
          durationMinutes,
          15
        );
        if (isMounted) {
          const slots = res.slots || [];
          setTimeSlots(slots);

          // Chỉ tự động điều chỉnh slot nếu người dùng ĐÃ chọn giờ trước đó nhưng giờ đó bị kín
          if (selectedTimeSlot) {
            const curFormatted = selectedTimeSlot.length === 5 ? `${selectedTimeSlot}:00` : selectedTimeSlot;
            const matched = slots.find((s) => s.start_time.startsWith(curFormatted.substring(0, 5)));
            if (!matched || !matched.is_available) {
              const firstAvailable = slots.find((s) => s.is_available);
              if (firstAvailable) {
                const newTime = firstAvailable.start_time.substring(0, 5);
                setTempTimeSlot(newTime);
                onSelectTimeSlot(newTime);
              }
            }
          }
        }
      } catch {
        // Giữ state cũ nếu lỗi
      } finally {
        if (isMounted) setIsLoadingSlots(false);
      }
    }
    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [muaId, selectedDate, durationMinutes]);

  // Map tra cứu nhanh 30 ngày theo chuỗi 'YYYY-MM-DD'
  const calendarDaysMap = useMemo(() => {
    const map = new Map<string, CalendarDayOverview>();
    calendarDays.forEach((d) => map.set(d.date, d));
    return map;
  }, [calendarDays]);

  // Ngày hôm nay dạng YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Tính toán giới hạn chuyển tháng (từ tháng hiện tại đến tháng chứa ngày cuối cùng của 30 ngày)
  const { minMonthKey, maxMonthKey } = useMemo(() => {
    const now = new Date();
    const minKey = now.getFullYear() * 12 + now.getMonth();

    let maxKey = minKey;
    if (calendarDays.length > 0) {
      const lastDayStr = calendarDays[calendarDays.length - 1].date;
      const [ly, lm] = lastDayStr.split('-').map(Number);
      maxKey = ly * 12 + (lm - 1);
    }
    return { minMonthKey: minKey, maxMonthKey: maxKey };
  }, [calendarDays]);

  const currentViewMonthKey = viewDate.getFullYear() * 12 + viewDate.getMonth();
  const canGoPrevMonth = currentViewMonthKey > minMonthKey;
  const canGoNextMonth = currentViewMonthKey < maxMonthKey;

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return;
    Haptics.selectionAsync();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (!canGoNextMonth) return;
    Haptics.selectionAsync();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Tính ma trận các ô ngày của tháng đang xem (Lưới 7 cột)
  const monthCalendarGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth(); // 0 - 11

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // T2: 0, T3: 1, ..., CN: 6
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{
      key: string;
      dayNumber?: number;
      dateStr?: string;
      isCurrentMonth: boolean;
      isIn30DaysRange: boolean;
      isFullyBooked: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Các ô trống đầu tháng
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({
        key: `empty-start-${i}`,
        isCurrentMonth: false,
        isIn30DaysRange: false,
        isFullyBooked: false,
        isToday: false,
        isSelected: false,
      });
    }

    // Các ngày trong tháng
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = calendarDaysMap.get(dateStr);
      const isInRange = Boolean(dayData);
      const isFull = dayData?.is_fully_booked || false;
      const isSelected = selectedDate === dateStr;
      const isToday = dateStr === todayStr;

      cells.push({
        key: dateStr,
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isIn30DaysRange: isInRange,
        isFullyBooked: isFull,
        isToday,
        isSelected,
      });
    }

    return cells;
  }, [viewDate, calendarDaysMap, selectedDate, todayStr]);

  // Tổng số ca trống trong ngày đang chọn
  const totalAvailable = useMemo(() => {
    return timeSlots.filter((s) => s.is_available).length;
  }, [timeSlots]);

  // Thống kê số lượng ca trống khả dụng theo từng buổi
  const periodCounts = useMemo(() => {
    const counts: Record<TimePeriod, number> = {
      early: 0,
      morning: 0,
      afternoon: 0,
      evening: 0,
    };
    timeSlots.forEach((slot) => {
      if (slot.is_available) {
        const p = getSlotPeriod(slot.start_time);
        counts[p] += 1;
      }
    });
    return counts;
  }, [timeSlots]);

  // Lọc danh sách ca theo buổi đang chọn trong Modal
  const filteredSlots = useMemo(() => {
    return timeSlots.filter((slot) => getSlotPeriod(slot.start_time) === activePeriod);
  }, [timeSlots, activePeriod]);

  // Slot đang được chọn (active trong Modal hoặc đã chốt ở bên ngoài)
  const activeSlot = useMemo(() => {
    const target = tempTimeSlot || selectedTimeSlot;
    if (!target) return null;
    return timeSlots.find((s) => s.start_time.startsWith(target.substring(0, 5)));
  }, [timeSlots, tempTimeSlot, selectedTimeSlot]);

  // Xử lý khi người dùng chạm vào một ngày trên biểu lịch:
  // 1. Cập nhật ngày đã chọn
  // 2. Mở Modal chọn khung giờ ngay lập tức
  const handleSelectDay = (dateStr: string) => {
    Haptics.selectionAsync();
    onSelectDate(dateStr);
    setIsTimeModalVisible(true);
  };

  // Xác nhận khung giờ trong Modal và đóng Modal
  const handleConfirmTimeSlot = () => {
    if (!tempTimeSlot) {
      Alert.alert('Chưa Chọn Giờ', 'Vui lòng chạm chọn 1 khung giờ phù hợp.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelectTimeSlot(tempTimeSlot);
    setIsTimeModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* 1. HEADER SECTION */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="calendar" size={17} color={BrandColors.primary} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Lịch Hẹn Làm Đẹp (30 Ngày)</Text>
            <Text style={styles.sectionSubtitle}>Chạm ngày để mở danh sách khung giờ phục vụ</Text>
          </View>
        </View>
        <View style={styles.durationBadge}>
          <Ionicons name="time-outline" size={13} color="#64748B" />
          <Text style={styles.durationText}>{durationMinutes} phút</Text>
        </View>
      </View>

      {/* THÔNG BÁO YÊU CẦU CHỌN NGÀY KHI CHƯA CHỌN */}
      {!selectedDate && (
        <View style={styles.promptSelectDateBanner}>
          <Ionicons name="calendar-outline" size={16} color={BrandColors.primary} />
          <Text style={styles.promptSelectDateText}>Vui lòng chọn ngày cần đặt lịch make up</Text>
        </View>
      )}

      {/* 2. BIỂU LỊCH THÁNG (CALENDAR GRID) */}
      <View style={styles.calendarCard}>
        {/* Navigation chuyển tháng */}
        <View style={styles.monthNavRow}>
          <TouchableOpacity
            style={[styles.monthNavBtn, !canGoPrevMonth && styles.monthNavBtnDisabled]}
            disabled={!canGoPrevMonth}
            onPress={handlePrevMonth}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={canGoPrevMonth ? '#0F172A' : '#CBD5E1'}
            />
          </TouchableOpacity>

          <View style={styles.monthTitleWrapper}>
            <Text style={styles.monthTitleText}>
              Tháng {viewDate.getMonth() + 1}, {viewDate.getFullYear()}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.monthNavBtn, !canGoNextMonth && styles.monthNavBtnDisabled]}
            disabled={!canGoNextMonth}
            onPress={handleNextMonth}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={canGoNextMonth ? '#0F172A' : '#CBD5E1'}
            />
          </TouchableOpacity>
        </View>

        {/* Tiêu đề 7 thứ trong tuần */}
        <View style={styles.weekHeaderRow}>
          {WEEKDAY_HEADERS.map((w, idx) => (
            <View key={w} style={styles.weekHeaderCell}>
              <Text
                style={[
                  styles.weekHeaderText,
                  (idx === 5 || idx === 6) && styles.weekHeaderTextWeekend,
                ]}
              >
                {w}
              </Text>
            </View>
          ))}
        </View>

        {/* Lưới các ngày trong tháng */}
        {isLoadingDays && calendarDays.length === 0 ? (
          <View style={styles.calendarLoadingBox}>
            <ActivityIndicator size="small" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Đang tải biểu lịch 30 ngày...</Text>
          </View>
        ) : (
          <View style={styles.calendarGrid}>
            {monthCalendarGrid.map((cell) => {
              if (!cell.isCurrentMonth) {
                return <View key={cell.key} style={styles.dayCellEmpty} />;
              }

              const isClickable = cell.isIn30DaysRange && !cell.isFullyBooked;

              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[
                    styles.dayCell,
                    cell.isSelected && styles.dayCellSelected,
                    cell.isToday && !cell.isSelected && styles.dayCellToday,
                    !cell.isIn30DaysRange && styles.dayCellOutOfRange,
                    cell.isFullyBooked && styles.dayCellFullyBooked,
                  ]}
                  disabled={!cell.isIn30DaysRange || cell.isFullyBooked}
                  onPress={() => {
                    if (cell.dateStr) {
                      handleSelectDay(cell.dateStr);
                    }
                  }}
                  activeOpacity={isClickable ? 0.7 : 1}
                >
                  <Text
                    style={[
                      styles.dayNumberText,
                      cell.isSelected && styles.dayNumberTextSelected,
                      cell.isToday && !cell.isSelected && styles.dayNumberTextToday,
                      !cell.isIn30DaysRange && styles.dayNumberTextOutOfRange,
                      cell.isFullyBooked && styles.dayNumberTextFullyBooked,
                    ]}
                  >
                    {cell.dayNumber}
                  </Text>

                  {/* Chấm chỉ báo trạng thái ngày */}
                  {cell.isSelected ? (
                    <View style={styles.dayDotSelected} />
                  ) : cell.isFullyBooked ? (
                    <View style={styles.dayDotFull} />
                  ) : cell.isIn30DaysRange ? (
                    <View style={styles.dayDotAvailable} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Chú thích biểu lịch (Legend) */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: BrandColors.primary }]} />
            <Text style={styles.legendText}>Đang chọn</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Còn ca trống</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#CBD5E1' }]} />
            <Text style={styles.legendText}>Kín lịch / Qua ngày</Text>
          </View>
        </View>
      </View>

      {/* 3. THẺ TÓM TẮT LỊCH ĐÃ CHỌN (CHỈ HIỂN THỊ Ở DƯỚI BIỂU LỊCH SAU KHI ĐÃ CHỌN XONG CẢ NGÀY VÀ GIỜ) */}
      {Boolean(selectedDate) && Boolean(selectedTimeSlot) && (
        <TouchableOpacity
          style={styles.selectedScheduleBanner}
          onPress={() => {
            Haptics.selectionAsync();
            setTempTimeSlot(selectedTimeSlot);
            setIsTimeModalVisible(true);
          }}
          activeOpacity={0.85}
        >
          <View style={styles.bannerLeftContent}>
            <View style={styles.bannerClockBadge}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.bannerTextCol}>
              <Text style={styles.bannerLabelText}>Khung giờ đã chọn:</Text>
              <Text style={styles.bannerDateTimeText}>
                {selectedTimeSlot} • {formatDayOfWeekVietnamese(selectedDate)}
              </Text>
              {Boolean(activeSlot?.badge_label) && (
                <View style={styles.bannerActiveBadge}>
                  <Text style={styles.bannerActiveBadgeText}>{activeSlot?.badge_label}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.bannerEditBtn}>
            <Ionicons name="time" size={14} color={BrandColors.primary} />
            <Text style={styles.bannerEditBtnText}>Đổi giờ</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* 4. MODAL CHỌN KHUNG GIỜ MAKEUP (POPUP BOTTOMSHEET SANG TRỌNG) */}
      <SwipeableBottomSheet
        visible={isTimeModalVisible}
        onClose={() => setIsTimeModalVisible(false)}
        title="Chọn Khung Giờ Phục Vụ"
        subtitle={`${formatDayOfWeekVietnamese(selectedDate)} • ${
          totalAvailable > 0 ? `${totalAvailable} ca khả dụng` : 'Hết ca trống'
        }`}
      >
        <View style={{ paddingTop: 6 }}>

            {/* BỘ CHỌN 4 BUỔI CỐ ĐỊNH (SEGMENTED CONTROL 100% WIDTH - KHÔNG CUỘN NGANG) */}
            <View style={styles.modalSegmentContainer}>
              {PERIOD_TABS.map((p) => {
                const isTabActive = activePeriod === p.id;
                const count = periodCounts[p.id];
                const isZero = count === 0;

                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.modalSegmentTab,
                      isTabActive && styles.modalSegmentTabActive,
                      isZero && !isTabActive && styles.modalSegmentTabEmpty,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setActivePeriod(p.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalSegmentTopRow}>
                      <Ionicons
                        name={p.icon}
                        size={14}
                        color={isTabActive ? '#FFFFFF' : isZero ? '#94A3B8' : BrandColors.primary}
                      />
                      <Text
                        style={[
                          styles.modalSegmentTabText,
                          isTabActive && styles.modalSegmentTabTextActive,
                          isZero && !isTabActive && styles.modalSegmentTabTextEmpty,
                        ]}
                        numberOfLines={1}
                      >
                        {p.label}
                      </Text>
                    </View>

                    <View style={styles.modalSegmentBottomRow}>
                      <Text
                        style={[
                          styles.modalSegmentRangeText,
                          isTabActive && styles.modalSegmentRangeTextActive,
                        ]}
                      >
                        {p.timeRange}
                      </Text>

                      <View
                        style={[
                          styles.modalSegmentCountBadge,
                          isTabActive && styles.modalSegmentCountBadgeActive,
                          isZero && !isTabActive && styles.modalSegmentCountBadgeEmpty,
                        ]}
                      >
                        <Text
                          style={[
                            styles.modalSegmentCountText,
                            isTabActive && styles.modalSegmentCountTextActive,
                            isZero && !isTabActive && styles.modalSegmentCountTextEmpty,
                          ]}
                        >
                          {count}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* DANH SÁCH KHUNG GIỜ CUỘN TRONG MODAL */}
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {isLoadingSlots ? (
                <View style={styles.loaderBox}>
                  <ActivityIndicator size="small" color={BrandColors.primary} />
                  <Text style={styles.loadingText}>Đang kiểm tra ca trống & phụ phí từ máy chủ...</Text>
                </View>
              ) : filteredSlots.length === 0 ? (
                <View style={styles.emptyPeriodBox}>
                  <Ionicons name="time-outline" size={32} color="#CBD5E1" />
                  <Text style={styles.emptyPeriodTitle}>Không còn ca trống trong buổi này</Text>
                  <Text style={styles.emptyPeriodSub}>
                    Bạn vui lòng chạm chọn buổi khác ở phía trên hoặc đổi sang ngày hẹn kế tiếp.
                  </Text>
                </View>
              ) : (
                <View style={styles.timeGrid}>
                  {filteredSlots.map((slot) => {
                    const timeFormatted = slot.start_time.substring(0, 5);
                    const isSelected = tempTimeSlot.startsWith(timeFormatted);
                    const rawBadge = slot.badge_label;
                    const hasValidEarlySurcharge = Boolean(slot.surge_info?.surcharge_amount && slot.surge_info.surcharge_amount > 0);
                    // Nếu badge là Sớm nhưng thợ không cấu hình tiền phụ phí (>0), bỏ qua badge Sớm
                    const filteredRawBadge = rawBadge?.includes('Sớm') && !hasValidEarlySurcharge ? null : rawBadge;

                    const displayBadge =
                      filteredRawBadge ||
                      (slot.surge_info?.multiplier && slot.surge_info.multiplier < 1
                        ? `🎉 -${Math.round((1 - slot.surge_info.multiplier) * 100)}% Ưu đãi`
                        : slot.surge_info?.multiplier && slot.surge_info.multiplier > 1 && !filteredRawBadge
                        ? `🔥 +${Math.round((slot.surge_info.multiplier - 1) * 100)}% Cao điểm`
                        : hasValidEarlySurcharge && !filteredRawBadge
                        ? `⚡ Sớm +${Math.round((slot.surge_info?.surcharge_amount || 0) / 1000)}k`
                        : null);

                    // Phân loại kiểu badge từ backend
                    const isDiscount = Boolean(displayBadge?.includes('-')) || Boolean(slot.surge_info?.multiplier && slot.surge_info.multiplier < 1);
                    const isWeekendOrSurge =
                      Boolean(displayBadge?.includes('Cuối tuần')) ||
                      Boolean(displayBadge?.includes('Cao điểm')) ||
                      Boolean(slot.surge_info?.multiplier && slot.surge_info.multiplier > 1 && !displayBadge?.includes('Sớm'));
                    const isEarlyMorning =
                      Boolean(slot.surge_info?.surcharge_amount && slot.surge_info.surcharge_amount > 0) &&
                      (Boolean(displayBadge?.includes('Sớm')) || Boolean(slot.surge_info?.surcharge_type?.includes('EARLY_MORNING')));

                    // Kiểm tra khung giờ quá khứ hoặc < 1 tiếng nếu ngày đặt là ngày hôm nay
                    const now = new Date();
                    const isToday = selectedDate === todayStr;
                    const currentMinutesNow = now.getHours() * 60 + now.getMinutes();
                    const minAdvanceMinutes = currentMinutesNow + 60; // Đặt hẹn trước ít nhất 1 tiếng

                    const [slotH, slotM] = slot.start_time.split(':').map(Number);
                    const slotMinutes = slotH * 60 + slotM;
                    const isPastTime = isToday && slotMinutes < currentMinutesNow;
                    const isNearTime = isToday && slotMinutes >= currentMinutesNow && slotMinutes < minAdvanceMinutes;
                    const isAdvanceLocked = isToday && slotMinutes < minAdvanceMinutes;

                    const isAvailable = slot.is_available && !isAdvanceLocked;
                    const isRecommended = slot.is_recommended && isAvailable;

                    return (
                      <TouchableOpacity
                        key={`slot-${slot.start_time}`}
                        style={[
                          styles.timeSlotChip,
                          isSelected && styles.timeSlotChipSelected,
                          !isAvailable && styles.timeSlotChipDisabled,
                          isRecommended && !isSelected && styles.timeSlotChipRecommended,
                        ]}
                        onPress={() => {
                          if (!isAvailable) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            let title = 'Khung Giờ Đã Bận';
                            let reason = slot.unavailable_reason || 'Khung giờ này thợ make-up đã có ca hoặc đang trên đường di chuyển.';
                            if (isPastTime) {
                              title = 'Khung Giờ Đã Qua';
                              reason = 'Khung giờ này đã trôi qua trong ngày, vui lòng chọn ca hẹn sắp tới.';
                            } else if (isNearTime) {
                              title = 'Cần Đặt Trước 1 Tiếng';
                              reason = 'Dịch vụ hẹn trước yêu cầu chọn khung giờ cách thời điểm hiện tại ít nhất 1 tiếng để thợ kịp chuẩn bị và di chuyển đến nơi.';
                            }
                            Alert.alert(title, reason);
                            return;
                          }
                          Haptics.selectionAsync();
                          setTempTimeSlot(timeFormatted);
                        }}
                        activeOpacity={isAvailable ? 0.7 : 1}
                      >
                        <Text
                          style={[
                            styles.timeSlotText,
                            isSelected && styles.timeSlotTextSelected,
                            !isAvailable && styles.timeSlotTextDisabled,
                          ]}
                        >
                          {timeFormatted}
                        </Text>

                        {/* Badge hiển thị trực tiếp từ Backend */}
                        {Boolean(displayBadge) && isAvailable && (
                          <View
                            style={[
                              styles.slotBadge,
                              isDiscount && styles.slotBadgeDiscount,
                              isWeekendOrSurge && styles.slotBadgeSurge,
                              isEarlyMorning && styles.slotBadgeEarly,
                              isRecommended && !isDiscount && !isWeekendOrSurge && !isEarlyMorning && styles.slotBadgeRecommended,
                              isSelected && styles.slotBadgeSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.slotBadgeText,
                                isDiscount && styles.slotBadgeTextDiscount,
                                isWeekendOrSurge && styles.slotBadgeTextSurge,
                                isEarlyMorning && styles.slotBadgeTextEarly,
                                isRecommended && !isDiscount && !isWeekendOrSurge && !isEarlyMorning && styles.slotBadgeTextRecommended,
                                isSelected && styles.slotBadgeTextSelected,
                              ]}
                              numberOfLines={1}
                            >
                              {displayBadge}
                            </Text>
                          </View>
                        )}

                        {!isAvailable && (
                          <View style={styles.lockBadge}>
                            <Ionicons name="lock-closed" size={10} color="#94A3B8" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* HỘP GIẢI THÍCH CHI TIẾT CHÍNH SÁCH PHỤ PHÍ / GIẢM GIÁ TỪ BACKEND CHO SLOT ĐANG CHỌN */}
              {Boolean(activeSlot) && (() => {
                const currentSurge = activeSlot?.surge_info;
                const multiplier = currentSurge?.multiplier ?? 1;
                const surchargeAmount = currentSurge?.surcharge_amount ?? 0;
                const ruleName = currentSurge?.rule_name;

                return (
                  <View style={styles.policyNoticeWrapper}>
                    {/* 1. Phụ phí làm sớm (Early Morning) */}
                    {surchargeAmount > 0 && (
                      <View style={styles.earlyNoticeBox}>
                        <View style={styles.policyNoticeHeader}>
                          <Ionicons name="flash" size={15} color="#D97706" />
                          <Text style={styles.earlyNoticeTitle}>
                            {ruleName || 'Phụ Phí Làm Sáng Sớm'}
                          </Text>
                        </View>
                        <Text style={styles.policyNoticeDesc}>
                          Khung giờ {tempTimeSlot} áp dụng phụ phí sáng sớm{' '}
                          <Text style={styles.policyNoticeBold}>
                            +{formatCurrency(surchargeAmount)}
                          </Text>{' '}
                          theo chính sách hỗ trợ thợ chuẩn bị và di chuyển sớm.
                        </Text>
                      </View>
                    )}

                    {/* 2. Phụ phí cuối tuần / cao điểm (Surge Multiplier > 1) */}
                    {multiplier > 1 && (
                      <View style={styles.surgeNoticeBox}>
                        <View style={styles.policyNoticeHeader}>
                          <Ionicons name="flame" size={15} color="#E11D48" />
                          <Text style={styles.surgeNoticeTitle}>
                            {ruleName || 'Phụ Phí Cuối Tuần / Giờ Cao Điểm'}
                          </Text>
                        </View>
                        <Text style={styles.policyNoticeDesc}>
                          Khung giờ áp dụng hệ số điều chỉnh{' '}
                          <Text style={styles.policyNoticeBold}>
                            x{multiplier.toFixed(2)} (+{Math.round((multiplier - 1) * 100)}%)
                          </Text>{' '}
                          do nhu cầu làm đẹp cao điểm theo quy chế nền tảng.
                        </Text>
                      </View>
                    )}

                    {/* 3. Khung giờ được giảm giá (Discount Multiplier < 1) */}
                    {multiplier < 1 && (
                      <View style={styles.discountNoticeBox}>
                        <View style={styles.policyNoticeHeader}>
                          <Ionicons name="gift" size={15} color="#15803D" />
                          <Text style={styles.discountNoticeTitle}>
                            {ruleName || 'Ưu Đãi Khung Giờ Vàng'}
                          </Text>
                        </View>
                        <Text style={styles.policyNoticeDesc}>
                          Khung giờ này được áp dụng chương trình khuyến mãi giảm{' '}
                          <Text style={styles.policyNoticeBoldGreen}>
                            -{Math.round((1 - multiplier) * 100)}%
                          </Text>{' '}
                          chi phí dịch vụ trên hóa đơn.
                        </Text>
                      </View>
                    )}

                    {/* 4. Slot liền ca tối ưu */}
                    {Boolean(activeSlot?.is_recommended) && (
                      <View style={styles.recommendNoticeBox}>
                        <View style={styles.policyNoticeHeader}>
                          <Ionicons name="sparkles" size={15} color="#059669" />
                          <Text style={styles.recommendNoticeTitle}>Khung Giờ Tối Ưu Lịch Trình</Text>
                        </View>
                        <Text style={styles.policyNoticeDesc}>
                          Ca trang điểm này liền kề ca phục vụ trước đó của thợ, giúp thợ tối ưu quãng đường và luôn có mặt đúng hẹn nhất.
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
            </ScrollView>

            {/* CHÂN MODAL: NÚT XÁC NHẬN GIỜ PHỤC VỤ */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.confirmBtn, !tempTimeSlot && styles.confirmBtnDisabled]}
                disabled={!tempTimeSlot}
                onPress={handleConfirmTimeSlot}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>
                  {tempTimeSlot ? `Xác Nhận Giờ: ${tempTimeSlot}` : 'Vui lòng chọn khung giờ'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
      </SwipeableBottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  /* BANNER LỊCH ĐÃ CHỌN */
  selectedScheduleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  bannerLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bannerClockBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerLabelText: {
    fontSize: 11,
    color: '#9F1239',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bannerDateTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#881337',
    marginTop: 1,
  },
  bannerActiveBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDA4AF',
    marginTop: 3,
  },
  bannerActiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  bannerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDA4AF',
  },
  bannerEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },

  /* CALENDAR CARD */
  calendarCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthNavBtnDisabled: {
    opacity: 0.4,
  },
  monthTitleWrapper: {
    alignItems: 'center',
  },
  monthTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  weekHeaderTextWeekend: {
    color: BrandColors.primary,
  },
  calendarLoadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: 2,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF1F2',
  },
  dayCellOutOfRange: {
    opacity: 0.25,
  },
  dayCellFullyBooked: {
    opacity: 0.35,
    backgroundColor: '#F1F5F9',
  },
  dayNumberText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  dayNumberTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayNumberTextToday: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  dayNumberTextOutOfRange: {
    color: '#94A3B8',
  },
  dayNumberTextFullyBooked: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  dayDotSelected: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 2,
  },
  dayDotAvailable: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    marginTop: 2,
  },
  dayDotFull: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
  },

  /* MODAL OVERLAY & BOTTOM SHEET */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalBackdropDismiss: {
    flex: 1,
  },
  modalContentSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalHeaderSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  modalHeaderCount: {
    fontWeight: '700',
    color: '#10B981',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 4 SEGMENTED TABS (100% WIDTH - KHÔNG CUỘN NGANG) */
  modalSegmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalSegmentTab: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSegmentTabActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSegmentTabEmpty: {
    opacity: 0.45,
    backgroundColor: '#F1F5F9',
  },
  modalSegmentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalSegmentTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  modalSegmentTabTextActive: {
    color: '#FFFFFF',
  },
  modalSegmentTabTextEmpty: {
    color: '#94A3B8',
  },
  modalSegmentBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  modalSegmentRangeText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '500',
  },
  modalSegmentRangeTextActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  modalSegmentCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  modalSegmentCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  modalSegmentCountBadgeEmpty: {
    backgroundColor: 'transparent',
  },
  modalSegmentCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSegmentCountTextActive: {
    color: '#FFFFFF',
  },
  modalSegmentCountTextEmpty: {
    color: '#94A3B8',
  },

  /* MODAL SCROLLVIEW */
  modalScrollView: {
    maxHeight: 380,
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  /* LƯỚI KHUNG GIỜ */
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotChip: {
    width: '31.5%',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 56,
  },
  timeSlotChipSelected: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  timeSlotChipDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    opacity: 0.6,
  },
  timeSlotChipRecommended: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  timeSlotText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  timeSlotTextSelected: {
    color: '#FFFFFF',
  },
  timeSlotTextDisabled: {
    color: '#94A3B8',
  },

  /* BADGE TRONG TỪNG SLOT */
  slotBadge: {
    marginTop: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    maxWidth: '96%',
    alignItems: 'center',
  },
  slotBadgeDiscount: {
    backgroundColor: '#DCFCE7',
    borderWidth: 0.5,
    borderColor: '#BBF7D0',
  },
  slotBadgeSurge: {
    backgroundColor: '#FFE4E6',
    borderWidth: 0.5,
    borderColor: '#FECDD3',
  },
  slotBadgeEarly: {
    backgroundColor: '#FEF3C7',
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  slotBadgeRecommended: {
    backgroundColor: '#F3E8FF',
    borderWidth: 0.5,
    borderColor: '#E9D5FF',
  },
  slotBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 0,
  },
  slotBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  slotBadgeTextDiscount: {
    color: '#15803D',
  },
  slotBadgeTextSurge: {
    color: '#BE123C',
  },
  slotBadgeTextEarly: {
    color: '#B45309',
  },
  slotBadgeTextRecommended: {
    color: '#7E22CE',
  },
  slotBadgeTextSelected: {
    color: '#FFFFFF',
  },
  lockBadge: {
    marginTop: 4,
  },

  /* EMPTY / LOADER BOX */
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyPeriodBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 6,
  },
  emptyPeriodTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  emptyPeriodSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* BOX CHÍNH SÁCH PHỤ PHÍ / GIẢM GIÁ ĐỘNG TỪ BACKEND */
  policyNoticeWrapper: {
    marginTop: 16,
    gap: 8,
  },
  earlyNoticeBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
  },
  surgeNoticeBox: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 12,
  },
  discountNoticeBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
  },
  recommendNoticeBox: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    padding: 12,
  },
  policyNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  earlyNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  surgeNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BE123C',
  },
  discountNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  recommendNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D28D9',
  },
  policyNoticeDesc: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  policyNoticeBold: {
    fontWeight: '700',
    color: '#E11D48',
  },
  policyNoticeBoldGreen: {
    fontWeight: '700',
    color: '#15803D',
  },

  /* FOOTER MODAL */
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  promptSelectDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  promptSelectDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
  },
});
