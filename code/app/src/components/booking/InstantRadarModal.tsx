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
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BrandColors } from '@/constants/theme';
import { bookingService, InstantBookingCreatedRes } from '@/services/booking.service';
import { telemetryService, NearbyProviderRes } from '@/services/telemetry.service';
import { websocketService } from '@/services/websocket.service';
import { soundManager } from '@/utils/sound';
import { useLocationStore } from '@/store/location.store';
import * as Location from 'expo-location';
import { parseApiError } from '@/utils/error';
import { InstantCountdownTimer } from './InstantCountdownTimer';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const INSTANT_PACKAGES = [
  {
    id: 1,
    title: 'Make-up Dự Tiệc Tối',
    subtitle: 'Dạ hội, sinh nhật, prom, sự kiện',
    basePrice: 500000,
    durationMinutes: 60,
    icon: 'wine' as const,
  },
  {
    id: 2,
    title: 'Đi Làm / Hàng Ngày',
    subtitle: 'Nhẹ nhàng, trong trẻo, tự nhiên',
    basePrice: 350000,
    durationMinutes: 45,
    icon: 'sunny' as const,
  },
  {
    id: 3,
    title: 'Cô Dâu Cấp Tốc',
    subtitle: 'Đón dâu, ăn hỏi, tiệc cưới gấp',
    basePrice: 1200000,
    durationMinutes: 90,
    icon: 'heart' as const,
  },
];

const EMERGENCY_SURCHARGE = 150000; // Phụ phí ca khẩn cấp 30-45 phút

const STYLES = ['Tone Thái Sắc Sảo', 'Douyin Glam', 'Tone Hàn Trong Trẻo'];

export const InstantRadarModal: React.FC<Props> = ({ visible, onClose }) => {
  const { currentAddress, latitude: storeLat, longitude: storeLng, fetchCurrentLocation } = useLocationStore();
  const [selectedPackage, setSelectedPackage] = useState(INSTANT_PACKAGES[0]);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [hasHairStyle, setHasHairStyle] = useState(false);
  const [hasLashes, setHasLashes] = useState(false);

  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [addressNote, setAddressNote] = useState('');

  // Danh sách thợ thật từ API Backend
  const [nearbyProviders, setNearbyProviders] = useState<NearbyProviderRes[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<NearbyProviderRes | null>(null);

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

  // Tải tọa độ GPS và quét thợ thật quanh vị trí
  useEffect(() => {
    if (visible) {
      if (currentAddress && currentAddress !== 'Đang xác định vị trí...' && currentAddress !== 'Chưa cấp quyền vị trí') {
        setAddress(currentAddress);
      }

      if (storeLat && storeLng) {
        const cur = { latitude: storeLat, longitude: storeLng };
        setCoords(cur);
        fetchNearbyProviders(cur.latitude, cur.longitude);
      } else {
        refreshLocation();
      }
    } else {
      clearAllTimers();
      setStep('IDLE');
      setSelectedProvider(null);
    }
  }, [visible, currentAddress, storeLat, storeLng]);

  const refreshLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const cur = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCoords(cur);
        await fetchCurrentLocation();
        await fetchNearbyProviders(cur.latitude, cur.longitude);
      }
    } catch (e) {
      console.warn('Không thể định vị GPS khách hàng:', e);
    } finally {
      setIsLocating(false);
    }
  };

  const fetchNearbyProviders = async (lat: number, lng: number) => {
    try {
      setIsLoadingProviders(true);
      const list = await telemetryService.getNearbyProviders({
        latitude: lat,
        longitude: lng,
        radiusKm: 5,
      });
      setNearbyProviders(list || []);
    } catch (err) {
      console.warn('Lỗi gọi API thợ quanh đây:', err);
      setNearbyProviders([]);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  // Tính toán báo giá thời gian thực
  const hairAddonFee = hasHairStyle ? 100000 : 0;
  const lashesAddonFee = hasLashes ? 50000 : 0;
  const addonsTotal = hairAddonFee + lashesAddonFee;
  const totalAmount = selectedPackage.basePrice + EMERGENCY_SURCHARGE + addonsTotal;
  const depositAmount = Math.round((totalAmount * 0.3) / 1000) * 1000;
  const remainingAmount = totalAmount - depositAmount;

  const formatVnd = (amount: number) => (amount || 0).toLocaleString('vi-VN') + ' đ';

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

    // Kiểm tra nếu danh sách thợ rỗng trước khi gửi đơn
    if (nearbyProviders.length === 0) {
      Alert.alert(
        'Chưa Có Thợ Trực Tuyến',
        'Hiện tại chưa có chuyên viên make-up nào đang online trong bán kính 5km quanh bạn. Bạn vui lòng thử lại sau ít phút hoặc đặt lịch hẹn theo giờ nhé!'
      );
      return;
    }

    try {
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

      if (!targetLat || !targetLng) {
        targetLat = 21.0285;
        targetLng = 105.8542;
      }

      const sendAddress = address?.trim() || currentAddress || 'Vị trí hiện tại của bạn';
      const itemsNote: string[] = [];
      if (hasHairStyle) itemsNote.push('Uốn tóc tạo kiểu');
      if (hasLashes) itemsNote.push('Dán mi 3D');
      const combinedNote = `Style: ${selectedStyle}${itemsNote.length ? ' • ' + itemsNote.join(', ') : ''}${addressNote ? ' • ' + addressNote : ''}`;

      const res = await bookingService.createInstantBooking({
        packageId: selectedPackage.id,
        destinationAddress: sendAddress,
        destinationLatitude: targetLat,
        destinationLongitude: targetLng,
        note: combinedNote,
      });

      setCreatedBooking(res);
      setSecondsLeft(res.searchTimeoutSeconds || 45);
      setStep('SCANNING');

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
          handleMatched(res.bookingId);
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
            handleMatched(res.bookingId);
          } else if (statusRes && (statusRes.status === 'CANCELLED' || statusRes.status === 'EXPIRED')) {
            clearAllTimers();
            handleTimeout();
          }
        } catch {
          // Bỏ qua lỗi kết nối mạng tạm thời
        }
      }, 2000);
    } catch (err: any) {
      const parsed = parseApiError(err);
      Alert.alert('Không Thể Tìm Thợ', parsed.message);
      setStep('IDLE');
    }
  };

  const handleMatched = (bookingId?: number) => {
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

  const handleGoToTracking = () => {
    clearAllTimers();
    setStep('IDLE');
    onClose();
    if (createdBooking?.bookingId) {
      router.push(`/booking/tracking/${createdBooking.bookingId}` as any);
    } else {
      router.push('/bookings');
    }
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
              <Text style={styles.modalTitle}>Tìm Thợ Khẩn Cấp (30-45p)</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleCancel} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* BADGE THỐNG KÊ THỢ THẬT TỪ REDIS GEO */}
          <View style={styles.statusBarRow}>
            {isLoadingProviders ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <View style={styles.onlineBadge}>
                <View style={styles.greenPulseDot} />
                <Text style={styles.onlineBadgeText}>
                  {nearbyProviders.length > 0
                    ? `Có ${nearbyProviders.length} chuyên viên đang trực tuyến quanh bạn 5km`
                    : 'Hiện chưa có chuyên viên online trong 5km'}
                </Text>
              </View>
            )}
          </View>

          {/* STEP 1: FORM CẤU HÌNH GÓI & BÁO GIÁ MINH BẠCH */}
          {step === 'IDLE' && (
            <ScrollView
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* 1. CHỌN GÓI DỊCH VỤ */}
              <Text style={styles.sectionHeading}>1. Gói Dịch Vụ Cần Gấp:</Text>
              <View style={styles.packageList}>
                {INSTANT_PACKAGES.map((pkg) => {
                  const isSelected = pkg.id === selectedPackage.id;
                  return (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[styles.pkgCard, isSelected && styles.pkgCardSelected]}
                      onPress={() => setSelectedPackage(pkg)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.pkgIconBox, isSelected && styles.pkgIconBoxSelected]}>
                        <Ionicons
                          name={pkg.icon}
                          size={18}
                          color={isSelected ? '#FFFFFF' : '#64748B'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pkgTitle, isSelected && styles.pkgTitleSelected]}>
                          {pkg.title}
                        </Text>
                        <Text style={styles.pkgSub}>{pkg.subtitle} • {pkg.durationMinutes}p</Text>
                      </View>
                      <Text style={[styles.pkgPrice, isSelected && styles.pkgPriceSelected]}>
                        {formatVnd(pkg.basePrice)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 2. CHỌN PHONG CÁCH & BƯỚC KÈM THEO */}
              <Text style={styles.sectionHeading}>2. Phong Cách & Dịch Vụ Mua Thêm:</Text>
              <View style={styles.stylePillRow}>
                {STYLES.map((st) => {
                  const isSelected = st === selectedStyle;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[styles.stylePill, isSelected && styles.stylePillSelected]}
                      onPress={() => setSelectedStyle(st)}
                    >
                      <Text style={[styles.stylePillText, isSelected && styles.stylePillTextSelected]}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.addonRow}>
                <TouchableOpacity
                  style={[styles.addonChip, hasHairStyle && styles.addonChipSelected]}
                  onPress={() => setHasHairStyle(!hasHairStyle)}
                >
                  <Ionicons
                    name={hasHairStyle ? 'checkbox' : 'square-outline'}
                    size={16}
                    color={hasHairStyle ? BrandColors.primary : '#64748B'}
                  />
                  <Text style={styles.addonText}>Kèm làm tóc (+100k)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.addonChip, hasLashes && styles.addonChipSelected]}
                  onPress={() => setHasLashes(!hasLashes)}
                >
                  <Ionicons
                    name={hasLashes ? 'checkbox' : 'square-outline'}
                    size={16}
                    color={hasLashes ? BrandColors.primary : '#64748B'}
                  />
                  <Text style={styles.addonText}>Dán mi 3D (+50k)</Text>
                </TouchableOpacity>
              </View>

              {/* 3. ĐỊA CHỈ ĐÓN THỢ */}
              <View style={styles.addressHeaderRow}>
                <Text style={styles.sectionHeading}>3. Địa Chỉ Trang Điểm Tận Nơi:</Text>
                <TouchableOpacity
                  style={styles.detectBtn}
                  onPress={refreshLocation}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <>
                      <Ionicons name="locate" size={13} color="#2563EB" />
                      <Text style={styles.detectBtnText}>Lấy GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.addressInputBox}>
                <Ionicons name="location" size={18} color="#E11D48" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.addressInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Nhập địa chỉ nhà của bạn..."
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <TextInput
                style={styles.noteInput}
                value={addressNote}
                onChangeText={setAddressNote}
                placeholder="Ghi chú thêm: Tòa nhà, số tầng, căn hộ, mang tone gì..."
                placeholderTextColor="#94A3B8"
              />

              {/* 4. BẢNG PHÂN RÃ HÓA ĐƠN MINH BẠCH */}
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>Chi Tiết Dự Tính Hóa Đơn</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Giá dịch vụ gốc ({selectedPackage.title}):</Text>
                  <Text style={styles.breakdownValue}>{formatVnd(selectedPackage.basePrice)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Phụ phí ca khẩn cấp (Cam kết 30-45p):</Text>
                  <Text style={styles.breakdownValue}>+ {formatVnd(EMERGENCY_SURCHARGE)}</Text>
                </View>
                {addonsTotal > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Dịch vụ thêm (Tóc / Mi):</Text>
                    <Text style={styles.breakdownValue}>+ {formatVnd(addonsTotal)}</Text>
                  </View>
                )}
                <View style={styles.divider} />
                <View style={styles.breakdownRow}>
                  <Text style={styles.totalLabel}>Tổng Hóa Đơn:</Text>
                  <Text style={styles.totalValue}>{formatVnd(totalAmount)}</Text>
                </View>
                <View style={styles.depositRow}>
                  <Ionicons name="shield-checkmark" size={14} color="#059669" />
                  <Text style={styles.depositText}>
                    Cọc giữ chân thợ (30% Escrow): <Text style={{ fontWeight: '800' }}>{formatVnd(depositAmount)}</Text>
                  </Text>
                </View>
              </View>

              {/* NÚT KÍCH HOẠT QUÉT THỢ */}
              <TouchableOpacity
                style={styles.startScanBtn}
                onPress={handleStartScan}
                activeOpacity={0.88}
              >
                <Ionicons name="radio-outline" size={18} color="#FFFFFF" />
                <Text style={styles.startScanBtnText}>Bắt Đầu Quét Tìm Thợ Gần Nhất</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* STEP 2: ĐANG PHÁT SÓNG ĐẾM NGƯỢC 45S */}
          {step === 'SCANNING' && (
            <View style={styles.scanningBox}>
              <View style={styles.timerCenterRow}>
                <InstantCountdownTimer secondsLeft={secondsLeft} />
              </View>

              <View style={styles.scanningStatusBadge}>
                <Ionicons name="radio" size={13} color={BrandColors.primary} />
                <Text style={styles.scanningStatusBadgeText}>Đang Phát Tín Hiệu Thác Nước Tới Thợ...</Text>
              </View>

              <Text style={styles.scanningTitle}>Đang Kết Nối Chuyên Viên Gần Bạn</Text>
              <Text style={styles.scanningDesc}>
                Hệ thống đang quét các chuyên viên trong bán kính 5-10km. Thợ gần bạn nhất đang nhận được thông báo chuông và có 20s để bấm nhận ca.
              </Text>

              {/* CARD TÓM TẮT ĐƠN HÀNG */}
              <View style={styles.scanSummaryCard}>
                <View style={styles.scanSummaryRow}>
                  <Ionicons name="sparkles" size={14} color={BrandColors.primary} />
                  <Text style={styles.scanSummaryLabel}>Gói dịch vụ:</Text>
                  <Text style={styles.scanSummaryVal}>{selectedPackage.title}</Text>
                </View>
                <View style={styles.scanSummaryRow}>
                  <Ionicons name="location" size={14} color="#64748B" />
                  <Text style={styles.scanSummaryLabel}>Điểm đến:</Text>
                  <Text style={styles.scanSummaryVal} numberOfLines={1}>
                    {address?.trim() || currentAddress || 'Vị trí hiện tại'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.cancelScanBtn} onPress={handleCancel} activeOpacity={0.7}>
                <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.cancelScanBtnText}>Hủy Tìm Thợ</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: ĐÃ TÌM THẤY THỢ MUA NHẬN CA */}
          {step === 'MATCHED' && (
            <View style={styles.matchedBox}>
              <View style={styles.matchedCircle}>
                <Ionicons name="checkmark-done" size={36} color="#10B981" />
              </View>
              <Text style={styles.matchedTitle}>Đã Khớp Chuyên Viên! 🎉</Text>
              <Text style={styles.matchedSubtitle}>
                Chuyên viên{' '}
                <Text style={{ fontWeight: '800', color: BrandColors.primary }}>
                  {matchedMua?.name || 'Make-up Pro'}
                </Text>{' '}
                đã bấm nhận ca và đang chuẩn bị xuất phát tới vị trí của bạn.
              </Text>

              <TouchableOpacity
                style={styles.viewTripBtn}
                onPress={handleGoToTracking}
                activeOpacity={0.88}
              >
                <Ionicons name="navigate" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.viewTripBtnText}>Xem Bản Đồ Live Tracking</Text>
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
                Hiện các chuyên viên gần bạn đều đang bận thực hiện ca. Bạn có muốn thử quét lại hoặc đặt lịch hẹn trước?
              </Text>

              <View style={styles.timeoutBtnRow}>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={handleStartScan}
                  activeOpacity={0.88}
                >
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>Quét Lại (5km)</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radarIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
  },
  statusBarRow: {
    marginBottom: 12,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  onlineBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  scrollArea: {
    maxHeight: 520,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 10,
  },
  packageList: {
    gap: 8,
  },
  pkgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  pkgCardSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF1F2',
  },
  pkgIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pkgIconBoxSelected: {
    backgroundColor: BrandColors.primary,
  },
  pkgTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  pkgTitleSelected: {
    color: BrandColors.primary,
  },
  pkgSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  pkgPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  pkgPriceSelected: {
    color: BrandColors.primary,
  },
  stylePillRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  stylePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stylePillSelected: {
    backgroundColor: '#FFE4E6',
    borderColor: BrandColors.primary,
  },
  stylePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  stylePillTextSelected: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  addonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  addonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addonChipSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF1F2',
  },
  addonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  addressInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  addressInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  noteInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12,
    color: '#0F172A',
    marginBottom: 10,
  },
  breakdownCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  depositRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  depositText: {
    fontSize: 11,
    color: '#059669',
  },
  startScanBtn: {
    backgroundColor: BrandColors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startScanBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  scanningBox: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  timerCenterRow: {
    marginVertical: 10,
    alignItems: 'center',
  },
  scanningStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    marginBottom: 8,
  },
  scanningStatusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  scanningTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
    textAlign: 'center',
  },
  scanningDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  scanSummaryCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 10,
    gap: 6,
  },
  scanSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scanSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  scanSummaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  cancelScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 8,
  },
  cancelScanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  matchedBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  matchedCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  matchedSubtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  viewTripBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    marginTop: 8,
    marginBottom: 6,
  },
  timeoutSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  timeoutBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retryBtn: {
    backgroundColor: BrandColors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scheduleBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  scheduleBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
});
