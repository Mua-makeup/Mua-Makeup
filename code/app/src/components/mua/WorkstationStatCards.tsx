import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkstationStore } from '@/store/workstation.store';
import { useAuthStore } from '@/store/auth.store';
import { MuaReviewsModal } from '@/components/mua/MuaReviewsModal';

export const WorkstationStatCards: React.FC = () => {
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const stats = useWorkstationStore((s) => s.stats);
  const profile = useWorkstationStore((s) => s.profile);
  const isAgencyStaff = useAuthStore((s) => s.userInfo?.roles?.includes('ROLE_AGENCY_STAFF'));
  const isMUA = useAuthStore((s) => s.userInfo?.roles?.includes('ROLE_FREELANCE_MUA'));
  const isArtist = isMUA || isAgencyStaff;

  const effectiveMuaId = profile?.muaId || (profile as any)?.id;

  const formatVnd = (amount: number) => {
    return (amount || 0).toLocaleString('vi-VN') + ' đ';
  };

  const handleOpenWallet = () => {
    router.push(isArtist ? '/profile/freelancer-wallet' : '/profile/customer-wallet');
  };

  const handleOpenReviews = () => {
    if (!effectiveMuaId) {
      Alert.alert('Thông báo', 'Đang tải thông tin chuyên viên, vui lòng thử lại sau.');
      return;
    }
    setIsReviewModalVisible(true);
  };

  const hasReviews = stats.totalReviews > 0 && stats.ratingAverage != null;

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
          accessibilityRole="button"
          accessibilityLabel={isArtist ? 'Mở ví chuyên viên' : 'Mở ví khách hàng'}
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

        {/* Thẻ 2: Điểm đánh giá sao (Bấm được để xem danh sách feedback) */}
        <TouchableOpacity
          style={styles.subCard}
          activeOpacity={0.75}
          onPress={handleOpenReviews}
          accessibilityRole="button"
          accessibilityLabel="Xem chi tiết đánh giá từ khách hàng"
        >
          <View style={styles.subCardTop}>
            <View style={[styles.subIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={15} color="#D97706" />
            </View>
            <View style={styles.pillAmber}>
              <Text style={styles.pillAmberText}>Uy tín &bull; Xem &gt;</Text>
            </View>
          </View>

          <View style={styles.subNumberRow}>
            {hasReviews ? (
              <>
                <Text style={styles.subNumber}>
                  {stats.ratingAverage!.toFixed(1)}
                </Text>
                <Text style={styles.starIcon}>⭐</Text>
                <Text style={styles.reviewCount}>({stats.totalReviews})</Text>
              </>
            ) : (
              <>
                <View style={styles.newBadgeInline}>
                  <Text style={styles.newBadgeInlineText}>MỚI</Text>
                </View>
                <Text style={styles.starIcon}>⭐</Text>
                <Text style={styles.reviewCount}>(0)</Text>
              </>
            )}
          </View>
          <Text style={styles.subLabel}>
            {hasReviews ? 'Điểm đánh giá sao' : 'Chưa có đánh giá'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal xem đánh giá của thợ */}
      {effectiveMuaId ? (
        <MuaReviewsModal
          visible={isReviewModalVisible}
          onClose={() => setIsReviewModalVisible(false)}
          muaId={effectiveMuaId}
          muaName={profile?.fullName}
          isOwnerView={true}
        />
      ) : null}
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
  newBadgeInline: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  newBadgeInlineText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
});
