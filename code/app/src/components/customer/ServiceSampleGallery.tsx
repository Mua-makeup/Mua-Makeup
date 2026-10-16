import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  LayoutChangeEvent,
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

export const ServiceSampleGallery: React.FC<Props> = ({
  selectedPackage,
  showcases,
  isLoading,
  onPressPhoto,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = React.useState<number>(0);

  const onContainerLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - containerWidth) > 2) {
      setContainerWidth(width);
    }
  };

  // Tính toán chiều rộng và số cột động theo chuẩn đa màn hình (Mobile, Tablet, Web)
  const activeWidth = containerWidth > 0 ? containerWidth : windowWidth;
  const paddingH = 32; // paddingHorizontal 16 * 2
  const availableWidth = Math.max(260, activeWidth - paddingH);
  const numColumns = availableWidth >= 900 ? 4 : availableWidth >= 600 ? 3 : 2;
  const gap = 12;
  const columnWidth = Math.floor((availableWidth - gap * (numColumns - 1)) / numColumns);

  // Tổng hợp toàn bộ ảnh thực tế (Ảnh chính diện + Toàn bộ các góc chụp bổ sung)
  const allPhotos = React.useMemo(() => {
    const list: {
      id: string;
      photoUrl: string;
      title?: string;
      styleName?: string;
      originalShowcase: PortfolioShowcase;
      originalIndex: number;
    }[] = [];

    showcases.forEach((sc, scIdx) => {
      const mainUrl = sc.imageUrl || sc.thumbnailUrl;
      if (mainUrl) {
        list.push({
          id: `sc-${sc.id}-main`,
          photoUrl: mainUrl,
          title: sc.title,
          styleName: sc.styleName,
          originalShowcase: sc,
          originalIndex: scIdx,
        });
      }
      if (sc.additionalImages && sc.additionalImages.length > 0) {
        sc.additionalImages.forEach((addUrl, addIdx) => {
          if (addUrl) {
            list.push({
              id: `sc-${sc.id}-add-${addIdx}`,
              photoUrl: addUrl,
              title: sc.title ? `${sc.title} (Góc ${addIdx + 2})` : undefined,
              styleName: sc.styleName,
              originalShowcase: sc,
              originalIndex: scIdx,
            });
          }
        });
      }
    });

    // Nếu album chưa có ảnh riêng nhưng gói dịch vụ có ảnh đại diện -> nạp ảnh đại diện gói
    if (list.length === 0 && selectedPackage?.coverImageUrl) {
      list.push({
        id: `pkg-${selectedPackage.id}-cover`,
        photoUrl: selectedPackage.coverImageUrl,
        title: selectedPackage.packageName,
        styleName: selectedPackage.styles?.[0]?.styleName,
        originalShowcase: {
          id: 0,
          title: selectedPackage.packageName,
          imageUrl: selectedPackage.coverImageUrl,
        },
        originalIndex: 0,
      });
    }

    return list;
  }, [showcases, selectedPackage]);

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
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
      ) : allPhotos.length === 0 ? (
        /* TRẠNG THÁI CHƯA CÓ ẢNH RIÊNG CHO GÓI */
        <View style={styles.emptyBox}>
          <Ionicons name="camera-outline" size={36} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Chưa có ảnh mẫu riêng cho gói này</Text>
          <Text style={styles.emptySubtitle}>
            Thợ đang cập nhật các tác phẩm mới nhất cho gói {selectedPackage?.packageName}.
          </Text>
        </View>
      ) : (
        /* LƯỚI ẢNH MẪU ĐA MÀN HÌNH CHUẨN ĐẸP */
        <View style={[styles.grid, { gap }]}>
          {allPhotos.map((item) => {
            const photoUrl =
              item.photoUrl ||
              'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500&auto=format&fit=crop&q=80';

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { width: columnWidth }]}
                onPress={() => onPressPhoto(item.originalShowcase, item.originalIndex)}
                activeOpacity={0.85}
              >
                <View style={styles.imageBox}>
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.image}
                    contentFit="cover"
                    transition={250}
                  />
                  <View style={styles.zoomHintOverlay}>
                    <Ionicons name="scan-outline" size={13} color="#FFFFFF" />
                    <Text style={styles.zoomHintText}>Soi cận cảnh</Text>
                  </View>
                </View>

                {item.title ? (
                  <View style={styles.captionContainer}>
                    <Text style={styles.captionText} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.styleName ? (
                      <Text style={styles.styleBadge} numberOfLines={1}>
                        {item.styleName}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
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
    overflow: 'hidden',
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
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imageBox: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  zoomHintOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
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
    paddingHorizontal: 8,
    paddingVertical: 6,
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
