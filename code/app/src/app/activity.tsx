import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { DismissibleModal } from '@/components/common/DismissibleModal';
import { BrandColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationStore } from '@/store/notification.store';
import { websocketService } from '@/services/websocket.service';
import {
  bookingService,
  CustomerActiveTrackingData,
  BookingHistoryLogItem,
  CustomerBookingItem,
} from '@/services/booking.service';
import { AppBottomNavBar } from '@/components/common/AppBottomNavBar';
import { freelancerBookingService } from '@/services/freelancer-booking.service';
import { formatDateTimeVN, formatDateVN } from '@/utils/date';

// Các trạng thái kết thúc/hoàn thiện không còn được xem là đơn đang hoạt động
const TERMINATED_STATUSES = [
  'COMPLETED',
  'PAID_OUT',
  'CANCELLED',
  'CANCELLED_EXPIRED',
  'DISPUTE_REFUNDED',
  'DISPUTE_COMPENSATED',
];

const isActiveBookingStatus = (status?: string): boolean => {
  return !!status && !TERMINATED_STATUSES.includes(status);
};

interface HistoryModalTarget {
  id: number;
  bookingCode?: string;
  packageName?: string;
  status?: string;
  initialLogs?: BookingHistoryLogItem[];
  activeData?: CustomerActiveTrackingData | null;
  pastBooking?: CustomerBookingItem | null;
}

export default function OrderTrackingActivityScreen() {
  const { userInfo, isAuthenticated } = useAuthStore();
  const isMUA = userInfo?.roles?.includes('ROLE_FREELANCE_MUA') || userInfo?.roles?.includes('ROLE_AGENCY_STAFF');

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeBooking, setActiveBooking] = useState<CustomerActiveTrackingData | null>(null);
  const [otherBookings, setOtherBookings] = useState<CustomerBookingItem[]>([]);

  const PAGE_CHUNK_SIZE = 10;
  const [displayLimit, setDisplayLimit] = useState<number>(PAGE_CHUNK_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Cache lịch sử biến động cho từng đơn
  const [historyLogsMap, setHistoryLogsMap] = useState<Record<number, BookingHistoryLogItem[]>>({});

  // Quản lý Modal lịch sử đơn hàng tập trung
  const [historyModalVisible, setHistoryModalVisible] = useState<boolean>(false);
  const [selectedHistoryTarget, setSelectedHistoryTarget] = useState<HistoryModalTarget | null>(null);
  const [modalLogs, setModalLogs] = useState<BookingHistoryLogItem[]>([]);
  const [loadingModalLogs, setLoadingModalLogs] = useState<boolean>(false);

  // 1. Tải dữ liệu thật từ Backend PostgreSQL (Hỗ trợ cả Khách hàng và Thợ MUA)
  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      if (isMUA) {
        // Luồng của Chuyên viên / Thợ MUA
        const [activeData, freelancerBookings] = await Promise.all([
          bookingService.getActiveTrackingBooking(),
          freelancerBookingService.getMyAssignedBookings(),
        ]);

        const isRealActive = activeData && isActiveBookingStatus(activeData.currentStatus);
        setActiveBooking(isRealActive ? activeData : null);

        const activeId = isRealActive ? Number(activeData.bookingId) : null;
        const others = (freelancerBookings || []).filter(
          (b) => activeId === null || Number(b.id) !== activeId
        );
        const mappedOthers: CustomerBookingItem[] = others.map((b) => ({
          id: b.id,
          bookingCode: b.bookingCode,
          status: b.status,
          packageName: b.packageName,
          bookingTime: formatDateTimeVN(`${b.startTime || ''} ${b.bookingDate || ''}`.trim()),
          destinationAddress: b.destinationAddress,
          destinationLatitude: b.destinationLatitude,
          destinationLongitude: b.destinationLongitude,
          totalAmount: b.totalAmount,
          depositAmount: b.depositAmount,
          remainingAmount: Math.max(0, (b.totalAmount || 0) - (b.depositAmount || 0)),
          createdAt: b.createdAt,
          artistName: b.customerName,
          note: b.note,
        } as any));
        setOtherBookings(mappedOthers);
      } else {
        // Luồng của Khách hàng
        const [activeData, allBookings] = await Promise.all([
          bookingService.getActiveTrackingBooking(),
          bookingService.getMyBookings(),
        ]);

        const isRealActive = activeData && isActiveBookingStatus(activeData.currentStatus);
        setActiveBooking(isRealActive ? activeData : null);

        const activeId = isRealActive ? Number(activeData.bookingId) : null;
        const others = (allBookings || []).filter(
          (b) => activeId === null || Number(b.id) !== activeId
        );
        setOtherBookings(others);
      }
    } catch (error) {
      console.error('[OrderTracking] Failed to fetch active tracking data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, isMUA]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tập hợp tất cả các mã ID đơn hàng của người dùng để lắng nghe realtime
  const allBookingIds = useMemo(() => {
    const ids: number[] = [];
    if (activeBooking?.bookingId) {
      ids.push(Number(activeBooking.bookingId));
    }
    otherBookings.forEach((b) => {
      const bId = Number(b.id);
      if (bId && !ids.includes(bId)) {
        ids.push(bId);
      }
    });
    return ids;
  }, [activeBooking?.bookingId, otherBookings]);

  // 2. Lắng nghe cập nhật biến động trạng thái đơn hàng realtime qua STOMP WebSocket
  useEffect(() => {
    if (!isAuthenticated || allBookingIds.length === 0) return;

    const unsubs: Array<() => void> = [];

    allBookingIds.forEach((bId) => {
      const topic = `/topic/booking-status/${bId}`;

      const unsub = websocketService.subscribe(topic, (statusMsg: any) => {
        console.log('[OrderTracking] Nhận cập nhật trạng thái đơn hàng realtime cho bookingId:', bId, statusMsg);
        const nextStatus = statusMsg?.currentStatus || statusMsg?.status;

        // Cập nhật lại toàn bộ dữ liệu thẻ đơn và lịch sử tiến trình
        fetchData();

        // Rung phản hồi nhẹ nhàng trên điện thoại
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }

        // Tìm mã đơn hàng hiển thị
        const targetCode =
          statusMsg?.bookingCode ||
          (Number(activeBooking?.bookingId) === bId ? activeBooking?.bookingCode : null) ||
          otherBookings.find((o) => Number(o.id) === bId)?.bookingCode ||
          String(bId);

        let title = 'Cập Nhật Đơn Hàng';
        let content = statusMsg?.message || `Lịch hẹn #${targetCode} vừa có cập nhật mới.`;
        let type = 'NOTIFICATION';

        switch (nextStatus) {
          case 'ON_THE_WAY':
            title = 'Chuyên Viên Đang Di Chuyển';
            content = isMUA
              ? 'Bạn đã bắt đầu di chuyển tới điểm hẹn của khách hàng.'
              : (statusMsg?.message || 'Chuyên viên make-up đang trên đường di chuyển đến bạn.');
            type = 'BOOKING_ON_THE_WAY';
            break;
          case 'ARRIVED':
            title = 'Chuyên Viên Đã Đến Nơi';
            content = isMUA
              ? 'Bạn đã có mặt tại điểm hẹn của khách hàng.'
              : (statusMsg?.message || 'Chuyên viên make-up đã có mặt tại điểm hẹn!');
            type = 'BOOKING_ARRIVED';
            break;
          case 'IN_PROGRESS':
            title = 'Đang Thực Hiện Make-Up';
            content = isMUA
              ? 'Đang tiến hành trang điểm cho khách hàng.'
              : (statusMsg?.message || 'Chuyên viên đã bắt đầu buổi trang điểm cho bạn.');
            type = 'BOOKING_IN_PROGRESS';
            break;
          case 'COMPLETED':
            title = 'Buổi Make-Up Hoàn Tất';
            content = isMUA
              ? 'Đã hoàn tất trang điểm. Đang chờ khách hàng thanh toán.'
              : (statusMsg?.message || 'Dịch vụ trang điểm đã hoàn tất thành công!');
            type = 'BOOKING_COMPLETED';
            break;
          case 'CANCELLED':
          case 'CANCELLED_EXPIRED':
            title = 'Đơn Hàng Đã Bị Hủy';
            content = statusMsg?.message || 'Lịch hẹn trang điểm đã bị hủy.';
            type = 'BOOKING_CANCELLED';
            break;
          case 'PAID_OUT':
            title = 'Thanh Toán Thành Công';
            content = statusMsg?.message || 'Đơn hàng đã được thanh toán toàn bộ.';
            type = 'PAID_OUT';
            break;
          case 'ACCEPTED':
          case 'AGENCY_ASSIGNED':
            title = 'Đã Tiếp Nhận Đơn Hàng';
            content = statusMsg?.message || 'Chuyên viên make-up đã tiếp nhận lịch hẹn của bạn.';
            type = 'BOOKING_ACCEPTED';
            break;
          default:
            if (statusMsg?.title) title = statusMsg.title;
            if (statusMsg?.content) content = statusMsg.content;
            break;
        }

        useNotificationStore.getState().showToast({
          id: Date.now(),
          type,
          title,
          content,
          bookingId: bId,
          bookingCode: targetCode,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      });

      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [isAuthenticated, allBookingIds, isMUA, activeBooking?.bookingCode, otherBookings, fetchData]);

  // 3. Tự động đồng bộ và tải lại dữ liệu khi có thông báo mới trong store
  const notifications = useNotificationStore((s) => s.notifications);
  const prevNotifLengthRef = useRef(notifications.length);

  useEffect(() => {
    if (notifications.length > prevNotifLengthRef.current) {
      prevNotifLengthRef.current = notifications.length;
      fetchData();
    } else {
      prevNotifLengthRef.current = notifications.length;
    }
  }, [notifications.length, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setDisplayLimit(PAGE_CHUNK_SIZE);
    fetchData();
  }, [fetchData]);

  // Danh sách các đơn khác phân trang (nạp 10 đơn mỗi lần, cuộn xuống tự động tải thêm)
  const displayOtherBookings = useMemo(() => {
    return otherBookings.slice(0, displayLimit);
  }, [otherBookings, displayLimit]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore) return;
    if (displayLimit >= otherBookings.length) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit((prev) => prev + PAGE_CHUNK_SIZE);
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, displayLimit, otherBookings.length]);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 150;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      handleLoadMore();
    }
  };

  // Định dạng tiền tệ VND chuẩn
  const formatVnd = (amount?: number) => {
    if (amount === undefined || amount === null) return '0 đ';
    return `${amount.toLocaleString('vi-VN')} đ`;
  };

  // Mở Modal xem lịch sử chi tiết
  const handleOpenHistoryModal = async (target: HistoryModalTarget) => {
    setSelectedHistoryTarget(target);
    setHistoryModalVisible(true);

    if (historyLogsMap[target.id] && historyLogsMap[target.id].length > 0) {
      setModalLogs(historyLogsMap[target.id]);
      return;
    }

    if (target.initialLogs && target.initialLogs.length > 0) {
      setModalLogs(target.initialLogs);
      setHistoryLogsMap((prev) => ({ ...prev, [target.id]: target.initialLogs! }));
      return;
    }

    setLoadingModalLogs(true);
    try {
      const logs = await bookingService.getBookingHistoryLogs(target.id);
      setModalLogs(logs);
      setHistoryLogsMap((prev) => ({ ...prev, [target.id]: logs }));
    } catch (err) {
      console.warn('[OrderTracking] Không thể tải lịch sử đơn:', target.id, err);
      setModalLogs([]);
    } finally {
      setLoadingModalLogs(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PENDING_DEPOSIT':
        return { label: 'Chờ Đặt Cọc', bg: '#FEF3C7', color: '#B45309' };
      case 'REQUESTED':
        return { label: 'Chờ Xác Nhận', bg: '#FEF3C7', color: '#B45309' };
      case 'PENDING_AGENCY_DISPATCH':
        return { label: 'Chờ Điều Phối', bg: '#FEF3C7', color: '#B45309' };
      case 'AGENCY_ASSIGNED':
      case 'ACCEPTED':
        return { label: 'Đã Nhận Đơn', bg: '#E0F2FE', color: '#0369A1' };
      case 'ON_THE_WAY':
        return { label: 'Đang Di Chuyển', bg: '#DBEAFE', color: '#1D4ED8' };
      case 'ARRIVED':
        return { label: 'Đã Đến Nơi', bg: '#D1FAE5', color: '#047857' };
      case 'IN_PROGRESS':
        return { label: 'Đang Thực Hiện', bg: '#FCE7F3', color: '#BE185D' };
      case 'COMPLETED':
        return { label: 'Chờ Quyết Toán', bg: '#FEF3C7', color: '#B45309' };
      case 'PAID_OUT':
        return { label: 'Đã Hoàn Tất', bg: '#DCFCE7', color: '#16A34A' };
      case 'CANCELLED':
      case 'CANCELLED_EXPIRED':
        return { label: 'Đã Hủy', bg: '#FEE2E2', color: '#DC2626' };
      case 'DISPUTED':
        return { label: 'Khiếu Nại', bg: '#FEE2E2', color: '#DC2626' };
      case 'DISPUTE_REFUNDED':
        return { label: 'Đã Hoàn Tiền', bg: '#E0F2FE', color: '#0369A1' };
      case 'DISPUTE_COMPENSATED':
        return { label: 'Đã Bồi Thường', bg: '#DCFCE7', color: '#16A34A' };
      default:
        return { label: 'Đang Xử Lý', bg: '#F1F5F9', color: '#475569' };
    }
  };

  const getStatusSmallIconName = (status?: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'PENDING_DEPOSIT':
      case 'REQUESTED':
      case 'PENDING_AGENCY_DISPATCH':
        return 'calendar-outline';
      case 'ACCEPTED':
      case 'AGENCY_ASSIGNED':
        return 'person-outline';
      case 'ON_THE_WAY':
        return 'bicycle-outline';
      case 'ARRIVED':
        return 'location-outline';
      case 'IN_PROGRESS':
        return 'brush-outline';
      case 'COMPLETED':
      case 'PAID_OUT':
        return 'checkmark-circle-outline';
      case 'CANCELLED':
      case 'CANCELLED_EXPIRED':
        return 'close-circle-outline';
      case 'DISPUTED':
        return 'alert-circle-outline';
      case 'DISPUTE_REFUNDED':
        return 'arrow-undo-circle-outline';
      case 'DISPUTE_COMPENSATED':
        return 'shield-checkmark-outline';
      default:
        return 'ellipse-outline';
    }
  };

  // Thông tin trực quan giải thích trạng thái hiện tại của đơn active
  const activeStatusMeta = useMemo(() => {
    if (!activeBooking) return null;
    const status = activeBooking.currentStatus;
    switch (status) {
      case 'PENDING_DEPOSIT':
        return {
          bannerIcon: 'card-outline' as const,
          bannerBg: '#FEF3C7',
          bannerColor: '#B45309',
          bannerText: isMUA
            ? 'Đang chờ khách hàng hoàn tất tiền cọc ca làm đẹp.'
            : 'Vui lòng hoàn tất đặt cọc để hệ thống xác nhận lịch hẹn của bạn.',
          step: 1,
        };
      case 'REQUESTED':
      case 'PENDING_AGENCY_DISPATCH':
        return {
          bannerIcon: 'hourglass-outline' as const,
          bannerBg: '#FEF3C7',
          bannerColor: '#B45309',
          bannerText: isMUA
            ? 'Đang chờ studio điều phối lịch làm việc.'
            : 'Hệ thống đang điều phối chuyên viên make-up phù hợp nhất cho bạn.',
          step: 1,
        };
      case 'AGENCY_ASSIGNED':
      case 'ACCEPTED':
        return {
          bannerIcon: 'person-outline' as const,
          bannerBg: '#E0F2FE',
          bannerColor: '#0369A1',
          bannerText: isMUA
            ? 'Bạn đã nhận lịch hẹn. Vui lòng chuẩn bị và di chuyển đúng giờ.'
            : 'Chuyên viên make-up đã tiếp nhận lịch hẹn của bạn.',
          step: 2,
        };
      case 'ON_THE_WAY':
        return {
          bannerIcon: 'bicycle-outline' as const,
          bannerBg: '#DBEAFE',
          bannerColor: '#1D4ED8',
          bannerText: isMUA
            ? 'Bạn đang di chuyển đến điểm hẹn của khách hàng.'
            : 'Chuyên viên make-up đang trên đường di chuyển đến điểm hẹn!',
          step: 3,
        };
      case 'ARRIVED':
        return {
          bannerIcon: 'location-outline' as const,
          bannerBg: '#D1FAE5',
          bannerColor: '#047857',
          bannerText: isMUA
            ? 'Bạn đã có mặt tại điểm hẹn. Hãy chuẩn bị bắt đầu dịch vụ.'
            : 'Chuyên viên make-up đã có mặt tại điểm hẹn làm đẹp!',
          step: 4,
        };
      case 'IN_PROGRESS':
        return {
          bannerIcon: 'brush-outline' as const,
          bannerBg: '#FCE7F3',
          bannerColor: '#BE185D',
          bannerText: isMUA
            ? 'Đang tiến hành dịch vụ make-up cho khách hàng.'
            : 'Buổi make-up đang được thực hiện. Chúc bạn có diện mạo thật rạng rỡ!',
          step: 4,
        };
      default:
        return {
          bannerIcon: 'information-circle-outline' as const,
          bannerBg: '#F1F5F9',
          bannerColor: '#475569',
          bannerText: 'Đơn hàng đang trong tiến trình phục vụ.',
          step: 1,
        };
    }
  }, [activeBooking, isMUA]);

  // Gọi điện thoại
  const handleCallContact = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert('Thông báo', 'Số điện thoại liên hệ chưa được cập nhật.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  // Render thông tin chuyên biệt cho từng bước trạng thái trong Modal
  // Render thông tin chuyên biệt cho từng bước trạng thái trong Modal
  const renderLogItemDetails = (
    logItem: BookingHistoryLogItem,
    activeData?: CustomerActiveTrackingData | null,
    pastBooking?: CustomerBookingItem | null
  ) => {
    const status = logItem.toStatus;

    if (status === 'ON_THE_WAY') {
      return (
        <View style={styles.detailBox}>
          {logItem.originAddress ? (
            <Text style={styles.timelineAddress}>
              <Text style={styles.addressBold}>Xuất phát từ:</Text> {logItem.originAddress}
            </Text>
          ) : null}
          {logItem.destinationAddress ? (
            <Text style={styles.timelineAddress}>
              <Text style={styles.addressBold}>Điểm đến:</Text> {logItem.destinationAddress}
            </Text>
          ) : null}
          {logItem.note && !logItem.note.startsWith('Chuyển trạng thái sang') ? (
            <Text style={styles.timelineNote}>
              <Text style={styles.addressBold}>Chi tiết:</Text> {logItem.note}
            </Text>
          ) : null}
        </View>
      );
    }

    if (status === 'ARRIVED') {
      return (
        <View style={styles.detailBox}>
          {logItem.destinationAddress ? (
            <Text style={styles.timelineAddress}>
              <Text style={styles.addressBold}>Đã có mặt tại:</Text> {logItem.destinationAddress}
            </Text>
          ) : null}
          {logItem.note && !logItem.note.startsWith('Chuyển trạng thái sang') ? (
            <Text style={styles.timelineNote}>
              <Text style={styles.addressBold}>Chi tiết:</Text> {logItem.note}
            </Text>
          ) : null}
        </View>
      );
    }

    if (status === 'ACCEPTED' || status === 'AGENCY_ASSIGNED') {
      return (
        <View style={styles.detailBox}>
          {logItem.artistName ? (
            <Text style={styles.timelineInfoRow}>
              <Text style={styles.addressBold}>Chuyên viên:</Text> {logItem.artistName} {logItem.artistPhone ? `(${logItem.artistPhone})` : ''}
            </Text>
          ) : null}
          {logItem.destinationAddress ? (
            <Text style={styles.timelineAddress}>
              <Text style={styles.addressBold}>Điểm hẹn:</Text> {logItem.destinationAddress}
            </Text>
          ) : null}
          {logItem.note && !logItem.note.startsWith('Chuyển trạng thái sang') ? (
            <Text style={styles.timelineNote}>
              <Text style={styles.addressBold}>Chi tiết:</Text> {logItem.note}
            </Text>
          ) : null}
        </View>
      );
    }

    if (status === 'REQUESTED' || status === 'PENDING_DEPOSIT' || status === 'PENDING_AGENCY_DISPATCH') {
      const pkgName = activeData?.packageName || pastBooking?.packageName || 'Dịch vụ make-up';
      const total = activeData?.totalAmount ?? pastBooking?.totalAmount;
      const deposit = activeData?.depositAmount ?? pastBooking?.depositAmount;
      const dest = activeData?.destinationAddress || pastBooking?.destinationAddress || logItem.destinationAddress;

      return (
        <View style={styles.detailBox}>
          <Text style={styles.timelineInfoRow}>
            <Text style={styles.addressBold}>Gói dịch vụ:</Text> {pkgName}
          </Text>
          {dest ? (
            <Text style={styles.timelineInfoRow}>
              <Text style={styles.addressBold}>Địa chỉ làm đẹp:</Text> {dest}
            </Text>
          ) : null}
          <Text style={styles.timelineInfoRow}>
            <Text style={styles.addressBold}>Chi phí:</Text> Đã cọc {formatVnd(deposit)} • Tổng {formatVnd(total)}
          </Text>
          {logItem.note && !logItem.note.startsWith('Chuyển trạng thái sang') ? (
            <Text style={styles.timelineNote}>
              <Text style={styles.addressBold}>Chi tiết:</Text> {logItem.note}
            </Text>
          ) : null}
        </View>
      );
    }

    if (status === 'IN_PROGRESS') {
      const artist = logItem.artistName || activeData?.muaName || 'Chuyên viên làm đẹp';
      return (
        <View style={styles.detailBox}>
          <Text style={styles.timelineInfoRow}>
            <Text style={styles.addressBold}>Chuyên viên:</Text> {artist}
          </Text>
          {logItem.note && !logItem.note.startsWith('Chuyển trạng thái sang') ? (
            <Text style={styles.timelineNote}>
              <Text style={styles.addressBold}>Chi tiết:</Text> {logItem.note}
            </Text>
          ) : null}
        </View>
      );
    }

    if (status === 'COMPLETED' || status === 'PAID_OUT') {
      const total = activeData?.totalAmount ?? pastBooking?.totalAmount;
      return (
        <View style={styles.detailBox}>
          <Text style={styles.timelineInfoRow}>
            <Text style={styles.addressBold}>Kết quả:</Text> Ca làm đẹp đã hoàn tất thành công.
          </Text>
          {total !== undefined ? (
            <Text style={styles.timelineInfoRow}>
              <Text style={styles.addressBold}>Tổng chi phí:</Text> {formatVnd(total)}
            </Text>
          ) : null}
          {logItem.note && !logItem.note.startsWith('Chuyển trạng thái') ? (
            <Text style={styles.timelineNote}>
              <Text style={styles.addressBold}>Chi tiết:</Text> {logItem.note}
            </Text>
          ) : null}
        </View>
      );
    }

    if (status === 'CANCELLED' || status === 'CANCELLED_EXPIRED') {
      const cancelReason =
        logItem.note ||
        pastBooking?.cancellationReason ||
        pastBooking?.note ||
        'Lịch hẹn đã bị hủy.';
      return (
        <View style={styles.detailBox}>
          <Text style={[styles.timelineInfoRow, { color: '#DC2626' }]}>
            <Text style={styles.addressBold}>Lý do hủy:</Text> {cancelReason}
          </Text>
          {logItem.changedBy ? (
            <Text style={styles.timelineChangedBy}>
              <Text style={styles.addressBold}>Người thực hiện:</Text> {logItem.changedBy}
            </Text>
          ) : null}
        </View>
      );
    }

    if (status === 'DISPUTED') {
      const disputeReason =
        logItem.note ||
        pastBooking?.note ||
        pastBooking?.cancellationReason ||
        'Đang tiếp nhận xử lý khiếu nại của đơn hàng.';
      return (
        <View style={styles.detailBox}>
          <Text style={[styles.timelineInfoRow, { color: '#D97706' }]}>
            <Text style={styles.addressBold}>Nội dung khiếu nại:</Text> {disputeReason}
          </Text>
          {logItem.changedBy ? (
            <Text style={styles.timelineChangedBy}>
              <Text style={styles.addressBold}>Người báo cáo:</Text> {logItem.changedBy}
            </Text>
          ) : null}
        </View>
      );
    }

    if (status === 'DISPUTE_REFUNDED') {
      const refundReason =
        logItem.note ||
        pastBooking?.note ||
        'Admin đã giải quyết khiếu nại và hoàn tiền cọc/chi phí cho khách hàng.';
      return (
        <View style={styles.detailBox}>
          <Text style={[styles.timelineInfoRow, { color: '#0284C7' }]}>
            <Text style={styles.addressBold}>Lý do hoàn tiền:</Text> {refundReason}
          </Text>
          {logItem.changedBy ? (
            <Text style={styles.timelineChangedBy}>
              <Text style={styles.addressBold}>Người xử lý:</Text> {logItem.changedBy}
            </Text>
          ) : null}
        </View>
      );
    }

    if (status === 'DISPUTE_COMPENSATED') {
      const compReason =
        logItem.note ||
        pastBooking?.note ||
        'Admin đã giải quyết khiếu nại và bồi thường/quyết toán cho chuyên viên.';
      return (
        <View style={styles.detailBox}>
          <Text style={[styles.timelineInfoRow, { color: '#16A34A' }]}>
            <Text style={styles.addressBold}>Lý do bồi thường:</Text> {compReason}
          </Text>
          {logItem.changedBy ? (
            <Text style={styles.timelineChangedBy}>
              <Text style={styles.addressBold}>Người xử lý:</Text> {logItem.changedBy}
            </Text>
          ) : null}
        </View>
      );
    }

    // Cho bất kỳ trạng thái nào khác có ghi chú hoặc người thực hiện
    if (logItem.note || logItem.changedBy) {
      return (
        <View style={styles.detailBox}>
          {logItem.note && !logItem.note.startsWith('Chuyển trạng thái sang') ? (
            <Text style={styles.timelineNote}>
              <Text style={styles.addressBold}>Chi tiết:</Text> {logItem.note}
            </Text>
          ) : null}
          {logItem.changedBy ? (
            <Text style={styles.timelineChangedBy}>
              <Text style={styles.addressBold}>Cập nhật bởi:</Text> {logItem.changedBy}
            </Text>
          ) : null}
        </View>
      );
    }

    return null;
  };

  const currentStep = activeStatusMeta?.step || 1;

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Theo Dõi Đơn Hàng</Text>
          <Text style={styles.headerSubtitle}>Hoạt động thời gian thực của đơn hàng</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Yêu cầu đăng nhập</Text>
          <Text style={styles.emptySubtitle}>Vui lòng đăng nhập để theo dõi tiến trình đơn hàng của bạn.</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.primaryButtonText}>Đăng Nhập Ngay</Text>
          </TouchableOpacity>
        </View>
        <AppBottomNavBar activeTab="tracking" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Theo Dõi Đơn Hàng</Text>
            <Text style={styles.headerSubtitle}>Tiến trình & hoạt động theo thời gian thực</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <Ionicons name="reload" size={18} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải hoạt động đơn hàng...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BrandColors.primary]} />
          }
        >
          {/* 2. KHU VỰC ĐƠN HÀNG ĐANG HOẠT ĐỘNG (CHỈ hiển thị khi có đơn active thật) */}
          {activeBooking && isActiveBookingStatus(activeBooking.currentStatus) && (
            <View style={styles.activeSectionWrapper}>
              <View style={styles.activeSectionHeader}>
                <View style={styles.livePulseDot} />
                <Text style={styles.activeSectionTitle}>ĐƠN HÀNG ĐANG DIỄN RA</Text>
              </View>

              <View style={styles.activeCard}>
                {/* Header thẻ: Loại đơn & Trạng thái */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.bookingTypeBadge}>
                      <Text style={styles.bookingTypeText}>
                        {activeBooking.bookingType === 'REALTIME_INSTANT'
                          ? 'ĐƠN KHẨN CẤP'
                          : 'ĐẶT LỊCH TRƯỚC'}
                      </Text>
                    </View>
                    <Text style={styles.bookingCodeText}>
                      #{activeBooking.bookingCode}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBadge(activeBooking.currentStatus).bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusBadge(activeBooking.currentStatus).color },
                      ]}
                    >
                      {getStatusBadge(activeBooking.currentStatus).label}
                    </Text>
                  </View>
                </View>

                {/* Banner tóm tắt trạng thái hiện tại (Trực quan, dễ hiểu) */}
                {activeStatusMeta && (
                  <View
                    style={[
                      styles.statusCalloutBanner,
                      { backgroundColor: activeStatusMeta.bannerBg },
                    ]}
                  >
                    <Ionicons
                      name={activeStatusMeta.bannerIcon}
                      size={18}
                      color={activeStatusMeta.bannerColor}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.statusCalloutText,
                        { color: activeStatusMeta.bannerColor },
                      ]}
                    >
                      {activeStatusMeta.bannerText}
                    </Text>
                  </View>
                )}

                {/* Thanh Tiến Trình (5 Bước Stepper Tinh Gọn - Không Chồng Chéo Text) */}
                <View style={styles.progressSection}>
                  <View style={styles.stepTrackWrapper}>
                    {/* Đường line xám nền */}
                    <View style={styles.stepConnectingLineBg} />
                    {/* Đường line active đã hoàn thành */}
                    <View
                      style={[
                        styles.stepConnectingLineFill,
                        {
                          width: `${Math.max(0, Math.min(100, ((currentStep - 1) / 4) * 100))}%`,
                        },
                      ]}
                    />

                    <View style={styles.stepItemsRow}>
                      {[
                        { step: 1, label: 'Đặt cọc' },
                        { step: 2, label: 'Nhận đơn' },
                        { step: 3, label: 'Di chuyển' },
                        { step: 4, label: 'Có mặt' },
                        { step: 5, label: 'Hoàn tất' },
                      ].map((item) => {
                        const isDone = currentStep > item.step;
                        const isCurrent = currentStep === item.step;
                        return (
                          <View key={item.step} style={styles.stepItemCol}>
                            <View
                              style={[
                                styles.stepCircle,
                                isDone && styles.stepCircleDone,
                                isCurrent && styles.stepCircleCurrent,
                              ]}
                            >
                              {isDone ? (
                                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                              ) : (
                                <Text
                                  style={[
                                    styles.stepNumberText,
                                    isCurrent && styles.stepNumberCurrentText,
                                  ]}
                                >
                                  {item.step}
                                </Text>
                              )}
                            </View>
                            <Text
                              style={[
                                styles.stepTitleText,
                                isDone && styles.stepTitleDone,
                                isCurrent && styles.stepTitleCurrent,
                              ]}
                              numberOfLines={1}
                            >
                              {item.label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* Khối thông tin dịch vụ & lịch hẹn */}
                <View style={styles.activeServiceInfoCard}>
                  {/* Tên gói dịch vụ */}
                  <View style={styles.activeInfoRow}>
                    <View style={styles.infoIconWrapper}>
                      <Ionicons name="sparkles" size={15} color={BrandColors.primary} />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoTitle} numberOfLines={1}>
                        {activeBooking.packageName || 'Dịch vụ trang điểm chuyên nghiệp'}
                      </Text>
                      {activeBooking.styleName ? (
                        <Text style={styles.infoSubtitle} numberOfLines={1}>
                          Phong cách: {activeBooking.styleName}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Thời gian hẹn */}
                  {(activeBooking.startTime || activeBooking.bookingDate) ? (
                    <View style={styles.activeInfoRow}>
                      <View style={styles.infoIconWrapper}>
                        <Ionicons name="calendar-outline" size={15} color="#0284C7" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>
                          {activeBooking.startTime ? `${activeBooking.startTime} ` : ''}
                          {activeBooking.bookingDate ? formatDateVN(activeBooking.bookingDate) : ''}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Địa chỉ điểm hẹn */}
                  {activeBooking.destinationAddress ? (
                    <View style={styles.activeInfoRow}>
                      <View style={styles.infoIconWrapper}>
                        <Ionicons name="location-outline" size={15} color="#E11D48" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoAddressText} numberOfLines={2}>
                          {activeBooking.destinationAddress}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Khối liên hệ đối tác (Thợ MUA hoặc Khách hàng) */}
                {(isMUA ? activeBooking.customerName : activeBooking.muaName) ? (
                  <View style={styles.partnerContactCard}>
                    <View style={styles.partnerLeft}>
                      <View style={styles.partnerAvatarCircle}>
                        <Ionicons
                          name={isMUA ? 'person' : 'sparkles'}
                          size={16}
                          color={BrandColors.primary}
                        />
                      </View>
                      <View style={styles.partnerNameBox}>
                        <Text style={styles.partnerRoleLabel}>
                          {isMUA ? 'Khách hàng' : 'Chuyên viên make-up'}
                        </Text>
                        <Text style={styles.partnerNameText} numberOfLines={1}>
                          {isMUA ? activeBooking.customerName : activeBooking.muaName}
                        </Text>
                        {!isMUA && activeBooking.muaRating ? (
                          <View style={styles.partnerRatingRow}>
                            <Ionicons name="star" size={12} color="#F59E0B" />
                            <Text style={styles.partnerRatingText}>
                              {activeBooking.muaRating.toFixed(1)}/5
                            </Text>
                            {activeBooking.agencyName ? (
                              <Text style={styles.partnerAgencyText} numberOfLines={1}>
                                {' '}• {activeBooking.agencyName}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {(isMUA ? activeBooking.customerPhone : activeBooking.muaPhone) ? (
                      <TouchableOpacity
                        style={styles.callActionButton}
                        activeOpacity={0.8}
                        onPress={() =>
                          handleCallContact(
                            isMUA ? activeBooking.customerPhone : activeBooking.muaPhone
                          )
                        }
                      >
                        <Ionicons name="call" size={13} color="#FFFFFF" />
                        <Text style={styles.callActionText}>
                          {isMUA ? 'Gọi khách' : 'Gọi thợ'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                {/* Nút hành động Live GPS (khi chuyên viên đang di chuyển) */}
                {activeBooking.currentStatus === 'ON_THE_WAY' && (
                  <TouchableOpacity
                    style={styles.gpsTrackingBtn}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/booking/tracking/${activeBooking.bookingId}` as any)}
                  >
                    <Ionicons name="navigate-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.gpsTrackingBtnText}>Theo Dõi Live GPS Chuyên Viên</Text>
                  </TouchableOpacity>
                )}

                {/* Cụm Action Buttons: Xem Chi Tiết & Lịch Sử Đơn Hàng (Modal) */}
                <View style={styles.activeActionsRow}>
                  <TouchableOpacity
                    style={styles.primaryDetailBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (isMUA) {
                        router.push(`/job-execution/${activeBooking.bookingId}` as any);
                      } else {
                        router.push(`/booking/detail/${activeBooking.bookingId}` as any);
                      }
                    }}
                  >
                    <Ionicons name="eye-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.primaryDetailBtnText}>Xem Chi Tiết Đơn</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryHistoryBtn}
                    activeOpacity={0.85}
                    onPress={() =>
                      handleOpenHistoryModal({
                        id: Number(activeBooking.bookingId),
                        bookingCode: activeBooking.bookingCode,
                        packageName: activeBooking.packageName,
                        status: activeBooking.currentStatus,
                        initialLogs: activeBooking.historyLogs,
                        activeData: activeBooking,
                      })
                    }
                  >
                    <Ionicons name="time-outline" size={15} color={BrandColors.primary} />
                    <Text style={styles.secondaryHistoryBtnText}>Lịch Sử Đơn</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* 3. DANH SÁCH CÁC ĐƠN HÀNG KHÁC (Đã hoàn thành, đã hủy, đã quyết toán...) */}
          {otherBookings.length > 0 ? (
            <View style={styles.otherSection}>
              <View style={styles.otherSectionHeaderRow}>
                <Text style={styles.otherSectionTitle}>
                  {activeBooking && isActiveBookingStatus(activeBooking.currentStatus)
                    ? 'CÁC ĐƠN HÀNG KHÁC CỦA BẠN'
                    : 'LỊCH SỬ ĐƠN HÀNG CỦA BẠN'}
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{otherBookings.length}</Text>
                </View>
              </View>

              {displayOtherBookings.map((b) => (
                <View key={b.id} style={styles.otherCard}>
                  <View style={styles.otherCardHeader}>
                    <Text style={styles.otherCode}>#{b.bookingCode || b.id}</Text>
                    <View
                      style={[
                        styles.otherStatusBadge,
                        { backgroundColor: getStatusBadge(b.status).bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.otherStatusText,
                          { color: getStatusBadge(b.status).color },
                        ]}
                      >
                        {getStatusBadge(b.status).label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.otherPackage}>
                    {b.packageName || 'Dịch vụ trang điểm'}
                  </Text>

                  {b.destinationAddress ? (
                    <View style={styles.otherMetaRow}>
                      <Ionicons name="location-outline" size={13} color="#64748B" />
                      <Text style={styles.otherAddress} numberOfLines={1}>
                        {b.destinationAddress}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.otherFooter}>
                    <View style={styles.otherMetaRow}>
                      <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
                      <Text style={styles.otherTime}>{formatDateTimeVN(b.bookingTime)}</Text>
                    </View>
                    {b.totalAmount !== undefined && b.totalAmount !== null ? (
                      <Text style={styles.otherAmountText}>{formatVnd(b.totalAmount)}</Text>
                    ) : null}
                  </View>

                  {/* 2 Nút: Xem Chi Tiết & Lịch Sử Đơn (Mở Modal) */}
                  <View style={styles.otherCardActions}>
                    <TouchableOpacity
                      style={styles.otherDetailBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (isMUA) {
                          router.push(`/job-execution/${b.id}` as any);
                        } else {
                          router.push(`/booking/detail/${b.id}` as any);
                        }
                      }}
                    >
                      <Ionicons name="eye-outline" size={14} color="#334155" />
                      <Text style={styles.otherDetailBtnText}>Chi Tiết Đơn</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.otherHistoryBtn}
                      activeOpacity={0.8}
                      onPress={() =>
                        handleOpenHistoryModal({
                          id: Number(b.id),
                          bookingCode: b.bookingCode || String(b.id),
                          packageName: b.packageName,
                          status: b.status,
                          pastBooking: b,
                        })
                      }
                    >
                      <Ionicons name="time-outline" size={14} color={BrandColors.primary} />
                      <Text style={styles.otherHistoryBtnText}>Lịch Sử Đơn</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Footer phân trang: Tải thêm 10 đơn tiếp theo hoặc đã hiển thị hết */}
              {displayLimit < otherBookings.length ? (
                <View style={styles.loadMoreFooter}>
                  <ActivityIndicator size="small" color={BrandColors.primary} />
                  <Text style={styles.loadMoreText}>Đang tải thêm 10 đơn tiếp theo...</Text>
                </View>
              ) : otherBookings.length > PAGE_CHUNK_SIZE ? (
                <View style={styles.endOfListFooter}>
                  <View style={styles.endOfListLine} />
                  <Text style={styles.endOfListText}>
                    Đã hiển thị tất cả {otherBookings.length} đơn
                  </Text>
                  <View style={styles.endOfListLine} />
                </View>
              ) : null}
            </View>
          ) : !activeBooking ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyCardTitle}>Không có đơn hàng nào</Text>
              <Text style={styles.emptyCardSubtitle}>
                Bạn chưa có lịch hẹn trang điểm nào. Hãy đặt lịch làm đẹp ngay hôm nay!
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.push('/explore')}
              >
                <Text style={styles.exploreBtnText}>Đặt Lịch Làm Đẹp Ngay</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Khoảng trống đáy đủ lớn để đơn cuối không bị AppBottomNavBar che mất */}
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* 4. MODAL LỊCH SỬ ĐƠN HÀNG CHI TIẾT (Kéo trượt xuống hoặc click bên ngoài để đóng) */}
      <DismissibleModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        showHandle={true}
        contentStyle={styles.modalBottomSheet}
      >
        {/* Header Modal (Đã loại bỏ dấu X theo yêu cầu) */}
        <View style={styles.modalHeaderRow}>
          <View style={styles.modalHeaderTitleGroup}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="time" size={18} color={BrandColors.primary} />
            </View>
            <View>
              <Text style={styles.modalMainTitle}>Lịch Sử Đơn Hàng</Text>
              <View style={styles.modalSubRow}>
                <Text style={styles.modalCodeText}>
                  #{selectedHistoryTarget?.bookingCode || selectedHistoryTarget?.id}
                </Text>
                {selectedHistoryTarget?.status ? (
                  <View
                    style={[
                      styles.modalStatusBadge,
                      { backgroundColor: getStatusBadge(selectedHistoryTarget.status).bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalStatusText,
                        { color: getStatusBadge(selectedHistoryTarget.status).color },
                      ]}
                    >
                      {getStatusBadge(selectedHistoryTarget.status).label}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* Tên dịch vụ trong Modal */}
        {selectedHistoryTarget?.packageName ? (
          <View style={styles.modalPackageBanner}>
            <Ionicons name="sparkles-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.modalPackageBannerText} numberOfLines={1}>
              {selectedHistoryTarget.packageName}
            </Text>
          </View>
        ) : null}

        <View style={styles.modalDivider} />

        {/* Nội dung danh sách Timeline */}
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollInner}
          showsVerticalScrollIndicator={true}
        >
          {loadingModalLogs ? (
            <View style={styles.modalLoadingBox}>
              <ActivityIndicator size="small" color={BrandColors.primary} />
              <Text style={styles.modalLoadingText}>Đang tải lịch sử chi tiết...</Text>
            </View>
          ) : modalLogs.length > 0 ? (
            <View style={styles.timelineSection}>
              {modalLogs.map((logItem, index) => {
                const isLast = index === modalLogs.length - 1;
                return (
                  <View key={logItem.id || index} style={styles.timelineRow}>
                    {/* Cột trục Timeline */}
                    <View style={styles.timelineAxis}>
                      <View
                        style={[
                          styles.timelineDot,
                          isLast && styles.timelineDotActive,
                        ]}
                      />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>

                    {/* Nội dung chi tiết */}
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <View style={styles.actionTitleRow}>
                          <Ionicons
                            name={getStatusSmallIconName(logItem.toStatus)}
                            size={14}
                            color="#64748B"
                            style={styles.actionSmallIcon}
                          />
                          <Text style={styles.actionTitle}>
                            {logItem.actionTitle || logItem.toStatus}
                          </Text>
                        </View>
                        <Text style={styles.timelineTime}>
                          {logItem.formattedTime
                            ? formatDateTimeVN(logItem.formattedTime)
                            : logItem.createdAt
                            ? formatDateTimeVN(logItem.createdAt)
                            : 'Vừa xong'}
                        </Text>
                      </View>

                      {/* Chi tiết từng bước */}
                      {renderLogItemDetails(
                        logItem,
                        selectedHistoryTarget?.activeData,
                        selectedHistoryTarget?.pastBooking
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.modalEmptyBox}>
              <Ionicons name="document-text-outline" size={36} color="#CBD5E1" />
              <Text style={styles.noLogsText}>
                Chưa có ghi nhận biến động trạng thái cho đơn hàng này.
              </Text>
            </View>
          )}
        </ScrollView>
      </DismissibleModal>

      {/* 5. Bottom Navigation Bar */}
      <AppBottomNavBar activeTab="tracking" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  refreshIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 20,
  },

  // Active Section
  activeSectionWrapper: {
    marginBottom: 22,
  },
  activeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  activeSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  activeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#FFE4E6',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  bookingTypeBadge: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bookingTypeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E11D48',
    letterSpacing: 0.5,
  },
  bookingCodeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Status Callout Banner
  statusCalloutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusCalloutText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },

  // Stepper Tracker
  progressSection: {
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepTrackWrapper: {
    position: 'relative',
    paddingTop: 4,
  },
  stepConnectingLineBg: {
    position: 'absolute',
    top: 17,
    left: 22,
    right: 22,
    height: 2,
    backgroundColor: '#E2E8F0',
  },
  stepConnectingLineFill: {
    position: 'absolute',
    top: 17,
    left: 22,
    height: 2,
    backgroundColor: BrandColors.primary,
  },
  stepItemsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepItemCol: {
    alignItems: 'center',
    width: 54,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  stepCircleDone: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  stepCircleCurrent: {
    backgroundColor: BrandColors.primary,
    borderColor: '#FFE4E6',
    borderWidth: 2,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  stepNumberCurrentText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  stepTitleText: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
  },
  stepTitleDone: {
    color: '#16A34A',
    fontWeight: '700',
  },
  stepTitleCurrent: {
    color: BrandColors.primary,
    fontWeight: '800',
  },

  // Active Service Info Card
  activeServiceInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 8,
  },
  activeInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoIconWrapper: {
    width: 20,
    alignItems: 'center',
    marginTop: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  infoAddressText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },

  // Partner Contact Card
  partnerContactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  partnerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  partnerAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerNameBox: {
    flex: 1,
  },
  partnerRoleLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  partnerNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  partnerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 3,
  },
  partnerRatingText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '700',
  },
  partnerAgencyText: {
    fontSize: 11,
    color: '#64748B',
  },
  callActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  callActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // GPS Tracking Button
  gpsTrackingBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 11,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  gpsTrackingBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Active Actions
  activeActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
  primaryDetailBtn: {
    flex: 1.2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  primaryDetailBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryHistoryBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  secondaryHistoryBtnText: {
    color: BrandColors.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  // Other Bookings Section
  otherSection: {
    marginTop: 4,
  },
  otherSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  otherSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  countBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  otherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  otherCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  otherCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  otherStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  otherStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  otherPackage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  otherMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  otherAddress: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  otherFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  otherTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  otherAmountText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  otherCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  otherDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  otherDetailBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  otherHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  otherHistoryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },

  // Empty State
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    marginBottom: 20,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptyCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  exploreBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 16,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },
  primaryButton: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    marginTop: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal Styles
  modalBottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 28,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  modalCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modalPackageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 2,
  },
  modalPackageBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginTop: 12,
    marginBottom: 8,
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  modalScrollInner: {
    paddingVertical: 10,
    paddingBottom: 32,
  },
  modalLoadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 10,
  },
  modalLoadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  modalEmptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 10,
  },

  // Timeline (Inside Modal)
  timelineSection: {
    marginBottom: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  timelineAxis: {
    width: 20,
    alignItems: 'center',
    marginRight: 8,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
    marginTop: 4,
  },
  timelineDotActive: {
    backgroundColor: BrandColors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  actionSmallIcon: {
    marginRight: 6,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  timelineTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  timelineAddress: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
    lineHeight: 16,
  },
  addressBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  timelineInfoRow: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
    lineHeight: 17,
  },
  timelineNote: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
    lineHeight: 17,
  },
  timelineChangedBy: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  noLogsText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  detailBox: {
    marginTop: 4,
    marginBottom: 4,
  },

  // Pagination Footers
  loadMoreFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  endOfListFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  endOfListLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
    maxWidth: 60,
  },
  endOfListText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
});

