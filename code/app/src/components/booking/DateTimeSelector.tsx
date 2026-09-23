import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';

interface Props {
  selectedDate: string; // YYYY-MM-DD
  selectedTimeSlot: string; // HH:mm
  onSelectDate: (date: string) => void;
  onSelectTimeSlot: (timeSlot: string) => void;
}

const TIME_SLOTS = [
  { time: '05:00', isEarly: true },
  { time: '06:00', isEarly: false },
  { time: '07:30', isEarly: false },
  { time: '09:00', isEarly: false },
  { time: '10:30', isEarly: false },
  { time: '13:30', isEarly: false },
  { time: '15:00', isEarly: false },
  { time: '16:30', isEarly: false },
  { time: '18:00', isEarly: false },
  { time: '19:30', isEarly: false },
];

export const DateTimeSelector: React.FC<Props> = ({
  selectedDate,
  selectedTimeSlot,
  onSelectDate,
  onSelectTimeSlot,
}) => {
  // Tạo danh sách 14 ngày kể từ hôm nay
  const dateList = React.useMemo(() => {
    const list = [];
    const today = new Date();
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      list.push({
        dateString,
        dayOfMonth: d.getDate(),
        month: d.getMonth() + 1,
        dayOfWeek: i === 0 ? 'Hôm nay' : dayNames[d.getDay()],
      });
    }
    return list;
  }, []);

  const isEarlyHour = selectedTimeSlot.startsWith('05');

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons name="calendar-outline" size={18} color={BrandColors.primary} />
        <Text style={styles.sectionTitle}>Chọn Ngày & Khung Giờ Làm Đẹp</Text>
      </View>

      {/* CUỘN NGANG CHỌN NGÀY */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateSlider}
      >
        {dateList.map((item) => {
          const isSelected = item.dateString === selectedDate;
          return (
            <TouchableOpacity
              key={item.dateString}
              style={[styles.dateCard, isSelected && styles.dateCardSelected]}
              onPress={() => {
                Haptics.selectionAsync();
                onSelectDate(item.dateString);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayOfWeekText, isSelected && styles.dayOfWeekTextSelected]}>
                {item.dayOfWeek}
              </Text>
              <Text style={[styles.dayOfMonthText, isSelected && styles.dayOfMonthTextSelected]}>
                {item.dayOfMonth}
              </Text>
              <Text style={[styles.monthText, isSelected && styles.monthTextSelected]}>
                Th{item.month}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* LƯỚI CHỌN KHUNG GIỜ */}
      <View style={styles.timeGrid}>
        {TIME_SLOTS.map((slot) => {
          const isSelected = slot.time === selectedTimeSlot;
          return (
            <TouchableOpacity
              key={slot.time}
              style={[
                styles.timeSlotChip,
                isSelected && styles.timeSlotChipSelected,
                slot.isEarly && styles.earlySlotChip,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onSelectTimeSlot(slot.time);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextSelected]}>
                {slot.time}
              </Text>
              {slot.isEarly && (
                <View style={styles.earlyBadge}>
                  <Text style={styles.earlyBadgeText}>Sớm</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* CẢNH BÁO CA SÁNG SỚM NẾU CÓ */}
      {isEarlyHour && (
        <View style={styles.earlyNotice}>
          <Ionicons name="flash" size={14} color="#D97706" />
          <Text style={styles.earlyNoticeText}>
            Khung giờ 05:00 sáng áp dụng phụ phí giờ làm sớm (theo quy định nền tảng).
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateSlider: {
    paddingVertical: 4,
    gap: 8,
  },
  dateCard: {
    width: 62,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateCardSelected: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  dayOfWeekText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  dayOfWeekTextSelected: {
    color: '#FFFFFF',
  },
  dayOfMonthText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  dayOfMonthTextSelected: {
    color: '#FFFFFF',
  },
  monthText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  monthTextSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  timeSlotChip: {
    flexBasis: '23%',
    flexGrow: 1,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotChipSelected: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  earlySlotChip: {
    borderColor: '#FDE68A',
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  timeSlotTextSelected: {
    color: '#FFFFFF',
  },
  earlyBadge: {
    position: 'absolute',
    top: -5,
    right: -4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  earlyBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  earlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  earlyNoticeText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 15,
  },
});
