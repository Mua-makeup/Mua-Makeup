import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { BrandColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { useLocationStore } from '@/store/location.store';
import { agencyService, AgencyPublicProfile } from '@/services/agency.service';
import {
  packageService,
  PackageDetail,
} from '@/services/package.service';
import { PortfolioShowcase } from '@/services/mua-profile.service';

import { StudioProfileHeader } from '@/components/customer/StudioProfileHeader';
import { PackageSelectorList } from '@/components/customer/PackageSelectorList';
import { PackageIncludedSteps } from '@/components/customer/PackageIncludedSteps';
import { ServiceSampleGallery } from '@/components/customer/ServiceSampleGallery';
import { ShowcaseGalleryModal } from '@/components/customer/ShowcaseGalleryModal';
import { StudioReviewSection } from '@/components/customer/StudioReviewSection';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StudioGalleryItem {
  id: string | number;
  imageUrl: string;
  thumbnailUrl?: string;
  additionalImages?: string[];
  description?: string;
  title: string;
  categoryName?: string;
  styleNames?: string[];
  packageId?: number;
  packageName?: string;
  price?: number;
}

export default function StudioProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { userInfo, isAuthenticated } = useAuthStore();
  const { latitude: userLat, longitude: userLng } = useLocationStore();

  const studioId = Number(id) || 1;

  // State dữ liệu
  const [studio, setStudio] = useState<AgencyPublicProfile | null>(null);
  const [packages, setPackages] = useState<PackageDetail[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bộ lọc tag cho Bộ Sưu Tập Tác Phẩm Studio
  const [selectedCategoryTag, setSelectedCategoryTag] = useState<string>('ALL');
  const [selectedStyleTag, setSelectedStyleTag] = useState<string>('ALL');
  const [studioPortfolios, setStudioPortfolios] = useState<PortfolioShowcase[]>([]);

  // State xem ảnh phóng to Modal
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [modalShowcaseList, setModalShowcaseList] = useState<PortfolioShowcase[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedAngleIndex, setSelectedAngleIndex] = useState(0);

  const isMUA = userInfo?.roles?.includes('ROLE_FREELANCE_MUA');
  const isAgencyStaff = userInfo?.roles?.includes('ROLE_AGENCY_STAFF');

  // Tải dữ liệu Studio và danh sách chi tiết các Gói dịch vụ từ Backend
  useEffect(() => {
    let isMounted = true;

    const loadStudioData = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [studioRes, packageSummaries, portfolioRes] = await Promise.all([
          agencyService.getAgencyProfileById(studioId),
          packageService.listPackages({ agencyId: studioId, availableOnly: true }),
          agencyService.getPublicAgencyPortfolios(studioId),
        ]);

        if (!isMounted) return;

        if (!studioRes) {
          setErrorMessage('Không tìm thấy thông tin cơ sở Studio này hoặc cơ sở đang tạm ngưng hoạt động.');
          setIsLoading(false);
          return;
        }

        setStudio(studioRes);
        setStudioPortfolios(portfolioRes || []);

        // Tải chi tiết từng gói dịch vụ để có danh sách các bước thực hiện & ảnh
        const detailedList: PackageDetail[] = await Promise.all(
          (packageSummaries || []).map((p) =>
            packageService.getPackageById(p.id).catch(() => p as PackageDetail)
          )
        );

        if (!isMounted) return;

        setPackages(detailedList);

        if (detailedList.length > 0) {
          setSelectedPackage(detailedList[0]);
        }
      } catch (err: any) {
        console.warn('[StudioProfileScreen] Lỗi tải dữ liệu studio:', err);
        if (isMounted) {
          setErrorMessage('Không thể tải thông tin Studio lúc này. Vui lòng kiểm tra lại kết nối mạng.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadStudioData();

    return () => {
      isMounted = false;
    };
  }, [studioId]);

  // Chọn gói dịch vụ từ PackageSelectorList
  const handleSelectPackage = (pkg: PackageDetail) => {
    Haptics.selectionAsync();
    setSelectedPackage(pkg);
  };

  // Tính khoảng cách từ vị trí người dùng tới Studio (nếu có GPS)
  const studioLat = studio?.latitude;
  const studioLng = studio?.longitude;
  const distanceKm = useMemo(() => {
    if (!userLat || !userLng || !studioLat || !studioLng) return null;
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // Bán kính trái đất (km)
    const dLat = toRad(studioLat - userLat);
    const dLon = toRad(studioLng - userLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(userLat)) * Math.cos(toRad(studioLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  }, [userLat, userLng, studioLat, studioLng]);

  // Trích xuất toàn bộ ảnh tác phẩm của Studio (Bộ sưu tập tác phẩm)
  const { galleryItems, categoryList, styleList, allStudioShowcases } = useMemo(() => {
    const items: StudioGalleryItem[] = [];
    const showcases: PortfolioShowcase[] = [];
    const catSet = new Set<string>();
    const styleSet = new Set<string>();

    const pkgMap = new Map<number, PackageDetail>();
    packages.forEach((pkg) => {
      pkgMap.set(Number(pkg.id), pkg);
      if (pkg.categoryName) catSet.add(pkg.categoryName);
      const sNames = pkg.styles?.map((s) => s.styleName || (s as any).name).filter(Boolean) || [];
      sNames.forEach((name) => styleSet.add(name));
    });

    // 1. Thêm các ảnh thực tế từ portfolio của Studio
    studioPortfolios.forEach((sp) => {
      const linkedPkg = sp.packageId ? pkgMap.get(Number(sp.packageId)) : undefined;
      const catName = linkedPkg?.categoryName || undefined;
      if (catName) catSet.add(catName);

      const sNames = sp.styleName
        ? [sp.styleName]
        : (linkedPkg?.styles?.map((s) => s.styleName || (s as any).name).filter(Boolean) || []);
      sNames.forEach((name) => styleSet.add(name));

      items.push({
        id: `showcase-${sp.id}`,
        imageUrl: sp.imageUrl || sp.thumbnailUrl || '',
        thumbnailUrl: sp.thumbnailUrl,
        additionalImages: sp.additionalImages || [],
        description: sp.description,
        title: sp.title,
        categoryName: catName,
        styleNames: sNames,
        packageId: sp.packageId ? String(sp.packageId) : undefined,
        packageName: sp.packageName || linkedPkg?.packageName,
        price: linkedPkg?.price,
      });

      showcases.push({
        ...sp,
        styleName: sNames[0],
      });
    });

    // 2. Thêm ảnh bìa từ các gói dịch vụ nếu chưa có trong portfolio
    packages.forEach((pkg, idx) => {
      if (pkg.coverImageUrl) {
        const alreadyInPortfolio = studioPortfolios.some(
          (sp) => sp.imageUrl === pkg.coverImageUrl || (sp.packageId && Number(sp.packageId) === Number(pkg.id))
        );
        if (!alreadyInPortfolio) {
          const sNames = pkg.styles?.map((s) => s.styleName || (s as any).name).filter(Boolean) || [];
          items.push({
            id: `pkg-${pkg.id}`,
            imageUrl: pkg.coverImageUrl,
            title: pkg.packageName,
            categoryName: pkg.categoryName,
            styleNames: sNames,
            packageId: pkg.id,
            packageName: pkg.packageName,
            price: pkg.price,
          });

          showcases.push({
            id: Number(pkg.id) * 1000 + idx,
            title: pkg.packageName,
            description: pkg.description,
            imageUrl: pkg.coverImageUrl,
            thumbnailUrl: pkg.coverImageUrl,
            packageId: pkg.id,
            packageName: pkg.packageName,
            styleName: sNames[0],
          });
        }
      }
    });

    return {
      galleryItems: items,
      categoryList: Array.from(catSet),
      styleList: Array.from(styleSet),
      allStudioShowcases: showcases,
    };
  }, [packages, studioPortfolios]);

  // Lọc danh sách tác phẩm bộ sưu tập theo Category và Style
  const filteredGalleryItems = useMemo(() => {
    return galleryItems.filter((item) => {
      const matchCat =
        selectedCategoryTag === 'ALL' || item.categoryName === selectedCategoryTag;
      const matchStyle =
        selectedStyleTag === 'ALL' || (item.styleNames && item.styleNames.includes(selectedStyleTag));
      return matchCat && matchStyle;
    });
  }, [galleryItems, selectedCategoryTag, selectedStyleTag]);

  // ẢNH MẪU ĐI THEO TỪNG DỊCH VỤ ĐANG CHỌN
  const packageShowcases: PortfolioShowcase[] = useMemo(() => {
    if (!selectedPackage) return [];
    const list: PortfolioShowcase[] = [];

    // 1. Tác phẩm thực tế gắn với gói dịch vụ này từ Portfolio của Studio
    const directMatches = studioPortfolios.filter(
      (it) => it.packageId && Number(it.packageId) === Number(selectedPackage.id)
    );
    list.push(...directMatches);

    // 2. Nếu có ảnh bìa riêng của gói và chưa nằm trong danh sách
    if (selectedPackage.coverImageUrl) {
      const exists = list.some((it) => it.imageUrl === selectedPackage.coverImageUrl);
      if (!exists) {
        list.unshift({
          id: Number(selectedPackage.id) * 1000 + 1,
          title: selectedPackage.packageName,
          description: selectedPackage.description,
          imageUrl: selectedPackage.coverImageUrl,
          thumbnailUrl: selectedPackage.coverImageUrl,
          packageId: Number(selectedPackage.id),
          packageName: selectedPackage.packageName,
          styleName: selectedPackage.styles?.[0]?.styleName,
        });
      }
    }

    return list;
  }, [selectedPackage, studioPortfolios]);

  // Mở modal xem ảnh mẫu theo dịch vụ
  const handleOpenPackagePhoto = (_photo: PortfolioShowcase, index: number, angleIndex: number = 0) => {
    Haptics.selectionAsync();
    setModalShowcaseList(packageShowcases);
    setSelectedPhotoIndex(index);
    setSelectedAngleIndex(angleIndex);
    setIsPhotoModalVisible(true);
  };

  // Mở modal xem ảnh từ Bộ Sưu Tập Tác Phẩm Studio
  const handleOpenGalleryPhoto = (item: StudioGalleryItem, index: number) => {
    Haptics.selectionAsync();
    const convertedList: PortfolioShowcase[] = filteredGalleryItems.map((g, idx) => ({
      id: Number(g.packageId || idx) * 1000 + idx,
      title: g.title,
      description: g.description,
      imageUrl: g.imageUrl,
      thumbnailUrl: g.thumbnailUrl || g.imageUrl,
      additionalImages: g.additionalImages || [],
      packageId: g.packageId ? Number(g.packageId) : undefined,
      packageName: g.packageName,
      styleName: g.styleNames?.[0],
    }));
    setModalShowcaseList(convertedList);
    setSelectedPhotoIndex(index);
    setIsPhotoModalVisible(true);
  };

  // Xử lý bấm Đặt Lịch Ngay
  const handleBookingPress = () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }

    if (isMUA || isAgencyStaff) {
      Alert.alert(
        'Tài khoản đối tác',
        'Bạn đang đăng nhập tài khoản Thợ MUA/Studio. Tính năng đặt lịch chỉ áp dụng cho tài khoản Khách Hàng.'
      );
      return;
    }

    if (!selectedPackage) {
      Alert.alert('Thông báo', 'Vui lòng chọn một gói dịch vụ để tiến hành đặt lịch với Studio.');
      return;
    }

    if (selectedPackage.isAvailable === false) {
      Alert.alert(
        'Tạm ngưng nhận lịch',
        'Gói dịch vụ này hiện đang tạm ngưng nhận lịch. Quý khách vui lòng chọn gói khác của Studio.'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Điều hướng sang màn hình Đặt Lịch với nhà cung cấp AGENCY
    router.push({
      pathname: '/booking/create',
      params: {
        packageId: selectedPackage.id.toString(),
        providerId: studioId.toString(),
        providerType: 'AGENCY',
      },
    });
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Đang tải hồ sơ cơ sở Studio & các gói dịch vụ...</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage || !studio) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Không tìm thấy thông tin Studio</Text>
        <Text style={styles.errorSubtitle}>
          {errorMessage || 'Cơ sở Studio này không tồn tại hoặc đã tạm dừng cung cấp dịch vụ.'}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const formattedPrice = selectedPackage
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPackage.price)
    : '0 đ';

  return (
    <View style={styles.container}>
      {/* FLOATING TOP NAVIGATION BAR */}
      <SafeAreaView style={styles.floatingHeader} edges={['top']}>
        <TouchableOpacity style={styles.navCircleBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.navCircleBtn} activeOpacity={0.7}>
            <Ionicons name="heart-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navCircleBtn} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 95 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER COVER, AVATAR, RATING, BIO, ĐỊA CHỈ & SDT STUDIO (KHÔNG NÚT GỌI) */}
        <StudioProfileHeader studio={studio} distanceKm={distanceKm} />

        {/* BỘ CHỌN GÓI DỊCH VỤ MAKE-UP (CAROUSEL + CATEGORY PILLS) */}
        <PackageSelectorList
          packages={packages}
          selectedPackage={selectedPackage}
          onSelectPackage={handleSelectPackage}
        />

        {/* QUY TRÌNH & CÁC BƯỚC THỰC HIỆN CỦA GÓI ĐANG CHỌN */}
        <PackageIncludedSteps selectedPackage={selectedPackage} />

        {/* PHẦN ẢNH ĐI THEO TỪNG DỊCH VỤ ĐANG CHỌN */}
        <ServiceSampleGallery
          selectedPackage={selectedPackage}
          showcases={packageShowcases}
          isLoading={isLoadingDetail}
          onPressPhoto={handleOpenPackagePhoto}
        />

        {/* BỘ SƯU TẬP TÁC PHẨM CỦA TOÀN BỘ STUDIO (GIỮ NGUYÊN PHẦN BỘ SƯU TẬP) */}
        <View style={styles.gallerySection}>
          <View style={styles.gallerySectionHeader}>
            <View style={styles.galleryTitleRow}>
              <Ionicons name="images-outline" size={19} color={BrandColors.primary} />
              <Text style={styles.gallerySectionTitle}>
                Bộ Sưu Tập Tác Phẩm Studio ({galleryItems.length})
              </Text>
            </View>
            <Text style={styles.gallerySectionSubtitle}>
              Khám phá toàn bộ các layout & phong cách trang điểm thực tế do Studio thực hiện
            </Text>
          </View>

          {/* BỘ LỌC THEO DANH MỤC */}
          {categoryList.length > 0 && (
            <View style={styles.filterGroup}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterTag, selectedCategoryTag === 'ALL' && styles.filterTagActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedCategoryTag('ALL');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterTagText, selectedCategoryTag === 'ALL' && styles.filterTagTextActive]}>
                    Tất Cả ({galleryItems.length})
                  </Text>
                </TouchableOpacity>

                {categoryList.map((catName) => {
                  const count = galleryItems.filter((i) => i.categoryName === catName).length;
                  const isActive = selectedCategoryTag === catName;
                  return (
                    <TouchableOpacity
                      key={`cat-filter-${catName}`}
                      style={[styles.filterTag, isActive && styles.filterTagActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedCategoryTag(catName);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterTagText, isActive && styles.filterTagTextActive]}>
                        {catName} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* BỘ LỌC THEO PHONG CÁCH TONE MAKE-UP */}
          {styleList.length > 0 && (
            <View style={styles.filterGroup}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterTag, selectedStyleTag === 'ALL' && styles.filterTagActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedStyleTag('ALL');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterTagText, selectedStyleTag === 'ALL' && styles.filterTagTextActive]}>
                    Tất Cả Tone
                  </Text>
                </TouchableOpacity>

                {styleList.map((stName) => {
                  const isActive = selectedStyleTag === stName;
                  return (
                    <TouchableOpacity
                      key={`st-filter-${stName}`}
                      style={[styles.filterTag, isActive && styles.filterTagActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedStyleTag(stName);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterTagText, isActive && styles.filterTagTextActive]}>
                        {stName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* LƯỚI TÁC PHẨM 2 CỘT */}
          {filteredGalleryItems.length === 0 ? (
            <View style={styles.emptyGalleryCard}>
              <Ionicons name="images-outline" size={36} color="#CBD5E1" />
              <Text style={styles.emptyGalleryTitle}>Chưa có tác phẩm trong mục này</Text>
              <Text style={styles.emptyGallerySubtitle}>
                Studio đang cập nhật thêm hình ảnh tác phẩm thực tế.
              </Text>
            </View>
          ) : (
            <View style={styles.galleryGrid}>
              {filteredGalleryItems.map((item, idx) => (
                <TouchableOpacity
                  key={`gallery-item-${item.id}-${idx}`}
                  style={styles.galleryCard}
                  onPress={() => handleOpenGalleryPhoto(item, idx)}
                  activeOpacity={0.88}
                >
                  <Image source={{ uri: item.imageUrl }} style={styles.galleryImage} contentFit="cover" />
                  
                  {/* Badge số lượng ảnh phụ đi kèm */}
                  {item.additionalImages && item.additionalImages.length > 0 && (
                    <View style={styles.additionalBadge}>
                      <Ionicons name="images" size={11} color="#FFFFFF" />
                      <Text style={styles.additionalBadgeText}>
                        +{item.additionalImages.length}
                      </Text>
                    </View>
                  )}

                  <View style={styles.zoomHintOverlay}>
                    <Ionicons name="scan-outline" size={13} color="#FFFFFF" />
                    <Text style={styles.zoomHintText}>Soi cận cảnh</Text>
                  </View>

                  <View style={styles.galleryCardOverlay}>
                    {item.categoryName && (
                      <View style={styles.galleryCatBadge}>
                        <Text style={styles.galleryCatBadgeText}>{item.categoryName}</Text>
                      </View>
                    )}
                    <Text style={styles.galleryItemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ĐÁNH GIÁ TỪ KHÁCH HÀNG (REVIEWS & RATINGS) */}
        <StudioReviewSection
          studioId={studioId}
          studioName={studio.agencyName}
          ratingAverage={studio.ratingAvg}
          totalReviews={studio.totalReviews}
        />

        {/* CAM KẾT CHẤT LƯỢNG DỊCH VỤ CỦA STUDIO */}
        <View style={styles.commitmentCard}>
          <View style={styles.commitmentHeaderRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#059669" />
            <Text style={styles.commitmentTitle}>Cam Kết Chất Lượng Studio</Text>
          </View>
          <View style={styles.commitmentItem}>
            <Ionicons name="checkmark" size={14} color="#059669" />
            <Text style={styles.commitmentText}>
              100% sử dụng mỹ phẩm chính hãng cao cấp (MAC, Dior, Chanel, NARS, Bobbi Brown).
            </Text>
          </View>
          <View style={styles.commitmentItem}>
            <Ionicons name="checkmark" size={14} color="#059669" />
            <Text style={styles.commitmentText}>
              Đội ngũ chuyên viên được đào tạo bài bản, kiểm duyệt tay nghề và tiêu chuẩn Studio.
            </Text>
          </View>
          <View style={styles.commitmentItem}>
            <Ionicons name="checkmark" size={14} color="#059669" />
            <Text style={styles.commitmentText}>
              Đảm bảo đúng giờ hẹn, phục vụ chu đáo, hỗ trợ dặm phấn và thay đổi kiểu tóc theo yêu cầu.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* STICKY BOTTOM ACTION BAR */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceNote}>Gói đang chọn:</Text>
          <Text style={styles.selectedPackageTitle} numberOfLines={1}>
            {selectedPackage?.packageName || 'Chưa chọn gói'}
          </Text>
          <Text style={styles.priceText}>{formattedPrice}</Text>
        </View>

        {selectedPackage?.isAvailable === false ? (
          <View style={styles.viewOnlyBadgeContainer}>
            <View style={styles.viewOnlyBadge}>
              <Ionicons name="eye-outline" size={14} color="#475569" />
              <Text style={styles.viewOnlyBadgeText}>Tạm ngưng nhận lịch</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.bookingBtn}
            onPress={handleBookingPress}
            activeOpacity={0.88}
          >
            <Text style={styles.bookingBtnText}>
              {isAuthenticated ? 'Đặt Lịch Ngay' : 'Đăng Nhập Để Đặt Lịch'}
            </Text>
            <Ionicons name={isAuthenticated ? 'arrow-forward' : 'log-in-outline'} size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* MODAL XEM ẢNH TOÀN MÀN HÌNH PINCH-TO-ZOOM */}
      <ShowcaseGalleryModal
        visible={isPhotoModalVisible}
        showcases={modalShowcaseList}
        initialIndex={selectedPhotoIndex}
        initialAngleIndex={selectedAngleIndex}
        onClose={() => setIsPhotoModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  backBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    backgroundColor: '#F8FAFC',
  },
  gallerySection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  gallerySectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  galleryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  gallerySectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  gallerySectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  filterGroup: {
    marginBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTagActive: {
    backgroundColor: BrandColors.light,
    borderColor: BrandColors.primary,
  },
  filterTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterTagTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  emptyGalleryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyGalleryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptyGallerySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 4,
  },
  galleryCard: {
    width: (SCREEN_WIDTH - 32 - 12) / 2,
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  additionalBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(225, 29, 72, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 2,
  },
  additionalBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  zoomHintOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  zoomHintText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  galleryCardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  galleryCatBadge: {
    alignSelf: 'flex-start',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  galleryCatBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  galleryItemTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  commitmentCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    gap: 8,
  },
  commitmentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  commitmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  commitmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  commitmentText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  priceContainer: {
    flex: 1,
    marginRight: 12,
  },
  priceNote: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  selectedPackageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  priceText: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.primary,
    marginTop: 1,
  },
  bookingBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  bookingBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  viewOnlyBadgeContainer: {
    alignItems: 'center',
  },
  viewOnlyBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewOnlyBadgeText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
});
