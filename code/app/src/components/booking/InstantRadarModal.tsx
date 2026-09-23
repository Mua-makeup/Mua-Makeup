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
  const [selectedType, setSelectedType] = useState(INSTANT_TYPES[0]);
  const [address, setAddress] = useState('227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM');
  const [note, setNote] = useState('');

  const [step, setStep] = useState<'IDLE' | 'SCANNING' | 'MATCHED' | 'TIMEOUT'>('IDLE');
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [createdBooking, setCreatedBooking] = useState<InstantBookingCreatedRes | null>(null);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (step === 'SCANNING') {
      setSecondsLeft(30);
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
    setStep('SCANNING');

    try {
      const res = await bookingService.createInstantBooking({
        packageId: selectedType.id,
        destinationAddress: address,
        destinationLatitude: 10.762622,
        destinationLongitude: 106.682338,
        note: note || `Yêu cầu ca gấp: ${selectedType.title}`,
      });
      setCreatedBooking(res);

      // Mô phỏng nhận thợ sau 8 giây nếu chạy test demo
      setTimeout(() => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        handleMatched();
      }, 8000);
    } catch (err: any) {
      Alert.alert('Không Thể Phát Sóng', err.message || 'Lỗi khi kích hoạt tìm thợ khẩn cấp.');
      setStep('IDLE');
    }
  };

  const handleMatched = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep('MATCHED');
  };

  const handleTimeout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setStep('TIMEOUT');
  };

  const handleCancel = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
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
              <Text style={styles.modalTitle}>Tìm Thợ Khẩn Cấp 30s</Text>
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

              <Text style={[styles.sectionHeading, { marginTop: 14 }]}>Địa Chỉ Đón Thợ:</Text>
              <TextInput
                style={styles.addressInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Nhập địa chỉ của bạn..."
                placeholderTextColor="#94A3B8"
              />

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

          {/* STEP 2: ĐANG PHÁT SÓNG RADAR ĐẾM NGƯỢC 30S */}
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
                Chuyên viên trang điểm <Text style={{ fontWeight: '800' }}>Lan Anh Make-up</Text> đã nhận ca và đang chuẩn bị xuất phát tới vị trí của bạn (cách 1.2 km).
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

          {/* STEP 4: TIMEOUT HẾT 30 GIÂY */}
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
  addressInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
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
