import React, { useEffect, useState } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { useBookingStore } from '@/store/booking.store';
import { CustomerBookingItem } from '@/services/booking.service';
import { BookingTabSegment } from '@/components/booking/BookingTabSegment';
import { BookingHistoryCard } from '@/components/booking/BookingHistoryCard';
import { CancelBookingModal } from '@/components/booking/CancelBookingModal';
import { AppBottomNavBar } from '@/components/common/AppBottomNavBar';

export default function BookingsScreen() {
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

  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState<CustomerBookingItem | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const currentList = activeTab === 'UPCOMING' ? upcomingBookings : historyBookings;

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
    Alert.alert(
      'Vị Trí Thợ (Live Tracking)',
      `Thợ trang điểm đang di chuyển tới địa chỉ:\n${booking.destinationAddress}\nCự ly dự kiến đến nơi trong ít phút.`
    );
  };

  const handleReview = (booking: CustomerBookingItem) => {
    Alert.alert(
      'Đánh Giá Dịch Vụ ⭐',
      `Gửi lời cảm ơn và đánh giá chuyên viên MUA cho đơn ${booking.bookingCode}.`
    );
  };

  const handleRebook = (booking: CustomerBookingItem) => {
    router.push('/explore');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* HEADER TOP BAR */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch Hẹn Của Tôi</Text>
      </View>

      {/* SEGMENT TABS */}
      <View style={styles.tabContainer}>
        <BookingTabSegment
          activeTab={activeTab}
          upcomingCount={upcomingBookings.length}
          historyCount={historyBookings.length}
          onTabChange={setActiveTab}
        />
      </View>

      {/* DANH SÁCH ĐƠN HÀNG */}
      {isLoadingBookings && currentList.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách lịch hẹn...</Text>
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => `booking-${item.id}`}
          renderItem={({ item }) => (
            <BookingHistoryCard
              booking={item}
              onCancelPress={(b) => setSelectedBookingToCancel(b)}
              onTrackPress={handleTrack}
              onReviewPress={handleReview}
              onRebookPress={handleRebook}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshingBookings}
              onRefresh={() => fetchMyBookings(true)}
              colors={[BrandColors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={54} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {activeTab === 'UPCOMING'
                  ? 'Bạn chưa có lịch hẹn nào sắp tới'
                  : 'Chưa có lịch sử làm đẹp nào'}
              </Text>
              <Text style={styles.emptySubtitle}>
                Khám phá ngay các dịch vụ trang điểm chuyên nghiệp gần bạn và đặt lịch nhanh chóng.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.push('/explore')}
                activeOpacity={0.88}
              >
                <Text style={styles.exploreBtnText}>Khám Phá Dịch Vụ Ngay</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* MODAL HỦY LỊCH HẸN */}
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
