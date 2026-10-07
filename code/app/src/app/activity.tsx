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

export default function OrderTrackingActivityScreen() {
  const { userInfo, isAuthenticated } = useAuthStore();
  const isMUA = userInfo?.roles?.includes('ROLE_FREELANCE_MUA') || userInfo?.roles?.includes('ROLE_AGENCY_STAFF');

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeBooking, setActiveBooking] = useState<CustomerActiveTrackingData | null>(null);
  const [otherBookings, setOtherBookings] = useState<CustomerBookingItem[]>([]);
  // Trạng thái dropdown mở/đóng lịch sử biến động cho từng đơn
  const [expandedBookingIds, setExpandedBookingIds] = useState<Record<number, boolean>>({});
  const [historyLogsMap, setHistoryLogsMap] = useState<Record<number, BookingHistoryLogItem[]>>({});
  const [loadingHistoryIds, setLoadingHistoryIds] = useState<Record<number, boolean>>({});

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
        setActiveBooking(activeData);

        const others = (freelancerBookings || []).filter(
          (b) => !activeData || Number(b.id) !== Number(activeData.bookingId)
        );
        const mappedOthers: CustomerBookingItem[] = others.map((b) => ({
          id: b.id,
          bookingCode: b.bookingCode,
          status: b.status,
          servicePackageName: b.packageName,
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
        setActiveBooking(activeData);

        const others = (allBookings || []).filter(
          (b) => !activeData || Number(b.id) !== Number(activeData.bookingId)
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

        // Xác định nội dung Toast thông báo chữ nổi bật
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

        // Kích hoạt Toast thông báo chữ trượt từ trên đỉnh xuống (toàn cục)
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
    fetchData();
  }, [fetchData]);

  // Định dạng tiền tệ VND chuẩn
  const formatVnd = (amount?: number) => {
    if (amount === undefined || amount === null) return '0 đ';
    return `${amount.toLocaleString('vi-VN')} đ`;
  };

  // Icon nhỏ nét mảnh tượng trưng cho từng trạng thái (không viền, không khung)
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
        return 'car-outline';
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
      default:
        return 'ellipse-outline';
    }
  };

  // Gọi điện thoại cho đối tác (chuyên viên hoặc khách hàng)
  const handleCallContact = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert('Thông báo', 'Số điện thoại liên hệ chưa được cập nhật.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  // Bật / tắt hiển thị dropdown lịch sử biến động ngay bên dưới thẻ đơn hàng
  const toggleBookingHistory = async (bookingId: number, initialLogs?: BookingHistoryLogItem[]) => {
    const isCurrentlyExpanded = !!expandedBookingIds[bookingId];
    setExpandedBookingIds((prev) => ({
      ...prev,
      [bookingId]: !isCurrentlyExpanded,
    }));

    // Nếu bấm mở ra mà chưa có logs trong cache
    if (!isCurrentlyExpanded) {
      if (initialLogs && initialLogs.length > 0) {
        setHistoryLogsMap((prev) => ({ ...prev, [bookingId]: initialLogs }));
      } else if (!historyLogsMap[bookingId]) {
        setLoadingHistoryIds((prev) => ({ ...prev, [bookingId]: true }));
        try {
          const logs = await bookingService.getBookingHistoryLogs(bookingId);
          setHistoryLogsMap((prev) => ({ ...prev, [bookingId]: logs }));
        } catch (err) {
          console.warn('[OrderTracking] Không thể tải lịch sử đơn:', bookingId, err);
          setHistoryLogsMap((prev) => ({ ...prev, [bookingId]: [] }));
        } finally {
          setLoadingHistoryIds((prev) => ({ ...prev, [bookingId]: false }));
        }
      }
    }
  };

  // Render thông tin chuyên biệt cho từng bước trạng thái
  const renderLogItemDetails = (
    logItem: BookingHistoryLogItem,
    activeData?: CustomerActiveTrackingData | null,
    pastBooking?: CustomerBookingItem | null
  ) => {
    const status = logItem.toStatus;

    // 1. NHÓM ĐÃ TIẾP NHẬN, ĐANG DI CHUYỂN, ĐÃ ĐẾN NƠI -> CHỈ nhóm này mới hiện vị trí xuất phát & điểm đến
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
          {logItem.originAddress ? (
            <Text style={styles.timelineAddress}>
              <Text style={styles.addressBold}>Xuất phát từ:</Text> {logItem.originAddress}
            </Text>
          ) : null}
          {logItem.destinationAddress ? (
            <Text style={styles.timelineAddress}>
              <Text style={styles.addressBold}>Điểm hẹn:</Text> {logItem.destinationAddress}
            </Text>
          ) : null}
        </View>
      );
    }

    // 2. NHÓM KHỞI TẠO ĐƠN & ĐẶT CỌC (REQUESTED, PENDING_DEPOSIT, PENDING_AGENCY_DISPATCH)
    if (status === 'REQUESTED' || status === 'PENDING_DEPOSIT' || status === 'PENDING_AGENCY_DISPATCH') {
      const pkgName = activeData?.packageName || pastBooking?.packageName || 'Dịch vụ make-up';
      const styleName = activeData?.styleName;
      const total = activeData?.totalAmount ?? pastBooking?.totalAmount;
      const deposit = activeData?.depositAmount ?? pastBooking?.depositAmount;
      const dest = activeData?.destinationAddress || pastBooking?.destinationAddress || logItem.destinationAddress;
      const time = activeData?.startTime && activeData?.bookingDate
        ? `${activeData.startTime} ${formatDateVN(activeData.bookingDate)}`
        : formatDateTimeVN(activeData?.bookingDate || pastBooking?.bookingTime);

      return (
        <View style={styles.detailBox}>
          <Text style={styles.timelineInfoRow}>
            <Text style={styles.addressBold}>Gói dịch vụ:</Text> {pkgName} {styleName ? `(${styleName})` : ''}
          </Text>
          {dest ? (
            <Text style={styles.timelineInfoRow}>
              <Text style={styles.addressBold}>Địa chỉ làm đẹp:</Text> {dest}
            </Text>
          ) : null}
          {time ? (
            <Text style={styles.timelineInfoRow}>
              <Text style={styles.addressBold}>Thời gian hẹn:</Text> {time}
            </Text>
          ) : null}
          <Text style={styles.timelineInfoRow}>
            <Text style={styles.addressBold}>Thanh toán:</Text> Đã cọc {formatVnd(deposit)} • Tổng {formatVnd(total)}
          </Text>
        </View>
      );
    }

    // 3. NHÓM ĐANG THỰC HIỆN TRANG ĐIỂM (IN_PROGRESS)
    if (status === 'IN_PROGRESS') {
      const artist = logItem.artistName || activeData?.muaName || 'Chuyên viên làm đẹp';
      const pkgName = activeData?.packageName || pastBooking?.packageName;
      return (
        <View style={styles.detailBox}>
          <Text style={styles.timelineInfoRow}>
            <Text style={styles.addressBold}>Trạng thái:</Text> Đang tiến hành dịch vụ {pkgName ? `"${pkgName}"` : 'trang điểm'}
          </Text>
          <Text style={styles.timelineInfoRow}>
            <Text style={styles.addressBold}>Chuyên viên:</Text> {artist}
          </Text>
        </View>
      );
    }

    // 4. NHÓM HOÀN TẤT CA (COMPLETED, PAID_OUT)
    if (status === 'COMPLETED' || status === 'PAID_OUT') {
      const total = activeData?.totalAmount ?? pastBooking?.totalAmount;
      const remaining = activeData?.remainingAmount ?? pastBooking?.remainingAmount;
      return (
        <View style={styles.detailBox}>
          <Text style={styles.timelineInfoRow}>
            <Text style={styles.addressBold}>Kết quả:</Text> Ca làm đẹp đã hoàn tất thành công.
          </Text>
          {total !== undefined ? (
            <Text style={styles.timelineInfoRow}>
              <Text style={styles.addressBold}>Tổng chi phí:</Text> {formatVnd(total)} {remaining !== undefined ? `(Còn lại: ${formatVnd(remaining)})` : ''}
            </Text>
          ) : null}
        </View>
      );
    }

    // 5. NHÓM HỦY CA / QUÁ HẠN (CANCELLED, CANCELLED_EXPIRED)
    if (status === 'CANCELLED' || status === 'CANCELLED_EXPIRED') {
      return (
        <View style={styles.detailBox}>
          <Text style={[styles.timelineInfoRow, { color: '#DC2626' }]}>
            <Text style={styles.addressBold}>Đơn hàng đã kết thúc:</Text> Lịch hẹn đã bị hủy hoặc hết thời gian chờ.
          </Text>
        </View>
      );
    }

    // 6. NHÓM KHIẾU NẠI (DISPUTED)
    if (status === 'DISPUTED') {
      return (
        <View style={styles.detailBox}>
          <Text style={[styles.timelineInfoRow, { color: '#D97706' }]}>
            <Text style={styles.addressBold}>Báo cáo sự cố:</Text> Đang tiếp nhận xử lý khiếu nại.
          </Text>
        </View>
      );
    }

    return null;
  };

  // Render dropdown sổ xuống lịch sử biến động trực tiếp trên thẻ đơn
  const renderHistoryDropdown = (
    bookingId: number,
    activeData?: CustomerActiveTrackingData | null,
    pastBooking?: CustomerBookingItem | null
  ) => {
    if (!expandedBookingIds[bookingId]) return null;

    const isLoading = !!loadingHistoryIds[bookingId];
    const logs =
      historyLogsMap[bookingId] ||
      (activeData?.bookingId === bookingId ? activeData.historyLogs : []) ||
      [];

    return (
      <View style={styles.dropdownHistoryBox}>
        <View style={styles.dropdownDivider} />
        <View style={styles.dropdownHeaderRow}>
          <Text style={styles.dropdownSectionLabel}>LỊCH SỬ BIẾN ĐỘNG CHI TIẾT</Text>
          <TouchableOpacity
            onPress={() => toggleBookingHistory(bookingId)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.dropdownCloseText}>Thu gọn ▲</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.dropdownLoadingBox}>
            <ActivityIndicator size="small" color={BrandColors.primary} />
            <Text style={styles.dropdownLoadingText}>Đang tải lịch sử chi tiết...</Text>
          </View>
        ) : logs.length > 0 ? (
          <View style={styles.timelineSection}>
            {logs.map((logItem, index) => {
              const isLast = index === logs.length - 1;
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

                    {/* Thông tin chi tiết */}
                    {renderLogItemDetails(logItem, activeData, pastBooking)}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noLogsText}>Chưa có ghi nhận biến động trạng thái.</Text>
        )}
      </View>
    );
  };

  // Xác định bước tiến trình (Step 1 -> 5)
  const currentStep = useMemo(() => {
    if (!activeBooking) return 0;
    switch (activeBooking.currentStatus) {
      case 'PENDING_DEPOSIT':
        return 1;
      case 'REQUESTED':
      case 'PENDING_AGENCY_DISPATCH':
      case 'AGENCY_ASSIGNED':
        return 1;
      case 'ACCEPTED':
        return 2;
      case 'ON_THE_WAY':
        return 3;
      case 'ARRIVED':
      case 'IN_PROGRESS':
        return 4;
      case 'COMPLETED':
      case 'PAID_OUT':
        return 5;
      default:
        return 1;
    }
  }, [activeBooking]);

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
        return { label: 'Đã Nhận Đơn', bg: '#FEF3C7', color: '#B45309' };
      case 'ON_THE_WAY':
        return { label: 'Đang Di Chuyển', bg: '#E0F2FE', color: '#0284C7' };
      case 'ARRIVED':
        return { label: 'Đã Đến Nơi', bg: '#D1FAE5', color: '#059669' };
      case 'IN_PROGRESS':
        return { label: 'Đang Thực Hiện', bg: '#FCE7F3', color: '#DB2777' };
      case 'COMPLETED':
        return { label: 'Chờ Quyết Toán', bg: '#FEF3C7', color: '#B45309' };
      case 'PAID_OUT':
        return { label: 'Đã Hoàn Tất', bg: '#DCFCE7', color: '#16A34A' };
      case 'CANCELLED':
      case 'CANCELLED_EXPIRED':
        return { label: 'Đã Hủy', bg: '#FEE2E2', color: '#DC2626' };
      case 'DISPUTED':
        return { label: 'Khiếu Nại', bg: '#FEE2E2', color: '#DC2626' };
      default:
        return { label: 'Chờ Xác Nhận', bg: '#F1F5F9', color: '#475569' };
    }
  };

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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BrandColors.primary]} />
          }
        >
          {/* 2. Đơn Hàng Đang Hoạt Động (Active Live Card) */}
          {activeBooking ? (
            <View style={styles.activeCard}>
              {/* Badge & Code */}
              <View style={styles.cardHeader}>
                <View style={styles.bookingTypeBadge}>
                  <Text style={styles.bookingTypeText}>
                    {activeBooking.bookingType === 'REALTIME_INSTANT'
                      ? 'ĐƠN KHẨN CẤP'
                      : 'ĐẶT LỊCH TRƯỚC'}
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

              <Text style={styles.bookingCodeText}>
                Mã đơn: #{activeBooking.bookingCode}
              </Text>

              {/* Thông tin đối tác (Khách hàng nếu xem bởi thợ MUA, Chuyên viên nếu xem bởi khách hàng) */}
              {isMUA ? (
                <View style={styles.artistBox}>
                  <View style={styles.artistInfo}>
                    <Text style={styles.artistName}>
                      Khách hàng: {activeBooking.customerName || 'Khách hàng'}
                    </Text>
                    {activeBooking.destinationAddress ? (
                      <Text style={styles.agencyName} numberOfLines={2}>
                        Điểm hẹn: {activeBooking.destinationAddress}
                      </Text>
                    ) : null}
                  </View>
                  {activeBooking.customerPhone ? (
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => handleCallContact(activeBooking.customerPhone)}
                    >
                      <Text style={styles.callButtonText}>Gọi Khách</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                activeBooking.muaName && (
                  <View style={styles.artistBox}>
                    <View style={styles.artistInfo}>
                      <Text style={styles.artistName}>
                        {activeBooking.muaName}
                      </Text>
                      {activeBooking.muaRating && (
                        <Text style={styles.artistRating}>
                          Đánh giá: {activeBooking.muaRating.toFixed(1)}/5
                        </Text>
                      )}
                      {activeBooking.agencyName && (
                        <Text style={styles.agencyName}>
                          Studio: {activeBooking.agencyName}
                        </Text>
                      )}
                    </View>
                    {activeBooking.muaPhone && (
                      <TouchableOpacity
                        style={styles.callButton}
                        onPress={() => handleCallContact(activeBooking.muaPhone)}
                      >
                        <Text style={styles.callButtonText}>Gọi Thợ</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )
              )}

              {/* Thanh Tiến Trình (Step Progress Indicator) */}
              <View style={styles.progressSection}>
                <Text style={styles.sectionLabel}>TIẾN TRÌNH THỰC HIỆN</Text>
                <View style={styles.stepTrack}>
                  {['Cọc', 'Nhận ca', 'Di chuyển', 'Đến nơi', 'Hoàn tất'].map((stepName, idx) => {
                    const stepNumber = idx + 1;
                    const isDone = currentStep >= stepNumber;
                    const isCurrent = currentStep === stepNumber;
                    return (
                      <View key={stepName} style={styles.stepItem}>
                        <View
                          style={[
                            styles.stepDot,
                            isDone && styles.stepDotDone,
                            isCurrent && styles.stepDotCurrent,
                          ]}
                        >
                          <Text style={[styles.stepDotNumber, isDone && styles.stepDotNumberDone]}>
                            {stepNumber}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.stepLabel,
                            isDone && styles.stepLabelDone,
                            isCurrent && styles.stepLabelCurrent,
                          ]}
                        >
                          {stepName}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Cụm Action Buttons: Xem Chi Tiết Đơn Hàng & Lịch Sử Đơn Hàng */}
              <View style={styles.activeActionsRow}>
                <TouchableOpacity
                  style={styles.primaryDetailBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (isMUA) {
                      router.push(`/job-execution/${activeBooking.bookingId}` as any);
                    } else {
                      router.push(`/booking/detail/${activeBooking.bookingId}` as any);
                    }
                  }}
                >
                  <Text style={styles.primaryDetailBtnText}>Xem Chi Tiết Đơn Hàng</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryHistoryBtn}
                  activeOpacity={0.8}
                  onPress={() => toggleBookingHistory(activeBooking.bookingId, activeBooking.historyLogs)}
                >
                  <Ionicons
                    name={expandedBookingIds[activeBooking.bookingId] ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={BrandColors.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.secondaryHistoryBtnText}>
                    {expandedBookingIds[activeBooking.bookingId] ? 'Thu Gọn Lịch Sử' : 'Lịch Sử Đơn Hàng'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Dropdown sổ xuống lịch sử biến động chi tiết của đơn active khi bấm nút */}
              {renderHistoryDropdown(activeBooking.bookingId, activeBooking, null)}

              {/* Nút hành động Live GPS (nếu đang di chuyển ở đơn khẩn cấp) */}
              {activeBooking.currentStatus === 'ON_THE_WAY' && activeBooking.bookingType === 'REALTIME_INSTANT' && (
                <TouchableOpacity
                  style={styles.gpsTrackingBtn}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/booking/tracking/${activeBooking.bookingId}` as any)}
                >
                  <Text style={styles.gpsTrackingBtnText}>Theo Dõi Live GPS Chuyên Viên</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardTitle}>Không có đơn hàng đang chạy</Text>
              <Text style={styles.emptyCardSubtitle}>
                Tất cả các ca làm đẹp trước đây của bạn đã hoàn thành hoặc bạn chưa đặt lịch hẹn mới.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.push('/explore')}
              >
                <Text style={styles.exploreBtnText}>Đặt Lịch Làm Đẹp Ngay</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 3. Lịch Sử Các Đơn Hàng Khác */}
          {otherBookings.length > 0 && (
            <View style={styles.otherSection}>
              <Text style={styles.otherSectionTitle}>CÁC ĐƠN HÀNG KHÁC CỦA BẠN</Text>
              {otherBookings.map((b) => (
                <View
                  key={b.id}
                  style={styles.otherCard}
                >
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
                  <Text style={styles.otherAddress} numberOfLines={1}>
                    {b.destinationAddress}
                  </Text>
                  <Text style={styles.otherTime}>{formatDateTimeVN(b.bookingTime)}</Text>

                  {/* 2 Nút: Xem Chi Tiết & Lịch Sử Đơn */}
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
                      <Text style={styles.otherDetailBtnText}>Chi Tiết Đơn</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.otherHistoryBtn}
                      activeOpacity={0.8}
                      onPress={() => toggleBookingHistory(b.id)}
                    >
                      <Ionicons
                        name={expandedBookingIds[b.id] ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color="#475569"
                        style={{ marginRight: 3 }}
                      />
                      <Text style={styles.otherHistoryBtnText}>
                        {expandedBookingIds[b.id] ? 'Thu Gọn' : 'Lịch Sử Đơn'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Dropdown sổ xuống lịch sử biến động chi tiết của đơn cũ khi bấm nút */}
                  {renderHistoryDropdown(b.id, null, b)}
                </View>
              ))}
            </View>
          )}

          {/* Khoảng trống đáy đủ lớn để đơn cuối không bị AppBottomNavBar che mất */}
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* 4. Bottom Navigation Bar */}
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
  activeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingTypeBadge: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bookingTypeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E11D48',
    letterSpacing: 0.5,
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
  bookingCodeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 12,
  },
  artistBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  artistRating: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '700',
    marginTop: 2,
  },
  agencyName: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  progressSection: {
    marginBottom: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepItem: {
    alignItems: 'center',
    width: 58,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepDotDone: {
    backgroundColor: '#16A34A',
  },
  stepDotCurrent: {
    backgroundColor: BrandColors.primary,
    borderWidth: 2,
    borderColor: '#FFE4E6',
  },
  stepDotNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  stepDotNumberDone: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
  },
  stepLabelDone: {
    color: '#16A34A',
    fontWeight: '700',
  },
  stepLabelCurrent: {
    color: BrandColors.primary,
    fontWeight: '800',
  },
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
  timelineNote: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  noLogsText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  gpsTrackingBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
    gap: 6,
  },
  gpsTrackingBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  otherSection: {
    marginTop: 4,
  },
  otherSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  otherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  },
  otherStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  otherStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  otherPackage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  otherAddress: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
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
  viewHistoryLink: {
    fontSize: 12,
    color: BrandColors.primary,
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
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: 520,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalTimelineRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  modalTimelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.primary,
    marginTop: 5,
    marginRight: 10,
  },
  modalTimelineContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  modalActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  modalAddress: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
    marginTop: 2,
  },
  modalNote: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    fontStyle: 'italic',
  },
  detailBox: {
    marginTop: 4,
    marginBottom: 4,
  },
  timelineInfoRow: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
    lineHeight: 17,
  },
  timelineHintText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  primaryDetailBtn: {
    flex: 1,
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
    color: '#0F172A',
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
  dropdownHistoryBox: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 10,
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dropdownSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  dropdownCloseText: {
    fontSize: 11,
    color: BrandColors.primary,
    fontWeight: '600',
  },
  dropdownLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  dropdownLoadingText: {
    fontSize: 12,
    color: '#64748B',
  },
});
