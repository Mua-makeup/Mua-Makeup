import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { PackageDetail } from '@/services/package.service';
import { MuaPublicProfile } from '@/services/mua-profile.service';

interface Props {
  packageDetail: PackageDetail | null;
  muaProfile: MuaPublicProfile | null;
}

export const BookingHeaderCard: React.FC<Props> = ({ packageDetail, muaProfile }) => {
  const formattedPrice = packageDetail
    ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(packageDetail.price)
    : '0 đ';

  return (
    <View style={styles.card}>
      <Image
        source={{ uri: packageDetail?.coverImageUrl || 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=600' }}
        style={styles.coverImage}
        contentFit="cover"
      />
      <View style={styles.infoContainer}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>
            {packageDetail?.categoryName || 'Trang điểm'}
          </Text>
        </View>

        <Text style={styles.packageName} numberOfLines={2}>
          {packageDetail?.packageName || 'Gói Dịch Vụ Làm Đẹp'}
        </Text>

        <View style={styles.muaRow}>
          <Image
            source={{ uri: muaProfile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200' }}
            style={styles.muaAvatar}
            contentFit="cover"
          />
          <Text style={styles.muaName} numberOfLines={1}>
            {muaProfile?.fullName || 'Chuyên viên MUA'}
          </Text>
          <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {muaProfile?.ratingAverage ? muaProfile.ratingAverage.toFixed(1) : '5.0'}
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.priceLabel}>Giá niêm yết:</Text>
          <Text style={styles.priceValue}>{formattedPrice}</Text>
          <View style={styles.durationChip}>
            <Ionicons name="time-outline" size={12} color="#64748B" />
            <Text style={styles.durationText}>
              {packageDetail?.durationMinutes || 60} phút
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  coverImage: {
    width: 95,
    height: 105,
    borderRadius: 14,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  packageName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    marginTop: 3,
  },
  muaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  muaAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  muaName: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    maxWidth: 120,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  durationText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
});
