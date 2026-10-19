import { DismissibleModal } from '@/components/common/DismissibleModal';
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
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import { UserAvatar } from '@/components/common/UserAvatar';
import { JobTimelineStep } from '@/components/mua/JobTimelineStep';
import { ProofCameraModal } from '@/components/mua/ProofCameraModal';
import { OvertimeReportModal } from '@/components/staff/OvertimeReportModal';
import { LiveTrackingMap } from '@/components/booking/LiveTrackingMap';
import { DisputeDossierModal } from '@/components/booking/DisputeDossierModal';
import { freelancerBookingService } from '@/services/freelancer-booking.service';
import { bookingService, BookingStatusType } from '@/services/booking.service';
import { telemetryService } from '@/services/telemetry.service';
import { websocketService } from '@/services/websocket.service';
import { depositService } from '@/services/deposit.service';
import { agencyStaffService } from '@/services/agency-staff.service';
import { useAuthStore } from '@/store/auth.store';
import { useWorkstationStore } from '@/store/workstation.store';
import { useUndoStore } from '@/store/undo.store';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { getTodayVN, formatDateVN, formatTimeVN } from '@/utils/date';
import { soundManager } from '@/utils/sound';

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

function parseDisputeProofImages(raw?: string | null): string[] {
  if (!raw) return [];
  const list: string[] = [];
  const parts = raw.split('|').map((s) => s.trim()).filter(Boolean);
  parts.forEach((p) => {
    let clean = p.replace(/^\[.*?\]:?\s*/, '').trim();
    if (clean.startsWith('[') && clean.endsWith(']')) {
      try {
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) {
          parsed.forEach((u) => {
            if (typeof u === 'string' && u.startsWith('http') && !list.includes(u)) list.push(u);
          });
          return;
        }
      } catch {}
    }
    const urlMatches = clean.match(/https?:\/\/[^\s"',|\]]+/g);
    if (urlMatches) {
      urlMatches.forEach((u) => {
        if (!list.includes(u)) list.push(u);
      });
    } else if (clean.startsWith('http') && !list.includes(clean)) {
      list.push(clean);
    }
  });
  return list;
}

interface ExtendedBookingItem {
  id: number;
  bookingCode: string;
  status: BookingStatusType;
  bookingType?: string;
  estimatedDurationMinutes?: number;
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
  emergencyReason?: string;
  emergencyProofUrl?: string;
  emergencyReportedAt?: string;
  cancellationReason?: string;
  createdAt: string;
  isCancelRequested?: boolean;
  cancelRequestedReason?: string;
  disputeOrigin?: string;
  assignedStaff?: any[];
  bookingPartner?: string;
  agencyId?: number;
  agencyName?: string;
  agencyPhone?: string;
  agencyAddress?: string;
  muaId?: number;
  packageItems?: string[];
  componentItems?: string[];
  addonItems?: string[];
  completedAt?: string;
  overtimeMinutes?: number;
  overtimePay?: number;
  overtimeRuleName?: string;
  overtimePolicyType?: string;
}

const formatVnd = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

function formatScheduleOrCompletionTime(
  startTime?: string,
  durationMinutes: number = 60,
  status?: string,
  completedAt?: string
) {
  const isCompleted = status === 'COMPLETED' || status === 'PAID_OUT';
  const startFormatted = startTime ? formatTimeVN(startTime) : '--:--';

  if (isCompleted && completedAt) {
    try {
      const compDate = new Date(completedAt);
      if (!isNaN(compDate.getTime())) {
        const compFormatted = formatTimeVN(compDate.toISOString());
        return {
          timeRange: `${startFormatted} - ${compFormatted}`,
          subText: `Hoàn thành lúc ${compFormatted}`,
          isCompleted: true,
        };
      }
    } catch {}
  }

  // Calculate estimated end time
  let endFormatted = '--:--';
  if (startTime) {
    try {
      const parts = startTime.split(':');
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) {
          const total = h * 60 + m + (durationMinutes || 60);
          const endH = Math.floor(total / 60) % 24;
          const endM = total % 60;
          endFormatted = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        }
      }
    } catch {}
  }

  return {
    timeRange: `${startFormatted} - ${endFormatted}`,
    subText: `Ước tính (${durationMinutes || 60}p)`,
    isCompleted: false,
  };
}

const DISPUTE_REASONS = [
  'Khách hàng không có mặt tại điểm hẹn (No-show)',
  'Không thể liên lạc được với khách hàng qua điện thoại',
  'Khách hàng từ chối làm dịch vụ tại chỗ',
  'Địa chỉ không có thật hoặc không đảm bảo an toàn',
  'Sự cố cá nhân đột xuất bất khả kháng',
];

const AGENCY_EMERGENCY_REASONS = [
  'Gặp sự cố giao thông / tai nạn trên đường đi',
  'Bị ốm đột xuất không thể tiếp tục thực hiện ca',
  'Cốp đồ nghề hoặc mỹ phẩm trang điểm gặp sự cố',
  'Gia đình có việc khẩn cấp đột xuất bất khả kháng',
  'Lý do khác...',
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
  const [isOvertimeModalVisible, setIsOvertimeModalVisible] = useState(false);

  // Cancellation / Dispute Modal State
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [cancelModalType, setCancelModalType] = useState<'AGENCY_EMERGENCY_BUSY' | 'CUSTOMER_ABSENT_DISPUTE' | 'MUA_CANCEL'>('CUSTOMER_ABSENT_DISPUTE');
  const [cancelReason, setCancelReason] = useState('');
  const [disputeProofUrl, setDisputeProofUrl] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [isDisputeDossierOpen, setIsDisputeDossierOpen] = useState(false);

  // Modal xác nhận yêu cầu hủy ca và nhận bồi thường cọc từ khách hàng
  const [isCancelRequestModalVisible, setIsCancelRequestModalVisible] = useState(false);
  const [customerCancelReason, setCustomerCancelReason] = useState<string>('');
  const [isHandlingCancelAction, setIsHandlingCancelAction] = useState(false);

  // 10-minute deposit wait state (5p kiểm tra & dịch vụ thêm + 5p thanh toán cọc)
  const [isDepositPaid, setIsDepositPaid] = useState<boolean>(false);
  const [depositSecondsLeft, setDepositSecondsLeft] = useState<number>(600);
  const [isDepositTimeout, setIsDepositTimeout] = useState<boolean>(false);

  // Cash confirmation state
  const [cashReceiptConfirmed, setCashReceiptConfirmed] = useState(false);
  const [isConfirmingCash, setIsConfirmingCash] = useState(false);
  const [isBothCashConfirmed, setIsBothCashConfirmed] = useState(false);
  const [isCashPromptModalVisible, setIsCashPromptModalVisible] = useState(false);
  const [cashAmountExpected, setCashAmountExpected] = useState<number>(0);

  const { userInfo } = useAuthStore();
  const [isConfirmingSolo, setIsConfirmingSolo] = useState(false);
  const [isDecliningSolo, setIsDecliningSolo] = useState(false);

  // Xác định phân công của chuyên viên hiện tại (so khớp đa tầng: userId, muaId, staffId, phone)
  const myAssignment = (booking?.assignedStaff || []).find((s: any) => {
    if (userInfo?.id && (s.userId === userInfo.id || s.staffId === userInfo.id)) return true;
    if (userInfo?.muaId && (s.muaId === userInfo.muaId || s.staffId === userInfo.muaId)) return true;
    if (profile?.muaId && (s.muaId === profile.muaId || s.staffId === profile.muaId)) return true;
    if (userInfo?.phoneNumber && s.staffPhone && s.staffPhone.replace(/\D/g, '') === userInfo.phoneNumber.replace(/\D/g, '')) return true;
    return false;
  }) || null;

  const isAssistantRole = myAssignment?.role === 'ASSISTANT_MUA';
  const isPrimaryRole = myAssignment?.role === 'PRIMARY_MUA' || (!isAssistantRole && (!myAssignment || booking?.muaId === (userInfo?.muaId || profile?.muaId)));
  const isAgencyBooking =
    booking?.bookingPartner === 'AGENCY' ||
    booking?.bookingPartner === 'AGENCY_DISPATCH' ||
    Boolean(booking?.agencyId || (booking as any)?.agency || (booking?.assignedStaff && booking.assignedStaff.length > 0) || myAssignment);

  const isMyAssignmentBusy =
    myAssignment?.status === 'EMERGENCY_CANCELLED' ||
    myAssignment?.status === 'REPORTED_BUSY_PENDING_APPROVAL' ||
    (isAgencyBooking && Boolean(booking?.emergencyReason) && myAssignment?.status !== 'ACTIVE');

  const isPendingMyConfirmation = !isMyAssignmentBusy && (myAssignment
    ? Boolean(myAssignment.isConfirmedByStaff === false || !myAssignment.confirmedAt)
    : (currentStatus === 'AGENCY_ASSIGNED'));

  const handleConfirmMyAssignment = () => {
    const roleText = isPrimaryRole ? 'Thợ chính' : (isAssistantRole ? 'Thợ phụ' : 'Chuyên viên');
    const commissionText = myAssignment?.commissionRate !== undefined && myAssignment?.commissionRate !== null ? ` với mức hoa hồng ${myAssignment.commissionRate}%` : '';

    Alert.alert(
      'Xác Nhận Tiếp Nhận Ca',
      `Bạn có chắc chắn muốn tiếp nhận ca làm #${booking?.bookingCode} với vai trò ${roleText}${commissionText} không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tiếp Nhận Ngay',
          style: 'default',
          onPress: async () => {
            try {
              setIsConfirmingSolo(true);
              await agencyStaffService.confirmAssignment(bookingId, 'booking');
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Thành Công 🎉', 'Bạn đã xác nhận tiếp nhận phân công cho ca làm này.');
              await loadBookingDetail();
            } catch (err: any) {
              const msg = err?.response?.data?.message || err?.message || 'Không thể xác nhận phân công.';
              Alert.alert('Lỗi Xác Nhận', msg);
            } finally {
              setIsConfirmingSolo(false);
            }
          },
        },
      ]
    );
  };

  const handleDeclineMyAssignment = () => {
    Alert.alert(
      'Từ Chối Ca Làm',
      'Bạn có chắc chắn muốn từ chối phân công cho ca này? Hệ thống sẽ chuyển lại ca về bộ phận điều phối của Studio để tìm thợ khác thay thế.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác Nhận Từ Chối',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDecliningSolo(true);
              await agencyStaffService.declineAssignmentByBooking(bookingId, 'Thợ từ chối nhận phân công');
              Alert.alert('Đã Từ Chối', 'Đơn đã được chuyển lại về Studio điều phối.', [
                { text: 'Về Bàn Làm Việc', onPress: navigateBackToWorkstation },
              ]);
            } catch (err: any) {
              const msg = err?.response?.data?.message || err?.message || 'Không thể từ chối ca làm.';
              Alert.alert('Lỗi Từ Chối', msg);
            } finally {
              setIsDecliningSolo(false);
            }
          },
        },
      ]
    );
  };

  // Cờ chống hiển thị trùng lặp Alert hủy đơn 2 lần
  const hasHandledCancelAlertRef = useRef(false);

  // Cờ chống điều hướng trùng lặp nhiều lần gây chồng chéo trang
  const hasNavigatedBackRef = useRef(false);

  // Điều hướng an toàn tuyệt đối quay về bàn làm việc, pop toàn bộ stack màn hình ca làm để về thẳng root Bàn Làm Việc
  const navigateBackToWorkstation = () => {
    if (hasNavigatedBackRef.current) return;
    hasNavigatedBackRef.current = true;
    if (router.canGoBack()) {
      router.dismissAll();
    }
    router.replace('/');
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
  const startedTimeRef = useRef<number | null>(null);

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

  const isScheduled = booking?.bookingType === 'SCHEDULED' || booking?.bookingCode?.includes('SCHED');
  const isInstant = booking?.bookingType === 'REALTIME_INSTANT' || booking?.bookingType === 'INSTANT' || booking?.bookingCode?.includes('INSTANT');

  // Ngắt toàn bộ rung báo động dồn dập ngay khi vào màn hình ca làm việc
  useEffect(() => {
    soundManager.stopJobAlertSound();
    return () => {
      soundManager.stopJobAlertSound();
    };
  }, []);

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
      if (msg?.type === 'CANCEL_REQUESTED' || msg?.isCancelRequested) {
        setCustomerCancelReason(msg?.reason || 'Khách hàng yêu cầu hủy đơn');
        setIsCancelRequestModalVisible(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        loadBookingDetail();
      }

      if (msg?.type === 'CANCEL_REQUEST_REJECTED') {
        setIsCancelRequestModalVisible(false);
      }

      if (msg?.type === 'CANCEL_COMPENSATED') {
        setIsCancelRequestModalVisible(false);
        triggerCancelAlert('Khách hàng đã hủy ca và 100% tiền cọc đã được chuyển bồi thường vào ví của bạn.');
      }

      if (msg?.type === 'CUSTOMER_CONFIRMED_DEPOSIT' || msg?.isDepositPaid) {
        setIsDepositPaid(true);
        setIsDepositTimeout(false);
        if (msg?.type === 'CUSTOMER_CONFIRMED_DEPOSIT' && msg?.status !== 'PAID_OUT') {
          useWorkstationStore.getState().showDepositNotice({
            ...msg, bookingId,
            bookingCode: msg.bookingCode ?? booking?.bookingCode,
            depositAmount: Number(msg.depositAmount ?? booking?.depositAmount ?? 0),
            earningsAmount: Number(msg.earningsAmount ?? booking?.earningsAmount ?? 0),
          });
        }
        loadBookingDetail();
      }
      if (msg?.type === 'CUSTOMER_CASH_PAID') {
        // Chỉ thợ chính (Lead MUA) mới nhận và hiển thị modal xác nhận thu tiền mặt
        const isAssistant = myAssignment?.role === 'ASSISTANT_MUA';
        if (!isAssistant) {
          const amt = msg?.cashAmount || (booking?.totalAmount ? Math.round(booking.totalAmount * 0.7) : 0);
          setCashAmountExpected(amt);
          setIsCashPromptModalVisible(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }

      if (msg?.type === 'WORKER_CASH_DECLINED') {
        setIsCashPromptModalVisible(false);
      }

      if (msg?.type === 'PAYMENT_COMPLETED' || msg?.status === 'PAID_OUT') {
        setIsCashPromptModalVisible(false);
        setIsBothCashConfirmed(true);
        setCashReceiptConfirmed(true);
        setCurrentStatus('PAID_OUT');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadBookingDetail();
      }

      if (msg?.type === 'CUSTOMER_CONFIRMED_ADDONS') {
        if (msg.packageName) {
          setBooking((prev: any) =>
            prev
              ? {
                ...prev,
                packageName: msg.packageName,
                serviceSubtotal: msg.serviceSubtotal != null ? Number(msg.serviceSubtotal) : prev.serviceSubtotal,
                totalAmount: msg.totalAmount != null ? Number(msg.totalAmount) : prev.totalAmount,
                depositAmount: msg.depositAmount != null ? Number(msg.depositAmount) : prev.depositAmount,
              }
              : prev
          );
        }
        loadBookingDetail();
      }

      if (
        msg?.type === 'DISPATCH_STATUS_UPDATED' ||
        msg?.type === 'STAFF_ASSIGNMENT_CONFIRMED' ||
        msg?.type === 'STAFF_ASSIGNMENT_DECLINED' ||
        msg?.type === 'STAFF_REPORTED_BUSY' ||
        msg?.type === 'SOLO_DISPATCH_PROCEEDED' ||
        msg?.type === 'EMERGENCY_REASSIGNED' ||
        msg?.type === 'AGENCY_REASSIGNED_STAFF' ||
        msg?.type === 'COMMISSIONS_UPDATED'
      ) {
        console.log('[JobExecution] Realtime dispatch update received:', msg?.type);
        loadBookingDetail();
      }

      if (msg?.status && msg.status !== currentStatus) {
        setCurrentStatus(msg.status);
        if (msg.status === 'IN_PROGRESS') {
          startedTimeRef.current = Date.now();
          setElapsedSeconds(0);
        }
        loadBookingDetail();
        if (msg.status === 'CANCELLED') {
          let cancelText = msg.message || 'Khách hàng hoặc hệ thống đã hủy ca làm này.';
          if (cancelText.includes('45 giây') || cancelText.includes('không có thợ nhận')) {
            cancelText = 'Khách hàng đã hủy yêu cầu làm đẹp này. Bạn đã được giải phóng sẵn sàng nhận ca mới.';
          }
          triggerCancelAlert(cancelText);
        }
      }
    });

    const cancelTopic = `/topic/booking-cancel-requested/${bookingId}`;
    websocketService.subscribe(cancelTopic, (msg: any) => {
      if (msg?.type === 'CANCEL_REQUESTED') {
        setCustomerCancelReason(msg?.reason || 'Khách hàng yêu cầu hủy đơn');
        setIsCancelRequestModalVisible(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        loadBookingDetail();
      }
    });

    if (profile?.muaId) {
      // Payment topics stay owned by the workstation store so leaving this
      // screen does not unsubscribe the global payment modal.
      const rejectTopic = `/topic/booking-customer-rejected/${profile.muaId}`;
      websocketService.subscribe(rejectTopic, (msg: any) => {
        if (msg?.bookingId === bookingId) {
          setCurrentStatus('CANCELLED');
          const cancelText = msg.message || 'Khách hàng đã hủy ca làm này. Bạn đã được giải phóng sẵn sàng nhận đơn mới.';
          triggerCancelAlert(cancelText);
        }
      });

      const broadcastTopic = `/topic/mua-broadcast/${profile.muaId}`;
      websocketService.subscribe(broadcastTopic, (msg: any) => {
        if (msg?.bookingId === bookingId && msg?.type === 'CUSTOMER_CONFIRMED_ADDONS') {
          if (msg.packageName) {
            setBooking((prev: any) =>
              prev
                ? {
                  ...prev,
                  packageName: msg.packageName,
                  serviceSubtotal: msg.serviceSubtotal != null ? Number(msg.serviceSubtotal) : prev.serviceSubtotal,
                  totalAmount: msg.totalAmount != null ? Number(msg.totalAmount) : prev.totalAmount,
                  depositAmount: msg.depositAmount != null ? Number(msg.depositAmount) : prev.depositAmount,
                }
                : prev
            );
          }
          loadBookingDetail();
        }
      });
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      websocketService.unsubscribe(statusTopic);
      websocketService.unsubscribe(cancelTopic);
      if (profile?.muaId) {
        websocketService.unsubscribe(`/topic/booking-customer-rejected/${profile.muaId}`);
        websocketService.unsubscribe(`/topic/mua-broadcast/${profile.muaId}`);
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

  useEffect(() => {
    if (currentStatus !== 'COMPLETED') return;
    let disposed = false;
    let busy = false;
    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        const detail = await bookingService.getBookingStatus(bookingId);
        if (!disposed && detail?.status === 'PAID_OUT') {
          setCurrentStatus('PAID_OUT');
          setIsCashPromptModalVisible(false);
          setIsBothCashConfirmed(true);
          setCashReceiptConfirmed(true);
          useWorkstationStore.getState().showDepositNotice({
            type: 'PAYMENT_COMPLETED', bookingId, status: 'PAID_OUT',
            bookingCode: detail.bookingCode, totalAmount: Number(detail.totalAmount || 0),
            depositAmount: Number(detail.depositAmount || 0),
            finalAmount: Number(detail.totalAmount || 0) - Number(detail.depositAmount || 0),
            earningsAmount: Number(detail.earningsAmount || 0),
          });
        }
      } catch { /* Retry after reconnect. */ }
      finally { busy = false; }
    };
    const timer = setInterval(check, 5000);
    return () => { disposed = true; clearInterval(timer); };
  }, [bookingId, currentStatus]);

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
      if (!startedTimeRef.current) {
        startedTimeRef.current = Date.now() - elapsedSeconds * 1000;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (startedTimeRef.current) {
          const elapsed = Math.max(0, Math.floor((Date.now() - startedTimeRef.current) / 1000));
          setElapsedSeconds(elapsed);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startedTimeRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStatus]);

  const loadBookingDetail = async (isSilent: boolean = false) => {
    try {
      if (!isSilent) {
        setIsLoading((prev) => (booking ? false : true));
      }
      const detail = await bookingService.getBookingStatus(bookingId);
      if (detail) {
        if (detail.status === 'PAID_OUT') {
          useWorkstationStore.getState().showDepositNotice({
            type: 'PAYMENT_COMPLETED', status: 'PAID_OUT', bookingId,
            bookingCode: detail.bookingCode, totalAmount: Number(detail.totalAmount || 0),
            depositAmount: Number(detail.depositAmount || 0),
            finalAmount: Number(detail.totalAmount || 0) - Number(detail.depositAmount || 0),
            earningsAmount: Number(detail.earningsAmount || 0),
          });
        }
        if (
          detail.status === 'PAID_OUT' ||
          detail.status === 'CANCELLED' ||
          detail.status === 'CANCELLED_EXPIRED' ||
          detail.status === 'DISPUTED' ||
          detail.status === 'DISPUTE_REFUNDED' ||
          detail.status === 'DISPUTE_COMPENSATED'
        ) {
          router.replace(`/booking/history-detail/${bookingId}` as any);
          return;
        }
        setIsDepositPaid(Boolean(detail.isDepositPaid));
        if (detail.depositTimeoutSeconds !== undefined && detail.depositTimeoutSeconds !== null) {
          setDepositSecondsLeft(detail.depositTimeoutSeconds);
          if (detail.depositTimeoutSeconds <= 0 && !detail.isDepositPaid) {
            setIsDepositTimeout(true);
          }
        }
        if (detail.isCancelRequested) {
          setCustomerCancelReason(detail.cancelRequestedReason || 'Khách hàng yêu cầu hủy đơn');
          setIsCancelRequestModalVisible(true);
        }
        setBooking({
          id: detail.bookingId,
          bookingCode: detail.bookingCode,
          status: detail.status as BookingStatusType,
          bookingType: detail.bookingType,
          estimatedDurationMinutes: detail.estimatedDurationMinutes,
          customerName: detail.customerName || 'Khách hàng',
          customerPhone: detail.customerPhone || '0988123456',
          customerAvatar: detail.customerAvatar || undefined,
          packageName: detail.packageName || 'Dịch vụ trang điểm',
          destinationAddress: detail.destinationAddress || 'Địa chỉ khách hàng',
          destinationLatitude: detail.destinationLatitude ? Number(detail.destinationLatitude) : 21.0285,
          destinationLongitude: detail.destinationLongitude ? Number(detail.destinationLongitude) : 105.8542,
          bookingDate: detail.bookingDate || getTodayVN(),
          startTime: detail.startTime || '09:00',
          serviceSubtotal: detail.serviceSubtotal ? Number(detail.serviceSubtotal) : 0,
          surchargeFee: detail.surchargeFee ? Number(detail.surchargeFee) : ((detail.bookingType === 'INSTANT' || detail.bookingType === 'DIRECT_MUA' || detail.bookingType === 'REALTIME_INSTANT') ? 150000 : 0),
          distanceFee: detail.distanceFee ? Number(detail.distanceFee) : 0,
          totalAmount: detail.totalAmount ? Number(detail.totalAmount) : 0,
          depositAmount: detail.depositAmount ? Number(detail.depositAmount) : 0,
          earningsAmount: detail.earningsAmount ? Number(detail.earningsAmount) : 0,
          completionPhotoUrl: detail.completionPhotoUrl || undefined,
          emergencyReason: detail.emergencyReason,
          emergencyProofUrl: detail.emergencyProofUrl,
          emergencyReportedAt: detail.emergencyReportedAt,
          cancellationReason: detail.cancellationReason,
          createdAt: detail.updatedAt || new Date().toISOString(),
          isCancelRequested: detail.isCancelRequested,
          cancelRequestedReason: detail.cancelRequestedReason,
          assignedStaff: detail.assignedStaff || [],
          bookingPartner: detail.bookingPartner,
          agencyId: detail.agencyId,
          agencyName: detail.agencyName,
          agencyPhone: detail.agencyPhone,
          agencyAddress: detail.agencyAddress,
          muaId: detail.muaId,
          packageItems: detail.packageItems || [],
          componentItems: detail.componentItems || [],
          addonItems: detail.addonItems || [],
          completedAt: detail.completedAt,
          overtimeMinutes: detail.overtimeMinutes,
          overtimePay: detail.overtimePay != null ? Number(detail.overtimePay) : undefined,
          overtimeRuleName: detail.overtimeRuleName,
          overtimePolicyType: detail.overtimePolicyType,
        });
        setCurrentStatus(detail.status as BookingStatusType);
        if (detail.status === 'IN_PROGRESS') {
          let elapsed = 0;
          if (detail.inProgressElapsedSeconds !== undefined && detail.inProgressElapsedSeconds !== null) {
            elapsed = detail.inProgressElapsedSeconds;
          } else if (detail.updatedAt) {
            const startMs = new Date(detail.updatedAt).getTime();
            if (!isNaN(startMs)) {
              elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
            }
          }
          startedTimeRef.current = Date.now() - elapsed * 1000;
          setElapsedSeconds(elapsed);
        }
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
      if (nextStatus === 'IN_PROGRESS') {
        startedTimeRef.current = Date.now();
        setElapsedSeconds(0);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (nextStatus === 'COMPLETED') {
        Alert.alert(
          '🎉 Nghiệm Thu Thành Công!',
          'Ca làm việc đã hoàn tất. Khách hàng đang thực hiện thanh toán 70% còn lại (Tiền mặt hoặc qua Ví MoMo/VNPay). Bạn hãy theo dõi trạng thái thanh toán ngay tại màn hình này.',
          [
            {
              text: 'Theo Dõi Thanh Toán Tại Đây',
              style: 'default',
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

  const handleCaptureDisputeProof = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền Camera', 'Vui lòng cấp quyền Camera để chụp ảnh minh chứng tại hiện trường.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        await uploadDisputeProof(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể mở máy ảnh trên thiết bị.');
    }
  };

  const handlePickDisputeProof = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền Thư Viện', 'Vui lòng cấp quyền truy cập thư viện ảnh để chọn ảnh minh chứng.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        await uploadDisputeProof(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh.');
    }
  };

  const uploadDisputeProof = async (uri: string) => {
    // 1. Hiển thị ngay ảnh xem trước cục bộ để giao diện NGAY LẬP TỨC load ảnh lên
    setDisputeProofUrl(uri);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 2. Nếu đang ở tab Báo Bận Studio (Agency), ảnh sẽ được gửi trực tiếp
    // cùng với request /report-emergency-busy khi người dùng ấn nút nộp báo cáo
    if (cancelModalType === 'AGENCY_EMERGENCY_BUSY') {
      return;
    }

    // 3. Nếu ở tab Khách vắng mặt (Dispute), upload lên Cloudinary
    try {
      setIsUploadingProof(true);
      const res = await freelancerBookingService.uploadDisputeProof(bookingId, uri);
      const url = res?.completionPhotoUrl || res?.photoUrl || res?.thumbnailUrl;
      if (url) {
        setDisputeProofUrl(url);
      }
    } catch (e: any) {
      console.warn('Lỗi tải ảnh minh chứng dispute:', e);
      // Vẫn giữ lại uri cục bộ để người dùng xem được và gửi kèm
    } finally {
      setIsUploadingProof(false);
    }
  };

  // Xử lý Hủy ca hoặc Báo sự cố khách vắng mặt / Báo bận lên Studio
  const handleConfirmCancelOrDispute = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Lý Do Bắt Buộc', 'Vui lòng nhập hoặc chọn lý do cụ thể.');
      return;
    }

    if (cancelModalType === 'AGENCY_EMERGENCY_BUSY') {
      try {
        setIsSubmittingCancel(true);
        await agencyStaffService.reportEmergencyBusy(bookingId, {
          emergencyReason: cancelReason.trim(),
          proofImageUri: disputeProofUrl && !disputeProofUrl.startsWith('http') ? disputeProofUrl : undefined,
          proofDocumentUrl: disputeProofUrl && disputeProofUrl.startsWith('http') ? disputeProofUrl : undefined,
        });

        setIsCancelModalVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        Alert.alert(
          'Đã Báo Cáo Lên Studio (Agency)',
          'Quản lý Studio (Agency Admin) đã nhận được báo cáo bận khẩn cấp của bạn và sẽ tiến hành điều phối thợ khác thay thế phục vụ khách hàng.',
          [{ text: 'Về Bàn Làm Việc', onPress: navigateBackToWorkstation }]
        );
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Không thể gửi báo cáo bận lên Studio.';
        Alert.alert('Thất Bại', msg);
      } finally {
        setIsSubmittingCancel(false);
      }
      return;
    }

    const isDispute = cancelModalType === 'CUSTOMER_ABSENT_DISPUTE';

    // Nếu thợ báo khách vắng mặt / bỏ hẹn -> BẮT BUỘC CÓ ẢNH MINH CHỨNG
    if (isDispute && !disputeProofUrl.trim()) {
      Alert.alert(
        'Minh Chứng Bắt Buộc',
        'Vui lòng chụp ảnh hoặc tải ảnh minh chứng tại hiện trường (chụp trước cửa nhà/điểm hẹn hoặc màn hình cuộc gọi nhỡ) để Ban Quản Trị đối soát và duyệt giải ngân 100% tiền cọc cho bạn.'
      );
      return;
    }

    try {
      setIsSubmittingCancel(true);
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
          'Đã Báo Cáo Lên Admin',
          'Đơn hẹn đã được chuyển sang trạng thái chờ Admin phân xử (DISPUTED). Ban Quản Trị sẽ xác minh minh chứng khách vắng mặt/bỏ hẹn. Sau khi được phê duyệt, bạn sẽ nhận được 100% tiền cọc vào ví chuyên viên.',
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

  const handleConfirmScheduled = async () => {
    try {
      setIsTransitioning(true);
      await freelancerBookingService.confirmScheduledBooking(bookingId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Tiếp Nhận Thành Công', 'Bạn đã đồng ý tiếp nhận ca hẹn này.');
      await loadBookingDetail();
      useWorkstationStore.getState().fetchWorkstationData();
    } catch (err: any) {
      Alert.alert('Lỗi Tiếp Nhận', err?.response?.data?.message || err?.message || 'Không thể tiếp nhận ca hẹn.');
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleRejectScheduled = () => {
    Alert.alert(
      'Từ Chối Đơn Hẹn',
      'Bạn có chắc chắn muốn từ chối ca hẹn trang điểm này? Khoản tiền cọc bảo chứng sẽ được hoàn lại cho khách hàng.',
      [
        { text: 'Suy Nghĩ Lại', style: 'cancel' },
        {
          text: 'Từ Chối',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsTransitioning(true);
              await freelancerBookingService.rejectScheduledBooking(bookingId, 'Thợ bận lịch đột xuất không thể nhận');
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Đã Từ Chối Ca', `Bạn đã từ chối ca hẹn #${booking?.bookingCode || bookingId}. Toàn bộ 100% tiền cọc đã được hệ thống hoàn về ví của khách hàng.`);
              useWorkstationStore.getState().fetchWorkstationData();
              navigateBackToWorkstation();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể từ chối ca.');
            } finally {
              setIsTransitioning(false);
            }
          },
        },
      ]
    );
  };

  const handleStartMoving = () => {
    // Kiểm tra xem thợ phụ đã bấm xác nhận đơn hay chưa
    const assignedStaff = booking?.assignedStaff || [];
    const unconfirmedAssistants = assignedStaff.filter(
      (s: any) =>
        s.role === 'ASSISTANT_MUA' &&
        s.status !== 'REPLACED' &&
        s.status !== 'EMERGENCY_CANCELLED' &&
        !s.isConfirmedByStaff &&
        !s.confirmedAt
    );

    if (unconfirmedAssistants.length > 0) {
      const names = unconfirmedAssistants.map((s: any) => s.staffName).join(', ');
      Alert.alert(
        'Chưa Thể Di Chuyển',
        `Thợ phụ (${names}) chưa bấm xác nhận tiếp nhận đơn. Vui lòng đợi thợ phụ xác nhận trước khi bắt đầu di chuyển.`
      );
      return;
    }

    const isFutureDate = booking?.bookingDate && booking.bookingDate > getTodayVN();
    if (isFutureDate) {
      Alert.alert(
        'Bắt Đầu Di Chuyển?',
        `Ca hẹn này được lên lịch vào ngày ${formatDateVN(booking.bookingDate)} lúc ${booking.startTime || ''}. Bạn có chắc chắn muốn bắt đầu di chuyển ngay lúc này không?`,
        [
          { text: 'Chưa, Để Sau', style: 'cancel' },
          { text: 'Bắt Đầu Đi Ngay', onPress: () => handleTransitionState('ON_THE_WAY') },
        ]
      );
    } else {
      handleTransitionState('ON_THE_WAY');
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

  const performConfirmCashReceipt = async () => {
    try {
      setIsConfirmingCash(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await depositService.confirmWorkerCashReceipt(bookingId, 'v1');
      setCashReceiptConfirmed(true);
      setIsCashPromptModalVisible(false);
      setIsBothCashConfirmed(true);
      setCurrentStatus('PAID_OUT');
      setBooking((prev: any) => (prev ? { ...prev, status: 'PAID_OUT' } : prev));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Chờ modal đóng hoàn toàn trên iOS trước khi hiển thị Alert quyết toán thành công
      setTimeout(() => {
        const isAgency = booking?.bookingPartner === 'AGENCY' || booking?.bookingPartner === 'AGENCY_DISPATCH' || Boolean((booking as any)?.agencyId || (booking as any)?.agency);
        Alert.alert(
          'Quyết Toán Thành Công! 🎉',
          isAgency
            ? 'Xác nhận đã nhận đủ 70% tiền mặt thành công. Ca làm đã hoàn tất 100% và khoản cọc Escrow đã được quyết toán vào Ví Studio.'
            : 'Xác nhận đã nhận đủ 70% tiền mặt thành công. Ca làm đã hoàn tất 100% và khoản cọc Escrow (sau khi trừ phí sàn) đã được quyết toán vào Ví của bạn.',
          isAgency
            ? [{ text: 'Đóng' }]
            : [
                { text: 'Xem Ví Thợ', onPress: () => router.replace('/profile/freelancer-wallet') },
                { text: 'Đóng' }
              ]
        );
      }, 350);
      loadBookingDetail();
    } catch (err: any) {
      console.error('[CashReceipt] Confirm worker cash failed:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể xác nhận tiền mặt.';
      setIsCashPromptModalVisible(false);
      setTimeout(() => {
        Alert.alert('Lỗi Xác Nhận', msg);
      }, 350);
    } finally {
      setIsConfirmingCash(false);
    }
  };

  const handlePromptConfirmCashReceipt = () => {
    const cashAmount = formatVnd(
      cashAmountExpected || (booking?.totalAmount ? Math.round(booking.totalAmount * 0.7) : 0)
    );
    Alert.alert(
      'Xác Nhận Đã Nhận Đủ Tiền Mặt',
      `Bạn xác nhận đã nhận đủ ${cashAmount} tiền mặt trực tiếp từ khách hàng?\n\nCa làm sẽ được quyết toán 100% ngay lập tức và giải ngân khoản cọc Escrow (sau khi trừ phí sàn) vào ví chuyên viên của bạn.`,
      [
        { text: 'Chưa, Để Sau', style: 'cancel' },
        {
          text: 'Đã Nhận Đủ - Quyết Toán',
          style: 'default',
          onPress: performConfirmCashReceipt,
        },
      ]
    );
  };

  const handleConfirmCashReceipt = handlePromptConfirmCashReceipt;

  const handleDeclineCashReceipt = async () => {
    try {
      setIsConfirmingCash(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await depositService.declineWorkerCashReceipt(bookingId, 'Chuyên viên báo chưa nhận được tiền mặt');
      setIsCashPromptModalVisible(false);
      setTimeout(() => {
        Alert.alert(
          'Đã Báo Chưa Nhận Tiền',
          'Hệ thống đã thông báo tới khách hàng là bạn chưa nhận được tiền mặt. Khách hàng sẽ kiểm tra lại hoặc đổi phương thức thanh toán.'
        );
      }, 350);
      loadBookingDetail(true);
    } catch (err: any) {
      console.error('[CashReceipt] Decline cash failed:', err);
      setIsCashPromptModalVisible(false);
    } finally {
      setIsConfirmingCash(false);
    }
  };

  // Xử lý khi khách hàng yêu cầu hủy chuyến: Thợ Đồng ý và nhận 100% bồi thường cọc
  const handleAcceptCustomerCancel = async () => {
    try {
      setIsHandlingCancelAction(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await bookingService.confirmCancelCompensation(bookingId);
      setIsCancelRequestModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Đã Đồng Ý Hủy & Nhận Bồi Thường',
        `Bạn đã nhận được 100% tiền cọc (${formatVnd(booking?.depositAmount || 0)}) vào ví chuyên viên. Ca làm đã kết thúc và bạn sẵn sàng nhận đơn mới!`,
        [{ text: 'Về Bàn Làm Việc', onPress: navigateBackToWorkstation }]
      );
    } catch (err: any) {
      Alert.alert('Lỗi Xác Nhận', err?.response?.data?.message || err?.message || 'Không thể xác nhận hủy đơn.');
    } finally {
      setIsHandlingCancelAction(false);
    }
  };

  // Xử lý khi khách hàng yêu cầu hủy chuyến: Thợ Từ chối hủy (tiếp tục di chuyển)
  const handleRejectCustomerCancel = async () => {
    try {
      setIsHandlingCancelAction(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await bookingService.rejectCancelCompensation(bookingId, 'Chuyên viên make-up đang trên đường di chuyển và sắp tới điểm hẹn.');
      setIsCancelRequestModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Đã Từ Chối Hủy Đơn',
        'Đã thông báo tới khách hàng. Ca làm vẫn tiếp tục, vui lòng tiếp tục di chuyển tới điểm hẹn theo lịch trình.'
      );
      loadBookingDetail();
    } catch (err: any) {
      Alert.alert('Lỗi Từ Chối', err?.response?.data?.message || err?.message || 'Không thể từ chối hủy.');
    } finally {
      setIsHandlingCancelAction(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#E11D48" />
        <Text style={styles.loadingText}>Đang nạp thông tin ca làm...</Text>
      </SafeAreaView>
    );
  }

  const isDisputeMode = currentStatus === 'ARRIVED' || currentStatus === 'IN_PROGRESS';
  const isPostCompletion = Boolean(
    booking?.completionPhotoUrl ||
    booking?.completedAt ||
    (booking?.cancellationReason && (
      booking.cancellationReason.toLowerCase().includes('sau ca') ||
      booking.cancellationReason.toLowerCase().includes('tổng tiền đơn') ||
      booking.cancellationReason.toLowerCase().includes('chất lượng') ||
      booking.cancellationReason.toLowerCase().includes('thù lao ca làm') ||
      booking.cancellationReason.toLowerCase().includes('bảo lưu thù lao') ||
      booking.cancellationReason.toLowerCase().includes('công nhận giải trình')
    ))
  );
  const canCancelOrDispute =
    currentStatus !== 'REQUESTED' &&
    currentStatus !== 'COMPLETED' &&
    currentStatus !== 'PAID_OUT' &&
    currentStatus !== 'CANCELLED' &&
    currentStatus !== 'DISPUTED' &&
    currentStatus !== 'DISPUTE_REFUNDED' &&
    currentStatus !== 'DISPUTE_COMPENSATED';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={navigateBackToWorkstation}>
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

      {/* BANNER CẢNH BÁO NỔI KHI KHÁCH ĐANG YÊU CẦU HỦY ĐƠN */}
      {booking?.isCancelRequested && !isCancelRequestModalVisible && (
        <TouchableOpacity
          style={styles.stickyCancelNoticeBar}
          onPress={() => setIsCancelRequestModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
          <Text style={styles.stickyCancelNoticeText} numberOfLines={1}>
            Khách yêu cầu hủy (Bồi thường {formatVnd(booking?.depositAmount || 0)})
          </Text>
          <View style={styles.stickyCancelNoticeBtn}>
            <Text style={styles.stickyCancelNoticeBtnText}>Xử Lý</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* BANNER CẢNH BÁO NỔI KHI ĐƠN ĐANG KHIẾU NẠI (DISPUTED) */}
      {(currentStatus === 'DISPUTED' || booking?.status === 'DISPUTED') && (
        <TouchableOpacity
          style={[styles.stickyCancelNoticeBar, { backgroundColor: '#EA580C' }]}
          onPress={() => setIsDisputeDossierOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="scale-outline" size={20} color="#FFFFFF" />
          <Text style={styles.stickyCancelNoticeText} numberOfLines={1}>
            {isPostCompletion
              ? 'Đơn đang khiếu nại (Chờ phân xử chất lượng)'
              : `Đơn đang khiếu nại (Cọc ${formatVnd(booking?.depositAmount || 0)} bảo chứng)`}
          </Text>
          <View style={[styles.stickyCancelNoticeBtn, { backgroundColor: '#FFFFFF' }]}>
            <Text style={[styles.stickyCancelNoticeBtnText, { color: '#EA580C' }]}>Xem Chi Tiết</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* BANNER CẢNH BÁO PHÂN CÔNG THỢ CHÍNH / THỢ PHỤ / BÁO BẬN */}
      {isMyAssignmentBusy ? (
        <View style={[styles.stickyCancelNoticeBar, { backgroundColor: '#D97706' }]}>
          <Ionicons name="hourglass" size={18} color="#FFFFFF" />
          <Text style={styles.stickyCancelNoticeText} numberOfLines={2}>
            Bạn đã báo bận cho ca làm này. Studio đang xử lý duyệt và điều phối.
          </Text>
        </View>
      ) : isPendingMyConfirmation ? (
        <View style={[styles.stickyCancelNoticeBar, { backgroundColor: '#B45309' }]}>
          <Ionicons name="information-circle" size={18} color="#FFFFFF" />
          <Text style={styles.stickyCancelNoticeText} numberOfLines={2}>
            Studio đã phân công bạn làm {isPrimaryRole ? 'Thợ Chính' : 'Thợ Phụ'}{myAssignment?.commissionRate ? ` (${myAssignment.commissionRate}% hoa hồng)` : ''}. Vui lòng bấm tiếp nhận bên dưới.
          </Text>
        </View>
      ) : isAssistantRole ? (
        <View style={[styles.stickyCancelNoticeBar, { backgroundColor: '#227eceff' }]}>
          <Ionicons name="people" size={18} color="#FFFFFF" />
          <Text style={styles.stickyCancelNoticeText} numberOfLines={1}>
            Bạn tham gia với vai trò Thợ Phụ{myAssignment?.commissionRate ? ` (${myAssignment.commissionRate}% hoa hồng)` : ''} • Đã tiếp nhận ca
          </Text>
        </View>
      ) : isPrimaryRole && (booking?.assignedStaff || []).some((s: any) => s.role === 'ASSISTANT_MUA' && s.status !== 'REPLACED' && s.status !== 'EMERGENCY_CANCELLED' && !s.isConfirmedByStaff && !s.confirmedAt) ? (
        <View style={[styles.stickyCancelNoticeBar, { backgroundColor: '#D97706' }]}>
          <Ionicons name="hourglass" size={18} color="#FFFFFF" />
          <Text style={styles.stickyCancelNoticeText} numberOfLines={2}>
            Bạn đã tiếp nhận (Thợ Chính). Đang chờ thợ phụ xác nhận để bắt đầu di chuyển.
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ========================================================================= */}
        {/* GIAO DIỆN CHUYÊN BIỆT: YÊU CẦU ĐẶT HẸN TRƯỚC CHỜ THỢ XÁC NHẬN (REQUESTED)  */}
        {/* ========================================================================= */}
        {currentStatus === 'REQUESTED' && (
          <View style={styles.waitingContainer}>
            <View style={[styles.waitingTimerBox, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB', padding: 18, alignItems: 'center' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 12 }}>
                <Ionicons name="calendar" size={16} color="#D97706" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Yêu Cầu Đặt Lịch Hẹn Trước
                </Text>
              </View>

              <Text style={[styles.waitingNoticeTitle, { color: '#92400E', fontSize: 17, marginBottom: 6 }]}>
                Khách hàng đã đặt cọc và đang chờ bạn tiếp nhận!
              </Text>
              <Text style={[styles.waitingNoticeSub, { lineHeight: 18 }]}>
                Khoản cọc đã được bảo chứng an toàn qua quỹ Escrow. Vui lòng kiểm tra lịch trình bên dưới và bấm TIẾP NHẬN CA HẸN để xác nhận phục vụ khách.
              </Text>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* GIAO DIỆN CHUYÊN BIỆT: CA ĐƯỢC STUDIO ĐIỀU PHỐI (AGENCY_ASSIGNED)         */}
        {/* ========================================================================= */}
        {currentStatus === 'AGENCY_ASSIGNED' && (
          <View style={styles.waitingContainer}>
            <View style={[styles.waitingTimerBox, { borderColor: '#BAE6FD', backgroundColor: '#F0F9FF', padding: 18, alignItems: 'center' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 12 }}>
                <Ionicons name="business" size={16} color="#0284C7" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0369A1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Studio Phân Công Ca Làm
                </Text>
              </View>

              <Text style={[styles.waitingNoticeTitle, { color: '#0369A1', fontSize: 17, marginBottom: 4 }]}>
                {isPendingMyConfirmation
                  ? `Bạn được phân công làm ${isPrimaryRole ? 'Thợ Chính' : 'Thợ Phụ'}!`
                  : isAssistantRole
                    ? 'Bạn đã tiếp nhận ca với vai trò Thợ Phụ'
                    : (booking?.assignedStaff || []).some((s: any) => s.role === 'ASSISTANT_MUA' && s.status !== 'REPLACED' && s.status !== 'EMERGENCY_CANCELLED' && !s.isConfirmedByStaff && !s.confirmedAt)
                      ? 'Đã tiếp nhận Thợ Chính • Chờ thợ phụ xác nhận'
                      : 'Đã sẵn sàng thực hiện ca làm Studio!'}
              </Text>

              {myAssignment?.commissionRate ? (
                <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D4ED8' }}>
                    Hoa hồng phân bổ: {myAssignment.commissionRate}% giá trị đơn
                  </Text>
                </View>
              ) : null}

              <Text style={[styles.waitingNoticeSub, { marginTop: 4, lineHeight: 18 }]}>
                {isPendingMyConfirmation
                  ? `Vui lòng kiểm tra kỹ thông tin dịch vụ, điểm hẹn bên dưới và bấm TIẾP NHẬN (${isPrimaryRole ? 'THỢ CHÍNH' : 'THỢ PHỤ'}) để tiếp nhận ca.`
                  : isAssistantRole
                    ? 'Bạn đã tiếp nhận thành công. Vui lòng chuẩn bị và đợi Thợ Chính bắt đầu di chuyển & quản lý ca làm.'
                    : (booking?.assignedStaff || []).some((s: any) => s.role === 'ASSISTANT_MUA' && s.status !== 'REPLACED' && s.status !== 'EMERGENCY_CANCELLED' && !s.isConfirmedByStaff && !s.confirmedAt)
                      ? 'Bạn đã tiếp nhận đơn. Đang đợi thợ phụ xác nhận để hệ thống mở khóa nút Bắt Đầu Di Chuyển.'
                      : 'Cả 2 thợ đã xác nhận thành công. Bạn có thể bấm Bắt Đầu Di Chuyển để đến điểm hẹn của khách hàng.'}
              </Text>
            </View>
          </View>
        )}

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
                <UserAvatar
                  uri={booking?.customerAvatar}
                  name={booking?.customerName}
                  size={48}
                  style={{ marginRight: 12 }}
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
              {(booking?.surchargeFee || 0) > 0 && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Phụ phí ca khẩn cấp (Thợ nhận 100%):</Text>
                  <Text style={styles.billValue}>+{formatVnd(booking?.surchargeFee || 0)}</Text>
                </View>
              )}
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

          <>
            {/* HERO CARD RIÊNG BIỆT DÀNH CHO ĐƠN ĐẶT LỊCH TRƯỚC (SCHEDULED) */}
            {isScheduled && (
              <View style={styles.scheduledHeroCard}>
                <View style={styles.scheduledHeroHeader}>
                  <View style={styles.scheduledHeroBadge}>
                    <Ionicons name="calendar-outline" size={13} color="#2563EB" />
                    <Text style={styles.scheduledHeroBadgeText}>LỊCH ĐẶT TRƯỚC</Text>
                  </View>
                  <View style={styles.scheduledHeroCodeBadge}>
                    <Text style={styles.scheduledHeroCode} numberOfLines={1}>{booking?.bookingCode}</Text>
                  </View>
                </View>

                <View style={styles.scheduledHeroBody}>
                  {(() => {
                    const timeInfo = formatScheduleOrCompletionTime(
                      booking?.startTime,
                      booking?.estimatedDurationMinutes || 60,
                      currentStatus,
                      booking?.completedAt
                    );
                    return (
                      <View style={styles.scheduledHeroTimeCol}>
                        <Text style={styles.scheduledHeroTimeLabel}>
                          {timeInfo.isCompleted ? 'Thời Gian Hoàn Thành' : 'Thời Gian Thực Hiện'}
                        </Text>
                        <Text style={styles.scheduledHeroTimeValue} numberOfLines={1} adjustsFontSizeToFit>
                          {timeInfo.timeRange}
                        </Text>
                        <Text style={styles.scheduledHeroDateValue} numberOfLines={1} adjustsFontSizeToFit>
                          {booking?.bookingDate ? formatDateVN(booking.bookingDate) : '--/--/----'} • {timeInfo.subText}
                        </Text>
                      </View>
                    );
                  })()}

                  <View style={styles.scheduledHeroDivider} />

                  <View style={styles.scheduledHeroServiceCol}>
                    <Text style={styles.scheduledHeroServiceLabel}>Gói Dịch Vụ</Text>
                    <Text style={styles.scheduledHeroServiceValue} numberOfLines={2}>
                      {booking?.packageName || 'Dịch vụ trang điểm'}
                    </Text>
                    {booking?.estimatedDurationMinutes ? (
                      <View style={styles.scheduledDurationPill}>
                        <Ionicons name="time-outline" size={11} color="#64748B" />
                        <Text style={styles.scheduledDurationPillText}>
                          {booking.estimatedDurationMinutes} phút
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.scheduledHeroTipRow}>
                  <Ionicons name="information-circle" size={15} color="#2563EB" />
                  <Text style={styles.scheduledHeroTipText}>
                    Ca đặt lịch trước: Vui lòng có mặt trước 15 phút tại địa chỉ khách hàng.
                  </Text>
                </View>
              </View>
            )}

            {/* HERO CARD RIÊNG BIỆT DÀNH CHO ĐƠN KHẨN CẤP (INSTANT) */}
            {isInstant && (
              <View style={styles.instantHeroCard}>
                <View style={styles.instantHeroHeader}>
                  <View style={styles.instantHeroBadge}>
                    <Text style={styles.instantHeroBadgeText}>CA KHẨN CẤP (30-60P)</Text>
                  </View>
                  <View style={styles.instantHeroCodeBadge}>
                    <Text style={styles.instantHeroCode} numberOfLines={1}>{booking?.bookingCode}</Text>
                  </View>
                </View>

                <View style={styles.instantHeroBody}>
                  {(() => {
                    const startStr = booking?.startTime || (booking?.createdAt ? formatTimeVN(booking.createdAt) : undefined);
                    const timeInfo = formatScheduleOrCompletionTime(
                      startStr,
                      booking?.estimatedDurationMinutes || 60,
                      currentStatus,
                      booking?.completedAt
                    );
                    return (
                      <View style={styles.instantHeroTimeCol}>
                        <Text style={styles.instantHeroTimeLabel}>
                          {timeInfo.isCompleted ? 'Hoàn Thành' : 'Thời Gian Thực Hiện'}
                        </Text>
                        <Text style={styles.instantHeroTimeValue} numberOfLines={1} adjustsFontSizeToFit>
                          {timeInfo.timeRange}
                        </Text>
                        <Text style={styles.instantHeroSubValue} numberOfLines={1} adjustsFontSizeToFit>
                          {timeInfo.subText}
                        </Text>
                      </View>
                    );
                  })()}

                  <View style={styles.instantHeroDivider} />

                  <View style={styles.instantHeroServiceCol}>
                    <Text style={styles.instantHeroServiceLabel}>Phụ Phí Khẩn Cấp</Text>
                    <Text style={styles.instantHeroFeeValue}>
                      +{formatVnd(booking?.surchargeFee || 150000)}
                    </Text>
                    <View style={styles.instantBonusPill}>
                      <Ionicons name="gift-outline" size={11} color="#B45309" />
                      <Text style={styles.instantBonusPillText}>Thợ nhận 100%</Text>
                    </View>
                  </View>
                </View>


              </View>
            )}

            {/* Step Progress Timeline - Chỉ hiển thị khi ca làm đã tiếp nhận và đang triển khai */}
            {currentStatus !== 'AGENCY_ASSIGNED' && currentStatus !== 'REQUESTED' && (
              <JobTimelineStep currentStatus={currentStatus} />
            )}

            {/* THẺ QUỸ BẢO CHỨNG ESCROW & XÁC NHẬN CỌC DÀNH CHO THỢ */}
            {isDepositPaid && (
              <View style={styles.escrowSecurityCard}>
                <View style={styles.escrowSecurityHeader}>
                  <View style={styles.escrowShieldBadge}>
                    <Ionicons name="shield-checkmark" size={20} color="#059669" />
                  </View>
                  <View style={styles.escrowTitleCol}>
                    <Text style={styles.escrowSecurityTitle} numberOfLines={1}>Quỹ Bảo Chứng Escrow</Text>
                    <Text style={styles.escrowSecuritySub} numberOfLines={1}>Khách đã cọc • Tiền bảo lưu an toàn qua sàn</Text>
                  </View>
                  <View style={styles.escrowStatusTag}>
                    <Ionicons name="lock-closed" size={10} color="#065F46" style={{ marginRight: 3 }} />
                    <Text style={styles.escrowStatusTagText}>ĐÃ CỌC 30%</Text>
                  </View>
                </View>

                <View style={styles.escrowDivider} />

                <View style={styles.escrowDetailsGrid}>
                  <View style={styles.escrowDetailItem}>
                    <Text style={styles.escrowDetailLabel} numberOfLines={1}>Tiền cọc Escrow (30%):</Text>
                    <Text style={styles.escrowDetailValueHighlight}>
                      {formatVnd(booking?.depositAmount !== undefined && booking?.depositAmount !== null ? Number(booking.depositAmount) : (booking?.totalAmount || 0) * 0.3)}
                    </Text>
                  </View>
                  <View style={styles.escrowDetailDivider} />
                  <View style={styles.escrowDetailItem}>
                    <Text style={styles.escrowDetailLabel} numberOfLines={1}>
                      {currentStatus === 'PAID_OUT' || cashReceiptConfirmed
                        ? 'Đã tất toán (100%):'
                        : 'Khoản còn lại (70%):'}
                    </Text>
                    <Text style={styles.escrowDetailValueCash}>
                      {formatVnd(Math.max(0, (booking?.totalAmount || 0) - (booking?.depositAmount !== undefined && booking?.depositAmount !== null ? Number(booking.depositAmount) : (booking?.totalAmount || 0) * 0.3)))}
                    </Text>
                  </View>
                </View>

                <View style={styles.escrowGuaranteeBox}>
                  <Ionicons name="shield-outline" size={15} color="#047857" style={{ marginTop: 1 }} />
                  <Text style={styles.escrowGuaranteeText}>
                    Khoản cọc 30% và thu nhập ca làm ({formatVnd(booking?.earningsAmount || 0)}) được sàn bảo chứng 100%, tự động giải ngân vào Ví của bạn ngay sau khi hoàn thành buổi làm đẹp. Khoản 70% còn lại khách có thể thanh toán trực tiếp hoặc qua cổng trực tuyến.
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
                    role="MUA"
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

            {/* THẺ ĐƠN HÀNG TỪ STUDIO & ĐỘI NGŨ THỰC HIỆN DÀNH RIÊNG CHO PHÍA THỢ */}
            {(Boolean(booking?.agencyId || booking?.agencyName || (booking?.assignedStaff && booking.assignedStaff.length > 0))) && (
              <View style={[styles.infoCard, { borderColor: '#BAE6FD', backgroundColor: '#F8FAFC' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name="business" size={20} color="#0284C7" />
                    <Text style={[styles.cardSectionTitle, { color: '#0369A1', marginBottom: 0 }]}>
                      Studio Điều Phối Ca Làm
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0369A1' }}>
                      {booking?.bookingPartner === 'AGENCY' || booking?.bookingPartner === 'AGENCY_DISPATCH' ? 'Đơn Studio' : 'Phân Công'}
                    </Text>
                  </View>
                </View>

                {/* Thông tin Studio */}
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4 }}>
                    {booking?.agencyName || 'Studio Làm Đẹp'}
                  </Text>
                  {booking?.agencyAddress && (
                    <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>
                      📍 {booking.agencyAddress}
                    </Text>
                  )}
                  {booking?.agencyPhone && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${booking.agencyPhone}`)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, alignSelf: 'flex-start' }}
                    >
                      <Ionicons name="call" size={14} color="#0284C7" />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0284C7' }}>
                        Hotline Studio: {booking.agencyPhone}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Danh sách Đội Ngũ Thực Hiện */}
                {(() => {
                  const isStaffBusy = (s: any) =>
                    s.status === 'EMERGENCY_CANCELLED' ||
                    s.status === 'REPORTED_BUSY_PENDING_APPROVAL' ||
                    (s.status === 'REPLACED' && Boolean(s.cancellationReason)) ||
                    (Boolean(s.cancellationReason) && !s.isConfirmedByStaff);

                  // Chỉ hiển thị các thợ thật sự đang được gán (ACTIVE/CONFIRMED) hoặc thợ đã từng gán mà báo bận
                  // Bỏ qua thợ bị thay thế thuần túy không có báo bận
                  const relevantStaff = (booking?.assignedStaff || []).filter((s: any) => {
                    if (s.status === 'ACTIVE' || s.status === 'CONFIRMED') return true;
                    if (isStaffBusy(s)) return true;
                    if (s.status === 'DECLINED') return true;
                    return false;
                  });

                  // Ưu tiên hiển thị: Thợ đang hoạt động lên trước (Thợ chính trước, thợ phụ sau), thợ báo bận xếp phía sau
                  const sortedStaff = [...relevantStaff].sort((a: any, b: any) => {
                    const aBusy = isStaffBusy(a) || a.status === 'DECLINED';
                    const bBusy = isStaffBusy(b) || b.status === 'DECLINED';
                    if (aBusy !== bBusy) return aBusy ? 1 : -1;
                    if (a.role === 'PRIMARY_MUA' && b.role !== 'PRIMARY_MUA') return -1;
                    if (b.role === 'PRIMARY_MUA' && a.role !== 'PRIMARY_MUA') return 1;
                    return 0;
                  });

                  const activeStaffCount = sortedStaff.filter((s: any) => !isStaffBusy(s) && s.status !== 'DECLINED').length;
                  const busyStaffCount = sortedStaff.filter((s: any) => isStaffBusy(s)).length;

                  return (
                    <>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 }}>
                        Đội Ngũ Thực Hiện ({activeStaffCount} chuyên viên{busyStaffCount > 0 ? ` - ${busyStaffCount} báo bận` : ''}):
                      </Text>

                      <View style={{ gap: 8 }}>
                        {sortedStaff.map((staff: any, idx: number) => {
                          const isSelf = Boolean(
                            (userInfo?.id && (staff.userId === userInfo.id || staff.staffId === userInfo.id)) ||
                            (userInfo?.muaId && (staff.muaId === userInfo.muaId || staff.staffId === userInfo.muaId)) ||
                            (profile?.muaId && (staff.muaId === profile.muaId || staff.staffId === profile.muaId)) ||
                            (userInfo?.phoneNumber && staff.staffPhone && staff.staffPhone.replace(/\D/g, '') === userInfo.phoneNumber.replace(/\D/g, ''))
                          );
                          const isPrimary = staff.role === 'PRIMARY_MUA';
                          const isBusy = isStaffBusy(staff);
                          const isDeclined = staff.status === 'DECLINED';
                          const isConfirmed = !isBusy && !isDeclined && Boolean(staff.isConfirmedByStaff || staff.confirmedAt || staff.status === 'CONFIRMED');

                          return (
                            <View
                              key={staff.id || idx}
                              style={{
                                backgroundColor: isSelf ? '#F0FDF4' : (isBusy ? '#FFF7ED' : '#FFFFFF'),
                                borderRadius: 10,
                                padding: 10,
                                borderWidth: 1,
                                borderColor: isSelf ? '#86EFAC' : (isBusy ? '#FED7AA' : '#E2E8F0'),
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                opacity: isBusy ? 0.92 : 1,
                              }}
                            >
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={{ fontSize: 14, fontWeight: '700', color: isBusy ? '#475569' : '#0F172A' }}>
                                    {staff.staffName || 'Chuyên viên'}
                                  </Text>
                                  {isSelf && (
                                    <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#15803D' }}>Bạn</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                  {staff.staffPhone || '---'}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                  <View
                                    style={{
                                      backgroundColor: isBusy ? '#FEE2E2' : (isPrimary ? '#FEF3C7' : '#EFF6FF'),
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      borderRadius: 4,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 10,
                                        fontWeight: '700',
                                        color: isBusy ? '#B91C1C' : (isPrimary ? '#B45309' : '#2563EB'),
                                      }}
                                    >
                                      {isPrimary ? (isBusy ? 'Thợ Chính (Đã báo bận)' : 'Thợ Chính') : (isBusy ? 'Thợ Phụ (Đã báo bận)' : 'Thợ Phụ')}
                                      {staff.commissionRate !== undefined && staff.commissionRate !== null ? ` (${staff.commissionRate}%)` : ''}
                                    </Text>
                                  </View>
                                </View>
                                {isBusy && Boolean(staff.cancellationReason) && (
                                  <Text style={{ fontSize: 11, color: '#B45309', marginTop: 3, fontStyle: 'italic' }}>
                                    Lý do: {staff.cancellationReason}
                                  </Text>
                                )}
                              </View>

                              <View style={{ alignItems: 'flex-end' }}>
                                {isBusy ? (
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                      backgroundColor: '#FEF2F2',
                                      borderColor: '#FECACA',
                                      borderWidth: 1,
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: 6,
                                    }}
                                  >
                                    <Ionicons name="alert-circle" size={12} color="#DC2626" />
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        fontWeight: '700',
                                        color: '#DC2626',
                                      }}
                                    >
                                      Báo bận
                                    </Text>
                                  </View>
                                ) : isDeclined ? (
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                      backgroundColor: '#F1F5F9',
                                      borderColor: '#CBD5E1',
                                      borderWidth: 1,
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: 6,
                                    }}
                                  >
                                    <Ionicons name="close-circle-outline" size={12} color="#64748B" />
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        fontWeight: '700',
                                        color: '#64748B',
                                      }}
                                    >
                                      Đã từ chối
                                    </Text>
                                  </View>
                                ) : (
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                      backgroundColor: isConfirmed ? '#ECFDF5' : '#FFFBEB',
                                      borderColor: isConfirmed ? '#A7F3D0' : '#FDE68A',
                                      borderWidth: 1,
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: 6,
                                    }}
                                  >
                                    <Ionicons
                                      name={isConfirmed ? 'checkmark-circle' : 'time-outline'}
                                      size={12}
                                      color={isConfirmed ? '#059669' : '#D97706'}
                                    />
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        fontWeight: '700',
                                        color: isConfirmed ? '#059669' : '#D97706',
                                      }}
                                    >
                                      {isConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </>
                  );
                })()}
              </View>
            )}

            {/* Service & Client Card */}
            <View style={styles.infoCard}>
              <Text style={styles.cardSectionTitle}>Thông Tin Dịch Vụ</Text>
              <Text style={styles.packageName}>{booking?.packageName}</Text>

              {/* Service details: Required / standard package items & Add-ons */}
              {((booking?.componentItems && booking.componentItems.length > 0) ||
                (booking?.addonItems && booking.addonItems.length > 0) ||
                (booking?.packageItems && booking.packageItems.length > 0)) && (
                <View style={{ marginTop: 8, marginBottom: 8, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' }}>
                  {((booking?.componentItems && booking.componentItems.length > 0) ? booking.componentItems : (booking?.packageItems || [])).length > 0 && (
                    <View style={{ marginBottom: (booking?.addonItems && booking.addonItems.length > 0) ? 8 : 0 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                        Dịch vụ gói chuẩn
                      </Text>
                      {((booking?.componentItems && booking.componentItems.length > 0) ? booking.componentItems : (booking?.packageItems || [])).map((item, idx) => (
                        <View key={`comp-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
                          <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 13, color: '#334155' }}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {booking?.addonItems && booking.addonItems.length > 0 && (
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#6366F1', textTransform: 'uppercase', marginBottom: 4 }}>
                        Dịch vụ bổ sung (Add-on)
                      </Text>
                      {booking.addonItems.map((item, idx) => (
                        <View key={`addon-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
                          <Ionicons name="add-circle" size={14} color="#6366F1" style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: '600' }}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

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

              {(booking?.surchargeFee || 0) > 0 && (
                <View style={styles.financeRow}>
                  <Text style={styles.financeLabel}>Phụ phí ca khẩn cấp:</Text>
                  <Text style={styles.financeValue}>{formatVnd(booking?.surchargeFee || 0)}</Text>
                </View>
              )}

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

              {/* Phụ cấp làm thêm giờ nếu đơn áp dụng quy tắc tăng ca */}
              {(booking?.overtimePay || 0) > 0 && (
                <View style={[styles.financeRow, { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, marginVertical: 3 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="time" size={14} color="#16A34A" style={{ marginRight: 4 }} />
                    <Text style={[styles.financeLabel, { color: '#15803D', fontWeight: '600' }]}>
                      Phụ cấp làm thêm giờ {booking?.overtimeMinutes ? `(+${booking.overtimeMinutes}p)` : ''}:
                    </Text>
                  </View>
                  <Text style={[styles.financeValue, { color: '#15803D', fontWeight: '700' }]}>
                    +{formatVnd(booking?.overtimePay || 0)}
                  </Text>
                </View>
              )}

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
        {isMyAssignmentBusy ? (
          <View style={{ flex: 1, backgroundColor: '#FFFBEB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="hourglass-outline" size={18} color="#B45309" />
            <Text style={{ flex: 1, fontSize: 13, color: '#B45309', fontWeight: '500' }}>
              Bạn đã gửi báo bận cho ca làm này. Vui lòng chờ Studio xử lý duyệt.
            </Text>
          </View>
        ) : currentStatus === 'REQUESTED' ? (
          /* ========================================================================= */
          /* NÚT HÀNH ĐỘNG KHI ĐƠN HẸN ĐANG CHỜ THỢ XÁC NHẬN (REQUESTED)                */
          /* ========================================================================= */
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelSecondaryBtn}
              onPress={handleRejectScheduled}
              disabled={isTransitioning}
            >
              <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.cancelSecondaryBtnText}>Từ Chối</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: '#059669' }, isTransitioning && styles.disabledBtn]}
                onPress={handleConfirmScheduled}
                disabled={isTransitioning}
              >
                {isTransitioning ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.btnText}>TIẾP NHẬN CA HẸN</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : isPendingMyConfirmation ? (
          /* ========================================================================= */
          /* TH1: CHUYÊN VIÊN CHƯA BẤM TIẾP NHẬN PHÂN CÔNG (THỢ CHÍNH HOẶC THỢ PHỤ)    */
          /* ========================================================================= */
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.cancelSecondaryBtn, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
              onPress={handleDeclineMyAssignment}
              disabled={isDecliningSolo || isConfirmingSolo}
            >
              {isDecliningSolo ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                  <Text style={[styles.cancelSecondaryBtnText, { color: '#DC2626' }]}>Từ Chối</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cancelSecondaryBtn,
                { borderColor: '#FED7AA', backgroundColor: '#FFF7ED' }
              ]}
              onPress={() => {
                setCancelModalType(isAgencyBooking ? 'AGENCY_EMERGENCY_BUSY' : 'MUA_CANCEL');
                setCancelReason('');
                setDisputeProofUrl('');
                setIsCancelModalVisible(true);
              }}
              disabled={isDecliningSolo || isConfirmingSolo}
            >
              <Ionicons name="warning-outline" size={16} color="#EA580C" />
              <Text style={[styles.cancelSecondaryBtnText, { color: '#EA580C' }]}>Báo Bận</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={[
                  styles.primaryActionBtn,
                  { backgroundColor: isPrimaryRole ? '#059669' : '#2563EB' },
                  isConfirmingSolo && styles.disabledBtn
                ]}
                onPress={handleConfirmMyAssignment}
                disabled={isDecliningSolo || isConfirmingSolo}
              >
                {isConfirmingSolo ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.btnText}>
                      {isPrimaryRole ? 'NHẬN THỢ CHÍNH' : 'NHẬN THỢ PHỤ'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : isAssistantRole ? (
          /* ========================================================================= */
          /* TH2: THỢ PHỤ ĐÃ TIẾP NHẬN - CHỈ ĐỢI THỢ CHÍNH CẬP NHẬT TIẾN ĐỘ            */
          /* ========================================================================= */
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
              <Text style={{ flex: 1, fontSize: 12, color: '#1E40AF', fontWeight: '500' }}>
                Đã tiếp nhận vai trò Thợ Phụ{myAssignment?.commissionRate ? ` (${myAssignment.commissionRate}% hoa hồng)` : ''}. Tiến độ di chuyển & hoàn thành do Thợ Chính cập nhật.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.cancelSecondaryBtn, { width: '100%', borderColor: '#CBD5E1' }]}
              onPress={() => {
                setCancelModalType(isAgencyBooking ? 'AGENCY_EMERGENCY_BUSY' : 'MUA_CANCEL');
                setCancelReason('');
                setDisputeProofUrl('');
                setIsCancelModalVisible(true);
              }}
              disabled={isTransitioning}
            >
              <Ionicons name="warning-outline" size={16} color="#DC2626" />
              <Text style={styles.cancelSecondaryBtnText}>Báo Bận Khẩn Cấp</Text>
            </TouchableOpacity>
          </View>
        ) : currentStatus === 'ACCEPTED' && !isDepositPaid ? (
          /* ========================================================================= */
          /* TH3: CA ĐẶT KHẨN CẤP CHỜ KHÁCH ĐẶT CỌC 30% (10 PHÚT)                      */
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
          /* TH4: THỢ CHÍNH QUẢN LÝ TIẾN TRÌNH CA LÀM (DI CHUYỂN, CHECK-IN, LÀM VIỆC)   */
          /* ========================================================================= */
          <View style={styles.actionRow}>
                {canCancelOrDispute && (
                  <TouchableOpacity
                    style={styles.cancelSecondaryBtn}
                    onPress={() => {
                      setCancelModalType(isAgencyBooking ? 'AGENCY_EMERGENCY_BUSY' : 'CUSTOMER_ABSENT_DISPUTE');
                      setCancelReason('');
                      setDisputeProofUrl('');
                      setIsCancelModalVisible(true);
                    }}
                  >
                    <Ionicons
                      name={isAgencyBooking ? 'warning-outline' : isDisputeMode ? 'alert-circle-outline' : 'warning-outline'}
                      size={16}
                      color="#E11D48"
                    />
                    <Text style={styles.cancelSecondaryBtnText}>
                      {isAgencyBooking ? 'Báo Bận / Sự Cố' : isDisputeMode ? 'Báo Sự Cố' : 'Báo Vắng / Hủy'}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={{ flex: 1 }}>
                  {(currentStatus === 'ACCEPTED' || currentStatus === 'AGENCY_ASSIGNED') && (() => {
                    const unconfirmedAssistants = (booking?.assignedStaff || []).filter(
                      (s: any) =>
                        s.role === 'ASSISTANT_MUA' &&
                        s.status !== 'REPLACED' &&
                        s.status !== 'EMERGENCY_CANCELLED' &&
                        !s.isConfirmedByStaff &&
                        !s.confirmedAt
                    );
                    return (
                      <View style={{ gap: 6 }}>
                        {unconfirmedAssistants.length > 0 && (
                          <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' }}>
                            <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '500' }}>
                              ⚠️ Chờ thợ phụ ({unconfirmedAssistants.map((s: any) => s.staffName).join(', ')}) xác nhận để bắt đầu di chuyển
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.primaryActionBtn,
                            { backgroundColor: unconfirmedAssistants.length > 0 ? '#9CA3AF' : '#059669' },
                            (isTransitioning || unconfirmedAssistants.length > 0) && styles.disabledBtn
                          ]}
                          onPress={handleStartMoving}
                          disabled={isTransitioning || unconfirmedAssistants.length > 0}
                        >
                          {isTransitioning ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons name="bicycle-outline" size={20} color="#FFFFFF" />
                              <Text style={styles.btnText}>
                                {unconfirmedAssistants.length > 0 ? 'CHỜ THỢ PHỤ XÁC NHẬN' : 'BẮT ĐẦU DI CHUYỂN (GPS)'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })()}

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
                          <Ionicons name="brush" size={18} color="#FFFFFF" />
                          <Text style={styles.btnText}>BẮT ĐẦU TRANG ĐIỂM</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {currentStatus === 'IN_PROGRESS' && (
                    <View style={{ gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.completeActionBtn, isTransitioning && styles.disabledBtn]}
                        onPress={() => setIsCameraVisible(true)}
                        disabled={isTransitioning}
                      >
                        <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.btnText}>CHỤP ẢNH NGHIỆM THU</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.overtimeReportBtn}
                        onPress={() => setIsOvertimeModalVisible(true)}
                      >
                        <Text style={styles.overtimeReportBtnText}>Giải trình làm quá giờ</Text>
                      </TouchableOpacity>
                    </View>
                  )}

              {(currentStatus === 'COMPLETED' || currentStatus === 'PAID_OUT') && (
                <View style={{ gap: 10 }}>
                  {currentStatus === 'PAID_OUT' ? (
                    <View style={[styles.completedBadgeBar, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1 }]}>
                      <Ionicons name="checkmark-done-circle" size={24} color="#059669" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.completedBadgeText, { color: '#065F46', fontWeight: '800' }]}>
                          Đã Hoàn Tất & Quyết Toán 100%!
                        </Text>
                        <Text style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                          Thu nhập dịch vụ đã được cộng thành công vào Ví khả dụng của bạn.
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.completedBadgeBar, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD', borderWidth: 1 }]}>
                      <Ionicons name="time" size={20} color="#0284C7" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.completedBadgeText, { color: '#0369A1', fontWeight: '800' }]}>
                          Chờ Khách Thanh Toán 70% Còn Lại
                        </Text>
                        <Text style={{ fontSize: 12, color: '#0284C7', marginTop: 2 }}>
                          Khách có thể trả tiền mặt hoặc quét ví MoMo/VNPay. Hệ thống sẽ tự động quyết toán vào Ví ngay khi nhận được.
                        </Text>
                      </View>
                    </View>
                  )}

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

                  {currentStatus === 'PAID_OUT' ? (
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, { backgroundColor: BrandColors.primary }]}
                      onPress={navigateBackToWorkstation}
                    >
                      <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                      <Text style={styles.btnText}>HOÀN TẤT & VỀ BÀN LÀM VIỆC</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.cancelSecondaryBtn, { borderColor: '#CBD5E1', marginTop: 4 }]}
                    onPress={() => router.replace('/profile/freelancer-wallet')}
                  >
                    <Ionicons name="wallet-outline" size={16} color="#475569" />
                    <Text style={[styles.cancelSecondaryBtnText, { color: '#475569' }]}>
                      Kiểm Tra Ví Thợ & Số Dư
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cancelSecondaryBtn, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5', marginTop: 4 }]}
                    onPress={() => router.replace(`/booking/history-detail/${bookingId}` as any)}
                  >
                    <Ionicons name="receipt-outline" size={16} color="#059669" />
                    <Text style={[styles.cancelSecondaryBtnText, { color: '#059669', fontWeight: '700' }]}>
                      Xem Hóa Đơn & Chi Tiết Lịch Sử
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {currentStatus === 'DISPUTED' && (
                <View style={styles.muaDisputeCard}>
                  <View style={styles.muaDisputeHeader}>
                    <View style={styles.muaDisputeIconCircle}>
                      <Ionicons name="shield-outline" size={24} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.muaDisputeTitle}>CA ĐANG CHỜ ADMIN PHÂN XỬ</Text>
                      <Text style={styles.muaDisputeSubtitle}>
                        {isPostCompletion
                          ? 'Ban Quản Trị đang đối soát minh chứng để giải quyết khiếu nại chất lượng ca làm.'
                          : 'Ban Quản Trị đang đối soát minh chứng tại hiện trường để giải ngân 100% tiền cọc cho bạn.'}
                      </Text>
                    </View>
                  </View>

                  {(booking?.emergencyReason || booking?.cancellationReason) && (
                    <View style={styles.muaDisputeReasonBox}>
                      <Text style={styles.muaDisputeReasonLabel}>Lý do báo cáo sự cố:</Text>
                      <Text style={styles.muaDisputeReasonText}>
                        {booking?.emergencyReason || booking?.cancellationReason}
                      </Text>
                    </View>
                  )}

                  {(() => {
                    const disputeImages = parseDisputeProofImages(booking?.emergencyProofUrl || disputeProofUrl);
                    if (disputeImages.length === 0) return null;
                    return (
                      <View style={styles.muaDisputeProofBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={styles.muaDisputeProofLabel}>Ảnh minh chứng hiện trường ({disputeImages.length}):</Text>
                          <TouchableOpacity onPress={() => setIsDisputeDossierOpen(true)}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>Xem chi tiết</Text>
                          </TouchableOpacity>
                        </View>
                        {disputeImages.length === 1 ? (
                          <TouchableOpacity activeOpacity={0.9} onPress={() => setIsDisputeDossierOpen(true)}>
                            <Image
                              source={{ uri: disputeImages[0] }}
                              style={styles.muaDisputeProofImage}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ) : (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {disputeImages.map((imgUri, idx) => (
                              <TouchableOpacity key={idx} activeOpacity={0.85} onPress={() => setIsDisputeDossierOpen(true)}>
                                <Image
                                  source={{ uri: imgUri }}
                                  style={{ width: 220, height: 160, borderRadius: 10, backgroundColor: '#E2E8F0' }}
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    );
                  })()}

                  <TouchableOpacity
                    style={styles.viewDisputeDossierBtn}
                    onPress={() => setIsDisputeDossierOpen(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.viewDisputeDossierBtnText}>Xem Chi Tiết Lời Khai & Minh Chứng Hai Bên</Text>
                  </TouchableOpacity>

                  <View style={styles.muaDisputeFooterRow}>
                    <TouchableOpacity
                      style={styles.muaDisputeWalletBtn}
                      onPress={() => router.replace('/profile/freelancer-wallet')}
                    >
                      <Ionicons name="wallet-outline" size={16} color="#059669" />
                      <Text style={styles.muaDisputeWalletBtnText}>Ví Thu Nhập</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.muaDisputeHomeBtn}
                      onPress={navigateBackToWorkstation}
                    >
                      <Ionicons name="arrow-back-outline" size={16} color="#475569" />
                      <Text style={styles.muaDisputeHomeBtnText}>Bàn Làm Việc</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {currentStatus === 'DISPUTE_COMPENSATED' && (
                <View style={[styles.muaDisputeCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <View style={styles.muaDisputeHeader}>
                    <View style={[styles.muaDisputeIconCircle, { backgroundColor: '#D1FAE5', borderColor: '#059669' }]}>
                      <Ionicons name="shield-checkmark" size={24} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.muaDisputeTitle, { color: '#065F46' }]}>
                        {isPostCompletion
                          ? 'KHIẾU NẠI ĐÃ GIẢI QUYẾT • BÁC KHIẾU NẠI CỦA KHÁCH'
                          : 'KHIẾU NẠI ĐÃ GIẢI QUYẾT • ĐÃ BỒI THƯỜNG CỌC'}
                      </Text>
                      <Text style={[styles.muaDisputeSubtitle, { color: '#047857' }]}>
                        {isPostCompletion
                          ? `Admin đã công nhận giải trình của bạn và bác bỏ khiếu nại của khách. Toàn bộ thù lao ca làm việc (${formatVnd(booking?.totalAmount || 0)}) được bảo lưu nguyên vẹn, bạn không bị trừ tiền.`
                          : `Admin đã thẩm định minh chứng và bồi thường 100% tiền cọc (${formatVnd(booking?.depositAmount || 0)}) vào ví chuyên viên của bạn.`}
                      </Text>
                    </View>
                  </View>

                  {booking?.cancellationReason && (
                    <View style={[styles.muaDisputeReasonBox, { borderColor: '#A7F3D0' }]}>
                      <Text style={[styles.muaDisputeReasonLabel, { color: '#065F46' }]}>Căn cứ phán quyết Admin:</Text>
                      <Text style={styles.muaDisputeReasonText}>
                        {booking.cancellationReason}
                      </Text>
                    </View>
                  )}

                  {(booking?.emergencyProofUrl || disputeProofUrl) ? (
                    <View style={[styles.muaDisputeProofBox, { borderColor: '#A7F3D0' }]}>
                      <Text style={[styles.muaDisputeProofLabel, { color: '#065F46' }]}>Ảnh minh chứng hiện trường:</Text>
                      <Image
                        source={{ uri: booking?.emergencyProofUrl || disputeProofUrl }}
                        style={styles.muaDisputeProofImage}
                        resizeMode="cover"
                      />
                    </View>
                  ) : null}

                  <View style={styles.muaDisputeFooterRow}>
                    <TouchableOpacity
                      style={styles.muaDisputeWalletBtn}
                      onPress={() => router.replace('/profile/freelancer-wallet')}
                    >
                      <Ionicons name="wallet" size={16} color="#059669" />
                      <Text style={styles.muaDisputeWalletBtnText}>Kiểm Tra Ví Thu Nhập</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.muaDisputeHomeBtn}
                      onPress={() => router.replace(`/booking/history-detail/${bookingId}` as any)}
                    >
                      <Ionicons name="receipt-outline" size={16} color="#475569" />
                      <Text style={styles.muaDisputeHomeBtnText}>Xem Hóa Đơn</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {currentStatus === 'DISPUTE_REFUNDED' && (
                <View style={[styles.muaDisputeCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                  <View style={styles.muaDisputeHeader}>
                    <View style={[styles.muaDisputeIconCircle, { backgroundColor: '#FEF3C7', borderColor: '#D97706' }]}>
                      <Ionicons name="alert-circle" size={24} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.muaDisputeTitle, { color: '#92400E' }]}>
                        {isPostCompletion
                          ? 'KHIẾU NẠI ĐÃ GIẢI QUYẾT • CHẤP NHẬN KHIẾU NẠI CỦA KHÁCH'
                          : 'KHIẾU NẠI ĐÃ GIẢI QUYẾT • HOÀN CỌC CHO KHÁCH'}
                      </Text>
                      <Text style={[styles.muaDisputeSubtitle, { color: '#B45309' }]}>
                        {isPostCompletion
                          ? `Ban Quản Trị đã xem xét và chấp thuận khiếu nại của khách hàng, tiến hành hoàn 100% tiền đơn (${formatVnd(booking?.totalAmount || booking?.depositAmount || 0)}) cho khách. Ca làm không phát sinh thu nhập thợ.`
                          : 'Ban Quản Trị đã hoàn 100% tiền cọc cho khách hàng do sự cố khiếu nại. Ca hẹn đã khép lại và không phát sinh thu nhập thợ.'}
                      </Text>
                    </View>
                  </View>

                  {booking?.cancellationReason && (
                    <View style={styles.muaDisputeReasonBox}>
                      <Text style={styles.muaDisputeReasonLabel}>Căn cứ phán quyết Admin:</Text>
                      <Text style={styles.muaDisputeReasonText}>
                        {booking.cancellationReason}
                      </Text>
                    </View>
                  )}

                  <View style={styles.muaDisputeFooterRow}>
                    <TouchableOpacity
                      style={styles.muaDisputeHomeBtn}
                      onPress={navigateBackToWorkstation}
                    >
                      <Ionicons name="arrow-back-outline" size={16} color="#475569" />
                      <Text style={styles.muaDisputeHomeBtnText}>Về Bàn Làm Việc</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.muaDisputeHomeBtn, { backgroundColor: '#F8FAFC' }]}
                      onPress={() => router.replace(`/booking/history-detail/${bookingId}` as any)}
                    >
                      <Ionicons name="receipt-outline" size={16} color="#475569" />
                      <Text style={styles.muaDisputeHomeBtnText}>Xem Chi Tiết</Text>
                    </TouchableOpacity>
                  </View>
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
          setTimeout(() => {
            handleTransitionState('COMPLETED', photoUrl);
          }, 350);
        }}
      />

      {/* Modal Giải trình quá giờ dành cho thợ */}
      <OvertimeReportModal
        visible={isOvertimeModalVisible}
        bookingId={bookingId}
        bookingCode={booking?.bookingCode || id}
        actualMinutes={Math.floor(elapsedSeconds / 60)}
        estimatedMinutes={60}
        onClose={() => setIsOvertimeModalVisible(false)}
        onSuccess={() => {
          setIsOvertimeModalVisible(false);
        }}
      />

      {/* Cancellation / Dispute Modal (Đã bọc KeyboardAvoidingView chống che nút) */}
      {/* Cancellation / Dispute Modal (Cân đối chính giữa màn hình) */}
      <Modal
        visible={isCancelModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!isSubmittingCancel) setIsCancelModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.disputeModalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!isSubmittingCancel) setIsCancelModalVisible(false);
            }}
          />
          <View style={styles.disputeModalCard}>
            <View style={styles.disputeModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View
                  style={[
                    styles.disputeHeaderIconCircle,
                    cancelModalType === 'AGENCY_EMERGENCY_BUSY'
                      ? { backgroundColor: '#EFF6FF' }
                      : cancelModalType === 'CUSTOMER_ABSENT_DISPUTE'
                      ? { backgroundColor: '#FEF3C7' }
                      : { backgroundColor: '#FEE2E2' },
                  ]}
                >
                  <Ionicons
                    name={
                      cancelModalType === 'AGENCY_EMERGENCY_BUSY'
                        ? 'business'
                        : cancelModalType === 'CUSTOMER_ABSENT_DISPUTE'
                        ? 'warning'
                        : 'close-circle'
                    }
                    size={20}
                    color={
                      cancelModalType === 'AGENCY_EMERGENCY_BUSY'
                        ? '#2563EB'
                        : cancelModalType === 'CUSTOMER_ABSENT_DISPUTE'
                        ? '#D97706'
                        : '#E11D48'
                    }
                  />
                </View>
                <Text style={styles.disputeModalTitle} numberOfLines={1}>
                  {isAgencyBooking
                    ? 'Báo Cáo Sự Cố Lên Studio'
                    : cancelModalType === 'CUSTOMER_ABSENT_DISPUTE'
                    ? 'Báo Khách Vắng Mặt (Admin)'
                    : 'Xác Nhận Hủy Cả Đơn'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.disputeModalCloseBtn}
                onPress={() => setIsCancelModalVisible(false)}
                disabled={isSubmittingCancel}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingTop: 4, paddingBottom: 16 }}
            >
              {/* Chỉ hiển thị tabs lựa chọn với đơn thợ tự do (Freelancer), đơn Studio do Agency quản lý hoàn toàn */}
              {!isAgencyBooking && (
                <View style={styles.disputeTypeTabs}>
                  <TouchableOpacity
                    style={[
                      styles.disputeTypeTab,
                      cancelModalType === 'CUSTOMER_ABSENT_DISPUTE' && styles.disputeTypeTabActive,
                    ]}
                    onPress={() => {
                      setCancelModalType('CUSTOMER_ABSENT_DISPUTE');
                      setCancelReason('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.disputeTypeTabTitle,
                        cancelModalType === 'CUSTOMER_ABSENT_DISPUTE' && styles.disputeTypeTabTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      Khách Vắng Mặt
                    </Text>
                    <Text
                      style={[
                        styles.disputeTypeTabSub,
                        cancelModalType === 'CUSTOMER_ABSENT_DISPUTE' && styles.disputeTypeTabSubActive,
                      ]}
                      numberOfLines={1}
                    >
                      Báo lên Admin
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.disputeTypeTab,
                      cancelModalType === 'MUA_CANCEL' && styles.disputeTypeTabActive,
                    ]}
                    onPress={() => {
                      setCancelModalType('MUA_CANCEL');
                      setCancelReason('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.disputeTypeTabTitle,
                        cancelModalType === 'MUA_CANCEL' && styles.disputeTypeTabTitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      Thợ Tự Hủy Ca
                    </Text>
                    <Text
                      style={[
                        styles.disputeTypeTabSub,
                        cancelModalType === 'MUA_CANCEL' && { color: '#EF4444', fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      Hoàn cọc khách
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {cancelModalType === 'AGENCY_EMERGENCY_BUSY' ? (
                <>
                  {/* Chính sách thông báo lên Studio */}
                  <View style={[styles.disputePolicyCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Ionicons name="business" size={16} color="#2563EB" />
                      <Text style={[styles.disputePolicyTitle, { color: '#1E40AF' }]}>Báo Bận Lên Quản Lý Studio</Text>
                    </View>
                    <Text style={[styles.disputePolicyDesc, { color: '#1E3A8A' }]}>
                      Khi bạn gặp sự cố đột xuất (tai nạn, ốm đau, hỏng xe...), báo cáo sẽ được gửi trực tiếp đến Quản lý Studio ({booking?.agencyName || 'Agency Admin'}). Studio sẽ phân công thợ khác thay thế bạn phục vụ khách hàng mà không làm hủy đơn hẹn.
                    </Text>
                  </View>

                  {/* PHẦN TẢI LÊN ẢNH MINH CHỨNG */}
                  <View style={styles.proofSectionBox}>
                    <View style={styles.proofSectionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="camera" size={16} color="#2563EB" />
                        <Text style={[styles.proofSectionTitle, { color: '#1E40AF' }]}>ẢNH MINH CHỨNG SỰ CỐ</Text>
                      </View>
                      <Text style={[styles.proofSectionRequired, { color: '#64748B' }]}>Khuyến khích</Text>
                    </View>

                    <Text style={{ fontSize: 11.5, color: '#64748B', marginBottom: 10, lineHeight: 16 }}>
                      Đính kèm ảnh minh chứng sự cố (giấy tờ y tế, hiện trường giao thông...) giúp Studio duyệt thay thế nhanh hơn.
                    </Text>

                    {isUploadingProof ? (
                      <View style={{ paddingVertical: 18, alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator size="small" color="#2563EB" />
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1E40AF' }}>
                          Đang tải ảnh minh chứng lên máy chủ...
                        </Text>
                      </View>
                    ) : disputeProofUrl ? (
                      <View style={styles.proofUploadedCard}>
                        <View style={styles.proofUploadedHeader}>
                          <View style={styles.proofSuccessBadge}>
                            <Ionicons name="checkmark-circle" size={15} color="#166534" />
                            <Text style={styles.proofSuccessText}>Đã đính kèm ảnh minh chứng</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => setDisputeProofUrl('')}
                            style={styles.proofDeleteBtn}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={14} color="#DC2626" />
                            <Text style={styles.proofDeleteBtnText}>Xóa</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.proofUploadedBody}>
                          <Image
                            source={{ uri: disputeProofUrl }}
                            style={styles.proofLargeThumbnail}
                            resizeMode="cover"
                          />
                          <View style={styles.proofActionCol}>
                            <TouchableOpacity
                              style={styles.proofRetakeBtn}
                              onPress={handleCaptureDisputeProof}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="camera-reverse" size={15} color="#2563EB" />
                              <Text style={[styles.proofRetakeBtnText, { color: '#2563EB' }]}>Chụp lại ảnh</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.proofPickBtn}
                              onPress={handlePickDisputeProof}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="images-outline" size={15} color="#475569" />
                              <Text style={styles.proofPickBtnText}>Chọn từ thư viện</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.proofActionRow}>
                        <TouchableOpacity
                          style={[styles.proofBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                          onPress={handleCaptureDisputeProof}
                        >
                          <Ionicons name="camera" size={20} color="#2563EB" />
                          <Text style={[styles.proofBtnText, { color: '#2563EB', fontWeight: '800' }]}>Chụp Ảnh</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.proofBtn}
                          onPress={handlePickDisputeProof}
                        >
                          <Ionicons name="images" size={20} color="#475569" />
                          <Text style={styles.proofBtnText}>Chọn Từ Thư Viện</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <Text style={styles.modalSub}>Chọn lý do sự cố:</Text>
                  <View style={styles.reasonsList}>
                    {AGENCY_EMERGENCY_REASONS.map((r, i) => (
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

                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Mô tả cụ thể sự cố gửi lên Quản lý Studio..."
                    placeholderTextColor="#94A3B8"
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    multiline
                    numberOfLines={3}
                  />
                </>
              ) : cancelModalType === 'CUSTOMER_ABSENT_DISPUTE' ? (
                <>
                  {/* Chính sách nhận 100% cọc */}
                  <View style={styles.disputePolicyCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Ionicons name="shield-checkmark" size={16} color="#B45309" />
                      <Text style={styles.disputePolicyTitle}>Chính Sách Bảo Vệ Thợ Make-up</Text>
                    </View>
                    <Text style={styles.disputePolicyDesc}>
                      Khi khách không có mặt hoặc bỏ hẹn, bạn bắt buộc đính kèm ảnh minh chứng (chụp trước cửa/điểm hẹn hoặc màn hình cuộc gọi). Sau khi Admin duyệt, bạn sẽ nhận đủ 100% tiền cọc ({formatVnd(booking?.depositAmount || 0)}) vào ví.
                    </Text>
                  </View>

                  {/* PHẦN TẢI LÊN ẢNH MINH CHỨNG - ĐẶT NỔI BẬT NGAY TRÊN ĐẦU */}
                  <View style={[styles.proofSectionBox, !disputeProofUrl && { borderColor: '#F59E0B', borderWidth: 1.5, backgroundColor: '#FFFBEB' }]}>
                    <View style={styles.proofSectionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="camera" size={16} color="#D97706" />
                        <Text style={[styles.proofSectionTitle, { color: '#B45309' }]}>ẢNH MINH CHỨNG HIỆN TRƯỜNG</Text>
                      </View>
                      <Text style={styles.proofSectionRequired}>* BẮT BUỘC</Text>
                    </View>

                    <Text style={{ fontSize: 11.5, color: '#92400E', marginBottom: 10, lineHeight: 16 }}>
                      Chụp ảnh trước cửa/điểm hẹn hoặc chụp màn hình cuộc gọi nhỡ với khách. Không có ảnh sẽ không thể gửi báo cáo.
                    </Text>

                    {isUploadingProof ? (
                      <View style={{ paddingVertical: 18, alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator size="small" color="#D97706" />
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#92400E' }}>
                          Đang tải ảnh minh chứng lên máy chủ Cloudinary...
                        </Text>
                      </View>
                    ) : disputeProofUrl ? (
                      <View style={styles.proofUploadedCard}>
                        {/* Header: Badge hợp lệ & Nút xóa ảnh */}
                        <View style={styles.proofUploadedHeader}>
                          <View style={styles.proofSuccessBadge}>
                            <Ionicons name="checkmark-circle" size={15} color="#166534" />
                            <Text style={styles.proofSuccessText}>Ảnh minh chứng hợp lệ</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => {
                              const oldUrl = disputeProofUrl;
                              setDisputeProofUrl('');
                              useUndoStore.getState().showUndoToast({
                                message: 'Đã xóa ảnh minh chứng',
                                onUndo: () => {
                                  setDisputeProofUrl(oldUrl);
                                },
                              });
                            }}
                            style={styles.proofDeleteBtn}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={14} color="#DC2626" />
                            <Text style={styles.proofDeleteBtnText}>Xóa ảnh</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Body: Thumbnail lớn rõ ràng + Các nút hành động thay đổi */}
                        <View style={styles.proofUploadedBody}>
                          <Image
                            source={{ uri: disputeProofUrl }}
                            style={styles.proofLargeThumbnail}
                            resizeMode="cover"
                          />
                          <View style={styles.proofActionCol}>
                            <TouchableOpacity
                              style={styles.proofRetakeBtn}
                              onPress={handleCaptureDisputeProof}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="camera-reverse" size={15} color="#B45309" />
                              <Text style={styles.proofRetakeBtnText}>Chụp lại ảnh</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.proofPickBtn}
                              onPress={handlePickDisputeProof}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="images-outline" size={15} color="#475569" />
                              <Text style={styles.proofPickBtnText}>Chọn từ thư viện</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.proofActionRow}>
                        <TouchableOpacity
                          style={[styles.proofBtn, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}
                          onPress={handleCaptureDisputeProof}
                        >
                          <Ionicons name="camera" size={20} color="#B45309" />
                          <Text style={[styles.proofBtnText, { color: '#B45309', fontWeight: '800' }]}>Chụp Ảnh Tại Chỗ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.proofBtn}
                          onPress={handlePickDisputeProof}
                        >
                          <Ionicons name="images" size={20} color="#475569" />
                          <Text style={styles.proofBtnText}>Chọn Từ Thư Viện</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {!disputeProofUrl && !isUploadingProof && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                        <Ionicons name="alert-circle" size={14} color="#DC2626" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>
                          Chưa có ảnh — Hãy chụp hoặc chọn ảnh để kích hoạt nút gửi
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.modalSub}>Chọn lý do xảy ra sự cố:</Text>
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

                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Ghi chú chi tiết cho Ban Quản Trị..."
                    placeholderTextColor="#94A3B8"
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    multiline
                    numberOfLines={3}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.modalSub}>
                    Lưu ý: Nếu bạn tự hủy ca nhận này, toàn bộ 100% tiền cọc sẽ được hoàn lại cho khách hàng và điểm uy tín nhận việc có thể bị giảm.
                  </Text>

                  <TextInput
                    style={[styles.reasonInput, { minHeight: 90 }]}
                    placeholder="Nhập lý do bạn không thể thực hiện ca này..."
                    placeholderTextColor="#94A3B8"
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    multiline
                    numberOfLines={4}
                  />
                </>
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
                  style={[
                    styles.modalSubmitBtn,
                    cancelModalType === 'AGENCY_EMERGENCY_BUSY'
                      ? { backgroundColor: '#2563EB' }
                      : cancelModalType === 'CUSTOMER_ABSENT_DISPUTE'
                      ? { backgroundColor: '#D97706' }
                      : { backgroundColor: '#DC2626' },
                    (isSubmittingCancel || (cancelModalType === 'CUSTOMER_ABSENT_DISPUTE' && !disputeProofUrl)) && styles.disabledBtn,
                  ]}
                  onPress={handleConfirmCancelOrDispute}
                  disabled={isSubmittingCancel || (cancelModalType === 'CUSTOMER_ABSENT_DISPUTE' && !disputeProofUrl)}
                >
                  {isSubmittingCancel ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>
                      {cancelModalType === 'AGENCY_EMERGENCY_BUSY'
                        ? 'Gửi Báo Cáo Lên Studio'
                        : cancelModalType === 'CUSTOMER_ABSENT_DISPUTE'
                        ? (disputeProofUrl ? 'Gửi Báo Cáo Nhận 100% Cọc' : 'Bắt Buộc Đính Kèm Ảnh')
                        : 'Xác Nhận Hủy (Hoàn Khách)'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>



      {/* Modal Duy Nhất Xác Nhận Khách Đã Trả Tiền Mặt (Chỉ hiển thị cho Thợ chính) */}
      <Modal
        visible={Boolean(isCashPromptModalVisible && isPrimaryRole && !isAssistantRole)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!isConfirmingCash) setIsCashPromptModalVisible(false);
        }}
      >
        <View style={styles.modalOverlayCenter}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!isConfirmingCash) setIsCashPromptModalVisible(false);
            }}
          />
          <View style={styles.cashPromptCard}>
            <View style={styles.cashPromptBadge}>
              <Text style={styles.cashPromptBadgeText}>THANH TOÁN TIỀN MẶT</Text>
            </View>

            <View style={styles.cashPromptIconCircle}>
              <Ionicons name="cash" size={36} color="#059669" />
            </View>

            <Text style={styles.cashPromptTitle}>Khách Báo Đã Trả Tiền Mặt</Text>
            <Text style={styles.cashPromptSub}>
              Khách hàng vừa bấm xác nhận đã thanh toán tiền mặt trực tiếp cho bạn:
            </Text>

            <View style={styles.cashPromptAmountBox}>
              <Text style={styles.cashPromptAmountLabel}>Số tiền khách cần thanh toán</Text>
              <Text style={styles.cashPromptAmountVal}>
                {formatVnd(cashAmountExpected || (booking?.totalAmount ? Math.round(booking.totalAmount * 0.7) : 0))}
              </Text>
            </View>

            <View style={styles.cashPromptNoticeBox}>
              <Ionicons name="shield-checkmark" size={16} color="#D97706" />
              <Text style={styles.cashPromptNoticeText}>
                Vui lòng chỉ bấm <Text style={{ fontWeight: '800', color: '#92400E' }}>"Đã Nhận Đủ"</Text> khi bạn đã cầm trên tay đúng số tiền mặt trên.
              </Text>
            </View>

            <View style={styles.cashPromptBtnRow}>
              <TouchableOpacity
                style={styles.cashPromptRejectBtn}
                onPress={handleDeclineCashReceipt}
                disabled={isConfirmingCash}
                activeOpacity={0.8}
              >
                <Text style={styles.cashPromptRejectBtnText}>Chưa Nhận</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cashPromptConfirmBtn}
                onPress={performConfirmCashReceipt}
                disabled={isConfirmingCash}
                activeOpacity={0.8}
              >
                {isConfirmingCash ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                    <Text style={styles.cashPromptConfirmBtnText}>Đã Nhận Đủ</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL XÁC NHẬN YÊU CẦU HỦY CA & NHẬN BỒI THƯỜNG CỌC 100% TỪ KHÁCH HÀNG     */}
      {/* ========================================================================= */}
      <DismissibleModal visible={isCancelRequestModalVisible} onClose={() => setIsCancelRequestModalVisible(false)} dismissDisabled={isHandlingCancelAction} overlayStyle={styles.cancelRequestOverlay} contentStyle={styles.cancelRequestCard}>
        <View style={styles.cancelRequestHeader}>
          <View style={styles.cancelRequestIconCircle}>
            <Ionicons name="alert-circle" size={32} color="#DC2626" />
          </View>
          <Text style={styles.cancelRequestTitle}>Khách Hàng Yêu Cầu Hủy Ca</Text>
          <Text style={styles.cancelRequestSubtitle}>
            Khách hàng đề nghị hủy ca hẹn trong lúc bạn đang di chuyển
          </Text>
        </View>

        <View style={styles.cancelCustomerBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <UserAvatar
              uri={booking?.customerAvatar}
              name={booking?.customerName}
              size={44}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelCustomerName}>{booking?.customerName || 'Khách hàng'}</Text>
              <Text style={styles.cancelCustomerPhone}>{booking?.customerPhone || 'SĐT khách hàng'}</Text>
            </View>
          </View>

          <View style={styles.cancelReasonSection}>
            <Text style={styles.cancelReasonLabel}>Lý do khách hàng đưa ra:</Text>
            <Text style={styles.cancelReasonText}>
              "{customerCancelReason || 'Khách hàng có việc bận đột xuất'}"
            </Text>
          </View>
        </View>

        {/* HỘP BỒI THƯỜNG 100% CỌC */}
        <View style={styles.cancelCompensationBox}>
          <Ionicons name="shield-checkmark" size={24} color="#059669" />
          <View style={{ flex: 1 }}>
            <Text style={styles.cancelCompensationTitle}>Quyền Lợi Bồi Thường 100%</Text>
            <Text style={styles.cancelCompensationDesc}>
              Nếu bạn đồng ý hủy ca, toàn bộ số tiền cọc{' '}
              <Text style={{ fontWeight: '800', color: '#059669' }}>
                {formatVnd(booking?.depositAmount || 0)}
              </Text>{' '}
              sẽ được chuyển thẳng vào Ví chuyên viên của bạn để bù đắp chi phí di chuyển.
            </Text>
          </View>
        </View>

        {/* CẶP NÚT HÀNH ĐỘNG */}
        <View style={styles.cancelActionRow}>
          <TouchableOpacity
            style={styles.cancelRejectBtn}
            onPress={handleRejectCustomerCancel}
            disabled={isHandlingCancelAction}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelRejectBtnText}>Từ Chối Hủy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelAcceptBtn}
            onPress={handleAcceptCustomerCancel}
            disabled={isHandlingCancelAction}
            activeOpacity={0.85}
          >
            {isHandlingCancelAction ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.cancelAcceptBtnText}>Đồng Ý & Nhận Cọc</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </DismissibleModal>

      {/* MODAL POPUP THÔNG BÁO KHÁCH ĐÃ CỌC THÀNH CÔNG CHO THỢ */}

      {/* MODAL XEM CHI TIẾT KHIẾU NẠI & MINH CHỨNG HAI PHÍA */}
      <DisputeDossierModal
        visible={isDisputeDossierOpen}
        onClose={() => setIsDisputeDossierOpen(false)}
        bookingId={id ? Number(id) : undefined}
        cancellationReason={booking?.cancellationReason}
        emergencyReason={booking?.emergencyReason}
        emergencyProofUrl={booking?.emergencyProofUrl || disputeProofUrl}
        reportedAt={booking?.emergencyReportedAt}
        viewAsRole="MUA"
        bookingCode={booking?.bookingCode}
        depositAmount={booking?.depositAmount}
        totalAmount={booking?.totalAmount}
        bookingStatus={booking?.status}
        disputeOrigin={booking?.disputeOrigin}
        counterpartyName={booking?.customerName}
        isAssistantRole={isAssistantRole}
        onCounterDispute={() => {
          if (isAssistantRole) return;
          setCancelModalType('CUSTOMER_ABSENT_DISPUTE');
          setCancelReason('');
          setDisputeProofUrl('');
          setIsCancelModalVisible(true);
        }}
        onDisputeSuccess={() => loadBookingDetail(true)}
      />

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
    paddingBottom: 160,
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
  disputeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  disputeModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 14,
    maxHeight: '90%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  disputeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  disputeHeaderIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disputeModalTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  disputeModalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 8,
  },
  reasonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  reasonChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonChipSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  reasonChipText: {
    fontSize: 11.5,
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
    padding: 8,
    fontSize: 12.5,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#E11D48',
  },
  modalSubmitBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disputeTypeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
    gap: 6,
  },
  disputeTypeTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    minHeight: 48,
  },
  disputeTypeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  disputeTypeTabTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  disputeTypeTabTitleActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  disputeTypeTabSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  disputeTypeTabSubActive: {
    color: '#D97706',
    fontWeight: '700',
  },
  disputeTypeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  disputeTypeTabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  muaDisputeCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    gap: 12,
  },
  muaDisputeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  muaDisputeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  muaDisputeTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.2,
  },
  muaDisputeSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 17,
  },
  muaDisputeReasonBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  muaDisputeReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  muaDisputeReasonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  muaDisputeProofBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  muaDisputeProofLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  muaDisputeProofImage: {
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
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 4,
    shadowColor: '#2563EB',
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
  muaDisputeFooterRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  muaDisputeWalletBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  muaDisputeWalletBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#059669',
  },
  muaDisputeHomeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  muaDisputeHomeBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  disputePolicyCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  disputePolicyTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#B45309',
  },
  disputePolicyDesc: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
  },
  proofSectionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    marginBottom: 8,
  },
  proofSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  proofSectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  proofSectionRequired: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  proofActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  proofBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  proofBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  proofUploadedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  proofUploadedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  proofSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  proofSuccessText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#166534',
  },
  proofDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proofDeleteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  proofUploadedBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proofLargeThumbnail: {
    width: 82,
    height: 82,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  proofActionCol: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  proofRetakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  proofRetakeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  proofPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  proofPickBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
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
  cashPromptCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  cashPromptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 14,
  },
  cashPromptBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  cashPromptIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6EE7B7',
    marginBottom: 12,
  },
  cashPromptTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  cashPromptSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  cashPromptAmountBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  cashPromptAmountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  cashPromptAmountVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#059669',
  },
  cashPromptNoticeBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 18,
  },
  cashPromptNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  cashPromptBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cashPromptRejectBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cashPromptRejectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  cashPromptConfirmBtn: {
    flex: 1.6,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  cashPromptConfirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
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
  checkWalletDepositBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    marginTop: 10,
  },
  checkWalletDepositBtnText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
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
    justifyContent: 'space-between',
  },
  escrowShieldBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    flexShrink: 0,
  },
  escrowTitleCol: {
    flex: 1,
    marginHorizontal: 10,
  },
  escrowSecurityTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#065F46',
  },
  escrowSecuritySub: {
    fontSize: 11.5,
    color: '#047857',
    marginTop: 2,
  },
  escrowStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexShrink: 0,
  },
  escrowStatusTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.2,
  },
  escrowDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  escrowDetailsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  escrowDetailItem: {
    flex: 1,
  },
  escrowDetailDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  escrowDetailLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 3,
    fontWeight: '500',
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
    fontSize: 11.5,
    lineHeight: 16,
    color: '#065F46',
    fontWeight: '500',
  },
  stickyCancelNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  stickyCancelNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stickyCancelNoticeBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stickyCancelNoticeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  cancelRequestOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cancelRequestCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  cancelRequestHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelRequestIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cancelRequestTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  cancelRequestSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  cancelCustomerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelCustomerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  cancelCustomerAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelCustomerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cancelCustomerPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cancelReasonSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  cancelReasonText: {
    fontSize: 13,
    color: '#334155',
    fontStyle: 'italic',
  },
  cancelCompensationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 18,
  },
  cancelCompensationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 2,
  },
  cancelCompensationDesc: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 17,
  },
  cancelActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelRejectBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  cancelRejectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  cancelAcceptBtn: {
    flex: 1.6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cancelAcceptBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  depositModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  depositModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  depositModalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  depositModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  depositModalSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  depositModalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 20,
  },
  depositModalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  depositModalBtn: {
    width: '100%',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  depositModalBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // SCHEDULED HERO CARD DÀNH CHO THỢ MUA
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
    gap: 8,
    marginBottom: 12,
  },
  scheduledHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    flexShrink: 0,
  },
  scheduledHeroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.3,
  },
  scheduledHeroCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexShrink: 1,
  },
  scheduledHeroCode: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E293B',
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
    flex: 1.35,
    minWidth: 0,
  },
  scheduledHeroTimeLabel: {
    fontSize: 10.5,
    color: '#0284C7',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  scheduledHeroTimeValue: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#0C4A6E',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  scheduledHeroDateValue: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
    marginTop: 2,
  },
  scheduledHeroDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  scheduledHeroServiceCol: {
    flex: 1,
    minWidth: 0,
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
  scheduledHeroTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  scheduledHeroTipText: {
    fontSize: 11.5,
    color: '#0369A1',
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },

  // INSTANT HERO CARD DÀNH CHO THỢ MUA
  instantHeroCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  instantHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  instantHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    flexShrink: 0,
  },
  instantHeroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.3,
  },
  instantHeroCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexShrink: 1,
  },
  instantHeroCode: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#B45309',
  },
  instantHeroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  instantHeroTimeCol: {
    flex: 1.35,
    minWidth: 0,
  },
  instantHeroTimeLabel: {
    fontSize: 10.5,
    color: '#D97706',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  instantHeroTimeValue: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#B45309',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  instantHeroSubValue: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 2,
  },
  instantHeroDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#FEF3C7',
    marginHorizontal: 12,
  },
  instantHeroServiceCol: {
    flex: 1.2,
  },
  instantHeroServiceLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  instantHeroFeeValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 2,
  },
  instantBonusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  instantBonusPillText: {
    fontSize: 10.5,
    color: '#B45309',
    fontWeight: '700',
  },
  instantHeroTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  instantHeroTipText: {
    fontSize: 11.5,
    color: '#C2410C',
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  overtimeReportBtn: {
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
  },
  overtimeReportBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
});
