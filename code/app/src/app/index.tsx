import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { useLocationStore } from '@/store/location.store';
import { AppBottomNavBar } from '@/components/common/AppBottomNavBar';
import { InstantRadarModal } from '@/components/booking/InstantRadarModal';
import { DirectMuaBookingModal } from '@/components/booking/DirectMuaBookingModal';
import { OnlineMuaListModal } from '@/components/booking/OnlineMuaListModal';
import { NearbyProviderRes } from '@/services/telemetry.service';
import { WorkstationHeader } from '@/components/mua/WorkstationHeader';
import { WorkstationStatCards } from '@/components/mua/WorkstationStatCards';
import { TodayBookingCard } from '@/components/mua/TodayBookingCard';
import { CountdownAcceptModal } from '@/components/mua/CountdownAcceptModal';
import { useWorkstationStore } from '@/store/workstation.store';
import { useBookingStore } from '@/store/booking.store';
import { hasSeenOnboarding } from '@/utils/storage';
import { useAccountModalStore } from '@/store/account-modal.store';
import { taxonomyService, MasterCategory } from '@/services/taxonomy.service';
import { muaProfileService, MuaPublicProfile } from '@/services/mua-profile.service';
import { agencyService, AgencyPublicProfile } from '@/services/agency.service';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useNotificationStore } from '@/store/notification.store';
import * as Haptics from 'expo-haptics';

const getCategoryIcon = (categoryName?: string): keyof typeof Ionicons.glyphMap => {
  if (!categoryName) return 'sparkles';
  const name = categoryName.toLowerCase();
  if (name.includes('cô dâu') || name.includes('cưới')) return 'heart';
  if (name.includes('tiệc') || name.includes('party')) return 'wine';
  if (name.includes('kỷ yếu') || name.includes('học')) return 'school';
  if (name.includes('douyin') || name.includes('trend')) return 'color-wand';
  if (name.includes('daily') || name.includes('chơi') || name.includes('nhẹ')) return 'sunny';
  return 'sparkles';
};

const getDistanceKm = (
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number | null => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // km
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 375;

  const { userInfo, isAuthenticated, logout } = useAuthStore();
  const { currentAddress, latitude, longitude, fetchCurrentLocation, isLoading: isLocating } = useLocationStore();
  
  const [isReadyToWork, setIsReadyToWork] = useState(true);

  const isMUA = userInfo?.roles?.includes('ROLE_FREELANCE_MUA');
  const isAgencyStaff = userInfo?.roles?.includes('ROLE_AGENCY_STAFF');
  const isCustomer = userInfo?.roles?.includes('ROLE_CUSTOMER') || (!isMUA && !isAgencyStaff);
  const isWorkstationRole = (isMUA || isAgencyStaff) && isAuthenticated;

  const {
    profile: workstationProfile,
    todayBookings,
    isLoading: isWorkstationLoading,
    selectedFilter,
    setFilter,
    fetchWorkstationData,
    pendingScheduledOffers,
    triggerScheduledOffer,
  } = useWorkstationStore();

  const unreadCount = useNotificationStore((s) => s.unreadCount);

  useEffect(() => {
    // Chỉ hiển thị hướng dẫn Onboarding khi người dùng mở ứng dụng lần đầu
    hasSeenOnboarding().then((seen) => {
      if (!seen) {
        router.replace('/(auth)/onboarding');
      }
    });

    // Tự động kích hoạt định vị GPS khi mở app hoặc khi đăng nhập
    fetchCurrentLocation();

    if (isWorkstationRole) {
      fetchWorkstationData();
    }
  }, [isAuthenticated, isWorkstationRole]);

  // Tải các đơn sắp tới của Khách Hàng để phát hiện chuyến đi khẩn cấp đang diễn ra
  const { upcomingBookings, fetchMyBookings } = useBookingStore();

  useEffect(() => {
    if (isAuthenticated && isCustomer) {
      fetchMyBookings();
    }
  }, [isAuthenticated, isCustomer]);

  // Tự động tải lại dữ liệu khi người dùng quay lại màn hình Home từ bất kỳ đâu
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        if (isWorkstationRole) {
          fetchWorkstationData();
        }
        if (isCustomer) {
          fetchMyBookings();
        }
      }
    }, [isAuthenticated, isWorkstationRole, isCustomer])
  );

  // Xác định đơn hàng active nổi bật của khách hàng theo thứ tự ưu tiên nghiệp vụ:
  // 1. Chuyến đi / Đang làm việc: ON_THE_WAY, ARRIVED, IN_PROGRESS
  // 2. Chờ khách đặt cọc 30%: PENDING_DEPOSIT
  // 3. Đã đặt cọc Escrow 30% chờ thợ nhận: REQUESTED
  // 4. Thợ đã tiếp nhận ca: ACCEPTED
  const activeCustomerTrip =
    upcomingBookings.find((b) => ['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(b.status)) ||
    upcomingBookings.find((b) => b.status === 'PENDING_DEPOSIT') ||
    upcomingBookings.find((b) => b.status === 'REQUESTED') ||
    upcomingBookings.find((b) => b.status === 'ACCEPTED');

  const pendingRequestedJob = todayBookings.find((b) => b.status === 'REQUESTED');
  const activeMuaJob = todayBookings.find((b) =>
    ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(b.status)
  );

  const [isRadarModalVisible, setIsRadarModalVisible] = useState(false);
  const [isOnlineListModalVisible, setIsOnlineListModalVisible] = useState(false);
  const [selectedTargetMua, setSelectedTargetMua] = useState<NearbyProviderRes | null>(null);
  const [isDirectModalVisible, setIsDirectModalVisible] = useState(false);
  const [directTargetMua, setDirectTargetMua] = useState<NearbyProviderRes | null>(null);

  const handleBookingPress = (muaId: number) => {
    router.push({
      pathname: '/mua-detail/[id]',
      params: { id: muaId.toString() },
    });
  };

  // Nút 1: Đặt thợ khẩn cấp ngẫu nhiên gần nhất (Luồng Radar chuẩn)
  const handleRandomEmergencyBooking = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTargetMua(null);
    setIsRadarModalVisible(true);
  };

  // Nút 2: Mở danh sách thợ đang online quanh vị trí của khách
  const handleOpenOnlineList = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOnlineListModalVisible(true);
  };

  // Khi chọn "Đặt Ngay" trên một thợ online cụ thể -> Mở Modal Đích Danh riêng biệt
  const handleSelectOnlineMua = (mua: NearbyProviderRes) => {
    setIsOnlineListModalVisible(false);
    setDirectTargetMua(mua);
    setIsDirectModalVisible(true);
  };

  // Fallback từ modal online sang quét tự động ngẫu nhiên
  const handleFallbackRandomScan = () => {
    setIsOnlineListModalVisible(false);
    setSelectedTargetMua(null);
    setIsRadarModalVisible(true);
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.locationSelector}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (isMUA) router.push('/profile/mua-profile');
            else fetchCurrentLocation();
          }}
        >
          <Ionicons name="location" size={18} color={BrandColors.primary} />
          <View style={styles.locationCol}>
            <Text style={styles.locationSmall}>
              {isMUA ? 'Địa điểm nhận ca' : 'Vị trí hiện tại của bạn'}
            </Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationText} numberOfLines={1}>
                {isMUA ? (workstationProfile?.baseAddressText || 'Thiết lập địa điểm nhận ca') : (isLocating ? 'Đang định vị GPS...' : currentAddress)}
              </Text>
              <Ionicons name="chevron-down" size={14} color={BrandColors.slateHeading} />
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.iconCircleButton}
            activeOpacity={0.7}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color={BrandColors.slateHeading} />
            {unreadCount > 0 ? (
              <View style={styles.badgeCountPill}>
                <Text style={styles.badgeCountText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {isAuthenticated ? (
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => useAccountModalStore.getState().openAccountModal()}
              activeOpacity={0.8}>
              <UserAvatar
                uri={userInfo?.avatarUrl}
                name={userInfo?.fullName}
                size={34}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginPillButton}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.8}>
              <Ionicons name="log-in-outline" size={15} color="#FFFFFF" />
              <Text style={styles.loginPillText}>Đăng nhập</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 70 + (insets.bottom > 0 ? insets.bottom : 16) },
        ]}
        showsVerticalScrollIndicator={false}>

        {isWorkstationRole ? (
          /* ========================================================================= */
          /* MÀN HÌNH BÀN LÀM VIỆC DÀNH CHO THỢ MUA & AGENCY STAFF                     */
          /* ========================================================================= */
          <View style={styles.workstationWrapper}>
            {/* Header thông tin thợ & Công tắc Trực tuyến (GPS ON/OFF) */}
            <WorkstationHeader />

            {/* 3 Thẻ thống kê: Ca hoàn thành, Đánh giá sao, Thu nhập ngày */}
            <WorkstationStatCards />

            {/* Phím tắt Hồ Sơ Nghề Nghiệp & Chứng Chỉ */}
            <TouchableOpacity
              style={styles.profileShortcutBanner}
              activeOpacity={0.8}
              onPress={() => {
                if (isMUA) {
                  router.push('/profile/mua-profile' as any);
                } else {
                  router.push('/profile/staff-profile' as any);
                }
              }}
            >
              <View style={styles.profileShortcutLeft}>
                <View style={styles.profileShortcutIcon}>
                  <Ionicons name={isMUA ? 'ribbon' : 'business'} size={16} color="#7C3AED" />
                </View>
                <View>
                  <Text style={styles.profileShortcutTitle}>
                    {isMUA ? 'Hồ Sơ Nghề Nghiệp & Chứng Chỉ' : 'Hồ Sơ Nhân Sự Studio'}
                  </Text>
                  <Text style={styles.profileShortcutSub}>
                    Cập nhật tiểu sử, số năm kinh nghiệm & chứng chỉ
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Banner nổi bật khi có đơn hẹn mới đang chờ xác nhận hoặc có ca làm */}
            {pendingRequestedJob ? (
              <TouchableOpacity
                style={styles.pendingRequestedBanner}
                activeOpacity={0.9}
                onPress={() => {
                  const matchingScheduled = pendingScheduledOffers?.find(
                    (o) => o.bookingId === pendingRequestedJob.id
                  );
                  if (matchingScheduled) {
                    triggerScheduledOffer(matchingScheduled, false);
                  } else {
                    router.push(`/job-execution/${pendingRequestedJob.id}` as any);
                  }
                }}
              >
                <View style={styles.pendingRequestedIconBox}>
                  <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.pendingRequestedPulseDot} />
                    <Text style={styles.pendingRequestedBadge}>
                      LỊCH HẸN MỚI CHỜ TIẾP NHẬN
                    </Text>
                  </View>
                  <Text style={styles.pendingRequestedTitle} numberOfLines={1}>
                    {pendingRequestedJob.customerName} • Mã {pendingRequestedJob.bookingCode}
                  </Text>
                  <Text style={styles.pendingRequestedSub} numberOfLines={1}>
                    {pendingRequestedJob.destinationAddress || 'Chạm để xem chi tiết và tiếp nhận đơn'}
                  </Text>
                </View>
                <View style={styles.pendingRequestedBtn}>
                  <Text style={styles.pendingRequestedBtnText}>Xem Ngay</Text>
                  <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ) : activeMuaJob ? (
              <TouchableOpacity
                style={styles.activeJobBanner}
                activeOpacity={0.9}
                onPress={() => router.push(`/job-execution/${activeMuaJob.id}` as any)}
              >
                <View style={styles.activeJobIconBox}>
                  <Ionicons name="flash" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.activePulseDot} />
                    <Text style={styles.activeJobBadge}>
                      {activeMuaJob.status === 'ON_THE_WAY'
                        ? 'BẠN ĐANG DI CHUYỂN TỚI KHÁCH'
                        : activeMuaJob.status === 'ARRIVED'
                        ? 'ĐÃ TỚI ĐIỂM HẸN KHÁCH HÀNG'
                        : activeMuaJob.status === 'IN_PROGRESS'
                        ? 'ĐANG TRANG ĐIỂM CHO KHÁCH'
                        : 'LỊCH HẸN ĐÃ XÁC NHẬN'}
                    </Text>
                  </View>
                  <Text style={styles.activeJobTitle} numberOfLines={1}>
                    {activeMuaJob.customerName} • Mã {activeMuaJob.bookingCode}
                  </Text>
                  <Text style={styles.activeJobSub} numberOfLines={1}>
                    {activeMuaJob.destinationAddress || 'Chạm để xem chi tiết lịch hẹn'}
                  </Text>
                </View>
                <View style={styles.activeJobBtn}>
                  <Text style={styles.activeJobBtnText}>
                    {activeMuaJob.status === 'ACCEPTED' ? 'Chi Tiết' : 'Tiến Trình'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Bộ lọc Ca Làm Hôm Nay */}
            <View style={styles.workstationSectionHeader}>
              <Text style={styles.workstationSectionTitle}>Lịch Hẹn Hôm Nay</Text>
              <View style={styles.workstationFilterPills}>
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'UPCOMING', label: 'Sắp làm' },
                  { key: 'COMPLETED', label: 'Đã xong' },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.workstationFilterPill,
                      selectedFilter === f.key && styles.workstationFilterPillActive,
                    ]}
                    onPress={() => setFilter(f.key as any)}
                  >
                    <Text
                      style={[
                        styles.workstationFilterText,
                        selectedFilter === f.key && styles.workstationFilterTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Danh sách ca hôm nay */}
            {todayBookings.length > 0 ? (
              todayBookings.map((b) => <TodayBookingCard key={b.id} booking={b} />)
            ) : (
              <View style={styles.workstationEmptyContainer}>
                <View style={styles.workstationEmptyIconCircle}>
                  <Ionicons name="calendar-outline" size={36} color="#94A3B8" />
                </View>
                <Text style={styles.workstationEmptyTitle}>Chưa Có Ca Làm Việc Hôm Nay</Text>
                <Text style={styles.workstationEmptySubtext}>
                  Hãy bật công tắc Trực tuyến để hệ thống tự động phát sóng GPS và điều phối đơn khẩn cấp và khách đặt hẹn đến bạn.
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* ========================================================================= */
          /* MÀN HÌNH KHÁM PHÁ & ĐẶT LỊCH DÀNH CHO KHÁCH HÀNG (CUSTOMER)                */
          /* ========================================================================= */
          <>
            {/* User Greeting Bar */}
            {isAuthenticated && (
              <View style={styles.greetingBar}>
                <View style={styles.greetingTextContainer}>
                  <Text style={styles.greetingTitle} numberOfLines={2}>
                    {`Xin chào, ${userInfo?.fullName}! ✨`}
                  </Text>
                  <Text style={styles.greetingSubtitle} numberOfLines={2}>
                    Hôm nay bạn muốn tỏa sáng theo phong cách nào?
                  </Text>
                </View>
                <View style={[styles.roleBadge, styles.roleBadgeCustomer]}>
                  <Text style={styles.roleBadgeText}>Khách Hàng</Text>
                </View>
              </View>
            )}

            {/* BANNER THEO DÕI ĐƠN HÀNG / TRẠNG THÁI TIẾN ĐỘ REALTIME DÀNH CHO KHÁCH */}
            {activeCustomerTrip && (
              <TouchableOpacity
                style={styles.activeTripBanner}
                activeOpacity={0.9}
                onPress={() => {
                  if (activeCustomerTrip.status === 'ACCEPTED' && !activeCustomerTrip.isDepositPaid) {
                    router.push(`/booking/instant-matched/${activeCustomerTrip.id}` as any);
                  } else if (activeCustomerTrip.status === 'ON_THE_WAY') {
                    router.push(`/booking/tracking/${activeCustomerTrip.id}` as any);
                  } else {
                    router.push(`/booking/detail/${activeCustomerTrip.id}` as any);
                  }
                }}
              >
                <View
                  style={[
                    styles.activeTripIconBox,
                    activeCustomerTrip.status === 'PENDING_DEPOSIT' && { backgroundColor: '#D97706' },
                    activeCustomerTrip.status === 'REQUESTED' && { backgroundColor: '#E11D48' },
                    activeCustomerTrip.status === 'ACCEPTED' && !activeCustomerTrip.isDepositPaid && { backgroundColor: '#D97706' },
                    activeCustomerTrip.status === 'ACCEPTED' && activeCustomerTrip.isDepositPaid && { backgroundColor: '#059669' },
                    activeCustomerTrip.status === 'ON_THE_WAY' && { backgroundColor: '#7C3AED' },
                    activeCustomerTrip.status === 'ARRIVED' && { backgroundColor: '#C026D3' },
                    activeCustomerTrip.status === 'IN_PROGRESS' && { backgroundColor: BrandColors.primary },
                  ]}
                >
                  <Ionicons
                    name={
                      activeCustomerTrip.status === 'PENDING_DEPOSIT'
                        ? 'wallet'
                        : activeCustomerTrip.status === 'REQUESTED'
                        ? 'shield-checkmark'
                        : activeCustomerTrip.status === 'ACCEPTED' && !activeCustomerTrip.isDepositPaid
                        ? 'card'
                        : activeCustomerTrip.status === 'ACCEPTED' && activeCustomerTrip.isDepositPaid
                        ? 'checkmark-circle'
                        : activeCustomerTrip.status === 'ON_THE_WAY'
                        ? 'navigate'
                        : activeCustomerTrip.status === 'ARRIVED'
                        ? 'location'
                        : activeCustomerTrip.status === 'IN_PROGRESS'
                        ? 'sparkles'
                        : 'calendar'
                    }
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={[
                        styles.activePulseDot,
                        activeCustomerTrip.status === 'PENDING_DEPOSIT' && { backgroundColor: '#F59E0B' },
                        activeCustomerTrip.status === 'REQUESTED' && { backgroundColor: '#10B981' },
                        activeCustomerTrip.status === 'ACCEPTED' && !activeCustomerTrip.isDepositPaid && { backgroundColor: '#F59E0B' },
                        activeCustomerTrip.status === 'ACCEPTED' && activeCustomerTrip.isDepositPaid && { backgroundColor: '#10B981' },
                        activeCustomerTrip.status === 'ON_THE_WAY' && { backgroundColor: '#A78BFA' },
                        activeCustomerTrip.status === 'ARRIVED' && { backgroundColor: '#E879F9' },
                        activeCustomerTrip.status === 'IN_PROGRESS' && { backgroundColor: '#FB7185' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.activeTripBadge,
                        activeCustomerTrip.status === 'PENDING_DEPOSIT' && { color: '#F59E0B' },
                        activeCustomerTrip.status === 'REQUESTED' && { color: '#34D399' },
                        activeCustomerTrip.status === 'ACCEPTED' && !activeCustomerTrip.isDepositPaid && { color: '#F59E0B' },
                        activeCustomerTrip.status === 'ACCEPTED' && activeCustomerTrip.isDepositPaid && { color: '#34D399' },
                        activeCustomerTrip.status === 'ON_THE_WAY' && { color: '#C4B5FD' },
                        activeCustomerTrip.status === 'ARRIVED' && { color: '#F0ABFC' },
                        activeCustomerTrip.status === 'IN_PROGRESS' && { color: '#FDA4AF' },
                      ]}
                    >
                      {activeCustomerTrip.status === 'PENDING_DEPOSIT'
                        ? 'ĐƠN HẸN CHỜ ĐẶT CỌC 30%'
                        : activeCustomerTrip.status === 'REQUESTED'
                        ? 'ĐÃ CỌC ESCROW 30% • CHỜ THỢ XÁC NHẬN'
                        : activeCustomerTrip.status === 'ACCEPTED' && !activeCustomerTrip.isDepositPaid
                        ? 'THỢ ĐÃ NHẬN • CHỜ BẠN ĐẶT CỌC'
                        : activeCustomerTrip.status === 'ACCEPTED'
                        ? 'ĐÃ ĐẶT CỌC • CHỜ THỢ KHỞI HÀNH'
                        : activeCustomerTrip.status === 'ON_THE_WAY'
                        ? 'THỢ ĐANG TRÊN ĐƯỜNG ĐẾN'
                        : activeCustomerTrip.status === 'ARRIVED'
                        ? 'THỢ ĐÃ TỚI ĐIỂM HẸN'
                        : activeCustomerTrip.status === 'IN_PROGRESS'
                        ? 'ĐANG TRANG ĐIỂM CHO BẠN'
                        : 'CHUYÊN VIÊN ĐÃ TIẾP NHẬN CA'}
                    </Text>
                  </View>
                  <Text style={styles.activeTripTitle} numberOfLines={1}>
                    {activeCustomerTrip.packageName || 'Make-up chuyên nghiệp'} • {activeCustomerTrip.muaName ? 'Thợ: ' + activeCustomerTrip.muaName : 'Mã: ' + activeCustomerTrip.bookingCode}
                  </Text>
                  <Text style={styles.activeTripSub} numberOfLines={1}>
                    {activeCustomerTrip.status === 'PENDING_DEPOSIT'
                      ? 'Vui lòng hoàn tất cọc 30% trong 15 phút để bảo lưu lịch hẹn'
                      : activeCustomerTrip.status === 'REQUESTED'
                      ? 'Tiền cọc đã bảo chứng an toàn. Chuyên viên đang phản hồi.'
                      : activeCustomerTrip.status === 'ACCEPTED' && !activeCustomerTrip.isDepositPaid
                      ? 'Chạm để kiểm tra thợ & thanh toán cọc giữ chỗ 30%'
                      : activeCustomerTrip.status === 'ACCEPTED'
                      ? 'Đã bảo chứng cọc Escrow 30%. Chờ thợ bắt đầu di chuyển.'
                      : activeCustomerTrip.status === 'ON_THE_WAY'
                      ? 'Chạm để xem trực tiếp vị trí GPS thợ đang di chuyển'
                      : activeCustomerTrip.status === 'ARRIVED'
                      ? 'Thợ đã đến điểm hẹn, sẵn sàng dụng cụ làm đẹp'
                      : activeCustomerTrip.status === 'IN_PROGRESS'
                      ? 'Đang tiến hành các bước trang điểm chuyên nghiệp'
                      : activeCustomerTrip.destinationAddress || 'Chạm để theo dõi trực tiếp vị trí Live GPS'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.activeTripBtn,
                    activeCustomerTrip.status === 'PENDING_DEPOSIT' && { backgroundColor: '#D97706' },
                    activeCustomerTrip.status === 'REQUESTED' && { backgroundColor: '#E11D48' },
                    activeCustomerTrip.status === 'ACCEPTED' && !activeCustomerTrip.isDepositPaid && { backgroundColor: '#D97706' },
                    activeCustomerTrip.status === 'ACCEPTED' && activeCustomerTrip.isDepositPaid && { backgroundColor: '#059669' },
                    activeCustomerTrip.status === 'ON_THE_WAY' && { backgroundColor: '#7C3AED' },
                    activeCustomerTrip.status === 'ARRIVED' && { backgroundColor: '#C026D3' },
                    activeCustomerTrip.status === 'IN_PROGRESS' && { backgroundColor: BrandColors.primary },
                  ]}
                >
                  <Text style={styles.activeTripBtnText}>
                    {activeCustomerTrip.status === 'PENDING_DEPOSIT'
                      ? 'Đặt Cọc'
                      : activeCustomerTrip.status === 'REQUESTED'
                      ? 'Chi Tiết'
                      : activeCustomerTrip.status === 'ACCEPTED' && !activeCustomerTrip.isDepositPaid
                      ? 'Đặt Cọc'
                      : activeCustomerTrip.status === 'ACCEPTED'
                      ? 'Chi Tiết'
                      : activeCustomerTrip.status === 'ON_THE_WAY'
                      ? 'Theo Dõi'
                      : 'Chi Tiết'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}


            {/* VIP Promo Banner */}
            <View style={styles.promoBanner}>
              <View style={styles.promoContent}>
                <View style={styles.promoTag}>
                  <Ionicons name="flame" size={12} color="#FFFFFF" />
                  <Text style={styles.promoTagText}>MÙA CƯỚI 2026</Text>
                </View>
                <Text style={styles.promoTitle}>Ưu Đãi 20% Gói Cô Dâu VIP</Text>
                <Text style={styles.promoSubtitle}>
                  Trang điểm thử miễn phí • Mỹ phẩm Chanel & Dior cao cấp
                </Text>
                <TouchableOpacity
                  style={styles.promoButton}
                  onPress={() => router.replace('/explore')}
                  activeOpacity={0.8}>
                  <Text style={styles.promoButtonText}>Khám Phá Ngay</Text>
                  <Ionicons name="arrow-forward" size={14} color={BrandColors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ========================================================================= */}
            {/* KHỐI PHÂN BIỆT 2 HÌNH THỨC ĐẶT LỊCH: CẤP TỐC 30S vs HẸN THEO NGÀY         */}
            {/* ========================================================================= */}
            <View style={styles.bookingModesSection}>
              <View style={styles.bookingModesHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="sparkles" size={16} color={BrandColors.primary} />
                  <Text style={styles.bookingModesSectionTitle}>Chọn Hình Thức Đặt Lịch</Text>
                </View>
                <Text style={styles.bookingModesSectionSub}>
                  Phân biệt rõ ràng giữa ca khẩn cấp cần thợ đến ngay và đặt lịch hẹn trước
                </Text>
              </View>

              {/* HÌNH THỨC 1: ĐẶT CẤP TỐC (KHẨN CẤP / CÓ THỢ NGAY) */}
              <View style={styles.emergencyCard}>
                <View style={styles.emergencyGlowBg} />
                <View style={styles.emergencyContent}>
                  <View style={styles.emergencyHeaderRow}>
                    <View style={styles.emergencyBadge}>
                      <Ionicons name="flash" size={14} color="#FFFFFF" />
                      <Text style={styles.emergencyBadgeText}>1. ĐẶT CẤP TỐC (KHẨN CẤP)</Text>
                    </View>
                    <View style={styles.emergencyLiveTag}>
                      <View style={styles.emergencyPulseDot} />
                      <Text style={styles.emergencyLiveText}>⚡ Có thợ ngay 15-30p</Text>
                    </View>
                  </View>

                  <Text style={styles.emergencyTitle}>Bạn Cần Trang Điểm Gấp?</Text>
                  <Text style={styles.emergencyDesc}>
                    Hệ thống quét radar thợ MUA đang trực tuyến quanh bạn • Thợ nhận ca tức thì sau 30s • Phù hợp tiệc gấp hoặc sự cố đột xuất
                  </Text>

                  <View style={styles.featureChipsRow}>
                    <View style={styles.featureChip}>
                      <Ionicons name="timer-outline" size={12} color="#FFFFFF" />
                      <Text style={styles.featureChipText}>30s Nhận ca</Text>
                    </View>
                    <View style={styles.featureChip}>
                      <Ionicons name="navigate-outline" size={12} color="#FFFFFF" />
                      <Text style={styles.featureChipText}>Thợ gần nhất</Text>
                    </View>
                    <View style={styles.featureChip}>
                      <Ionicons name="shield-checkmark-outline" size={12} color="#FFFFFF" />
                      <Text style={styles.featureChipText}>Cọc an toàn 30%</Text>
                    </View>
                  </View>

                  {/* 2 NÚT HÀNH ĐỘNG RIÊNG BIỆT */}
                  <View style={styles.emergencyActionsRow}>
                    {/* NÚT 1: ĐẶT NGẪU NHIÊN GẦN ĐÂY */}
                    <TouchableOpacity
                      style={styles.randomBookingBtn}
                      onPress={handleRandomEmergencyBooking}
                      activeOpacity={0.85}
                    >
                      <View style={styles.btnIconCircle}>
                        <Ionicons name="flash" size={13} color="#FFFFFF" />
                      </View>
                      <View style={styles.btnTextWrapper}>
                        <Text style={styles.randomBookingBtnText} numberOfLines={1}>
                          Đặt Ngẫu Nhiên
                        </Text>
                        <Text style={styles.randomBookingBtnSub} numberOfLines={1}>
                          Quét radar gần nhất
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* NÚT 2: THỢ ĐANG ONLINE VÀ ĐẶT NGAY */}
                    <TouchableOpacity
                      style={styles.onlineListBtn}
                      onPress={handleOpenOnlineList}
                      activeOpacity={0.85}
                    >
                      <View style={styles.onlineBtnGlowDot} />
                      <View style={styles.btnTextWrapper}>
                        <Text style={styles.onlineListBtnText} numberOfLines={1}>
                          Thợ Đang Online
                        </Text>
                        <Text style={styles.onlineListBtnSub} numberOfLines={1}>
                          Xem thợ & Đặt ngay
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* HÌNH THỨC 2: ĐẶT LỊCH THEO NGÀY (HẸN TRƯỚC / THONG THẢ CHỌN) */}
              <TouchableOpacity
                style={styles.scheduledCard}
                onPress={() => router.replace('/explore')}
                activeOpacity={0.88}
              >
                <View style={styles.scheduledHeaderRow}>
                  <View style={styles.scheduledBadge}>
                    <Ionicons name="calendar" size={14} color="#7C3AED" />
                    <Text style={styles.scheduledBadgeText}>2. ĐẶT LỊCH THEO NGÀY (HẸN TRƯỚC)</Text>
                  </View>
                  <View style={styles.scheduledTag}>
                    <Text style={styles.scheduledTagText}>Lên lịch trước</Text>
                  </View>
                </View>

                <Text style={styles.scheduledTitle}>Lên Kế Hoạch Ngày Cưới & Sự Kiện</Text>
                <Text style={styles.scheduledDesc}>
                  Thong thả chọn chuyên viên yêu thích, xem album tác phẩm thực tế, chọn gói makeup và đặt lịch hẹn theo ngày giờ bạn muốn.
                </Text>

                <View style={styles.scheduledChipsRow}>
                  <View style={styles.scheduledChip}>
                    <Ionicons name="sparkles" size={12} color="#7C3AED" />
                    <Text style={styles.scheduledChipText}>Thợ MUA Tự Do</Text>
                  </View>
                  <View style={styles.scheduledChip}>
                    <Ionicons name="business" size={12} color="#7C3AED" />
                    <Text style={styles.scheduledChipText}>Studio & Viện Cưới</Text>
                  </View>
                  <View style={styles.scheduledChip}>
                    <Ionicons name="images-outline" size={12} color="#7C3AED" />
                    <Text style={styles.scheduledChipText}>Album thực tế</Text>
                  </View>
                </View>

                <View style={styles.scheduledActionBtn}>
                  <Text style={styles.scheduledActionBtnText}>Khám Phá Thợ & Studio Ngay</Text>
                  <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Platform Trust & Escrow Guarantee Card */}
            <View style={styles.trustCard}>
              <View style={styles.trustHeader}>
                <Ionicons name="shield-checkmark" size={22} color={BrandColors.primary} />
                <Text style={styles.trustTitle}>Cam Kết Bảo Chứng Từ MUA Platform</Text>
              </View>
              <View style={styles.trustItemsCol}>
                <View style={styles.trustItemRow}>
                  <Ionicons name="checkmark-done-circle" size={17} color={BrandColors.success} />
                  <Text style={styles.trustItemText}>
                    100% Mỹ phẩm cao cấp chính hãng (MAC, Dior, Chanel, Charlotte Tilbury)
                  </Text>
                </View>
                <View style={styles.trustItemRow}>
                  <Ionicons name="checkmark-done-circle" size={17} color={BrandColors.success} />
                  <Text style={styles.trustItemText}>
                    Quỹ cọc Escrow an toàn — Tiền chỉ giải ngân khi khách hàng nghiệm thu
                  </Text>
                </View>
                <View style={styles.trustItemRow}>
                  <Ionicons name="checkmark-done-circle" size={17} color={BrandColors.success} />
                  <Text style={styles.trustItemText}>
                    Cam kết đúng giờ 100% — Đổi thợ tức thì nếu có phát sinh sự cố
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>



      {/* MODAL RADAR TÌM THỢ KHẨN CẤP 30S (SPRINT M-2) - BẢO LƯU LUỒNG QUÉT TỰ ĐỘNG */}
      <InstantRadarModal
        visible={isRadarModalVisible}
        targetMua={null}
        onClose={() => {
          setIsRadarModalVisible(false);
          setSelectedTargetMua(null);
        }}
      />

      {/* MODAL ĐẶT ĐÍCH DANH THỢ ONLINE (GIAO DIỆN RIÊNG BIỆT - CHỈ GÓI & PHONG CÁCH CỦA THỢ ĐÓ) */}
      <DirectMuaBookingModal
        visible={isDirectModalVisible}
        targetMua={directTargetMua}
        onClose={() => {
          setIsDirectModalVisible(false);
          setDirectTargetMua(null);
        }}
        onFallbackRandomScan={() => {
          setIsDirectModalVisible(false);
          setDirectTargetMua(null);
          setIsRadarModalVisible(true);
        }}
        onChooseAnotherMua={() => {
          setIsDirectModalVisible(false);
          setDirectTargetMua(null);
          setIsOnlineListModalVisible(true);
        }}
      />

      {/* MODAL DANH SÁCH THỢ MUA ĐANG TRỰC TUYẾN & ĐẶT NGAY */}
      <OnlineMuaListModal
        visible={isOnlineListModalVisible}
        onClose={() => setIsOnlineListModalVisible(false)}
        onSelectMua={handleSelectOnlineMua}
        onFallbackRandomScan={handleFallbackRandomScan}
      />

      {/* Bottom Navigation Bar */}
      <AppBottomNavBar
        activeTab="home"
        onAccountPress={() => useAccountModalStore.getState().openAccountModal()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  locationCol: {
    flex: 1,
  },
  locationSmall: {
    fontSize: 10,
    color: BrandColors.slateMuted,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: BrandColors.slateHeading,
    flexShrink: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  iconCircleButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.primary,
  },
  badgeCountPill: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#E11D48',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeCountText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  loginPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 18,
    gap: 4,
    flexShrink: 0,
  },
  loginPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarButton: {
    padding: 2,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  greetingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    gap: 10,
  },
  greetingTextContainer: {
    flex: 1,
    paddingRight: 4,
  },
  greetingTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: BrandColors.slateHeading,
    lineHeight: 20,
  },
  greetingSubtitle: {
    fontSize: 11.5,
    color: BrandColors.slateMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadgeMua: {
    backgroundColor: '#FDF2F8',
    borderWidth: 1,
    borderColor: '#F472B6',
  },
  roleBadgeAgency: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  roleBadgeCustomer: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#4ADE80',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  workstationWrapper: {
    paddingBottom: 24,
  },
  profileShortcutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  profileShortcutIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileShortcutTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileShortcutSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  workstationSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 10,
  },
  workstationSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  workstationFilterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  workstationFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  workstationFilterPillActive: {
    backgroundColor: '#0F172A',
  },
  workstationFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  workstationFilterTextActive: {
    color: '#FFFFFF',
  },
  workstationEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  workstationEmptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  workstationEmptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  workstationEmptySubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  promoBanner: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  promoContent: {
    alignItems: 'flex-start',
  },
  promoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginBottom: 8,
  },
  promoTagText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.slateHeading,
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    lineHeight: 17,
    marginBottom: 12,
  },
  promoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BrandColors.softBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  promoButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  bookingModesSection: {
    marginBottom: 20,
  },
  bookingModesHeader: {
    marginBottom: 12,
  },
  bookingModesSectionTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: BrandColors.slateHeading,
  },
  bookingModesSectionSub: {
    fontSize: 11.5,
    color: BrandColors.slateMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  emergencyCard: {
    borderRadius: 16,
    backgroundColor: '#9F1239',
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#9F1239',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  emergencyGlowBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#BE123C',
    opacity: 0.4,
  },
  emergencyContent: {
    padding: 16,
  },
  emergencyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  emergencyBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emergencyLiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  emergencyPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E11D48',
  },
  emergencyLiveText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#BE123C',
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emergencyDesc: {
    fontSize: 12,
    color: '#FFE4E6',
    lineHeight: 17,
    marginBottom: 12,
  },
  featureChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  featureChipText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emergencyActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  randomBookingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#881337',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 6,
  },
  btnIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  randomBookingBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  randomBookingBtnSub: {
    color: '#FFE4E6',
    fontSize: 9.5,
    marginTop: 1,
  },
  onlineListBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    gap: 6,
  },
  onlineBtnGlowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  onlineListBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  onlineListBtnSub: {
    color: '#FFFFFF',
    fontSize: 9.5,
    marginTop: 1,
    opacity: 0.95,
  },
  scheduledCard: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  scheduledHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  scheduledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  scheduledBadgeText: {
    color: '#7C3AED',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scheduledTag: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  scheduledTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6D28D9',
  },
  scheduledTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 4,
  },
  scheduledDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
    marginBottom: 12,
  },
  scheduledChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scheduledChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  scheduledChipText: {
    fontSize: 11,
    color: '#6D28D9',
    fontWeight: '600',
  },
  scheduledActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  scheduledActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionSub: {
    fontSize: 11.5,
    color: BrandColors.slateMuted,
    marginTop: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.slateHeading,
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  verifiedCountBadge: {
    backgroundColor: BrandColors.light,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  categoryChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: BrandColors.slateHeading,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  muaListContainer: {
    gap: 14,
    marginBottom: 20,
  },
  muaCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  muaCardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  muaAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
  },
  muaInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  muaNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  muaName: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.slateHeading,
  },
  muaCategory: {
    fontSize: 12,
    color: BrandColors.slateMuted,
    marginTop: 2,
    marginBottom: 4,
  },
  ratingAndDistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  reviewsCount: {
    fontSize: 11,
    color: BrandColors.slateMuted,
  },
  dotSeparator: {
    color: BrandColors.slateMuted,
    fontSize: 10,
  },
  distBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distText: {
    fontSize: 11.5,
    color: BrandColors.slateMuted,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  badgeItem: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeItemText: {
    fontSize: 10.5,
    color: BrandColors.slateBody,
    fontWeight: '500',
  },
  providerTypeSwitchWrapper: {
    marginBottom: 16,
  },
  providerTypeSwitchBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    gap: 6,
  },
  providerTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  providerTypeBtnActive: {
    backgroundColor: BrandColors.primary,
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  providerTypeBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  providerTypeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  switchBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  switchBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  switchBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },
  switchBadgeTextActive: {
    color: '#FFFFFF',
  },
  badgeFreelance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FCE7F3',
    borderColor: '#FBCFE8',
    borderWidth: 0.8,
  },
  badgeFreelanceText: {
    color: '#BE185D',
    fontWeight: '700',
  },
  studioSectionWrapper: {
    marginTop: 4,
  },
  studioSectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 14,
    marginTop: -8,
  },
  studioListContainer: {
    gap: 12,
    marginBottom: 16,
  },
  studioCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  studioCardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  studioLogo: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  studioLogoFallback: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  studioNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  studioName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  studioRatingAndDistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  studioAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  studioAddressText: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    flex: 1,
  },
  studioCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  studioTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  studioTypeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#7C3AED',
  },
  exploreStudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  exploreStudioBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  muaCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceLabel: {
    fontSize: 11,
    color: BrandColors.slateMuted,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  bookNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  bookNowButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  muaAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE4E6',
  },
  muaAvatarInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  badgeVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
  },
  badgeVerifiedText: {
    color: '#059669',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 12.5,
    color: BrandColors.slateMuted,
    fontWeight: '500',
  },
  emptyMuasBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyMuasTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  emptyMuasSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 10,
  },
  resetFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: BrandColors.primary,
    borderRadius: 8,
  },
  resetFilterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  trustCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  trustTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  trustItemsCol: {
    gap: 8,
  },
  trustItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  trustItemText: {
    flex: 1,
    fontSize: 12,
    color: BrandColors.slateBody,
    lineHeight: 17,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 4,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  bottomNavLabel: {
    fontSize: 11,
    color: BrandColors.slateMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  bottomNavLabelActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalAvatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.slateHeading,
  },
  modalUserPhone: {
    fontSize: 13,
    color: BrandColors.slateMuted,
    marginTop: 2,
  },
  modalRolePill: {
    backgroundColor: BrandColors.light,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  modalRolePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  modalActionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.slateHeading,
  },
  closeModalBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  closeModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.slateHeading,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
    gap: 10,
  },
  searchBarPlaceholder: {
    flex: 1,
    fontSize: 13.5,
    color: BrandColors.slateMuted,
    fontWeight: '400',
  },
  searchFilterPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  openWorkstationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  openWorkstationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E11D48',
  },
  activeTripBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E11D48',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  activeTripIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E11D48',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTripBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  activeTripTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  activeTripSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  activeTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E11D48',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 2,
  },
  activeTripBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  activeJobBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E11D48',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  activeJobIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E11D48',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  activeJobBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  activeJobTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  activeJobSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  activeJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E11D48',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 2,
  },
  activeJobBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pendingRequestedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E11D48',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  pendingRequestedIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E11D48',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingRequestedPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FB7185',
  },
  pendingRequestedBadge: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FDA4AF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pendingRequestedTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  pendingRequestedSub: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  pendingRequestedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E11D48',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  pendingRequestedBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
});
