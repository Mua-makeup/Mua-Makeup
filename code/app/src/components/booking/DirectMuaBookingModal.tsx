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
  Platform,
  KeyboardAvoidingView,
  Image,
  PanResponder,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BrandColors } from '@/constants/theme';
import { bookingService, InstantBookingCreatedRes } from '@/services/booking.service';
import { NearbyProviderRes } from '@/services/telemetry.service';
import { websocketService } from '@/services/websocket.service';
import { packageService, PackageSummary } from '@/services/package.service';
import { MakeupStyle } from '@/services/taxonomy.service';
import { soundManager } from '@/utils/sound';
import { useLocationStore } from '@/store/location.store';
import { parseApiError } from '@/utils/error';
import { InstantCountdownTimer } from './InstantCountdownTimer';
import { SavedAddressModal } from '@/components/customer/SavedAddressModal';

interface Props {
  visible: boolean;
  targetMua: NearbyProviderRes | null;
  onClose: () => void;
  onFallbackRandomScan: () => void;
  onChooseAnotherMua: () => void;
}

export const DirectMuaBookingModal: React.FC<Props> = ({
  visible,
  targetMua,
  onClose,
  onFallbackRandomScan,
  onChooseAnotherMua,
}) => {
  const { currentAddress, latitude: storeLat, longitude: storeLng } = useLocationStore();

  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageSummary | null>(null);
  const [availableStyles, setAvailableStyles] = useState<MakeupStyle[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<MakeupStyle | null>(null);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);

  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [addressNote, setAddressNote] = useState('');
  const [isSavedAddressModalVisible, setIsSavedAddressModalVisible] = useState(false);

  const [step, setStep] = useState<'IDLE' | 'SCANNING' | 'MATCHED' | 'TIMEOUT'>('IDLE');
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<InstantBookingCreatedRes | null>(null);
  const [timeoutMessage, setTimeoutMessage] = useState<string | null>(null);
  const [matchedData, setMatchedData] = useState<any>(null);

  const timerRef = useRef<any>(null);
  const statusPollRef = useRef<any>(null);
  const activeTopicRef = useRef<string | null>(null);

  // Cử chỉ kéo xuống (swipe down) để đóng modal
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Chỉ nhận khi kéo xuống rõ rệt
        return gestureState.dy > 8 && Math.abs(gestureState.dx) < gestureState.dy;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 40 || gestureState.vy > 0.5) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          handleCancelRequest();
        }
      },
    })
  ).current;

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

  // Khi modal mở và có targetMua, tải đúng danh sách dịch vụ của thợ đó
  useEffect(() => {
    if (visible && targetMua) {
      setStep('IDLE');
      setTimeoutMessage(null);
      setAddress(currentAddress || '');
      setCoords(storeLat && storeLng ? { latitude: storeLat, longitude: storeLng } : null);
      loadMuaPackages(targetMua.providerId);
    }
  }, [visible, targetMua]);

  const loadMuaPackages = async (muaId: number) => {
    try {
      setIsLoadingPackages(true);
      const pkgs = await packageService.listPackages({ muaId, availableOnly: true });
      setPackages(pkgs || []);
      if (pkgs && pkgs.length > 0) {
        const first = pkgs[0];
        setSelectedPackage(first);
        updateStylesForPackage(first);
      } else {
        setSelectedPackage(null);
        setAvailableStyles([]);
        setSelectedStyle(null);
      }
    } catch (err) {
      console.warn('Lỗi nạp dịch vụ của thợ:', err);
      setPackages([]);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  const updateStylesForPackage = (pkg: PackageSummary) => {
    if (pkg.styles && pkg.styles.length > 0) {
      setAvailableStyles(pkg.styles);
      setSelectedStyle(pkg.styles[0]);
    } else {
      setAvailableStyles([]);
      setSelectedStyle(null);
    }
  };

  const handleSelectPackage = (pkg: PackageSummary) => {
    Haptics.selectionAsync();
    setSelectedPackage(pkg);
    updateStylesForPackage(pkg);
  };

  const handleSelectStyle = (st: MakeupStyle) => {
    Haptics.selectionAsync();
    setSelectedStyle(st);
  };

  const formatVnd = (amount?: number) => {
    return (amount || 0).toLocaleString('vi-VN') + ' đ';
  };

  // Đếm ngược 20s khi ở trạng thái SCANNING
  useEffect(() => {
    if (step === 'SCANNING') {
      const totalSec = createdBooking?.searchTimeoutSeconds || 20;
      const endTime = Date.now() + totalSec * 1000;
      setSecondsLeft(totalSec);

      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setSecondsLeft(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          handleTimeout('Chuyên viên trang điểm bạn chọn hiện không phản hồi.');
        }
      }, 1000);
      timerRef.current = interval;

      return () => {
        clearInterval(interval);
      };
    }
  }, [step, createdBooking?.searchTimeoutSeconds]);

  const handleSendDirectRequest = async () => {
    if (!targetMua || isSubmitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!selectedPackage) {
      Alert.alert('Chưa Chọn Gói Dịch Vụ', 'Vui lòng chọn một gói dịch vụ của chuyên viên.');
      return;
    }

    const lat = coords?.latitude || storeLat || 21.0285;
    const lng = coords?.longitude || storeLng || 105.8542;
    const sendAddress = address?.trim() || currentAddress || 'Vị trí hiện tại của bạn';

    try {
      setIsSubmitting(true);
      setTimeoutMessage(null);

      const res = await bookingService.createInstantBooking({
        masterCategoryId: selectedPackage.masterCategoryId || 1,
        packageId: selectedPackage.id,
        targetMuaId: targetMua.providerId,
        styleId: selectedStyle?.id,
        radiusKm: 15,
        destinationAddress: sendAddress,
        destinationLatitude: lat,
        destinationLongitude: lng,
        note: addressNote?.trim(),
      });

      setCreatedBooking(res);
      setSecondsLeft(res.searchTimeoutSeconds || 20);
      setStep('SCANNING');

      // Đăng ký nhận tin phản hồi từ thợ qua WebSocket
      await websocketService.connect();
      const topic = `/topic/booking-matched/${res.bookingId}`;
      activeTopicRef.current = topic;

      websocketService.subscribe(topic, (msg: any) => {
        console.log('[DirectMuaBookingModal] Nhận WebSocket realtime:', msg);
        if (msg?.status === 'ACCEPTED' || msg?.status === 'ON_THE_WAY' || msg?.type === 'BOOKING_MATCHED') {
          clearAllTimers();
          setMatchedData(msg);
          handleMatched(res.bookingId);
        } else if (msg?.status === 'CANCELLED' || msg?.status === 'EXPIRED' || msg?.type === 'BOOKING_TIMEOUT') {
          clearAllTimers();
          handleTimeout(msg?.message);
        }
      });

      // Polling dự phòng qua REST API
      statusPollRef.current = setInterval(async () => {
        try {
          const statusRes = await bookingService.getBookingStatus(res.bookingId);
          if (statusRes && (statusRes.status === 'ACCEPTED' || statusRes.status === 'ON_THE_WAY')) {
            clearAllTimers();
            handleMatched(res.bookingId);
          } else if (statusRes && (statusRes.status === 'CANCELLED' || statusRes.status === 'EXPIRED')) {
            clearAllTimers();
            handleTimeout(statusRes.cancellationReason);
          }
        } catch {}
      }, 2000);

    } catch (err: any) {
      const parsed = parseApiError(err);
      Alert.alert('Không Thể Đặt Thợ', parsed.message);
      setStep('IDLE');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMatched = (bookingId?: number) => {
    soundManager.playMatchSuccessSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    clearAllTimers();
    const targetId = bookingId || createdBooking?.bookingId;
    onClose();
    if (targetId) {
      router.push(`/booking/instant-matched/${targetId}` as any);
    }
  };

  const handleTimeout = (reason?: string) => {
    clearAllTimers();
    soundManager.playTimeoutSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setTimeoutMessage(reason || 'Chuyên viên trang điểm bạn chọn hiện không phản hồi.');
    setStep('TIMEOUT');
  };

  const handleCancelRequest = async () => {
    clearAllTimers();
    if (createdBooking) {
      try {
        await bookingService.cancelInstantBooking(createdBooking.bookingId);
      } catch {}
    }
    setStep('IDLE');
    onClose();
  };

  const basePrice = selectedPackage?.price || targetMua?.startingPrice || 500000;
  const emergencySurcharge = 150000;
  const totalAmount = basePrice + emergencySurcharge;
  const depositAmount = Math.round((totalAmount * 0.3) / 1000) * 1000;

  if (!targetMua) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancelRequest}>
      <View style={styles.overlay}>
        {/* Khoảng trống bên ngoài - ấn vào để đóng modal */}
        <Pressable
          style={styles.backdropPressable}
          onPress={handleCancelRequest}
          accessibilityLabel="Đóng modal"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={styles.keyboardAvoid}
        >
          <View style={styles.modalCard}>
            {/* VÙNG KÉO VUỐT XUỐNG ĐÓNG & HEADER */}
            <View {...panResponder.panHandlers} style={styles.dragArea}>
              <View style={styles.dragHandleBar} />
              <View style={styles.modalHeader}>
                <View style={styles.titleRow}>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>ĐÍCH DANH</Text>
                  </View>
                  <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                    Đặt Lịch Với {targetMua.fullName}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleCancelRequest}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* STEP 1: FORM CHỌN DỊCH VỤ & GỬI YÊU CẦU */}
            {step === 'IDLE' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* PROFILE CARD CỦA THỢ */}
                <View style={styles.muaProfileCard}>
                  <Image
                    source={{
                      uri: targetMua.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                    }}
                    style={styles.muaAvatar}
                  />
                  <View style={styles.muaInfoCol}>
                    <View style={styles.muaNameRow}>
                      <Text style={styles.muaFullName} numberOfLines={1}>
                        {targetMua.fullName}
                      </Text>
                      <Ionicons name="checkmark-circle" size={14} color={BrandColors.primary} />
                    </View>
                    <View style={styles.muaMetaRow}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.muaRating}>{targetMua.ratingAvg || '5.0'}</Text>
                      <Text style={styles.muaDot}>•</Text>
                      <Ionicons name="navigate-outline" size={11} color="#059669" />
                      <Text style={styles.muaDistance}>{targetMua.distanceKm} km</Text>
                      <Text style={styles.muaDot}>•</Text>
                      <Text style={styles.muaEta}>~{Math.max(5, Math.round((targetMua.distanceKm || 1) * 3))}p tới</Text>
                    </View>
                    <View style={styles.timeTag}>
                      <Ionicons name="time" size={10} color="#0284C7" />
                      <Text style={styles.timeTagText}>Phản hồi trong 20s</Text>
                    </View>
                  </View>
                </View>

              {/* PHẦN 1: GÓI DỊCH VỤ CỦA THỢ */}
              <View style={styles.sectionHeader}>
                <Ionicons name="sparkles" size={16} color={BrandColors.primary} />
                <Text style={styles.sectionTitle}>Gói Dịch Vụ Của {targetMua.fullName}</Text>
              </View>

              {isLoadingPackages ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={BrandColors.primary} />
                  <Text style={styles.loadingText}>Đang tải dịch vụ của thợ...</Text>
                </View>
              ) : packages.length === 0 ? (
                <View style={styles.emptyPackageBox}>
                  <Text style={styles.emptyPackageText}>
                    Chuyên viên hiện dùng gói dịch vụ mặc định theo phong cách đã cấu hình.
                  </Text>
                </View>
              ) : (
                <View style={styles.packageList}>
                  {packages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    return (
                      <TouchableOpacity
                        key={pkg.id}
                        style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                        onPress={() => handleSelectPackage(pkg)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.packageRadio}>
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSelected ? BrandColors.primary : '#94A3B8'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.packageTitleRow}>
                            <Text style={[styles.packageName, isSelected && styles.packageNameSelected]}>
                              {pkg.packageName}
                            </Text>
                            <Text style={styles.packagePrice}>{formatVnd(pkg.price)}</Text>
                          </View>
                          <Text style={styles.packageCategory}>{pkg.categoryName || 'Trang điểm'}</Text>
                          {pkg.estimatedDurationMinutes && (
                            <View style={styles.durationRow}>
                              <Ionicons name="timer-outline" size={12} color="#64748B" />
                              <Text style={styles.durationText}>{pkg.estimatedDurationMinutes} phút</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* PHẦN 2: PHONG CÁCH TRANG ĐIỂM (STYLES CỦA THỢ) */}
              {availableStyles.length > 0 && (
                <>
                  <View style={[styles.sectionHeader, { marginTop: 18 }]}>
                    <Ionicons name="color-palette-outline" size={16} color={BrandColors.primary} />
                    <Text style={styles.sectionTitle}>Phong Cách Trang Điểm</Text>
                  </View>
                  <View style={styles.stylesWrap}>
                    {availableStyles.map((st) => {
                      const isSel = selectedStyle?.id === st.id;
                      return (
                        <TouchableOpacity
                          key={st.id}
                          style={[styles.styleChip, isSel && styles.styleChipSelected]}
                          onPress={() => handleSelectStyle(st)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.styleChipText, isSel && styles.styleChipTextSelected]}>
                            {st.styleName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* PHẦN 3: ĐỊA CHỈ ĐÓN */}
              <View style={[styles.sectionHeader, { marginTop: 18 }]}>
                <Ionicons name="location" size={16} color="#E11D48" />
                <Text style={styles.sectionTitle}>Địa Điểm Thực Hiện</Text>
              </View>

              <View style={styles.addressBox}>
                <Ionicons name="pin" size={16} color="#E11D48" style={{ marginTop: 2, marginRight: 8 }} />
                <Text style={styles.addressText} numberOfLines={2}>
                  {address || currentAddress || 'Đang lấy vị trí của bạn...'}
                </Text>
              </View>

              <TextInput
                style={styles.noteInput}
                value={addressNote}
                onChangeText={setAddressNote}
                placeholder="Ghi chú thêm: Tòa nhà, số tầng, căn hộ, lưu ý da mặt..."
                placeholderTextColor="#94A3B8"
              />

              {/* PHẦN 4: HÓA ĐƠN & ĐẶT CỌC */}
              <View style={styles.invoiceCard}>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Giá gói của thợ:</Text>
                  <Text style={styles.invoiceValue}>{formatVnd(basePrice)}</Text>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceLabel}>Phụ phí ca khẩn cấp 30p:</Text>
                  <Text style={styles.invoiceValue}>+ {formatVnd(emergencySurcharge)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceTotalLabel}>Tổng Hóa Đơn:</Text>
                  <Text style={styles.invoiceTotalValue}>{formatVnd(totalAmount)}</Text>
                </View>
                <View style={styles.depositBanner}>
                  <Ionicons name="shield-checkmark" size={14} color="#059669" />
                  <Text style={styles.depositBannerText}>
                    Cọc giữ chân thợ (30% Escrow): <Text style={{ fontWeight: '800' }}>{formatVnd(depositAmount)}</Text>
                  </Text>
                </View>
              </View>

              {/* NÚT GỬI YÊU CẦU */}
              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
                onPress={handleSendDirectRequest}
                disabled={isSubmitting}
                activeOpacity={0.88}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="flash" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>
                      Gửi Yêu Cầu Tới Thợ (20s)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* STEP 2: ĐANG PHÁT ĐƠN VÀ ĐẾM NGƯỢC 20S */}
          {step === 'SCANNING' && (
            <View style={styles.scanningBox}>
              <View style={styles.timerRow}>
                <InstantCountdownTimer secondsLeft={secondsLeft} />
              </View>

              <View style={styles.scanningStatusBadge}>
                <Ionicons name="radio" size={13} color={BrandColors.primary} />
                <Text style={styles.scanningStatusBadgeText}>
                  Đang gửi yêu cầu trực tiếp tới thợ...
                </Text>
              </View>

              <Text style={styles.scanningTitle}>
                Đang Chờ {targetMua.fullName} Phản Hồi
              </Text>
              <Text style={styles.scanningDesc}>
                Yêu cầu làm đẹp khẩn cấp đã được gửi độc quyền tới thiết bị của{' '}
                <Text style={{ fontWeight: '700', color: BrandColors.primary }}>{targetMua.fullName}</Text>.
                Chuyên viên có 20s để bấm nhận ca.
              </Text>

              <View style={styles.scanDetailCard}>
                <View style={styles.scanDetailRow}>
                  <Ionicons name="sparkles" size={14} color={BrandColors.primary} />
                  <Text style={styles.scanDetailLabel}>Gói dịch vụ:</Text>
                  <Text style={styles.scanDetailVal}>{selectedPackage?.packageName || 'Trang điểm'}</Text>
                </View>
                {selectedStyle && (
                  <View style={styles.scanDetailRow}>
                    <Ionicons name="color-palette-outline" size={14} color="#64748B" />
                    <Text style={styles.scanDetailLabel}>Phong cách:</Text>
                    <Text style={styles.scanDetailVal}>{selectedStyle.styleName}</Text>
                  </View>
                )}
                <View style={styles.scanDetailRow}>
                  <Ionicons name="location" size={14} color="#64748B" />
                  <Text style={styles.scanDetailLabel}>Điểm đến:</Text>
                  <Text style={styles.scanDetailVal} numberOfLines={1}>{address || currentAddress}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.cancelRequestBtn} onPress={handleCancelRequest} activeOpacity={0.7}>
                <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                <Text style={styles.cancelRequestBtnText}>Hủy Yêu Cầu</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: THỢ ĐÃ TỪ CHỐI HOẶC HẾT 20S */}
          {step === 'TIMEOUT' && (
            <View style={styles.timeoutBox}>
              <View style={styles.timeoutIconCircle}>
                <Ionicons name="alert-circle-outline" size={42} color="#F59E0B" />
              </View>
              <Text style={styles.timeoutTitle}>Thợ Không Phản Hồi</Text>
              <Text style={styles.timeoutSubtitle}>
                {timeoutMessage || `Chuyên viên ${targetMua.fullName} hiện không phản hồi hoặc đang bận. Bạn có muốn chuyển sang quét thợ gần nhất không?`}
              </Text>

              <View style={styles.timeoutActionsCol}>
                <TouchableOpacity
                  style={styles.randomScanBtn}
                  onPress={() => {
                    onClose();
                    onFallbackRandomScan();
                  }}
                  activeOpacity={0.88}
                >
                  <Ionicons name="radio-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.randomScanBtnText}>Quét Tìm Thợ Quanh Đây (Tự Động)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.chooseOtherBtn}
                  onPress={() => {
                    onClose();
                    onChooseAnotherMua();
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="people-outline" size={16} color={BrandColors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.chooseOtherBtnText}>Chọn Thợ Khác Đang Online</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeTimeoutBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeTimeoutBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>

      <SavedAddressModal
        visible={isSavedAddressModalVisible}
        onClose={() => setIsSavedAddressModalVisible(false)}
        onSelectAddress={(selected) => {
          setAddress(selected.addressLine);
          setCoords({ latitude: selected.latitude, longitude: selected.longitude });
          setIsSavedAddressModalVisible(false);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  keyboardAvoid: {
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    overflow: 'hidden',
  },
  dragArea: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
  },
  dragHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 3,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#2563EB',
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.4,
  },
  modalHeaderTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  muaProfileCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  muaAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    marginRight: 10,
  },
  muaInfoCol: {
    flex: 1,
  },
  muaNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  muaFullName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  muaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  muaRating: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  muaDot: {
    fontSize: 10,
    color: '#94A3B8',
  },
  muaDistance: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#059669',
  },
  muaEta: {
    fontSize: 11.5,
    color: '#64748B',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
    alignSelf: 'flex-start',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  timeTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  loadingText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  emptyPackageBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  emptyPackageText: {
    fontSize: 11.5,
    color: '#B45309',
    lineHeight: 16,
  },
  packageList: {
    gap: 8,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
  },
  packageCardSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF1F2',
  },
  packageRadio: {
    marginRight: 8,
  },
  packageTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  packageNameSelected: {
    color: BrandColors.primary,
  },
  packagePrice: {
    fontSize: 13,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  packageCategory: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  durationText: {
    fontSize: 10.5,
    color: '#64748B',
  },
  stylesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  styleChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  styleChipSelected: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  styleChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  styleChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  addressText: {
    fontSize: 11.5,
    color: '#9F1239',
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  noteInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 11.5,
    color: '#0F172A',
    marginTop: 6,
  },
  invoiceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  invoiceLabel: {
    fontSize: 11.5,
    color: '#64748B',
  },
  invoiceValue: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  invoiceTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  invoiceTotalValue: {
    fontSize: 14,
    fontWeight: '900',
    color: BrandColors.primary,
  },
  depositBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 6,
  },
  depositBannerText: {
    fontSize: 10.5,
    color: '#065F46',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 14,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scanningBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  timerRow: {
    marginBottom: 20,
  },
  scanningStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  scanningStatusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  scanningTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  scanningDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  scanDetailCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    gap: 8,
  },
  scanDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scanDetailLabel: {
    fontSize: 12,
    color: '#64748B',
    width: 80,
  },
  scanDetailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  cancelRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
  },
  cancelRequestBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  timeoutBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  timeoutIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  timeoutTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  timeoutSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  timeoutActionsCol: {
    width: '100%',
    gap: 10,
  },
  randomScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
    borderRadius: 14,
    paddingVertical: 13,
  },
  randomScanBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  chooseOtherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  chooseOtherBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  closeTimeoutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  closeTimeoutBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
