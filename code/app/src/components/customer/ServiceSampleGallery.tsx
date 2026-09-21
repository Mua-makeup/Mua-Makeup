import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { PortfolioShowcase } from '@/services/mua-profile.service';
import { PackageDetail } from '@/services/package.service';

interface Props {
  selectedPackage: PackageDetail | null;
  showcases: PortfolioShowcase[];
  isLoading: boolean;
  onPressPhoto: (photo: PortfolioShowcase, index: number) => void;
}

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 32 - 12) / 2;

export const ServiceSampleGallery: React.FC<Props> = ({
  selectedPackage,
  showcases,
  isLoading,
  onPressPhoto,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="images-outline" size={18} color={BrandColors.primary} />
          <Text style={styles.title}>
            Ảnh Mẫu Thực Tế: {selectedPackage?.packageName || 'Dịch Vụ'}
          </Text>
        </View>
        <Text style={styles.subtitle}>
          Tác phẩm thợ đã hoàn thành cho gói này (Chạm vào ảnh để zoom cận cảnh)
        </Text>
      </View>

      {/* TRẠNG THÁI ĐANG TẢI */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải bộ sưu tập ảnh của gói...</Text>
        </View>
      ) : showcases.length === 0 ? (
        /* TRẠNG THÁI CHƯA CÓ ẢNH RIÊNG CHO GÓI */
        <View style={styles.emptyBox}>
          <Ionicons name="camera-outline" size={36} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Chưa có ảnh mẫu riêng cho gói này</Text>
          <Text style={styles.emptySubtitle}>
            Thợ đang cập nhật các tác phẩm mới nhất cho gói {selectedPackage?.packageName}.
          </Text>
        </View>
      ) : (
        /* LƯỚI ẢNH MẪU 2 CỘT */
        <View style={styles.grid}>
          {showcases.map((item, index) => {
            const photoUrl =
              item.imageUrl ||
              item.thumbnailUrl ||
              'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500&auto=format&fit=crop&q=80';

            return (
              <TouchableOpacity
                key={`showcase-${item.id}-${index}`}
                style={styles.card}
                onPress={() => onPressPhoto(item, index)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.image}
                  contentFit="cover"
                  transition={250}
                />
                <View style={styles.zoomHintOverlay}>
                  <Ionicons name="scan-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.zoomHintText}>Soi cận cảnh</Text>
                </View>

                {item.title && (
                  <View style={styles.captionContainer}>
                    <Text style={styles.captionText} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.styleName && (
                      <Text style={styles.styleBadge}>{item.styleName}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: COLUMN_WIDTH,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  image: {
    width: '100%',
    height: 190,
  },
  zoomHintOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  zoomHintText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  captionContainer: {
    padding: 8,
    backgroundColor: '#FFFFFF',
  },
  captionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  styleBadge: {
    fontSize: 10,
    color: BrandColors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
});
