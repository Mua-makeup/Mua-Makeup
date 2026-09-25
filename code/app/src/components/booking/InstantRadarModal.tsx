import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BrandColors } from '@/constants/theme';
import { bookingService, InstantBookingCreatedRes } from '@/services/booking.service';
import { websocketService } from '@/services/websocket.service';
import { soundManager } from '@/utils/sound';
import { useLocationStore } from '@/store/location.store';
import * as Location from 'expo-location';
import { RadarWavesAnimation } from './RadarWavesAnimation';
import { InstantCountdownTimer } from './InstantCountdownTimer';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const INSTANT_TYPES = [
  { id: 1, title: 'Trang Điểm Đi Tiệc', subtitle: 'Dạ hội, sinh nhật, prom', icon: 'wine' as const },
  { id: 2, title: 'Đi Làm / Hàng Ngày', subtitle: 'Nhẹ nhàng tự nhiên', icon: 'sunny' as const },
  { id: 3, title: 'Cô Dâu Cấp Tốc', subtitle: 'Cưới hỏi, đón dâu gấp', icon: 'heart' as const },
];

export const InstantRadarModal: React.FC<Props> = ({ visible, onClose }) => {
  const { currentAddress, latitude: storeLat, longitude: storeLng, fetchCurrentLocation } = useLocationStore();
  const [selectedType, setSelectedType] = useState(INSTANT_TYPES[0]);
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [note, setNote] = useState('');

  const [step, setStep] = useState<'IDLE' | 'SCANNING' | 'MATCHED' | 'TIMEOUT'>('IDLE');
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [createdBooking, setCreatedBooking] = useState<InstantBookingCreatedRes | null>(null);
  const [matchedMua, setMatchedMua] = useState<{
    name: string;
    phone?: string;
    avatar?: string;
  } | null>(null);

  const timerRef = useRef<any>(null);
  const statusPollRef = useRef<any>(null);
  const activeTopicRef = useRef<string | null>(null);

  const clearAllTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
    if (activeTopicRef.current) {
      websocketService.unsubscribe(activeTopicRef.current);
      activeTopicRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  // Tự động đồng bộ vị trí thực tế của khách hàng khi mở Modal
  useEffect(() => {
    if (visible) {
      if (currentAddress && currentAddress !== 'Đang xác định vị trí...' && currentAddress !== 'Chưa cấp quyền vị trí') {
        setAddress(currentAddress);
      }

      if (storeLat && storeLng) {
        setCoords({ latitude: storeLat, longitude: storeLng });
      } else {
        refreshLocation();
      }
    } else {
      clearAllTimers();
    }
  }, [visible, currentAddress, storeLat, storeLng]);

  const refreshLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        await fetchCurrentLocation();
      }
    } catch (e) {
      console.warn('Không thể định vị GPS khách hàng:', e);
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    if (step === 'SCANNING') {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [step]);

  const handleStartScan = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSecondsLeft(45);
    setStep('SCANNING');

    try {
      // 1. Xác định tọa độ thực tế: từ state coords -> store -> hoặc lấy trực tiếp từ chip GPS
      let targetLat = coords?.latitude || storeLat;
      let targetLng = coords?.longitude || storeLng;

      if (!targetLat || !targetLng) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            targetLat = loc.coords.latitude;
            targetLng = loc.coords.longitude;
          }
        } catch (e) {
          console.warn('Không thể lấy GPS tức thời:', e);
        }
      }

      // Fallback nếu chạy giả lập không có GPS (tọa độ Hà Đông gần MUA #3)
      if (!targetLat || !targetLng) {
        targetLat = 20.975845;
        targetLng = 105.762808;
      }

      const sendAddress = address?.trim() || currentAddress || 'Vị trí hiện tại của bạn';

      const res = await bookingService.createInstantBooking({
        packageId: selectedType.id,
        destinationAddress: sendAddress,
        destinationLatitude: targetLat,
        destinationLongitude: targetLng,
        note: note || `Yêu cầu ca gấp: ${selectedType.title}`,
      });
      setCreatedBooking(res);
      if (res.searchTimeoutSeconds) {
        setSecondsLeft(res.searchTimeoutSeconds);
      }

      // 2. Kết nối STOMP và đăng ký nhận tin ghép thợ tức thời qua WebSocket
      await websocketService.connect();
      const topic = `/topic/booking-matched/${res.bookingId}`;
      activeTopicRef.current = topic;

      websocketService.subscribe(topic, (msg: any) => {
        console.log('[InstantRadarModal] Nhận WebSocket realtime:', msg);
        if (msg?.status === 'ACCEPTED' || msg?.status === 'ON_THE_WAY' || msg?.type === 'BOOKING_MATCHED') {
          clearAllTimers();
          setMatchedMua({
            name: msg.muaName || 'Chuyên viên Make-up',
            phone: msg.muaPhone,
            avatar: msg.muaAvatar,
          });
          handleMatched();
        } else if (msg?.status === 'CANCELLED' || msg?.status === 'EXPIRED' || msg?.type === 'BOOKING_TIMEOUT') {
          clearAllTimers();
          handleTimeout();
        }
      });

      // 3. Polling dự phòng (Fallback an toàn qua REST)
      statusPollRef.current = setInterval(async () => {
        try {
          const statusRes = await bookingService.getBookingStatus(res.bookingId);
          if (statusRes && (statusRes.status === 'ACCEPTED' || statusRes.status === 'ON_THE_WAY')) {
            clearAllTimers();
            setMatchedMua({
              name: statusRes.muaName || 'Chuyên viên Make-up',
              phone: statusRes.muaPhone,
              avatar: statusRes.muaAvatar,
            });
            handleMatched();
          } else if (statusRes && (statusRes.status === 'CANCELLED' || statusRes.status === 'EXPIRED')) {
            clearAllTimers();
            handleTimeout();
          }
        } catch {
          // bỏ qua lỗi tạm thời khi polling mạng
        }
      }, 2000);
    } catch (err: any) {
      Alert.alert('Không Thể Phát Sóng', err.message || 'Lỗi khi kích hoạt tìm thợ khẩn cấp.');
      setStep('IDLE');
    }
  };

  const handleMatched = () => {
    soundManager.playMatchSuccessSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep('MATCHED');
  };

  const handleTimeout = () => {
    clearAllTimers();
    soundManager.playTimeoutSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setStep('TIMEOUT');
  };

  const handleCancel = async () => {
    clearAllTimers();
    if (createdBooking) {
      try {
        await bookingService.cancelInstantBooking(createdBooking.bookingId);
      } catch {
        // bỏ qua nếu lỗi hủy
      }
    }
    setStep('IDLE');
    onClose();
  };

  const handleGoToBookings = () => {
    clearAllTimers();
    setStep('IDLE');
    onClose();
    router.push('/bookings');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* HEADER */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <View style={styles.radarIconBox}>
                <Ionicons name="radio" size={18} color={BrandColors.primary} />
              </View>
              <Text style={styles.modalTitle}>Tìm Thợ Khẩn Cấp 45s</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleCancel} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* STEP 1: FORM CẤU HÌNH TÌM THỢ GẤP */}
          {step === 'IDLE' && (
            <View style={styles.contentBox}>
              <Text style={styles.sectionHeading}>Chọn Dịch Vụ Cần Làm Gấp:</Text>
              <View style={styles.typeGrid}>
                {INSTANT_TYPES.map((t) => {
                  const isSelected = t.id === selectedType.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.typeCard, isSelected && styles.typeCardSelected]}
                      onPress={() => setSelectedType(t)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.typeIcon, isSelected && styles.typeIconSelected]}>
                        <Ionicons
                          name={t.icon}
                          size={18}
                          color={isSelected ? BrandColors.primary : '#64748B'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.typeTitle, isSelected && styles.typeTitleSelected]}>
                          {t.title}
                        </Text>
                        <Text style={styles.typeSub}>{t.subtitle}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.addressSectionHeader}>
                <Text style={styles.sectionHeading}>Địa Chỉ Đón Thợ:</Text>
                <TouchableOpacity
                  style={styles.detectLocationBtn}
                  onPress={refreshLocation}
                  disabled={isLocating}
                  activeOpacity={0.7}
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <>
                      <Ionicons name="locate" size={13} color="#2563EB" />
                      <Text style={styles.detectLocationText}>Lấy GPS hiện tại</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.addressInputContainer}>
                <Ionicons name="location-sharp" size={18} color="#E11D48" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.addressInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Đang xác định địa chỉ đón thợ..."
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.priceEstimateBox}>
                <Ionicons name="flash" size={16} color="#D97706" />
                <Text style={styles.priceEstimateText}>
                  Giá tạm tính:{' '}
                  <Text style={styles.priceHighlight}>550.000 đ</Text> (Đã gồm phụ phí khẩn cấp 30 phút)
                </Text>
              </View>

              <TouchableOpacity
                style={styles.startScanBtn}
                onPress={handleStartScan}
                activeOpacity={0.88}
              >
                <Ionicons name="radio-outline" size={18} color="#FFFFFF" />
                <Text style={styles.startScanBtnText}>Phát Tín Hiệu Quét Thợ Ngay</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: ĐANG PHÁT SÓNG RADAR ĐẾM NGƯỢC 45S */}
          {step === 'SCANNING' && (
            <View style={styles.scanningBox}>
              <View style={styles.animationArea}>
                <RadarWavesAnimation />
                <View style={styles.timerCenter}>
                  <InstantCountdownTimer secondsLeft={secondsLeft} />
                </View>
              </View>

              <Text style={styles.scanningTitle}>Đang Phát Tín Hiệu Tới Thợ Rảnh...</Text>
              <Text style={styles.scanningDesc}>
                Hệ thống đang quét các chuyên viên MUA trong bán kính 5km xung quanh bạn. Ca hẹn sẽ tự động ghép với thợ nhận ca đầu tiên.
              </Text>

              <TouchableOpacity style={styles.cancelScanBtn} onPress={handleCancel} activeOpacity={0.7}>
                <Text style={styles.cancelScanBtnText}>Dừng Tìm Kiếm</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: ĐÃ TÌM THẤY THỢ MUA NHẬN CA */}
          {step === 'MATCHED' && (
            <View style={styles.matchedBox}>
              <View style={styles.matchedCircle}>
                <Ionicons name="checkmark-done" size={36} color="#10B981" />
              </View>
              <Text style={styles.matchedTitle}>Đã Tìm Thấy Thợ Nhận Ca! 🎉</Text>
              <Text style={styles.matchedSubtitle}>
                Chuyên viên trang điểm{' '}
                <Text style={{ fontWeight: '800' }}>
                  {matchedMua?.name || 'Thợ trang điểm MUA'}
                </Text>{' '}
                đã nhận ca và đang chuẩn bị xuất phát tới vị trí của bạn.
              </Text>

              <TouchableOpacity
                style={styles.viewTripBtn}
                onPress={handleGoToBookings}
                activeOpacity={0.88}
              >
                <Text style={styles.viewTripBtnText}>Theo Dõi Lịch Hẹn Ngay</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 4: TIMEOUT HẾT 45 GIÂY */}
          {step === 'TIMEOUT' && (
            <View style={styles.timeoutBox}>
              <Ionicons name="time-outline" size={48} color="#F59E0B" />
              <Text style={styles.timeoutTitle}>Chưa Tìm Thấy Thợ Nhận Ca</Text>
              <Text style={styles.timeoutSubtitle}>
                Hiện các chuyên viên MUA gần bạn đều đang bận ca. Bạn có muốn mở rộng bán kính tìm kiếm hoặc đặt lịch hẹn trước?
              </Text>

              <View style={styles.timeoutBtnRow}>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={handleStartScan}
                  activeOpacity={0.88}
                >
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>Quét Lại (10km)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.scheduleBtn}
                  onPress={() => {
                    onClose();
                    router.push('/explore');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.scheduleBtnText}>Đặt Lịch Hẹn</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radarIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  contentBox: {
    gap: 10,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  typeGrid: {
    gap: 8,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeCardSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF1F2',
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconSelected: {
    backgroundColor: '#FFE4E6',
  },
  typeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  typeTitleSelected: {
    color: BrandColors.primary,
  },
  typeSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  addressSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 6,
  },
  detectLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detectLocationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  addressInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  priceEstimateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginTop: 4,
  },
  priceEstimateText: {
    fontSize: 12,
    color: '#92400E',
  },
  priceHighlight: {
    fontWeight: '800',
    color: '#B45309',
  },
  startScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startScanBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scanningBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  animationArea: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCenter: {
    position: 'absolute',
  },
  scanningTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 16,
  },
  scanningDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 20,
  },
  cancelScanBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  cancelScanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  matchedBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  matchedCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  matchedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  matchedSubtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  viewTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  viewTripBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  timeoutBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  timeoutTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  timeoutSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 20,
  },
  timeoutBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scheduleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
  },
  scheduleBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
});
