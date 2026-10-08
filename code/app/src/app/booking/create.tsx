import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import { useBookingStore } from '@/store/booking.store';
import { useAuthStore } from '@/store/auth.store';
import { packageService, PackageDetail } from '@/services/package.service';
import { muaProfileService, MuaPublicProfile } from '@/services/mua-profile.service';
import { BookingHeaderCard } from '@/components/booking/BookingHeaderCard';
import { DateTimeSelector } from '@/components/booking/DateTimeSelector';
import { PackageItemPicker } from '@/components/booking/PackageItemPicker';
import { DestinationAddressPicker } from '@/components/booking/DestinationAddressPicker';
import { InvoiceSummaryCard } from '@/components/booking/InvoiceSummaryCard';
import { useLocationStore } from '@/store/location.store';
import { customerAddressService } from '@/services/customer-address.service';
import { createBookingSchema } from '@/schemas/booking-create.schema';
import { parseApiError } from '@/utils/error';
import { DismissibleModal } from '@/components/common/DismissibleModal';

import { agencyService, AgencyPublicProfile } from '@/services/agency.service';

export default function CreateBookingScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const calendarSectionYRef = useRef<number>(0);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const params = useLocalSearchParams<{ packageId?: string; muaId?: string; providerId?: string; providerType?: string }>();

  const targetPackageId = params.packageId ? parseInt(params.packageId, 10) : 1;
  const targetProviderId = params.providerId ? parseInt(params.providerId, 10) : (params.muaId ? parseInt(params.muaId, 10) : 1);
  const targetMuaId = targetProviderId;
  const initialProviderType = (params.providerType as 'FREELANCER' | 'AGENCY') || 'FREELANCER';

  const [providerType, setProviderType] = useState<'FREELANCER' | 'AGENCY'>(initialProviderType);
  const [providerId, setProviderId] = useState<number>(targetProviderId);

  const [packageDetail, setPackageDetail] = useState<PackageDetail | null>(null);
  const [muaProfile, setMuaProfile] = useState<MuaPublicProfile | null>(null);
  const [agencyProfile, setAgencyProfile] = useState<AgencyPublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { currentAddress, latitude: currentLat, longitude: currentLng } = useLocationStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  const {
    selectedDate,
    selectedTimeSlot,
    destinationAddress,
    destinationLatitude,
    destinationLongitude,
    selectedStyleId,
    selectedAddOnIds,
    note,
    voucherCode,
    distanceInfo,
    invoicePreview,
    isCalculatingPrice,
    setPackageAndProvider,
    setDate,
    setTimeSlot,
    setStyleId,
    setDestination,
    toggleAddOn,
    setNote,
    setVoucherCode,
    submitBooking,
    resetBookingForm,
  } = useBookingStore();

  const totalDurationMinutes = React.useMemo(() => {
    let dur = packageDetail?.estimatedDurationMinutes || 60;
    if (packageDetail?.items && selectedAddOnIds.length > 0) {
      packageDetail.items.forEach((item) => {
        if (selectedAddOnIds.includes(item.id) && item.durationMinutes) {
          dur += item.durationMinutes;
        }
      });
    }
    return dur;
  }, [packageDetail, selectedAddOnIds]);

  const selectedStyle = React.useMemo(() => {
    if (!selectedStyleId || !packageDetail?.styles) return null;
    return (
      packageDetail.styles.find(
        (s) => (s.id || (s as any).styleId) === selectedStyleId
      ) || null
    );
  }, [selectedStyleId, packageDetail?.styles]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const pkg = await packageService.getPackageById(targetPackageId);
        if (pkg?.isAvailable === false) {
          Alert.alert(
            'Tạm ngưng nhận lịch',
            'Gói dịch vụ này hiện đang tạm ngưng nhận lịch hẹn. Vui lòng quay lại và chọn gói dịch vụ khác.',
            [{ text: 'Quay lại', onPress: () => router.back() }]
          );
          return;
        }
        setPackageDetail(pkg);

        const isAgency = initialProviderType === 'AGENCY' || (pkg.agencyId != null && !pkg.muaId);
        const resolvedProviderType: 'FREELANCER' | 'AGENCY' = isAgency ? 'AGENCY' : 'FREELANCER';
        const resolvedProviderId = isAgency ? (pkg.agencyId || targetProviderId) : (pkg.muaId || targetProviderId);

        setProviderType(resolvedProviderType);
        setProviderId(resolvedProviderId);

        if (isAgency) {
          try {
            const ag = await agencyService.getAgencyProfileById(resolvedProviderId);
            setAgencyProfile(ag);
            setMuaProfile(null);
          } catch (e) {
            console.warn('Lỗi lấy thông tin studio:', e);
          }
        } else {
          try {
            const profile = await muaProfileService.getPublicProfile(resolvedProviderId);
            setMuaProfile(profile);
            setAgencyProfile(null);
          } catch (e) {
            console.warn('Lỗi lấy thông tin MUA:', e);
          }
        }

        // Đồng bộ store
        setPackageAndProvider(targetPackageId, resolvedProviderId, resolvedProviderType);

        // Tự động điền địa chỉ vị trí GPS hiện tại của khách hàng
        if (!destinationLatitude || destinationLatitude === 0) {
          if (currentLat && currentLng && currentAddress && !currentAddress.startsWith('Đang') && !currentAddress.startsWith('Chưa')) {
            setDestination(currentAddress, currentLat, currentLng);
          } else {
            try {
              const savedList = await customerAddressService.getSavedAddresses();
              const defaultAddr = savedList.find((a) => a.isDefault) || (savedList.length > 0 ? savedList[0] : null);
              if (defaultAddr) {
                setDestination(defaultAddr.addressLine, defaultAddr.latitude, defaultAddr.longitude);
              }
            } catch {
              // Bỏ qua lỗi sổ địa chỉ
            }
          }
        }
      } catch (err: any) {
        Alert.alert('Lỗi Tải Dữ Liệu', err.message || 'Không thể tải thông tin gói dịch vụ.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    return () => {
      resetBookingForm();
    };
  }, [targetPackageId, targetProviderId, initialProviderType]);

  const handleSubmit = async () => {
    // 0. Kiểm tra ngày & giờ đã chọn - Tự động cuộn lên ô Lịch Hẹn nếu chưa chọn
    if (!selectedDate || !selectedTimeSlot) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, calendarSectionYRef.current - 16),
        animated: true,
      });
      Alert.alert('Chưa Chọn Lịch Hẹn', 'Vui lòng chọn ngày và giờ cần đặt lịch make-up trước khi tiếp tục.');
      return;
    }

    // 1. Validate Form 100% bằng Zod Schema
    const bookingTime = `${selectedDate}T${selectedTimeSlot}:00`;
    const validation = createBookingSchema.safeParse({
      packageId: targetPackageId,
      providerId,
      providerType,
      bookingTime,
      destinationAddress,
      destinationLatitude,
      destinationLongitude,
      styleId: selectedStyleId || undefined,
      addOnItemIds: selectedAddOnIds,
      note: note || undefined,
      voucherCode: voucherCode || undefined,
    });

    if (!validation.success) {
      const errMap: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        const fieldName = String(err.path[0] || 'form');
        errMap[fieldName] = err.message;
      });
      setFieldErrors(errMap);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Thông Tin Chưa Đầy Đủ', Object.values(errMap)[0]);
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newBooking: any = await submitBooking();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const targetBookingId = newBooking?.id || newBooking?.bookingId || newBooking?.booking_id;
      if (targetBookingId) {
        router.replace(`/booking/deposit/${targetBookingId}` as any);
      } else {
        router.replace('/bookings');
      }
    } catch (err: any) {
      // 2. Phân tích lỗi theo chuẩn hệ thống (project-rules.md Mục 5.3)
      const parsed = parseApiError(err);
      if (parsed.fieldErrors) {
        setFieldErrors(parsed.fieldErrors);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Đặt Lịch Thất Bại', parsed.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Đang chuẩn bị thông tin đặt lịch...</Text>
      </SafeAreaView>
    );
  }

  const basePackagePrice = packageDetail?.price || 0;
  const addOnsSum = (packageDetail?.items || [])
    .filter((it) => selectedAddOnIds.includes(it.id))
    .reduce((sum, it) => sum + (it.itemPrice || 0), 0);
  const estimatedTotal = basePackagePrice + addOnsSum;

  const totalAmount = invoicePreview?.financialSummary?.totalAmount ?? estimatedTotal;
  const depositAmount =
    invoicePreview?.financialSummary?.depositRequiredAmount ??
    (totalAmount > 0 ? Math.round(totalAmount * 0.3) : 0);

  const formattedDeposit = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(depositAmount);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER TOP BAR */}
      <SafeAreaView style={styles.headerBar} edges={['top']}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác Nhận Đặt Lịch</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      {/* NỘI DUNG CUỘN */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. TÓM TẮT GÓI & THỢ / STUDIO */}
        <BookingHeaderCard
          packageDetail={packageDetail}
          muaProfile={muaProfile}
          agencyProfile={agencyProfile}
          totalDurationMinutes={totalDurationMinutes}
        />

        {/* 2. CHỌN NGÀY & KHUNG GIỜ */}
        <View
          onLayout={(e) => {
            calendarSectionYRef.current = e.nativeEvent.layout.y;
          }}
        >
          <DateTimeSelector
            muaId={targetMuaId}
            durationMinutes={totalDurationMinutes}
            selectedDate={selectedDate}
            selectedTimeSlot={selectedTimeSlot}
            onSelectDate={setDate}
            onSelectTimeSlot={setTimeSlot}
          />
        </View>

        {/* 3. BƯỚC MẶC ĐỊNH & CHECKBOX MUA THÊM */}
        <PackageItemPicker
          items={packageDetail?.items || []}
          selectedAddOnIds={selectedAddOnIds}
          onToggleAddOn={toggleAddOn}
          baseDurationMinutes={packageDetail?.estimatedDurationMinutes || 60}
        />

        {/* 3.1. PHONG CÁCH MAKE-UP TƯƠNG THÍCH (THIẾT KẾ CHUẨN MẪU ẢNH 2) */}
        {packageDetail?.styles && packageDetail.styles.length > 0 && (
          <View style={styles.styleSectionBox}>
            <View style={styles.styleSectionHeader}>
              <Text style={styles.styleSectionTitle}>Phong Cách Make-up Tương Thích *</Text>
            </View>

            {/* Nút bấm mở chọn phong cách */}
            <TouchableOpacity
              style={styles.styleSelectorButton}
              onPress={() => {
                Haptics.selectionAsync();
                setShowStyleModal(true);
              }}
              activeOpacity={0.85}
            >
              <View style={styles.styleSelectorLeft}>
                <View style={styles.paletteIconBox}>
                  <Ionicons name="color-palette-outline" size={20} color={BrandColors.primary} />
                </View>
                <View style={styles.styleSelectorTextCol}>
                  <Text
                    style={[
                      styles.styleSelectorMainText,
                      selectedStyle ? styles.styleSelectorMainTextActive : null,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedStyle
                      ? selectedStyle.styleName
                      : 'Bất kỳ phong cách nào (Mặc định)'}
                  </Text>
                  <Text style={styles.styleSelectorSubText} numberOfLines={1}>
                    {selectedStyle ? 'Bấm để đổi phong cách make-up' : 'Bấm để chọn phong cách make-up cụ thể'}
                  </Text>
                </View>
              </View>

              <View style={styles.styleSelectorRight}>
                {selectedStyle && (
                  <View style={styles.styleCountBadge}>
                    <Text style={styles.styleCountBadgeText}>1</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </View>
            </TouchableOpacity>

            {/* Danh sách Tags bên dưới theo ảnh mẫu: tag pill viền hồng + nút X tròn xóa nhanh */}
            <View style={styles.styleTagsContainer}>
              {selectedStyle ? (
                <View style={styles.selectedTagPill}>
                  <Text style={styles.selectedTagText}>{selectedStyle.styleName}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setStyleId(null);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={16} color="#BE185D" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.selectedTagPill, styles.selectedTagPillAny]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShowStyleModal(true);
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="sparkles" size={13} color="#BE185D" />
                  <Text style={styles.selectedTagText}>Bất kỳ phong cách nào (Mặc định)</Text>
                </TouchableOpacity>
              )}

            </View>
          </View>
        )}

        {/* 4. ĐỊA CHỈ TRANG ĐIỂM TẬN NƠI & GOONG MAPS */}
        <DestinationAddressPicker
          address={destinationAddress}
          latitude={destinationLatitude}
          longitude={destinationLongitude}
          distanceInfo={distanceInfo}
          error={fieldErrors.destinationAddress}
          onChangeAddress={(addr, lat, lng) => {
            setFieldErrors((prev) => {
              const copy = { ...prev };
              delete copy.destinationAddress;
              return copy;
            });
            setDestination(addr, lat, lng);
          }}
        />

        {/* 5. GHI CHÚ RIÊNG CHO THỢ */}
        <View style={styles.noteBox}>
          <View style={styles.noteHeader}>
            <Ionicons name="create-outline" size={18} color={BrandColors.primary} />
            <Text style={styles.noteTitle}>Ghi Chú & Yêu Cầu Riêng Cho Thợ</Text>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="VD: Da dầu dễ đổ mồ hôi, đầm dạ hội đỏ đô, cần kiểu tóc thanh lịch..."
            placeholderTextColor="#94A3B8"
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>

        {/* 6. HÓA ĐƠN CHI TIẾT & TIỀN CỌC ESCROW */}
        <InvoiceSummaryCard
          invoicePreview={invoicePreview}
          isCalculating={isCalculatingPrice}
          voucherCode={voucherCode}
          onApplyVoucher={setVoucherCode}
          basePriceFallback={basePackagePrice}
        />
      </ScrollView>

      {/* STICKY BOTTOM BAR XÁC NHẬN */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.depositLabel}>Tiền cọc giữ chỗ (30%):</Text>
          <Text style={styles.depositPriceText}>{formattedDeposit}</Text>
        </View>
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.88}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Xác Nhận & Đặt Cọc</Text>
              <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL BOTTOMSHEET CHỌN PHONG CÁCH MAKE-UP */}
      <DismissibleModal
        visible={showStyleModal}
        onClose={() => setShowStyleModal(false)}
        overlayStyle={styles.modalOverlay}
        contentStyle={styles.styleBottomSheet}
      >
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>Phong Cách Make-up</Text>
            <Text style={styles.modalSubtitle}>
              Chọn phong cách tương thích với gói dịch vụ này
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowStyleModal(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.stylesListScroll}
          contentContainerStyle={styles.stylesListScrollInner}
          showsVerticalScrollIndicator={false}
        >
          {/* Tùy chọn 1: Bất kỳ phong cách nào (Mặc định) */}
          <TouchableOpacity
            style={[
              styles.styleRowCard,
              selectedStyleId == null && styles.styleRowCardChecked,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setStyleId(null);
              setShowStyleModal(false);
            }}
            activeOpacity={0.75}
          >
            <View style={styles.styleRowLeft}>
              <View
                style={[
                  styles.styleIconBox,
                  selectedStyleId == null && styles.styleIconBoxChecked,
                ]}
              >
                <Ionicons
                  name={selectedStyleId == null ? 'checkmark' : 'sparkles-outline'}
                  size={15}
                  color={selectedStyleId == null ? BrandColors.primary : '#94A3B8'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.styleNameText,
                    selectedStyleId == null && styles.styleNameTextChecked,
                  ]}
                >
                  Bất kỳ phong cách nào (Mặc định)
                </Text>
                <Text style={styles.styleDescText}>
                  Chuyên viên sẽ tư vấn tone make-up phù hợp nhất với gương mặt bạn
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.checkboxCircle,
                selectedStyleId == null && styles.checkboxCircleChecked,
              ]}
            >
              {selectedStyleId == null && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>

          {/* Danh sách các phong cách của gói */}
          {(packageDetail?.styles || []).map((style) => {
            const sId = style.id || (style as any).styleId;
            const isChecked = selectedStyleId === sId;
            return (
              <TouchableOpacity
                key={sId}
                style={[styles.styleRowCard, isChecked && styles.styleRowCardChecked]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStyleId(sId);
                  setShowStyleModal(false);
                }}
                activeOpacity={0.75}
              >
                <View style={styles.styleRowLeft}>
                  <View
                    style={[
                      styles.styleIconBox,
                      isChecked && styles.styleIconBoxChecked,
                    ]}
                  >
                    <Ionicons
                      name={isChecked ? 'checkmark' : 'color-palette-outline'}
                      size={15}
                      color={isChecked ? BrandColors.primary : '#94A3B8'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.styleNameText,
                        isChecked && styles.styleNameTextChecked,
                      ]}
                    >
                      {style.styleName}
                    </Text>
                    {style.description ? (
                      <Text style={styles.styleDescText}>{style.description}</Text>
                    ) : null}
                  </View>
                </View>

                <View
                  style={[
                    styles.checkboxCircle,
                    isChecked && styles.checkboxCircleChecked,
                  ]}
                >
                  {isChecked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </DismissibleModal>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  noteBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  noteInput: {
    minHeight: 60,
    maxHeight: 100,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
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
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomPriceCol: {
    flex: 1,
  },
  depositLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  depositPriceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  styleSectionBox: {
    gap: 8,
  },
  styleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  styleSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  styleSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 68,
  },
  styleSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  paletteIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FDA4AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  styleSelectorTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  styleSelectorMainText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  styleSelectorMainTextActive: {
    color: '#E11D48',
  },
  styleSelectorSubText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  styleSelectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  styleCountBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  styleTagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    minHeight: 36,
  },
  selectedTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  selectedTagPillAny: {
    backgroundColor: '#FFF1F2',
  },
  selectedTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9F1239',
    lineHeight: 18,
  },

  modalOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  styleBottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  stylesListScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  stylesListScrollInner: {
    paddingBottom: 20,
    gap: 10,
  },
  styleRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  styleRowCardChecked: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FDA4AF',
  },
  styleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 10,
  },
  styleIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleIconBoxChecked: {
    backgroundColor: '#FFE4E6',
  },
  styleNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  styleNameTextChecked: {
    color: '#BE123C',
    fontWeight: '700',
  },
  styleDescText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleChecked: {
    backgroundColor: '#E11D48',
    borderColor: '#E11D48',
  },
});
