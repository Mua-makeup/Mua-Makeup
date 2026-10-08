import { DismissibleModal } from '@/components/common/DismissibleModal';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import { UserAvatar } from '@/components/common/UserAvatar';
import { bookingService, BookingStatusDetailRes, CandidatePackageRes } from '@/services/booking.service';
import { websocketService } from '@/services/websocket.service';

interface AddOnOption {
  id: string;
  name: string;
  price: number;
  durationMinutes?: number;
  description: string;
}

const REJECT_REASONS = [
  'Muốn đổi chuyên viên make-up khác',
  'Thời gian thợ đến nơi quá lâu',
  'Bận việc đột xuất / hủy kế hoạch',
  'Không đồng ý với chi phí phát sinh',
];

export default function InstantMatchedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingDetail, setBookingDetail] = useState<BookingStatusDetailRes | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number>(600); // 10 phút kiểm tra & giữ chỗ (đồng bộ thợ)
  const [isExpired, setIsExpired] = useState(false);

  // Modal Từ chối thợ (Kèm lý do)
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Tự động kiểm tra lại trạng thái khi màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      if (bookingId) {
        loadBookingData();
      }
    }, [bookingId])
  );

  useEffect(() => {
    if (!bookingId) return;
    loadBookingData();

    // Lắng nghe trạng thái realtime
    const topic = `/topic/booking-status/${bookingId}`;
    const matchedTopic = `/topic/booking-matched/${bookingId}`;

    const handleRealtimeStatus = (msg: any) => {
      // Đơn bị hủy hoặc từ chối hoặc quay về tìm kiếm -> lập tức điều hướng về trang chủ
      if (
        msg?.status === 'CANCELLED' ||
        msg?.status === 'CANCELLED_EXPIRED' ||
        msg?.status === 'CANCELLED_BY_CUSTOMER' ||
        msg?.status === 'REQUESTED' ||
        msg?.type === 'BOOKING_CANCELLED' ||
        msg?.type === 'BOOKING_REJECTED_BY_CUSTOMER' ||
        msg?.type === 'BOOKING_SEARCHING_AGAIN' ||
        msg?.type === 'BOOKING_TIMEOUT'
      ) {
        Alert.alert(
          'Thông Báo',
          msg?.message || 'Ca đặt lịch đã được hủy hoặc đang tiếp tục tìm kiếm chuyên viên khác.',
          [{ text: 'Về Trang Chủ', onPress: () => router.replace('/') }]
        );
        router.replace('/');
        return;
      }

      // Cập nhật khi gói dịch vụ / addons được xác nhận
      if (msg?.type === 'CUSTOMER_CONFIRMED_ADDONS') {
        loadBookingData();
      }

      // Nếu đơn đã cọc hoặc thợ đã di chuyển/đang thực hiện -> lập tức chuyển sang chi tiết đơn
      if (
        msg?.isDepositPaid === true ||
        msg?.type === 'CUSTOMER_CONFIRMED_DEPOSIT' ||
        msg?.type === 'PAYMENT_COMPLETED' ||
        msg?.status === 'ON_THE_WAY' ||
        msg?.status === 'ARRIVED' ||
        msg?.status === 'IN_PROGRESS'
      ) {
        router.replace(`/booking/detail/${bookingId}` as any);
      }
    };

    websocketService.subscribe(topic, handleRealtimeStatus);
    websocketService.subscribe(matchedTopic, handleRealtimeStatus);

    return () => {
      websocketService.unsubscribe(topic);
      websocketService.unsubscribe(matchedTopic);
    };
  }, [bookingId]);

  // Countdown timer 10 phút ở màn kiểm tra
  useEffect(() => {
    if (isExpired || isLoading) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isExpired, isLoading]);

  const loadBookingData = async () => {
    try {
      setIsLoading(true);
      const res = await bookingService.getBookingStatus(bookingId);
      if (res) {
        // NẾU ĐƠN ĐÃ CỌC HOẶC THỢ ĐÃ BẮT ĐẦU DI CHUYỂN -> CHUYỂN NGAY SANG CHI TIẾT ĐƠN
        if (
          Boolean(res.isDepositPaid) ||
          res.status === 'ON_THE_WAY' ||
          res.status === 'ARRIVED' ||
          res.status === 'IN_PROGRESS' ||
          res.status === 'COMPLETED' ||
          res.status === 'PAID_OUT'
        ) {
          router.replace(`/booking/detail/${bookingId}` as any);
          return;
        }

        // Nếu đơn đã bị hủy hoặc đang chuyển tìm kiếm chuyên viên khác
        if (
          res.status === 'CANCELLED' ||
          res.status === 'CANCELLED_EXPIRED' ||
          res.status === 'CANCELLED_BY_CUSTOMER' ||
          res.status === 'REQUESTED'
        ) {
          Alert.alert(
            'Thông Báo',
            'Ca đặt lịch này đã được hủy hoặc đang tiếp tục tìm kiếm chuyên viên khác.',
            [{ text: 'Về Trang Chủ', onPress: () => router.replace('/') }]
          );
          router.replace('/');
          return;
        }

        setBookingDetail(res);

        // Khởi tạo gói dịch vụ đã chọn
        if (res.packageId && !selectedPackageId) {
          setSelectedPackageId(res.packageId);
        } else if (res.availablePackages && res.availablePackages.length > 0 && !selectedPackageId) {
          setSelectedPackageId(res.availablePackages[0].id);
        }

        if (res.depositTimeoutSeconds !== undefined && res.depositTimeoutSeconds !== null) {
          setSecondsLeft(Math.max(0, res.depositTimeoutSeconds));
          if (res.depositTimeoutSeconds <= 0) {
            setIsExpired(true);
          }
        }
      }
    } catch (err: any) {
      console.warn('Lỗi tải thông tin thợ đã khớp:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAddon = (addonId: string) => {
    Haptics.selectionAsync();
    setSelectedAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((i) => i !== addonId) : [...prev, addonId]
    );
  };

  // Xác định đơn đặt đích danh thợ cụ thể (khách đã chọn gói cụ thể từ trước)
  const isDirectBooking = Boolean(bookingDetail?.isDirectBooking);

  // Danh sách các gói dịch vụ khả dụng của chuyên viên trong danh mục
  const availablePackages: CandidatePackageRes[] = useMemo(() => {
    return bookingDetail?.availablePackages || [];
  }, [bookingDetail?.availablePackages]);

  // Gói dịch vụ đang chọn
  const selectedPackage = useMemo(() => {
    if (selectedPackageId) {
      const found = availablePackages.find((p) => p.id === selectedPackageId);
      if (found) return found;
    }
    if (bookingDetail?.packageId) {
      const found = availablePackages.find((p) => p.id === bookingDetail.packageId);
      if (found) return found;
    }
    if (availablePackages.length > 0) return availablePackages[0];
    return null;
  }, [availablePackages, selectedPackageId, bookingDetail?.packageId]);

  // Chỉ hiển thị bộ chọn gói khi không phải đặt đích danh và thợ có nhiều hơn 1 gói trong danh mục
  const showPackageSelector = !isDirectBooking && availablePackages.length > 1;

  // Tính toán hóa đơn
  const baseServicePrice = Number(
    selectedPackage?.price ??
    bookingDetail?.packagePrice ??
    bookingDetail?.serviceSubtotal ??
    0
  );
  const emergencySurcharge = Number(bookingDetail?.surchargeFee || 150000);
  const distanceFee = Number(bookingDetail?.distanceFee || 0);

  const availableAddons: AddOnOption[] = useMemo(() => {
    if (bookingDetail?.availableAddons && bookingDetail.availableAddons.length > 0) {
      return bookingDetail.availableAddons.map((item) => ({
        id: String(item.id),
        name: item.itemName,
        price: Number(item.itemPrice || 0),
        durationMinutes: Number(item.durationMinutes || 0),
        description: item.durationMinutes ? `Thời gian ước tính: ~${item.durationMinutes} phút` : 'Tiện ích mua thêm cho dịch vụ',
      }));
    }
    return [];
  }, [bookingDetail?.availableAddons]);

  const selectedAddons = availableAddons.filter((a) => selectedAddonIds.includes(a.id));
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const addonsExtraMinutes = selectedAddons.reduce((sum, a) => sum + (a.durationMinutes || 0), 0);
  const baseServiceDuration = Number(
    selectedPackage?.estimatedDurationMinutes ||
    bookingDetail?.estimatedDurationMinutes ||
    (bookingDetail as any)?.durationMinutes ||
    60
  );
  const totalServiceDuration = baseServiceDuration + addonsExtraMinutes;

  const totalAmount = baseServicePrice + emergencySurcharge + distanceFee + addonsTotal;
  const depositAmount = Math.round(totalAmount * 0.3);
  const remainingAmount = totalAmount - depositAmount;

  const formatVnd = (val: number) => (val || 0).toLocaleString('vi-VN') + ' đ';

  // Khách bấm TỪ CHỐI THỢ -> Mở Modal chọn lý do
  const handleOpenRejectModal = () => {
    setRejectReason('');
    setIsRejectModalVisible(true);
  };

  // Xác nhận gửi lý do từ chối thợ lên backend
  const handleConfirmRejectProvider = async () => {
    try {
      setIsSubmitting(true);
      await bookingService.rejectMatchedProvider(bookingId, rejectReason.trim() || undefined);
      setIsRejectModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Đang Tìm Kiếm Thợ Khác',
        'Hệ thống đã tiếp nhận lý do và đang tiếp tục tìm kiếm chuyên viên make-up tiếp theo cho bạn.',
        [{ text: 'Đồng Ý', onPress: () => router.replace('/') }]
      );
      router.replace('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể từ chối thợ.';
      Alert.alert('Thao Tác Thất Bại', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Khách bấm ĐẶT CỌC NGAY -> Lưu gói đã chọn + add-ons (nếu có) và chuyển sang Màn hình chọn MoMo / VNPay
  const handleProceedToDeposit = async () => {
    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const chosenPackageId = selectedPackage?.id || bookingDetail?.packageId;
      const addOnNames = selectedAddons.map((a) => a.name);

      await bookingService.confirmDeposit(bookingId, {
        packageId: chosenPackageId,
        addOnNames: addOnNames.length > 0 ? addOnNames : undefined,
        addOnTotal: addonsTotal > 0 ? addonsTotal : undefined,
      });

      // Điều hướng trực tiếp sang màn hình thanh toán cọc MoMo / VNPay (dùng replace để xóa màn hình match tạm thời)
      router.replace(`/booking/deposit/${bookingId}` as any);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể chuẩn bị đơn cọc.';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Đang chuẩn bị thông tin chuyên viên...</Text>
      </SafeAreaView>
    );
  }

  const muaAvatar = bookingDetail?.muaAvatar;
  const muaName = bookingDetail?.muaName || 'Chuyên viên Make-up';
  const muaRating = bookingDetail?.rating ? Number(bookingDetail.rating).toFixed(1) : '5.0';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
        >
          <Ionicons name="close" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerBadge}>⚡ CA KHẨN CẤP KHỚP THÀNH CÔNG</Text>
          <Text style={styles.headerTitle}>Xác Nhận & Đặt Cọc Giữ Chỗ</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* 5-minute countdown banner */}
      <View style={[styles.timerBanner, isExpired && styles.timerBannerExpired]}>
        <Ionicons
          name={isExpired ? 'alert-circle' : 'stopwatch'}
          size={18}
          color={isExpired ? '#DC2626' : '#D97706'}
        />
        <Text style={[styles.timerBannerText, isExpired && styles.timerBannerTextExpired]}>
          {isExpired
            ? 'ĐÃ QUÁ HẠN 5 PHÚT ĐẶT CỌC GIỮ CHỖ'
            : `Thời hạn giữ chỗ còn lại: ${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')}`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* MUA Profile Highlight Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeaderRow}>
            <UserAvatar uri={muaAvatar} name={muaName} size={58} />
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.muaName} numberOfLines={1}>{muaName}</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color="#059669" />
                  <Text style={styles.verifiedText}>Đã Xác Thực</Text>
                </View>
              </View>

              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>{muaRating}</Text>
                <Text style={styles.ratingCount}>• Đối tác chuyên nghiệp</Text>
              </View>

              {bookingDetail?.destinationAddress ? (
                <View style={styles.addressRow}>
                  <Ionicons name="location-sharp" size={12} color="#E11D48" />
                  <Text style={styles.addressSnippet} numberOfLines={1}>
                    {bookingDetail.destinationAddress}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Button to view MUA full portfolio & reviews */}
          {bookingDetail?.muaId && (
            <TouchableOpacity
              style={styles.viewProfileBtn}
              onPress={() => router.push(`/mua-detail/${bookingDetail.muaId}` as any)}
            >
              <Ionicons name="eye-outline" size={15} color="#4F46E5" />
              <Text style={styles.viewProfileText}>Xem Hồ Sơ & Đánh Giá Chi Tiết</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Selected Package / Candidate Packages */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>
              {showPackageSelector ? 'Chọn Gói Dịch Vụ Của Chuyên Viên' : 'Gói Dịch Vụ Tiếp Nhận'}
            </Text>
            {showPackageSelector && (
              <View style={styles.pkgCountBadge}>
                <Text style={styles.pkgCountText}>{availablePackages.length} gói</Text>
              </View>
            )}
          </View>

          {showPackageSelector ? (
            <>
              <Text style={styles.sectionSubtitle}>
                Chuyên viên có nhiều gói dịch vụ trong danh mục này. Vui lòng chọn gói bạn muốn:
              </Text>
              <View style={styles.packagesList}>
                {availablePackages.map((pkg) => {
                  const isSelected = (selectedPackage?.id === pkg.id);
                  return (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[styles.packageOptionCard, isSelected && styles.packageOptionCardSelected]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedPackageId(pkg.id);
                      }}
                      activeOpacity={0.8}
                    >
                      {/* Hàng tiêu đề: Radio + Tên gói + Giá tiền */}
                      <View style={styles.pkgCardHeader}>
                        <View style={[styles.pkgRadioOuter, isSelected && styles.pkgRadioOuterActive]}>
                          {isSelected && <View style={styles.pkgRadioInner} />}
                        </View>
                        <View style={styles.pkgTitleWrap}>
                          <Text style={[styles.pkgNameText, isSelected && styles.pkgNameTextSelected]} numberOfLines={2}>
                            {pkg.packageName}
                          </Text>
                        </View>
                        <View style={[styles.pkgPriceBadge, isSelected && styles.pkgPriceBadgeSelected]}>
                          <Text style={[styles.pkgPriceText, isSelected && styles.pkgPriceTextSelected]}>
                            {formatVnd(Number(pkg.price || 0))}
                          </Text>
                        </View>
                      </View>

                      {/* Mô tả gói (nếu có) */}
                      {pkg.description ? (
                        <Text style={styles.pkgDescription} numberOfLines={2}>
                          {pkg.description}
                        </Text>
                      ) : null}

                      {/* Hàng thông tin thời lượng & badge trạng thái */}
                      <View style={styles.pkgCardFooter}>
                        <View style={styles.pkgDurationPill}>
                          <Ionicons name="time-outline" size={12} color="#92400E" />
                          <Text style={styles.pkgDurationText}>
                            Ước tính: ~{pkg.estimatedDurationMinutes || 60} phút
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={styles.pkgActiveTag}>
                            <Ionicons name="checkmark-circle" size={12} color="#059669" />
                            <Text style={styles.pkgActiveTagText}>Đang chọn</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.singlePackageBox}>
              <View style={styles.sparkleCircle}>
                <Ionicons name="brush-outline" size={18} color="#334155" />
              </View>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={styles.singlePackageName}>
                  {selectedPackage?.packageName || bookingDetail?.packageName || 'Gói Trang Điểm'}
                </Text>
                <View style={styles.singlePackageDurationRow}>
                  <Ionicons name="time-outline" size={12} color="#B45309" />
                  <Text style={styles.singlePackageDuration}>
                    Thời lượng ước tính: ~{totalServiceDuration} phút{addonsExtraMinutes > 0 ? ` (Gốc: ${baseServiceDuration}p + Mua thêm: ${addonsExtraMinutes}p)` : ''}
                  </Text>
                </View>
              </View>
              <Text style={styles.singlePackagePrice}>{formatVnd(baseServicePrice)}</Text>
            </View>
          )}
        </View>

        {/* Add-ons Checklist */}
        {availableAddons.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dịch Vụ Mua Thêm (Tùy Chọn)</Text>
          <Text style={styles.sectionSubtitle}>
            Bạn có thể tích chọn thêm các tiện ích để thợ chuẩn bị đầy đủ dụng cụ:
          </Text>

          {addonsExtraMinutes > 0 && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#FEF3C7',
              borderWidth: 1,
              borderColor: '#FDE68A',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginTop: 10,
              marginBottom: 10,
            }}>
              <Ionicons name="time" size={16} color="#B45309" />
              <Text style={{ fontSize: 13, color: '#92400E', flex: 1, lineHeight: 18 }}>
                Tổng thời lượng dịch vụ: <Text style={{ fontWeight: '700', color: '#92400E' }}>~{totalServiceDuration} phút</Text> (Đã cộng thêm +{addonsExtraMinutes} phút từ {selectedAddons.length} dịch vụ mua thêm)
              </Text>
            </View>
          )}

          {availableAddons.map((addon) => {
            const isSelected = selectedAddonIds.includes(addon.id);
            return (
              <TouchableOpacity
                key={addon.id}
                style={[styles.addonRow, isSelected && styles.addonRowSelected]}
                onPress={() => toggleAddon(addon.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isSelected ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={isSelected ? BrandColors.primary : '#94A3B8'}
                />
                <View style={styles.addonInfo}>
                  <Text style={[styles.addonName, isSelected && styles.addonNameSelected]}>
                    {addon.name}
                  </Text>
                  <Text style={styles.addonDesc}>{addon.description}</Text>
                </View>
                <Text style={styles.addonPrice}>+{formatVnd(addon.price)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        )}

        {/* Detailed Bill Breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chi Tiết Hóa Đơn Minh Bạch</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Giá niêm yết gói make-up:</Text>
            <Text style={styles.billValue}>{formatVnd(baseServicePrice)}</Text>
          </View>

          <View style={styles.billRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.billLabel}>Phụ phí ca khẩn cấp (cố định):</Text>
              <Ionicons name="time-outline" size={13} color="#D97706" />
            </View>
            <Text style={styles.billValue}>{formatVnd(emergencySurcharge)}</Text>
          </View>

          {distanceFee > 0 && (
            <View style={styles.billRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.billLabel}>Phí di chuyển vượt 2km:</Text>
                <Ionicons name="car-outline" size={14} color="#64748B" />
              </View>
              <Text style={styles.billValue}>{formatVnd(distanceFee)}</Text>
            </View>
          )}

          {addonsTotal > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Dịch vụ mua thêm ({selectedAddons.length}):</Text>
              <Text style={[styles.billValue, { color: '#059669' }]}>+{formatVnd(addonsTotal)}</Text>
            </View>
          )}

          <View style={styles.billRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.billLabel}>Thời gian phục vụ ước tính:</Text>
              <Ionicons name="time-outline" size={13} color="#2563EB" />
            </View>
            <Text style={[styles.billValue, { color: '#2563EB', fontWeight: '700' }]}>
              ~{totalServiceDuration} phút {addonsExtraMinutes > 0 ? `(+${addonsExtraMinutes}p)` : ''}
            </Text>
          </View>

          <View style={styles.billDivider} />

          <View style={styles.billRowTotal}>
            <Text style={styles.billLabelTotal}>TỔNG TIỀN DỊCH VỤ:</Text>
            <Text style={styles.billValueTotal}>{formatVnd(totalAmount)}</Text>
          </View>

          <View style={styles.escrowBox}>
            <View style={styles.escrowRow}>
              <View>
                <Text style={styles.escrowTitle}>Cọc Giữ Chỗ 30% (Escrow):</Text>
                <Text style={styles.escrowSub}>Khóa an toàn trên hệ thống tới khi nghiệm thu</Text>
              </View>
              <Text style={styles.escrowHighlight}>{formatVnd(depositAmount)}</Text>
            </View>
            <Text style={styles.escrowRemaining}>
              Còn lại 70% ({formatVnd(remainingAmount)}) thanh toán sau khi trang điểm hoàn tất.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footerBar}>
        {isExpired ? (
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: '#64748B' }]}
            onPress={() => router.replace('/')}
          >
            <Ionicons name="home-outline" size={18} color="#FFFFFF" />
            <Text style={styles.acceptBtnText}>ĐƠN ĐÃ QUÁ HẠN 10 PHÚT - VỀ TRANG CHỦ</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={handleOpenRejectModal}
              disabled={isSubmitting}
            >
              <Ionicons name="close-circle-outline" size={18} color="#E11D48" />
              <Text style={styles.rejectBtnText}>Từ Chối Thợ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptBtn, isSubmitting && styles.disabledBtn]}
              onPress={handleProceedToDeposit}
              disabled={isSubmitting}
            >
              <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.acceptBtnText}>
                {isSubmitting ? 'ĐANG CHUYỂN TRANG...' : `ĐẶT CỌC NGAY (${formatVnd(depositAmount)})`}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ========================================================================= */}
      {/* MODAL 1: TỪ CHỐI THỢ KÈM CHỌN & NHẬP LÝ DO                                */}
      {/* ========================================================================= */}
      <DismissibleModal visible={isRejectModalVisible} onClose={() => setIsRejectModalVisible(false)} dismissDisabled={isSubmitting} overlayStyle={styles.modalOverlay} contentStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="close-circle" size={20} color="#E11D48" />
                <Text style={styles.modalTitle}>Từ Chối Chuyên Viên & Tìm Thợ Khác</Text>
              </View>
              <TouchableOpacity onPress={() => setIsRejectModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalSubtitle}>
                Vui lòng chọn hoặc nhập lý do từ chối để hệ thống điều phối chuyên viên make-up tiếp theo phù hợp hơn cho bạn:
              </Text>

              <View style={styles.reasonsList}>
                {REJECT_REASONS.map((r, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.reasonChip, rejectReason === r && styles.reasonChipSelected]}
                    onPress={() => setRejectReason(r)}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        rejectReason === r && styles.reasonChipTextSelected,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.reasonInput}
                placeholder="Nhập lý do chi tiết khác (tùy chọn)..."
                placeholderTextColor="#94A3B8"
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsRejectModalVisible(false)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.modalCancelBtnText}>Giữ Lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, isSubmitting && styles.disabledBtn]}
                  onPress={handleConfirmRejectProvider}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Xác Nhận Từ Chối</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </DismissibleModal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  timerBannerExpired: {
    backgroundColor: '#FEE2E2',
    borderBottomColor: '#FECDD3',
  },
  timerBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  timerBannerTextExpired: {
    color: '#DC2626',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  muaName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  ratingCount: {
    fontSize: 12,
    color: '#64748B',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  addressSnippet: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  viewProfileBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  viewProfileText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  pkgCountBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pkgCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  packagesList: {
    gap: 12,
    marginTop: 8,
  },
  packageOptionCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  packageOptionCardSelected: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  pkgCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pkgRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pkgRadioOuterActive: {
    borderColor: '#D97706',
  },
  pkgRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D97706',
  },
  pkgTitleWrap: {
    flex: 1,
    marginHorizontal: 10,
  },
  pkgNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
  },
  pkgNameTextSelected: {
    color: '#92400E',
    fontWeight: '800',
  },
  pkgPriceBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pkgPriceBadgeSelected: {
    backgroundColor: '#FEF3C7',
  },
  pkgPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  pkgPriceTextSelected: {
    fontSize: 15,
    fontWeight: '900',
    color: '#B45309',
  },
  pkgDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    marginLeft: 30,
    lineHeight: 16,
  },
  pkgCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginLeft: 30,
  },
  pkgDurationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pkgDurationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  pkgActiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pkgActiveTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  singlePackageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 6,
  },
  sparkleCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  singlePackageName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 18,
  },
  singlePackageDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  singlePackageDuration: {
    fontSize: 11,
    color: '#B45309',
  },
  singlePackagePrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 10,
  },
  addonRowSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  addonInfo: {
    flex: 1,
  },
  addonName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  addonNameSelected: {
    color: '#9F1239',
    fontWeight: '700',
  },
  addonDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  addonPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E11D48',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  billLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  billRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  billLabelTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  billValueTotal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#E11D48',
  },
  escrowBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  escrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  escrowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  escrowSub: {
    fontSize: 10,
    color: '#047857',
    marginTop: 1,
  },
  escrowHighlight: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
  },
  escrowRemaining: {
    fontSize: 11,
    color: '#065F46',
    marginTop: 8,
    fontStyle: 'italic',
  },
  footerBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingVertical: 14,
    borderRadius: 12,
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E11D48',
  },
  acceptBtn: {
    flex: 2.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E11D48',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
    marginBottom: 8,
  },
  reasonsList: {
    gap: 8,
    marginVertical: 10,
  },
  reasonChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  reasonChipSelected: {
    borderColor: '#E11D48',
    backgroundColor: '#FFF1F2',
  },
  reasonChipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  reasonChipTextSelected: {
    color: '#E11D48',
    fontWeight: '700',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginTop: 10,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  depositTimerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 12,
  },
  depositTimerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  checkoutSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  checkoutSummaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  checkoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  checkoutLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  checkoutValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  checkoutAddonsBox: {
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
    marginVertical: 6,
  },
  checkoutAddonsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 4,
  },
  checkoutAddonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  checkoutAddonName: {
    fontSize: 11,
    color: '#78350F',
  },
  checkoutAddonPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  checkoutDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  checkoutRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkoutLabelTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  checkoutValueTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  depositHighlightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 6,
  },
  depositHighlightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  depositHighlightSub: {
    fontSize: 10,
    color: '#047857',
  },
  depositHighlightValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
  },
  paymentMethodTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  paymentMethodCardSelected: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  paymentMethodRadio: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  radioCircleActive: {
    borderColor: '#059669',
    backgroundColor: '#059669',
  },
  paymentMethodIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  paymentMethodSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  depositActionRow: {
    marginTop: 10,
    marginBottom: 16,
  },
  confirmDepositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmDepositBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
