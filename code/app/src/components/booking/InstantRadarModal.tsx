import { DismissibleModal } from '@/components/common/DismissibleModal';
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
import { BrandColors } from '@/constants/theme';
import { bookingService, InstantBookingCreatedRes } from '@/services/booking.service';
import { telemetryService, NearbyProviderRes } from '@/services/telemetry.service';
import { websocketService } from '@/services/websocket.service';
import { taxonomyService, MasterCategory, MakeupStyle } from '@/services/taxonomy.service';
import { mapsService, PlaceSuggestion } from '@/services/maps.service';
import { soundManager } from '@/utils/sound';
import { useLocationStore } from '@/store/location.store';
import * as Location from 'expo-location';
import { parseApiError } from '@/utils/error';
import { InstantCountdownTimer } from './InstantCountdownTimer';
import { customerAddressService, CustomerAddressItem } from '@/services/customer-address.service';
import { SavedAddressModal } from '@/components/customer/SavedAddressModal';
import { GlobalPopupOverlay } from '@/components/common/GlobalPopupModal';
import { showGlobalPopup } from '@/store/popup.store';

interface Props {
  visible: boolean;
  onClose: () => void;
  targetMua?: NearbyProviderRes | null;
}

const RADIUS_OPTIONS = [5, 10, 15, 30];

export const InstantRadarModal: React.FC<Props> = ({ visible, onClose, targetMua }) => {
  const { currentAddress, latitude: storeLat, longitude: storeLng, fetchCurrentLocation } = useLocationStore();

  const [currentTargetMua, setCurrentTargetMua] = useState<NearbyProviderRes | null>(targetMua || null);

  useEffect(() => {
    if (visible) {
      setCurrentTargetMua(targetMua || null);
    }
  }, [visible, targetMua]);

  // Dữ liệu danh mục và phong cách thật từ Database
  const [categories, setCategories] = useState<MasterCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MasterCategory | null>(null);
  const [stylesList, setStylesList] = useState<MakeupStyle[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<MakeupStyle | null>(null);
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(false);

  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [addressNote, setAddressNote] = useState('');
  const [isSavedAddressModalVisible, setIsSavedAddressModalVisible] = useState(false);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<number | undefined>(undefined);

  // Gợi ý địa điểm Goong Maps Autocomplete
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  // Danh sách thợ thật từ API Backend
  const [nearbyProviders, setNearbyProviders] = useState<NearbyProviderRes[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<NearbyProviderRes | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(10);

  const [step, setStep] = useState<'IDLE' | 'SCANNING' | 'MATCHED' | 'TIMEOUT'>('IDLE');
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [isSubmittingScan, setIsSubmittingScan] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<InstantBookingCreatedRes | null>(null);
  const [matchedMua, setMatchedMua] = useState<{
    name: string;
    phone?: string;
    avatar?: string;
  } | null>(null);
  const [matchedData, setMatchedData] = useState<any>(null);
  const [timeoutMessage, setTimeoutMessage] = useState<string | null>(null);

  const timerRef = useRef<any>(null);
  const statusPollRef = useRef<any>(null);
  const activeTopicRef = useRef<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (suggestions.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 380, animated: true });
      }, 100);
    }
  }, [suggestions]);

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
    setAddress(item.description);
    setSuggestions([]);
    try {
      const detail = await mapsService.getPlaceDetail(item.placeId);
      if (detail && detail.latitude && detail.longitude) {
        const newCoords = { latitude: detail.latitude, longitude: detail.longitude };
        setCoords(newCoords);
        fetchNearbyProviders(detail.latitude, detail.longitude, searchRadius);
      }
    } catch (e) {
      console.warn('Lỗi lấy tọa độ từ place detail:', e);
    }
  };

  // Cử chỉ vuốt xuống (swipe down) để đóng modal


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

  // Nạp danh mục và phong cách thật từ DB khi mở modal
  useEffect(() => {
    if (visible) {
      loadTaxonomy();
    }
  }, [visible]);

  const loadTaxonomy = async () => {
    try {
      setIsLoadingTaxonomy(true);
      const cats = await taxonomyService.getActiveCategories();
      setCategories(cats || []);
      const firstCat = cats && cats.length > 0 ? cats[0] : null;
      if (firstCat) {
        setSelectedCategory((prev) => prev || firstCat);
        const styles = await taxonomyService.getActiveStyles();
        setStylesList(styles || []);
        setSelectedStyle(null);
      }
    } catch (e) {
      console.warn('Lỗi tải danh mục / phong cách:', e);
    } finally {
      setIsLoadingTaxonomy(false);
    }
  };

  // Reload styles + re-fetch thợ khi đổi category
  const handleSelectCategory = async (cat: typeof categories[0]) => {
    setSelectedCategory(cat);
    setSelectedStyle(null);
    Haptics.selectionAsync();
    // Tải lại styles cho category mới
    try {
      const styles = await taxonomyService.getActiveStyles();
      setStylesList(styles || []);
    } catch {
      // giữ styles cũ nếu lỗi
    }
    // Re-fetch thợ theo category mới
    if (coords) {
      fetchNearbyProviders(coords.latitude, coords.longitude, searchRadius, cat.id);
    }
  };

  // Tải tọa độ GPS hoặc ưu tiên địa chỉ mặc định đã lưu của khách hàng
  useEffect(() => {
    if (visible) {
      loadInitialAddressAndProviders();
    } else {
      clearAllTimers();
      setStep('IDLE');
      setSelectedProvider(null);
    }
  }, [visible]);

  const loadInitialAddressAndProviders = async () => {
    try {
      // 1. Thử lấy địa chỉ mặc định từ Sổ địa chỉ khách hàng
      const savedAddresses = await customerAddressService.getSavedAddresses();
      if (Array.isArray(savedAddresses) && savedAddresses.length > 0) {
        const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
        if (defaultAddr && defaultAddr.latitude && defaultAddr.longitude) {
          setAddress(defaultAddr.addressLine);
          const cur = { latitude: defaultAddr.latitude, longitude: defaultAddr.longitude };
          setCoords(cur);
          fetchNearbyProviders(cur.latitude, cur.longitude, searchRadius, selectedCategory?.id);
          return;
        }
      }
    } catch {
      // Bỏ qua lỗi, tiếp tục fallback GPS
    }

    // 2. Fallback sang GPS thiết bị
    if (currentAddress && currentAddress !== 'Đang xác định vị trí...' && currentAddress !== 'Chưa cấp quyền vị trí') {
      setAddress(currentAddress);
    }

    if (storeLat && storeLng) {
      const cur = { latitude: storeLat, longitude: storeLng };
      setCoords(cur);
      fetchNearbyProviders(cur.latitude, cur.longitude, searchRadius, selectedCategory?.id);
    } else {
      refreshLocation();
    }
  };

  const refreshLocation = async () => {
    try {
      setIsLocating(true);
      const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
      if (!servicesEnabled) {
        Alert.alert('GPS Chưa Bật', 'Vui lòng bật dịch vụ định vị GPS trong cài đặt thiết bị để tìm thợ gần bạn.');
        return;
      }

      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }

      if (status === 'granted') {
        let loc = null;
        try {
          loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        } catch {
          loc = await Location.getLastKnownPositionAsync();
        }

        if (loc?.coords) {
          const cur = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setCoords(cur);
          // Cập nhật ngay địa chỉ văn bản từ GPS thực tế
          const geoRes = await mapsService.reverseGeocode(cur.latitude, cur.longitude);
          if (geoRes?.formattedAddress) {
            setAddress(geoRes.formattedAddress);
          }
          await fetchNearbyProviders(cur.latitude, cur.longitude, searchRadius);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert('Quyền Vị Trí', 'Vui lòng cấp quyền truy cập vị trí để tự động định vị.');
      }
    } catch (e) {
      console.warn('Không thể định vị GPS khách hàng:', e);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectRadius = (r: number) => {
    setSearchRadius(r);
    if (coords) {
      fetchNearbyProviders(coords.latitude, coords.longitude, r, selectedCategory?.id);
    }
  };

  const fetchNearbyProviders = async (
    lat: number,
    lng: number,
    radius: number = searchRadius,
    categoryId?: number
  ) => {
    try {
      setIsLoadingProviders(true);
      const list = await telemetryService.getNearbyProviders({
        latitude: lat,
        longitude: lng,
        radiusKm: radius,
        providerType: 'FREELANCE_MUA',
        masterCategoryId: categoryId,
      });
      const freelanceOnly = (list || []).filter(
        (p) =>
          (!p.providerType || p.providerType === 'FREELANCE_MUA') &&
          (p.distanceKm == null || p.maxServiceRadiusKm == null || p.distanceKm <= p.maxServiceRadiusKm)
      );
      setNearbyProviders(freelanceOnly);
    } catch (err) {
      console.warn('Lỗi gọi API thợ quanh đây:', err);
      setNearbyProviders([]);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const formatVnd = (amount: number) => (amount || 0).toLocaleString('vi-VN') + ' đ';

  useEffect(() => {
    if (step === 'SCANNING') {
      const totalSec = createdBooking?.searchTimeoutSeconds || 45;
      const endTime = Date.now() + totalSec * 1000;
      setSecondsLeft(totalSec);

      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setSecondsLeft(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          handleTimeout();
        }
      }, 1000);
      timerRef.current = interval;

      return () => {
        clearInterval(interval);
      };
    }
  }, [step, createdBooking?.searchTimeoutSeconds]);

  const handleStartScan = async () => {
    if (isSubmittingScan) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeoutMessage(null);

    // Kiểm tra nếu danh sách thợ rỗng trước khi gửi đơn
    if (nearbyProviders.length === 0) {
      showGlobalPopup(
        'Chưa Có Thợ Trực Tuyến',
        `Hiện tại chưa có chuyên viên make-up nào đang online trong bán kính ${searchRadius}km quanh bạn. Bạn vui lòng mở rộng bán kính quét hoặc đặt lịch hẹn trước nhé!`,
        [
          {
            text: searchRadius < 30 ? `Mở rộng ${searchRadius < 15 ? 15 : 30}km` : 'Quét Lại',
            onPress: () => {
              const newRadius = searchRadius < 15 ? 15 : searchRadius < 30 ? 30 : 10;
              handleSelectRadius(newRadius);
            },
            style: 'default',
          },
          {
            text: 'Đặt Lịch Trước',
            onPress: () => {
              onClose();
              router.push('/explore');
            },
            style: 'default',
          },
          { text: 'Đóng', style: 'cancel' },
        ],
        { autoCloseSeconds: 5 }
      );
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Chưa Chọn Dịch Vụ', 'Vui lòng chọn danh mục make-up bạn cần tìm.');
      return;
    }

    try {
      setIsSubmittingScan(true);
      let targetLat = coords?.latitude || storeLat;
      let targetLng = coords?.longitude || storeLng;

      // Geocode địa chỉ nhập tay nếu chưa có tọa độ chuẩn
      if (address?.trim() && (!coords || address !== currentAddress)) {
        try {
          const geo = await mapsService.geocode(address.trim());
          if (geo && geo.latitude && geo.longitude) {
            targetLat = geo.latitude;
            targetLng = geo.longitude;
            setCoords({ latitude: targetLat, longitude: targetLng });
          }
        } catch (e) {
          console.warn('Lỗi geocode địa chỉ đích:', e);
        }
      }

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

      if (currentTargetMua) {
        const muaMaxRadius = currentTargetMua.maxServiceRadiusKm || 15;
        if (currentTargetMua.distanceKm && currentTargetMua.distanceKm > muaMaxRadius) {
          Alert.alert(
            'Ngoài Bán Kính Phục Vụ',
            `Vị trí của bạn cách chuyên viên ${currentTargetMua.fullName} ${currentTargetMua.distanceKm} km, vượt quá bán kính nhận ca tối đa (${muaMaxRadius} km) của chuyên viên này.`
          );
          return;
        }
      }

      const sendAddress = address?.trim() || currentAddress || 'Vị trí hiện tại của bạn';

      const res = await bookingService.createInstantBooking({
        masterCategoryId: selectedCategory.id,
        targetMuaId: currentTargetMua?.providerId,
        styleId: selectedStyle?.id,
        radiusKm: currentTargetMua?.maxServiceRadiusKm || searchRadius,
        destinationAddress: sendAddress,
        destinationLatitude: targetLat,
        destinationLongitude: targetLng,
        note: addressNote?.trim(),
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
          setMatchedData(msg);
          setMatchedMua({
            name: msg.muaName || 'Chuyên viên Make-up',
            phone: msg.muaPhone,
            avatar: msg.muaAvatar,
          });
          handleMatched(res.bookingId);
        } else if (msg?.status === 'CANCELLED' || msg?.status === 'EXPIRED' || msg?.type === 'BOOKING_TIMEOUT') {
          clearAllTimers();
          if (msg?.message) {
            setTimeoutMessage(msg.message);
          }
          handleTimeout(msg?.message);
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
            if (statusRes.cancellationReason) {
              setTimeoutMessage(statusRes.cancellationReason);
            }
            handleTimeout(statusRes.cancellationReason);
          }
        } catch {
          // Bỏ qua lỗi kết nối mạng tạm thời
        }
      }, 2000);
    } catch (err: any) {
      const parsed = parseApiError(err);
      if (
        parsed.errorCode === 'ERR_BOOKING_ALREADY_EXISTS' ||
        parsed.message.includes('customer_has_active_instant_booking') ||
        parsed.message.includes('chưa hoàn thành') ||
        parsed.message.includes('đang được phục vụ')
      ) {
        Alert.alert(
          'Đang Có Đơn Đang Thực Hiện',
          'Bạn đang có một ca đặt thợ khẩn cấp đang được chuyên viên phục vụ. Bạn có muốn chuyển sang màn hình theo dõi vị trí không?',
          [
            { text: 'Đóng', style: 'cancel' },
            {
              text: 'Theo Dõi Đơn',
              onPress: async () => {
                onClose();
                try {
                  const myBookings = await bookingService.getMyBookings('UPCOMING');
                  const active = myBookings.find(
                    (b) =>
                      b.status === 'ACCEPTED' ||
                      b.status === 'ON_THE_WAY' ||
                      b.status === 'ARRIVED' ||
                      b.status === 'IN_PROGRESS'
                  );
                  if (active) {
                    if (active.status === 'ACCEPTED' && !active.isDepositPaid) {
                      router.push(`/booking/instant-matched/${active.id}` as any);
                    } else {
                      router.push(`/booking/tracking/${active.id}` as any);
                    }
                  } else {
                    router.push('/bookings' as any);
                  }
                } catch {
                  router.push('/bookings' as any);
                }
              },
            },
          ]
        );
      } else {
        showGlobalPopup(
          'Không Thể Tìm Thợ',
          parsed.message || 'Hiện tại không có chuyên viên trang điểm nào khả dụng trong khu vực của bạn.',
          [
            {
              text: searchRadius < 30 ? `Mở rộng ${searchRadius < 15 ? 15 : 30}km` : 'Thử Lại',
              onPress: () => {
                const newRadius = searchRadius < 15 ? 15 : searchRadius < 30 ? 30 : 10;
                handleSelectRadius(newRadius);
              },
              style: 'default',
            },
            {
              text: 'Đặt Lịch Trước',
              onPress: () => {
                onClose();
                router.push('/explore');
              },
              style: 'default',
            },
            { text: 'Đóng', style: 'cancel' },
          ],
          { autoCloseSeconds: 5 }
        );
      }
      setStep('IDLE');
    } finally {
      setIsSubmittingScan(false);
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

  const handleTimeout = (customMsg?: string) => {
    clearAllTimers();
    soundManager.playTimeoutSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setStep('TIMEOUT');

    const msg =
      customMsg ||
      timeoutMessage ||
      (currentTargetMua
        ? `Chuyên viên ${currentTargetMua.fullName} hiện không phản hồi yêu cầu nhận ca.`
        : `Thời gian tìm kiếm đã kết thúc nhưng chưa có chuyên viên nào trong bán kính ${searchRadius}km nhận ca lúc này.`);

    showGlobalPopup(
      currentTargetMua ? 'Thợ Không Phản Hồi' : 'Không Tìm Thấy Chuyên Viên',
      msg,
      [
        {
          text: currentTargetMua ? 'Quét Thợ Gần Đây' : `Quét Lại (${searchRadius}km)`,
          onPress: () => {
            if (currentTargetMua) {
              setCurrentTargetMua(null);
              setStep('IDLE');
            } else {
              handleStartScan();
            }
          },
          style: 'default',
        },
        {
          text: 'Đặt Lịch Trước',
          onPress: () => {
            onClose();
            router.push('/explore');
          },
          style: 'default',
        },
        { text: 'Đóng', style: 'cancel' },
      ],
      { autoCloseSeconds: 5 }
    );
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
      router.push(`/booking/deposit/${createdBooking.bookingId}` as any);
    } else {
      router.push('/bookings');
    }
  };

  return (
    <DismissibleModal visible={visible} onClose={handleCancel} overlayStyle={styles.overlay} contentStyle={styles.modalCard} overlays={<><SavedAddressModal
        visible={isSavedAddressModalVisible}
        selectedAddressId={selectedSavedAddressId}
        onClose={() => setIsSavedAddressModalVisible(false)}
        onSelectAddress={(selected) => {
          setSelectedSavedAddressId(selected.id);
          setAddress(selected.addressLine);
          const newCoords = { latitude: selected.latitude, longitude: selected.longitude };
          setCoords(newCoords);
          fetchNearbyProviders(selected.latitude, selected.longitude, searchRadius);
          setIsSavedAddressModalVisible(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
<GlobalPopupOverlay /></>}>
            {/* VÙNG KÉO VUỐT XUỐNG ĐÓNG & HEADER */}
            <View style={styles.dragArea}>

              <View style={styles.modalHeader}>
                <View style={styles.titleRow}>
                  <View style={styles.radarIconBox}>
                    <Ionicons name="radio" size={18} color={BrandColors.primary} />
                  </View>
                  <Text style={styles.modalTitle}>Tìm Thợ Khẩn Cấp (30-45p)</Text>
                </View>

              </View>
            </View>

          {/* BADGE THỐNG KÊ THỢ THẬT TỪ REDIS GEO & BỘ CHỌN BÁN KÍNH */}
          <View style={styles.statusBarRow}>
            {isLoadingProviders ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <View style={styles.onlineBadge}>
                <View style={styles.greenPulseDot} />
                <Text style={styles.onlineBadgeText}>
                  {nearbyProviders.length > 0
                    ? `Có ${nearbyProviders.length} chuyên viên đang trực tuyến quanh bạn (${searchRadius}km)`
                    : `Hiện chưa có chuyên viên online trong ${searchRadius}km`}
                </Text>
              </View>
            )}

            <View style={styles.radiusChipContainer}>
              <Text style={styles.radiusLabel}>Bán kính:</Text>
              <View style={styles.radiusChipsRow}>
                {RADIUS_OPTIONS.map((r) => {
                  const isSelected = r === searchRadius;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.radiusChip, isSelected && styles.radiusChipSelected]}
                      onPress={() => handleSelectRadius(r)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.radiusChipText, isSelected && styles.radiusChipTextSelected]}>
                        {r} km
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* GỢI Ý MỞ RỘNG BÁN KÍNH KHI 0 THỢ */}
            {nearbyProviders.length === 0 && !isLoadingProviders && (
              <View style={[styles.expansionBanner, { marginBottom: 8 }]}>
                <Ionicons name="alert-circle" size={18} color="#D97706" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.expansionTitle}>
                    Chưa có chuyên viên{selectedCategory ? ` dịch vụ ${selectedCategory.categoryName}` : ''} trong {searchRadius}km
                  </Text>
                  <Text style={styles.expansionDesc}>
                    Hãy thử mở rộng bán kính quét hoặc chọn danh mục dịch vụ khác để kết nối với nhiều chuyên viên hơn!
                  </Text>
                  <View style={styles.expansionBtnRow}>
                    {searchRadius < 15 && (
                      <TouchableOpacity style={styles.expansionBtn} onPress={() => handleSelectRadius(15)}>
                        <Text style={styles.expansionBtnText}>Mở rộng 15 km</Text>
                      </TouchableOpacity>
                    )}
                    {searchRadius < 30 && (
                      <TouchableOpacity style={styles.expansionBtn} onPress={() => handleSelectRadius(30)}>
                        <Text style={styles.expansionBtnText}>Mở rộng 30 km</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* STEP 1: FORM CẤU HÌNH DANH MỤC & PHONG CÁCH (ẨN GIÁ) */}
          {step === 'IDLE' && (
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 180 }}
            >
              {/* BANNER ĐẶT ĐÍCH DANH THỢ NẾU CHỌN TỪ DANH SÁCH ONLINE */}
              {currentTargetMua && (
                <View style={styles.targetedMuaCard}>
                  <View style={styles.targetedAvatarWrapper}>
                    {currentTargetMua.avatarUrl ? (
                      <Image source={{ uri: currentTargetMua.avatarUrl }} style={styles.targetedAvatar} />
                    ) : (
                      <View style={styles.targetedAvatarPlaceholder}>
                        <Text style={styles.targetedAvatarInitial}>
                          {currentTargetMua.fullName?.charAt(0).toUpperCase() || 'M'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.targetedGreenDot} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.targetedTag}>ƯU TIÊN ĐẶT THỢ</Text>
                      <Ionicons name="flash" size={11} color="#BE185D" />
                    </View>
                    <Text style={styles.targetedName} numberOfLines={1}>{currentTargetMua.fullName}</Text>
                    <Text style={styles.targetedMeta}>
                      ⭐ {currentTargetMua.ratingAvg ? Number(currentTargetMua.ratingAvg).toFixed(1) : '5.0'} • Cự ly: {currentTargetMua.distanceKm != null ? `${currentTargetMua.distanceKm} km` : 'Gần bạn'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.targetedCloseBtn}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCurrentTargetMua(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              )}

              {/* 1. CHỌN DANH MỤC DỊCH VỤ THẬT TỪ DATABASE */}
              <Text style={styles.sectionHeading}>1. Gói Dịch Vụ Cần Gấp:</Text>
              {isLoadingTaxonomy ? (
                <ActivityIndicator size="small" color={BrandColors.primary} style={{ marginVertical: 14 }} />
              ) : (
                <View style={styles.packageList}>
                  {categories.map((cat) => {
                    const isSelected = cat.id === selectedCategory?.id;
                    const iconName = cat.categoryCode?.includes('BRIDE')
                      ? 'heart'
                      : cat.categoryCode?.includes('DAILY')
                      ? 'sunny'
                      : 'sparkles';
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.pkgCard, isSelected && styles.pkgCardSelected]}
                        onPress={() => handleSelectCategory(cat)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.pkgIconBox, isSelected && styles.pkgIconBoxSelected]}>
                          <Ionicons
                            name={iconName as any}
                            size={18}
                            color={isSelected ? '#FFFFFF' : '#64748B'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.pkgTitle, isSelected && styles.pkgTitleSelected]}>
                            {cat.categoryName}
                          </Text>
                          {cat.description ? (
                            <Text style={styles.pkgSub} numberOfLines={2}>
                              {cat.description}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* 2. CHỌN PHONG CÁCH MAKE-UP THẬT TỪ DATABASE */}
              <View style={styles.styleSectionHeader}>
                <Text style={styles.sectionHeading}>2. Phong Cách Trang Điểm:</Text>
                <Text style={styles.styleOptionalBadge}>Tuỳ chọn</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stylePillScrollContent}
                style={styles.stylePillScroll}
              >
                {/* Chip "Tất cả / Bất kỳ" */}
                <TouchableOpacity
                  style={[styles.stylePill, selectedStyle === null && styles.stylePillSelected]}
                  onPress={() => setSelectedStyle(null)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.stylePillText, selectedStyle === null && styles.stylePillTextSelected]}>
                    🎨 Bất kỳ
                  </Text>
                </TouchableOpacity>
                {stylesList.map((st) => {
                  const isSelected = st.id === selectedStyle?.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[styles.stylePill, isSelected && styles.stylePillSelected]}
                      onPress={() => setSelectedStyle(isSelected ? null : st)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.stylePillText, isSelected && styles.stylePillTextSelected]}>
                        {st.styleName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* 3. ĐỊA CHỈ TIẾP ĐÓN */}
              <View style={styles.addressHeaderRow}>
                <Text style={styles.sectionHeading}>3. Địa Chỉ Trang Điểm Tận Nơi:</Text>
                <View style={styles.addressActionBtnRow}>
                  {/* Nút 1: Mở Sổ Địa Chỉ Đã Lưu */}
                  <TouchableOpacity
                    style={styles.addressBookBtn}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setIsSavedAddressModalVisible(true);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="bookmarks" size={13} color="#7C3AED" />
                    <Text style={styles.addressBookBtnText}>Sổ địa chỉ</Text>
                  </TouchableOpacity>

                  {/* Nút 2: Lấy GPS vị trí hiện tại */}
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
                        <Ionicons name="locate" size={13} color="#2563EB" />
                        <Text style={styles.detectBtnText}>GPS</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.addressInputBox}>
                <Ionicons name="location" size={18} color="#E11D48" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.addressInput}
                  value={address}
                  onChangeText={handleAddressChange}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 340, animated: true });
                    }, 150);
                  }}
                  placeholder="Nhập địa chỉ nhà của bạn..."
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

              <TextInput
                style={styles.noteInput}
                value={addressNote}
                onChangeText={setAddressNote}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
                placeholder="Ghi chú thêm: Tòa nhà, số tầng, căn hộ, mang tone gì..."
                placeholderTextColor="#94A3B8"
              />

              {/* NÚT KÍCH HOẠT QUÉT THỢ */}
              <TouchableOpacity
                style={[styles.startScanBtn, isSubmittingScan && { opacity: 0.6 }]}
                onPress={handleStartScan}
                disabled={isSubmittingScan}
                activeOpacity={0.88}
              >
                {isSubmittingScan ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name={currentTargetMua ? "flash" : "radio-outline"} size={18} color="#FFFFFF" />
                    <Text style={styles.startScanBtnText}>
                      {currentTargetMua ? `Gửi Cuốc Hẹn Tới ${currentTargetMua.fullName}` : 'Bắt Đầu Quét Tìm Thợ Gần Nhất'}
                    </Text>
                  </>
                )}
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
                <Text style={styles.scanningStatusBadgeText}>
                  {currentTargetMua ? `Đang Phát Tín Hiệu Ưu Tiên Tới ${currentTargetMua.fullName}...` : 'Đang Phát Tín Hiệu Thác Nước Tới Thợ...'}
                </Text>
              </View>

              <Text style={styles.scanningTitle}>
                {currentTargetMua ? `Đang Kết Nối Với ${currentTargetMua.fullName}` : 'Đang Kết Nối Chuyên Viên Gần Bạn'}
              </Text>
              <Text style={styles.scanningDesc}>
                {currentTargetMua
                  ? `Cuốc hẹn khẩn cấp đã được gửi ưu tiên trực tiếp tới ${currentTargetMua.fullName}. Thợ có 30s để bấm nhận ca.`
                  : `Hệ thống đang quét các chuyên viên trong bán kính ${searchRadius}km. Thợ gần bạn nhất đang nhận được thông báo chuông và có 20s để bấm nhận ca.`}
              </Text>

              {/* CARD TÓM TẮT ĐƠN HÀNG */}
              <View style={styles.scanSummaryCard}>
                <View style={styles.scanSummaryRow}>
                  <Ionicons name="sparkles" size={14} color={BrandColors.primary} />
                  <Text style={styles.scanSummaryLabel}>Dịch vụ:</Text>
                  <Text style={styles.scanSummaryVal}>{selectedCategory?.categoryName || 'Trang điểm'}</Text>
                </View>
                {selectedStyle && (
                  <View style={styles.scanSummaryRow}>
                    <Ionicons name="color-palette-outline" size={14} color="#64748B" />
                    <Text style={styles.scanSummaryLabel}>Phong cách:</Text>
                    <Text style={styles.scanSummaryVal}>{selectedStyle.styleName}</Text>
                  </View>
                )}
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

          {/* STEP 3: ĐÃ TÌM THẤY THỢ MUA NHẬN CA - HIỆN GIÁ THỰC TẾ & ĐẶT CỌC */}
          {step === 'MATCHED' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
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

                {/* THẺ HÓA ĐƠN THỰC TẾ CỦA THỢ */}
                <View style={styles.realInvoiceCard}>
                  <View style={styles.realInvoiceHeader}>
                    <Ionicons name="receipt-outline" size={18} color="#0F172A" />
                    <Text style={styles.realInvoiceTitle}>Chi Tiết Hóa Đơn & Đặt Cọc</Text>
                  </View>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Gói dịch vụ:</Text>
                    <Text style={styles.breakdownValueBold}>
                      {matchedData?.serviceName || selectedCategory?.categoryName || 'Trang điểm'}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Giá niêm yết của thợ:</Text>
                    <Text style={styles.breakdownValue}>
                      {formatVnd(matchedData?.basePrice || 500000)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Phụ phí ca khẩn cấp (30-45p):</Text>
                    <Text style={styles.breakdownValue}>
                      + {formatVnd(matchedData?.emergencySurchargeFee || 150000)}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.breakdownRow}>
                    <Text style={styles.totalLabel}>Tổng Hóa Đơn:</Text>
                    <Text style={styles.totalValue}>
                      {formatVnd(matchedData?.totalAmount || 650000)}
                    </Text>
                  </View>
                  <View style={styles.depositRow}>
                    <Ionicons name="shield-checkmark" size={14} color="#059669" />
                    <Text style={styles.depositText}>
                      Cọc giữ chân thợ (30% Escrow):{' '}
                      <Text style={{ fontWeight: '800', color: '#059669' }}>
                        {formatVnd(matchedData?.depositAmount || 195000)}
                      </Text>
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.viewTripBtn}
                  onPress={handleGoToTracking}
                  activeOpacity={0.88}
                >
                  <Ionicons name="card-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.viewTripBtnText}>Tiến Hành Đặt Cọc (30% Escrow)</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* STEP 4: TIMEOUT HẾT GIỜ / THỢ KHÔNG PHẢN HỒI */}
          {step === 'TIMEOUT' && (
            <View style={styles.timeoutBox}>
              <Ionicons name="time-outline" size={48} color="#F59E0B" />
              <Text style={styles.timeoutTitle}>
                {currentTargetMua ? 'Thợ Không Phản Hồi' : 'Chưa Tìm Thấy Thợ Nhận Ca'}
              </Text>
              <Text style={styles.timeoutSubtitle}>
                {timeoutMessage
                  ? timeoutMessage
                  : currentTargetMua
                  ? `Chuyên viên ${currentTargetMua.fullName} hiện không phản hồi yêu cầu. Bạn có muốn chuyển sang chế độ quét tìm thợ gần nhất quanh đây không?`
                  : 'Hiện các chuyên viên gần bạn đều đang bận thực hiện ca. Bạn có muốn thử quét lại hoặc đặt lịch hẹn trước?'}
              </Text>

              <View style={styles.timeoutBtnRow}>
                {currentTargetMua ? (
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => {
                      setCurrentTargetMua(null);
                      setStep('IDLE');
                    }}
                    activeOpacity={0.88}
                  >
                    <Ionicons name="radio-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.retryBtnText}>Quét Tìm Thợ Quanh Đây</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={handleStartScan}
                    activeOpacity={0.88}
                  >
                    <Ionicons name="refresh" size={16} color="#FFFFFF" />
                    <Text style={styles.retryBtnText}>Quét Lại ({searchRadius}km)</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.scheduleBtn}
                  onPress={() => {
                    onClose();
                    router.replace('/explore');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.scheduleBtnText}>Đặt Lịch Hẹn</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
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
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    maxHeight: '88%',
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
    marginBottom: 8,
  },
  scrollArea: {
    flexGrow: 0,
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
  radiusChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  radiusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  radiusChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  radiusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  radiusChipSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: BrandColors.primary,
  },
  radiusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  radiusChipTextSelected: {
    color: BrandColors.primary,
    fontWeight: '700',
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
  expansionBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  expansionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  expansionDesc: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  expansionBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  expansionBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expansionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  stylePillScroll: {
    marginBottom: 10,
  },
  stylePillScrollContent: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 16,
  },
  styleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 8,
  },
  styleOptionalBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stylePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stylePillSelected: {
    backgroundColor: '#FFE4E6',
    borderColor: BrandColors.primary,
  },
  stylePillText: {
    fontSize: 12,
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
  addressActionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addressBookBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
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
  breakdownValueBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  realInvoiceCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  realInvoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  realInvoiceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
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
    paddingTop: 20,
    paddingBottom: 36,
    paddingHorizontal: 8,
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
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: -4,
    marginBottom: 10,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionMainText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  suggestionSecText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  targetedMuaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1.5,
    borderColor: '#FDA4AF',
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
  },
  targetedAvatarWrapper: {
    position: 'relative',
  },
  targetedAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
  },
  targetedAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetedAvatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  targetedGreenDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  targetedTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#BE185D',
    letterSpacing: 0.5,
  },
  targetedName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  targetedMeta: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  targetedCloseBtn: {
    padding: 4,
    marginLeft: 4,
  },
});
