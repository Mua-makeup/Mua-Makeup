import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkstationStore } from '@/store/workstation.store';

export const WorkstationStatCards: React.FC = () => {
  const stats = useWorkstationStore((s) => s.stats);

  const formatVnd = (amount: number) => {
    return (amount || 0).toLocaleString('vi-VN') + ' đ';
  };

  const handleOpenWallet = () => {
    Alert.alert(
      'Ví Tiền & Thu Nhập MUA',
      'Số dư ví và tiền cọc Escrow sau mỗi ca hoàn tất sẽ tự động cộng dồn vào ví của bạn.'
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. HERO EARNINGS BANNER (Thu nhập hôm nay - Nổi bật & Đẳng cấp) */}
      <View style={styles.heroCard}>
        <View style={styles.heroContentCol}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroIconCircle}>
              <Ionicons name="wallet" size={15} color="#E11D48" />
            </View>
            <Text style={styles.heroTagText}>THU NHẬP HÔM NAY</Text>
          </View>
          <Text style={styles.heroAmountText}>{formatVnd(stats.dailyEarnings)}</Text>
          <Text style={styles.heroDescText}>
            Thực nhận sau khi hoàn tất nghiệm thu ca làm
          </Text>
        </View>

        <TouchableOpacity
          style={styles.heroActionBtn}
          activeOpacity={0.8}
          onPress={handleOpenWallet}
        >
          <Text style={styles.heroActionBtnText}>Ví tiền</Text>
          <Ionicons name="chevron-forward" size={13} color="#E11D48" />
        </TouchableOpacity>
      </View>

      {/* 2. HAI THẺ THỐNG KÊ CÂN ĐỐI BÊN DƯỚI (Không bị co hẹp gãy chữ) */}
      <View style={styles.subCardsRow}>
        {/* Thẻ 1: Ca hoàn tất */}
        <View style={styles.subCard}>
          <View style={styles.subCardTop}>
            <View style={[styles.subIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="checkmark-done" size={16} color="#2563EB" />
            </View>
            <View style={styles.pillBlue}>
              <Text style={styles.pillBlueText}>Hôm nay</Text>
            </View>
          </View>

          <View style={styles.subNumberRow}>
            <Text style={styles.subNumber}>{stats.completedToday}</Text>
            <Text style={styles.subUnit}>ca</Text>
          </View>
          <Text style={styles.subLabel}>Ca đã hoàn tất</Text>
        </View>

        {/* Thẻ 2: Điểm đánh giá sao */}
        <View style={styles.subCard}>
          <View style={styles.subCardTop}>
            <View style={[styles.subIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={15} color="#D97706" />
            </View>
            <View style={styles.pillAmber}>
              <Text style={styles.pillAmberText}>Uy tín</Text>
            </View>
          </View>

          <View style={styles.subNumberRow}>
            <Text style={styles.subNumber}>
              {(stats.ratingAverage || 5.0).toFixed(1)}
            </Text>
            <Text style={styles.starIcon}>⭐</Text>
            <Text style={styles.reviewCount}>({stats.totalReviews || 0})</Text>
          </View>
          <Text style={styles.subLabel}>Điểm đánh giá sao</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF1F2',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroContentCol: {
    flex: 1,
    paddingRight: 10,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  heroIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#BE123C',
    letterSpacing: 0.5,
  },
  heroAmountText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#E11D48',
    letterSpacing: -0.5,
  },
  heroDescText: {
    fontSize: 11,
    color: '#9F1239',
    opacity: 0.8,
    marginTop: 2,
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  heroActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E11D48',
  },
  subCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  subCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  subIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBlue: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillBlueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  pillAmber: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillAmberText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  subNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  subNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  subUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  starIcon: {
    fontSize: 13,
  },
  reviewCount: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  subLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 3,
  },
});
