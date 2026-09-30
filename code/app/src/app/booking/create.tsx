import React, { useEffect, useState } from 'react';
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
import { packageService, PackageDetail } from '@/services/package.service';
import { muaProfileService, MuaPublicProfile } from '@/services/mua-profile.service';
import { BookingHeaderCard } from '@/components/booking/BookingHeaderCard';
import { DateTimeSelector } from '@/components/booking/DateTimeSelector';
import { PackageItemPicker } from '@/components/booking/PackageItemPicker';
import { DestinationAddressPicker } from '@/components/booking/DestinationAddressPicker';
import { InvoiceSummaryCard } from '@/components/booking/InvoiceSummaryCard';
import { useLocationStore } from '@/store/location.store';
import { createBookingSchema } from '@/schemas/booking-create.schema';
import { parseApiError } from '@/utils/error';

export default function CreateBookingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ packageId?: string; muaId?: string; providerType?: string }>();

  const targetPackageId = params.packageId ? parseInt(params.packageId, 10) : 1;
  const targetMuaId = params.muaId ? parseInt(params.muaId, 10) : 1;
  const providerType = (params.providerType as 'FREELANCER' | 'AGENCY') || 'FREELANCER';

  const [packageDetail, setPackageDetail] = useState<PackageDetail | null>(null);
  const [muaProfile, setMuaProfile] = useState<MuaPublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { currentAddress, latitude: currentLat, longitude: currentLng } = useLocationStore();

  const {
    selectedDate,
    selectedTimeSlot,
    destinationAddress,
    destinationLatitude,
    destinationLongitude,
    selectedAddOnIds,
    note,
    voucherCode,
    distanceInfo,
    invoicePreview,
    isCalculatingPrice,
    setPackageAndProvider,
    setDate,
    setTimeSlot,
    setDestination,
    toggleAddOn,
    setNote,
    setVoucherCode,
    submitBooking,
    resetBookingForm,
  } = useBookingStore();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [pkg, profile] = await Promise.all([
          packageService.getPackageById(targetPackageId),
          muaProfileService.getPublicProfile(targetMuaId),
        ]);
        setPackageDetail(pkg);
        setMuaProfile(profile);

        // Đồng bộ store
        setPackageAndProvider(targetPackageId, targetMuaId, providerType);

        // Tự động điền vị trí GPS hiện tại của khách nếu có
        if ((!destinationLatitude || destinationLatitude === 0) && currentLat && currentLng) {
          setDestination(currentAddress, currentLat, currentLng);
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
  }, [targetPackageId, targetMuaId, providerType, currentLat, currentLng]);

  const handleSubmit = async () => {
    // 1. Validate Form 100% bằng Zod Schema
    const bookingTime = `${selectedDate}T${selectedTimeSlot}:00`;
    const validation = createBookingSchema.safeParse({
      packageId: targetPackageId,
      providerId: targetMuaId,
      providerType,
      bookingTime,
      destinationAddress,
      destinationLatitude,
      destinationLongitude,
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
      await submitBooking();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Đặt Lịch Thành Công! 🎉',
        'Yêu cầu trang điểm của bạn đã được gửi tới chuyên viên MUA. Vui lòng theo dõi tiến trình tại mục Lịch Hẹn.',
        [
          {
            text: 'Xem Lịch Hẹn',
            onPress: () => router.replace('/bookings'),
          },
        ]
      );
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

  const depositAmount = invoicePreview?.financialSummary?.depositRequiredAmount || 0;
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. TÓM TẮT GÓI & THỢ */}
        <BookingHeaderCard
          packageDetail={packageDetail}
          muaProfile={muaProfile}
        />

        {/* 2. CHỌN NGÀY & KHUNG GIỜ */}
        <DateTimeSelector
          selectedDate={selectedDate}
          selectedTimeSlot={selectedTimeSlot}
          onSelectDate={setDate}
          onSelectTimeSlot={setTimeSlot}
        />

        {/* 3. BƯỚC MẶC ĐỊNH & CHECKBOX MUA THÊM */}
        <PackageItemPicker
          items={packageDetail?.items || []}
          selectedAddOnIds={selectedAddOnIds}
          onToggleAddOn={toggleAddOn}
        />

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
});
