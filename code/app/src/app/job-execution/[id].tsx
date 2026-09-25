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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { JobTimelineStep } from '@/components/mua/JobTimelineStep';
import { ProofCameraModal } from '@/components/mua/ProofCameraModal';
import { freelancerBookingService, FreelancerBookingItem } from '@/services/freelancer-booking.service';
import { bookingService, BookingStatusType } from '@/services/booking.service';

export default function JobExecutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const [booking, setBooking] = useState<FreelancerBookingItem | null>(null);
  const [currentStatus, setCurrentStatus] = useState<BookingStatusType>('ACCEPTED');
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCameraVisible, setIsCameraVisible] = useState(false);

  // Stopwatch state when IN_PROGRESS
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadBookingDetail();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [bookingId]);

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
      const list = await freelancerBookingService.getMyAssignedBookings();
      const found = list.find((b: FreelancerBookingItem) => b.id === bookingId);
      if (found) {
        setBooking(found);
        setCurrentStatus(found.status);
      } else {
        // Truy vấn chi tiết đơn thực tế từ backend
        const detail = await bookingService.getBookingStatus(bookingId);
        if (detail) {
          setBooking({
            id: detail.bookingId,
            bookingCode: detail.bookingCode,
            status: detail.status as BookingStatusType,
            customerName: 'Khách hàng',
            packageName: 'Dịch vụ trang điểm',
            destinationAddress: detail.destinationAddress || 'Địa chỉ khách hàng',
            destinationLatitude: detail.destinationLatitude ? Number(detail.destinationLatitude) : 21.0285,
            destinationLongitude: detail.destinationLongitude ? Number(detail.destinationLongitude) : 105.8542,
            bookingDate: new Date().toISOString().split('T')[0],
            startTime: '09:00',
            totalAmount: detail.totalAmount ? Number(detail.totalAmount) : 0,
            depositAmount: 0,
            earningsAmount: detail.totalAmount ? Number(detail.totalAmount) : 0,
            createdAt: detail.updatedAt || new Date().toISOString(),
          });
          setCurrentStatus(detail.status as BookingStatusType);
        }
      }
    } catch (e) {
      console.warn('Lỗi tải chi tiết đơn:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransitionState = async (nextStatus: BookingStatusType, completionPhotoUrl?: string) => {
    try {
      setIsTransitioning(true);
      await freelancerBookingService.transitionBookingState(bookingId, nextStatus, undefined, completionPhotoUrl);
      setCurrentStatus(nextStatus);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (nextStatus === 'COMPLETED') {
        Alert.alert(
          '🎉 Ca Làm Hoàn Thành Xuất Sắc!',
          'Hệ thống đã xác thực ảnh nghiệm thu và kích hoạt giải ngân tiền cọc vào Ví tài khoản của bạn.',
          [
            {
              text: 'Về Bàn Làm Việc',
              onPress: () => router.replace('/mua/workstation'),
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

  const handleOpenMaps = () => {
    if (booking?.destinationLatitude && booking?.destinationLongitude) {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${booking.destinationLatitude},${booking.destinationLongitude}`);
    } else if (booking?.destinationAddress) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.destinationAddress)}`);
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

  const formatVnd = (amount: number) => (amount || 0).toLocaleString('vi-VN') + ' đ';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#E11D48" />
        <Text style={styles.loadingText}>Đang nạp thông tin ca làm...</Text>
      </SafeAreaView>
    );
  }

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
        {/* Step Progress Timeline */}
        <JobTimelineStep currentStatus={currentStatus} />

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
              <Text style={styles.rowValue}>{booking?.customerName} • {booking?.customerPhone}</Text>
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

        {/* Financials Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardSectionTitle}>Chi Phí & Thu Nhập</Text>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Tổng tiền dịch vụ:</Text>
            <Text style={styles.financeValue}>{formatVnd(booking?.totalAmount || 0)}</Text>
          </View>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Tiền cọc Escrow đã khóa:</Text>
            <Text style={styles.financeValue}>{formatVnd(booking?.depositAmount || 0)}</Text>
          </View>
          <View style={[styles.financeRow, styles.earningsHighlight]}>
            <Text style={styles.earningsLabelText}>Thu nhập thợ thực nhận (80%):</Text>
            <Text style={styles.earningsValueText}>{formatVnd(booking?.earningsAmount || 0)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Action Bar based on current Status */}
      <View style={styles.bottomBar}>
        {(currentStatus === 'ACCEPTED' || currentStatus === 'AGENCY_ASSIGNED') && (
          <TouchableOpacity
            style={[styles.primaryActionBtn, isTransitioning && styles.disabledBtn]}
            onPress={() => handleTransitionState('ON_THE_WAY')}
            disabled={isTransitioning}
          >
            {isTransitioning ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="rocket" size={20} color="#FFFFFF" />
                <Text style={styles.btnText}>BẮT ĐẦU DI CHUYỂN (GPS ON)</Text>
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
                <Ionicons name="location" size={20} color="#FFFFFF" />
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
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
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
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.btnText}>CHỤP ẢNH NGHIỆM THU & HOÀN THÀNH</Text>
          </TouchableOpacity>
        )}

        {(currentStatus === 'COMPLETED' || currentStatus === 'PAID_OUT') && (
          <View style={styles.completedBadgeBar}>
            <Ionicons name="checkmark-circle" size={22} color="#059669" />
            <Text style={styles.completedBadgeText}>Ca làm việc đã hoàn thành & giải ngân!</Text>
          </View>
        )}
      </View>

      {/* Proof Camera Modal */}
      <ProofCameraModal
        visible={isCameraVisible}
        bookingId={bookingId}
        onClose={() => setIsCameraVisible(false)}
        onSuccess={(photoUrl) => {
          setIsCameraVisible(false);
          handleTransitionState('COMPLETED', photoUrl);
        }}
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
    paddingBottom: 100,
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
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E11D48',
    height: 52,
    borderRadius: 14,
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
    height: 52,
    borderRadius: 14,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
});
