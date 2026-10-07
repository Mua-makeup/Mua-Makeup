import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  AppState,
  AppStateStatus,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { BrandColors, Fonts } from '@/constants/theme';
import { depositService, BookingDepositStatus, DepositCheckoutResult } from '@/services/deposit.service';
import { bookingService, BookingStatusDetailRes } from '@/services/booking.service';
import { websocketService } from '@/services/websocket.service';

function formatVnd(val?: number): string {
  if (!val && val !== 0) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(val)
    .replace('₫', 'đ');
}

export default function BookingDepositScreen() {
  const { id, status, payment_success } = useLocalSearchParams<{
    id: string;
    status?: string;
    payment_success?: string;
  }>();
  const bookingId = Number(id);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [depositData, setDepositData] = useState<BookingDepositStatus | null>(null);
  const [bookingDetail, setBookingDetail] = useState<BookingStatusDetailRes | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<'MOMO' | 'VNPAY'>('MOMO');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600); // 10 phút đồng bộ thời gian thực với thợ
  const [paymentPolling, setPaymentPolling] = useState(false);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);

  const pollIntervalRef = useRef<any>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasNavigatedRef = useRef<boolean>(false);
  const isPaymentBrowserOpenRef = useRef<boolean>(false);

  const navigateToBookingDetail = (delay: number = 800) => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    try {
      WebBrowser.dismissBrowser();
    } catch {}
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setPaymentPolling(false);
    setIsPaidSuccess(true);
    setTimeout(() => {
      router.replace(`/booking/detail/${bookingId}` as any);
    }, delay);
  };

  const [slotTakenAlertShown, setSlotTakenAlertShown] = useState<boolean>(false);

  const handleSlotTakenNotice = (reason?: string, isRefunded?: boolean, refundAmount?: number) => {
    if (isPaymentBrowserOpenRef.current) {
      return;
    }
    try {
      WebBrowser.dismissBrowser();
    } catch {}
    setIsProcessing(false);
    if (slotTakenAlertShown) return;
    setSlotTakenAlertShown(true);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setPaymentPolling(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const formatVnd = (num?: number) =>
      num ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num) : '';

    if (isRefunded) {
      const refundText = refundAmount ? ` (${formatVnd(refundAmount)})` : '';
      const messageText =
        reason ||
        `Giao dịch thanh toán cọc thành công. Tuy nhiên khung giờ này vừa có khách hàng khác hoàn tất thanh toán trước bạn. Toàn bộ tiền cọc${refundText} đã được tự động hoàn trả 100% vào Ví cá nhân của bạn.`;

      Alert.alert(
        'Lịch Hẹn Đã Trùng • Đã Hoàn Cọc 100%',
        messageText,
        [
          {
            text: 'Kiểm Tra Ví Tiền',
            style: 'default',
            onPress: () => {
              router.replace('/profile/customer-wallet' as any);
            },
          },
          {
            text: 'Xem Chi Tiết Đơn',
            style: 'default',
            onPress: () => {
              router.replace(`/booking/history-detail/${bookingId}` as any);
            },
          },
          {
            text: 'Chọn Lịch Khác',
            style: 'default',
            onPress: () => {
              if (bookingDetail?.packageId && (bookingDetail?.muaId || (bookingDetail as any)?.agencyId)) {
                const isAgency = Boolean((bookingDetail as any)?.agencyId && !bookingDetail?.muaId);
                router.replace({
                  pathname: '/booking/create',
                  params: {
                    packageId: String(bookingDetail.packageId),
                    ...(isAgency
                      ? { agencyId: String((bookingDetail as any).agencyId) }
                      : { muaId: String(bookingDetail.muaId) }),
                  },
                });
              } else {
                router.replace('/explore' as any);
              }
            },
          },
        ],
        { cancelable: true, autoCloseSeconds: 0 } as any
      );
      return;
    }

    const messageText =
      (reason && reason !== 'booking.slot_already_booked')
        ? reason
        : 'Rất tiếc, khung giờ hẹn này vừa có khách hàng khác đặt và hoàn tất thanh toán trước bạn. Đơn hẹn của bạn đã được hủy tự động.';

    Alert.alert(
      'Lịch Hẹn Đã Được Đặt Trước',
      messageText,
      [
        {
          text: 'Chọn lịch khác',
          style: 'default',
          onPress: () => {
            if (bookingDetail?.packageId && (bookingDetail?.muaId || (bookingDetail as any)?.agencyId)) {
              const isAgency = Boolean((bookingDetail as any)?.agencyId && !bookingDetail?.muaId);
              router.replace({
                pathname: '/booking/create',
                params: {
                  packageId: String(bookingDetail.packageId),
                  ...(isAgency
                    ? { agencyId: String((bookingDetail as any).agencyId) }
                    : { muaId: String(bookingDetail.muaId) }),
                },
              });
            } else {
              router.replace('/explore' as any);
            }
          },
        },
        {
          text: 'Về trang chủ',
          style: 'cancel',
          onPress: () => {
            router.replace('/' as any);
          },
        },
      ],
      { cancelable: true, autoCloseSeconds: 0 } as any
    );
  };

  // 1. Tải thông tin cọc và booking
  const loadData = async () => {
    if (!bookingId) return;
    try {
      setIsLoading(true);
      const [deposit, detail] = await Promise.all([
        depositService.getDepositStatus(bookingId).catch(() => null),
        bookingService.getBookingStatus(bookingId).catch(() => null),
      ]);

      if (deposit) {
        setDepositData(deposit);
        if (deposit.depositStatus === 'PAID') {
          setIsPaidSuccess(true);
        } else if (
          deposit.depositStatus === 'SLOT_TAKEN' ||
          deposit.isSlotTaken === true ||
          deposit.depositStatus === 'REFUNDED' ||
          deposit.bookingStatus === 'CANCELLED'
        ) {
          handleSlotTakenNotice(
            deposit.cancellationReason || deposit.message,
            deposit.isRefunded || deposit.depositStatus === 'REFUNDED',
            deposit.refundAmount
          );
          return;
        }
      }
      if (detail) {
        setBookingDetail(detail);
        if (detail.status === 'CANCELLED' && (detail.cancellationReason?.includes('khách hàng khác') || detail.cancellationReason?.includes('trùng'))) {
          handleSlotTakenNotice(
            detail.cancellationReason,
            detail.isDepositPaid || detail.cancellationReason?.includes('hoàn'),
            detail.depositAmount
          );
          return;
        }
        // Đồng bộ thời gian đếm ngược trực tiếp từ backend depositTimeoutSeconds (10 phút)
        if (detail.depositTimeoutSeconds !== undefined && detail.depositTimeoutSeconds !== null) {
          setSecondsRemaining(Math.max(0, detail.depositTimeoutSeconds));
        } else if (deposit?.expiresAt) {
          const diffMs = new Date(deposit.expiresAt).getTime() - Date.now();
          setSecondsRemaining(Math.max(0, Math.floor(diffMs / 1000)));
        }
      } else if (deposit?.expiresAt) {
        const diffMs = new Date(deposit.expiresAt).getTime() - Date.now();
        setSecondsRemaining(Math.max(0, Math.floor(diffMs / 1000)));
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể tải thông tin đặt cọc.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // 2. Kết nối STOMP WebSocket để nhận tín hiệu thanh toán realtime
    const unsubWs = websocketService.subscribe(`/topic/booking-status/${bookingId}`, (msg: any) => {
      if (
        msg?.type === 'BOOKING_SLOT_TAKEN' ||
        msg?.type === 'BOOKING_SLOT_TAKEN_REFUNDED' ||
        msg?.isSlotTaken === true ||
        msg?.depositStatus === 'SLOT_TAKEN' ||
        msg?.depositStatus === 'REFUNDED'
      ) {
        // NẾU KHÁCH HÀNG ĐANG MỞ TRÌNH DUYỆT THANH TOÁN (VNPAY / MOMO):
        // Tuyệt đối không gián đoạn hoặc đóng trình duyệt của khách!
        if (isPaymentBrowserOpenRef.current) {
          return;
        }
        handleSlotTakenNotice(
          msg?.message || msg?.cancellationReason,
          msg?.isRefunded || msg?.depositStatus === 'REFUNDED',
          msg?.refundAmount
        );
        return;
      }
      if (
        msg?.isDepositPaid === true ||
        msg?.type === 'CUSTOMER_CONFIRMED_DEPOSIT' ||
        msg?.type === 'PAYMENT_COMPLETED'
      ) {
        try {
          WebBrowser.dismissBrowser();
        } catch {}
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigateToBookingDetail(600);
        setIsPaidSuccess(true);
        setPaymentPolling(false);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    });

    // 3. Lắng nghe AppState khi người dùng quay lại từ app MoMo / WebBrowser
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        isPaymentBrowserOpenRef.current = false;
        try {
          WebBrowser.dismissBrowser();
        } catch {}
        setIsProcessing(false);
        // App vừa quay lại foreground -> tự động kích hoạt kiểm tra đồng bộ cọc ngay
        handleManualSync();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (unsubWs) unsubWs();
      subscription.remove();
    };
  }, [bookingId]);

  // Bộ đếm thời gian giữ chỗ
  useEffect(() => {
    if (isPaidSuccess || secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining, isPaidSuccess]);

  // Kiểm tra 1 lần trạng thái cọc
  const checkDepositStatusOnce = async () => {
    try {
      const status = await depositService.getDepositStatus(bookingId);
      if (status?.depositStatus === 'PAID') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsPaidSuccess(true);
        setPaymentPolling(false);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        navigateToBookingDetail(600);
      } else if (
        status?.depositStatus === 'SLOT_TAKEN' ||
        status?.isSlotTaken === true ||
        status?.depositStatus === 'REFUNDED' ||
        status?.bookingStatus === 'CANCELLED'
      ) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setPaymentPolling(false);
        handleSlotTakenNotice(
          status?.cancellationReason || status?.message,
          status?.isRefunded || status?.depositStatus === 'REFUNDED',
          status?.refundAmount
        );
      }
    } catch {
      // Bỏ qua lỗi polling nền
    }
  };

  // Đồng bộ / kiểm tra giao dịch thanh toán cọc thủ công từ gateway
  const handleManualSync = async () => {
    try {
      setIsProcessing(true);
      const res = await depositService.syncDepositPayment(bookingId);
      if (res?.depositStatus === 'PAID') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsPaidSuccess(true);
        setPaymentPolling(false);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        navigateToBookingDetail(600);
      } else if (
        res?.depositStatus === 'SLOT_TAKEN' ||
        res?.isSlotTaken === true ||
        res?.depositStatus === 'REFUNDED' ||
        res?.bookingStatus === 'CANCELLED'
      ) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setPaymentPolling(false);
        handleSlotTakenNotice(
          res?.cancellationReason || res?.message,
          res?.isRefunded || res?.depositStatus === 'REFUNDED',
          res?.refundAmount
        );
      } else {
        await checkDepositStatusOnce();
      }
    } catch {
      await checkDepositStatusOnce();
    } finally {
      setIsProcessing(false);
    }
  };

  // Tự động kiểm tra nếu có query param redirect từ MoMo/VNPay (status=success)
  useEffect(() => {
    if (status === 'success' || payment_success === 'true' || status === 'failed') {
      isPaymentBrowserOpenRef.current = false;
      try {
        WebBrowser.dismissBrowser();
      } catch {}
      setIsProcessing(false);
      handleManualSync();
    }
  }, [status, payment_success]);

  // Khởi động chu kỳ polling tự động xác nhận khi đang mở thanh toán
  const startPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setPaymentPolling(true);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await depositService.syncDepositPayment(bookingId);
        if (res?.depositStatus === 'PAID') {
          isPaymentBrowserOpenRef.current = false;
          try {
            WebBrowser.dismissBrowser();
          } catch {}
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setIsPaidSuccess(true);
          setPaymentPolling(false);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          navigateToBookingDetail(600);
        } else if (
          res?.depositStatus === 'SLOT_TAKEN' ||
          res?.isSlotTaken === true ||
          res?.depositStatus === 'REFUNDED' ||
          res?.bookingStatus === 'CANCELLED'
        ) {
          // NẾU KHÁCH ĐANG MỞ TRÌNH DUYỆT THANH TOÁN (VNPAY / MOMO):
          // Tuyệt đối không cắt ngang! Để khách hoàn tất hoặc hủy thanh toán bình thường.
          if (isPaymentBrowserOpenRef.current) {
            return;
          }
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setPaymentPolling(false);
          handleSlotTakenNotice(
            res?.cancellationReason || res?.message,
            res?.isRefunded || res?.depositStatus === 'REFUNDED',
            res?.refundAmount
          );
        }
      } catch {
        if (!isPaymentBrowserOpenRef.current) {
          await checkDepositStatusOnce();
        }
      }
    }, 2500);
  };

  // 4. Xử lý bấm Thanh toán cọc qua Cổng MoMo / VNPay thật 100%
  const handleProceedPayment = async () => {
    try {
      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const checkout = await depositService.createDepositIntent(bookingId, {
        gatewayCode: selectedGateway,
        pricingVersion: depositData?.pricingVersion,
      });

      const paymentLink = checkout?.checkoutUrl || checkout?.paymentUrl;
      if (!paymentLink) {
        throw new Error('Cổng thanh toán không trả về liên kết thanh toán.');
      }

      // Kích hoạt chu kỳ polling tự động xác nhận khi đang mở cổng thanh toán
      startPolling();

      if (Platform.OS === 'web') {
        window.open(paymentLink, '_blank');
      } else {
        isPaymentBrowserOpenRef.current = true;
        try {
          try {
            WebBrowser.dismissBrowser();
          } catch {}
          await WebBrowser.openBrowserAsync(paymentLink, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
            toolbarColor: '#0F172A',
          });
        } catch {
          Linking.openURL(paymentLink).catch(() => {});
        } finally {
          isPaymentBrowserOpenRef.current = false;
        }
        // Khi người dùng hoàn tất hoặc đóng trình duyệt thanh toán:
        await handleManualSync();
      }
    } catch (err: any) {
      const errCode = err?.response?.data?.errorCode;
      let errMsg = err?.response?.data?.message || err?.message;
      if (
        errCode === 'ERR_SLOT_ALREADY_BOOKED' ||
        errMsg === 'booking.slot_already_booked' ||
        errMsg?.includes('khách hàng khác') ||
        errMsg?.includes('đã có ca làm việc khác')
      ) {
        if (errMsg === 'booking.slot_already_booked' || !errMsg) {
          errMsg = 'Lịch hẹn này vừa có khách hàng khác đặt và hoàn tất thanh toán trước bạn. Vui lòng chọn khung giờ khác.';
        }
        handleSlotTakenNotice(errMsg);
      } else {
        Alert.alert(
          'Lỗi Thanh Toán',
          errMsg || 'Không thể tạo liên kết thanh toán.'
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelAndGoHome = async () => {
    try {
      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setPaymentPolling(false);
      try {
        await bookingService.cancelBooking(bookingId, 'Khách hàng hủy đơn ở bước thanh toán cọc');
      } catch (cancelErr) {
        console.warn('Lỗi khi gọi API hủy đơn:', cancelErr);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert('Lỗi', err.message || 'Không thể hủy đơn hàng.');
    }
  };

  const confirmCancelAndGoHome = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Hủy Đơn & Về Trang Chủ?',
      'Bạn chưa hoàn tất thanh toán cọc. Bạn có chắc muốn hủy đơn đặt lịch này và quay về trang chủ không?',
      [
        {
          text: 'Hủy đơn & Về trang chủ',
          style: 'destructive',
          onPress: handleCancelAndGoHome,
        },
        { text: 'Ở lại thanh toán', style: 'cancel' },
      ]
    );
  };

  const isInstantBooking =
    bookingDetail?.bookingType === 'REALTIME_INSTANT' ||
    bookingDetail?.bookingType === 'INSTANT' ||
    bookingDetail?.bookingCode?.includes('FAST') ||
    depositData?.bookingCode?.includes('FAST');

  const handleBack = () => {
    if (isInstantBooking) {
      // Đơn khẩn cấp: Khách muốn quay lại xem thông tin thợ & đổi gói dịch vụ
      // Dùng replace để thay thế stack hiện tại, KHÔNG hủy đơn và KHÔNG hiện popup đổi lịch
      router.replace(`/booking/instant-matched/${bookingId}` as any);
      return;
    }

    if (depositData?.depositStatus !== 'PAID' && !isPaidSuccess) {
      Alert.alert(
        'Rời Trang Đặt Cọc?',
        'Bạn chưa hoàn tất thanh toán cọc. Bạn muốn hủy đơn để về trang chủ, đổi lịch hẹn khác hay ở lại thanh toán?',
        [
          {
            text: 'Hủy đơn & Về trang chủ',
            style: 'destructive',
            onPress: handleCancelAndGoHome,
          },
          {
            text: 'Đổi lịch hẹn',
            style: 'default',
            onPress: async () => {
              try {
                await bookingService.cancelBooking(bookingId, 'Khách hàng đổi ý, chọn lại lịch khác');
              } catch {}
              if (bookingDetail?.packageId && (bookingDetail?.muaId || (bookingDetail as any)?.agencyId)) {
                const isAgency = Boolean((bookingDetail as any)?.agencyId && !bookingDetail?.muaId);
                router.replace({
                  pathname: '/booking/create',
                  params: {
                    packageId: String(bookingDetail.packageId),
                    providerId: String(isAgency ? (bookingDetail as any).agencyId : bookingDetail.muaId),
                    providerType: isAgency ? 'AGENCY' : 'FREELANCER',
                  },
                } as any);
              } else if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            },
          },
          { text: 'Ở lại thanh toán', style: 'cancel' },
        ]
      );
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    }
  };

  // Bắt sự kiện phím Back cứng trên Android
  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isInstantBooking, depositData?.depositStatus, isPaidSuccess, bookingDetail?.packageId, bookingDetail?.muaId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang chuẩn bị thông tin thanh toán cọc...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalAmount = depositData?.totalAmount || bookingDetail?.totalAmount || 0;
  const depositAmount = depositData?.requiredDepositAmount || bookingDetail?.depositAmount || Math.round(totalAmount * 0.3);
  const remainingCash = Math.max(0, totalAmount - depositAmount);

  const isDepositCompleted = isPaidSuccess || depositData?.depositStatus === 'PAID' || Boolean(bookingDetail?.isDepositPaid);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // NẾU ĐƠN ĐÃ CỌC THÀNH CÔNG: Hiển thị giao diện trạng thái ĐÃ CỌC - CHỜ TÀI XẾ XÁC NHẬN
  if (isDepositCompleted) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
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
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trạng Thái Đặt Cọc</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Banner Thông Báo Đã Cọc & Chờ Tài Xế Xác Nhận */}
          <View style={styles.successStatusBanner}>
            <View style={styles.successShieldCircle}>
              <Ionicons name="shield-checkmark" size={36} color="#059669" />
            </View>
            <Text style={styles.successStatusTitle}>Đã Đặt Cọc Giữ Chỗ Thành Công!</Text>
            <View style={styles.waitingDriverTag}>
              <ActivityIndicator size="small" color="#D97706" style={{ marginRight: 6 }} />
              <Text style={styles.waitingDriverTagText}>Chờ Chuyên Viên Tiếp Nhận Ca Hẹn</Text>
            </View>
            <Text style={styles.successStatusSub}>
              Khoản cọc 30% đã được ghi nhận và khóa bảo chứng an toàn trong Quỹ Escrow. Chuyên viên make-up đã nhận được thông báo để chuẩn bị và xác nhận tiếp nhận đơn của bạn.
            </Text>
          </View>

          {/* Thẻ Quỹ Bảo Chứng Escrow */}
          <View style={styles.escrowCardHighlight}>
            <View style={styles.escrowCardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="lock-closed" size={20} color="#059669" />
                <Text style={styles.escrowCardHeaderTitle}>Quỹ Bảo Chứng Escrow</Text>
              </View>
              <View style={styles.escrowVerifiedBadge}>
                <Ionicons name="checkmark-done" size={14} color="#059669" />
                <Text style={styles.escrowVerifiedBadgeText}>ĐÃ BẢO CHỨNG</Text>
              </View>
            </View>

            <View style={styles.dividerThin} />

            <View style={styles.escrowPriceBreakdown}>
              <View style={styles.escrowPriceRow}>
                <Text style={styles.escrowPriceLabel}>Tiền cọc giữ chỗ (30%):</Text>
                <Text style={styles.escrowPriceDeposit}>{formatVnd(depositAmount)}</Text>
              </View>
              <View style={styles.escrowPriceRow}>
                <Text style={styles.escrowPriceLabel}>Tiền mặt trả sau hoàn thành (70%):</Text>
                <Text style={styles.escrowPriceCash}>{formatVnd(remainingCash)}</Text>
              </View>
              <View style={[styles.escrowPriceRow, { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' }]}>
                <Text style={[styles.escrowPriceLabel, { fontWeight: '700', color: '#0F172A' }]}>Tổng gói dịch vụ:</Text>
                <Text style={[styles.escrowPriceCash, { fontWeight: '800', color: '#0F172A', fontSize: 16 }]}>{formatVnd(totalAmount)}</Text>
              </View>
            </View>

            <View style={styles.escrowPolicyBox}>
              <Ionicons name="shield-outline" size={16} color="#047857" />
              <Text style={styles.escrowPolicyText}>
                Tiền cọc của bạn được giữ an toàn bởi sàn Makeup và chỉ được giải ngân cho chuyên viên sau khi bạn xác nhận ca làm đẹp hoàn tất mỹ mãn.
              </Text>
            </View>
          </View>

          {/* Thẻ Tóm Tắt Đơn Đặt */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Thông Tin Đơn Đặt</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Mã lịch hẹn:</Text>
              <Text style={styles.summaryValue}>#{depositData?.bookingCode || bookingDetail?.bookingCode || `BK-${bookingId}`}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gói dịch vụ:</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{bookingDetail?.packageName || 'Dịch vụ make-up chuyên nghiệp'}</Text>
            </View>
            {bookingDetail?.destinationAddress ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Địa chỉ hẹn:</Text>
                <Text style={[styles.summaryValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                  {bookingDetail.destinationAddress}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* Cụm Nút Hành Động Cho Đơn Đã Cọc */}
        <View style={styles.paidBottomBar}>
          <TouchableOpacity
            style={styles.paidPrimaryBtn}
            onPress={() => router.replace(`/booking/detail/${bookingId}` as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
            <Text style={styles.paidPrimaryBtnText}>Xem Chi Tiết Đơn Hàng</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.paidSecondaryBtn}
            onPress={() => router.replace(`/booking/tracking/${bookingId}` as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate-outline" size={18} color="#2563EB" />
            <Text style={styles.paidSecondaryBtnText}>Theo Dõi Vị Trí Thợ (GPS Live)</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh Toán Đặt Cọc</Text>
        <TouchableOpacity
          onPress={confirmCancelAndGoHome}
          style={styles.headerHomeBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="home-outline" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner đồng hồ đếm ngược giữ chỗ */}
        <View
          style={[
            styles.countdownBanner,
            secondsRemaining < 180 && styles.countdownBannerWarning,
          ]}
        >
          <Ionicons
            name="stopwatch"
            size={20}
            color={secondsRemaining < 180 ? '#DC2626' : '#B45309'}
          />
          <View style={styles.countdownTextContainer}>
            <Text style={styles.countdownLabel}>Thời gian giữ chỗ còn lại:</Text>
            <Text
              style={[
                styles.countdownValue,
                secondsRemaining < 180 && styles.countdownValueWarning,
              ]}
            >
              {secondsRemaining > 0 ? formatTimer(secondsRemaining) : 'Đã hết hạn'}
            </Text>
          </View>
        </View>

        {/* Thẻ tóm tắt đơn hẹn */}
        <View style={styles.card}>
          <View style={styles.bookingRow}>
            <View>
              <Text style={styles.bookingCodeLabel}>Mã đơn đặt lịch</Text>
              <Text style={styles.bookingCode}>
                #{depositData?.bookingCode || bookingDetail?.bookingCode || `BK-${bookingId}`}
              </Text>
            </View>
            <View style={styles.badgeScheduled}>
              <Text style={styles.badgeText}>Thợ tự do (Freelancer)</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.serviceRow}>
            <Ionicons name="brush-outline" size={20} color={BrandColors.primary} />
            <Text style={styles.serviceName} numberOfLines={1}>
              {bookingDetail?.packageName || 'Dịch vụ trang điểm chuyên nghiệp'}
            </Text>
          </View>

          {bookingDetail?.destinationAddress ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color="#64748B" />
              <Text style={styles.addressText} numberOfLines={2}>
                {bookingDetail.destinationAddress}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Thẻ cơ cấu tài chính (Quy tắc 30% Cọc - 70% Tiền mặt) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chi Tiết Thanh Toán</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tổng giá trị gói dịch vụ:</Text>
            <Text style={styles.priceValue}>{formatVnd(totalAmount)}</Text>
          </View>

          <View style={[styles.priceRow, styles.depositHighlightRow]}>
            <View>
              <Text style={styles.depositLabel}>Tiền cọc giữ chỗ (30%):</Text>
              <Text style={styles.depositSubLabel}>Thanh toán online qua ví</Text>
            </View>
            <Text style={styles.depositValue}>{formatVnd(depositAmount)}</Text>
          </View>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Còn lại trả tiền mặt (70%):</Text>
              <Text style={styles.cashSubLabel}>Khách trả trực tiếp cho thợ sau làm đẹp</Text>
            </View>
            <Text style={styles.remainingValue}>{formatVnd(remainingCash)}</Text>
          </View>

          <View style={styles.escrowNotice}>
            <Ionicons name="shield-checkmark" size={18} color="#059669" />
            <Text style={styles.escrowNoticeText}>
              Khoản cọc 30% được giữ trong quỹ bảo chứng Escrow an toàn. Thợ chỉ nhận thù lao khi hai bên xác nhận dịch vụ hoàn thành mỹ mãn.
            </Text>
          </View>
        </View>

        {/* Chọn cổng thanh toán */}
        <View style={styles.card}>
          <View style={styles.paymentMethodHeader}>
            <View style={styles.paymentMethodIconWrap}>
              <Ionicons name="card" size={20} color={BrandColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentMethodTitle}>Phương Thức Thanh Toán Cọc</Text>
              <Text style={styles.paymentMethodSubtitle}>
                Bảo chứng an toàn 100% qua Quỹ Escrow
              </Text>
            </View>
          </View>

          {/* Cổng MoMo */}
          <TouchableOpacity
            style={[
              styles.gatewayOption,
              selectedGateway === 'MOMO' && styles.gatewayOptionSelectedMomo,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedGateway('MOMO');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.gatewayLeft}>
              <View style={[styles.gatewayIconBox, { backgroundColor: '#A50064' }]}>
                <Text style={styles.gatewayIconText}>MoMo</Text>
              </View>
              <View style={styles.gatewayMeta}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.gatewayName}>Ví Điện Tử MoMo</Text>
                  <View style={styles.recommendBadge}>
                    <Text style={styles.recommendBadgeText}>Khuyên dùng</Text>
                  </View>
                </View>
                <Text style={styles.gatewayDesc}>Thanh toán nhanh qua App MoMo hoặc quét mã QR</Text>
              </View>
            </View>
            <Ionicons
              name={selectedGateway === 'MOMO' ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={selectedGateway === 'MOMO' ? '#A50064' : '#CBD5E1'}
            />
          </TouchableOpacity>

          {/* Cổng VNPay */}
          <TouchableOpacity
            style={[
              styles.gatewayOption,
              selectedGateway === 'VNPAY' && styles.gatewayOptionSelectedVnpay,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setSelectedGateway('VNPAY');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.gatewayLeft}>
              <View style={[styles.gatewayIconBox, { backgroundColor: '#005BAA' }]}>
                <Text style={[styles.gatewayIconText, { fontSize: 10 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit>VNPAY</Text>
              </View>
              <View style={styles.gatewayMeta}>
                <Text style={styles.gatewayName}>Cổng Thanh Toán VNPAY</Text>
                <Text style={styles.gatewayDesc}>Hỗ trợ ứng dụng ngân hàng (VNPAY-QR) & Thẻ ATM nội địa</Text>
              </View>
            </View>
            <Ionicons
              name={selectedGateway === 'VNPAY' ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={selectedGateway === 'VNPAY' ? '#005BAA' : '#CBD5E1'}
            />
          </TouchableOpacity>
        </View>

        {/* Trạng thái đang kiểm tra thanh toán (Polling) */}
        {paymentPolling && (
          <View style={styles.pollingCard}>
            <View style={styles.pollingHeaderRow}>
              <View style={styles.pollingIndicatorWrap}>
                <ActivityIndicator size="small" color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pollingTitle}>
                  Đang chờ xác nhận từ {selectedGateway}...
                </Text>
                <Text style={styles.pollingSubtitle}>
                  Hệ thống tự động cập nhật khi giao dịch thành công.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.syncVerifyBtn, isProcessing && styles.syncVerifyBtnDisabled]}
              onPress={handleManualSync}
              disabled={isProcessing}
              activeOpacity={0.85}
            >
              {isProcessing ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.syncVerifyBtnText}>Đang kiểm tra kết quả...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.syncVerifyBtnText}>Tôi đã thanh toán thành công</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Nút Hủy Đơn & Về Trang Chủ trực tiếp */}
        <TouchableOpacity
          style={styles.cancelBookingFooterLink}
          onPress={confirmCancelAndGoHome}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
          <Text style={styles.cancelBookingFooterText}>
            Không muốn đặt lịch nữa? Hủy đơn & về trang chủ
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomTotalContainer}>
          <Text style={styles.bottomTotalLabel}>Tiền cọc giữ chỗ (30%):</Text>
          <Text style={styles.bottomTotalAmount}>{formatVnd(depositAmount)}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.payBtn,
            selectedGateway === 'MOMO' ? styles.payBtnMomo : styles.payBtnVnpay,
            (isProcessing || secondsRemaining <= 0) && styles.payBtnDisabled,
          ]}
          onPress={handleProceedPayment}
          disabled={isProcessing || secondsRemaining <= 0}
          activeOpacity={0.85}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.payBtnText}>
                {secondsRemaining > 0 ? `Thanh toán ${selectedGateway}` : 'Đã hết giờ'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal Chúc Mừng Đặt Cọc Thành Công */}
      {isPaidSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={64} color="#059669" />
            </View>
            <Text style={styles.successTitle}>Đặt Cọc Thành Công!</Text>
            <Text style={styles.successMessage}>
              Khoản cọc {formatVnd(depositAmount)} đã được bảo lưu thành công trong Escrow. Lịch hẹn của bạn đã chính thức được chốt với chuyên gia trang điểm.
            </Text>

            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => {
                router.replace(`/booking/detail/${bookingId}` as any);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.successBtnText}>Xem Chi Tiết Lịch Hẹn</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    padding: 24,
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
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerHomeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  cancelBookingFooterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelBookingFooterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  countdownBannerWarning: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  countdownTextContainer: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  countdownLabel: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '600',
  },
  countdownValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B45309',
  },
  countdownValueWarning: {
    color: '#DC2626',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingCodeLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  bookingCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  badgeScheduled: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  addressText: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paymentMethodIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  paymentMethodSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  depositHighlightRow: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  priceLabel: {
    fontSize: 13,
    color: '#475569',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  depositLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  depositSubLabel: {
    fontSize: 11,
    color: '#BE123C',
    marginTop: 1,
  },
  depositValue: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  cashSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  remainingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  escrowNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  escrowNoticeText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1,
    lineHeight: 17,
  },
  gatewayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  gatewayOptionSelectedMomo: {
    borderColor: '#A50064',
    backgroundColor: '#FDF2F8',
  },
  gatewayOptionSelectedVnpay: {
    borderColor: '#005BAA',
    backgroundColor: '#EFF6FF',
  },
  gatewayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gatewayIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gatewayIconText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  gatewayMeta: {
    marginLeft: 12,
    flex: 1,
  },
  gatewayName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  recommendBadge: {
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendBadgeText: {
    color: '#BE185D',
    fontSize: 10,
    fontWeight: '700',
  },
  gatewayDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pollingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: 16,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  pollingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pollingIndicatorWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  pollingSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 6,
  },
  bottomTotalContainer: {
    flexShrink: 0,
  },
  bottomTotalLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  bottomTotalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primary,
    marginTop: 1,
  },
  payBtn: {
    flex: 1,
    maxWidth: 220,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  payBtnMomo: {
    backgroundColor: '#A50064',
  },
  payBtnVnpay: {
    backgroundColor: '#005BAA',
  },
  payBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  payBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  successOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 999,
  },
  successModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  successIconCircle: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  successBtn: {
    backgroundColor: BrandColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  successBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  syncVerifyBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  syncVerifyBtnDisabled: {
    backgroundColor: '#6EE7B7',
  },
  syncVerifyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  successStatusBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  successShieldCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successStatusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  waitingDriverTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  waitingDriverTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  successStatusSub: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    textAlign: 'center',
  },
  escrowCardHighlight: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  escrowCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  escrowCardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
  },
  dividerThin: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  escrowVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  escrowVerifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.3,
  },
  escrowPriceBreakdown: {
    marginBottom: 12,
  },
  escrowPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  escrowPriceLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  escrowPriceDeposit: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  escrowPriceCash: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  escrowPolicyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
  },
  escrowPolicyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#065F46',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  paidBottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    gap: 10,
  },
  paidPrimaryBtn: {
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  paidPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  paidSecondaryBtn: {
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  paidSecondaryBtnText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
});
