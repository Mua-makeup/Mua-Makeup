import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import { bookingService } from '@/services/booking.service';
import { telemetryService, LiveTrackingRes } from '@/services/telemetry.service';
import { websocketService } from '@/services/websocket.service';
import { BookingProgressStepper } from '@/components/booking/BookingProgressStepper';
import { LiveTrackingMap } from '@/components/booking/LiveTrackingMap';
import { computeHybridEta } from '@/utils/date';

const CUSTOMER_CANCEL_REASONS = [
  'Bận việc đột xuất / Không thể tiếp tục',
  'Thợ di chuyển quá chậm / Không liên lạc được',
  'Đặt nhầm địa chỉ hoặc thời gian make-up',
  'Thay đổi ý định / muốn đặt lại sau',
  'Lý do khác',
];

const REVIEW_TAGS = [
  'Đúng giờ ⏱️',
  'Make cực xinh 💖',
  'Rất nhiệt tình 🥰',
  'Tay nghề cao 🎨',
  'Đồ nghề sạch sẽ ✨',
  'Thân thiện chu đáo 🌸',
];

export default function BookingLiveTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const [isLoading, setIsLoading] = useState(true);
  const [bookingDetail, setBookingDetail] = useState<any>(null);
  const [status, setStatus] = useState<string>('ON_THE_WAY');

  const [customerCoords, setCustomerCoords] = useState<{ latitude: number; longitude: number; address?: string }>({
    latitude: 21.0285,
    longitude: 105.8542,
    address: 'Địa chỉ của bạn',
  });

  const [muaCoords, setMuaCoords] = useState<{ latitude: number; longitude: number; heading?: number; speed?: number }>({
    latitude: 21.0345,
    longitude: 105.8512,
    heading: 140,
    speed: 28,
  });

  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [distanceRemainingMeters, setDistanceRemainingMeters] = useState<number | null>(null);
  const [streamMode, setStreamMode] = useState<'APPROACHING' | 'MOVING' | 'STOPPED' | undefined>(undefined);

  // Goong base route state cho Hybrid ETA calculation
  const [goongBaseDuration, setGoongBaseDuration] = useState<number | null>(null);
  const [goongBaseDistance, setGoongBaseDistance] = useState<number | null>(null);

  // Status Transition Pop-up Modal State
  const [statusPopup, setStatusPopup] = useState<{
    visible: boolean;
    type: 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED';
    title: string;
    message: string;
  } | null>(null);

  // Live Stopwatch for IN_PROGRESS state
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const sessionTimerRef = useRef<any>(null);

  // Review State for COMPLETED state
  const [ratingStars, setRatingStars] = useState(5);
  const [selectedReviewTags, setSelectedReviewTags] = useState<string[]>(['Đúng giờ ⏱️', 'Make cực xinh 💖']);
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewSubmitted, setIsReviewSubmitted] = useState(false);

  // Cancellation Modal State
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [selectedReasonChip, setSelectedReasonChip] = useState<string>('Bận việc đột xuất / Không thể tiếp tục');
  const [customReason, setCustomReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Live Timer effect when IN_PROGRESS
  useEffect(() => {
    if (status === 'IN_PROGRESS') {
      sessionTimerRef.current = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    }
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [status]);

  useEffect(() => {
    if (!bookingId) return;

    let isMounted = true;

    const loadInitialData = async () => {
      try {
        setIsLoading(true);

        // 1. Tải thông tin đơn hàng
        const detailRes = await bookingService.getBookingStatus(bookingId).catch(() => null);
        if (detailRes && isMounted) {
          setBookingDetail(detailRes);

          // Nếu thợ đã nhận đơn (ACCEPTED) nhưng khách chưa thanh toán cọc 30%:
          // Tự động chuyển hướng khách sang màn hình kiểm tra thợ & thanh toán cọc
          if (detailRes.status === 'ACCEPTED' && !detailRes.isDepositPaid) {
            router.replace(`/booking/instant-matched/${bookingId}` as any);
            return;
          }

          if (detailRes.status) {
            setStatus(detailRes.status);
            if (detailRes.status === 'CANCELLED') {
              Alert.alert(
                'Đơn Hàng Đã Bị Hủy',
                detailRes.cancellationReason || 'Đơn đặt lịch này đã bị hủy.',
                [
                  { text: 'Tìm Thợ Khác', onPress: () => router.replace('/') },
                  { text: 'Về Trang Chủ', onPress: () => router.replace('/') },
                ]
              );
            }
          }
          if (detailRes.destinationLatitude && detailRes.destinationLongitude) {
            setCustomerCoords({
              latitude: Number(detailRes.destinationLatitude),
              longitude: Number(detailRes.destinationLongitude),
              address: detailRes.destinationAddress || 'Vị trí của bạn',
            });
          }
        }

        // 2. Tải vị trí Live ban đầu của Thợ
        const trackingRes: LiveTrackingRes = await telemetryService.getLiveTripTracking(bookingId).catch(() => null as any);
        if (trackingRes && isMounted) {
          const mLat = trackingRes.currentLat;
          const mLng = trackingRes.currentLng;
          if (mLat && mLng) {
            setMuaCoords({
              latitude: mLat,
              longitude: mLng,
              heading: trackingRes.heading || 0,
              speed: trackingRes.speed || 0,
            });
          }
          let cLat = customerCoords.latitude;
          let cLng = customerCoords.longitude;
          if (trackingRes.destinationLat && trackingRes.destinationLng) {
            cLat = Number(trackingRes.destinationLat);
            cLng = Number(trackingRes.destinationLng);
            setCustomerCoords((prev) => ({
              ...prev,
              latitude: cLat,
              longitude: cLng,
            }));
          }

          // Tính toán cự ly và thời gian đến tức thời (Instant Calculation)
          let dist = trackingRes.distanceRemainingMeters;
          if ((dist === undefined || dist === null || dist === 0) && mLat && mLng && cLat && cLng) {
            const R = 6371e3;
            const phi1 = (mLat * Math.PI) / 180;
            const phi2 = (cLat * Math.PI) / 180;
            const deltaPhi = ((cLat - mLat) * Math.PI) / 180;
            const deltaLambda = ((cLng - mLng) * Math.PI) / 180;
            const a =
              Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            dist = Math.round(R * c);
          }

          if (dist !== undefined && dist !== null && dist > 0) {
            setDistanceRemainingMeters(dist);
            const calculatedEta = dist <= 25 ? 0 : Math.max(1, Math.ceil(dist / 1000.0 / 25 * 60));
            setEtaMinutes(trackingRes.etaMinutes !== undefined && trackingRes.etaMinutes !== null ? trackingRes.etaMinutes : calculatedEta);
            const calculatedMode = dist < 300 ? 'APPROACHING' : ((trackingRes.speed || 0) < 2.5 ? 'STOPPED' : 'MOVING');
            setStreamMode(trackingRes.streamMode || calculatedMode);
          }
        }
      } catch (err) {
        console.warn('Lỗi tải dữ liệu tracking ban đầu:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadInitialData();

    // 3. Đăng ký luồng stream GPS và Status qua WebSocket STOMP
    const streamTopic = `/topic/gps-stream/${bookingId}`;
    const statusTopic = `/topic/booking-status/${bookingId}`;

    const setupRealtime = async () => {
      try {
        await websocketService.connect();

        // Stream tọa độ di chuyển
        websocketService.subscribe(streamTopic, (msg: any) => {
          if (msg && isMounted) {
            if (msg.currentLat && msg.currentLng) {
              setMuaCoords({
                latitude: Number(msg.currentLat),
                longitude: Number(msg.currentLng),
                heading: Number(msg.heading || 0),
                speed: Number(msg.speed || 0),
              });
            }
            if (msg.destinationLat && msg.destinationLng) {
              setCustomerCoords((prev) => ({
                ...prev,
                latitude: Number(msg.destinationLat),
                longitude: Number(msg.destinationLng),
              }));
            }
            if (msg.streamMode) setStreamMode(msg.streamMode);

            // Hybrid ETA: ưu tiên Goong base route ratio, fallback payload.etaMinutes từ Backend
            const newDist = msg.distanceRemainingMeters !== undefined
              ? Number(msg.distanceRemainingMeters)
              : null;
            if (newDist !== null) setDistanceRemainingMeters(newDist);

            const backendEta = msg.etaMinutes !== undefined ? Number(msg.etaMinutes) : null;
            setEtaMinutes((prev) => {
              const hybrid = computeHybridEta(goongBaseDuration, goongBaseDistance, newDist, backendEta);
              return hybrid !== null ? hybrid : backendEta ?? prev;
            });
          }
        });

        // Trạng thái đơn hàng với Pop-up thông báo tức thời cho khách hàng
        websocketService.subscribe(statusTopic, (statusMsg: any) => {
          const nextStatus = statusMsg?.currentStatus || statusMsg?.status;
          if (nextStatus && isMounted) {
            setStatus(nextStatus);

            // Tải lại chi tiết đơn hàng để cập nhật ảnh nghiệm thu nếu có
            bookingService.getBookingStatus(bookingId).then((refreshed) => {
              if (refreshed && isMounted) setBookingDetail(refreshed);
            }).catch(() => {});

            if (nextStatus === 'CANCELLED') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              const reason = statusMsg?.message || statusMsg?.cancellationReason || 'Chuyên viên make-up hoặc hệ thống đã hủy đơn hẹn này.';
              Alert.alert(
                'Đơn Hàng Đã Bị Hủy',
                reason,
                [
                  { text: 'Tìm Thợ Khác', onPress: () => router.replace('/') },
                  { text: 'Về Trang Chủ', onPress: () => router.replace('/') },
                ],
                { cancelable: false }
              );
            } else if (nextStatus === 'ARRIVED') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setStatusPopup({
                visible: true,
                type: 'ARRIVED',
                title: '📍 Chuyên Viên Đã Đến Nơi!',
                message: 'Chuyên viên make-up đã có mặt tại điểm hẹn của bạn. Vui lòng chuẩn bị đón thợ nhé!',
              });
            } else if (nextStatus === 'IN_PROGRESS') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setStatusPopup({
                visible: true,
                type: 'IN_PROGRESS',
                title: '💄 Bắt Đầu Buổi Trang Điểm!',
                message: 'Chuyên viên đã chính thức bắt đầu ca làm đẹp cho bạn. Hãy thư giãn và tận hưởng dịch vụ!',
              });
            } else if (nextStatus === 'COMPLETED' || nextStatus === 'PAID_OUT') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setStatusPopup({
                visible: true,
                type: 'COMPLETED',
                title: '🎉 Buổi Make-up Đã Hoàn Tất!',
                message: 'Chúc mừng bạn! Buổi make-up đã hoàn thành xuất sắc. Vui lòng ngắm nhìn diện mạo mới và đánh giá dịch vụ nhé!',
              });
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        });
      } catch (e) {
        console.warn('Lỗi kết nối STOMP tracking:', e);
      }
    };

    setupRealtime();

    return () => {
      isMounted = false;
      websocketService.unsubscribe(streamTopic);
      websocketService.unsubscribe(statusTopic);
    };
  }, [bookingId]);

  const handleCallMua = () => {
    const phone = bookingDetail?.muaPhone || '0988123456';
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Không Thể Gọi', 'Vui lòng kiểm tra lại quyền gọi điện trên thiết bị.');
    });
  };

  const handleSupportSos = () => {
    Alert.alert(
      'Hỗ Trợ Khẩn Cấp 24/7',
      'Đường dây nóng hỗ trợ khách hàng: 1900 8888. Bạn có muốn kết nối ngay?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Gọi Hotline', onPress: () => Linking.openURL('tel:19008888') },
      ]
    );
  };

  const handleCustomerCancelTrip = () => {
    setIsCancelModalVisible(true);
  };

  const handleConfirmCancelTrip = async () => {
    try {
      setIsCancelling(true);
      const chosenReason = selectedReasonChip || CUSTOMER_CANCEL_REASONS[0];
      const finalReason = customReason.trim()
        ? `${chosenReason}: ${customReason.trim()}`
        : chosenReason;
      await bookingService.cancelBooking(bookingId, finalReason);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setIsCancelModalVisible(false);
      Alert.alert('Đã Hủy Đơn', 'Đơn đặt lịch đã được hủy thành công.', [
        { text: 'Về Trang Chủ', onPress: () => router.replace('/') },
      ]);
    } catch (e: any) {
      Alert.alert('Không Thể Hủy', e.response?.data?.message || e.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const toggleReviewTag = (tag: string) => {
    if (selectedReviewTags.includes(tag)) {
      setSelectedReviewTags(selectedReviewTags.filter((t) => t !== tag));
    } else {
      setSelectedReviewTags([...selectedReviewTags, tag]);
    }
  };

  const handleSubmitReview = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsReviewSubmitted(true);
    Alert.alert(
      'Cảm Ơn Đánh Giá Của Bạn! 💖',
      'Phản hồi của bạn đã được ghi nhận và gửi đến chuyên viên để không ngừng nâng cao chất lượng dịch vụ.',
      [{ text: 'Về Trang Chủ', onPress: () => router.replace('/') }]
    );
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Đang kết nối tín hiệu vệ tinh...</Text>
      </SafeAreaView>
    );
  }

  const muaName = bookingDetail?.muaName || 'Chuyên viên Make-up';
  const muaAvatar =
    bookingDetail?.muaAvatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

  const isMovingStage = status === 'ACCEPTED' || status === 'ON_THE_WAY';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* TOP BAR HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>
            {status === 'ARRIVED'
              ? 'Chuyên Viên Đã Đến Nơi'
              : status === 'IN_PROGRESS'
              ? 'Phiên Trang Điểm Đang Diễn Ra'
              : status === 'COMPLETED' || status === 'PAID_OUT'
              ? 'Ca Trang Điểm Hoàn Tất'
              : 'Theo Dõi Xe Thợ Di Chuyển'}
          </Text>
          <Text style={styles.headerCode}>
            Mã: {bookingDetail?.bookingCode || `BK-${bookingId}`}
          </Text>
        </View>

        <TouchableOpacity style={styles.sosBtn} onPress={handleSupportSos} activeOpacity={0.7}>
          <Ionicons name="shield" size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>

      {/* STEPPER TIẾN TRÌNH DỊCH VỤ REALTIME */}
      <View style={styles.stepperWrapper}>
        <BookingProgressStepper
          bookingId={bookingId}
          currentStatus={status}
          onStatusChange={(newStatus) => setStatus(newStatus)}
        />
      </View>

      {/* ========================================================================= */}
      {/* 1. MÀN HÌNH BẢN ĐỒ MAP: CHỈ HIỂN THỊ KHI THỢ ĐANG DI CHUYỂN (ON_THE_WAY)  */}
      {/* ========================================================================= */}
      {isMovingStage && (
        <>
          <View style={styles.mapContainer}>
            <LiveTrackingMap
              customerCoords={customerCoords}
              muaCoords={muaCoords}
              etaMinutes={etaMinutes ?? undefined}
              distanceRemainingMeters={distanceRemainingMeters ?? undefined}
              muaName={muaName}
              streamMode={streamMode}
            />
          </View>

          {/* BOTTOM MUA PROFILE DRAWER */}
          <View style={styles.bottomDrawer}>
            <View style={styles.drawerHandle} />

            <View style={styles.muaProfileRow}>
              <Image source={{ uri: muaAvatar }} style={styles.muaAvatar} />
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.muaNameText}>{muaName}</Text>
                  <View style={styles.proBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" />
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                </View>
                <Text style={styles.muaPhoneText}>
                  {bookingDetail?.muaPhone ? `SĐT: ${bookingDetail.muaPhone}` : 'Đã xác minh danh tính'}
                </Text>
                <Text style={styles.destinationSnippet} numberOfLines={1}>
                  Điểm đến: {customerCoords.address}
                </Text>
              </View>
            </View>

            {/* ACTION BUTTONS */}
            <View style={styles.actionBtnRow}>
              <TouchableOpacity style={styles.callBtn} onPress={handleCallMua} activeOpacity={0.85}>
                <Ionicons name="call" size={16} color="#FFFFFF" />
                <Text style={styles.callBtnText} numberOfLines={1}>Gọi Cho Thợ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelTripBtn}
                onPress={handleCustomerCancelTrip}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={16} color="#E11D48" />
                <Text style={styles.cancelTripBtnText} numberOfLines={1}>Hủy Đơn</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => router.push(`/booking/detail/${bookingId}` as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={16} color="#334155" />
                <Text style={styles.detailBtnText} numberOfLines={1}>Chi Tiết</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. MÀN HÌNH GIAO DIỆN KHI THỢ ĐÃ ĐẾN NƠI (ARRIVED) - KHÔNG HIỂN THỊ MAP   */}
      {/* ========================================================================= */}
      {status === 'ARRIVED' && (
        <ScrollView style={styles.stageScroll} contentContainerStyle={styles.stageScrollContent}>
          {/* BANNER THÔNG BÁO ĐÃ ĐẾN */}
          <View style={styles.arrivedBannerCard}>
            <View style={styles.arrivedIconPulse}>
              <Ionicons name="location" size={32} color="#059669" />
            </View>
            <Text style={styles.arrivedBannerTitle}>Chuyên Viên Đã Có Mặt Tại Điểm Hẹn!</Text>
            <Text style={styles.arrivedBannerSub}>
              Thợ make-up đang chờ bạn tại sảnh / trước cửa. Vui lòng mở cửa đón chuyên viên để bắt đầu ca làm đẹp nhé.
            </Text>
          </View>

          {/* THẺ THÔNG TIN CHUYÊN VIÊN & LIÊN HỆ */}
          <View style={styles.cardBox}>
            <Text style={styles.cardHeaderTitle}>Thông Tin Chuyên Viên</Text>
            <View style={styles.muaDetailRow}>
              <Image source={{ uri: muaAvatar }} style={styles.muaAvatarLarge} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.muaNameLarge}>{muaName}</Text>
                  <View style={styles.proBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" />
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                </View>
                <Text style={styles.muaPhoneLarge}>{bookingDetail?.muaPhone || '0123456781'}</Text>
                <Text style={styles.destinationTextMini} numberOfLines={2}>
                  Địa chỉ: {customerCoords.address}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.callBigBtn} onPress={handleCallMua} activeOpacity={0.85}>
              <Ionicons name="call" size={20} color="#FFFFFF" />
              <Text style={styles.callBigBtnText}>Gọi Điện Cho Thợ Ngay</Text>
            </TouchableOpacity>
          </View>

          {/* LƯU Ý & HƯỚNG DẪN CHUẨN BỊ ĐÓN THỢ */}
          <View style={styles.cardBox}>
            <Text style={styles.cardHeaderTitle}>Mẹo Chuẩn Bị Không Gian Make-up Hoàn Hảo</Text>
            
            <View style={styles.tipItem}>
              <View style={styles.tipBadge}>
                <Ionicons name="sunny" size={16} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>Ánh sáng tự nhiên & Gương</Text>
                <Text style={styles.tipDesc}>Chuẩn bị bàn ghế ngồi thoải mái gần cửa sổ hoặc khu vực có ánh sáng trắng tốt.</Text>
              </View>
            </View>

            <View style={styles.tipItem}>
              <View style={styles.tipBadge}>
                <Ionicons name="flash" size={16} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>Ổ cắm điện sẵn sàng</Text>
                <Text style={styles.tipDesc}>Chuẩn bị ổ cắm gần bàn để chuyên viên sử dụng máy uốn, dập phồng hoặc sấy tóc.</Text>
              </View>
            </View>

            <View style={styles.tipItem}>
              <View style={styles.tipBadge}>
                <Ionicons name="sparkles" size={16} color="#E11D48" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>Làm sạch da mặt cơ bản</Text>
                <Text style={styles.tipDesc}>Rửa mặt sạch và lau khô sẵn sàng trước khi chuyên viên thực hiện các bước dưỡng ẩm.</Text>
              </View>
            </View>
          </View>

          {/* NÚT TÔI ĐÃ GẶP THỢ */}
          <TouchableOpacity
            style={styles.meetMuaBtn}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Đã Đón Chuyên Viên', 'Chúc bạn có một buổi trang điểm thật xinh đẹp và tự tin!');
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="hand-right" size={20} color="#FFFFFF" />
            <Text style={styles.meetMuaBtnText}>Tôi Đã Gặp Chuyên Viên</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 3. MÀN HÌNH GIAO DIỆN KHI ĐANG TRANG ĐIỂM (IN_PROGRESS) - KHÔNG HIỂN THỊ MAP */}
      {/* ========================================================================= */}
      {status === 'IN_PROGRESS' && (
        <ScrollView style={styles.stageScroll} contentContainerStyle={styles.stageScrollContent}>
          {/* THẺ ĐỒNG HỒ LIVE ĐANG MAKE-UP */}
          <View style={styles.liveTimerCard}>
            <View style={styles.timerBadgeHeader}>
              <View style={styles.liveRedDot} />
              <Text style={styles.timerBadgeHeaderText}>ĐANG THỰC HIỆN CA LÀM ĐẸP</Text>
            </View>

            <View style={styles.stopwatchDisplayRow}>
              <Ionicons name="time" size={32} color="#E11D48" />
              <Text style={styles.stopwatchBigText}>{formatSeconds(sessionSeconds)}</Text>
            </View>
            <Text style={styles.stopwatchSubText}>
              Thời gian thực hiện buổi trang điểm tính từ lúc bắt đầu
            </Text>
          </View>

          {/* THẺ DỊCH VỤ ĐANG LÀM */}
          <View style={styles.cardBox}>
            <Text style={styles.cardHeaderTitle}>Dịch Vụ Đang Thực Hiện</Text>
            <Text style={styles.serviceNameHighlight}>{bookingDetail?.packageName || 'Gói Trang Điểm Cao Cấp'}</Text>
            <View style={styles.serviceMetaRow}>
              <Text style={styles.serviceMetaLabel}>Chuyên viên:</Text>
              <Text style={styles.serviceMetaVal}>{muaName}</Text>
            </View>
            <View style={styles.serviceMetaRow}>
              <Text style={styles.serviceMetaLabel}>Tổng chi phí gói:</Text>
              <Text style={styles.serviceMetaPrice}>{formatVnd(bookingDetail?.totalAmount || 0)}</Text>
            </View>
            <View style={styles.serviceMetaRow}>
              <Text style={styles.serviceMetaLabel}>Địa điểm:</Text>
              <Text style={styles.serviceMetaVal} numberOfLines={1}>{customerCoords.address}</Text>
            </View>
          </View>

          {/* CẨM NANG THƯ GIÃN KHI MAKE-UP */}
          <View style={styles.cardBox}>
            <Text style={styles.cardHeaderTitle}>Cẩm Nang Thư Giãn Trong Lúc Make-up</Text>
            
            <View style={styles.tipItem}>
              <View style={styles.tipBadge}>
                <Ionicons name="happy" size={16} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>Thả lỏng cơ mặt</Text>
                <Text style={styles.tipDesc}>Hạn chế cử động mạnh hoặc cười lớn khi chuyên viên đang tán nền, kẻ mắt hay viền môi.</Text>
              </View>
            </View>

            <View style={styles.tipItem}>
              <View style={styles.tipBadge}>
                <Ionicons name="eye" size={16} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>Nhắm mắt thư giãn</Text>
                <Text style={styles.tipDesc}>Nhắm mắt nhẹ nhàng khi gắn mi giả và chuốt mascara để tránh chớp mắt kích ứng.</Text>
              </View>
            </View>

            <View style={styles.tipItem}>
              <View style={styles.tipBadge}>
                <Ionicons name="chatbubbles" size={16} color="#E11D48" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>Thoải mái góp ý tone make</Text>
                <Text style={styles.tipDesc}>Hãy chia sẻ ngay với chuyên viên nếu bạn muốn tăng độ bắt sáng, hạ màu son hoặc đổi kiểu tóc.</Text>
              </View>
            </View>
          </View>

          {/* NÚT HOTLINE SOS */}
          <TouchableOpacity style={styles.supportOutlineBtn} onPress={handleSupportSos} activeOpacity={0.8}>
            <Ionicons name="shield-checkmark" size={18} color="#DC2626" />
            <Text style={styles.supportOutlineBtnText}>Hotline Khẩn Cấp Hỗ Trợ 24/7</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 4. MÀN HÌNH GIAO DIỆN HOÀN TẤT & ĐÁNH GIÁ (COMPLETED) - KHÔNG HIỂN THỊ MAP  */}
      {/* ========================================================================= */}
      {(status === 'COMPLETED' || status === 'PAID_OUT') && (
        <ScrollView style={styles.stageScroll} contentContainerStyle={styles.stageScrollContent}>
          {/* BANNER CHÚC MỪNG HOÀN THÀNH */}
          <View style={styles.completedCelebrationCard}>
            <View style={styles.celebrationIconBox}>
              <Ionicons name="sparkles" size={32} color="#F59E0B" />
            </View>
            <Text style={styles.celebrationTitle}>Buổi Trang Điểm Đã Hoàn Tất!</Text>
            <Text style={styles.celebrationSub}>
              Bạn đã có một diện mạo rạng rỡ và tự tin nhất hôm nay. Cảm ơn bạn đã lựa chọn nền tảng!
            </Text>
          </View>

          {/* ẢNH NGHIỆM THU TỪ CHUYÊN VIÊN (NẾU CÓ) */}
          {bookingDetail?.completionPhotoUrl && (
            <View style={styles.cardBox}>
              <View style={styles.proofHeaderRow}>
                <Ionicons name="camera" size={18} color="#E11D48" />
                <Text style={styles.cardHeaderTitle}>Hình Ảnh Nghiệm Thu Dịch Vụ</Text>
              </View>
              <Image source={{ uri: bookingDetail.completionPhotoUrl }} style={styles.proofImage} resizeMode="cover" />
              <Text style={styles.proofNote}>Ảnh chụp nghiệm thu hoàn thành do chuyên viên cung cấp</Text>
            </View>
          )}

          {/* TÓM TẮT THANH TOÁN */}
          <View style={styles.cardBox}>
            <Text style={styles.cardHeaderTitle}>Chi Tiết Thanh Toán</Text>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Gói dịch vụ:</Text>
              <Text style={styles.billVal}>{formatVnd(bookingDetail?.serviceSubtotal || bookingDetail?.totalAmount || 0)}</Text>
            </View>
            {(bookingDetail?.surchargeFee || 0) > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Phụ phí ca khẩn cấp:</Text>
                <Text style={styles.billVal}>+{formatVnd(bookingDetail.surchargeFee)}</Text>
              </View>
            )}
            <View style={[styles.billRow, styles.billRowBold]}>
              <Text style={styles.billLabelBold}>Tổng thanh toán:</Text>
              <Text style={styles.billValTotal}>{formatVnd(bookingDetail?.totalAmount || 0)}</Text>
            </View>
            <View style={styles.paidBadgeBox}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.paidBadgeText}>Đã quyết toán an toàn qua Escrow ví</Text>
            </View>
          </View>

          {/* ĐÁNH GIÁ 5 SAO CHO CHUYÊN VIÊN */}
          <View style={styles.cardBox}>
            <Text style={styles.cardHeaderTitle}>Đánh Giá Chuyên Viên Make-up</Text>
            <Text style={styles.ratingSubtitle}>Chuyên viên {muaName} phục vụ bạn thế nào?</Text>

            {/* Interactive 5 Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRatingStars(star);
                  }}
                  activeOpacity={0.7}
                  style={styles.starTouch}
                >
                  <Ionicons
                    name={star <= ratingStars ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= ratingStars ? '#F59E0B' : '#CBD5E1'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Tags đánh giá nhanh */}
            <View style={styles.tagsContainer}>
              {REVIEW_TAGS.map((tag) => {
                const isSelected = selectedReviewTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.reviewTagChip, isSelected && styles.reviewTagChipSelected]}
                    onPress={() => toggleReviewTag(tag)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.reviewTagText, isSelected && styles.reviewTagTextSelected]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Ô nhập nhận xét */}
            <TextInput
              style={styles.reviewInput}
              placeholder="Chia sẻ thêm cảm nhận của bạn về chất lượng make-up, độ bền tone phấn..."
              placeholderTextColor="#94A3B8"
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.submitReviewBtn, isReviewSubmitted && styles.disabledBtn]}
              onPress={handleSubmitReview}
              disabled={isReviewSubmitted}
              activeOpacity={0.85}
            >
              <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
              <Text style={styles.submitReviewBtnText}>
                {isReviewSubmitted ? 'Đã Gửi Đánh Giá' : 'Gửi Đánh Giá Chuyên Viên'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* NÚT VỀ TRANG CHỦ */}
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace('/')}
            activeOpacity={0.85}
          >
            <Ionicons name="home" size={18} color="#E11D48" />
            <Text style={styles.homeBtnText}>Quay Về Trang Chủ</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL POP-UP THÔNG BÁO TỨC THÌ KHI THỢ CHUYỂN TRẠNG THÁI (STATUS POP-UP) */}
      {/* ========================================================================= */}
      <Modal visible={!!statusPopup?.visible} transparent animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <View
              style={[
                styles.popupIconCircle,
                {
                  backgroundColor:
                    statusPopup?.type === 'ARRIVED'
                      ? '#ECFDF5'
                      : statusPopup?.type === 'IN_PROGRESS'
                      ? '#FFF1F2'
                      : '#FEF3C7',
                },
              ]}
            >
              <Ionicons
                name={
                  statusPopup?.type === 'ARRIVED'
                    ? 'location'
                    : statusPopup?.type === 'IN_PROGRESS'
                    ? 'sparkles'
                    : 'trophy'
                }
                size={36}
                color={
                  statusPopup?.type === 'ARRIVED'
                    ? '#059669'
                    : statusPopup?.type === 'IN_PROGRESS'
                    ? '#E11D48'
                    : '#D97706'
                }
              />
            </View>

            <Text style={styles.popupTitle}>{statusPopup?.title}</Text>
            <Text style={styles.popupMessage}>{statusPopup?.message}</Text>

            <TouchableOpacity
              style={[
                styles.popupActionBtn,
                {
                  backgroundColor:
                    statusPopup?.type === 'ARRIVED'
                      ? '#059669'
                      : statusPopup?.type === 'IN_PROGRESS'
                      ? '#E11D48'
                      : '#F59E0B',
                },
              ]}
              onPress={() => setStatusPopup(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.popupActionBtnText}>
                {statusPopup?.type === 'ARRIVED'
                  ? 'Đón Thợ Ngay'
                  : statusPopup?.type === 'IN_PROGRESS'
                  ? 'Xem Tiến Trình'
                  : 'Đánh Giá Ngay'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL HỦY ĐƠN HÀNG DÀNH CHO KHÁCH HÀNG */}
      <Modal visible={isCancelModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="close-circle" size={20} color="#E11D48" />
                <Text style={styles.modalTitle}>Lý Do Hủy Đơn Hàng</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCancelModalVisible(false)}
                disabled={isCancelling}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalSubtitle}>
                Vui lòng chọn lý do bạn muốn hủy ca hẹn này. Hành động này sẽ giải phóng chuyên viên và kết thúc lịch trình.
              </Text>

              <View style={styles.reasonsList}>
                {CUSTOMER_CANCEL_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.reasonChip,
                      selectedReasonChip === r && styles.reasonChipSelected,
                    ]}
                    onPress={() => setSelectedReasonChip(r)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        selectedReasonChip === r && styles.reasonChipTextSelected,
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
                value={customReason}
                onChangeText={setCustomReason}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsCancelModalVisible(false)}
                  disabled={isCancelling}
                >
                  <Text style={styles.modalCancelBtnText}>Giữ Lại Đơn</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, isCancelling && styles.disabledBtn]}
                  onPress={handleConfirmCancelTrip}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Xác Nhận Hủy</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerCode: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.primary,
    marginTop: 2,
  },
  sosBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
  },
  bottomDrawer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  drawerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  muaProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  muaAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  muaNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  muaPhoneText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  destinationSnippet: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  callBtn: {
    flex: 1.35,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelTripBtn: {
    flex: 1,
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  cancelTripBtnText: {
    color: '#E11D48',
    fontSize: 13,
    fontWeight: '700',
  },
  detailBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },

  /* STAGE SPECIFIC VIEWS STYLES */
  stageScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  stageScrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },

  /* ARRIVED STAGE */
  arrivedBannerCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  arrivedIconPulse: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  arrivedBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'center',
    marginBottom: 6,
  },
  arrivedBannerSub: {
    fontSize: 13,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 19,
  },
  muaDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  muaAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  muaNameLarge: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  muaPhoneLarge: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  destinationTextMini: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  callBigBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  callBigBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  tipItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  tipBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  tipDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  meetMuaBtn: {
    backgroundColor: BrandColors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  meetMuaBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  /* IN_PROGRESS STAGE */
  liveTimerCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  timerBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(225, 29, 72, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 14,
  },
  liveRedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E11D48',
  },
  timerBadgeHeaderText: {
    color: '#FDA4AF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stopwatchDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  stopwatchBigText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  stopwatchSubText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  serviceNameHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primary,
    marginBottom: 10,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  serviceMetaLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  serviceMetaVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    maxWidth: '65%',
  },
  serviceMetaPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  supportOutlineBtn: {
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  supportOutlineBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },

  /* COMPLETED STAGE */
  completedCelebrationCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  celebrationIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  celebrationTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#92400E',
    marginBottom: 6,
    textAlign: 'center',
  },
  celebrationSub: {
    fontSize: 13,
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 19,
  },
  proofHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  proofImage: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  proofNote: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  billRowBold: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 6,
    paddingTop: 8,
  },
  billLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  billVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  billLabelBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  billValTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E11D48',
  },
  paidBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    justifyContent: 'center',
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  ratingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  starTouch: {
    padding: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  reviewTagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewTagChipSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: '#E11D48',
  },
  reviewTagText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  reviewTagTextSelected: {
    color: '#E11D48',
    fontWeight: '700',
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  submitReviewBtn: {
    backgroundColor: '#E11D48',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitReviewBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  homeBtn: {
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  homeBtnText: {
    color: '#E11D48',
    fontSize: 15,
    fontWeight: '700',
  },

  /* POP-UP MODAL TRANSITION STYLES */
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popupCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  popupIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  popupMessage: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  popupActionBtn: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  /* CANCEL MODAL STYLES */
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
    lineHeight: 18,
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
    marginBottom: 10,
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
  disabledBtn: {
    opacity: 0.6,
  },
});
