import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { JobTimelineStep } from '@/components/mua/JobTimelineStep';
import { ProofCameraModal } from '@/components/mua/ProofCameraModal';
import { LiveTrackingMap } from '@/components/booking/LiveTrackingMap';
import { freelancerBookingService } from '@/services/freelancer-booking.service';
import { bookingService, BookingStatusType } from '@/services/booking.service';
import { telemetryService } from '@/services/telemetry.service';
import { websocketService } from '@/services/websocket.service';
import { depositService } from '@/services/deposit.service';
import { useWorkstationStore } from '@/store/workstation.store';
import * as Location from 'expo-location';
import { getTodayVN } from '@/utils/date';

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

interface ExtendedBookingItem {
  id: number;
  bookingCode: string;
  status: BookingStatusType;
  customerName: string;
  customerPhone?: string;
  customerAvatar?: string;
  packageName: string;
  destinationAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  bookingDate: string;
  startTime: string;
  serviceSubtotal: number;
  surchargeFee: number;
  distanceFee: number;
  totalAmount: number;
  depositAmount: number;
  earningsAmount: number;
  note?: string;
  completionPhotoUrl?: string;
  createdAt: string;
}

const DISPUTE_REASONS = [
  'Khách hàng không có mặt tại điểm hẹn',
  'Khách hàng từ chối làm dịch vụ',
  'Địa điểm không đảm bảo an toàn / không liên lạc được',
  'Sự cố cá nhân đột xuất bất khả kháng',
];

export default function JobExecutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);
  const { profile } = useWorkstationStore();
  const insets = useSafeAreaInsets();

  const [booking, setBooking] = useState<ExtendedBookingItem | null>(null);
  const [currentStatus, setCurrentStatus] = useState<BookingStatusType>('ACCEPTED');
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(false);

  // Cancellation / Dispute Modal State
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [disputeProofUrl, setDisputeProofUrl] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // 10-minute deposit wait state (5p kiểm tra & dịch vụ thêm + 5p thanh toán cọc)
  const [isDepositPaid, setIsDepositPaid] = useState<boolean>(false);
  const [depositSecondsLeft, setDepositSecondsLeft] = useState<number>(600);
  const [isDepositTimeout, setIsDepositTimeout] = useState<boolean>(false);

  // Cash confirmation state
  const [cashReceiptConfirmed, setCashReceiptConfirmed] = useState(false);
  const [isConfirmingCash, setIsConfirmingCash] = useState(false);
  const [isBothCashConfirmed, setIsBothCashConfirmed] = useState(false);

  // Luxury Success Modal State when Customer deposits
  const [depositSuccessData, setDepositSuccessData] = useState<{
    visible: boolean;
    depositAmount: number;
    earningsAmount: number;
    addOnNames: string[];
    addOnTotal: number;
  }>({
    visible: false,
    depositAmount: 0,
    earningsAmount: 0,
    addOnNames: [],
    addOnTotal: 0,
  });

  // Cờ chống hiển thị trùng lặp Alert hủy đơn 2 lần
  const hasHandledCancelAlertRef = useRef(false);

  // Điều hướng an toàn tuyệt đối quay về bàn làm việc, pop màn hình ca làm thay vì tạo thêm trang mới gây gối đè 2 bàn làm việc
  const navigateBackToWorkstation = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  // Hàm hiển thị Alert hủy đơn an toàn - bảo đảm CHỈ KÍCH HOẠT 1 LẦN DUY NHẤT
  const triggerCancelAlert = (cancelText: string) => {
    if (hasHandledCancelAlertRef.current) return;
    hasHandledCancelAlertRef.current = true;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Đơn Đã Bị Hủy', cancelText, [
      { text: 'Về Bàn Làm Việc', onPress: navigateBackToWorkstation },
    ]);
  };

  // Stopwatch state when IN_PROGRESS
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  // State for MUA GPS telemetry tracking - Khởi tạo tức thì từ store hoặc fallback để hiển thị Map ngay trong 0s
  const [driverCoords, setDriverCoords] = useState<{
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    accuracy: number;
  } | null>(() => {
    const storeCoords = useWorkstationStore.getState().currentCoords;
    if (storeCoords?.latitude && storeCoords?.longitude) {
      return {
        latitude: storeCoords.latitude,
        longitude: storeCoords.longitude,
        speed: 0,
        heading: 0,
        accuracy: 10,
      };
    }
    return null;
  });
  const [driverDistanceMeters, setDriverDistanceMeters] = useState<number>(0);
  const [driverEtaMinutes, setDriverEtaMinutes] = useState<number>(10);
  const [driverStreamMode, setDriverStreamMode] = useState<'APPROACHING' | 'MOVING' | 'STOPPED'>('MOVING');

  // Lấy vị trí đã biết gần nhất ngay khi mount để map hiển thị trong <10ms
  useEffect(() => {
    Location.getLastKnownPositionAsync().then((lastLoc) => {
      if (lastLoc?.coords) {
        setDriverCoords((prev) => prev || {
          latitude: lastLoc.coords.latitude,
          longitude: lastLoc.coords.longitude,
          speed: (lastLoc.coords.speed || 0) * 3.6,
          heading: lastLoc.coords.heading || 0,
          accuracy: lastLoc.coords.accuracy || 10,
        });
      }
    }).catch(() => { });
  }, []);

  // Luồng phát sóng GPS thời gian thực của Thợ MUA khi đang di chuyển (ON_THE_WAY)
  useEffect(() => {
    if (currentStatus !== 'ON_THE_WAY' || !booking) return;

    let isCancelled = false;
    let timerId: any = null;
    let lastPosition: { lat: number; lng: number; time: number } | null = null;

    const streamCycle = async () => {
      if (isCancelled) return;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (isCancelled) return;

        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        const heading = loc.coords.heading || 0;
        const accuracy = loc.coords.accuracy || 10;
        const now = Date.now();

        // Tính toán tốc độ km/h với bộ lọc nhiễu GPS (GPS Jitter Filter)
        let speed = 0;
        if (loc.coords.speed !== null && loc.coords.speed !== undefined && loc.coords.speed >= 0.8) {
          speed = loc.coords.speed * 3.6;
        } else if (lastPosition) {
          const distDelta = calculateDistanceMeters(lastPosition.lat, lastPosition.lng, lat, lng);
          const timeDeltaSeconds = (now - lastPosition.time) / 1000;
          // Chỉ tính tốc độ nếu cự ly di chuyển > 12m (vượt ngưỡng sai số GPS trong nhà)
          if (distDelta >= 12 && timeDeltaSeconds > 0) {
            speed = (distDelta / timeDeltaSeconds) * 3.6;
          }
        }
        // Triệt tiêu tốc độ ảo khi đứng yên / ngồi cạnh nhau
        if (speed < 2.5) {
          speed = 0;
        }
        lastPosition = { lat, lng, time: now };

        // Khoảng cách tới điểm hẹn khách hàng
        const destLat = booking.destinationLatitude;
        const destLng = booking.destinationLongitude;
        let distRemaining =
          destLat && destLng ? calculateDistanceMeters(lat, lng, destLat, destLng) : 0;

        // Nếu ngồi sát nhau hoặc sai lệch GPS < 15m, nhận diện là đã tới điểm hẹn
        if (distRemaining < 15) {
          distRemaining = 0;
        }

        // Xác định Adaptive Sampling Mode theo chuẩn backend TelemetryConstants:
        // - APPROACHING (<300m): bắn websocket 3s
        // - STOPPED (<3km/h): bắn websocket 20s
        // - MOVING (còn lại): bắn websocket 5s
        let mode: 'APPROACHING' | 'MOVING' | 'STOPPED';
        let nextIntervalMs: number;
        if (distRemaining < 300) {
          mode = 'APPROACHING';
          nextIntervalMs = 3000;
        } else if (speed < 3.0) {
          mode = 'STOPPED';
          nextIntervalMs = 20000;
        } else {
          mode = 'MOVING';
          nextIntervalMs = 5000;
        }

        let eta = 1;
        if (distRemaining <= 25) {
          eta = 0; // Đã tới nơi
        } else if (distRemaining > 0 && speed > 5.0) {
          eta = Math.ceil(distRemaining / 1000.0 / speed * 60);
        } else if (distRemaining > 0) {
          eta = Math.max(1, Math.ceil(distRemaining / 1000.0 / 25 * 60));
        }

        setDriverCoords({ latitude: lat, longitude: lng, speed, heading, accuracy });
        setDriverDistanceMeters(distRemaining);
        setDriverEtaMinutes(eta);
        setDriverStreamMode(mode);

        // Gửi tọa độ lên Backend Spring Boot
        await telemetryService.streamLocation({
          bookingId,
          latitude: lat,
          longitude: lng,
          speed,
          heading,
          accuracy,
          distanceRemainingMeters: distRemaining,
        });

        if (!isCancelled) {
          timerId = setTimeout(streamCycle, nextIntervalMs);
        }
      } catch (err) {
        console.warn('Lỗi stream GPS Thợ MUA:', err);
        if (!isCancelled) {
          timerId = setTimeout(streamCycle, 5000);
        }
      }
    };

    streamCycle();

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [currentStatus, bookingId, booking?.destinationLatitude, booking?.destinationLongitude]);

  useEffect(() => {
    loadBookingDetail();

    // Subscribe to STOMP Realtime
    const statusTopic = `/topic/booking-status/${bookingId}`;
    websocketService.subscribe(statusTopic, (msg: any) => {
      if (msg?.type === 'CUSTOMER_CONFIRMED_DEPOSIT' || msg?.isDepositPaid) {
        setIsDepositPaid(true);
        setIsDepositTimeout(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDepositSuccessData({
          visible: true,
          depositAmount: msg.depositAmount || 0,
          earningsAmount: msg.earningsAmount || 0,
          addOnNames: msg.addOnNames || [],
          addOnTotal: msg.addOnTotal || 0,
        });
        loadBookingDetail();
      }
      if (msg?.status && msg.status !== currentStatus) {
        setCurrentStatus(msg.status);
        if (msg.status === 'CANCELLED') {
          let cancelText = msg.message || 'Khách hàng hoặc hệ thống đã hủy ca làm này.';
          if (cancelText.includes('45 giây') || cancelText.includes('không có thợ nhận')) {
            cancelText = 'Khách hàng đã hủy yêu cầu làm đẹp này. Bạn đã được giải phóng sẵn sàng nhận ca mới.';
          }
          triggerCancelAlert(cancelText);
        }
      }
    });

    if (profile?.muaId) {
      const confirmTopic = `/topic/booking-customer-confirmed/${profile.muaId}`;
      websocketService.subscribe(confirmTopic, (msg: any) => {
        if (msg?.bookingId === bookingId) {
          setIsDepositPaid(true);
          setIsDepositTimeout(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Hiển thị Custom Luxury Modal thay vì Alert mặc định
          setDepositSuccessData({
            visible: true,
            depositAmount: msg.depositAmount || 0,
            earningsAmount: msg.earningsAmount || 0,
            addOnNames: msg.addOnNames || [],
            addOnTotal: msg.addOnTotal || 0,
          });

          // Cập nhật lại bill
          loadBookingDetail();
        }
      });

      const rejectTopic = `/topic/booking-customer-rejected/${profile.muaId}`;
      websocketService.subscribe(rejectTopic, (msg: any) => {
        if (msg?.bookingId === bookingId) {
          setCurrentStatus('CANCELLED');
          const cancelText = msg.message || 'Khách hàng đã hủy ca làm này. Bạn đã được giải phóng sẵn sàng nhận đơn mới.';
          triggerCancelAlert(cancelText);
        }
      });
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      websocketService.unsubscribe(statusTopic);
      if (profile?.muaId) {
        websocketService.unsubscribe(`/topic/booking-customer-confirmed/${profile.muaId}`);
        websocketService.unsubscribe(`/topic/booking-customer-rejected/${profile.muaId}`);
      }
    };
  }, [bookingId, profile?.muaId]);

  // Countdown timer 10 phút chờ khách đặt cọc
  useEffect(() => {
    if (currentStatus !== 'ACCEPTED' || isDepositPaid || isDepositTimeout) return;
    const interval = setInterval(() => {
      setDepositSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsDepositTimeout(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStatus, isDepositPaid, isDepositTimeout]);

  // Polling dự phòng tự động kiểm tra cọc mỗi 2.5s khi đang ở ACCEPTED chờ cọc
  useEffect(() => {
    if (currentStatus !== 'ACCEPTED' || isDepositPaid) return;
    const pollInterval = setInterval(async () => {
      try {
        const detail = await bookingService.getBookingStatus(bookingId);
        if (detail?.isDepositPaid) {
          setIsDepositPaid(true);
          setIsDepositTimeout(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadBookingDetail();
        }
      } catch {
        // bỏ qua lỗi polling ngầm
      }
    }, 2500);
    return () => clearInterval(pollInterval);
  }, [currentStatus, isDepositPaid, bookingId]);

  useEffect(() => {
    if (currentStatus === 'IN_PROGRESS') {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setElapsedSeconds((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [currentStatus]);

  const loadBookingDetail = async () => {
    try {
      setIsLoading(true);
      const detail = await bookingService.getBookingStatus(bookingId);
      if (detail) {
        setIsDepositPaid(Boolean(detail.isDepositPaid));
        if (detail.depositTimeoutSeconds !== undefined && detail.depositTimeoutSeconds !== null) {
          setDepositSecondsLeft(detail.depositTimeoutSeconds);
          if (detail.depositTimeoutSeconds <= 0 && !detail.isDepositPaid) {
            setIsDepositTimeout(true);
          }
        }
        setBooking({
          id: detail.bookingId,
          bookingCode: detail.bookingCode,
          status: detail.status as BookingStatusType,
          customerName: detail.customerName || 'Khách hàng',
          customerPhone: detail.customerPhone || '0988123456',
          customerAvatar: detail.customerAvatar || undefined,
          packageName: detail.packageName || 'Dịch vụ trang điểm',
          destinationAddress: detail.destinationAddress || 'Địa chỉ khách hàng',
          destinationLatitude: detail.destinationLatitude ? Number(detail.destinationLatitude) : 21.0285,
          destinationLongitude: detail.destinationLongitude ? Number(detail.destinationLongitude) : 105.8542,
          bookingDate: getTodayVN(),
          startTime: '09:00',
          serviceSubtotal: detail.serviceSubtotal ? Number(detail.serviceSubtotal) : 0,
          surchargeFee: detail.surchargeFee ? Number(detail.surchargeFee) : 150000,
          distanceFee: detail.distanceFee ? Number(detail.distanceFee) : 0,
          totalAmount: detail.totalAmount ? Number(detail.totalAmount) : 0,
          depositAmount: detail.depositAmount ? Number(detail.depositAmount) : 0,
          earningsAmount: detail.earningsAmount ? Number(detail.earningsAmount) : 0,
          completionPhotoUrl: detail.completionPhotoUrl || undefined,
          createdAt: detail.updatedAt || new Date().toISOString(),
        });
        setCurrentStatus(detail.status as BookingStatusType);
      }
    } catch (e) {
      console.warn('Lỗi tải chi tiết đơn:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Hủy ca khi quá hạn 5 phút khách không cọc
  const handleCancelTimeout = async () => {
    try {
      setIsSubmittingCancel(true);
      await freelancerBookingService.transitionBookingState(
        bookingId,
        'CANCELLED',
        'Khách hàng quá 5 phút chưa hoàn tất đặt cọc giữ chỗ'
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Đã Hủy Đơn Hàng',
        'Đơn hàng đã được hủy do quá thời hạn 5 phút khách hàng chưa thanh toán cọc. Hệ thống đã giải phóng bạn sẵn sàng nhận đơn mới!',
        [{ text: 'Về Bàn Làm Việc', onPress: navigateBackToWorkstation }]
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể hủy đơn hàng.';
      Alert.alert('Lỗi Hủy Đơn', msg);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleTransitionState = async (
    nextStatus: BookingStatusType,
    completionPhotoUrl?: string,
    reason?: string
  ) => {
    try {
      setIsTransitioning(true);
      await freelancerBookingService.transitionBookingState(
        bookingId,
        nextStatus,
        reason,
        completionPhotoUrl
      );
      setCurrentStatus(nextStatus);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (nextStatus === 'COMPLETED') {
        Alert.alert(
          '🎉 Ca Làm Hoàn Thành Xuất Sắc!',
          'Hệ thống đã xác thực ảnh nghiệm thu và kích hoạt giải ngân tiền cọc vào Ví tài khoản của bạn.',
          [
            {
              text: 'Về Bàn Làm Việc',
              onPress: navigateBackToWorkstation,
            },
          ]
        );
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể chuyển trạng thái ca làm.';
      Alert.alert('Chuyển Trạng Thái Thất Bại', msg);
    } finally {
      setIsTransitioning(false);
    }
  };

  // Xử lý Hủy ca hoặc Báo sự cố
  const handleConfirmCancelOrDispute = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Lý Do Bắt Buộc', 'Vui lòng nhập hoặc chọn lý do cụ thể.');
      return;
    }

    try {
      setIsSubmittingCancel(true);
      const isDispute = currentStatus === 'ARRIVED' || currentStatus === 'IN_PROGRESS';
      const targetStatus: BookingStatusType = isDispute ? 'DISPUTED' : 'CANCELLED';

      await freelancerBookingService.transitionBookingState(
        bookingId,
        targetStatus,
        cancelReason.trim(),
        undefined,
        disputeProofUrl.trim() || undefined
      );

      setIsCancelModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      if (isDispute) {
        Alert.alert(
          'Đã Gửi Báo Cáo Sự Cố',
          'Ca làm việc đã chuyển sang trạng thái tranh chấp (DISPUTED). Bạn đã được giải phóng khỏi ca. Ban Quản Trị sẽ xác minh minh chứng để phân xử.',
          [{ text: 'Về Bàn Làm Việc', onPress: navigateBackToWorkstation }]
        );
      } else {
        Alert.alert(
          'Đã Hủy Nhận Ca',
          'Bạn đã hủy nhận ca này. Hệ thống đã giải phóng trạng thái bận cho bạn.',
          [{ text: 'Về Bàn Làm Việc', onPress: navigateBackToWorkstation }]
        );
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Thao tác không thành công.';
      Alert.alert('Thất Bại', msg);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleOpenMaps = () => {
    if (booking?.destinationLatitude && booking?.destinationLongitude) {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${booking.destinationLatitude},${booking.destinationLongitude}`
      );
    } else if (booking?.destinationAddress) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.destinationAddress)}`
      );
    }
  };

  const handleCall = () => {
    if (booking?.customerPhone) {
      Linking.openURL(`tel:${booking.customerPhone}`);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  };

  const handleConfirmCashReceipt = async () => {
    try {
      setIsConfirmingCash(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await depositService.confirmFreelancerCashReceipt(bookingId, 'v1');
      setCashReceiptConfirmed(true);
      if (res?.settlementTriggered || res?.status === 'BOTH_CONFIRMED') {
        setIsBothCashConfirmed(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Quyết Toán Thành Công! 🎉',
          'Khách hàng và thợ đều đã xác nhận tiền mặt. Khoản cọc Escrow đã được quyết toán vào ví của bạn.',
          [
            { text: 'Xem Ví Thợ', onPress: () => router.push('/profile/freelancer-wallet') },
            { text: 'Đóng' }
          ]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Đã Xác Nhận Nhận Tiền',
          'Bạn đã xác nhận đã nhận đủ tiền mặt. Khoản cọc sẽ tự động quyết toán vào ví ngay khi khách hàng xác nhận.'
        );
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể xác nhận tiền mặt.');
    } finally {
      setIsConfirmingCash(false);
    }
  };

  const formatVnd = (amount: number) => (amount || 0).toLocaleString('vi-VN') + ' đ';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#E11D48" />
        <Text style={styles.loadingText}>Đang nạp thông tin ca làm...</Text>
      </SafeAreaView>
    );
  }

  const isDisputeMode = currentStatus === 'ARRIVED' || currentStatus === 'IN_PROGRESS';
  const canCancelOrDispute =
    currentStatus !== 'COMPLETED' &&
    currentStatus !== 'PAID_OUT' &&
    currentStatus !== 'CANCELLED' &&
    currentStatus !== 'DISPUTED';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>{booking?.bookingCode}</Text>
          <Text style={styles.headerSubtitle}>Tiến trình thực hiện ca làm</Text>
        </View>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
          <Ionicons name="call" size={18} color="#059669" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ========================================================================= */}
        {/* GIAO DIỆN CHUYÊN BIỆT: CHỜ KHÁCH HÀNG KIỂM TRA ĐƠN & ĐẶT CỌC 30% (10 PHÚT)*/}
        {/* ========================================================================= */}
        {currentStatus === 'ACCEPTED' && !isDepositPaid ? (
          <View style={styles.waitingContainer}>
            {/* THẺ ĐẾM NGƯỢC 10 PHÚT NỔI BẬT */}
            <View style={[styles.waitingTimerBox, isDepositTimeout && styles.waitingTimerBoxExpired]}>
              <View style={[styles.timerCircleBig, isDepositTimeout && styles.timerCircleBigExpired]}>
                <Ionicons
                  name={isDepositTimeout ? 'alert-circle' : 'hourglass'}
                  size={28}
                  color={isDepositTimeout ? '#DC2626' : '#D97706'}
                />
                <Text style={[styles.timerBigNumber, isDepositTimeout && styles.timerBigNumberExpired]}>
                  {Math.floor(depositSecondsLeft / 60)}:{(depositSecondsLeft % 60).toString().padStart(2, '0')}
                </Text>
                <Text style={styles.timerBigUnit}>
                  {isDepositTimeout ? 'Đã hết giờ' : 'Thời gian đợi'}
                </Text>
              </View>

              <Text style={[styles.waitingNoticeTitle, isDepositTimeout && { color: '#DC2626' }]}>
                {isDepositTimeout
                  ? 'Quá 10 phút khách hàng chưa hoàn tất đặt cọc!'
                  : 'Vui lòng đợi khách hàng kiểm tra thông tin đơn hàng và đặt cọc'}
              </Text>
              <Text style={styles.waitingNoticeSub}>
                {isDepositTimeout
                  ? 'Khách hàng không thực hiện thanh toán cọc trong thời gian quy định (10 phút). Bạn có thể bấm nút hủy đơn màu đỏ bên dưới để giải phóng trạng thái và nhận ca mới.'
                  : 'Hệ thống đang giữ chỗ ca khẩn cấp này cho bạn. Sau khi khách hoàn tất thanh toán cọc 30% vào quỹ Escrow, màn hình sẽ tự động mở khóa nút xuất phát di chuyển.'}
              </Text>
            </View>

            {/* THẺ THÔNG TIN CHI TIẾT KHÁCH HÀNG */}
            <View style={styles.clientProfileCard}>
              <Text style={styles.sectionHeaderTitle}>Thông Tin Khách Hàng</Text>
              <View style={styles.clientProfileRow}>
                <Image
                  source={{
                    uri:
                      booking?.customerAvatar ||
                      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
                  }}
                  style={styles.clientAvatarImg}
                />
                <View style={styles.clientProfileDetails}>
                  <View style={styles.nameBadgeRow}>
                    <Text style={styles.clientFullName}>{booking?.customerName}</Text>
                    <View style={styles.verifiedTag}>
                      <Ionicons name="checkmark-circle" size={13} color="#059669" />
                      <Text style={styles.verifiedTagText}>Đã xác thực</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={handleCall} style={styles.phoneClickRow}>
                    <Ionicons name="call" size={14} color="#059669" />
                    <Text style={styles.clientPhoneText}>{booking?.customerPhone}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.dividerThin} />

              <View style={styles.clientLocationBlock}>
                <View style={styles.locationHeaderRow}>
                  <Ionicons name="location" size={18} color="#E11D48" />
                  <Text style={styles.locationHeaderLabel}>Địa chỉ đặt make:</Text>
                </View>
                <Text style={styles.clientDestinationText}>{booking?.destinationAddress}</Text>

                <TouchableOpacity style={styles.mapNavigateBtn} onPress={handleOpenMaps}>
                  <Ionicons name="navigate-circle" size={18} color="#2563EB" />
                  <Text style={styles.mapNavigateText}>Xem chỉ đường Google Maps</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* THẺ CHI TIẾT ĐƠN HÀNG & MINH BẠCH TÀI CHÍNH */}
            <View style={styles.billDetailsCard}>
              <Text style={styles.sectionHeaderTitle}>Chi Tiết Đơn Hàng & Thu Nhập</Text>
              <Text style={styles.serviceNameHighlight}>{booking?.packageName}</Text>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Giá gói niêm yết:</Text>
                <Text style={styles.billValue}>{formatVnd(booking?.serviceSubtotal || 0)}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Phụ phí ca khẩn cấp (Thợ nhận 100%):</Text>
                <Text style={styles.billValue}>+{formatVnd(booking?.surchargeFee || 150000)}</Text>
              </View>
              {(booking?.distanceFee || 0) > 0 && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Phí di chuyển vượt cự ly:</Text>
                  <Text style={styles.billValue}>+{formatVnd(booking?.distanceFee || 0)}</Text>
                </View>
              )}
              <View style={[styles.billRow, styles.billRowBold]}>
                <Text style={styles.billLabelBold}>Tổng tiền bill (khách trả):</Text>
                <Text style={styles.billValueTotal}>{formatVnd(booking?.totalAmount || 0)}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Tiền cọc 30% khách cần chuyển:</Text>
                <Text style={styles.billValueDeposit}>{formatVnd(booking?.depositAmount || 0)}</Text>
              </View>

              <View style={styles.earningsTotalCard}>
                <Ionicons name="wallet-outline" size={22} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.earningsCardLabel}>Thu nhập thực nhận về ví của bạn:</Text>
                  <Text style={styles.earningsCardValue}>{formatVnd(booking?.earningsAmount || 0)}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* ========================================================================= */
          /* GIAO DIỆN TIẾN TRÌNH CÔNG VIỆC THƯỜNG (KHI ĐÃ CỌC HOẶC ĐANG LÀM)          */
          /* ========================================================================= */
          <>
            {/* Step Progress Timeline */}
            <JobTimelineStep currentStatus={currentStatus} />

            {/* THẺ QUỸ BẢO CHỨNG ESCROW & XÁC NHẬN CỌC DÀNH CHO THỢ */}
            {isDepositPaid && (
              <View style={styles.escrowSecurityCard}>
                <View style={styles.escrowSecurityHeader}>
                  <View style={styles.escrowShieldBadge}>
                    <Ionicons name="shield-checkmark" size={22} color="#059669" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.escrowSecurityTitle}>Quỹ Bảo Chứng Escrow</Text>
                      <View style={styles.escrowStatusTag}>
                        <Ionicons name="lock-closed" size={11} color="#065F46" style={{ marginRight: 3 }} />
                        <Text style={styles.escrowStatusTagText}>ĐÃ KHÓA CỌC 30%</Text>
                      </View>
                    </View>
                    <Text style={styles.escrowSecuritySub}>Khách đã hoàn tất cọc • Tiền đang bảo lưu an toàn</Text>
                  </View>
                </View>

                <View style={styles.escrowDivider} />

                <View style={styles.escrowDetailsGrid}>
                  <View style={styles.escrowDetailItem}>
                    <Text style={styles.escrowDetailLabel}>Tiền cọc trong Escrow:</Text>
                    <Text style={styles.escrowDetailValueHighlight}>
                      {formatVnd(booking?.depositAmount || Math.round((booking?.totalAmount || 0) * 0.3))}
                    </Text>
                  </View>
                  <View style={styles.escrowDetailItem}>
                    <Text style={styles.escrowDetailLabel}>Tiền mặt thu khi xong (70%):</Text>
                    <Text style={styles.escrowDetailValueCash}>
                      {formatVnd(Math.max(0, (booking?.totalAmount || 0) - (booking?.depositAmount || Math.round((booking?.totalAmount || 0) * 0.3))))}
                    </Text>
                  </View>
                </View>

                <View style={styles.escrowGuaranteeBox}>
                  <Ionicons name="shield-outline" size={16} color="#047857" />
                  <Text style={styles.escrowGuaranteeText}>
                    Khoản cọc 30% và thu nhập ca làm ({formatVnd(booking?.earningsAmount || 0)}) được sàn bảo chứng 100%, tự động giải ngân vào Ví của bạn ngay sau khi hoàn thành buổi làm đẹp.
                  </Text>
                </View>
              </View>
            )}

            {/* LỘ TRÌNH GOONG MAPS TRỰC QUAN KHI ĐANG DI CHUYỂN */}
            {currentStatus === 'ON_THE_WAY' && booking && (
              <View style={styles.driverMapBox}>
                <View style={styles.driverMapHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                    <Ionicons name="navigate" size={16} color="#E11D48" />
                    <Text style={styles.driverMapTitle} numberOfLines={1}>Lộ Trình Tới Khách</Text>
                  </View>
                  <View
                    style={[
                      styles.driverModeBadge,
                      {
                        backgroundColor:
                          driverStreamMode === 'APPROACHING'
                            ? '#ECFDF5'
                            : driverStreamMode === 'STOPPED'
                              ? '#FEF3C7'
                              : '#F0F9FF',
                        borderColor:
                          driverStreamMode === 'APPROACHING'
                            ? '#A7F3D0'
                            : driverStreamMode === 'STOPPED'
                              ? '#FDE68A'
                              : '#BAE6FD',
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.driverModeText,
                        {
                          color:
                            driverStreamMode === 'APPROACHING'
                              ? '#059669'
                              : driverStreamMode === 'STOPPED'
                                ? '#D97706'
                                : '#0284C7',
                        },
                      ]}
                    >
                      {driverStreamMode === 'APPROACHING'
                        ? 'SẮP TỚI (3s)'
                        : driverStreamMode === 'STOPPED'
                          ? 'DỪNG ĐÈN (20s)'
                          : 'DI CHUYỂN (5s)'}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 320, width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: '#E2E8F0' }}>
                  <LiveTrackingMap
                    customerCoords={{
                      latitude: booking.destinationLatitude,
                      longitude: booking.destinationLongitude,
                      address: booking.destinationAddress,
                    }}
                    muaCoords={{
                      latitude: driverCoords?.latitude || booking.destinationLatitude || 21.0285,
                      longitude: driverCoords?.longitude || booking.destinationLongitude || 105.8542,
                      heading: driverCoords?.heading || 0,
                      speed: driverCoords?.speed || 0,
                    }}
                    etaMinutes={driverEtaMinutes}
                    distanceRemainingMeters={driverDistanceMeters}
                    muaName="Vị trí của bạn"
                    streamMode={driverStreamMode}
                  />
                </View>
              </View>
            )}

            {/* Stopwatch Card if IN_PROGRESS */}
            {currentStatus === 'IN_PROGRESS' && (
              <View style={styles.timerCard}>
                <View style={styles.timerIconCircle}>
                  <Ionicons name="stopwatch" size={24} color="#E11D48" />
                </View>
                <View>
                  <Text style={styles.timerLabel}>Thời Gian Đang Trang Điểm</Text>
                  <Text style={styles.timerDisplay}>{formatTimer(elapsedSeconds)}</Text>
                </View>
              </View>
            )}

            {/* Service & Client Card */}
            <View style={styles.infoCard}>
              <Text style={styles.cardSectionTitle}>Thông Tin Dịch Vụ</Text>
              <Text style={styles.packageName}>{booking?.packageName}</Text>

              <View style={styles.divider} />

              <View style={styles.rowItem}>
                <Ionicons name="person-circle-outline" size={20} color="#64748B" />
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Khách hàng</Text>
                  <Text style={styles.rowValue}>
                    {booking?.customerName} • {booking?.customerPhone}
                  </Text>
                </View>
              </View>

              <View style={styles.rowItem}>
                <Ionicons name="location-outline" size={20} color="#E11D48" />
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Địa chỉ trang điểm</Text>
                  <Text style={styles.rowValue}>{booking?.destinationAddress}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.mapLinkBtn} onPress={handleOpenMaps}>
                <Ionicons name="navigate" size={16} color="#2563EB" />
                <Text style={styles.mapLinkText}>Mở bản đồ chỉ đường Google Maps</Text>
              </TouchableOpacity>
            </View>

            {/* Financials Card with Complete Transparent Breakdown */}
            <View style={styles.infoCard}>
              <Text style={styles.cardSectionTitle}>Chi Tiết Hóa Đơn & Thu Nhập</Text>

              <View style={styles.financeRow}>
                <Text style={styles.financeLabel}>Giá gói niêm yết:</Text>
                <Text style={styles.financeValue}>{formatVnd(booking?.serviceSubtotal || 0)}</Text>
              </View>

              <View style={styles.financeRow}>
                <Text style={styles.financeLabel}>Phụ phí ca khẩn cấp:</Text>
                <Text style={styles.financeValue}>{formatVnd(booking?.surchargeFee || 150000)}</Text>
              </View>

              {(booking?.distanceFee || 0) > 0 && (
                <View style={styles.financeRow}>
                  <Text style={styles.financeLabel}>Phí di chuyển vượt 2km:</Text>
                  <Text style={styles.financeValue}>{formatVnd(booking?.distanceFee || 0)}</Text>
                </View>
              )}

              <View style={styles.financeRow}>
                <Text style={styles.financeLabel}>Tổng tiền dịch vụ (khách trả):</Text>
                <Text style={styles.financeValueBold}>{formatVnd(booking?.totalAmount || 0)}</Text>
              </View>

              <View style={styles.financeRow}>
                <Text style={styles.financeLabel}>Tiền cọc Escrow đã khóa (30%):</Text>
                <Text style={styles.financeValue}>{formatVnd(booking?.depositAmount || 0)}</Text>
              </View>

              <View style={[styles.financeRow, styles.earningsHighlight]}>
                <Text style={styles.earningsLabelText}>Thu nhập thợ thực nhận:</Text>
                <Text style={styles.earningsValueText}>{formatVnd(booking?.earningsAmount || 0)}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Bottom Action Bar based on current Status */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {currentStatus === 'ACCEPTED' && !isDepositPaid ? (
          /* ========================================================================= */
          /* NÚT HÀNH ĐỘNG KHI ĐANG CHỜ KHÁCH ĐẶT CỌC:                                 */
          /* Trong 10 phút: Khóa nút di chuyển, hiện "ĐANG CHỜ KHÁCH CỌC..."           */
          /* Quá 10 phút: Hiện nút màu đỏ "HỦY ĐƠN HÀNG (QUÁ HẠN 10 PHÚT)"             */
          /* ========================================================================= */
          isDepositTimeout ? (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#DC2626' }]}
              onPress={handleCancelTimeout}
              disabled={isSubmittingCancel}
            >
              {isSubmittingCancel ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.btnText}>HỦY ĐƠN HÀNG (QUÁ HẠN 10 PHÚT)</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#94A3B8' }]}
              disabled
            >
              <Ionicons name="hourglass" size={18} color="#FFFFFF" />
              <Text style={styles.btnText}>
                ĐANG CHỜ KHÁCH ĐẶT CỌC ({Math.floor(depositSecondsLeft / 60)}:{(depositSecondsLeft % 60).toString().padStart(2, '0')})...
              </Text>
            </TouchableOpacity>
          )
        ) : (
          /* ========================================================================= */
          /* NÚT HÀNH ĐỘNG KHI ĐÃ CỌC: TIẾN TRÌNH DI CHUYỂN, CHECK-IN, LÀM VIỆC        */
          /* ========================================================================= */
          <View style={styles.actionRow}>
            {canCancelOrDispute && (
              <TouchableOpacity
                style={styles.cancelSecondaryBtn}
                onPress={() => {
                  setCancelReason('');
                  setDisputeProofUrl('');
                  setIsCancelModalVisible(true);
                }}
              >
                <Ionicons
                  name={isDisputeMode ? 'alert-circle-outline' : 'close-circle-outline'}
                  size={16}
                  color="#E11D48"
                />
                <Text style={styles.cancelSecondaryBtnText}>
                  {isDisputeMode ? 'Báo Sự Cố' : 'Hủy Ca'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ flex: 1 }}>
              {(currentStatus === 'ACCEPTED' || currentStatus === 'AGENCY_ASSIGNED') && (
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: '#059669' }, isTransitioning && styles.disabledBtn]}
                  onPress={() => handleTransitionState('ON_THE_WAY')}
                  disabled={isTransitioning}
                >
                  {isTransitioning ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.btnText}>XÁC NHẬN ĐÃ CỌC & BẮT ĐẦU DI CHUYỂN (GPS)</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {currentStatus === 'ON_THE_WAY' && (
                <TouchableOpacity
                  style={[styles.primaryActionBtn, isTransitioning && styles.disabledBtn]}
                  onPress={() => handleTransitionState('ARRIVED')}
                  disabled={isTransitioning}
                >
                  {isTransitioning ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="location" size={18} color="#FFFFFF" />
                      <Text style={styles.btnText}>ĐÃ TỚI NƠI (CHECK-IN)</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {currentStatus === 'ARRIVED' && (
                <TouchableOpacity
                  style={[styles.primaryActionBtn, isTransitioning && styles.disabledBtn]}
                  onPress={() => handleTransitionState('IN_PROGRESS')}
                  disabled={isTransitioning}
                >
                  {isTransitioning ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                      <Text style={styles.btnText}>BẮT ĐẦU TRANG ĐIỂM</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {currentStatus === 'IN_PROGRESS' && (
                <TouchableOpacity
                  style={[styles.completeActionBtn, isTransitioning && styles.disabledBtn]}
                  onPress={() => setIsCameraVisible(true)}
                  disabled={isTransitioning}
                >
                  <Ionicons name="camera" size={18} color="#FFFFFF" />
                  <Text style={styles.btnText}>CHỤP ẢNH NGHIỆM THU</Text>
                </TouchableOpacity>
              )}

              {(currentStatus === 'COMPLETED' || currentStatus === 'PAID_OUT') && (
                <View style={{ gap: 10 }}>
                  <View style={styles.completedBadgeBar}>
                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    <Text style={styles.completedBadgeText}>
                      {isBothCashConfirmed || currentStatus === 'PAID_OUT'
                        ? 'Đã hoàn thành & quyết toán ví!'
                        : 'Dịch vụ trang điểm đã hoàn tất!'}
                    </Text>
                  </View>

                  {!cashReceiptConfirmed && currentStatus !== 'PAID_OUT' && (
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, { backgroundColor: '#059669' }]}
                      onPress={handleConfirmCashReceipt}
                      disabled={isConfirmingCash}
                    >
                      {isConfirmingCash ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.btnText}>
                            XÁC NHẬN ĐÃ NHẬN TIỀN MẶT ({formatVnd(booking?.totalAmount ? Math.round(booking.totalAmount * 0.7) : 0)})
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {cashReceiptConfirmed && !isBothCashConfirmed && currentStatus !== 'PAID_OUT' && (
                    <View style={[styles.completedBadgeBar, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="hourglass-outline" size={18} color="#D97706" />
                      <Text style={[styles.completedBadgeText, { color: '#B45309' }]}>
                        Đang chờ khách xác nhận tiền mặt để quyết toán ví...
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.cancelSecondaryBtn, { borderColor: '#CBD5E1', marginTop: 4 }]}
                    onPress={() => router.push('/profile/freelancer-wallet')}
                  >
                    <Ionicons name="wallet-outline" size={16} color="#475569" />
                    <Text style={[styles.cancelSecondaryBtnText, { color: '#475569' }]}>
                      Xem Ví & Khoản Cọc Của Tôi
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {currentStatus === 'DISPUTED' && (
                <View style={[styles.completedBadgeBar, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="alert-circle" size={20} color="#D97706" />
                  <Text style={[styles.completedBadgeText, { color: '#B45309' }]}>
                    Đang chờ Admin phân xử
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Proof Camera Modal for Completion */}
      <ProofCameraModal
        visible={isCameraVisible}
        bookingId={bookingId}
        initialPhotoUrl={booking?.completionPhotoUrl}
        onClose={() => setIsCameraVisible(false)}
        onSuccess={(photoUrl) => {
          setIsCameraVisible(false);
          handleTransitionState('COMPLETED', photoUrl);
        }}
      />

      {/* Cancellation / Dispute Modal (Đã bọc KeyboardAvoidingView chống che nút) */}
      <Modal visible={isCancelModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons
                  name={isDisputeMode ? 'warning' : 'close-circle'}
                  size={20}
                  color="#E11D48"
                />
                <Text style={styles.modalTitle}>
                  {isDisputeMode ? 'Báo Cáo Sự Cố Tại Chỗ' : 'Xác Nhận Hủy Nhận Ca'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsCancelModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalSub}>
                {isDisputeMode
                  ? 'Bạn đã tới nơi hoặc đang làm ca. Báo cáo này sẽ được chuyển tới Ban Quản Trị xem xét giải phóng và phân xử cọc.'
                  : 'Lưu ý: Hủy ca có thể ảnh hưởng đến tỷ lệ uy tín nhận đơn của bạn trên hệ thống.'}
              </Text>

              {isDisputeMode && (
                <View style={styles.reasonsList}>
                  {DISPUTE_REASONS.map((r, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.reasonChip, cancelReason === r && styles.reasonChipSelected]}
                      onPress={() => setCancelReason(r)}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          cancelReason === r && styles.reasonChipTextSelected,
                        ]}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TextInput
                style={styles.reasonInput}
                placeholder="Nhập lý do chi tiết..."
                placeholderTextColor="#94A3B8"
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={3}
              />

              {isDisputeMode && (
                <TextInput
                  style={[styles.reasonInput, { height: 42, marginTop: 8 }]}
                  placeholder="Link ảnh minh chứng hiện trường (tùy chọn)..."
                  placeholderTextColor="#94A3B8"
                  value={disputeProofUrl}
                  onChangeText={setDisputeProofUrl}
                />
              )}

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsCancelModalVisible(false)}
                  disabled={isSubmittingCancel}
                >
                  <Text style={styles.modalCancelBtnText}>Đóng</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, isSubmittingCancel && styles.disabledBtn]}
                  onPress={handleConfirmCancelOrDispute}
                  disabled={isSubmittingCancel}
                >
                  {isSubmittingCancel ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>
                      {isDisputeMode ? 'Gửi Báo Cáo' : 'Xác Nhận Hủy'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Chúc Mừng Khách Cọc Thành Công & Hiển Thị Dịch Vụ Mua Thêm (Custom Luxury Modal) */}
      <Modal visible={depositSuccessData.visible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.depositSuccessCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="sparkles" size={36} color="#059669" />
            </View>
            <Text style={styles.depositSuccessTitle}>🎉 Khách Hàng Đã Đặt Cọc 30%!</Text>
            <Text style={styles.depositSuccessSub}>
              Tiền cọc đã được ký quỹ Escrow bảo vệ an toàn. Bạn có thể sẵn sàng xuất phát tới điểm hẹn!
            </Text>

            {/* Khối Dịch Vụ Bổ Sung Nếu Khách Có Mua Thêm */}
            {depositSuccessData.addOnNames && depositSuccessData.addOnNames.length > 0 && (
              <View style={styles.addOnSectionBox}>
                <View style={styles.addOnSectionHeader}>
                  <Ionicons name="gift" size={16} color="#E11D48" />
                  <Text style={styles.addOnSectionTitle}>
                    Khách đã mua thêm {depositSuccessData.addOnNames.length} dịch vụ mới:
                  </Text>
                </View>
                <View style={styles.addOnItemsList}>
                  {depositSuccessData.addOnNames.map((name, idx) => (
                    <View key={idx} style={styles.addOnItemRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      <Text style={styles.addOnItemText}>{name}</Text>
                    </View>
                  ))}
                </View>
                {depositSuccessData.addOnTotal > 0 && (
                  <Text style={styles.addOnTotalText}>
                    Tổng tiền dịch vụ thêm: +{formatVnd(depositSuccessData.addOnTotal)}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.successEarningsCard}>
              <Text style={styles.successEarningsLabel}>Thu Nhập Thực Nhận Của Bạn:</Text>
              <Text style={styles.successEarningsValue}>
                {formatVnd(depositSuccessData.earningsAmount)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.startTripNowBtn}
              onPress={() => {
                setDepositSuccessData((prev) => ({ ...prev, visible: false }));
                handleTransitionState('ON_THE_WAY');
              }}
            >
              <Ionicons name="rocket" size={20} color="#FFFFFF" />
              <Text style={styles.startTripNowBtnText}>XUẤT PHÁT NGAY (BẮT ĐẦU DI CHUYỂN)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 10,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  depositBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    gap: 12,
  },
  depositBannerWaiting: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  depositBannerTimeout: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
  },
  depositBannerPaid: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  depositBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  depositBannerSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    gap: 14,
  },
  timerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9F1239',
  },
  timerDisplay: {
    fontSize: 26,
    fontWeight: '900',
    color: '#E11D48',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E11D48',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  mapLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  mapLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  financeLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  financeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  financeValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  earningsHighlight: {
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  earningsLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  earningsValueText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  cancelSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  cancelSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E11D48',
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  completeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    flexShrink: 1,
    textAlign: 'center',
  },
  completedBadgeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingVertical: 12,
    borderRadius: 12,
  },
  completedBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  reasonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  reasonChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonChipSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  reasonChipText: {
    fontSize: 12,
    color: '#475569',
  },
  reasonChipTextSelected: {
    color: '#E11D48',
    fontWeight: '700',
  },
  reasonInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E11D48',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Waiting Screen Styles
  waitingContainer: {
    gap: 14,
  },
  waitingTimerBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  waitingTimerBoxExpired: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
  },
  timerCircleBig: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F59E0B',
    marginBottom: 14,
  },
  timerCircleBigExpired: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  timerBigNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#B45309',
    marginTop: 2,
  },
  timerBigNumberExpired: {
    color: '#DC2626',
  },
  timerBigUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
    marginTop: -2,
  },
  waitingNoticeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
    textAlign: 'center',
    marginBottom: 6,
  },
  waitingNoticeSub: {
    fontSize: 12,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 18,
  },
  clientProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  clientProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  clientAvatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#E11D48',
  },
  clientProfileDetails: {
    flex: 1,
    gap: 4,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientFullName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  phoneClickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  clientPhoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  dividerThin: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  clientLocationBlock: {
    gap: 6,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  clientDestinationText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
    fontWeight: '500',
  },
  mapNavigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  mapNavigateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  billDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceNameHighlight: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E11D48',
    marginBottom: 10,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billRowBold: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  billLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  billLabelBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  billValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  billValueTotal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  billValueDeposit: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  earningsTotalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  earningsCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  earningsCardValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
    marginTop: 1,
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  depositSuccessCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    marginBottom: 14,
  },
  depositSuccessTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  depositSuccessSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  addOnSectionBox: {
    width: '100%',
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: 14,
  },
  addOnSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  addOnSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E11D48',
  },
  addOnItemsList: {
    gap: 6,
    marginBottom: 6,
  },
  addOnItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addOnItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  addOnTotalText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E11D48',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#FFE4E6',
    paddingTop: 6,
    textAlign: 'right',
  },
  successEarningsCard: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    marginBottom: 18,
  },
  successEarningsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  successEarningsValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#059669',
    marginTop: 2,
  },
  startTripNowBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E11D48',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  startTripNowBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  driverMapBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  driverMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  driverMapTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  driverModeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  driverModeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  escrowSecurityCard: {
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
  escrowSecurityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  escrowShieldBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  escrowSecurityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
  },
  escrowStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  escrowStatusTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.2,
  },
  escrowSecuritySub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  escrowDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  escrowDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  escrowDetailItem: {
    flex: 1,
  },
  escrowDetailLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 3,
  },
  escrowDetailValueHighlight: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  escrowDetailValueCash: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  escrowGuaranteeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
  },
  escrowGuaranteeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#065F46',
    fontWeight: '500',
  },
});
