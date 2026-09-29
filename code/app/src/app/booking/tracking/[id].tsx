import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import { bookingService } from '@/services/booking.service';
import { telemetryService, LiveTrackingRes } from '@/services/telemetry.service';
import { websocketService } from '@/services/websocket.service';
import { BookingProgressStepper } from '@/components/booking/BookingProgressStepper';
import { LiveTrackingMap } from '@/components/booking/LiveTrackingMap';

const CUSTOMER_CANCEL_REASONS = [
  'Bận việc đột xuất / Không thể tiếp tục',
  'Thợ di chuyển quá chậm / Không liên lạc được',
  'Đặt nhầm địa chỉ hoặc thời gian make-up',
  'Thay đổi ý định / muốn đặt lại sau',
  'Lý do khác',
];

export default function BookingLiveTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookingId = Number(id);

  const [isLoading, setIsLoading] = useState(true);
  const [bookingDetail, setBookingDetail] = useState<any>(null);
  const [status, setStatus] = useState<string>('ON_THE_WAY');

  const [customerCoords, setCustomerCoords] = useState<{ latitude: number; longitude: number; address?: string }>({
    latitude: 21.0285,
    longitude: 105.8542,
    address: 'Địa chỉ của bạn',
  });

  const [muaCoords, setMuaCoords] = useState<{ latitude: number; longitude: number; heading?: number; speed?: number }>({
    latitude: 21.0345,
    longitude: 105.8512,
    heading: 140,
    speed: 28,
  });

  const [etaMinutes, setEtaMinutes] = useState(12);
  const [distanceRemainingMeters, setDistanceRemainingMeters] = useState(2100);

  useEffect(() => {
    if (!bookingId) return;

    let isMounted = true;

    const loadInitialData = async () => {
      try {
        setIsLoading(true);

        // 1. Tải thông tin đơn hàng
        const detailRes = await bookingService.getBookingStatus(bookingId).catch(() => null);
        if (detailRes && isMounted) {
          setBookingDetail(detailRes);
          if (detailRes.status) {
            setStatus(detailRes.status);
          }
          if (detailRes.destinationLatitude && detailRes.destinationLongitude) {
            setCustomerCoords({
              latitude: Number(detailRes.destinationLatitude),
              longitude: Number(detailRes.destinationLongitude),
              address: detailRes.destinationAddress || 'Vị trí của bạn',
            });
          }
        }

        // 2. Tải vị trí Live ban đầu của Thợ
        const trackingRes: LiveTrackingRes = await telemetryService.getLiveTripTracking(bookingId).catch(() => null as any);
        if (trackingRes && isMounted) {
          setMuaCoords({
            latitude: trackingRes.currentLat,
            longitude: trackingRes.currentLng,
            heading: trackingRes.heading || 0,
            speed: trackingRes.speed || 0,
          });
          if (trackingRes.etaMinutes) setEtaMinutes(trackingRes.etaMinutes);
          if (trackingRes.distanceRemainingMeters) setDistanceRemainingMeters(trackingRes.distanceRemainingMeters);
        }
      } catch (err) {
        console.warn('Lỗi tải dữ liệu tracking ban đầu:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadInitialData();

    // 3. Đăng ký luồng stream GPS thời gian thực qua WebSocket STOMP
    const streamTopic = `/topic/gps-stream/${bookingId}`;
    const statusTopic = `/topic/booking-status/${bookingId}`;

    const setupRealtime = async () => {
      try {
        await websocketService.connect();

        // Stream tọa độ di chuyển
        websocketService.subscribe(streamTopic, (msg: any) => {
          if (msg && isMounted) {
            if (msg.currentLat && msg.currentLng) {
              setMuaCoords({
                latitude: Number(msg.currentLat),
                longitude: Number(msg.currentLng),
                heading: Number(msg.heading || 0),
                speed: Number(msg.speed || 0),
              });
            }
            if (msg.etaMinutes !== undefined) setEtaMinutes(msg.etaMinutes);
            if (msg.distanceRemainingMeters !== undefined) setDistanceRemainingMeters(msg.distanceRemainingMeters);
          }
        });

        // Trạng thái đơn hàng
        websocketService.subscribe(statusTopic, (statusMsg: any) => {
          const nextStatus = statusMsg?.currentStatus || statusMsg?.status;
          if (nextStatus && isMounted) {
            setStatus(nextStatus);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        });
      } catch (e) {
        console.warn('Lỗi kết nối STOMP tracking:', e);
      }
    };

    setupRealtime();

    return () => {
      isMounted = false;
      websocketService.unsubscribe(streamTopic);
      websocketService.unsubscribe(statusTopic);
    };
  }, [bookingId]);

  const handleCallMua = () => {
    const phone = bookingDetail?.muaPhone || '0988123456';
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Không Thể Gọi', 'Vui lòng kiểm tra lại quyền gọi điện trên thiết bị.');
    });
  };

  const handleSupportSos = () => {
    Alert.alert(
      'Hỗ Trợ Khẩn Cấp 24/7',
      'Đường dây nóng hỗ trợ khách hàng: 1900 8888. Bạn có muốn kết nối ngay?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Gọi Hotline', onPress: () => Linking.openURL('tel:19008888') },
      ]
    );
  };

  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [selectedReasonChip, setSelectedReasonChip] = useState<string>('Bận việc đột xuất / Không thể tiếp tục');
  const [customReason, setCustomReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCustomerCancelTrip = () => {
    setIsCancelModalVisible(true);
  };

  const handleConfirmCancelTrip = async () => {
    try {
      setIsCancelling(true);
      const finalReason = customReason.trim()
        ? `${selectedReasonChip}: ${customReason.trim()}`
        : selectedReasonChip;
      await bookingService.cancelBooking(bookingId, finalReason);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setIsCancelModalVisible(false);
      Alert.alert('Đã Hủy Đơn', 'Đơn đặt lịch đã được hủy thành công.', [
        { text: 'Về Trang Chủ', onPress: () => router.replace('/') },
      ]);
    } catch (e: any) {
      Alert.alert('Không Thể Hủy', e.response?.data?.message || e.message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Đang kết nối tín hiệu vệ tinh...</Text>
      </SafeAreaView>
    );
  }

  const muaName = bookingDetail?.muaName || 'Chuyên viên Make-up';
  const muaAvatar =
    bookingDetail?.muaAvatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* TOP BAR HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Theo Dõi Xe Thợ Di Chuyển</Text>
          <Text style={styles.headerCode}>
            Mã: {bookingDetail?.bookingCode || `BK-${bookingId}`}
          </Text>
        </View>

        <TouchableOpacity style={styles.sosBtn} onPress={handleSupportSos} activeOpacity={0.7}>
          <Ionicons name="shield" size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>

      {/* STEPPER TIẾN TRÌNH DỊCH VỤ REALTIME */}
      <View style={styles.stepperWrapper}>
        <BookingProgressStepper
          bookingId={bookingId}
          currentStatus={status}
          onStatusChange={(newStatus) => setStatus(newStatus)}
        />
      </View>

      {/* INTERACTIVE REALTIME MAP */}
      <View style={styles.mapContainer}>
        <LiveTrackingMap
          customerCoords={customerCoords}
          muaCoords={muaCoords}
          etaMinutes={etaMinutes}
          distanceRemainingMeters={distanceRemainingMeters}
          muaName={muaName}
        />
      </View>

      {/* BOTTOM MUA PROFILE DRAWER */}
      <View style={styles.bottomDrawer}>
        <View style={styles.drawerHandle} />

        <View style={styles.muaProfileRow}>
          <Image source={{ uri: muaAvatar }} style={styles.muaAvatar} />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.muaNameText}>{muaName}</Text>
              <View style={styles.proBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.muaPhoneText}>
              {bookingDetail?.muaPhone ? `SĐT: ${bookingDetail.muaPhone}` : 'Đã xác minh danh tính'}
            </Text>
            <Text style={styles.destinationSnippet} numberOfLines={1}>
              Điểm đến: {customerCoords.address}
            </Text>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionBtnRow}>
          <TouchableOpacity style={styles.callBtn} onPress={handleCallMua} activeOpacity={0.85}>
            <Ionicons name="call" size={18} color="#FFFFFF" />
            <Text style={styles.callBtnText}>Gọi Điện Cho Thợ</Text>
          </TouchableOpacity>

          {(status === 'ACCEPTED' || status === 'ON_THE_WAY') && (
            <TouchableOpacity
              style={styles.cancelTripBtn}
              onPress={handleCustomerCancelTrip}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={18} color="#E11D48" />
              <Text style={styles.cancelTripBtnText}>Hủy Đơn</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => router.push('/bookings')}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={18} color="#334155" />
            <Text style={styles.detailBtnText}>Chi Tiết</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL HỦY ĐƠN HÀNG DÀNH CHO KHÁCH HÀNG (KÈM LÝ DO & CHỐNG CHE BÀN PHÍM) */}
      <Modal visible={isCancelModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="close-circle" size={20} color="#E11D48" />
                <Text style={styles.modalTitle}>Lý Do Hủy Đơn Hàng</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCancelModalVisible(false)}
                disabled={isCancelling}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalSubtitle}>
                Vui lòng chọn lý do bạn muốn hủy ca hẹn này. Hành động này sẽ giải phóng chuyên viên và kết thúc lịch trình.
              </Text>

              <View style={styles.reasonsList}>
                {CUSTOMER_CANCEL_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.reasonChip,
                      selectedReasonChip === r && styles.reasonChipSelected,
                    ]}
                    onPress={() => setSelectedReasonChip(r)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        selectedReasonChip === r && styles.reasonChipTextSelected,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.reasonInput}
                placeholder="Nhập lý do chi tiết khác (tùy chọn)..."
                placeholderTextColor="#94A3B8"
                value={customReason}
                onChangeText={setCustomReason}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsCancelModalVisible(false)}
                  disabled={isCancelling}
                >
                  <Text style={styles.modalCancelBtnText}>Giữ Lại Đơn</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, isCancelling && styles.disabledBtn]}
                  onPress={handleConfirmCancelTrip}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Xác Nhận Hủy</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerCode: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.primary,
    marginTop: 2,
  },
  sosBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
  },
  bottomDrawer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  drawerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  muaProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  muaAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  muaNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  muaPhoneText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  destinationSnippet: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  callBtn: {
    flex: 1.5,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelTripBtn: {
    flex: 1,
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  cancelTripBtnText: {
    color: '#E11D48',
    fontSize: 13,
    fontWeight: '700',
  },
  detailBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
    marginBottom: 8,
    lineHeight: 18,
  },
  reasonsList: {
    gap: 8,
    marginVertical: 10,
  },
  reasonChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  reasonChipSelected: {
    borderColor: '#E11D48',
    backgroundColor: '#FFF1F2',
  },
  reasonChipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  reasonChipTextSelected: {
    color: '#E11D48',
    fontWeight: '700',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginTop: 10,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
