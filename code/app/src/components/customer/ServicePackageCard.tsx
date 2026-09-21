import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { PackageSummary } from '@/services/package.service';

interface Props {
  item: PackageSummary;
  onPress: () => void;
}

export const ServicePackageCard: React.FC<Props> = ({ item, onPress }) => {
  // Ảnh cover demo nếu gói chưa có ảnh trên backend
  const coverUrl =
    item.coverImageUrl ||
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&auto=format&fit=crop&q=80';

  const formattedPrice = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(item.price);

  const duration = item.durationMinutes || item.estimatedDurationMinutes || 60;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* ẢNH COVER TỈ LỆ 16:9 */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: coverUrl }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        {item.categoryName && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.categoryName}</Text>
          </View>
        )}
        <View style={styles.durationBadge}>
          <Ionicons name="time-outline" size={12} color="#FFFFFF" />
          <Text style={styles.durationText}>{duration} phút</Text>
        </View>
      </View>

      {/* NỘI DUNG GÓI DỊCH VỤ */}
      <View style={styles.content}>
        {/* Tên thợ hoặc Studio */}
        <View style={styles.authorRow}>
          <Ionicons name="person-circle-outline" size={16} color={BrandColors.slateMuted} />
          <Text style={styles.authorName} numberOfLines={1}>
            {item.muaName || item.agencyName || 'Chuyên viên Make-up'}
          </Text>
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.ratingText}>4.95</Text>
          </View>
        </View>

        {/* Tên gói dịch vụ */}
        <Text style={styles.packageName} numberOfLines={2}>
          {item.packageName}
        </Text>

        {/* Danh sách styles tags */}
        {item.styles && item.styles.length > 0 && (
          <View style={styles.tagsRow}>
            {item.styles.slice(0, 2).map((s) => (
              <View key={`tag-${s.id || s.styleId}`} style={styles.tagPill}>
                <Text style={styles.tagText}>{s.styleName}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Hàng giá & Nút Xem chi tiết */}
        <View style={styles.footerRow}>
          <View>
            <Text style={styles.priceLabel}>Giá trọn gói</Text>
            <Text style={styles.priceValue}>{formattedPrice}</Text>
          </View>
          <View style={styles.detailBtn}>
            <Text style={styles.detailBtnText}>Xem thợ & ảnh mẫu</Text>
            <Ionicons name="chevron-forward" size={14} color={BrandColors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  content: {
    padding: 14,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    flex: 1,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  packageName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  tagPill: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  priceLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },
});
