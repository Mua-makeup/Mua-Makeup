import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { packageService, PackageDetail } from '@/services/package.service';
import { parseApiError } from '@/utils/error';
import { ImageViewerModal } from '@/components/common/ImageViewerModal';
import { DetailScreenSkeleton } from '@/components/base/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_CONTAINER_WIDTH = SCREEN_WIDTH - 32;

export default function StaffPackageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const packageId = Number(id);

  const [isLoading, setIsLoading] = useState(true);
  const [pkgDetail, setPkgDetail] = useState<PackageDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Gallery slider state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const imageScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let isMounted = true;
    if (!packageId || isNaN(packageId)) {
      setErrorMessage('Không tìm thấy thông tin gói dịch vụ.');
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const pkg = await packageService.getPackageById(packageId);
        if (!isMounted) return;
        setPkgDetail(pkg);
      } catch (err: any) {
        if (!isMounted) return;
        const parsed = parseApiError(err);
        setErrorMessage(parsed.message || 'Không thể tải chi tiết gói dịch vụ lúc này.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [packageId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={BrandColors.slateHeading} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi Tiết Gói Dịch Vụ</Text>
          <View style={{ width: 36 }} />
        </View>
        <DetailScreenSkeleton />
      </SafeAreaView>
    );
  }

  if (errorMessage || !pkgDetail) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={BrandColors.slateHeading} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi Tiết Gói Dịch Vụ</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <Text style={styles.errorTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.errorSub}>{errorMessage || 'Gói dịch vụ không tồn tại hoặc đã bị xóa.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Thu thập TẤT CẢ hình ảnh của gói để hiển thị trọn vẹn
  const allImages: string[] = [];
  if (pkgDetail.coverImageUrl) {
    allImages.push(pkgDetail.coverImageUrl);
  }
  if (pkgDetail.galleryImages && Array.isArray(pkgDetail.galleryImages)) {
    for (const img of pkgDetail.galleryImages) {
      if (img && !allImages.includes(img)) {
        allImages.push(img);
      }
    }
  }
  if (pkgDetail.styles && Array.isArray(pkgDetail.styles)) {
    for (const st of pkgDetail.styles) {
      if ((st as any).sampleImages && Array.isArray((st as any).sampleImages)) {
        for (const img of (st as any).sampleImages) {
          if (img && !allImages.includes(img)) {
            allImages.push(img);
          }
        }
      }
      if ((st as any).imageUrl && !allImages.includes((st as any).imageUrl)) {
        allImages.push((st as any).imageUrl);
      }
    }
  }

  const durationMin = pkgDetail.durationMinutes || pkgDetail.estimatedDurationMinutes || 60;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / IMAGE_CONTAINER_WIDTH);
    if (index >= 0 && index < allImages.length && index !== activeImageIndex) {
      setActiveImageIndex(index);
    }
  };

  const handleSelectThumbnail = (index: number) => {
    setActiveImageIndex(index);
    imageScrollRef.current?.scrollTo({
      x: index * IMAGE_CONTAINER_WIDTH,
      animated: true,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={BrandColors.slateHeading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Chi Tiết Gói Dịch Vụ
        </Text>
        <View style={styles.headerRight}>
          {pkgDetail.agencyName ? (
            <View style={styles.studioPill}>
              <Ionicons name="business" size={11} color="#0369A1" />
              <Text style={styles.studioPillText} numberOfLines={1}>
                {pkgDetail.agencyName}
              </Text>
            </View>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO CARD: GALLERY HÌNH ẢNH TOÀN DIỆN (KHÔNG BỊ CẮT XÉN) */}
        <View style={styles.heroCard}>
          {allImages.length > 0 ? (
            <View style={styles.galleryWrapper}>
              <ScrollView
                ref={imageScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                style={styles.imageScroll}
              >
                {allImages.map((imgUri, idx) => (
                  <TouchableOpacity
                    key={`hero-img-${idx}`}
                    style={styles.imageSlide}
                    activeOpacity={0.9}
                    onPress={() => setPreviewImageUrl(imgUri)}
                  >
                    <Image
                      source={{ uri: imgUri }}
                      style={styles.fullHeroImage}
                      contentFit="contain"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Chỉ số ảnh & Nút phóng to */}
              <View style={styles.imageOverlayControls}>
                <View style={styles.imageCountPill}>
                  <Text style={styles.imageCountText}>
                    {activeImageIndex + 1} / {allImages.length}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.zoomPill}
                  activeOpacity={0.8}
                  onPress={() => setPreviewImageUrl(allImages[activeImageIndex])}
                >
                  <Ionicons name="expand" size={12} color="#FFFFFF" />
                  <Text style={styles.zoomPillText}>Xem trọn ảnh</Text>
                </TouchableOpacity>
              </View>

              {/* Dải thumbnail nếu có từ 2 ảnh trở lên */}
              {allImages.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbnailStrip}
                >
                  {allImages.map((thumbUri, idx) => {
                    const isSelected = idx === activeImageIndex;
                    return (
                      <TouchableOpacity
                        key={`thumb-${idx}`}
                        style={[styles.thumbnailBox, isSelected && styles.thumbnailBoxActive]}
                        activeOpacity={0.8}
                        onPress={() => handleSelectThumbnail(idx)}
                      >
                        <Image
                          source={{ uri: thumbUri }}
                          style={styles.thumbnailImg}
                          contentFit="cover"
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          ) : (
            <View style={styles.heroCoverPlaceholder}>
              <Ionicons name="image-outline" size={44} color="#CBD5E1" />
              <Text style={styles.noImageText}>Studio chưa tải ảnh cho gói dịch vụ này</Text>
            </View>
          )}

          {/* Chi tiết tiêu đề & giá */}
          <View style={styles.heroDetails}>
            {pkgDetail.categoryName ? (
              <View style={styles.categoryBadge}>
                <Ionicons name="pricetag-outline" size={11} color={BrandColors.primary} />
                <Text style={styles.categoryBadgeText}>{pkgDetail.categoryName}</Text>
              </View>
            ) : null}

            <Text style={styles.packageName}>{pkgDetail.packageName}</Text>

            <View style={styles.metaRow}>
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>Giá niêm yết</Text>
                <Text style={styles.priceValue}>
                  {pkgDetail.price != null ? `${pkgDetail.price.toLocaleString('vi-VN')} đ` : 'Liên hệ'}
                </Text>
              </View>

              <View style={styles.durationPill}>
                <Ionicons name="time-outline" size={14} color="#0F172A" />
                <Text style={styles.durationText}>{durationMin} phút</Text>
              </View>
            </View>
          </View>
        </View>

        {/* MÔ TẢ CHI TIẾT GÓI DỊCH VỤ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="document-text-outline" size={16} color={BrandColors.slateHeading} />
            <Text style={styles.sectionTitle}>Mô Tả Dịch Vụ</Text>
          </View>
          <Text style={styles.descriptionText}>
            {pkgDetail.description || 'Chưa có thông tin mô tả chi tiết cho gói dịch vụ này.'}
          </Text>
        </View>

        {/* CÁC BƯỚC VÀ HẠNG MỤC THỰC HIỆN */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="list-outline" size={16} color={BrandColors.slateHeading} />
            <Text style={styles.sectionTitle}>
              Quy Trình & Hạng Mục ({pkgDetail.items?.length || 0})
            </Text>
          </View>

          {(!pkgDetail.items || pkgDetail.items.length === 0) ? (
            <Text style={styles.emptyText}>Studio chưa cập nhật chi tiết các bước quy trình.</Text>
          ) : (
            <View style={styles.itemsList}>
              {pkgDetail.items.map((item, idx) => (
                <View key={item.id || idx} style={styles.itemRow}>
                  <View style={styles.itemStepCircle}>
                    <Text style={styles.itemStepNum}>{idx + 1}</Text>
                  </View>
                  <View style={styles.itemContent}>
                    <View style={styles.itemTitleLine}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.itemName}</Text>
                      {item.durationMinutes ? (
                        <View style={styles.itemDurationPill}>
                          <Text style={styles.itemDurationText}>{item.durationMinutes}p</Text>
                        </View>
                      ) : null}
                    </View>
                    {item.description ? (
                      <Text style={styles.itemDesc}>{item.description}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* PHONG CÁCH MAKE-UP ÁP DỤNG */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="color-palette-outline" size={16} color={BrandColors.slateHeading} />
            <Text style={styles.sectionTitle}>
              Phong Cách Áp Dụng ({pkgDetail.styles?.length || 0})
            </Text>
          </View>

          {(!pkgDetail.styles || pkgDetail.styles.length === 0) ? (
            <Text style={styles.emptyText}>Gói áp dụng theo yêu cầu phong cách của khách hàng.</Text>
          ) : (
            <View style={styles.stylesWrap}>
              {pkgDetail.styles.map((st) => (
                <View key={st.id} style={styles.stylePill}>
                  <Ionicons name="color-palette-outline" size={13} color="#E11D48" />
                  <Text style={styles.stylePillText}>{st.styleName}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* THÔNG TIN HỖ TRỢ KỸ THUẬT & QUY ĐỊNH */}
        <View style={styles.policyCard}>
          <Ionicons name="information-circle-outline" size={16} color="#0284C7" />
          <Text style={styles.policyText}>
            Thợ Studio vui lòng tuân thủ quy trình chuẩn và đúng thời lượng {durationMin} phút khi thực hiện cho khách hàng. Mọi thắc mắc cần hỗ trợ, liên hệ quản lý Studio.
          </Text>
        </View>

        <View style={{ height: 36 }} />
      </ScrollView>

      {/* MODAL XEM PHÓNG TO TOÀN BỘ ẢNH (CHẠM NGOÀI HOẶC VUỐT XUỐNG ĐỂ TẮT) */}
      <ImageViewerModal
        visible={!!previewImageUrl}
        images={previewImageUrl ? [previewImageUrl] : []}
        title="Ảnh gói dịch vụ"
        onClose={() => setPreviewImageUrl(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.slateHeading,
    marginHorizontal: 8,
  },
  headerRight: {
    minWidth: 36,
    alignItems: 'flex-end',
  },
  studioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#BAE6FD',
    maxWidth: 120,
  },
  studioPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: BrandColors.slateMuted,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.slateHeading,
    marginTop: 8,
  },
  errorSub: {
    fontSize: 13,
    color: BrandColors.slateMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: BrandColors.primary,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 14,
  },

  // HERO CARD & GALLERY
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  galleryWrapper: {
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  imageScroll: {
    width: IMAGE_CONTAINER_WIDTH,
    height: 280,
  },
  imageSlide: {
    width: IMAGE_CONTAINER_WIDTH,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  fullHeroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayControls: {
    position: 'absolute',
    bottom: 64,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  imageCountPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  imageCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  zoomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  zoomPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  thumbnailStrip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    alignItems: 'center',
  },
  thumbnailBox: {
    width: 46,
    height: 46,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailBoxActive: {
    borderColor: BrandColors.primary,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  heroCoverPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  noImageText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  heroDetails: {
    padding: 16,
    gap: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#FECDD3',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceBox: {
    gap: 2,
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },

  // SECTION CARD
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  descriptionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 13,
    color: BrandColors.slateMuted,
    fontStyle: 'italic',
  },

  // ITEMS LIST
  itemsList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemStepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  itemStepNum: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  itemDurationPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemDurationText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  itemDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },

  // STYLES
  stylesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stylePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#FECDD3',
  },
  stylePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },

  // POLICY CARD
  policyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  policyText: {
    flex: 1,
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 16,
  },

  // IMAGE MODAL PREVIEW
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeImageModalBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  fullPreviewImage: {
    width: '94%',
    height: '85%',
  },
});
