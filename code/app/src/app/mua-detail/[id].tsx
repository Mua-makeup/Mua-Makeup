import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { useMuaDetailStore } from '@/store/mua-detail.store';
import { MuaProfileHeader } from '@/components/customer/MuaProfileHeader';
import { PackageSelectorList } from '@/components/customer/PackageSelectorList';
import { PackageIncludedSteps } from '@/components/customer/PackageIncludedSteps';
import { ServiceSampleGallery } from '@/components/customer/ServiceSampleGallery';
import { ShowcaseGalleryModal } from '@/components/customer/ShowcaseGalleryModal';
import { PortfolioShowcase } from '@/services/mua-profile.service';

export default function MuaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const {
    muaProfile,
    packages,
    selectedPackage,
    showcases,
    isLoading,
    isLoadingShowcases,
    error,
    fetchMuaDetails,
    selectPackage,
    resetDetail,
  } = useMuaDetailStore();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    const muaId = Number(id) || 1;
    fetchMuaDetails(muaId);
    return () => resetDetail();
  }, [id, fetchMuaDetails, resetDetail]);

  const handleOpenPhoto = (_photo: PortfolioShowcase, index: number) => {
    setSelectedPhotoIndex(index);
    setIsModalVisible(true);
  };

  const handleBookingPress = () => {
    if (!selectedPackage) {
      Alert.alert('Thông báo', 'Vui lòng chọn một gói dịch vụ để đặt lịch.');
      return;
    }

    // Điều hướng trực tiếp sang màn hình Đặt Lịch & Chọn Ngày Giờ (Sprint M-2)
    router.push({
      pathname: '/booking/create',
      params: {
        packageId: selectedPackage.id.toString(),
        muaId: muaProfile?.muaId?.toString() || id?.toString() || '1',
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

  if (isLoading && !muaProfile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Đang tải hồ sơ & các dịch vụ của thợ...</Text>
      </SafeAreaView>
    );
  }

  if (error || !muaProfile) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Không tìm thấy thông tin thợ</Text>
        <Text style={styles.errorSubtitle}>
          {error || 'Hồ sơ thợ make-up này không tồn tại hoặc đã tạm dừng hoạt động.'}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const formattedPrice = selectedPackage
    ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(selectedPackage.price)
    : '0 đ';

  return (
    <View style={styles.container}>
      {/* FLOATING TOP NAVIGATION */}
      <SafeAreaView style={styles.floatingHeader} edges={['top']}>
        <TouchableOpacity
          style={styles.navCircleBtn}
          onPress={handleBack}
          activeOpacity={0.7}
        >
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER COVER, AVATAR, RATING, BIO */}
        <MuaProfileHeader profile={muaProfile} />

        {/* BỘ CHỌN GÓI DỊCH VỤ (BRIDAL, PARTY, PROM...) */}
        <PackageSelectorList
          packages={packages}
          selectedPackage={selectedPackage}
          onSelectPackage={(pkg) => selectPackage(pkg)}
        />

        {/* QUY TRÌNH & CÁC BƯỚC THỰC HIỆN CỦA GÓI ĐANG CHỌN */}
        <PackageIncludedSteps selectedPackage={selectedPackage} />

        {/* BỘ SƯU TẬP ẢNH MẪU ĐI KÈM RIÊNG CỦA GÓI ĐANG CHỌN */}
        <ServiceSampleGallery
          selectedPackage={selectedPackage}
          showcases={showcases}
          isLoading={isLoadingShowcases}
          onPressPhoto={handleOpenPhoto}
        />
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

        <TouchableOpacity
          style={styles.bookingBtn}
          onPress={handleBookingPress}
          activeOpacity={0.88}
        >
          <Text style={styles.bookingBtnText}>Đặt Lịch Gói Này</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* MODAL XEM ẢNH TOÀN MÀN HÌNH PINCH-TO-ZOOM */}
      <ShowcaseGalleryModal
        visible={isModalVisible}
        showcases={showcases}
        initialIndex={selectedPhotoIndex}
        onClose={() => setIsModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    gap: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BrandColors.primary,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 10,
  },
  navCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  priceContainer: {
    flex: 1,
    paddingRight: 12,
  },
  priceNote: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  selectedPackageTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primary,
    marginTop: 1,
  },
  bookingBtn: {
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
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
});
