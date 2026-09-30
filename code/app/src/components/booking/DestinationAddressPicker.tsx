import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { DistanceMatrixRes } from '@/services/pricing.service';
import { mapsService, PlaceSuggestion } from '@/services/maps.service';
import { bookingService, RecentAddressItem } from '@/services/booking.service';
import { useLocationStore } from '@/store/location.store';
import { LocationMapPickerModal } from './LocationMapPickerModal';

const GOONG_KEY = 'NDdGHjR87yAkm1ana5TUw0bH2FtJ4dC61cueMuPc';

interface Props {
  address: string;
  latitude: number;
  longitude: number;
  distanceInfo: DistanceMatrixRes | null;
  error?: string;
  onChangeAddress: (address: string, lat: number, lng: number) => void;
}

export const DestinationAddressPicker: React.FC<Props> = ({
  address,
  latitude,
  longitude,
  distanceInfo,
  error,
  onChangeAddress,
}) => {
  const { latitude: userLat, longitude: userLng } = useLocationStore();
  const [inputText, setInputText] = useState(address);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);

  // Trạng thái Dropdown gợi ý
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [recentAddresses, setRecentAddresses] = useState<RecentAddressItem[]>([]);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [geoWarning, setGeoWarning] = useState<string | null>(null);

  const debounceTimerRef = useRef<any>(null);

  // Đồng bộ inputText khi props.address thay đổi từ bên ngoài
  useEffect(() => {
    setInputText(address);
    if (address) {
      setGeoWarning(null);
    }
  }, [address]);

  // Tải danh sách địa chỉ đã đặt gần đây từ backend
  useEffect(() => {
    let isMounted = true;
    bookingService.getRecentAddresses()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setRecentAddresses(data);
        }
      })
      .catch(() => {
        // Bỏ qua lỗi
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Lấy vị trí GPS hiện tại của thiết bị
  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    setGeoWarning(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền Vị Trí',
          'Vui lòng cấp quyền truy cập vị trí trong cài đặt thiết bị để tự động điền địa chỉ đón thợ.'
        );
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude: lat, longitude: lng } = location.coords;

      // Gọi Goong Maps Reverse Geocoding qua Backend
      const geoResult = await mapsService.reverseGeocode(lat, lng);

      setInputText(geoResult.formattedAddress);
      onChangeAddress(geoResult.formattedAddress, lat, lng);
      setIsDropdownVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Định Vị Thất Bại', err.message || 'Không thể lấy tọa độ hiện tại.');
    } finally {
      setIsLocating(false);
    }
  };

  // Tìm kiếm gợi ý khi người dùng gõ text (debounce 400ms)
  const handleTextChange = (text: string) => {
    setInputText(text);
    setGeoWarning(null);
    setIsDropdownVisible(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const results = await mapsService.getPlaceSuggestions(text.trim(), userLat, userLng);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 400);
  };

  // Quét tìm định vị khi khách bấm Xong hoặc rời tay khỏi ô nhập
  const handleFinishEditing = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setIsDropdownVisible(false);
      return;
    }

    // Nếu văn bản khác với địa chỉ hiện tại đã lưu
    if (trimmed !== address || !latitude || !longitude) {
      setIsGeocoding(true);
      setGeoWarning(null);
      try {
        const geo = await mapsService.geocode(trimmed);
        if (geo && geo.latitude && geo.longitude) {
          onChangeAddress(geo.formattedAddress || trimmed, geo.latitude, geo.longitude);
          setGeoWarning(null);
        } else {
          setGeoWarning('Không tìm thấy tọa độ cho địa chỉ này. Hãy chạm vào [🗺️ Ghim bản đồ] để chọn vị trí chính xác.');
        }
      } catch {
        setGeoWarning('Không thể phân giải vị trí. Hãy dùng tính năng Ghim trên bản đồ.');
      } finally {
        setIsGeocoding(false);
      }
    }

    // Tắt dropdown sau 200ms để tránh chặn sự kiện click item
    setTimeout(() => {
      setIsDropdownVisible(false);
    }, 200);
  };

  // Chọn từ Sổ địa chỉ thân quen
  const handleSelectRecentAddress = (item: RecentAddressItem) => {
    Haptics.selectionAsync();
    setInputText(item.address);
    setGeoWarning(null);
    setIsDropdownVisible(false);
    onChangeAddress(item.address, item.latitude, item.longitude);
  };

  // Chọn từ Gợi ý địa điểm Goong Maps (Ưu tiên lấy tọa độ chính xác 100% qua Place Detail bằng placeId)
  const handleSelectSuggestion = async (item: PlaceSuggestion) => {
    Haptics.selectionAsync();
    setInputText(item.description);
    setIsDropdownVisible(false);
    setIsGeocoding(true);
    setGeoWarning(null);

    try {
      // 1. Ưu tiên lấy tọa độ chính xác tuyệt đối từ Place Detail
      const detail = await mapsService.getPlaceDetail(item.placeId);
      if (detail && detail.latitude && detail.longitude) {
        const finalAddress = detail.formattedAddress || item.description;
        setInputText(finalAddress);
        onChangeAddress(finalAddress, detail.latitude, detail.longitude);
        setGeoWarning(null);
        return;
      }

      // 2. Fallback sang Geocode nếu Place Detail không khả dụng
      const geo = await mapsService.geocode(item.description);
      if (geo && geo.latitude && geo.longitude) {
        const finalAddress = geo.formattedAddress || item.description;
        setInputText(finalAddress);
        onChangeAddress(finalAddress, geo.latitude, geo.longitude);
        setGeoWarning(null);
      } else {
        setGeoWarning('Không xác định được tọa độ điểm này. Hãy ghim trực tiếp trên bản đồ.');
      }
    } catch {
      setGeoWarning('Lỗi khi định vị địa điểm đã chọn.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const [isMapImageLoading, setIsMapImageLoading] = useState(false);
  const [mapImageError, setMapImageError] = useState(false);

  const hasValidCoordinates = latitude > 0 && longitude > 0;
  const goongMapUrl = hasValidCoordinates
    ? `https://rsapi.goong.io/staticmap/route?origin=${latitude},${longitude}&destination=${latitude},${longitude}&width=600&height=260&zoom=15&api_key=${GOONG_KEY}`
    : null;
  const fallbackMapUrl = hasValidCoordinates
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=600x260&markers=${latitude},${longitude},red-pushpin`
    : null;
  const miniMapUrl = mapImageError ? fallbackMapUrl : goongMapUrl;

  return (
    <View style={styles.container}>
      {/* 1. SECTION HEADER */}
      <View style={styles.sectionHeader}>
        <Ionicons name="location-outline" size={18} color={BrandColors.primary} />
        <Text style={styles.sectionTitle}>Địa Điểm Trang Điểm Tận Nơi</Text>
      </View>

      {/* 2. CHÚ THÍCH & 2 NÚT THAO TÁC ĐỊNH VỊ */}
      <View style={styles.actionButtonGroup}>
        {/* Nút 1: Lấy vị trí GPS hiện tại */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.gpsActionBtn]}
          onPress={handleGetCurrentLocation}
          disabled={isLocating}
          activeOpacity={0.7}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="navigate" size={16} color="#FFFFFF" />
          )}
          <View style={styles.actionBtnTextCol}>
            <Text style={styles.actionBtnTitle}>Vị Trí Hiện Tại</Text>
            <Text style={styles.actionBtnSub}>Định vị GPS tự động</Text>
          </View>
        </TouchableOpacity>

        {/* Nút 2: Mở bản đồ ghim vị trí */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.mapActionBtn]}
          onPress={() => {
            Haptics.selectionAsync();
            setIsMapModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="map" size={16} color="#FFFFFF" />
          <View style={styles.actionBtnTextCol}>
            <Text style={styles.actionBtnTitle}>Ghim Bản Đồ</Text>
            <Text style={styles.actionBtnSub}>Kéo thả chọn vị trí</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 3. Ô NHẬP ĐỊA CHỈ BẰNG TAY */}
      <View style={styles.inputContainer}>
        <View style={[styles.inputWrapper, (!!error || !!geoWarning) && styles.inputError]}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Nhập số nhà, tên đường, tòa nhà hoặc khu vực..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={handleTextChange}
            onFocus={() => setIsDropdownVisible(true)}
            onBlur={handleFinishEditing}
            onSubmitEditing={handleFinishEditing}
            returnKeyType="done"
            multiline={false}
          />
          {isGeocoding && (
            <ActivityIndicator size="small" color={BrandColors.primary} style={{ marginRight: 8 }} />
          )}
          {!!inputText && (
            <TouchableOpacity
              onPress={() => {
                setInputText('');
                setSuggestions([]);
                setGeoWarning(null);
                onChangeAddress('', 0, 0);
              }}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* 4. DROPDOWN GỢI Ý ĐỊA CHỈ (ĐỊA CHỈ ĐÃ ĐẶT & GOONG AUTOCOMPLETE) */}
        {isDropdownVisible && (recentAddresses.length > 0 || suggestions.length > 0 || isSearchingSuggestions) && (
          <View style={styles.dropdownCard}>
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={styles.dropdownScroll}
            >
              {/* Phân nhóm 1: Địa chỉ thân quen */}
              {recentAddresses.length > 0 && (
                <View style={styles.dropdownSection}>
                  <View style={styles.dropdownSectionHeader}>
                    <Ionicons name="time-outline" size={13} color={BrandColors.primary} />
                    <Text style={styles.dropdownSectionTitle}>ĐỊA CHỈ ĐÃ ĐẶT GẦN ĐÂY</Text>
                  </View>
                  {recentAddresses.map((item, idx) => (
                    <TouchableOpacity
                      key={`recent-${idx}`}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectRecentAddress(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownItemIconBox}>
                        <Ionicons name="bookmark" size={14} color={BrandColors.primary} />
                      </View>
                      <View style={styles.dropdownItemTextCol}>
                        <Text style={styles.dropdownItemMain} numberOfLines={1}>
                          {item.address}
                        </Text>
                        <Text style={styles.dropdownItemSub}>
                          {item.orderCount && item.orderCount > 1
                            ? `Đã đặt ${item.orderCount} lần trước đây`
                            : 'Đã lưu trong lịch sử'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Phân nhóm 2: Gợi ý tìm kiếm từ Goong Maps */}
              {isSearchingSuggestions ? (
                <View style={styles.searchingRow}>
                  <ActivityIndicator size="small" color={BrandColors.primary} />
                  <Text style={styles.searchingText}>Đang tìm gợi ý địa điểm...</Text>
                </View>
              ) : suggestions.length > 0 ? (
                <View style={styles.dropdownSection}>
                  <View style={styles.dropdownSectionHeader}>
                    <Ionicons name="sparkles" size={13} color="#F59E0B" />
                    <Text style={styles.dropdownSectionTitle}>GỢI Ý ĐỊA ĐIỂM CHÍNH XÁC</Text>
                  </View>
                  {suggestions.map((item) => (
                    <TouchableOpacity
                      key={item.placeId || item.description}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectSuggestion(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.dropdownItemIconBox, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="location" size={14} color="#D97706" />
                      </View>
                      <View style={styles.dropdownItemTextCol}>
                        <Text style={styles.dropdownItemMain} numberOfLines={1}>
                          {item.mainText}
                        </Text>
                        {!!item.secondaryText && (
                          <Text style={styles.dropdownItemSub} numberOfLines={1}>
                            {item.secondaryText}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>
        )}
      </View>

      {/* CẢNH BÁO LỖI / VALIDATION */}
      {!!error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* CẢNH BÁO KHÔNG TÌM THẤY TỌA ĐỘ KÈM HƯỚNG DẪN */}
      {!!geoWarning && (
        <View style={styles.warningBox}>
          <Ionicons name="information-circle" size={16} color="#B45309" />
          <Text style={styles.warningText}>{geoWarning}</Text>
        </View>
      )}

      {/* 5. MINI MAP PREVIEW CÓ GHIM ĐỎ */}
      {hasValidCoordinates && (
        <View style={styles.mapPreviewCard}>
          <Image
            source={{ uri: miniMapUrl! }}
            style={styles.miniMapImage}
            resizeMode="cover"
            onLoadStart={() => setIsMapImageLoading(true)}
            onLoadEnd={() => setIsMapImageLoading(false)}
            onError={() => {
              setIsMapImageLoading(false);
              if (!mapImageError) {
                setMapImageError(true);
              }
            }}
          />
          {isMapImageLoading && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="small" color={BrandColors.primary} />
            </View>
          )}
          <View style={styles.mapBadge}>
            <Ionicons name="pin" size={12} color="#EF4444" />
            <Text style={styles.mapBadgeText}>Đã ghim vị trí đón thợ</Text>
          </View>
          <TouchableOpacity
            style={styles.editPinBtn}
            onPress={() => {
              Haptics.selectionAsync();
              setIsMapModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={12} color="#FFFFFF" />
            <Text style={styles.editPinBtnText}>Chỉnh ghim</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 6. THÔNG BÁO CỰ LY & THỜI GIAN DI CHUYỂN */}
      {distanceInfo && (
        <View style={styles.distanceBadge}>
          <Ionicons name="navigate-circle" size={16} color="#3B82F6" />
          <Text style={styles.distanceText}>
            Khoảng cách đến thợ:{' '}
            <Text style={styles.distanceBold}>{distanceInfo.distanceKm.toFixed(1)} km</Text> (ước tính ~
            <Text style={styles.distanceBold}>{distanceInfo.durationMinutes} phút</Text> di chuyển qua{' '}
            {distanceInfo.routingProvider === 'GOONG_MAPS' ? 'Goong Maps' : 'Định vị GPS'})
          </Text>
        </View>
      )}

      {/* MODAL BẢN ĐỒ KÉO THẢ TƯƠNG TÁC */}
      <LocationMapPickerModal
        visible={isMapModalVisible}
        initialLat={latitude || 21.028511}
        initialLng={longitude || 105.854167}
        onClose={() => setIsMapModalVisible(false)}
        onConfirm={(newAddress, newLat, newLng) => {
          setInputText(newAddress);
          setGeoWarning(null);
          onChangeAddress(newAddress, newLat, newLng);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    zIndex: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  gpsActionBtn: {
    backgroundColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  mapActionBtn: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtnTextCol: {
    flex: 1,
  },
  actionBtnTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnSub: {
    fontSize: 10,
    color: '#F8FAFC',
    opacity: 0.85,
  },
  inputContainer: {
    position: 'relative',
    zIndex: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 4,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  dropdownCard: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    maxHeight: 240,
    zIndex: 999,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 240,
  },
  dropdownSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 4,
  },
  dropdownSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: '#FAFAFA',
  },
  dropdownSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownItemIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemTextCol: {
    flex: 1,
  },
  dropdownItemMain: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  dropdownItemSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    justifyContent: 'center',
  },
  searchingText: {
    fontSize: 12,
    color: '#64748B',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  mapPreviewCard: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    height: 130,
    backgroundColor: '#F1F5F9',
  },
  miniMapImage: {
    width: '100%',
    height: '100%',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  mapBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mapBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  editPinBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editPinBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  distanceText: {
    fontSize: 11,
    color: '#1E40AF',
    flex: 1,
    lineHeight: 16,
  },
  distanceBold: {
    fontWeight: '800',
  },
});
