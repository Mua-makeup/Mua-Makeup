import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { useBookingStore } from '@/store/booking.store';
import { CustomerBookingItem } from '@/services/booking.service';
import {
  freelancerBookingService,
  FreelancerBookingItem,
} from '@/services/freelancer-booking.service';
import { BookingTabSegment } from '@/components/booking/BookingTabSegment';
import { BookingHistoryCard } from '@/components/booking/BookingHistoryCard';
import { TodayBookingCard } from '@/components/mua/TodayBookingCard';
import { CancelBookingModal } from '@/components/booking/CancelBookingModal';
import { AppBottomNavBar } from '@/components/common/AppBottomNavBar';

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

  // Tải danh sách đơn hàng toàn bộ của Thợ (toàn bộ các ngày)
  const fetchFreelancerBookings = async (isRefresh = false) => {
    if (!isRefresh) setIsLoadingFreelancer(true);
    else setIsRefreshingFreelancer(true);

    try {
      // date = undefined để lấy toàn bộ ca làm việc của thợ
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

      // Sắp xếp đơn thợ sắp tới: Tăng dần theo thời gian hẹn
      upcoming.sort((a, b) => {
        const timeA = new Date(`${a.bookingDate}T${a.startTime || '00:00:00'}`).getTime();
        const timeB = new Date(`${b.bookingDate}T${b.startTime || '00:00:00'}`).getTime();
        return timeA - timeB;
      });

      // Sắp xếp lịch sử ca làm của thợ: Giảm dần theo thời gian hẹn
      history.sort((a, b) => {
        const timeA = new Date(`${a.bookingDate}T${a.startTime || '00:00:00'}`).getTime();
        const timeB = new Date(`${b.bookingDate}T${b.startTime || '00:00:00'}`).getTime();
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

  const upcomingCount = isWorkstationRole ? freelancerUpcoming.length : upcomingBookings.length;
  const historyCount = isWorkstationRole ? freelancerHistory.length : historyBookings.length;
  const isLoading = isWorkstationRole ? isLoadingFreelancer : isLoadingBookings;
  const isRefreshing = isWorkstationRole ? isRefreshingFreelancer : isRefreshingBookings;
  const currentList = isWorkstationRole
    ? (activeTab === 'UPCOMING' ? freelancerUpcoming : freelancerHistory)
    : (activeTab === 'UPCOMING' ? upcomingBookings : historyBookings);

  const handleRefresh = async () => {
    if (isWorkstationRole) {
      await fetchFreelancerBookings(true);
    } else {
      await fetchMyBookings(true);
    }
  };

  const handleConfirmCancel = async (bookingId: number, reason: string) => {
    setIsCancelling(true);
    try {
      await cancelBooking(bookingId, reason);
      setSelectedBookingToCancel(null);
      Alert.alert('Đã Hủy Lịch Hẹn', 'Yêu cầu hủy ca làm đẹp của bạn đã được ghi nhận.');
    } catch (err: any) {
      Alert.alert('Lỗi Hủy Ca', err.message || 'Không thể hủy đơn tại thời điểm này.');
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* HEADER TOP BAR */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isWorkstationRole ? 'Lịch Ca Làm Việc Của Thợ' : 'Lịch Hẹn Của Tôi'}
        </Text>
      </View>

      {/* SEGMENT TABS */}
      <View style={styles.tabContainer}>
        <BookingTabSegment
          activeTab={activeTab}
          upcomingCount={upcomingCount}
          historyCount={historyCount}
          onTabChange={setActiveTab}
        />
      </View>

      {/* DANH SÁCH ĐƠN HÀNG */}
      {isLoading && currentList.length === 0 ? (
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
          data={currentList as any[]}
          keyExtractor={(item) => `booking-${item.id}`}
          renderItem={({ item }) =>
            isWorkstationRole ? (
              <TodayBookingCard booking={item as FreelancerBookingItem} />
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
          }
        />
      )}

      {/* MODAL HỦY LỊCH HẸN (DÀNH CHO KHÁCH HÀNG) */}
      <CancelBookingModal
        visible={!!selectedBookingToCancel}
        booking={selectedBookingToCancel}
        isCancelling={isCancelling}
        onConfirmCancel={handleConfirmCancel}
        onClose={() => setSelectedBookingToCancel(null)}
      />

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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
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
    paddingVertical: 60,
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
});
