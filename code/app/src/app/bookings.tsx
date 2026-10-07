import { DismissibleModal } from '@/components/common/DismissibleModal';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { useBookingStore } from '@/store/booking.store';
import { useWorkstationStore } from '@/store/workstation.store';
import { CustomerBookingItem, bookingService } from '@/services/booking.service';
import { websocketService } from '@/services/websocket.service';
import { parseApiError } from '@/utils/error';
import {
  freelancerBookingService,
  FreelancerBookingItem,
} from '@/services/freelancer-booking.service';
import { BookingTabSegment } from '@/components/booking/BookingTabSegment';
import { BookingHistoryCard } from '@/components/booking/BookingHistoryCard';
import { TodayBookingCard } from '@/components/mua/TodayBookingCard';
import { CancelBookingModal } from '@/components/booking/CancelBookingModal';
import { AppBottomNavBar } from '@/components/common/AppBottomNavBar';

export type SortOption =
  | 'CREATED_DESC'
  | 'CREATED_ASC'
  | 'BOOKING_ASC'
  | 'BOOKING_DESC'
  | 'UPDATED_DESC'
  | 'UPDATED_ASC';

interface SortItemConfig {
  id: SortOption;
  label: string;
  badge: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SORT_OPTIONS: SortItemConfig[] = [
  {
    id: 'CREATED_DESC',
    label: 'Tạo đơn: Gần nhất → Xa nhất',
    badge: 'Tạo: Mới nhất',
    description: 'Đơn hàng vừa đặt gần đây nhất trong ngày sẽ hiển thị trên cùng (Mặc định).',
    icon: 'time-outline',
  },
  {
    id: 'CREATED_ASC',
    label: 'Tạo đơn: Xa nhất → Gần nhất',
    badge: 'Tạo: Cũ nhất',
    description: 'Đơn hàng được khởi tạo sớm nhất từ trước sẽ hiển thị đầu tiên.',
    icon: 'hourglass-outline',
  },
  {
    id: 'BOOKING_ASC',
    label: 'Thời gian hẹn: Gần nhất → Xa nhất',
    badge: 'Hẹn: Gần nhất',
    description: 'Đơn đặt lịch có giờ hẹn làm đẹp sắp tới gần nhất sẽ hiển thị trên cùng.',
    icon: 'calendar-outline',
  },
  {
    id: 'BOOKING_DESC',
    label: 'Thời gian hẹn: Xa nhất → Gần nhất',
    badge: 'Hẹn: Xa nhất',
    description: 'Đơn đặt lịch có thời gian hẹn xa nhất trong tương lai sẽ hiển thị đầu tiên.',
    icon: 'calendar-number-outline',
  },
  {
    id: 'UPDATED_DESC',
    label: 'Cập nhật: Gần nhất → Xa nhất',
    badge: 'Cập nhật: Mới nhất',
    description: 'Đơn có trạng thái vừa mới chuyển đổi gần đây nhất sẽ ưu tiên trước.',
    icon: 'sync-outline',
  },
  {
    id: 'UPDATED_ASC',
    label: 'Cập nhật: Xa nhất → Gần nhất',
    badge: 'Cập nhật: Cũ nhất',
    description: 'Đơn hàng có thời gian cập nhật lâu nhất sẽ hiển thị đầu danh sách.',
    icon: 'archive-outline',
  },
];

export type TimeframeFilter = 'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK' | 'MONTH';

interface TimeframeConfig {
  id: TimeframeFilter;
  label: string;
  badge: string;
}

const TIMEFRAME_FILTERS: TimeframeConfig[] = [
  { id: 'ALL', label: 'Tất cả các ngày', badge: 'Thời gian' },
  { id: 'TODAY', label: 'Hôm nay', badge: 'Hôm nay' },
  { id: 'TOMORROW', label: 'Ngày mai', badge: 'Ngày mai' },
  { id: 'WEEK', label: '7 ngày tới', badge: '7 ngày' },
  { id: 'MONTH', label: 'Tháng này', badge: 'Tháng này' },
];

interface StatusFilterConfig {
  id: string;
  label: string;
}

const UPCOMING_STATUS_FILTERS: StatusFilterConfig[] = [
  { id: 'ALL', label: 'Tất cả trạng thái' },
  { id: 'REQUESTED', label: 'Chờ tiếp nhận' },
  { id: 'PENDING_DEPOSIT', label: 'Chờ cọc' },
  { id: 'ACCEPTED', label: 'Đã nhận ca' },
  { id: 'ON_THE_WAY', label: 'Đang di chuyển' },
  { id: 'ARRIVED', label: 'Đã đến nơi' },
  { id: 'IN_PROGRESS', label: 'Đang thực hiện' },
];

const HISTORY_STATUS_FILTERS: StatusFilterConfig[] = [
  { id: 'ALL', label: 'Tất cả trạng thái' },
  { id: 'COMPLETED', label: 'Hoàn thành' },
  { id: 'PAID_OUT', label: 'Đã quyết toán' },
  { id: 'CANCELLED', label: 'Đã hủy' },
  { id: 'CANCELLED_EXPIRED', label: 'Hết hạn cọc' },
  { id: 'DISPUTED', label: 'Khiếu nại' },
];


export default function BookingsScreen() {
  const { userInfo, isAuthenticated } = useAuthStore();
  const isMUA = userInfo?.roles?.includes('ROLE_FREELANCE_MUA');
  const isAgencyStaff = userInfo?.roles?.includes('ROLE_AGENCY_STAFF');
  const isWorkstationRole = (isMUA || isAgencyStaff) && isAuthenticated;

  // Dữ liệu cho Khách Hàng (Customer)
  const {
    activeTab,
    upcomingBookings,
    historyBookings,
    isLoadingBookings,
    isRefreshingBookings,
    setActiveTab,
    fetchMyBookings,
    cancelBooking,
  } = useBookingStore();

  // Dữ liệu cho Thợ MUA / Nhân viên Agency
  const [freelancerUpcoming, setFreelancerUpcoming] = useState<FreelancerBookingItem[]>([]);
  const [freelancerHistory, setFreelancerHistory] = useState<FreelancerBookingItem[]>([]);
  const [isLoadingFreelancer, setIsLoadingFreelancer] = useState(false);
  const [isRefreshingFreelancer, setIsRefreshingFreelancer] = useState(false);

  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState<CustomerBookingItem | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelResultModal, setCancelResultModal] = useState<{
    visible: boolean;
    success: boolean;
    isCompensatedToMua: boolean;
    title: string;
    message: string;
    depositAmount?: number;
  } | null>(null);

  // Tìm kiếm và bảng bộ lọc, sắp xếp dùng chung.
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeFilter>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('CREATED_DESC');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [expandedFilter, setExpandedFilter] = useState<'status' | 'timeframe' | 'sort' | null>(null);

  // Animation xoay icon Reload
  const spinAnim = useRef(new Animated.Value(0)).current;

  const startSpin = () => {
    spinAnim.setValue(0);
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopSpin = () => {
    spinAnim.stopAnimation();
    spinAnim.setValue(0);
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Tải danh sách đơn hàng toàn bộ của Thợ (toàn bộ các ngày)
  const fetchFreelancerBookings = async (isRefresh = false) => {
    if (!isRefresh) setIsLoadingFreelancer(true);
    else setIsRefreshingFreelancer(true);

    try {
      const all = await freelancerBookingService.getMyAssignedBookings();
      const upcoming: FreelancerBookingItem[] = [];
      const history: FreelancerBookingItem[] = [];

      const upcomingStatuses = [
        'REQUESTED',
        'PENDING_AGENCY_DISPATCH',
        'AGENCY_ASSIGNED',
        'ACCEPTED',
        'ON_THE_WAY',
        'ARRIVED',
        'IN_PROGRESS',
      ];

      for (const item of all) {
        if (upcomingStatuses.includes(item.status)) {
          upcoming.push(item);
        } else {
          history.push(item);
        }
      }

      // Sắp xếp mặc định: Đơn tạo gần nhất trong ngày lên đầu (createdAt giảm dần)
      upcoming.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      // Sắp xếp lịch sử thợ: Đơn tạo mới nhất lên đầu
      history.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setFreelancerUpcoming(upcoming);
      setFreelancerHistory(history);
    } catch {
      setFreelancerUpcoming([]);
      setFreelancerHistory([]);
    } finally {
      setIsLoadingFreelancer(false);
      setIsRefreshingFreelancer(false);
    }
  };

  // Tự động làm mới dữ liệu khi người dùng chuyển vào tab "Lịch Hẹn"
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        if (isWorkstationRole) {
          fetchFreelancerBookings();
        } else {
          fetchMyBookings();
        }
      }
    }, [isAuthenticated, isWorkstationRole])
  );

  // Tự động lắng nghe cập nhật realtime từ WebSocket để làm mới màn hình không cần bấm thủ công
  const { profile } = useWorkstationStore();
  const effectiveMuaId = profile?.muaId;

  useEffect(() => {
    if (!isAuthenticated) return;

    let isSubscribed = true;
    const activeTopics: string[] = [];

    const setupWs = async () => {
      try {
        await websocketService.connect();
        if (!isSubscribed) return;

        if (isWorkstationRole) {
          // Lắng nghe topic của thợ MUA
          const dismissTopic = '/topic/instant-dismiss';
          websocketService.subscribe(dismissTopic, () => {
            fetchFreelancerBookings(true);
          });
          activeTopics.push(dismissTopic);

          if (effectiveMuaId) {
            const muaTopic = `/topic/mua-bookings/${effectiveMuaId}`;
            websocketService.subscribe(muaTopic, () => {
              fetchFreelancerBookings(true);
            });
            activeTopics.push(muaTopic);

            const revokeTopic = `/topic/mua-offer-revoked/${effectiveMuaId}`;
            websocketService.subscribe(revokeTopic, () => {
              fetchFreelancerBookings(true);
            });
            activeTopics.push(revokeTopic);
          }
        } else if (userInfo?.id) {
          // Lắng nghe topic của khách hàng
          const customerTopic = `/topic/customer-bookings/${userInfo.id}`;
          websocketService.subscribe(customerTopic, () => {
            fetchMyBookings(true);
          });
          activeTopics.push(customerTopic);
        }
      } catch (err) {
        console.warn('[BookingsScreen] WebSocket setup warning:', err);
      }
    };

    setupWs();

    return () => {
      isSubscribed = false;
      activeTopics.forEach((t) => {
        try {
          websocketService.unsubscribe(t);
        } catch {}
      });
    };
  }, [isAuthenticated, isWorkstationRole, effectiveMuaId, userInfo?.id]);

  const upcomingCount = isWorkstationRole ? freelancerUpcoming.length : upcomingBookings.length;
  const historyCount = isWorkstationRole ? freelancerHistory.length : historyBookings.length;
  const isLoading = isWorkstationRole ? isLoadingFreelancer : isLoadingBookings;
  const isRefreshing = isWorkstationRole ? isRefreshingFreelancer : isRefreshingBookings;

  const rawList = isWorkstationRole
    ? (activeTab === 'UPCOMING' ? freelancerUpcoming : freelancerHistory)
    : (activeTab === 'UPCOMING' ? upcomingBookings : historyBookings);

  // Helper kiểm tra đơn có khớp khung thời gian hẹn đặt lịch không
  const matchesTimeframe = (item: any, tf: TimeframeFilter): boolean => {
    if (tf === 'ALL') return true;

    let itemDateStr = '';
    if (item.bookingDate) {
      itemDateStr = item.bookingDate;
    } else if (item.bookingTime) {
      itemDateStr = item.bookingTime.split('T')[0];
    } else if (item.createdAt) {
      itemDateStr = item.createdAt.split('T')[0];
    }
    if (!itemDateStr) return true;

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    if (tf === 'TODAY') {
      return itemDateStr === todayStr;
    }
    if (tf === 'TOMORROW') {
      return itemDateStr === tomorrowStr;
    }
    if (tf === 'WEEK') {
      const itemTime = new Date(itemDateStr).getTime();
      const nowTime = now.getTime();
      const diffDays = (itemTime - nowTime) / (1000 * 60 * 60 * 24);
      return diffDays >= -1 && diffDays <= 7;
    }
    if (tf === 'MONTH') {
      const itemD = new Date(itemDateStr);
      return itemD.getFullYear() === now.getFullYear() && itemD.getMonth() === now.getMonth();
    }
    return true;
  };

  // Xử lý Lọc & Sắp xếp dữ liệu (Client-side Data Pipeline)
  const filteredAndSortedList = useMemo(() => {
    let result = [...rawList];

    // 1. Lọc theo khung thời gian đặt lịch
    if (selectedTimeframe !== 'ALL') {
      result = result.filter((item) => matchesTimeframe(item, selectedTimeframe));
    }

    // 2. Lọc theo trạng thái đơn hàng
    if (selectedStatus !== 'ALL') {
      if (selectedStatus === 'DISPUTED') {
        result = result.filter(
          (item) =>
            item.status === 'DISPUTED' ||
            item.status === 'DISPUTE_REFUNDED' ||
            item.status === 'DISPUTE_COMPENSATED'
        );
      } else {
        result = result.filter((item) => item.status === selectedStatus);
      }
    }

    // 3. Lọc theo từ khóa tìm kiếm (mã đơn, dịch vụ, thợ/khách, địa chỉ)
    const kw = searchKeyword.trim().toLowerCase();
    if (kw) {
      result = result.filter((item: any) => {
        const code = (item.bookingCode || '').toLowerCase();
        const pkg = (item.packageName || '').toLowerCase();
        const address = (item.destinationAddress || '').toLowerCase();
        const name = (item.customerName || item.muaName || '').toLowerCase();
        return code.includes(kw) || pkg.includes(kw) || address.includes(kw) || name.includes(kw);
      });
    }

    // 4. Sắp xếp danh sách theo tiêu chí
    result.sort((a: any, b: any) => {
      const getCreatedTime = (item: any) => (item.createdAt ? new Date(item.createdAt).getTime() : 0);
      const getUpdatedTime = (item: any) => {
        if (item.updatedAt) return new Date(item.updatedAt).getTime();
        return getCreatedTime(item);
      };
      const getBookingTime = (item: any) => {
        if (item.bookingTime) return new Date(item.bookingTime).getTime();
        if (item.bookingDate) {
          return new Date(`${item.bookingDate}T${item.startTime || '00:00:00'}`).getTime();
        }
        return getCreatedTime(item);
      };

      switch (sortOption) {
        case 'CREATED_DESC':
          return getCreatedTime(b) - getCreatedTime(a);
        case 'CREATED_ASC':
          return getCreatedTime(a) - getCreatedTime(b);
        case 'BOOKING_ASC':
          return getBookingTime(a) - getBookingTime(b);
        case 'BOOKING_DESC':
          return getBookingTime(b) - getBookingTime(a);
        case 'UPDATED_DESC':
          return getUpdatedTime(b) - getUpdatedTime(a);
        case 'UPDATED_ASC':
          return getUpdatedTime(a) - getUpdatedTime(b);
        default:
          return getCreatedTime(b) - getCreatedTime(a);
      }
    });

    return result;
  }, [rawList, selectedTimeframe, selectedStatus, searchKeyword, sortOption]);

  const handleRefresh = async () => {
    startSpin();
    try {
      if (isWorkstationRole) {
        await fetchFreelancerBookings(true);
      } else {
        await fetchMyBookings(true);
      }
    } finally {
      stopSpin();
    }
  };

  const handleTabChange = (newTab: 'UPCOMING' | 'HISTORY') => {
    setActiveTab(newTab);
    setSelectedStatus('ALL');
    setSelectedTimeframe('ALL');
  };

  const handleResetFilters = () => {
    setSearchKeyword('');
    setSelectedStatus('ALL');
    setSelectedTimeframe('ALL');
    setSortOption('CREATED_DESC');
  };

  const handleConfirmCancel = async (
    bookingId: number,
    reason: string,
    isWithin2Hours: boolean,
    isDispute?: boolean,
    emergencyProofUrl?: string
  ) => {
    setIsCancelling(true);
    const targetBooking = selectedBookingToCancel;
    try {
      if (isDispute) {
        // Khách hàng khiếu nại lên Admin do đã đến hoặc quá giờ hẹn
        await bookingService.transitionBookingState(bookingId, 'DISPUTED', reason, emergencyProofUrl);
        setSelectedBookingToCancel(null);

        const formattedDeposit = targetBooking?.depositAmount
          ? new Intl.NumberFormat('vi-VN').format(targetBooking.depositAmount) + ' đ'
          : '0 đ';

        setCancelResultModal({
          visible: true,
          success: true,
          isCompensatedToMua: false,
          title: 'Đã Gửi Khiếu Nại Lên Admin',
          message: `Báo cáo khiếu nại của bạn về đơn hẹn #${targetBooking?.bookingCode || bookingId} đã được chuyển tới Ban Quản Trị. Admin sẽ xác minh sự việc và hoàn trả tiền cọc (${formattedDeposit}) về Ví của bạn sau khi duyệt.`,
          depositAmount: targetBooking?.depositAmount,
        });
      } else if (targetBooking?.status === 'REQUESTED') {
        await bookingService.cancelRequestedBooking(bookingId, reason);
        setSelectedBookingToCancel(null);

        const formattedDeposit = targetBooking?.depositAmount
          ? new Intl.NumberFormat('vi-VN').format(targetBooking.depositAmount) + ' đ'
          : '0 đ';

        setCancelResultModal({
          visible: true,
          success: true,
          isCompensatedToMua: isWithin2Hours,
          title: 'Đã Hủy Lịch Hẹn Thành Công',
          message: `Yêu cầu hủy lịch hẹn của bạn đã hoàn tất. 100% tiền cọc (${formattedDeposit}) đã được hoàn trả về Ví của bạn.`,
          depositAmount: targetBooking?.depositAmount,
        });
      } else {
        await cancelBooking(bookingId, reason);
        setSelectedBookingToCancel(null);

        const formattedDeposit = targetBooking?.depositAmount
          ? new Intl.NumberFormat('vi-VN').format(targetBooking.depositAmount) + ' đ'
          : '0 đ';

        setCancelResultModal({
          visible: true,
          success: true,
          isCompensatedToMua: isWithin2Hours,
          title: isWithin2Hours ? 'Đã Hủy Ca (Bồi Thường Cho Thợ)' : 'Đã Hủy Lịch Hẹn Thành Công',
          message: isWithin2Hours
            ? `Lịch hẹn đã được hủy. Vì bạn hủy trong vòng 2 tiếng trước giờ hẹn, toàn bộ số tiền cọc (${formattedDeposit}) đã được dùng để bồi thường cho chuyên viên make-up.`
            : `Yêu cầu hủy lịch hẹn của bạn đã hoàn tất. 100% tiền cọc (${formattedDeposit}) đã được hoàn trả về Ví của bạn.`,
          depositAmount: targetBooking?.depositAmount,
        });
      }

      await fetchMyBookings(true);
    } catch (err: any) {
      const parsed = parseApiError(err);
      setSelectedBookingToCancel(null);
      setCancelResultModal({
        visible: true,
        success: false,
        isCompensatedToMua: false,
        title: 'Không Thể Hủy Ca Hẹn',
        message: parsed.message || 'Hệ thống không thể xử lý yêu cầu hủy ca lúc này. Vui lòng thử lại sau.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleTrack = (booking: CustomerBookingItem) => {
    if (booking.status === 'ACCEPTED' && !booking.isDepositPaid) {
      router.push(`/booking/instant-matched/${booking.id}` as any);
    } else {
      router.push(`/booking/tracking/${booking.id}` as any);
    }
  };

  const handleReview = (booking: CustomerBookingItem) => {
    Alert.alert(
      'Đánh Giá Dịch Vụ ⭐',
      `Gửi lời cảm ơn và đánh giá chuyên viên MUA cho đơn ${booking.bookingCode}.`
    );
  };

  const handleRebook = () => {
    router.replace('/explore');
  };

  const currentStatusFilters = activeTab === 'UPCOMING' ? UPCOMING_STATUS_FILTERS : HISTORY_STATUS_FILTERS;

  const activeFilterCount = Number(selectedStatus !== 'ALL') + Number(selectedTimeframe !== 'ALL') + Number(sortOption !== 'CREATED_DESC');

  const renderFilterHeader = (
    section: 'status' | 'timeframe' | 'sort',
    title: string,
    value: string,
  ) => (
    <TouchableOpacity
      style={styles.filterGroupHeader}
      onPress={() => setExpandedFilter((current) => current === section ? null : section)}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${value}`}
      accessibilityState={{ expanded: expandedFilter === section }}
      activeOpacity={0.75}
    >
      <View style={styles.filterGroupContent}>
        <Text style={styles.filterGroupTitle}>{title}</Text>
        <Text style={styles.filterGroupValue} numberOfLines={1}>{value}</Text>
      </View>
      <Ionicons name={expandedFilter === section ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
    </TouchableOpacity>
  );


  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* HEADER TOP BAR VỚI NÚT RELOAD TRỰC TIẾP */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>
            {isWorkstationRole ? 'Lịch Ca Làm Việc' : 'Lịch Hẹn Của Tôi'}
          </Text>
          <Text style={styles.headerSubtitle}>
            Hiển thị {filteredAndSortedList.length} / {rawList.length} đơn
          </Text>
        </View>

        {/* NÚT RELOAD */}
        <TouchableOpacity
          style={[styles.reloadButton, (isLoading || isRefreshing) && styles.reloadButtonActive]}
          onPress={handleRefresh}
          disabled={isLoading || isRefreshing}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="reload" size={17} color={BrandColors.primary} />
          </Animated.View>
          <Text style={styles.reloadButtonText}>Làm mới</Text>
        </TouchableOpacity>
      </View>

      {/* SEGMENT TABS */}
      <View style={styles.tabContainer}>
        <BookingTabSegment
          activeTab={activeTab}
          upcomingCount={upcomingCount}
          historyCount={historyCount}
          onTabChange={handleTabChange}
        />
      </View>

      {/* THANH TÌM KIẾM & NÚT MỞ BỘ LỌC */}
      <View style={styles.filterSection}>
        {/* INPUT TÌM KIẾM */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              isWorkstationRole
                ? 'Tìm theo mã đơn, khách hàng, gói...'
                : 'Tìm theo mã đơn, thợ MUA, gói...'
            }
            placeholderTextColor="#94A3B8"
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchKeyword.length > 0 && (
            <TouchableOpacity onPress={() => setSearchKeyword('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>

        {/* NÚT PHỄU CHỨA TẤT CẢ LỰA CHỌN LỌC & SẮP XẾP */}
        <TouchableOpacity
          style={[styles.filterIconButton, activeFilterCount > 0 && styles.dropdownButtonActive]}
          onPress={() => {
            setExpandedFilter(null);
            setIsFilterModalVisible(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Bộ lọc và sắp xếp, ${activeFilterCount} lựa chọn đang áp dụng`}
          accessibilityState={{ expanded: isFilterModalVisible }}
          activeOpacity={0.75}
        >
          <Ionicons name="funnel-outline" size={21} color={activeFilterCount > 0 ? BrandColors.primary : '#475569'} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* DANH SÁCH ĐƠN HÀNG */}
      {isLoading && rawList.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>
            {isWorkstationRole
              ? 'Đang tải danh sách ca làm việc...'
              : 'Đang tải danh sách lịch hẹn...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedList as any[]}
          keyExtractor={(item) => `booking-${item.id}`}
          renderItem={({ item }) =>
            isWorkstationRole ? (
              <TodayBookingCard
                booking={item as FreelancerBookingItem}
                onRefresh={handleRefresh}
              />
            ) : (
              <BookingHistoryCard
                booking={item as CustomerBookingItem}
                onCancelPress={(b) => setSelectedBookingToCancel(b)}
                onTrackPress={handleTrack}
                onReviewPress={handleReview}
                onRebookPress={handleRebook}
              />
            )
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[BrandColors.primary]}
            />
          }
          ListEmptyComponent={
            rawList.length > 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="funnel-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Không có đơn nào khớp bộ lọc</Text>
                <Text style={styles.emptySubtitle}>
                  Thử đổi trạng thái, thời gian hẹn hoặc bấm Xóa lọc để xem toàn bộ danh sách đơn.
                </Text>
                <TouchableOpacity
                  style={styles.resetFilterBtn}
                  onPress={handleResetFilters}
                  activeOpacity={0.88}
                >
                  <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.resetFilterBtnText}>Xóa Toàn Bộ Lọc</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={54} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>
                  {isWorkstationRole
                    ? (activeTab === 'UPCOMING'
                        ? 'Bạn chưa có ca làm việc nào sắp tới'
                        : 'Chưa có lịch sử ca làm nào')
                    : (activeTab === 'UPCOMING'
                        ? 'Bạn chưa có lịch hẹn nào sắp tới'
                        : 'Chưa có lịch sử làm đẹp nào')}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {isWorkstationRole
                    ? (activeTab === 'UPCOMING'
                        ? 'Hãy bật công tắc Trực tuyến tại Bàn làm việc để hệ thống điều phối đơn khách hàng và đơn khẩn cấp đến bạn.'
                        : 'Các ca làm việc sau khi hoàn tất hoặc kết thúc sẽ được lưu trữ tại đây.')
                    : 'Khám phá ngay các dịch vụ trang điểm chuyên nghiệp gần bạn và đặt lịch nhanh chóng.'}
                </Text>
                <TouchableOpacity
                  style={styles.exploreBtn}
                  onPress={() => {
                    if (isWorkstationRole) {
                      router.replace('/');
                    } else {
                      router.replace('/explore');
                    }
                  }}
                  activeOpacity={0.88}
                >
                  <Text style={styles.exploreBtnText}>
                    {isWorkstationRole ? 'Về Bàn Làm Việc' : 'Khám Phá Dịch Vụ Ngay'}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          }
        />
      )}

      {/* BẢNG BỘ LỌC & SẮP XẾP */}
      <DismissibleModal visible={isFilterModalVisible} onClose={() => setIsFilterModalVisible(false)} overlayStyle={styles.modalBackdrop} contentStyle={styles.dropdownModalSheet}>


            <View style={styles.dropdownModalHeader}>
              <View style={styles.dropdownModalHeaderTitleRow}>
                <Ionicons name="funnel-outline" size={20} color={BrandColors.primary} />
                <Text style={styles.dropdownModalTitle}>Bộ lọc & Sắp xếp</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsFilterModalVisible(false)}
                style={styles.dropdownModalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Đóng bộ lọc"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>



            {/* DANH SÁCH TÙY CHỌN */}
            <ScrollView style={styles.modalScrollList} showsVerticalScrollIndicator={false}>
              {/* 1. OPTIONS TRẠNG THÁI */}
              {renderFilterHeader('status', 'Trạng thái', currentStatusFilters.find((item) => item.id === selectedStatus)?.label ?? 'Tất cả trạng thái')}
              {expandedFilter === 'status' &&
                currentStatusFilters.map((item) => {
                  const isSelected = selectedStatus === item.id;
                  return (
                    <TouchableOpacity
                      key={`status-opt-${item.id}`}
                      style={[
                        styles.dropdownOptionRow,
                        isSelected && styles.dropdownOptionRowSelected,
                      ]}
                      onPress={() => {
                        setSelectedStatus(item.id);
                        setExpandedFilter(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownOptionLeft}>
                        <View
                          style={[
                            styles.statusDot,
                            isSelected && styles.statusDotSelected,
                          ]}
                        />
                        <Text
                          style={[
                            styles.dropdownOptionLabel,
                            isSelected && styles.dropdownOptionLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.radioOuter,
                          isSelected && styles.radioOuterSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}

              {/* 2. OPTIONS THỜI GIAN HẸN */}
              {renderFilterHeader('timeframe', 'Thời gian hẹn', TIMEFRAME_FILTERS.find((item) => item.id === selectedTimeframe)?.label ?? 'Tất cả các ngày')}
              {expandedFilter === 'timeframe' &&
                TIMEFRAME_FILTERS.map((item) => {
                  const isSelected = selectedTimeframe === item.id;
                  return (
                    <TouchableOpacity
                      key={`tf-opt-${item.id}`}
                      style={[
                        styles.dropdownOptionRow,
                        isSelected && styles.dropdownOptionRowSelected,
                      ]}
                      onPress={() => {
                        setSelectedTimeframe(item.id);
                        setExpandedFilter(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownOptionLeft}>
                        <Ionicons
                          name="calendar-outline"
                          size={18}
                          color={isSelected ? BrandColors.primary : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.dropdownOptionLabel,
                            isSelected && styles.dropdownOptionLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.radioOuter,
                          isSelected && styles.radioOuterSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}

              {/* 3. OPTIONS SẮP XẾP */}
              {renderFilterHeader('sort', 'Sắp xếp', SORT_OPTIONS.find((item) => item.id === sortOption)?.label ?? '')}
              {expandedFilter === 'sort' &&
                SORT_OPTIONS.map((item) => {
                  const isSelected = sortOption === item.id;
                  return (
                    <TouchableOpacity
                      key={`sort-opt-${item.id}`}
                      style={[
                        styles.dropdownOptionRow,
                        isSelected && styles.dropdownOptionRowSelected,
                      ]}
                      onPress={() => {
                        setSortOption(item.id);
                        setExpandedFilter(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.sortOptionIconBox,
                          isSelected && styles.sortOptionIconBoxSelected,
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={isSelected ? BrandColors.primary : '#64748B'}
                        />
                      </View>
                      <View style={styles.sortOptionContent}>
                        <Text
                          style={[
                            styles.dropdownOptionLabel,
                            isSelected && styles.dropdownOptionLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text style={styles.sortOptionDescText}>{item.description}</Text>
                      </View>
                      <View
                        style={[
                          styles.radioOuter,
                          isSelected && styles.radioOuterSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.filterResetAction} onPress={handleResetFilters} accessibilityRole="button">
                <Text style={styles.dropdownButtonText}>Xóa lọc</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterDoneAction} onPress={() => setIsFilterModalVisible(false)} accessibilityRole="button">
                <Text style={styles.resetFilterBtnText}>Xem {filteredAndSortedList.length} đơn</Text>
              </TouchableOpacity>
            </View>
          </DismissibleModal>

      {/* MODAL HỦY LỊCH HẸN (DÀNH CHO KHÁCH HÀNG) */}
      <CancelBookingModal
        visible={!!selectedBookingToCancel}
        booking={selectedBookingToCancel}
        isCancelling={isCancelling}
        onConfirmCancel={handleConfirmCancel}
        onClose={() => setSelectedBookingToCancel(null)}
      />

      {/* MODAL KẾT QUẢ HỦY CA HẸN (HIỂN THỊ RÕ RÀNG TRÁNH BỊ IOS NUỐT) */}
      <DismissibleModal
        visible={!!cancelResultModal?.visible}
        onClose={() => setCancelResultModal(null)}
        overlayStyle={styles.resultModalOverlay}
        contentStyle={styles.resultModalBox}
      >
        <View
          style={[
            styles.resultIconCircle,
            {
              backgroundColor: !cancelResultModal?.success
                ? '#FEE2E2'
                : cancelResultModal.isCompensatedToMua
                ? '#FEF3C7'
                : '#ECFDF5',
            },
          ]}
        >
          <Ionicons
            name={
              !cancelResultModal?.success
                ? 'alert-circle'
                : cancelResultModal.isCompensatedToMua
                ? 'warning'
                : 'checkmark-circle'
            }
            size={38}
            color={
              !cancelResultModal?.success
                ? '#DC2626'
                : cancelResultModal.isCompensatedToMua
                ? '#D97706'
                : '#059669'
            }
          />
        </View>

        <Text
          style={[
            styles.resultTitle,
            {
              color: !cancelResultModal?.success
                ? '#DC2626'
                : cancelResultModal.isCompensatedToMua
                ? '#B45309'
                : '#0F172A',
            },
          ]}
        >
          {cancelResultModal?.title}
        </Text>

        <Text style={styles.resultMessage}>{cancelResultModal?.message}</Text>

        <TouchableOpacity
          style={[
            styles.resultCloseBtn,
            {
              backgroundColor: !cancelResultModal?.success
                ? '#DC2626'
                : cancelResultModal.isCompensatedToMua
                ? '#D97706'
                : '#0F172A',
            },
          ]}
          onPress={() => setCancelResultModal(null)}
          activeOpacity={0.88}
        >
          <Text style={styles.resultCloseBtnText}>Đã Hiểu</Text>
        </TouchableOpacity>
      </DismissibleModal>

      {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG */}
      <AppBottomNavBar activeTab="appointments" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  reloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.subtle,
    borderWidth: 1,
    borderColor: BrandColors.softBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  reloadButtonActive: {
    opacity: 0.7,
  },
  reloadButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
  },
  filterIconButton: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18,
    borderRadius: 9, paddingHorizontal: 4, backgroundColor: BrandColors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  filterGroupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, marginVertical: 6, borderRadius: 12,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterGroupContent: { flex: 1, minWidth: 0 },
  filterGroupTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  filterGroupValue: { fontSize: 12, color: '#64748B', marginTop: 4 },
  filterActions: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  filterResetAction: { paddingHorizontal: 20, minHeight: 44, justifyContent: 'center', borderRadius: 12, backgroundColor: '#F1F5F9' },
  filterDoneAction: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: BrandColors.primary },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 2,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
    gap: 5,
  },
  dropdownButtonActive: {
    backgroundColor: BrandColors.subtle,
    borderColor: BrandColors.softBorder,
  },
  dropdownButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    maxWidth: 130,
  },
  dropdownButtonTextActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  resetFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  resetFilterButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  listContent: {
    padding: 16,
    paddingBottom: 95,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 45,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
    gap: 6,
  },
  resetFilterBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  exploreBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 18,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  dropdownModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dropdownModalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  dropdownModalCloseBtn: {
    padding: 4,
  },
  dropdownModalDesc: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 14,
  },
  modalScrollList: {
    flexShrink: 1,
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  dropdownOptionRowSelected: {
    backgroundColor: BrandColors.subtle,
    borderColor: BrandColors.softBorder,
  },
  dropdownOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
  },
  statusDotSelected: {
    backgroundColor: BrandColors.primary,
  },
  dropdownOptionLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  dropdownOptionLabelSelected: {
    color: BrandColors.primary,
  },
  sortOptionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sortOptionIconBoxSelected: {
    borderColor: BrandColors.softBorder,
    backgroundColor: '#FFFFFF',
  },
  sortOptionContent: {
    flex: 1,
  },
  sortOptionDescText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioOuterSelected: {
    borderColor: BrandColors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BrandColors.primary,
  },
  resultModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultModalBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  resultIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultMessage: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  resultCloseBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCloseBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
