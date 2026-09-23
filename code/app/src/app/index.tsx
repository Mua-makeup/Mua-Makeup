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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { useLocationStore } from '@/store/location.store';
import { AppBottomNavBar } from '@/components/common/AppBottomNavBar';
import { InstantRadarModal } from '@/components/booking/InstantRadarModal';
import { WorkstationHeader } from '@/components/mua/WorkstationHeader';
import { WorkstationStatCards } from '@/components/mua/WorkstationStatCards';
import { TodayBookingCard } from '@/components/mua/TodayBookingCard';
import { CountdownAcceptModal } from '@/components/mua/CountdownAcceptModal';
import { useWorkstationStore } from '@/store/workstation.store';
import { hasSeenOnboarding } from '@/utils/storage';
import * as Haptics from 'expo-haptics';

interface MuaArtist {
  id: number;
  name: string;
  avatar: string;
  category: string;
  rating: number;
  reviewsCount: number;
  distanceKm: number;
  startingPrice: string;
  badges: string[];
  isAvailable: boolean;
}

const FEATURED_MUAS: MuaArtist[] = [
  {
    id: 1,
    name: 'MUA Nguyễn Hương Ly',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    category: 'Cô Dâu Luxury • Tone Thái VIP',
    rating: 5.0,
    reviewsCount: 142,
    distanceKm: 1.2,
    startingPrice: '2.500.000đ',
    badges: ['Top 1 Quận 1', 'Đã xác thực', 'Mỹ phẩm Chanel'],
    isAvailable: true,
  },
  {
    id: 4,
    name: 'MUA Trần Thanh Tâm',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    category: 'Dạ Tiệc • Douyin Hot Trend',
    rating: 4.95,
    reviewsCount: 98,
    distanceKm: 2.5,
    startingPrice: '2.500.000đ',
    badges: ['Nhiệt tình', 'Mỹ phẩm Dior'],
    isAvailable: true,
  },
];

const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: 'sparkles' as const },
  { id: 'bride', label: 'Cô Dâu VIP', icon: 'heart' as const },
  { id: 'party', label: 'Dạ Tiệc', icon: 'wine' as const },
  { id: 'student', label: 'Kỷ Yếu', icon: 'school' as const },
  { id: 'douyin', label: 'Douyin Trend', icon: 'color-wand' as const },
  { id: 'daily', label: 'Đi Chơi Daily', icon: 'sunny' as const },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { userInfo, isAuthenticated, logout } = useAuthStore();
  const { currentAddress, fetchCurrentLocation, isLoading: isLocating } = useLocationStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isReadyToWork, setIsReadyToWork] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isMUA = userInfo?.roles?.includes('ROLE_FREELANCE_MUA');
  const isAgencyStaff = userInfo?.roles?.includes('ROLE_AGENCY_STAFF');
  const isCustomer = userInfo?.roles?.includes('ROLE_CUSTOMER') || (!isMUA && !isAgencyStaff);
  const isWorkstationRole = (isMUA || isAgencyStaff) && isAuthenticated;

  const {
    todayBookings,
    isLoading: isWorkstationLoading,
    selectedFilter,
    setFilter,
    fetchWorkstationData,
  } = useWorkstationStore();

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

  const [isRadarModalVisible, setIsRadarModalVisible] = useState(false);

  const handleBookingPress = (mua: MuaArtist) => {
    router.push({
      pathname: '/mua-detail/[id]',
      params: { id: mua.id },
    });
  };

  const handleEmergencyBooking = () => {
    setIsRadarModalVisible(true);
  };

  const handleLogout = async () => {
    Alert.alert('Đăng Xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng Xuất',
        style: 'destructive',
        onPress: async () => {
          setShowProfileModal(false);
          await logout();
        },
      },
    ]);
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
            fetchCurrentLocation();
          }}
        >
          <Ionicons name="location" size={18} color={BrandColors.primary} />
          <View style={styles.locationCol}>
            <Text style={styles.locationSmall}>
              Vị trí hiện tại của bạn
            </Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationText} numberOfLines={1}>
                {isLocating ? 'Đang định vị GPS...' : currentAddress}
              </Text>
              <Ionicons name="chevron-down" size={14} color={BrandColors.slateHeading} />
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.iconCircleButton} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={20} color={BrandColors.slateHeading} />
            <View style={styles.badgeDot} />
          </TouchableOpacity>

          {isAuthenticated ? (
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => setShowProfileModal(true)}
              activeOpacity={0.8}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>
                  {userInfo?.fullName ? userInfo.fullName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
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

            {/* Phím tắt tác nghiệp nhanh */}
            <View style={styles.workstationShortcutsRow}>
              <TouchableOpacity
                style={styles.workstationShortcutCard}
                activeOpacity={0.8}
                onPress={() => router.push('/mua/packages' as any)}
              >
                <View style={[styles.workstationShortcutIcon, { backgroundColor: '#FFF1F2' }]}>
                  <Ionicons name="cube-outline" size={20} color="#E11D48" />
                </View>
                <View style={styles.workstationShortcutText}>
                  <Text style={styles.workstationShortcutTitle}>Gói Dịch Vụ</Text>
                  <Text style={styles.workstationShortcutSub}>Bảng giá & album mẫu</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.workstationShortcutCard}
                activeOpacity={0.8}
                onPress={() => {
                  if (isMUA) {
                    router.push('/profile/mua-profile' as any);
                  } else {
                    router.push('/profile/staff-profile' as any);
                  }
                }}
              >
                <View style={[styles.workstationShortcutIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name={isMUA ? 'ribbon-outline' : 'business-outline'} size={20} color="#2563EB" />
                </View>
                <View style={styles.workstationShortcutText}>
                  <Text style={styles.workstationShortcutTitle}>
                    {isMUA ? 'Hồ Sơ & Bán Kính' : 'Hồ Sơ Nhân Sự'}
                  </Text>
                  <Text style={styles.workstationShortcutSub}>Cấu hình nhận ca</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

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

            {/* Quick Search Bar to Explore Screen */}
            <TouchableOpacity
              style={styles.searchBarBox}
              onPress={() => router.push('/explore')}
              activeOpacity={0.85}>
              <Ionicons name="search" size={18} color={BrandColors.slateMuted} />
              <Text style={styles.searchBarPlaceholder}>
                Tìm kiếm gói dịch vụ, thợ trang điểm...
              </Text>
              <View style={styles.searchFilterPill}>
                <Ionicons name="options-outline" size={14} color={BrandColors.primary} />
              </View>
            </TouchableOpacity>

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
                  onPress={() => router.push('/explore')}
                  activeOpacity={0.8}>
                  <Text style={styles.promoButtonText}>Khám Phá Ngay</Text>
                  <Ionicons name="arrow-forward" size={14} color={BrandColors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* 30s Instant Emergency Booking Card */}
            <TouchableOpacity
              style={styles.emergencyCard}
              onPress={handleEmergencyBooking}
              activeOpacity={0.9}>
              <View style={styles.emergencyGlowBg} />
              <View style={styles.emergencyContent}>
                <View style={styles.emergencyHeaderRow}>
                  <View style={styles.emergencyBadge}>
                    <Ionicons name="flash" size={14} color="#FFFFFF" />
                    <Text style={styles.emergencyBadgeText}>ĐẶT KHẨN CẤP 30S</Text>
                  </View>
                  <View style={styles.countdownPill}>
                    <Text style={styles.countdownText}>⚡ Có thợ ngay</Text>
                  </View>
                </View>

                <Text style={styles.emergencyTitle}>Bạn Cần Trang Điểm Gấp?</Text>
                <Text style={styles.emergencyDesc}>
                  Hệ thống quét thợ MUA rảnh quanh bạn qua GPS • Thợ nhận ca tức thì trong 30s
                </Text>

                <View style={styles.emergencyCtaBtn}>
                  <Text style={styles.emergencyCtaText}>ĐẶT THỢ CẤP TỐC NGAY</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>

            {/* Categories Chips */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Phong Cách Nổi Bật</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/explore')}>
                <Text style={styles.viewAllText}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      router.push('/explore');
                    }}
                    activeOpacity={0.8}>
                    <Ionicons
                      name={cat.icon}
                      size={15}
                      color={isSelected ? '#FFFFFF' : BrandColors.slateHeading}
                    />
                    <Text
                      style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Featured MUAs List */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Thợ Make-up Được Yêu Thích</Text>
                <View style={styles.verifiedCountBadge}>
                  <Text style={styles.verifiedCountText}>Gần bạn</Text>
                </View>
              </View>
            </View>

            <View style={styles.muaListContainer}>
              {FEATURED_MUAS.map((mua) => (
                <TouchableOpacity
                  key={mua.id}
                  style={styles.muaCard}
                  onPress={() => handleBookingPress(mua)}
                  activeOpacity={0.85}>
                  {/* Avatar + Info */}
                  <View style={styles.muaCardTop}>
                    <Image source={{ uri: mua.avatar }} style={styles.muaAvatar} />
                    <View style={styles.muaInfoCol}>
                      <View style={styles.muaNameRow}>
                        <Text style={styles.muaName}>{mua.name}</Text>
                        <Ionicons name="checkmark-circle" size={16} color={BrandColors.primary} />
                      </View>
                      <Text style={styles.muaCategory}>{mua.category}</Text>

                      <View style={styles.ratingAndDistRow}>
                        <View style={styles.ratingBox}>
                          <Ionicons name="star" size={13} color="#F59E0B" />
                          <Text style={styles.ratingText}>{mua.rating}</Text>
                          <Text style={styles.reviewsCount}>({mua.reviewsCount})</Text>
                        </View>
                        <Text style={styles.dotSeparator}>•</Text>
                        <View style={styles.distBox}>
                          <Ionicons name="navigate-outline" size={13} color={BrandColors.slateMuted} />
                          <Text style={styles.distText}>{mua.distanceKm} km</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Badges tags */}
                  <View style={styles.badgesRow}>
                    {mua.badges.map((badge, idx) => (
                      <View key={idx} style={styles.badgeItem}>
                        <Text style={styles.badgeItemText}>{badge}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Bottom Price & Action */}
                  <View style={styles.muaCardBottom}>
                    <View>
                      <Text style={styles.priceLabel}>Giá khởi điểm</Text>
                      <Text style={styles.priceValue}>{mua.startingPrice}</Text>
                    </View>

                    <View style={styles.bookNowButton}>
                      <Text style={styles.bookNowButtonText}>Đặt Lịch</Text>
                      <Ionicons name="calendar-outline" size={15} color="#FFFFFF" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
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

      {/* Profile Modal */}
      <Modal visible={showProfileModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalAvatarBox}>
                <Text style={styles.modalAvatarText}>
                  {userInfo?.fullName ? userInfo.fullName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <Text style={styles.modalUserName}>{userInfo?.fullName || 'Người Dùng'}</Text>
              <Text style={styles.modalUserPhone}>{userInfo?.phoneNumber || userInfo?.email}</Text>
              <View style={styles.modalRolePill}>
                <Text style={styles.modalRolePillText}>
                  {isMUA
                    ? 'Thợ Make-up Tự Do'
                    : isAgencyStaff
                      ? 'Nhân Viên Agency'
                      : 'Khách Hàng Thân Thiết'}
                </Text>
              </View>
            </View>

            <View style={styles.modalDivider} />

            {/* 1. Thông Tin Cá Nhân (Chung cho TẤT CẢ mọi Role) */}
            <TouchableOpacity
              style={styles.modalActionRow}
              onPress={() => {
                setShowProfileModal(false);
                router.push('/profile/edit');
              }}
              activeOpacity={0.7}>
              <Ionicons name="person-circle-outline" size={22} color={BrandColors.slateHeading} />
              <Text style={styles.modalActionText}>Thông Tin Cá Nhân</Text>
              <Ionicons name="chevron-forward" size={18} color={BrandColors.slateMuted} />
            </TouchableOpacity>

            {/* 2. Hồ Sơ Nghề Nghiệp Thợ MUA (Chỉ dành cho MUA) */}
            {isMUA && (
              <TouchableOpacity
                style={styles.modalActionRow}
                onPress={() => {
                  setShowProfileModal(false);
                  router.push('/profile/mua-profile');
                }}
                activeOpacity={0.7}>
                <Ionicons name="color-wand-outline" size={22} color={BrandColors.primary} />
                <Text style={[styles.modalActionText, { color: BrandColors.primary, fontWeight: '700' }]}>
                  Hồ Sơ Nghề Nghiệp MUA
                </Text>
                <Ionicons name="chevron-forward" size={18} color={BrandColors.primary} />
              </TouchableOpacity>
            )}

            {/* 2.1. Quản Lý Gói Dịch Vụ Cá Nhân (Chỉ dành cho Freelance MUA) */}
            {isMUA && (
              <TouchableOpacity
                style={styles.modalActionRow}
                onPress={() => {
                  setShowProfileModal(false);
                  router.push('/mua/packages' as any);
                }}
                activeOpacity={0.7}>
                <Ionicons name="briefcase-outline" size={22} color={BrandColors.primary} />
                <Text style={[styles.modalActionText, { color: BrandColors.primary, fontWeight: '700' }]}>
                  Quản Lý Gói Dịch Vụ Của Tôi
                </Text>
                <Ionicons name="chevron-forward" size={18} color={BrandColors.primary} />
              </TouchableOpacity>
            )}

            {/* 3. Trang Cá Nhân Công Khai (Chỉ dành cho MUA) */}
            {isMUA && (
              <TouchableOpacity
                style={styles.modalActionRow}
                onPress={() => {
                  setShowProfileModal(false);
                  router.push({
                    pathname: '/mua-detail/[id]',
                    params: { id: userInfo?.muaId || 4 },
                  });
                }}
                activeOpacity={0.7}>
                <Ionicons name="globe-outline" size={22} color={BrandColors.slateHeading} />
                <Text style={styles.modalActionText}>Trang Cá Nhân Công Khai</Text>
                <Ionicons name="chevron-forward" size={18} color={BrandColors.slateMuted} />
              </TouchableOpacity>
            )}

            {/* 4. Hồ Sơ Nhân Sự Studio (Chỉ dành cho Agency Staff) */}
            {isAgencyStaff && (
              <TouchableOpacity
                style={styles.modalActionRow}
                onPress={() => {
                  setShowProfileModal(false);
                  router.push('/profile/staff-profile');
                }}
                activeOpacity={0.7}>
                <Ionicons name="business-outline" size={22} color={BrandColors.primary} />
                <Text style={[styles.modalActionText, { color: BrandColors.primary, fontWeight: '700' }]}>
                  Hồ Sơ Nhân Sự Studio
                </Text>
                <Ionicons name="chevron-forward" size={18} color={BrandColors.primary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalActionRow}
              onPress={() => {
                setShowProfileModal(false);
                Alert.alert('Ví Tiền', 'Tính năng quản lý ví & cọc Escrow.');
              }}
              activeOpacity={0.7}>
              <Ionicons name="wallet-outline" size={22} color={BrandColors.slateHeading} />
              <Text style={styles.modalActionText}>Ví Tiền & Điểm Thưởng</Text>
              <Ionicons name="chevron-forward" size={18} color={BrandColors.slateMuted} />
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={[styles.modalActionRow, { marginBottom: 12 }]}
              onPress={handleLogout}
              activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={22} color={BrandColors.danger} />
              <Text style={[styles.modalActionText, { color: BrandColors.danger }]}>
                Đăng Xuất Tài Khoản
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowProfileModal(false)}
              activeOpacity={0.8}>
              <Text style={styles.closeModalBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL RADAR TÌM THỢ KHẨN CẤP 30S (SPRINT M-2) */}
      <InstantRadarModal
        visible={isRadarModalVisible}
        onClose={() => setIsRadarModalVisible(false)}
      />

      {/* MODAL ĐẾM NGƯỢC 30S NHẬN CA KHẨN CẤP (CHO THỢ MUA KHI CÓ BROADCAST) */}
      <CountdownAcceptModal />

      {/* Bottom Navigation Bar */}
      <AppBottomNavBar
        activeTab="home"
        onAccountPress={() => setShowProfileModal(true)}
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
  workstationShortcutsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 8,
  },
  workstationShortcutCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  workstationShortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  workstationShortcutText: {
    flex: 1,
  },
  workstationShortcutTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  workstationShortcutSub: {
    fontSize: 10,
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
  emergencyCard: {
    borderRadius: 16,
    backgroundColor: BrandColors.primary,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  emergencyGlowBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: BrandColors.hover,
    opacity: 0.2,
  },
  emergencyContent: {
    padding: 16,
  },
  emergencyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  emergencyBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countdownPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
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
    marginBottom: 14,
  },
  emergencyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9F1239',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  emergencyCtaText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
});
