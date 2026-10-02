import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { BrandColors } from '@/constants/theme';
import { bookingService, BookingStatusDetailRes, BookingStatusType } from '@/services/booking.service';
import { websocketService } from '@/services/websocket.service';
import { depositService } from '@/services/deposit.service';
import { formatDateTimeVN } from '@/utils/date';

const CANCEL_REASONS = [
  'Bận việc đột xuất / Không thể tiếp tục',
  'Thợ di chuyển quá chậm / Không liên lạc được',
  'Đặt nhầm địa chỉ hoặc thời gian make-up',
  'Thay đổi ý định / Muốn đặt lại sau',
  'Lý do khác',
];

export default function CustomerBookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bookingDetail, setBookingDetail] = useState<BookingStatusDetailRes | null>(null);
  const [isCashPaidConfirmed, setIsCashPaidConfirmed] = useState(false);
  const [isConfirmingCash, setIsConfirmingCash] = useState(false);
  const [isPayingOnline, setIsPayingOnline] = useState(false);
  const [onlineGatewayPaying, setOnlineGatewayPaying] = useState<'MOMO' | 'VNPAY' | null>(null);

  // Modal Hủy ca
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Modal Phóng to ảnh nghiệm thu
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);

  // Bộ đếm đếm ngược chuyên viên phản hồi (REQUESTED)
  const [confirmSecondsRemaining, setConfirmSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (bookingDetail?.status === 'REQUESTED') {
      let initialSeconds = bookingDetail.confirmTimeoutSeconds || 0;
      if (!initialSeconds && bookingDetail.confirmDeadline) {
        const deadlineMs = new Date(bookingDetail.confirmDeadline).getTime();
        const nowMs = Date.now();
        initialSeconds = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
      }
      setConfirmSecondsRemaining(initialSeconds);
    }
  }, [bookingDetail?.status, bookingDetail?.confirmTimeoutSeconds, bookingDetail?.confirmDeadline]);

  useEffect(() => {
    if (bookingDetail?.status !== 'REQUESTED' || confirmSecondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setConfirmSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          loadBookingData(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [bookingDetail?.status, confirmSecondsRemaining]);

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancelRequested = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Hủy Đơn & Hoàn Cọc',
      'Bạn có chắc chắn muốn hủy đơn hẹn đang chờ chuyên viên xác nhận? Toàn bộ 100% tiền cọc sẽ được hoàn trả về ví tài khoản của bạn ngay lập tức.',
      [
        { text: 'Suy Nghĩ Lại', style: 'cancel' },
        {
          text: 'Xác Nhận Hủy',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await bookingService.cancelRequestedBooking(bookingId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Thành Công', 'Đã hủy đơn hẹn và hoàn tiền cọc vào ví của bạn thành công.');
              await loadBookingData(true);
            } catch (err: any) {
              Alert.alert('Lỗi Hủy Đơn', err?.response?.data?.message || err?.message || 'Không thể hủy đơn hẹn.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const loadBookingData = async (refresh = false) => {
    if (!bookingId) return;
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await bookingService.getBookingStatus(bookingId);
      setBookingDetail(data);
    } catch {
      // Thử tìm trong danh sách my bookings nếu API status tạm thời gặp lỗi
      try {
        const myBookings = await bookingService.getMyBookings();
        const found = myBookings.find((b) => b.id === bookingId);
        if (found) {
          setBookingDetail({
            bookingId: found.id,
            bookingCode: found.bookingCode,
            status: found.status,
            destinationAddress: found.destinationAddress,
            destinationLatitude: found.destinationLatitude,
            destinationLongitude: found.destinationLongitude,
            muaId: found.muaId,
            muaName: found.muaName,
            muaPhone: found.muaPhoneNumber,
            muaAvatar: found.muaAvatarUrl,
            packageName: found.packageName,
            packageItems: found.addOnNames,
            totalAmount: found.totalAmount,
            depositAmount: found.depositAmount,
            serviceSubtotal: found.totalAmount,
            isDepositPaid: found.isDepositPaid,
            updatedAt: found.createdAt,
          });
        }
      } catch {
        // im lặng
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookingData();

    // Lắng nghe cập nhật trạng thái realtime
    if (bookingId) {
      const topic = `/topic/booking-status/${bookingId}`;
      websocketService.subscribe(topic, (msg: any) => {
        if (msg) {
          if (
            msg.status === 'PAID_OUT' ||
            msg.type === 'PAYMENT_COMPLETED' ||
            msg.isDepositPaid ||
            msg.status === 'ACCEPTED'
          ) {
            try {
              WebBrowser.dismissBrowser();
            } catch {}
          }
          loadBookingData(true);
        }
      });
      return () => {
        websocketService.unsubscribe(topic);
      };
    }
  }, [bookingId]);

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getStatusBadge = (status?: BookingStatusType) => {
    switch (status) {
      case 'PENDING_DEPOSIT':
        return { label: 'Chờ Đặt Cọc', color: '#D97706', bg: '#FEF3C7', icon: 'card-outline' };
      case 'REQUESTED':
        return { label: 'Chờ Chuyên Viên Tiếp Nhận', color: '#D97706', bg: '#FEF3C7', icon: 'hourglass-outline' };
      case 'PENDING_AGENCY_DISPATCH':
        return { label: 'Đang Điều Thợ', color: '#D97706', bg: '#FEF3C7', icon: 'sync-outline' };
      case 'AGENCY_ASSIGNED':
      case 'ACCEPTED':
        return { label: 'Đã Nhận Đơn', color: '#2563EB', bg: '#DBEAFE', icon: 'checkmark-circle-outline' };
      case 'ON_THE_WAY':
        return { label: 'Thợ Đang Tới', color: '#7C3AED', bg: '#EDE9FE', icon: 'bicycle-outline' };
      case 'ARRIVED':
        return { label: 'Thợ Đã Đến Nơi', color: '#C026D3', bg: '#FAE8FF', icon: 'location-outline' };
      case 'IN_PROGRESS':
        return { label: 'Đang Trang Điểm', color: BrandColors.primary, bg: '#FFF1F2', icon: 'sparkles-outline' };
      case 'COMPLETED':
      case 'PAID_OUT':
        return { label: 'Hoàn Thành', color: '#059669', bg: '#D1FAE5', icon: 'checkmark-done-circle-outline' };
      case 'CANCELLED':
      case 'EXPIRED':
        return { label: 'Đã Hủy', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline' };
      case 'DISPUTED':
        return { label: 'Đang Khiếu Nại', color: '#EA580C', bg: '#FFEDD5', icon: 'alert-circle-outline' };
      default:
        return { label: status || 'Không rõ', color: '#64748B', bg: '#F1F5F9', icon: 'help-circle-outline' };
    }
  };

  const handleCallMUA = () => {
    Haptics.selectionAsync();
    const phone = bookingDetail?.muaPhone || bookingDetail?.muaPhoneNumber;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Liên Hệ', 'Số điện thoại của thợ: 0987.654.321');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Chưa chọn lý do', 'Vui lòng chọn hoặc nhập lý do hủy lịch.');
      return;
    }

    setIsCancelling(true);
    try {
      await bookingService.cancelBooking(bookingId, cancelReason);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsCancelModalVisible(false);
      Alert.alert('Đã Hủy Ca Hẹn', 'Yêu cầu hủy đơn trang điểm của bạn đã được ghi nhận thành công.');
      loadBookingData(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể hủy đơn tại thời điểm này.';
      Alert.alert('Lỗi Hủy Ca', msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmCustomerCash = async () => {
    try {
      setIsConfirmingCash(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await depositService.confirmCustomerCashPayment(bookingId, 'v1');
      setIsCashPaidConfirmed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Đã Gửi Báo Trả Tiền Mặt',
        'Vui lòng đưa đủ tiền mặt cho chuyên viên make-up. Chuyên viên sẽ xác nhận sau khi nhận đủ tiền.'
      );
      loadBookingData(true);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể xác nhận trả tiền mặt.');
    } finally {
      setIsConfirmingCash(false);
    }
  };

  const handlePayRemainingOnline = async (gateway: 'MOMO' | 'VNPAY') => {
    try {
      setIsPayingOnline(true);
      setOnlineGatewayPaying(gateway);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const res = await depositService.createFinalPaymentIntent(bookingId, gateway);
      const paymentLink = res?.paymentUrl;
      if (!paymentLink) {
        throw new Error('Cổng thanh toán không trả về liên kết thanh toán.');
      }

      if (Platform.OS === 'web') {
        window.open(paymentLink, '_blank');
      } else {
        try {
          const authRes = await WebBrowser.openAuthSessionAsync(paymentLink, 'app://');
          if (authRes.type === 'success') {
            loadBookingData(true);
          }
        } catch {
          await WebBrowser.openBrowserAsync(paymentLink, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
            toolbarColor: '#0F172A',
          });
        }
      }
      loadBookingData(true);
    } catch (err: any) {
      Alert.alert('Lỗi Thanh Toán', err?.response?.data?.message || err?.message || 'Không thể tạo liên kết thanh toán.');
    } finally {
      setIsPayingOnline(false);
      setOnlineGatewayPaying(null);
    }
  };

  if (isLoading && !bookingDetail) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải chi tiết ca làm đẹp...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!bookingDetail) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi Tiết Đơn Đặt</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={54} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Không tìm thấy đơn hàng</Text>
          <TouchableOpacity
            style={styles.goBackBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.goBackBtnText}>Quay Lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const badge = getStatusBadge(bookingDetail.status);
  const remainingAmount = Math.max(0, (bookingDetail.totalAmount || 0) - (bookingDetail.depositAmount || 0));

  // Xác định bước tiến trình (0: Đặt đơn, 1: Thợ nhận, 2: Di chuyển, 3: Trang điểm, 4: Hoàn thành)
  const getStepIndex = (status: BookingStatusType) => {
    switch (status) {
      case 'REQUESTED':
      case 'PENDING_AGENCY_DISPATCH':
        return 0;
      case 'AGENCY_ASSIGNED':
      case 'ACCEPTED':
        return 1;
      case 'ON_THE_WAY':
      case 'ARRIVED':
        return 2;
      case 'IN_PROGRESS':
        return 3;
      case 'COMPLETED':
      case 'PAID_OUT':
        return 4;
      default:
        return -1;
    }
  };

  const currentStep = getStepIndex(bookingDetail.status);
  const isCancelled = bookingDetail.status === 'CANCELLED' || bookingDetail.status === 'EXPIRED';

  const defaultPackageSteps = [
    'Tư vấn tone make-up phù hợp trang phục & khuôn mặt',
    'Làm sạch sâu & dưỡng ẩm chuyên sâu 3 lớp',
    'Đánh nền kiềm dầu, mỏng nhẹ, giữ tông 12h',
    'Tạo khối sống mũi, đánh phấn mắt và chuốt mi cong',
    'Tô son màu chuẩn sắc & xịt khoáng khóa nền cao cấp',
  ];

  const stepsToRender = bookingDetail.packageItems && bookingDetail.packageItems.length > 0
    ? bookingDetail.packageItems
    : defaultPackageSteps;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* HEADER TOP BAR */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Chi Tiết Đơn Đặt</Text>
          <Text style={styles.headerSubtitle}>{bookingDetail.bookingCode || `#BK-${bookingDetail.bookingId}`}</Text>
        </View>
        <TouchableOpacity
          onPress={() => loadBookingData(true)}
          style={styles.refreshIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="reload-outline" size={20} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadBookingData(true)}
            colors={[BrandColors.primary]}
          />
        }
      >
        {/* BANNER TRẠNG THÁI HIỆN TẠI */}
        <View style={[styles.statusBanner, { backgroundColor: badge.bg, borderColor: badge.color + '33' }]}>
          <View style={styles.statusBannerLeft}>
            <View style={[styles.statusIconWrap, { backgroundColor: badge.color }]}>
              <Ionicons name={badge.icon as any} size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusBannerTitle, { color: badge.color }]}>{badge.label}</Text>
              <Text style={styles.statusBannerDesc}>
                {bookingDetail.status === 'PENDING_DEPOSIT' && 'Đơn hàng đang chờ thanh toán đặt cọc 30% để xác nhận giữ chỗ'}
                {bookingDetail.status === 'ON_THE_WAY' && 'Chuyên viên MUA đang trên đường tới điểm hẹn'}
                {bookingDetail.status === 'ARRIVED' && 'Chuyên viên đã đến điểm hẹn, sẵn sàng đồ nghề'}
                {bookingDetail.status === 'IN_PROGRESS' && 'Đang trong quá trình thực hiện gói trang điểm'}
                {bookingDetail.status === 'COMPLETED' && 'Ca trang điểm đã hoàn thành xuất sắc'}
                {bookingDetail.status === 'ACCEPTED' && (bookingDetail.isDepositPaid ? 'Đã đặt cọc, chờ thợ khởi hành' : 'Vui lòng thanh toán cọc để giữ lịch thợ')}
                {bookingDetail.status === 'REQUESTED' && 'Khoản cọc 30% đã được bảo chứng an toàn trong Quỹ Escrow. Đang chờ chuyên viên tiếp nhận ca hẹn.'}
                {isCancelled && (bookingDetail.cancellationReason || 'Đơn đã hủy theo yêu cầu')}
              </Text>
            </View>
          </View>
        </View>

        {/* BANNER HÀNH ĐỘNG ĐẶT CỌC DÀNH CHO ĐƠN PENDING_DEPOSIT */}
        {bookingDetail.status === 'PENDING_DEPOSIT' && (
          <View style={styles.pendingDepositCtaCard}>
            <View style={styles.pendingDepositCtaHeader}>
              <View style={styles.pendingDepositCtaIconWrap}>
                <Ionicons name="shield-checkmark" size={24} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingDepositCtaTitle}>Cần Đặt Cọc 30% Giữ Chỗ</Text>
                <Text style={styles.pendingDepositCtaSubtitle}>
                  Chuyên viên đã được tạm giữ lịch. Vui lòng thanh toán cọc trong 15 phút để bảo chứng đơn.
                </Text>
              </View>
            </View>

            <View style={styles.pendingDepositCtaAmountBox}>
              <Text style={styles.pendingDepositCtaAmountLabel}>Số tiền cọc Escrow (30%):</Text>
              <Text style={styles.pendingDepositCtaAmountValue}>
                {formatPrice(bookingDetail.depositAmount || Math.round((bookingDetail.totalAmount || 0) * 0.3))}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.pendingDepositCtaBtn}
              onPress={() => router.push(`/booking/deposit/${bookingId}` as any)}
              activeOpacity={0.88}
            >
              <Ionicons name="card-outline" size={18} color="#FFFFFF" />
              <Text style={styles.pendingDepositCtaBtnText}>Thanh Toán Cọc Ngay</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* BANNER ĐANG CHỜ CHUYÊN VIÊN TIẾP NHẬN DÀNH CHO ĐƠN REQUESTED */}
        {bookingDetail.status === 'REQUESTED' && (
          <View style={styles.pendingRequestedCtaCard}>
            <View style={styles.pendingRequestedHeader}>
              <View style={styles.pendingRequestedIconWrap}>
                <Ionicons name="hourglass" size={24} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingRequestedTitle}>Chờ Chuyên Viên Tiếp Nhận</Text>
                <Text style={styles.pendingRequestedSubtitle}>
                  Khoản cọc 30% đã được khóa bảo chứng an toàn trong Quỹ Escrow. Chuyên viên đang kiểm tra lịch hẹn.
                </Text>
              </View>
            </View>

            <View style={styles.pendingRequestedTimerBox}>
              <View style={styles.pendingRequestedTimerLeft}>
                <Ionicons name="time-outline" size={18} color="#B45309" />
                <Text style={styles.pendingRequestedTimerLabel}>Thời gian phản hồi còn lại:</Text>
              </View>
              <Text style={styles.pendingRequestedTimerValue}>
                {formatCountdown(confirmSecondsRemaining)}
              </Text>
            </View>

            <Text style={styles.pendingRequestedNote}>
              Nếu chuyên viên không xác nhận trước khi hết giờ, hệ thống sẽ tự động hủy đơn và hoàn 100% tiền cọc về ví tài khoản của bạn.
            </Text>

            <TouchableOpacity
              style={styles.cancelRequestedBtn}
              onPress={handleCancelRequested}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
              <Text style={styles.cancelRequestedBtnText}>Hủy Chờ & Rút Cọc Về Ví Ngay</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LỘ TRÌNH TIẾN ĐỘ THỰC HIỆN (STEPPER) */}
        {!isCancelled && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tiến Trình Thực Hiện</Text>
            <View style={styles.stepperContainer}>
              {[
                { title: 'Nhận Ca', icon: 'receipt-outline' },
                { title: 'Chuẩn Bị', icon: 'bag-check-outline' },
                { title: 'Di Chuyển', icon: 'bicycle-outline' },
                { title: 'Make-up', icon: 'sparkles-outline' },
                { title: 'Xong', icon: 'checkmark-done-outline' },
              ].map((step, idx) => {
                const isPassed = currentStep > idx;
                const isCurrent = currentStep === idx;
                return (
                  <View key={`step-${idx}`} style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        isPassed && styles.stepCirclePassed,
                        isCurrent && styles.stepCircleCurrent,
                      ]}
                    >
                      <Ionicons
                        name={step.icon as any}
                        size={15}
                        color={isCurrent ? '#FFFFFF' : isPassed ? BrandColors.primary : '#94A3B8'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        (isCurrent || isPassed) && styles.stepLabelActive,
                      ]}
                    >
                      {step.title}
                    </Text>
                    {idx < 4 && (
                      <View
                        style={[
                          styles.stepLine,
                          isPassed && styles.stepLinePassed,
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* THÔNG TIN CHUYÊN VIÊN TRANG ĐIỂM (MUA) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chuyên Viên Trang Điểm</Text>
          <View style={styles.muaCardBody}>
            <Image
              source={{
                uri:
                  bookingDetail.muaAvatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400',
              }}
              style={styles.muaAvatar}
              contentFit="cover"
            />
            <View style={styles.muaInfoCol}>
              <View style={styles.muaNameRow}>
                <Text style={styles.muaName} numberOfLines={1}>
                  {bookingDetail.muaName || 'Chuyên viên đối tác'}
                </Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO MUA</Text>
                </View>
              </View>
              <View style={styles.muaRatingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.muaRatingScore}>
                  {bookingDetail.rating ? bookingDetail.rating.toFixed(1) : '5.0'}
                </Text>
                <Text style={styles.muaRatingCount}>(Đánh giá cao)</Text>
              </View>
              <Text style={styles.muaPhoneText}>
                SĐT: {bookingDetail.muaPhone || bookingDetail.muaPhoneNumber || 'Đang cập nhật'}
              </Text>
            </View>
          </View>

          {/* NÚT TƯƠNG TÁC VỚI THỢ */}
          <View style={styles.muaActionsRow}>
            <TouchableOpacity
              style={styles.callMuaBtn}
              onPress={handleCallMUA}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={15} color="#FFFFFF" />
              <Text style={styles.callMuaBtnText}>Gọi Cho Thợ</Text>
            </TouchableOpacity>

            {bookingDetail.muaId ? (
              <TouchableOpacity
                style={styles.profileMuaBtn}
                onPress={() => router.push(`/mua-detail/${bookingDetail.muaId}` as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="person-outline" size={15} color="#1E293B" />
                <Text style={styles.profileMuaBtnText}>Xem Hồ Sơ</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* THÔNG TIN GÓI DỊCH VỤ & CÁC BƯỚC */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gói Dịch Vụ Trang Điểm</Text>
          <View style={styles.packageHeaderBox}>
            <View style={styles.packageIconBadge}>
              <Ionicons name="sparkles" size={18} color={BrandColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.packageNameText}>
                {bookingDetail.packageName || 'Trang Điểm Cao Cấp'}
              </Text>
              {bookingDetail.styleName && (
                <Text style={styles.packageStyleText}>
                  Phong cách: {bookingDetail.styleName}
                </Text>
              )}
              <Text style={styles.packageDurationText}>
                Thời lượng dự kiến: {bookingDetail.estimatedDurationMinutes || 60} phút
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.stepsTitle}>Quy Trình & Chi Tiết Dịch Vụ:</Text>
          <View style={styles.stepsList}>
            {stepsToRender.map((step, idx) => (
              <View key={`step-item-${idx}`} style={styles.stepRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.stepItemText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* THỜI GIAN & ĐỊA ĐIỂM HẸN */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thời Gian & Điểm Đến</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="calendar-outline" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Thời gian phục vụ</Text>
              <Text style={styles.infoValue}>
                {bookingDetail.bookingDate && bookingDetail.startTime
                  ? `${bookingDetail.startTime} - Ngày ${bookingDetail.bookingDate}`
                  : formatDateTimeVN(bookingDetail.updatedAt)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="location-outline" size={18} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Địa chỉ làm đẹp tại nhà</Text>
              <Text style={styles.infoValue}>
                {bookingDetail.destinationAddress || 'Địa chỉ do khách hàng chọn'}
              </Text>
            </View>
          </View>
        </View>

        {/* ẢNH NGHIỆM THU (NẾU ĐÃ HOÀN THÀNH) */}
        {bookingDetail.completionPhotoUrl && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ảnh Nghiệm Thu Sau Trang Điểm</Text>
            <TouchableOpacity
              onPress={() => setIsPhotoModalVisible(true)}
              activeOpacity={0.85}
              style={styles.completionPhotoBox}
            >
              <Image
                source={{ uri: bookingDetail.completionPhotoUrl }}
                style={styles.completionPhoto}
                contentFit="cover"
              />
              <View style={styles.photoOverlayBadge}>
                <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
                <Text style={styles.photoOverlayText}>Chạm để phóng to</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* CHI TIẾT TÀI CHÍNH & THANH TOÁN */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chi Tiết Thanh Toán</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Giá gói trang điểm</Text>
            <Text style={styles.priceValue}>{formatPrice(bookingDetail.serviceSubtotal)}</Text>
          </View>

          {bookingDetail.distanceFee ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Phí di chuyển tận nơi</Text>
              <Text style={styles.priceValue}>+{formatPrice(bookingDetail.distanceFee)}</Text>
            </View>
          ) : null}

          {bookingDetail.surchargeFee ? (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Phụ phí đặt gấp / Ngoài giờ</Text>
              <Text style={styles.priceValue}>+{formatPrice(bookingDetail.surchargeFee)}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.totalPriceLabel}>Tổng Chi Phí</Text>
            <Text style={styles.totalPriceValue}>{formatPrice(bookingDetail.totalAmount)}</Text>
          </View>

          <View style={styles.escrowBox}>
            <View style={styles.escrowHeader}>
              <Ionicons name="shield-checkmark" size={16} color="#059669" />
              <Text style={styles.escrowTitle}>Bảo Hiểm Ký Quỹ Escrow</Text>
            </View>
            <View style={styles.escrowBody}>
              <View style={styles.priceRow}>
                <Text style={styles.escrowSubLabel}>Tiền cọc (30%):</Text>
                <Text style={styles.escrowSubValue}>
                  {formatPrice(bookingDetail.depositAmount || 0)}
                  {bookingDetail.isDepositPaid ? ' (Đã cọc ✓)' : ' (Chưa cọc)'}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.escrowSubLabel}>Còn lại thanh toán sau make-up:</Text>
                <Text style={styles.escrowSubRemain}>{formatPrice(remainingAmount)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* NẾU ĐƠN ĐÃ BỊ HỦY */}
        {isCancelled && (
          <>
            <View style={[styles.card, styles.cancelReasonCard]}>
              <View style={styles.cancelReasonHeader}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.cancelReasonTitle}>Lý Do Hủy Đơn</Text>
              </View>
              <Text style={styles.cancelReasonText}>
                {bookingDetail.cancellationReason || 'Đơn đã hủy theo yêu cầu của khách hàng hoặc hết hạn xác nhận.'}
              </Text>
            </View>

            {/* THÔNG BÁO HOÀN 100% CỌC VÀO VÍ CÁ NHÂN NẾU CÓ CỌC */}
            {(bookingDetail.isDepositPaid || (bookingDetail.depositAmount && bookingDetail.depositAmount > 0)) && (
              <View style={styles.refundCard}>
                <View style={styles.refundHeader}>
                  <View style={styles.refundIconBox}>
                    <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.refundTitle}>Đã Hoàn 100% Cọc Vào Ví</Text>
                    <Text style={styles.refundDesc}>
                      Khoản tiền cọc {formatPrice(bookingDetail.depositAmount)} đã được tự động hoàn trả về Ví cá nhân của bạn do thợ hủy ca hẹn.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.checkWalletBtn}
                  onPress={() => router.push('/profile/customer-wallet')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.checkWalletBtnText}>Kiểm Tra Ví Cá Nhân</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FOOTER ACTIONS BAR */}
      <View style={styles.footerBar}>
        {/* NÚT XEM VÍ NẾU ĐƠN ĐÃ BỊ HỦY VÀ CÓ CỌC ĐƯỢC HOÀN */}
        {isCancelled && (bookingDetail.isDepositPaid || (bookingDetail.depositAmount && bookingDetail.depositAmount > 0)) && (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: BrandColors.primary }]}
            onPress={() => router.push('/profile/customer-wallet')}
            activeOpacity={0.85}
          >
            <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>Xem Ví Cá Nhân & Tiền Hoàn Cọc</Text>
          </TouchableOpacity>
        )}
        {/* NÚT THEO DÕI LIVE GPS (NẾU THỢ ĐANG TRÊN ĐƯỜNG TỚI HOẶC ĐÃ ĐẾN) */}
        {(bookingDetail.status === 'ON_THE_WAY' || bookingDetail.status === 'ARRIVED') && (
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => router.replace(`/booking/tracking/${bookingId}` as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="map" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>Theo Dõi Vị Trí Thợ (Live GPS)</Text>
          </TouchableOpacity>
        )}

        {/* NÚT THANH TOÁN CỌC (NẾU ĐƠN ĐÃ ĐƯỢC NHẬN NHƯNG CHƯA CỌC) */}
        {bookingDetail.status === 'ACCEPTED' && !bookingDetail.isDepositPaid && (
          <TouchableOpacity
            style={styles.depositActionBtn}
            onPress={() => router.replace(`/booking/deposit/${bookingId}` as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="card" size={18} color="#FFFFFF" />
            <Text style={styles.depositActionBtnText}>Thanh Toán Tiền Cọc 30%</Text>
          </TouchableOpacity>
        )}

        {/* NÚT THANH TOÁN PHẦN CÒN LẠI HOẶC ĐÁNH GIÁ KHI HOÀN THÀNH */}
        {(bookingDetail.status === 'COMPLETED' || bookingDetail.status === 'PAID_OUT') && (
          <View style={{ width: '100%', gap: 12 }}>
            {bookingDetail.status === 'PAID_OUT' ? (
              <View style={styles.settledBadgeBar}>
                <Ionicons name="checkmark-done-circle" size={24} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.settledBadgeTitle}>Đơn Hàng Đã Quyết Toán & Hoàn Tất</Text>
                  <Text style={styles.settledBadgeSubtitle}>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</Text>
                </View>
              </View>
            ) : isCashPaidConfirmed ? (
              <View style={styles.waitingCashConfirmBar}>
                <Ionicons name="time-outline" size={24} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.waitingCashConfirmTitle}>Đang Chờ Chuyên Viên Xác Nhận Tiền Mặt</Text>
                  <Text style={styles.waitingCashConfirmSubtitle}>
                    Bạn đã xác nhận trả {formatPrice(remainingAmount)} tiền mặt. Chuyên viên sẽ xác nhận sau khi nhận đủ tiền.
                  </Text>
                </View>
              </View>
            ) : remainingAmount > 0 ? (
              <View style={styles.finalPaymentCard}>
                <View style={styles.finalPaymentHeader}>
                  <Ionicons name="wallet-outline" size={20} color={BrandColors.primary} />
                  <Text style={styles.finalPaymentTitle}>
                    Thanh Toán Phần Còn Lại (70%):{' '}
                    <Text style={styles.finalPaymentHighlight}>{formatPrice(remainingAmount)}</Text>
                  </Text>
                </View>
                <Text style={styles.finalPaymentDesc}>
                  Vui lòng chọn 1 trong các hình thức thanh toán sau để hoàn tất hợp đồng:
                </Text>

                <View style={styles.paymentButtonGroup}>
                  {/* 1. Tiền Mặt */}
                  <TouchableOpacity
                    style={[styles.paymentMethodBtn, { borderColor: '#10B981', backgroundColor: '#ECFDF5' }]}
                    onPress={handleConfirmCustomerCash}
                    disabled={isConfirmingCash || isPayingOnline}
                    activeOpacity={0.8}
                  >
                    {isConfirmingCash ? (
                      <ActivityIndicator size="small" color="#059669" />
                    ) : (
                      <>
                        <Ionicons name="cash-outline" size={22} color="#059669" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.paymentMethodBtnTitle, { color: '#059669' }]}>Tiền Mặt Trực Tiếp</Text>
                          <Text style={styles.paymentMethodBtnSubtitle}>Thanh toán trực tiếp cho chuyên viên</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#059669" />
                      </>
                    )}
                  </TouchableOpacity>

                  {/* 2. MoMo */}
                  <TouchableOpacity
                    style={[styles.paymentMethodBtn, { borderColor: '#D82D8B', backgroundColor: '#FDF2F8' }]}
                    onPress={() => handlePayRemainingOnline('MOMO')}
                    disabled={isConfirmingCash || isPayingOnline}
                    activeOpacity={0.8}
                  >
                    {isPayingOnline && onlineGatewayPaying === 'MOMO' ? (
                      <ActivityIndicator size="small" color="#D82D8B" />
                    ) : (
                      <>
                        <Ionicons name="phone-portrait-outline" size={22} color="#D82D8B" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.paymentMethodBtnTitle, { color: '#D82D8B' }]}>Ví Điện Tử MoMo</Text>
                          <Text style={styles.paymentMethodBtnSubtitle}>Thanh toán online tức thì qua App MoMo</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#D82D8B" />
                      </>
                    )}
                  </TouchableOpacity>

                  {/* 3. VNPay */}
                  <TouchableOpacity
                    style={[styles.paymentMethodBtn, { borderColor: '#005BAA', backgroundColor: '#F0F9FF' }]}
                    onPress={() => handlePayRemainingOnline('VNPAY')}
                    disabled={isConfirmingCash || isPayingOnline}
                    activeOpacity={0.8}
                  >
                    {isPayingOnline && onlineGatewayPaying === 'VNPAY' ? (
                      <ActivityIndicator size="small" color="#005BAA" />
                    ) : (
                      <>
                        <Ionicons name="qr-code-outline" size={22} color="#005BAA" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.paymentMethodBtnTitle, { color: '#005BAA' }]}>Cổng VNPay (QR / Thẻ)</Text>
                          <Text style={styles.paymentMethodBtnSubtitle}>Quét mã VNPAY-QR hoặc thẻ ATM / Visa</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#005BAA" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.reviewActionBtn}
              onPress={() => {
                Alert.alert('Đánh Giá Chuyên Viên ⭐', `Cảm ơn bạn đã sử dụng dịch vụ! Đơn ${bookingDetail.bookingCode} đã hoàn tất.`);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="star" size={18} color="#FFFFFF" />
              <Text style={styles.reviewActionBtnText}>Đánh Giá Chuyên Viên ⭐</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* NÚT HỦY ĐƠN (NẾU CÒN Ở GIAI ĐOẠN ĐẶT HOẶC CHỜ CỌC) */}
        {(bookingDetail.status === 'REQUESTED' ||
          bookingDetail.status === 'PENDING_DEPOSIT' ||
          (bookingDetail.status === 'ACCEPTED' && !bookingDetail.isDepositPaid)) && (
            <TouchableOpacity
              style={styles.secondaryCancelBtn}
              onPress={() => setIsCancelModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryCancelBtnText}>Hủy Lịch Hẹn</Text>
            </TouchableOpacity>
          )}
      </View>

      {/* MODAL HỦY ĐƠN */}
      <Modal
        visible={isCancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCancelModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsCancelModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning-outline" size={24} color="#DC2626" />
              <Text style={styles.modalTitle}>Xác Nhận Hủy Lịch</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Bạn có chắc chắn muốn hủy lịch hẹn làm đẹp này? Vui lòng chọn lý do để chúng tôi cải thiện dịch vụ:
            </Text>

            <View style={styles.reasonsList}>
              {CANCEL_REASONS.map((reason, idx) => (
                <TouchableOpacity
                  key={`cancel-r-${idx}`}
                  style={[
                    styles.reasonItem,
                    cancelReason === reason && styles.reasonItemSelected,
                  ]}
                  onPress={() => setCancelReason(reason)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={cancelReason === reason ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={cancelReason === reason ? BrandColors.primary : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.reasonText,
                      cancelReason === reason && styles.reasonTextSelected,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.customReasonInput}
              placeholder="Nhập lý do chi tiết hơn nếu có..."
              placeholderTextColor="#94A3B8"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsCancelModalVisible(false)}
                activeOpacity={0.7}
                disabled={isCancelling}
              >
                <Text style={styles.modalCancelText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmCancel}
                activeOpacity={0.8}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Xác Nhận Hủy</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL PHÓNG TO ẢNH NGHIỆM THU */}
      <Modal
        visible={isPhotoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPhotoModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.photoModalOverlay}
          activeOpacity={1}
          onPress={() => setIsPhotoModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.photoModalCloseBtn}
            onPress={() => setIsPhotoModalVisible(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {bookingDetail.completionPhotoUrl && (
            <Image
              source={{ uri: bookingDetail.completionPhotoUrl }}
              style={styles.photoModalImage}
              contentFit="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  refreshIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  statusBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  statusBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBannerDesc: {
    fontSize: 13,
    color: '#475569',
    marginTop: 3,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    position: 'relative',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepCirclePassed: {
    backgroundColor: '#FFE4E6',
  },
  stepCircleCurrent: {
    backgroundColor: BrandColors.primary,
  },
  stepLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#0F172A',
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 16,
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  stepLinePassed: {
    backgroundColor: BrandColors.primary,
  },
  muaCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  muaAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
  },
  muaInfoCol: {
    flex: 1,
    gap: 3,
  },
  muaNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muaName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  proBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  muaRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  muaRatingScore: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  muaRatingCount: {
    fontSize: 12,
    color: '#64748B',
  },
  muaPhoneText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  muaActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  callMuaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 10,
  },
  callMuaBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileMuaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
  },
  profileMuaBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  packageHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  packageIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  packageStyleText: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 2,
  },
  packageDurationText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  stepsList: {
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepItemText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
  },
  completionPhotoBox: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    height: 200,
    backgroundColor: '#0F172A',
  },
  completionPhoto: {
    width: '100%',
    height: '100%',
  },
  photoOverlayBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  photoOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  totalPriceLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalPriceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  escrowBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  escrowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  escrowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  escrowBody: {
    gap: 4,
  },
  escrowSubLabel: {
    fontSize: 12,
    color: '#334155',
  },
  escrowSubValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  escrowSubRemain: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  cancelReasonCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  cancelReasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cancelReasonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  cancelReasonText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  footerBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  primaryActionBtn: {
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  depositActionBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  depositActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  reviewActionBtn: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  reviewActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  goBackBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: BrandColors.primary,
    marginTop: 8,
  },
  goBackBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    gap: 8,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  reasonsList: {
    gap: 8,
    marginBottom: 12,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonItemSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: BrandColors.primary,
  },
  reasonText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  reasonTextSelected: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    height: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoModalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  photoModalImage: {
    width: '90%',
    height: '75%',
  },
  refundCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  refundHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  refundIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 4,
  },
  refundDesc: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  checkWalletBtn: {
    backgroundColor: '#15803D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  checkWalletBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  settledBadgeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  settledBadgeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
  },
  settledBadgeSubtitle: {
    fontSize: 13,
    color: '#047857',
    marginTop: 2,
  },
  waitingCashConfirmBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  waitingCashConfirmTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B45309',
  },
  waitingCashConfirmSubtitle: {
    fontSize: 13,
    color: '#92400E',
    marginTop: 2,
    lineHeight: 18,
  },
  finalPaymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  finalPaymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  finalPaymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  finalPaymentHighlight: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  finalPaymentDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  paymentButtonGroup: {
    gap: 10,
  },
  paymentMethodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  paymentMethodBtnTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  paymentMethodBtnSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pendingDepositCtaCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  pendingDepositCtaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  pendingDepositCtaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDepositCtaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  pendingDepositCtaSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 17,
  },
  pendingDepositCtaAmountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingDepositCtaAmountLabel: {
    fontSize: 13,
    color: '#78350F',
    fontWeight: '600',
  },
  pendingDepositCtaAmountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  pendingDepositCtaBtn: {
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  pendingDepositCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pendingRequestedCtaCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  pendingRequestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  pendingRequestedIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingRequestedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  pendingRequestedSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 17,
  },
  pendingRequestedTimerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingRequestedTimerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingRequestedTimerLabel: {
    fontSize: 13,
    color: '#78350F',
    fontWeight: '600',
  },
  pendingRequestedTimerValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#D97706',
    fontVariant: ['tabular-nums'],
  },
  pendingRequestedNote: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  cancelRequestedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelRequestedBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
});
