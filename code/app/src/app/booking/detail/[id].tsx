import { DismissibleModal } from '@/components/common/DismissibleModal';
import { ImageViewerModal } from '@/components/common/ImageViewerModal';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { BrandColors } from '@/constants/theme';
import { bookingService, BookingStatusDetailRes, BookingStatusType } from '@/services/booking.service';
import { websocketService } from '@/services/websocket.service';
import { depositService } from '@/services/deposit.service';
import { reviewService, ReviewItem } from '@/services/review.service';
import { ReviewModal } from '@/components/customer/ReviewModal';
import { useNotificationStore } from '@/store/notification.store';
import { UserAvatar } from '@/components/common/UserAvatar';
import { formatDateTimeVN, formatDateVN, formatTimeVN } from '@/utils/date';
import { CancelBookingModal } from '@/components/booking/CancelBookingModal';
import { DisputeDossierModal } from '@/components/booking/DisputeDossierModal';
import { useAuthStore } from '@/store/auth.store';
import { BookingDetailSkeleton } from '@/components/base/Skeleton';

export default function CustomerBookingDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bookingDetail, setBookingDetail] = useState<BookingStatusDetailRes | null>(null);
  const [isDisputeDossierOpen, setIsDisputeDossierOpen] = useState(false);
  const [isDisputeDossierAutoOpen, setIsDisputeDossierAutoOpen] = useState(false);
  const [isCashPaidConfirmed, setIsCashPaidConfirmed] = useState(false);
  const [isConfirmingCash, setIsConfirmingCash] = useState(false);
  const [isPayingOnline, setIsPayingOnline] = useState(false);
  const [onlineGatewayPaying, setOnlineGatewayPaying] = useState<'MOMO' | 'VNPAY' | null>(null);

  // Modal Hủy ca
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Trọng tài leo thang Mô hình C
  const [isEscalateModalVisible, setIsEscalateModalVisible] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [isSubmittingEscalate, setIsSubmittingEscalate] = useState(false);
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);

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
      if (
        data?.status === 'PAID_OUT' ||
        data?.status === 'CANCELLED' ||
        data?.status === 'CANCELLED_EXPIRED' ||
        data?.status === 'DISPUTED' ||
        data?.status === 'DISPUTE_REFUNDED' ||
        data?.status === 'DISPUTE_COMPENSATED'
      ) {
        const reviewParam = data?.status === 'PAID_OUT' ? '?openReview=true' : '';
        router.replace(`/booking/history-detail/${bookingId}${reviewParam}` as any);
        return;
      }
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
      const unsub = websocketService.subscribe(topic, (msg: any) => {
        if (msg) {
          const nextStatus = msg.currentStatus || msg.status;
          if (nextStatus) {
            setBookingDetail((prev) => (prev ? { ...prev, status: nextStatus } : prev));
          }

          if (msg.type === 'WORKER_CASH_DECLINED') {
            setIsCashPaidConfirmed(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
              'Chưa Nhận Được Tiền Mặt ⚠️',
              msg.reason || 'Chuyên viên make-up báo chưa nhận được tiền mặt từ bạn. Vui lòng kiểm tra lại và trao tiền mặt trực tiếp cho chuyên viên hoặc đổi sang hình thức thanh toán khác.'
            );
            loadBookingData(true);
            return;
          }

          if (
            nextStatus === 'PAID_OUT' ||
            msg.type === 'PAYMENT_COMPLETED' ||
            msg.isDepositPaid ||
            nextStatus === 'ACCEPTED'
          ) {
            setIsCashPaidConfirmed(false);
            try {
              WebBrowser.dismissBrowser();
            } catch {}
          }
          loadBookingData(true);

          // Kích hoạt Toast thông báo chữ nổi bật
          let toastTitle = 'Cập Nhật Đơn Hàng';
          let toastContent = msg.message || `Lịch hẹn #${bookingDetail?.bookingCode || bookingId} vừa có cập nhật mới.`;
          let toastType = 'NOTIFICATION';

          if (nextStatus === 'ON_THE_WAY') {
            toastTitle = 'Chuyên Viên Đang Di Chuyển';
            toastContent = 'Chuyên viên make-up đang trên đường di chuyển đến điểm hẹn của bạn.';
            toastType = 'BOOKING_ON_THE_WAY';
          } else if (nextStatus === 'ARRIVED') {
            toastTitle = 'Chuyên Viên Đã Đến Nơi';
            toastContent = 'Chuyên viên make-up đã có mặt tại điểm hẹn của bạn. Vui lòng đón thợ!';
            toastType = 'BOOKING_ARRIVED';
          } else if (nextStatus === 'IN_PROGRESS') {
            toastTitle = 'Đang Tiến Hành Make-Up';
            toastContent = 'Chuyên viên đã chính thức bắt đầu buổi làm đẹp cho bạn.';
            toastType = 'BOOKING_IN_PROGRESS';
          } else if (nextStatus === 'COMPLETED') {
            toastTitle = 'Buổi Make-Up Hoàn Tất';
            toastContent = 'Dịch vụ trang điểm đã hoàn tất thành công. Vui lòng kiểm tra và thanh toán!';
            toastType = 'BOOKING_COMPLETED';
          } else if (nextStatus === 'CANCELLED') {
            toastTitle = 'Đơn Hàng Đã Bị Hủy';
            toastContent = msg.message || 'Lịch hẹn trang điểm đã bị hủy.';
            toastType = 'BOOKING_CANCELLED';
          } else if (nextStatus === 'PAID_OUT') {
            toastTitle = 'Thanh Toán Thành Công';
            toastContent = 'Khoản thanh toán dịch vụ đã hoàn tất trọn vẹn.';
            toastType = 'PAID_OUT';
          }

          useNotificationStore.getState().showToast({
            id: Date.now(),
            type: toastType,
            title: toastTitle,
            content: toastContent,
            bookingId,
            bookingCode: bookingDetail?.bookingCode,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      });
      return () => {
        unsub?.();
      };
    }
  }, [bookingId]);

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const getStatusBadge = (status?: BookingStatusType, reason?: string) => {
    switch (status) {
      case 'PENDING_DEPOSIT':
        return { label: 'Chờ Đặt Cọc', color: '#D97706', bg: '#FEF3C7', icon: 'card-outline' };
      case 'REQUESTED':
        return { label: 'Chờ Chuyên Viên Tiếp Nhận', color: '#D97706', bg: '#FEF3C7', icon: 'hourglass-outline' };
      case 'PENDING_AGENCY_DISPATCH':
        return { label: 'Chờ Studio Phân Công', color: '#D97706', bg: '#FEF3C7', icon: 'sync-outline' };
      case 'AGENCY_ASSIGNED':
      case 'ACCEPTED':
        return { label: 'Đã Nhận Đơn', color: '#2563EB', bg: '#DBEAFE', icon: 'checkmark-circle-outline' };
      case 'ON_THE_WAY':
        return { label: 'Thợ Đang Tới', color: '#0284C7', bg: '#E0F2FE', icon: 'bicycle-outline' };
      case 'ARRIVED':
        return { label: 'Thợ Đã Đến Nơi', color: '#0D9488', bg: '#CCFBF1', icon: 'location-outline' };
      case 'IN_PROGRESS':
        return { label: 'Đang Trang Điểm', color: BrandColors.primary, bg: '#FFF1F2', icon: 'brush-outline' };
      case 'COMPLETED':
      case 'PAID_OUT': {
        if (reason?.includes('[KHACH_DONG_Y_KET_QUA]')) {
          return { label: 'Đã Đồng Ý Kết Quả', color: '#2563EB', bg: '#DBEAFE', icon: 'checkmark-circle-outline' };
        }
        return { label: 'Hoàn Thành', color: '#059669', bg: '#D1FAE5', icon: 'checkmark-done-circle-outline' };
      }
      case 'CANCELLED':
      case 'EXPIRED':
        return { label: 'Đã Hủy', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline' };
      case 'DISPUTED': {
        if (reason?.includes('[STUDIO_TU_CHOI]')) {
          return { label: 'Studio Từ Chối (Chờ Bạn)', color: '#EA580C', bg: '#FFEDD5', icon: 'alert-circle-outline' };
        }
        if (reason?.includes('[LEO_THANG_ADMIN]')) {
          return { label: 'Chờ Sàn Phán Quyết', color: '#DC2626', bg: '#FEE2E2', icon: 'shield-half-outline' };
        }
        return { label: 'Đang Khiếu Nại', color: '#EA580C', bg: '#FFEDD5', icon: 'alert-circle-outline' };
      }
      case 'DISPUTE_REFUNDED': {
        const isPost = Boolean(bookingDetail?.completionPhotoUrl || bookingDetail?.completedAt || bookingDetail?.cancellationReason?.toLowerCase().includes('sau ca') || bookingDetail?.cancellationReason?.toLowerCase().includes('tổng tiền đơn'));
        return { label: isPost ? 'Đã Hoàn 100% Tiền Đơn' : 'Đã Hoàn 100% Cọc', color: '#059669', bg: '#D1FAE5', icon: 'shield-checkmark-outline' };
      }
      case 'DISPUTE_COMPENSATED': {
        if (reason?.includes('[KHACH_DONG_Y_KET_QUA]')) {
          return { label: 'Đã Đồng Ý Kết Quả', color: '#2563EB', bg: '#DBEAFE', icon: 'checkmark-circle-outline' };
        }
        const isPost = Boolean(bookingDetail?.completionPhotoUrl || bookingDetail?.completedAt || bookingDetail?.cancellationReason?.toLowerCase().includes('sau ca') || bookingDetail?.cancellationReason?.toLowerCase().includes('bác bỏ khiếu nại'));
        return { label: isPost ? 'Bác Bỏ Khiếu Nại' : 'Đã Phán Quyết Bồi Thường', color: '#4B5563', bg: '#F3F4F6', icon: 'shield-checkmark-outline' };
      }
      default:
        return { label: status || 'Không rõ', color: '#64748B', bg: '#F1F5F9', icon: 'help-circle-outline' };
    }
  };

  const handleAcceptStudioResolution = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Chấp Nhận Kết Quả Từ Studio',
      'Bạn có chắc chắn đồng ý với kết quả giải quyết của Studio và đóng khiếu nại này?',
      [
        { text: 'Suy Nghĩ Lại', style: 'cancel' },
        {
          text: 'Đồng Ý & Đóng Khiếu Nại',
          onPress: async () => {
            try {
              setIsSubmittingAccept(true);
              await bookingService.acceptStudioResolution(bookingId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Thành Công', 'Đã ghi nhận chấp nhận kết quả từ Studio.');
              await loadBookingData(true);
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể cập nhật.');
            } finally {
              setIsSubmittingAccept(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmEscalateToAdmin = async () => {
    try {
      setIsSubmittingEscalate(true);
      await bookingService.escalateDispute(bookingId, escalateReason.trim() || undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEscalateModalVisible(false);
      setEscalateReason('');
      Alert.alert('Đã Chuyển Lên Sàn', 'Yêu cầu của bạn đã được chuyển lên Ban Quản Trị Sàn để làm trọng tài phân xử.');
      await loadBookingData(true);
    } catch (err: any) {
      Alert.alert('Lỗi Chuyển Khiếu Nại', err?.response?.data?.message || err?.message || 'Không thể chuyển khiếu nại lên Admin.');
    } finally {
      setIsSubmittingEscalate(false);
    }
  };

  const handleCallPhone = (phone?: string, name?: string) => {
    Haptics.selectionAsync();
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Liên Hệ', `Số điện thoại của ${name || 'đối tác'}: 0987.654.321`);
    }
  };

  const handleCallMUA = () => {
    handleCallPhone(bookingDetail?.muaPhone || bookingDetail?.muaPhoneNumber, bookingDetail?.muaName || 'Chuyên viên');
  };

  const handleConfirmCancel = async (
    targetBookingId: number,
    reason: string,
    isLateCancel: boolean,
    isDispute?: boolean,
    emergencyProofUrl?: string
  ) => {
    setIsCancelling(true);
    try {
      if (isDispute) {
        await bookingService.transitionBookingState(bookingId, 'DISPUTED', reason, emergencyProofUrl);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsCancelModalVisible(false);
        setTimeout(() => {
          Alert.alert(
            'Đã Gửi Báo Cáo Khiếu Nại',
            isAgencyBooking
              ? 'Báo cáo khiếu nại kèm minh chứng đã được chuyển tới Studio phụ trách. Quản lý Studio sẽ kiểm tra và giải quyết hoàn cọc cho bạn.'
              : 'Báo cáo khiếu nại kèm minh chứng của bạn đã được chuyển tới Ban Quản Trị. Admin sẽ xác minh sự việc và hoàn trả tiền cọc về Ví của bạn ngay sau khi phê duyệt.'
          );
        }, 350);
      } else {
        await bookingService.cancelBooking(bookingId, reason);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsCancelModalVisible(false);
        setTimeout(() => {
          Alert.alert(
            isLateCancel ? 'Đã Hủy Ca (Bồi Thường Cho Thợ)' : 'Đã Hủy Ca Hẹn Thành Công',
            isLateCancel
              ? 'Lịch hẹn đã được hủy. Vì bạn hủy trong vòng 2 tiếng trước giờ hẹn, toàn bộ số tiền cọc đã được chuyển bồi thường cho chuyên viên make-up.'
              : 'Yêu cầu hủy đơn hẹn của bạn đã hoàn tất thành công. 100% tiền cọc đã được hoàn trả về Ví của bạn.'
          );
        }, 350);
      }
      loadBookingData(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể hủy đơn tại thời điểm này.';
      setIsCancelModalVisible(false);
      setTimeout(() => {
        Alert.alert('Lỗi Thao Tác', msg);
      }, 350);
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

  const formatCancellationReason = (reason?: string | null) => {
    if (!reason) return '';
    return reason.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g, (match) => {
      try {
        const d = new Date(match);
        if (isNaN(d.getTime())) return match;
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${hours}:${minutes} ${day}/${month}/${year}`;
      } catch {
        return match;
      }
    });
  };

  if (isLoading && !bookingDetail) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi Tiết Lịch Hẹn</Text>
          <View style={{ width: 40 }} />
        </View>
        <BookingDetailSkeleton />
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

  const badge = getStatusBadge(bookingDetail.status, bookingDetail.cancellationReason || bookingDetail.emergencyReason);
  const remainingAmount = Math.max(0, (bookingDetail.totalAmount || 0) - (bookingDetail.depositAmount || 0));

  const isScheduled = bookingDetail.bookingType === 'SCHEDULED' || bookingDetail.bookingCode?.startsWith('BK-SCHED');
  const isAgencyBooking =
    bookingDetail.bookingPartner === 'AGENCY' ||
    Boolean(bookingDetail.agencyId) ||
    Boolean(bookingDetail.agencyName);

  const rawAssignedStaff = (bookingDetail.assignedStaff || []).filter(
    (s) => s.status !== 'REPLACED' && s.status !== 'DECLINED'
  );

  // Khử trùng lặp thợ phân công (tránh hiển thị cùng 1 thợ nhiều lần nếu có bản ghi gán trùng hoặc SQL join)
  const staffMap = new Map<string, StaffAssignmentItem>();
  for (const s of rawAssignedStaff) {
    const key = String(s.staffId || s.id);
    if (!staffMap.has(key)) {
      staffMap.set(key, s);
    } else {
      const existing = staffMap.get(key)!;
      // Ưu tiên bản ghi có trạng thái ACTIVE hoặc đã xác nhận hơn
      if (existing.status !== 'ACTIVE' && s.status === 'ACTIVE') {
        staffMap.set(key, s);
      }
    }
  }
  const allAssignedStaff = Array.from(staffMap.values());

  const confirmedStaffList = allAssignedStaff.filter(
    (s) =>
      (s.isConfirmedByStaff === true || Boolean(s.confirmedAt) || s.status === 'CONFIRMED') &&
      s.status !== 'DECLINED' &&
      s.status !== 'REPLACED' &&
      s.status !== 'EMERGENCY_CANCELLED'
  );

  const emergencyCancelledStaff = (bookingDetail.assignedStaff || []).find(
    (s) => s.status === 'EMERGENCY_CANCELLED' || (Boolean(s.cancellationReason) && (s.status as string) !== 'REPLACED')
  );

  const hasEmergencyCancelledStaff = allAssignedStaff.some(
    (s) => s.status === 'EMERGENCY_CANCELLED' || (Boolean(s.cancellationReason) && s.isConfirmedByStaff === false)
  );

  const hasPendingStaff = allAssignedStaff.some(
    (s) => s.status === 'ACTIVE' && (s.isConfirmedByStaff === false || !s.confirmedAt)
  );

  // Xác định bước tiến trình (Tách riêng cho Đặt Trước vs Đặt Gấp)
  const getStepIndex = (status: BookingStatusType) => {
    if (isScheduled) {
      switch (status) {
        case 'PENDING_DEPOSIT':
          return 0;
        case 'REQUESTED':
        case 'PENDING_AGENCY_DISPATCH':
        case 'AGENCY_ASSIGNED':
          return 1;
        case 'ACCEPTED':
          return 2;
        case 'ON_THE_WAY':
        case 'ARRIVED':
        case 'IN_PROGRESS':
          return 3;
        case 'COMPLETED':
        case 'PAID_OUT':
          return 4;
        default:
          return -1;
      }
    }
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

  const stepsList = isScheduled
    ? [
        { title: 'Đặt Cọc', icon: 'card-outline' },
        { title: 'Tiếp Nhận', icon: 'hourglass-outline' },
        { title: 'Đến Hẹn', icon: 'calendar-outline' },
        { title: 'Make-up', icon: 'brush-outline' },
        { title: 'Xong', icon: 'checkmark-done-outline' },
      ]
    : [
        { title: 'Nhận Ca', icon: 'receipt-outline' },
        { title: 'Chuẩn Bị', icon: 'bag-check-outline' },
        { title: 'Di Chuyển', icon: 'bicycle-outline' },
        { title: 'Make-up', icon: 'brush-outline' },
        { title: 'Xong', icon: 'checkmark-done-outline' },
      ];

  const currentStep = getStepIndex(bookingDetail.status);
  const isCancelled = bookingDetail.status === 'CANCELLED' || bookingDetail.status === 'EXPIRED';

  const hasAssignedMua = Boolean(
    bookingDetail.muaId ||
    (bookingDetail.muaName && bookingDetail.muaName !== 'Chuyên Viên Make-up' && bookingDetail.muaName.trim().length > 0)
  );

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadBookingData(true)}
            colors={[BrandColors.primary]}
          />
        }
      >
        {/* HERO CARD RIÊNG BIỆT DÀNH CHO ĐƠN ĐẶT LỊCH TRƯỚC */}
        {isScheduled && (
          <View style={styles.scheduledHeroCard}>
            <View style={styles.scheduledHeroHeader}>
              <View style={[styles.scheduledHeroBadge, isAgencyBooking && styles.agencyHeroBadge]}>
                <Ionicons
                  name={isAgencyBooking ? 'business-outline' : 'calendar-outline'}
                  size={13}
                  color={isAgencyBooking ? '#7E22CE' : '#2563EB'}
                />
                <Text style={[styles.scheduledHeroBadgeText, isAgencyBooking && styles.agencyHeroBadgeText]}>
                  {isAgencyBooking ? 'ĐẶT QUA STUDIO' : 'LỊCH ĐẶT TRƯỚC'}
                </Text>
              </View>
              <Text style={styles.scheduledHeroCode}>{bookingDetail.bookingCode}</Text>
            </View>

            <View style={styles.scheduledHeroBody}>
              <View style={styles.scheduledHeroTimeCol}>
                <Text style={styles.scheduledHeroTimeLabel}>Thời Gian Hẹn</Text>
                <Text style={styles.scheduledHeroTimeValue}>
                  {bookingDetail.startTime ? formatTimeVN(bookingDetail.startTime) : '--:--'}
                </Text>
                <Text style={styles.scheduledHeroDateValue}>
                  {bookingDetail.bookingDate ? formatDateVN(bookingDetail.bookingDate) : '--/--/----'}
                </Text>
              </View>

              <View style={styles.scheduledHeroDivider} />

              <View style={styles.scheduledHeroServiceCol}>
                <Text style={styles.scheduledHeroServiceLabel}>Gói Dịch Vụ</Text>
                <Text style={styles.scheduledHeroServiceValue} numberOfLines={2}>
                  {bookingDetail.packageName || 'Dịch vụ trang điểm'}
                </Text>
                {bookingDetail.estimatedDurationMinutes ? (
                  <View style={styles.scheduledDurationPill}>
                    <Ionicons name="time-outline" size={11} color="#64748B" />
                    <Text style={styles.scheduledDurationPillText}>
                      {bookingDetail.estimatedDurationMinutes} phút
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {/* BANNER TRẠNG THÁI HIỆN TẠI (ẨN KHI Ở REQUESTED HOẶC PENDING_DEPOSIT ĐỂ TRÁNH TRÙNG LẶP CARD) */}
        {bookingDetail.status !== 'REQUESTED' && bookingDetail.status !== 'PENDING_DEPOSIT' && (
          <View style={[styles.statusBanner, { backgroundColor: badge.bg, borderColor: badge.color + '33' }]}>
            <View style={styles.statusBannerLeft}>
              <View style={[styles.statusIconWrap, { backgroundColor: badge.color }]}>
                <Ionicons name={badge.icon as any} size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusBannerTitle, { color: badge.color }]}>{badge.label}</Text>
                <Text style={styles.statusBannerDesc}>
                  {bookingDetail.status === 'ON_THE_WAY' && 'Chuyên viên MUA đang trên đường tới điểm hẹn'}
                  {bookingDetail.status === 'ARRIVED' && 'Chuyên viên đã đến điểm hẹn, sẵn sàng đồ nghề'}
                  {bookingDetail.status === 'IN_PROGRESS' && 'Đang trong quá trình thực hiện gói trang điểm'}
                  {bookingDetail.status === 'COMPLETED' && 'Ca trang điểm đã hoàn thành xuất sắc'}
                  {bookingDetail.status === 'ACCEPTED' && (bookingDetail.isDepositPaid ? 'Đã đặt cọc, chờ thợ khởi hành' : 'Vui lòng thanh toán cọc để giữ lịch thợ')}
                  {bookingDetail.status === 'DISPUTED' && (
                    (bookingDetail.cancellationReason || '').includes('[STUDIO_TU_CHOI]')
                      ? 'Studio đã từ chối hoàn cọc (Chờ bạn phản hồi)'
                      : (bookingDetail.cancellationReason || '').includes('[LEO_THANG_ADMIN]')
                      ? 'Đang chờ Admin Sàn làm trọng tài phân xử'
                      : (bookingDetail.emergencyReason || bookingDetail.cancellationReason || 'Đơn hàng đang trong quá trình khiếu nại')
                  )}
                  {bookingDetail.status === 'DISPUTE_REFUNDED' && (
                    bookingDetail.cancellationReason || (
                      (bookingDetail.completionPhotoUrl || bookingDetail.completedAt || bookingDetail.cancellationReason?.toLowerCase().includes('sau ca'))
                        ? 'Đã duyệt khiếu nại: Hoàn 100% tiền đơn về Ví của bạn'
                        : 'Đã duyệt khiếu nại: Hoàn 100% tiền cọc về Ví của bạn'
                    )
                  )}
                  {(bookingDetail.status === 'DISPUTE_COMPENSATED' || (bookingDetail.status === 'PAID_OUT' && (bookingDetail.cancellationReason || '').includes('[KHACH_DONG_Y_KET_QUA]'))) && (
                    (bookingDetail.cancellationReason || '').includes('[KHACH_DONG_Y_KET_QUA]')
                      ? 'Đã giải quyết: Bạn đã chấp nhận kết quả từ Studio'
                      : (bookingDetail.cancellationReason || (
                          (bookingDetail.completionPhotoUrl || bookingDetail.completedAt || bookingDetail.cancellationReason?.toLowerCase().includes('sau ca'))
                            ? 'Đã giải quyết: Bác bỏ khiếu nại, bảo lưu thù lao ca làm'
                            : 'Đã duyệt phân xử: Tiền cọc dùng để bồi thường thiệt hại'
                        ))
                  )}
                  {isCancelled && (bookingDetail.cancellationReason || 'Đơn đã hủy theo yêu cầu')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* BANNER ĐẶC THÙ KHI ĐƠN ĐANG KHIẾU NẠI (DISPUTED) */}
        {bookingDetail.status === 'DISPUTED' && (() => {
          const rawDisputeReason = (bookingDetail.emergencyReason || bookingDetail.cancellationReason || '').trim();
          const rawDisputeProof = (bookingDetail.emergencyProofUrl || '').trim();
          const proofUrls = rawDisputeProof ? rawDisputeProof.split('|').map((u) => u.trim()).filter(Boolean) : [];

          const isStudioRejected = Boolean(
            bookingDetail.cancellationReason?.includes('[STUDIO_TU_CHOI]') ||
            bookingDetail.emergencyReason?.includes('[STUDIO_TU_CHOI]') ||
            rawDisputeReason.includes('[STUDIO_TU_CHOI]')
          );
          const isEscalatedToAdmin = Boolean(
            bookingDetail.cancellationReason?.includes('[LEO_THANG_ADMIN]') ||
            bookingDetail.emergencyReason?.includes('[LEO_THANG_ADMIN]') ||
            rawDisputeReason.includes('[LEO_THANG_ADMIN]')
          );

          const isPostCompletion = Boolean(
            bookingDetail.status === 'COMPLETED' ||
            bookingDetail.status === 'PAID_OUT' ||
            bookingDetail.completionPhotoUrl ||
            (bookingDetail.totalAmount && bookingDetail.depositAmount && Number(bookingDetail.totalAmount) > Number(bookingDetail.depositAmount) &&
              !rawDisputeReason?.toLowerCase().includes('vắng mặt') &&
              !rawDisputeReason?.toLowerCase().includes('không gặp khách'))
          );

          let studioRejectNote = '';
          if (isStudioRejected) {
            const fullReason = `${bookingDetail.cancellationReason || ''} ${bookingDetail.emergencyReason || ''}`;
            const match = fullReason.match(/\[STUDIO_TU_CHOI\]:\s*([^\[]+)/);
            if (match && match[1]) {
              studioRejectNote = match[1].trim();
            }
          }

          const isDual =
            bookingDetail.disputeOrigin === 'DUAL' ||
            (rawDisputeReason.includes('[Khách hàng]') && rawDisputeReason.includes('[Chuyên viên MUA]'));

          const isMuaReport =
            !isDual &&
            (bookingDetail.disputeOrigin === 'MUA' ||
              rawDisputeReason.includes('[Chuyên viên MUA]') ||
              (!rawDisputeReason.includes('[Khách hàng]') &&
                (rawDisputeReason.toLowerCase().includes('khách hàng') ||
                  rawDisputeReason.toLowerCase().includes('với khách') ||
                  rawDisputeReason.toLowerCase().includes('vắng mặt') ||
                  rawDisputeReason.toLowerCase().includes('no-show'))));

          let customerStatement = '';
          let muaStatement = '';
          let customerProofUrl: string | undefined;
          let muaProofUrl: string | undefined;

          if (isDual) {
            const parts = rawDisputeReason.split('|');
            parts.forEach((p) => {
              const trimmed = p.trim();
              if (trimmed.includes('[Khách hàng]')) {
                customerStatement = trimmed.replace(/\[Khách hàng\]:?/, '').trim();
              } else if (trimmed.includes('[Chuyên viên MUA]')) {
                muaStatement = trimmed.replace(/\[Chuyên viên MUA\]:?/, '').trim();
              } else if (
                trimmed.toLowerCase().includes('khách hàng') ||
                trimmed.toLowerCase().includes('với khách') ||
                trimmed.toLowerCase().includes('vắng mặt')
              ) {
                muaStatement = trimmed;
              } else {
                if (!muaStatement) muaStatement = trimmed;
                else if (!customerStatement) customerStatement = trimmed;
              }
            });

            const hasTaggedProofs = proofUrls.some((p) => p.includes('[Khách hàng]') || p.includes('[Chuyên viên MUA]'));
            if (hasTaggedProofs) {
              proofUrls.forEach((item) => {
                if (item.includes('[Khách hàng]')) {
                  customerProofUrl = item.replace(/\[Khách hàng\]:?/, '').trim();
                } else if (item.includes('[Chuyên viên MUA]')) {
                  muaProofUrl = item.replace(/\[Chuyên viên MUA\]:?/, '').trim();
                } else {
                  if (!muaProofUrl) muaProofUrl = item;
                  else if (!customerProofUrl) customerProofUrl = item;
                }
              });
            } else {
              if (rawDisputeReason.startsWith('[Khách hàng]')) {
                customerProofUrl = proofUrls[0];
                muaProofUrl = proofUrls[1];
              } else {
                muaProofUrl = proofUrls[0];
                customerProofUrl = proofUrls[1];
              }
            }
          }

          let title = 'ĐƠN HÀNG ĐANG TRONG KHIẾU NẠI';
          let subtitle = '';
          let reporterBadge = '';
          let reasonLabel = 'Lý do khiếu nại báo cáo:';
          let statement = rawDisputeReason.replace(/\[.*?\]:?/g, '').trim();

          if (isEscalatedToAdmin) {
            title = 'ĐANG CHỜ ADMIN SÀN PHÁN QUYẾT';
            subtitle = 'Vụ việc đã được chuyển lên Ban Quản Trị Sàn phân xử tối hậu. Tiền cọc được bảo lưu an toàn trong Escrow.';
            reporterBadge = 'Admin Sàn Thụ Lý';
          } else if (isStudioRejected) {
            title = isPostCompletion ? 'STUDIO ĐÃ BÁC BỎ KHIẾU NẠI' : 'STUDIO ĐÃ TỪ CHỐI HOÀN CỌC';
            subtitle = isPostCompletion
              ? 'Studio phụ trách đã từ chối yêu cầu khiếu nại chất lượng dịch vụ của bạn. Bạn có thể chấp nhận giải quyết nội bộ hoặc khiếu nại lên Admin Sàn.'
              : 'Studio phụ trách đã từ chối yêu cầu hoàn cọc của bạn. Bạn có thể chấp nhận giải quyết nội bộ hoặc khiếu nại lên Admin Sàn.';
            reporterBadge = 'Studio Từ Chối';
          } else if (isDual) {
            title = 'TRANH CHẤP 2 CHIỀU ĐANG ĐỐI SOÁT';
            subtitle = 'Cả bạn và chuyên viên đều đã nộp báo cáo tranh chấp. Ban Quản Trị đang tổng hợp minh chứng hai bên để đưa ra phán quyết công bằng.';
            reporterBadge = 'Tranh Chấp 2 Chiều';
            reasonLabel = 'Nội dung phản ánh hai bên:';
          } else if (isMuaReport) {
            title = 'CHUYÊN VIÊN MAKE-UP ĐÃ BÁO CÁO SỰ CỐ';
            subtitle = 'Chuyên viên make-up đã gửi báo cáo sự cố (khách vắng mặt/không liên lạc được). Ban Quản Trị đang xác minh minh chứng từ hiện trường trong 24h.';
            reporterBadge = 'Chuyên Viên Make-up Báo Cáo';
            reasonLabel = 'Lý do chuyên viên báo cáo:';
          } else {
            title = 'YÊU CẦU KHIẾU NẠI TỪ BẠN (KHÁCH HÀNG)';
            subtitle = 'Bạn đã gửi yêu cầu khiếu nại ca hẹn này. Ban Quản Trị đang xác minh phản ánh để bảo vệ quyền lợi và hoàn cọc cho bạn.';
            reporterBadge = 'Khiếu Nại Của Bạn';
            reasonLabel = 'Lý do bạn khiếu nại:';
          }

          return (
            <View style={styles.customerDisputeBannerCard}>
              <View style={styles.customerDisputeHeader}>
                <View style={[styles.customerDisputeIconCircle, { backgroundColor: '#EA580C' }]}>
                  <Ionicons name={isDual ? 'scale-outline' : 'shield-half-outline'} size={24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
                    <Text style={[styles.customerDisputeTitle, { color: '#C2410C', marginBottom: 0 }]}>{title}</Text>
                    {reporterBadge ? (
                      <View style={{ backgroundColor: isDual ? '#F3E8FF' : isMuaReport ? '#FEF3C7' : '#FCE7F3', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: isDual ? '#E9D5FF' : isMuaReport ? '#FDE68A' : '#FBCFE8' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: isDual ? '#7E22CE' : isMuaReport ? '#92400E' : '#9D174D' }}>
                          {reporterBadge}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.customerDisputeSubtitle}>{subtitle}</Text>
                </View>
              </View>

              {isDual ? (
                <View style={{ gap: 8, marginTop: 10 }}>
                  {/* Báo cáo Phía Chuyên Viên */}
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FED7AA' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#B45309' }}>Phía Chuyên Viên MUA</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>{bookingDetail.muaName || 'Chuyên viên'}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                      "{muaStatement || 'Chưa gửi lời khai riêng'}"
                    </Text>
                    {muaProofUrl ? (
                      <View style={{ marginTop: 8 }}>
                        <Image
                          source={{ uri: muaProofUrl }}
                          style={{ width: '100%', height: 140, borderRadius: 6, backgroundColor: '#F1F5F9' }}
                          contentFit="cover"
                        />
                      </View>
                    ) : null}
                  </View>

                  {/* Báo cáo Phía Khách Hàng */}
                  <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#DDD6FE' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <View style={{ backgroundColor: '#F3E8FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#7E22CE' }}>Phía Khách Hàng</Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>{bookingDetail.customerName || 'Khách hàng'}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                      "{customerStatement || 'Chưa gửi lời khai riêng'}"
                    </Text>
                    {customerProofUrl ? (
                      <View style={{ marginTop: 8 }}>
                        <Image
                          source={{ uri: customerProofUrl }}
                          style={{ width: '100%', height: 140, borderRadius: 6, backgroundColor: '#F1F5F9' }}
                          contentFit="cover"
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : (
                <>
                  {statement ? (
                    <View style={styles.customerDisputeReasonBox}>
                      <Text style={styles.customerDisputeReasonLabel}>{reasonLabel}</Text>
                      <Text style={styles.customerDisputeReasonText}>"{statement}"</Text>
                    </View>
                  ) : null}

                  {proofUrls.length > 0 && (
                    <View style={styles.customerDisputeProofBox}>
                      <Text style={styles.customerDisputeProofLabel}>
                        Ảnh minh chứng đính kèm ({isMuaReport ? 'Phía Chuyên Viên MUA' : 'Phía Bạn'}):
                      </Text>
                      <Image
                        source={{ uri: proofUrls[0].replace(/\[.*?\]:?/, '').trim() }}
                        style={styles.customerDisputeProofImage}
                        contentFit="cover"
                      />
                    </View>
                  )}
                </>
              )}

              {/* Box hành động của khách khi Studio từ chối hoàn cọc (Mô hình C) */}
              {isStudioRejected && !isEscalatedToAdmin && (
                <View style={{ marginTop: 12, backgroundColor: '#FFF7ED', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FDBA74' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="alert-circle" size={18} color="#C2410C" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#9A3412' }}>
                      {isPostCompletion ? 'Studio Đã Bác Bỏ Khiếu Nại' : 'Studio Đã Từ Chối Hoàn Cọc'}
                    </Text>
                  </View>
                  {studioRejectNote ? (
                    <Text style={{ fontSize: 12, color: '#7C2D12', marginTop: 2, lineHeight: 18 }}>
                      Lý do từ chối: <Text style={{ fontWeight: '600' }}>"{studioRejectNote}"</Text>
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 11, color: '#9A3412', marginTop: 4, fontStyle: 'italic' }}>
                    {isPostCompletion
                      ? 'Bạn có thể chấp nhận kết quả từ Studio hoặc khiếu nại lên Ban Quản Trị Sàn phân xử tối hậu.'
                      : 'Bạn có thể chấp nhận giải quyết nội bộ hoặc chuyển vụ việc lên Admin Sàn phân xử tối hậu.'}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#D1D5DB',
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={handleAcceptStudioResolution}
                      disabled={isSubmittingAccept}
                    >
                      {isSubmittingAccept ? (
                        <ActivityIndicator size="small" color="#4B5563" />
                      ) : (
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>
                          Chấp Nhận Kết Quả
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#DC2626',
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => setIsEscalateModalVisible(true)}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                        Khiếu Nại Lên Sàn
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Box thông báo nếu đã chuyển lên Admin Sàn */}
              {isEscalatedToAdmin && (
                <View style={{ marginTop: 12, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FCA5A5' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Ionicons name="shield-checkmark" size={18} color="#DC2626" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#991B1B' }}>
                      Đang Chờ Admin Sàn Phán Quyết
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#7F1D1D', lineHeight: 16 }}>
                    Hồ sơ đã được gửi lên Ban Quản Trị Sàn làm trọng tài phân xử độc lập. Tiền cọc được bảo lưu an toàn trong Quỹ Escrow.
                  </Text>
                </View>
              )}

              {/* Nút gửi lời khai / đối chất của Khách nếu MUA đã báo cáo trước */}
              {isMuaReport && (
                <TouchableOpacity
                  style={{
                    marginTop: 10,
                    backgroundColor: '#DC2626',
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    shadowColor: '#DC2626',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                  onPress={() => {
                    setIsDisputeDossierAutoOpen(true);
                    setIsDisputeDossierOpen(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={17} color="#FFFFFF" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                    Gửi Yêu Cầu Khiếu Nại Của Bạn
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={{
                  ...styles.viewDisputeDossierBtn,
                  marginTop: isMuaReport ? 8 : 12,
                  backgroundColor: isMuaReport ? '#FFFFFF' : BrandColors.primary,
                  borderWidth: isMuaReport ? 1 : 0,
                  borderColor: '#FED7AA',
                }}
                onPress={() => {
                  setIsDisputeDossierAutoOpen(false);
                  setIsDisputeDossierOpen(true);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="document-text-outline" size={16} color={isMuaReport ? '#9A3412' : '#FFFFFF'} />
                <Text style={{ ...styles.viewDisputeDossierBtnText, color: isMuaReport ? '#9A3412' : '#FFFFFF' }}>
                  Xem Chi Tiết Yêu Cầu Khiếu Nại
                </Text>
              </TouchableOpacity>
            </View>
          );
        })()}

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
              onPress={() => router.replace(`/booking/deposit/${bookingId}` as any)}
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
            <Text style={styles.cardTitle}>
              {isScheduled ? 'Tiến Trình Lịch Hẹn Đặt Trước' : 'Tiến Trình Thực Hiện'}
            </Text>
            <View style={styles.stepperContainer}>
              {stepsList.map((step, idx) => {
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

        {/* THÔNG TIN ĐƠN VỊ THỰC HIỆN: STUDIO CHUYÊN NGHIỆP VS THỢ TỰ DO */}
        {isAgencyBooking ? (
          <>
            {/* 1. THẺ THÔNG TIN STUDIO ĐỐI TÁC */}
            <View style={styles.agencyCard}>
              <View style={styles.agencyBadgeHeader}>
                <View style={styles.agencyTypeBadge}>
                  <Ionicons name="business" size={13} color="#33b3eaff" />
                  <Text style={styles.agencyTypeBadgeText}>Studio Chuyên Nghiệp</Text>
                </View>
                {bookingDetail.agencyCode ? (
                  <Text style={styles.agencyCodeText}>{bookingDetail.agencyCode}</Text>
                ) : null}
              </View>

              <View style={styles.agencyMainRow}>
                <Image
                  source={{
                    uri:
                      bookingDetail.agencyLogoUrl ||
                      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=300&q=80',
                  }}
                  style={styles.agencyLogoImage}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.agencyInfoCol}>
                  <Text style={styles.agencyName} numberOfLines={2}>
                    {bookingDetail.agencyName || 'Makeup & Beauty Studio'}
                  </Text>
                  <View style={styles.agencyHotlineRow}>
                    <Ionicons name="call-outline" size={14} color="#7E22CE" />
                    <Text style={styles.agencyHotlineText}>
                      Hotline: {bookingDetail.agencyPhone || 'Đang cập nhật'}
                    </Text>
                  </View>
                  {bookingDetail.agencyAddress ? (
                    <View style={styles.agencyAddressRow}>
                      <Ionicons name="location-outline" size={14} color="#64748B" />
                      <Text style={styles.agencyAddressText} numberOfLines={2}>
                        {bookingDetail.agencyAddress}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* NÚT LIÊN HỆ HOTLINE STUDIO */}
              <TouchableOpacity
                style={styles.callAgencyBtn}
                onPress={() => handleCallPhone(bookingDetail.agencyPhone, bookingDetail.agencyName || 'Studio')}
                activeOpacity={0.85}
              >
                <Ionicons name="call" size={15} color="#FFFFFF" />
                <Text style={styles.callAgencyBtnText}>Gọi Hotline Studio</Text>
              </TouchableOpacity>
            </View>

            {/* 2. THẺ ĐỘI NGŨ CHUYÊN VIÊN TRANG ĐIỂM (STUDIO STAFF TEAM) */}
            <View style={styles.card}>
              <View style={styles.teamHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Đội Ngũ Chuyên Viên Phục Vụ</Text>
                  <Text style={styles.teamSubtitle}>
                    {hasEmergencyCancelledStaff
                      ? 'Có chuyên viên đã báo bận đột xuất. Studio đang xử lý ca.'
                      : confirmedStaffList.length > 0
                      ? `${confirmedStaffList.length} chuyên viên đã tiếp nhận phục vụ ca làm`
                      : 'Studio đang điều phối và chờ chuyên viên tiếp nhận ca'}
                  </Text>
                </View>
                {hasEmergencyCancelledStaff ? (
                  <View style={[styles.teamCountBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                    <Ionicons name="alert-circle" size={13} color="#B45309" />
                    <Text style={[styles.teamCountText, { color: '#B45309' }]}>Thợ Báo Bận</Text>
                  </View>
                ) : confirmedStaffList.length > 0 ? (
                  <View style={styles.teamCountBadge}>
                    <Ionicons name="people" size={13} color="#2563EB" />
                    <Text style={styles.teamCountText}>{confirmedStaffList.length} Thợ Đã Nhận</Text>
                  </View>
                ) : (
                  <View style={[styles.teamCountBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                    <Ionicons name="hourglass-outline" size={12} color="#D97706" />
                    <Text style={[styles.teamCountText, { color: '#B45309' }]}>Chờ tiếp nhận</Text>
                  </View>
                )}
              </View>

              {/* Thông báo đề xuất Solo nếu có */}
              {bookingDetail.soloPendingConfirmation && (
                <View style={styles.soloNoticeBanner}>
                  <Ionicons name="star" size={16} color="#7C3AED" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.soloNoticeTitle}>Studio Đề Xuất Nhận Ca Solo</Text>
                    <Text style={styles.soloNoticeDesc}>
                      Do thợ chính {emergencyCancelledStaff?.staffName ? `(${emergencyCancelledStaff.staffName}) ` : ''}đã báo bận đột xuất, Studio đề xuất chuyên viên phụ tá tiếp nhận vai trò Thợ chính làm Solo và hưởng {bookingDetail.soloCommissionRate || 100}% hoa hồng.
                    </Text>
                  </View>
                </View>
              )}

              {allAssignedStaff.length > 0 ? (
                <View style={styles.staffListContainer}>
                  {[...allAssignedStaff]
                    .sort((a, b) => (a.role === 'PRIMARY_MUA' ? -1 : 1))
                    .map((staff, sIdx) => {
                      const isPrimary = staff.role === 'PRIMARY_MUA';
                      const isEmergency = staff.status === 'EMERGENCY_CANCELLED' || (Boolean(staff.cancellationReason) && staff.isConfirmedByStaff === false);
                      const isConfirmed = staff.status !== 'REPLACED' && staff.status !== 'EMERGENCY_CANCELLED' && staff.status !== 'DECLINED' && (staff.isConfirmedByStaff === true || Boolean(staff.confirmedAt) || staff.status === 'CONFIRMED');
                      const isDeclined = staff.status === 'DECLINED';

                      return (
                        <View
                          key={`staff-${staff.id || staff.staffId}-${sIdx}`}
                          style={[
                            styles.staffItemCard,
                            isPrimary && !isEmergency && styles.staffItemPrimaryCard,
                            isEmergency && { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
                          ]}
                        >
                          <View style={styles.staffHeaderRow}>
                            <View
                              style={[
                                styles.staffRolePill,
                                isPrimary ? styles.staffRolePrimaryPill : styles.staffRoleAssistantPill,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.staffRolePillText,
                                  isPrimary ? styles.staffRolePrimaryPillText : styles.staffRoleAssistantPillText,
                                ]}
                              >
                                {isPrimary ? 'THỢ CHÍNH' : 'THỢ PHỤ'}
                              </Text>
                            </View>

                            {isEmergency ? (
                              <View style={styles.staffEmergencyBadge}>
                                <Ionicons name="alert-circle" size={12} color="#B45309" />
                                <Text style={styles.staffEmergencyText}>Đã Báo Bận Đột Xuất</Text>
                              </View>
                            ) : isConfirmed ? (
                              <View style={styles.activeStaffDotRow}>
                                <View style={styles.activeStaffDot} />
                                <Text style={styles.activeStaffText}>Đã tiếp nhận ca</Text>
                              </View>
                            ) : isDeclined ? (
                              <View style={styles.staffDeclinedBadge}>
                                <Text style={styles.staffDeclinedText}>Đã từ chối</Text>
                              </View>
                            ) : (
                              <View style={styles.staffPendingBadge}>
                                <Ionicons name="hourglass-outline" size={11} color="#0284C7" />
                                <Text style={styles.staffPendingText}>Chờ tiếp nhận</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.staffBodyRow}>
                            <UserAvatar
                              uri={staff.staffAvatarUrl}
                              name={staff.staffName}
                              size={50}
                              style={{ marginRight: 12 }}
                            />
                            <View style={{ flex: 1, justifyContent: 'center' }}>
                              <Text style={styles.staffNameText} numberOfLines={1}>
                                {staff.staffName || 'Chuyên viên Make-up'}
                              </Text>
                              <Text style={styles.staffPhoneText}>
                                SĐT: {staff.staffPhone || 'Đang cập nhật'}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[
                                styles.callStaffMiniBtn,
                                isEmergency && { backgroundColor: '#94A3B8' },
                              ]}
                              onPress={() => handleCallPhone(staff.staffPhone, staff.staffName)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="call" size={13} color="#FFFFFF" />
                              <Text style={styles.callStaffMiniBtnText}>Gọi Thợ</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Dòng lý do báo bận nếu có */}
                          {isEmergency && staff.cancellationReason ? (
                            <View style={styles.emergencyReasonBox}>
                              <Text style={styles.emergencyReasonText}>
                                Lý do báo bận: "{staff.cancellationReason}"
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}

                  {/* Thông báo cập nhật ê-kíp điều phối */}
                  {hasEmergencyCancelledStaff ? (
                    <View style={{ marginTop: 6, padding: 10, backgroundColor: '#FFFBEB', borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="information-circle" size={16} color="#D97706" />
                      <Text style={{ fontSize: 12, color: '#92400E', flex: 1, lineHeight: 16 }}>
                        Studio đang sắp xếp chuyên viên thay thế hoặc đề xuất thợ phụ làm solo để đảm bảo lịch hẹn của bạn.
                      </Text>
                    </View>
                  ) : hasPendingStaff ? (
                    <View style={{ marginTop: 6, padding: 10, backgroundColor: '#F0F9FF', borderRadius: 8, borderWidth: 1, borderColor: '#BAE6FD', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="information-circle" size={16} color="#0284C7" />
                      <Text style={{ fontSize: 12, color: '#0369A1', flex: 1, lineHeight: 16 }}>
                        Studio đang điều phối chuyên viên tiếp nhận ca làm của bạn.
                      </Text>
                    </View>
                  ) : (allAssignedStaff.length > confirmedStaffList.length) ? (
                    <View style={{ marginTop: 6, padding: 10, backgroundColor: '#FFFBEB', borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="information-circle" size={16} color="#D97706" />
                      <Text style={{ fontSize: 12, color: '#92400E', flex: 1, lineHeight: 16 }}>
                        Studio đang điều phối thêm chuyên viên cho ca làm của bạn.
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                /* Chưa có chuyên viên nào được phân công */
                <View style={styles.pendingDispatchBox}>
                  <View style={styles.pendingDispatchIconWrap}>
                    <Ionicons name="hourglass-outline" size={24} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingDispatchTitle}>
                      {hasEmergencyCancelledStaff ? 'Studio Đang Sắp Xếp Chuyên Viên' : 'Studio Đang Điều Phối Thợ'}
                    </Text>
                    <Text style={styles.pendingDispatchDesc}>
                      {hasEmergencyCancelledStaff
                        ? 'Chuyên viên trước đó đã báo bận đột xuất. Quản lý Studio đang nhanh chóng phân công chuyên viên mới thay thế để phục vụ bạn chu đáo!'
                        : 'Studio đã lên lịch và đang gửi thông báo nhận ca tới chuyên viên. Thông tin chuyên viên sẽ hiển thị tại đây ngay sau khi thợ xác nhận tiếp nhận ca làm!'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </>
        ) : (
          /* GIAO DIỆN ĐẶT THỢ TỰ DO (FREELANCER MUA) */
          <>
            {isCancelled && !hasAssignedMua ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Chuyên Viên Trang Điểm</Text>
                <View style={styles.noMuaNoticeBox}>
                  <View style={styles.noMuaIconWrap}>
                    <Ionicons name="person-remove-outline" size={22} color="#D97706" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <Text style={[styles.noMuaTitle, { flexShrink: 1 }]}>Chưa có chuyên viên tiếp nhận</Text>
                      <View style={styles.noMuaBadge}>
                        <Text style={styles.noMuaBadgeText}>Chưa có thợ</Text>
                      </View>
                    </View>
                    <Text style={styles.noMuaDesc}>
                      Đơn hàng bị hủy do không tìm thấy chuyên viên trang điểm khả dụng trong khu vực để nhận ca.
                    </Text>
                  </View>
                </View>
              </View>
            ) : !hasAssignedMua || bookingDetail.status === 'REQUESTED' || bookingDetail.status === 'AGENCY_ASSIGNED' ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Chuyên Viên Trang Điểm</Text>
                <View style={styles.pendingDispatchBox}>
                  <View style={styles.pendingDispatchIconWrap}>
                    <Ionicons name="hourglass-outline" size={24} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingDispatchTitle}>Đang Chờ Chuyên Viên Tiếp Nhận</Text>
                    <Text style={styles.pendingDispatchDesc}>
                      Yêu cầu đặt lịch của bạn đang được gửi tới chuyên viên. Thông tin liên hệ chuyên viên sẽ hiển thị tại đây ngay khi thợ xác nhận tiếp nhận đơn!
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Chuyên Viên Trang Điểm</Text>
                <View style={styles.muaCardBody}>
                  <UserAvatar
                    uri={bookingDetail.muaAvatar}
                    name={bookingDetail.muaName}
                    size={64}
                    style={{ marginRight: 14 }}
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
            )}
          </>
        )}

        {/* THÔNG TIN GÓI DỊCH VỤ & CÁC BƯỚC */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gói Dịch Vụ Trang Điểm</Text>
          <View style={styles.packageHeaderBox}>
            <View style={styles.packageIconBadge}>
              <Ionicons name="brush-outline" size={18} color={BrandColors.primary} />
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

          <Text style={styles.stepsTitle}>Quy Trình & Hạng Mục Tiêu Chuẩn Trong Gói:</Text>
          <View style={styles.stepsList}>
            {(bookingDetail.componentItems && bookingDetail.componentItems.length > 0 ? bookingDetail.componentItems : stepsToRender).map((step, idx) => (
              <View key={`step-item-${idx}`} style={styles.stepRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.stepItemText}>{step}</Text>
              </View>
            ))}
          </View>

          {/* DỊCH VỤ & TIỆN ÍCH MUA THÊM (ADD-ON) - CHỈ HIỂN THỊ KHI KHÁCH ĐÃ CHỌN */}
          {bookingDetail.addonItems && bookingDetail.addonItems.length > 0 && (
            <View style={styles.addonWrap}>
              <View style={styles.addonHeaderWrap}>
                <Ionicons name="add-circle-outline" size={16} color="#0284C7" />
                <Text style={styles.addonTitle}>Dịch vụ & Tiện ích mua thêm (Add-on):</Text>
              </View>
              <View style={styles.addonList}>
                {bookingDetail.addonItems.map((item, idx) => (
                  <View key={`addon-item-${idx}`} style={styles.addonRow}>
                    <View style={styles.addonTagPill}>
                      <Text style={styles.addonTagPillText}>Add-on</Text>
                    </View>
                    <Text style={styles.addonItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
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
                  ? `${formatTimeVN(bookingDetail.startTime)} ${formatDateVN(bookingDetail.bookingDate)}`
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
                {formatCancellationReason(bookingDetail.cancellationReason) || 'Đơn đã hủy theo yêu cầu của khách hàng hoặc hết hạn xác nhận.'}
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
              (bookingDetail.cancellationReason && (
                bookingDetail.cancellationReason.toLowerCase().includes('bồi thường') ||
                bookingDetail.cancellationReason.toLowerCase().includes('từ chối') ||
                bookingDetail.cancellationReason.toLowerCase().includes('khiếu nại') ||
                bookingDetail.cancellationReason.toLowerCase().includes('vắng mặt')
              )) || !bookingDetail.completionPhotoUrl ? (
                <View style={[styles.settledBadgeBar, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
                  <Ionicons name="shield-half" size={24} color="#E11D48" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settledBadgeTitle, { color: '#9F1239' }]}>Khiếu Nại Đã Được Xử Lý • Bồi Thường Cho Thợ</Text>
                    <Text style={[styles.settledBadgeSubtitle, { color: '#BE123C' }]}>
                      {bookingDetail.cancellationReason || 'Ban Quản Trị đã từ chối yêu cầu hoàn cọc và chuyển tiền cọc bồi thường cho thợ make-up theo chính sách dịch vụ.'}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.settledBadgeBar}>
                  <Ionicons name="checkmark-done-circle" size={24} color="#059669" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settledBadgeTitle}>Đơn Hàng Đã Quyết Toán & Hoàn Tất</Text>
                    <Text style={styles.settledBadgeSubtitle}>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</Text>
                  </View>
                </View>
              )
            ) : isCashPaidConfirmed ? (
              <View style={[styles.finalPaymentCard, { backgroundColor: '#FFFFFF', borderColor: '#FDE68A', borderWidth: 1.5, padding: 18, borderRadius: 20 }]}>
                {/* Top badge & action */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#FDE68A' }}>
                    <Ionicons name="time" size={13} color="#D97706" />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400E' }}>CHỜ XÁC NHẬN TIỀN MẶT</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsCashPaidConfirmed(false)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="swap-horizontal" size={14} color="#64748B" />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>Đổi cách thanh toán</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#F59E0B' }}>
                    <Ionicons name="hourglass" size={24} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                      Đã Báo Thanh Toán Tiền Mặt
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Vui lòng trao tiền mặt trực tiếp cho chuyên viên
                    </Text>
                  </View>
                </View>

                {/* Hộp số tiền tiền mặt nổi bật */}
                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>Số tiền mặt cần thanh toán:</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#E11D48' }}>
                    {formatPrice(remainingAmount)}
                  </Text>
                </View>

                {/* Hướng dẫn thợ bấm xác nhận */}
                <View style={{ backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FEF08A', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={16} color="#D97706" />
                  <Text style={{ fontSize: 12, color: '#92400E', flex: 1, lineHeight: 16 }}>
                    Chuyên viên sẽ bấm <Text style={{ fontWeight: '800' }}>"Đã Nhận Đủ"</Text> trên màn hình máy họ để hoàn tất đơn và xuất biên lai.
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
              style={[styles.secondaryCancelBtn, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}
              onPress={() => router.push(`/booking/history-detail/${bookingId}?openReview=true` as any)}
              activeOpacity={0.85}
            >
              <Text style={[styles.secondaryCancelBtnText, { color: '#059669', fontWeight: '700' }]}>
                Xem Hóa Đơn & Chi Tiết Lịch Sử
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* NÚT HỦY ĐƠN: Cho phép khi PENDING_DEPOSIT hoặc ACCEPTED (Đơn đặt trước có thể hủy trước 2 tiếng theo quy định) */}
        {(bookingDetail.status === 'PENDING_DEPOSIT' ||
          (bookingDetail.status === 'ACCEPTED' && bookingDetail.bookingType === 'SCHEDULED') ||
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

      {/* MODAL HỦY / KHIẾU NẠI ĐƠN */}
      <CancelBookingModal
        visible={isCancelModalVisible}
        booking={bookingDetail}
        onClose={() => setIsCancelModalVisible(false)}
        onConfirmCancel={handleConfirmCancel}
        isCancelling={isCancelling}
      />

      {/* MODAL XEM CHI TIẾT HỒ SƠ KHIẾU NẠI & MINH CHỨNG (TÍCH HỢP INLINE FORM ĐỐI CHẤT) */}
      <DisputeDossierModal
        visible={isDisputeDossierOpen}
        onClose={() => {
          setIsDisputeDossierOpen(false);
          setIsDisputeDossierAutoOpen(false);
        }}
        bookingId={bookingId}
        cancellationReason={bookingDetail?.cancellationReason}
        emergencyReason={bookingDetail?.emergencyReason}
        emergencyProofUrl={bookingDetail?.emergencyProofUrl}
        reportedAt={bookingDetail?.emergencyReportedAt}
        viewAsRole="CUSTOMER"
        bookingCode={bookingDetail?.bookingCode}
        depositAmount={bookingDetail?.depositAmount}
        totalAmount={bookingDetail?.totalAmount}
        bookingStatus={bookingDetail?.status}
        disputeOrigin={bookingDetail?.disputeOrigin}
        counterpartyName={isAgencyBooking ? (bookingDetail?.agencyName || 'Studio') : bookingDetail?.muaName}
        isAgencyBooking={isAgencyBooking}
        autoOpenForm={isDisputeDossierAutoOpen}
        onDisputeSuccess={() => loadBookingData(true)}
      />

      {/* MODAL LEO THANG KHIẾU NẠI LÊN ADMIN SÀN (MÔ HÌNH C) */}
      <Modal
        visible={isEscalateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEscalateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
        >
          <View style={{ width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
              Khiếu Nại Lên Admin Sàn
            </Text>
            <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 12, lineHeight: 17 }}>
              Ban Quản Trị Sàn sẽ tiếp nhận hồ sơ, đối chiếu bằng chứng hai bên để phân xử tối hậu về tiền cọc.
            </Text>

            <TextInput
              style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 13, minHeight: 70, textAlignVertical: 'top', color: '#111827', backgroundColor: '#F9FAFB' }}
              placeholder="Nhập lý do chuyển khiếu nại lên Sàn (tùy chọn)..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              value={escalateReason}
              onChangeText={setEscalateReason}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' }}
                onPress={() => {
                  setIsEscalateModalVisible(false);
                  setEscalateReason('');
                }}
                disabled={isSubmittingEscalate}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#4B5563' }}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#DC2626', alignItems: 'center' }}
                onPress={handleConfirmEscalateToAdmin}
                disabled={isSubmittingEscalate}
              >
                {isSubmittingEscalate ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Gửi Lên Sàn</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL PHÓNG TO ẢNH NGHIỆM THU (CHẠM NGOÀI HOẶC VUỐT XUỐNG ĐỂ TẮT) */}
      <ImageViewerModal
        visible={isPhotoModalVisible}
        images={bookingDetail?.completionPhotoUrl ? [bookingDetail.completionPhotoUrl] : []}
        title="Ảnh nghiệm thu ca làm"
        onClose={() => setIsPhotoModalVisible(false)}
      />
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
  noMuaNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    gap: 12,
  },
  noMuaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMuaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  noMuaBadge: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  noMuaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  noMuaDesc: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
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
  addonWrap: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  addonHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  addonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  addonList: {
    gap: 6,
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addonTagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addonTagPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  addonItemText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
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
  photoModalFullscreen: {
    flex: 1,
    backgroundColor: '#000000',
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
    width: '100%',
    height: '100%',
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
  scheduledHeroCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  scheduledHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduledHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7DD3FC',
  },
  scheduledHeroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  scheduledHeroCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  scheduledHeroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  scheduledHeroTimeCol: {
    flex: 1,
  },
  scheduledHeroTimeLabel: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scheduledHeroTimeValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0C4A6E',
    marginTop: 2,
  },
  scheduledHeroDateValue: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
    marginTop: 1,
  },
  scheduledHeroDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  scheduledHeroServiceCol: {
    flex: 1.2,
  },
  scheduledHeroServiceLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scheduledHeroServiceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  scheduledDurationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  scheduledDurationPillText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  customerDisputeBannerCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: 16,
    gap: 12,
  },
  customerDisputeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerDisputeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  customerDisputeTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 0.2,
  },
  customerDisputeSubtitle: {
    fontSize: 12,
    color: '#C2410C',
    marginTop: 2,
    lineHeight: 17,
  },
  customerDisputeReasonBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  customerDisputeReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 2,
  },
  customerDisputeReasonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  customerDisputeProofBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  customerDisputeProofLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 8,
  },
  customerDisputeProofImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  viewDisputeDossierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EA580C',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  viewDisputeDossierBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  agencyHeroBadge: {
    backgroundColor: '#F3E8FF',
  },
  agencyHeroBadgeText: {
    color: '#248ddcff',
  },
  agencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#F3E8FF',
    shadowColor: '#2092e8ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  agencyBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  agencyTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  agencyTypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2e85e2ff',
    letterSpacing: 0.3,
  },
  agencyCodeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  agencyMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  agencyLogoImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  agencyInfoCol: {
    flex: 1,
    gap: 4,
  },
  agencyName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
  },
  agencyHotlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  agencyHotlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2298ceff',
  },
  agencyAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  agencyAddressText: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    flex: 1,
  },
  callAgencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#338feaff',
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 14,
    shadowColor: '#33cceaff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  callAgencyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  teamSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  teamCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  teamCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  staffListContainer: {
    gap: 10,
  },
  staffItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  staffItemPrimaryCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  staffHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  staffRolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  staffRolePrimaryPill: {
    backgroundColor: '#FEF3C7',
  },
  staffRoleAssistantPill: {
    backgroundColor: '#DBEAFE',
  },
  staffRolePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  staffRolePrimaryPillText: {
    color: '#92400E',
  },
  staffRoleAssistantPillText: {
    color: '#1E40AF',
  },
  activeStaffDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeStaffDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeStaffText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#059669',
  },
  staffBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  staffPhoneText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  callStaffMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  callStaffMiniBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pendingDispatchBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    gap: 12,
  },
  pendingDispatchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingDispatchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  pendingDispatchDesc: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  staffEmergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  staffEmergencyText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
  },
  staffPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  staffPendingText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  staffDeclinedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  staffDeclinedText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  emergencyReasonBox: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  emergencyReasonText: {
    fontSize: 11,
    color: '#92400E',
    fontStyle: 'italic',
  },
  soloNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  soloNoticeTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#6D28D9',
    marginBottom: 2,
  },
  soloNoticeDesc: {
    fontSize: 11.5,
    color: '#581C87',
    lineHeight: 16,
  },
});
