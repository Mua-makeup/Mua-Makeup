import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { PortfolioShowcase } from '@/services/mua-profile.service';
import { PackageDetail } from '@/services/package.service';
import { Skeleton } from '@/components/base/Skeleton';

interface Props {
  selectedPackage: PackageDetail | null;
  showcases: PortfolioShowcase[];
  isLoading: boolean;
  onPressPhoto: (photo: PortfolioShowcase, index: number, angleIndex?: number) => void;
}

interface PhotoItem {
  id: string;
  photoUrl: string;
  title?: string;
  styleName?: string;
  originalShowcase: PortfolioShowcase;
  originalIndex: number;
  angleIndex: number;
}

export const ServiceSampleGallery: React.FC<Props> = ({
  selectedPackage,
  showcases,
  isLoading,
  onPressPhoto,
}) => {
  // Tổng hợp toàn bộ ảnh thực tế (Ảnh chính diện + Toàn bộ các góc chụp bổ sung)
  const allPhotos = React.useMemo<PhotoItem[]>(() => {
    const list: PhotoItem[] = [];

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
          angleIndex: 0,
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
              angleIndex: addIdx + 1,
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
        angleIndex: 0,
      });
    }

    return list;
  }, [showcases, selectedPackage]);

  // Render 1 ô ảnh đơn lẻ trong Collage
  const renderPhotoItem = (
    item: PhotoItem,
    customStyle?: any,
    overlayText?: string
  ) => {
    const photoUrl =
      item.photoUrl ||
      'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500&auto=format&fit=crop&q=80';

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.photoTouch, customStyle]}
        onPress={() => onPressPhoto(item.originalShowcase, item.originalIndex, item.angleIndex)}
        activeOpacity={0.88}
      >
        <Image
          source={{ uri: photoUrl }}
          style={styles.photoImg}
          contentFit="cover"
          transition={200}
        />

        {/* Lớp phủ +N kiểu Facebook khi có nhiều hơn 5 ảnh */}
        {overlayText && (
          <View style={styles.moreOverlay}>
            <Text style={styles.moreOverlayText}>{overlayText}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Bố cục Facebook Collage theo số lượng ảnh với rãnh trắng cách biệt
  const renderFacebookCollage = () => {
    const total = allPhotos.length;

    // Trường hợp 1 ảnh duy nhất: Ảnh to toàn màn hình tỷ lệ 16:10
    if (total === 1) {
      return (
        <View style={styles.collageContainer}>
          <View style={{ width: '100%', height: 230 }}>
            {renderPhotoItem(allPhotos[0], { width: '100%', height: '100%' })}
          </View>
        </View>
      );
    }

    // Trường hợp 2 ảnh: 2 ảnh chia đôi 50% - 50% nằm ngang
    if (total === 2) {
      return (
        <View style={styles.collageContainer}>
          <View style={[styles.flexRow, { height: 200 }]}>
            {renderPhotoItem(allPhotos[0], styles.flex1)}
            {renderPhotoItem(allPhotos[1], styles.flex1)}
          </View>
        </View>
      );
    }

    // Trường hợp 3 ảnh: 1 ảnh to bên trái chiếm 62% + 2 ảnh nhỏ bên phải xếp chồng
    if (total === 3) {
      return (
        <View style={styles.collageContainer}>
          <View style={[styles.flexRow, { height: 235 }]}>
            {renderPhotoItem(allPhotos[0], { flex: 1.6, height: '100%' })}
            <View style={[styles.flexCol, { flex: 1 }]}>
              {renderPhotoItem(allPhotos[1], styles.flex1)}
              {renderPhotoItem(allPhotos[2], styles.flex1)}
            </View>
          </View>
        </View>
      );
    }

    // Trường hợp 4 ảnh: Lưới 2x2 cân xứng (2 hàng x 2 cột) với rãnh trắng ngăn cách
    if (total === 4) {
      return (
        <View style={styles.collageContainer}>
          <View style={[styles.flexCol, { height: 240 }]}>
            <View style={[styles.flexRow, styles.flex1]}>
              {renderPhotoItem(allPhotos[0], styles.flex1)}
              {renderPhotoItem(allPhotos[1], styles.flex1)}
            </View>
            <View style={[styles.flexRow, styles.flex1]}>
              {renderPhotoItem(allPhotos[2], styles.flex1)}
              {renderPhotoItem(allPhotos[3], styles.flex1)}
            </View>
          </View>
        </View>
      );
    }

    // Trường hợp 5 ảnh hoặc nhiều hơn: Hàng trên 2 ảnh to, hàng dưới 3 ảnh nhỏ (kèm +N ở ảnh cuối)
    const extraCount = total - 5;
    return (
      <View style={styles.collageContainer}>
        <View style={[styles.flexCol, { height: 260 }]}>
          {/* Hàng trên: 2 ảnh to (chiếm 58% chiều cao) */}
          <View style={[styles.flexRow, { height: 152 }]}>
            {renderPhotoItem(allPhotos[0], styles.flex1)}
            {renderPhotoItem(allPhotos[1], styles.flex1)}
          </View>

          {/* Hàng dưới: 3 ảnh nhỏ (chiếm 42% chiều cao) */}
          <View style={[styles.flexRow, { height: 104 }]}>
            {renderPhotoItem(allPhotos[2], styles.flex1)}
            {renderPhotoItem(allPhotos[3], styles.flex1)}
            {renderPhotoItem(
              allPhotos[4],
              styles.flex1,
              extraCount > 0 ? `+${extraCount + 1}` : undefined
            )}
          </View>
        </View>
      </View>
    );
  };

  const primaryStyleName =
    allPhotos[0]?.styleName || selectedPackage?.styles?.[0]?.styleName;

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
          Tác phẩm thực tế gắn với gói dịch vụ này (Chạm vào ảnh để zoom cận cảnh)
        </Text>
      </View>

      {/* TRẠNG THÁI ĐANG TẢI */}
      {isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', gap: 6, height: 180 }}>
            <View style={{ flex: 2 }}>
              <Skeleton width="100%" height={180} borderRadius={12} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="100%" height={87} borderRadius={10} />
              <Skeleton width="100%" height={87} borderRadius={10} />
            </View>
          </View>
        </View>
      ) : allPhotos.length === 0 ? (
        /* TRẠNG THÁI CHƯA CÓ ẢNH RIÊNG CHO GÓI */
        <View style={styles.emptyBox}>
          <Ionicons name="camera-outline" size={36} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Chưa có ảnh mẫu riêng cho gói này</Text>
          <Text style={styles.emptySubtitle}>
            Đơn vị đang cập nhật các tác phẩm mẫu mới nhất cho gói {selectedPackage?.packageName}.
          </Text>
        </View>
      ) : (
        /* KHỐI FACEBOOK MULTI-PHOTO COLLAGE */
        <View style={styles.galleryWrapper}>
          {renderFacebookCollage()}

          {/* THANH FOOTER THÔNG TIN & XEM TẤT CẢ */}
          <View style={styles.footerRow}>
            <View style={styles.footerInfo}>
              {allPhotos[0]?.title ? (
                <Text style={styles.footerTitle} numberOfLines={1}>
                  {allPhotos[0].title}
                </Text>
              ) : null}
              {primaryStyleName ? (
                <View style={styles.styleBadgeWrapper}>
                  <View style={styles.styleDot} />
                  <Text style={styles.styleBadgeText} numberOfLines={1}>
                    {primaryStyleName}
                  </Text>
                </View>
              ) : null}
            </View>

            {allPhotos.length > 1 && (
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => onPressPhoto(allPhotos[0].originalShowcase, allPhotos[0].originalIndex)}
                activeOpacity={0.8}
              >
                <Ionicons name="albums-outline" size={14} color={BrandColors.primary} />
                <Text style={styles.viewAllText}>
                  Xem trọn bộ ({allPhotos.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
    paddingBottom: 20,
    overflow: 'hidden',
  },
  header: {
    marginBottom: 12,
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
  galleryWrapper: {
    width: '100%',
  },
  collageContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 3,
  },
  flexRow: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#FFFFFF',
  },
  flexCol: {
    flexDirection: 'column',
    gap: 4,
    backgroundColor: '#FFFFFF',
  },
  flex1: {
    flex: 1,
    height: '100%',
  },
  photoTouch: {
    backgroundColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 6,
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  moreOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  moreOverlayText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 2,
  },
  footerInfo: {
    flex: 1,
    marginRight: 10,
  },
  footerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  styleBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  styleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.primary,
  },
  styleBadgeText: {
    fontSize: 11,
    color: BrandColors.primary,
    fontWeight: '600',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
});

