import { DismissibleModal, DismissibleSurface } from '@/components/common/DismissibleModal';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Image,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { BrandColors } from '@/constants/theme';
import { UserAvatar } from '@/components/common/UserAvatar';
import { bookingService, InstantBookingCreatedRes } from '@/services/booking.service';
import { NearbyProviderRes } from '@/services/telemetry.service';
import { websocketService } from '@/services/websocket.service';
import { packageService, PackageSummary } from '@/services/package.service';
import { MakeupStyle } from '@/services/taxonomy.service';
import { mapsService, PlaceSuggestion } from '@/services/maps.service';
import { soundManager } from '@/utils/sound';
import { useLocationStore } from '@/store/location.store';
import { parseApiError } from '@/utils/error';
import { InstantCountdownTimer } from './InstantCountdownTimer';
import { SavedAddressModal } from '@/components/customer/SavedAddressModal';
import { GlobalPopupOverlay } from '@/components/common/GlobalPopupModal';
import { showGlobalPopup } from '@/store/popup.store';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  visible: boolean;
  targetMua: NearbyProviderRes | null;
  initialLocation?: {
    address?: string;
    coords?: { latitude: number; longitude: number } | null;
  } | null;
  onClose: () => void;
  onFallbackRandomScan: () => void;
  onChooseAnotherMua: () => void;
}

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

export const DirectMuaBookingModal: React.FC<Props> = ({
  visible,
  targetMua,
  initialLocation,
  onClose,
  onFallbackRandomScan,
  onChooseAnotherMua,
}) => {
  const { currentAddress, latitude: storeLat, longitude: storeLng } = useLocationStore();

  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageSummary | null>(null);
  const [availableStyles, setAvailableStyles] = useState<MakeupStyle[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<MakeupStyle | null>(null);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);

  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [addressNote, setAddressNote] = useState('');
  const [isSavedAddressModalVisible, setIsSavedAddressModalVisible] = useState(false);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<number | undefined>(undefined);
  const [isLocating, setIsLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const searchTimeoutRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<'IDLE' | 'SCANNING' | 'MATCHED' | 'TIMEOUT'>('IDLE');
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<InstantBookingCreatedRes | null>(null);
  const [timeoutMessage, setTimeoutMessage] = useState<string | null>(null);
  const [matchedData, setMatchedData] = useState<any>(null);

  const timerRef = useRef<any>(null);
  const statusPollRef = useRef<any>(null);
  const activeTopicRef = useRef<string | null>(null);

  const handleAddressChange = (text: string) => {
    setAddress(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (text.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearchingPlaces(true);
        try {
          const list = await mapsService.getPlaceSuggestions(
            text,
            coords?.latitude || storeLat,
            coords?.longitude || storeLng
          );
          setSuggestions(list || []);
        } catch {
          setSuggestions([]);
        } finally {
          setIsSearchingPlaces(false);
        }
      }, 350);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = async (item: PlaceSuggestion) => {
    Haptics.selectionAsync();
    setAddress(item.description);
    setSuggestions([]);
    try {
      const detail = await mapsService.getPlaceDetail(item.placeId);
      if (detail && detail.latitude && detail.longitude) {
        setCoords({ latitude: detail.latitude, longitude: detail.longitude });
      }
    } catch (e) {
      console.warn('Lỗi lấy tọa độ từ place detail:', e);
    }
  };

  const refreshLocation = async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const cur = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCoords(cur);
        const geoRes = await mapsService.reverseGeocode(cur.latitude, cur.longitude);
        if (geoRes?.formattedAddress) {
          setAddress(geoRes.formattedAddress);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Quyền Vị Trí', 'Vui lòng cấp quyền truy cập vị trí để tự động định vị.');
      }
    } catch (e) {
      console.warn('Không thể định vị GPS khách hàng:', e);
    } finally {
      setIsLocating(false);
    }
  };

  // Cử chỉ kéo xuống (swipe down) để đóng modal


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
      setShowStyleModal(false);
      if (initialLocation?.address && initialLocation?.coords) {
        setAddress(initialLocation.address);
        setCoords(initialLocation.coords);
      } else {
        setAddress(currentAddress || '');
        setCoords(storeLat && storeLng ? { latitude: storeLat, longitude: storeLng } : null);
      }
      loadMuaPackages(targetMua.providerId);
    }
  }, [visible, targetMua, initialLocation]);

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
      setSelectedStyle(null);
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

  const formatDistance = (dist?: number | null) => {
    if (dist == null) return 'Gần bạn';
    if (dist < 0.1) return '< 100m';
    return `${dist.toFixed(1)} km`;
  };

  const currentLat = coords?.latitude || storeLat;
  const currentLng = coords?.longitude || storeLng;
  const calculatedDist = getDistanceKm(currentLat, currentLng, targetMua?.fuzzedLatitude, targetMua?.fuzzedLongitude);
  const effectiveDist = calculatedDist != null ? calculatedDist : targetMua?.distanceKm;

  const muaMaxRadius = targetMua?.maxServiceRadiusKm || 5;
  const isOutOfRadius = Boolean(
    targetMua &&
    effectiveDist != null &&
    effectiveDist > muaMaxRadius
  );

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

    if (!useAuthStore.getState().isAuthenticated) {
      onClose();
      router.push('/(auth)/login');
      return;
    }

    if (!selectedPackage) {
      Alert.alert('Chưa Chọn Gói Dịch Vụ', 'Vui lòng chọn một gói dịch vụ của chuyên viên.');
      return;
    }

    const lat = coords?.latitude || storeLat || 21.0285;
    const lng = coords?.longitude || storeLng || 105.8542;
    const sendAddress = address?.trim() || currentAddress || 'Vị trí hiện tại của bạn';

    if (effectiveDist != null && effectiveDist > muaMaxRadius) {
      showGlobalPopup(
        'Ngoài Bán Kính Phục Vụ',
        `Điểm đón cách chuyên viên ${formatDistance(effectiveDist)}, vượt quá bán kính nhận ca tối đa (${muaMaxRadius} km) của chuyên viên này.`,
        [
          {
            text: 'Quét Thợ Quanh Đây',
            onPress: () => onFallbackRandomScan(),
            style: 'default',
          },
          { text: 'Đóng', style: 'cancel' },
        ],
        { autoCloseSeconds: 5 }
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setTimeoutMessage(null);

      const res = await bookingService.createInstantBooking({
        masterCategoryId: selectedPackage.masterCategoryId || 1,
        packageId: selectedPackage.id,
        targetMuaId: targetMua.providerId,
        styleId: selectedStyle?.id,
        radiusKm: muaMaxRadius,
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
      showGlobalPopup(
        'Không Thể Đặt Thợ',
        parsed.message || 'Không thể gửi yêu cầu đặt lịch tới chuyên viên này.',
        [
          {
            text: 'Quét Thợ Gần Nhất',
            onPress: () => onFallbackRandomScan(),
            style: 'default',
          },
          { text: 'Đóng', style: 'cancel' },
        ],
        { autoCloseSeconds: 5 }
      );
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
    const msg = reason || 'Chuyên viên trang điểm bạn chọn hiện không phản hồi yêu cầu nhận ca.';
    setTimeoutMessage(msg);
    setStep('TIMEOUT');

    showGlobalPopup(
      'Chuyên Viên Không Phản Hồi',
      msg,
      [
        {
          text: 'Quét Thợ Gần Nhất',
          onPress: () => onFallbackRandomScan(),
          style: 'default',
        },
        {
          text: 'Chọn Thợ Khác',
          onPress: () => onChooseAnotherMua(),
          style: 'default',
        },
        { text: 'Đóng', style: 'cancel' },
      ],
      { autoCloseSeconds: 5 }
    );
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
  const depositAmount = totalAmount * 0.3;

  if (!targetMua) return null;

  return (
    <DismissibleModal
      visible={visible}
      onClose={handleCancelRequest}
      overlayStyle={styles.overlay}
      contentStyle={styles.modalCard}
      overlays={
        <>
          <SavedAddressModal
            visible={isSavedAddressModalVisible}
            selectedAddressId={selectedSavedAddressId}
            onClose={() => setIsSavedAddressModalVisible(false)}
            onSelectAddress={(selected) => {
              setSelectedSavedAddressId(selected.id);
              setAddress(selected.addressLine);
              setCoords({ latitude: selected.latitude, longitude: selected.longitude });
              setIsSavedAddressModalVisible(false);
            }}
          />
          <GlobalPopupOverlay />

          {/* MODAL BOTTOMSHEET CHỌN PHONG CÁCH MAKE-UP */}
          {showStyleModal && (
            <View style={StyleSheet.absoluteFill}>
              <DismissibleSurface
                visible={showStyleModal}
                onClose={() => setShowStyleModal(false)}
                overlayStyle={styles.styleModalOverlay}
                contentStyle={styles.styleBottomSheet}
              >
                <View style={styles.styleModalHeader}>
                  <View>
                    <Text style={styles.styleModalTitle}>Phong Cách Make-up</Text>
                    <Text style={styles.styleModalSubtitle}>
                      Chọn phong cách tương thích với gói dịch vụ này
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowStyleModal(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={22} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.stylesListScroll}
                  contentContainerStyle={styles.stylesListScrollInner}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Tùy chọn 1: Bất kỳ phong cách nào (Mặc định) */}
                  <TouchableOpacity
                    style={[
                      styles.styleRowCard,
                      selectedStyle == null && styles.styleRowCardChecked,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedStyle(null);
                      setShowStyleModal(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.styleRowLeft}>
                      <View
                        style={[
                          styles.styleIconBox,
                          selectedStyle == null && styles.styleIconBoxChecked,
                        ]}
                      >
                        <Ionicons
                          name={selectedStyle == null ? 'checkmark' : 'sparkles-outline'}
                          size={15}
                          color={selectedStyle == null ? BrandColors.primary : '#94A3B8'}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.styleNameText,
                            selectedStyle == null && styles.styleNameTextChecked,
                          ]}
                        >
                          Bất kỳ phong cách nào (Mặc định)
                        </Text>
                        <Text style={styles.styleDescText}>
                          Chuyên viên sẽ tư vấn tone make-up phù hợp nhất với gương mặt bạn
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.checkboxCircle,
                        selectedStyle == null && styles.checkboxCircleChecked,
                      ]}
                    >
                      {selectedStyle == null && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>

                  {/* Danh sách các phong cách của gói */}
                  {availableStyles.map((style) => {
                    const isChecked = selectedStyle?.id === style.id;
                    return (
                      <TouchableOpacity
                        key={style.id}
                        style={[styles.styleRowCard, isChecked && styles.styleRowCardChecked]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedStyle(style);
                          setShowStyleModal(false);
                        }}
                        activeOpacity={0.75}
                      >
                        <View style={styles.styleRowLeft}>
                          <View
                            style={[
                              styles.styleIconBox,
                              isChecked && styles.styleIconBoxChecked,
                            ]}
                          >
                            <Ionicons
                              name={isChecked ? 'checkmark' : 'color-palette-outline'}
                              size={15}
                              color={isChecked ? BrandColors.primary : '#94A3B8'}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.styleNameText,
                                isChecked && styles.styleNameTextChecked,
                              ]}
                            >
                              {style.styleName}
                            </Text>
                            {style.description ? (
                              <Text style={styles.styleDescText} numberOfLines={2}>
                                {style.description}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        <View
                          style={[
                            styles.checkboxCircle,
                            isChecked && styles.checkboxCircleChecked,
                          ]}
                        >
                          {isChecked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </DismissibleSurface>
            </View>
          )}
        </>
      }
    >
            {/* VÙNG KÉO VUỐT XUỐNG ĐÓNG & HEADER */}
            <View style={styles.dragArea}>

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

              </View>
            </View>

            {/* STEP 1: FORM CHỌN DỊCH VỤ & GỬI YÊU CẦU */}
            {step === 'IDLE' && (
              <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* PROFILE CARD CỦA THỢ */}
                <View style={styles.muaProfileCard}>
                  <UserAvatar
                    uri={targetMua.avatarUrl}
                    name={targetMua.fullName}
                    size={52}
                    style={{ marginRight: 12 }}
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
                      <Text style={styles.muaDistance}>{formatDistance(effectiveDist)}</Text>
                      {targetMua.maxServiceRadiusKm != null && (
                        <>
                          <Text style={styles.muaDot}>•</Text>
                          <Text style={styles.muaEta}>Bán kính {targetMua.maxServiceRadiusKm}km</Text>
                        </>
                      )}
                    </View>
                    <View style={styles.timeTag}>
                      <Ionicons name="time" size={10} color="#0284C7" />
                      <Text style={styles.timeTagText}>Phản hồi trong 20s</Text>
                    </View>
                  </View>
                </View>

              {/* PHẦN 1: GÓI DỊCH VỤ CỦA THỢ */}
              <View style={styles.sectionHeader}>
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
                <View style={{ marginTop: 18 }}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="color-palette-outline" size={16} color={BrandColors.primary} />
                    <Text style={styles.sectionTitle}>Phong Cách Make-up Tương Thích *</Text>
                  </View>

                  {/* Nút bấm mở chọn phong cách */}
                  <TouchableOpacity
                    style={styles.styleSelectorButton}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setShowStyleModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.styleSelectorLeft}>
                      <View style={styles.paletteIconBox}>
                        <Ionicons name="color-palette-outline" size={20} color={BrandColors.primary} />
                      </View>
                      <View style={styles.styleSelectorTextCol}>
                        <Text
                          style={[
                            styles.styleSelectorMainText,
                            selectedStyle ? styles.styleSelectorMainTextActive : null,
                          ]}
                          numberOfLines={1}
                        >
                          {selectedStyle ? selectedStyle.styleName : 'Bất kỳ phong cách nào (Mặc định)'}
                        </Text>
                        <Text style={styles.styleSelectorSubText} numberOfLines={1}>
                          {selectedStyle ? 'Bấm để đổi phong cách make-up' : 'Bấm để chọn phong cách make-up cụ thể'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.styleSelectorRight}>
                      {selectedStyle && (
                        <View style={styles.styleCountBadge}>
                          <Text style={styles.styleCountBadgeText}>1</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>

                  {/* Danh sách Tags bên dưới: CHỈ hiển thị phong cách khách chọn */}
                  <View style={styles.styleTagsContainer}>
                    {selectedStyle ? (
                      <View style={styles.selectedTagPill}>
                        <Text style={styles.selectedTagText}>{selectedStyle.styleName}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedStyle(null);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close-circle" size={16} color="#BE185D" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.selectedTagPill, styles.selectedTagPillAny]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setShowStyleModal(true);
                        }}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="sparkles" size={13} color="#BE185D" />
                        <Text style={styles.selectedTagText}>Bất kỳ phong cách nào (Mặc định)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* PHẦN 3: ĐỊA CHỈ THỰC HIỆN MAKE-UP */}
              <View style={styles.addressHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="location" size={16} color="#E11D48" />
                  <Text style={styles.sectionTitle}>Địa Điểm Thực Hiện</Text>
                </View>

                {/* Các nút tiện ích: Sổ địa chỉ & Định vị GPS */}
                <View style={styles.addressActionBtnRow}>
                  <TouchableOpacity
                    style={styles.addressBookBtn}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setIsSavedAddressModalVisible(true);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="bookmarks-outline" size={12} color="#475569" />
                    <Text style={styles.addressBookBtnText}>Sổ địa chỉ</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.detectBtn}
                    onPress={refreshLocation}
                    disabled={isLocating}
                    activeOpacity={0.75}
                  >
                    {isLocating ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <>
                        <Ionicons name="locate" size={12} color="#2563EB" />
                        <Text style={styles.detectBtnText}>GPS</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.addressInputBox}>
                <Ionicons name="pin" size={16} color="#E11D48" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.addressInput}
                  value={address}
                  onChangeText={handleAddressChange}
                  placeholder="Nhập địa chỉ làm đẹp của bạn..."
                  placeholderTextColor="#94A3B8"
                />
                {isSearchingPlaces && <ActivityIndicator size="small" color="#2563EB" />}
              </View>

              {suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {suggestions.slice(0, 4).map((sugg) => (
                    <TouchableOpacity
                      key={sugg.placeId}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectSuggestion(sugg)}
                    >
                      <Ionicons name="pin" size={14} color="#64748B" style={{ marginTop: 2, marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionMainText}>{sugg.mainText}</Text>
                        {sugg.secondaryText ? (
                          <Text style={styles.suggestionSecText} numberOfLines={1}>
                            {sugg.secondaryText}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* THÔNG TIN BÁN KÍNH DỰA THEO ĐỊA CHỈ ĐÃ CHỌN */}
              <View style={styles.radiusIndicatorRow}>
                {isOutOfRadius ? (
                  <View style={styles.outOfRadiusBadge}>
                    <Ionicons name="close-circle" size={13} color="#DC2626" />
                    <Text style={styles.outOfRadiusBadgeText}>
                      Ngoài bán kính nhận ca (Cách {formatDistance(effectiveDist)} / Thợ nhận {muaMaxRadius}km)
                    </Text>
                  </View>
                ) : (
                  <View style={styles.withinRadiusBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#059669" />
                    <Text style={styles.withinRadiusBadgeText}>
                      Trong bán kính nhận ca (Cách {formatDistance(effectiveDist)} / Thợ nhận {muaMaxRadius}km)
                    </Text>
                  </View>
                )}
              </View>

              <TextInput
                style={styles.noteInput}
                value={addressNote}
                onChangeText={setAddressNote}
                placeholder="Ghi chú thêm: Tòa nhà, số tầng, căn hộ, mang tone gì..."
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

              {/* CẢNH BÁO NGOÀI BÁN KÍNH PHỤC VỤ NẾU CÓ */}
              {isOutOfRadius && (
                <View style={styles.outOfRadiusWarningBox}>
                  <Ionicons name="warning" size={16} color="#DC2626" />
                  <Text style={styles.outOfRadiusWarningText}>
                    Điểm đón cách thợ {formatDistance(effectiveDist)}, vượt quá bán kính nhận ca tối đa ({targetMua?.maxServiceRadiusKm}km) của thợ này.
                  </Text>
                </View>
              )}

              {/* NÚT GỬI YÊU CẦU */}
              <TouchableOpacity
                style={[styles.submitBtn, (isSubmitting || isOutOfRadius) && { opacity: 0.5, backgroundColor: '#94A3B8' }]}
                onPress={handleSendDirectRequest}
                disabled={isSubmitting || isOutOfRadius}
                activeOpacity={0.88}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>
                      {isOutOfRadius ? 'Ngoài Bán Kính Phục Vụ' : 'Gửi Yêu Cầu Tới Thợ (20s)'}
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
        </DismissibleModal>
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
  styleSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 68,
  },
  styleSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  paletteIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FDA4AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  styleSelectorTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  styleSelectorMainText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  styleSelectorMainTextActive: {
    color: '#E11D48',
  },
  styleSelectorSubText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  styleSelectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  styleCountBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  styleTagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    minHeight: 36,
  },
  selectedTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  selectedTagPillAny: {
    backgroundColor: '#FFF1F2',
  },
  selectedTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9F1239',
    lineHeight: 18,
  },
  styleModalOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  styleBottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  styleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  styleModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  styleModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  stylesListScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  stylesListScrollInner: {
    paddingBottom: 20,
    gap: 10,
  },
  styleRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  styleRowCardChecked: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FDA4AF',
  },
  styleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 10,
  },
  styleIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleIconBoxChecked: {
    backgroundColor: '#FFE4E6',
  },
  styleNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  styleNameTextChecked: {
    color: '#BE123C',
    fontWeight: '700',
  },
  styleDescText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleChecked: {
    backgroundColor: '#E11D48',
    borderColor: '#E11D48',
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  addressActionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  addressBookBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  detectBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  addressInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  addressInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    padding: 0,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
    marginBottom: 6,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionMainText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  suggestionSecText: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  radiusIndicatorRow: {
    marginTop: 6,
  },
  withinRadiusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  withinRadiusBadgeText: {
    fontSize: 10.5,
    color: '#065F46',
    fontWeight: '600',
  },
  outOfRadiusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  outOfRadiusBadgeText: {
    fontSize: 10.5,
    color: '#991B1B',
    fontWeight: '600',
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
  outOfRadiusWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  outOfRadiusWarningText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
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
