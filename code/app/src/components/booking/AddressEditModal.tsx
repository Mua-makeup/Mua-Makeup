import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { mapsService, PlaceSuggestion } from '@/services/maps.service';
import { bookingService, RecentAddressItem } from '@/services/booking.service';
import { useLocationStore } from '@/store/location.store';

interface Props {
  visible: boolean;
  initialAddress: string;
  initialLat: number;
  initialLng: number;
  onClose: () => void;
  onConfirm: (address: string, lat: number, lng: number) => void;
  onOpenSavedAddresses: () => void;
  onOpenMapPicker: () => void;
}

export const AddressEditModal: React.FC<Props> = ({
  visible,
  initialAddress,
  initialLat,
  initialLng,
  onClose,
  onConfirm,
  onOpenSavedAddresses,
  onOpenMapPicker,
}) => {
  const { latitude: userLat, longitude: userLng } = useLocationStore();
  const [inputText, setInputText] = useState(initialAddress);
  const [selectedLat, setSelectedLat] = useState(initialLat);
  const [selectedLng, setSelectedLng] = useState(initialLng);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress);

  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [recentAddresses, setRecentAddresses] = useState<RecentAddressItem[]>([]);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [geoWarning, setGeoWarning] = useState<string | null>(null);

  const debounceTimerRef = useRef<any>(null);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setInputText(initialAddress);
      setSelectedAddress(initialAddress);
      setSelectedLat(initialLat);
      setSelectedLng(initialLng);
      setGeoWarning(null);

      // Load recent addresses
      bookingService.getRecentAddresses()
        .then((data) => {
          if (Array.isArray(data)) {
            setRecentAddresses(data);
          }
        })
        .catch(() => {});
    }
  }, [visible, initialAddress, initialLat, initialLng]);

  // Lấy vị trí GPS thực tế chính xác cao
  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    setGeoWarning(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
      if (!servicesEnabled) {
        Alert.alert('GPS Chưa Bật', 'Vui lòng bật định vị GPS trong cài đặt thiết bị để tiếp tục.');
        setIsLocating(false);
        return;
      }

      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }

      if (status !== 'granted') {
        Alert.alert(
          'Quyền Vị Trí',
          'Vui lòng cấp quyền truy cập vị trí trong cài đặt thiết bị để tự động điền địa chỉ đón thợ.'
        );
        setIsLocating(false);
        return;
      }

      let location = null;
      try {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      } catch {
        location = await Location.getLastKnownPositionAsync();
      }

      if (!location?.coords) {
        throw new Error('Không thể thu nhận tọa độ GPS từ thiết bị.');
      }

      const { latitude: lat, longitude: lng } = location.coords;

      // Reverse geocode
      const geoResult = await mapsService.reverseGeocode(lat, lng);
      const finalAddr = geoResult.formattedAddress;

      setInputText(finalAddr);
      setSelectedAddress(finalAddr);
      setSelectedLat(lat);
      setSelectedLng(lng);
      setSuggestions([]);

      useLocationStore.getState().setCustomLocation(finalAddr, lat, lng);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Định Vị Thất Bại', err.message || 'Không thể lấy tọa độ hiện tại.');
    } finally {
      setIsLocating(false);
    }
  };

  // Tìm kiếm địa điểm với debounce 350ms
  const handleTextChange = (text: string) => {
    setInputText(text);
    setGeoWarning(null);

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
        const results = await mapsService.getPlaceSuggestions(
          text.trim(),
          selectedLat || userLat,
          selectedLng || userLng
        );
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 350);
  };

  // Chọn gợi ý địa điểm từ Goong Maps
  const handleSelectSuggestion = async (item: PlaceSuggestion) => {
    Haptics.selectionAsync();
    setInputText(item.description);
    setSuggestions([]);
    setIsGeocoding(true);
    setGeoWarning(null);

    try {
      // 1. Ưu tiên lấy tọa độ chính xác tuyệt đối từ Place Detail
      const detail = await mapsService.getPlaceDetail(item.placeId);
      if (detail && detail.latitude && detail.longitude) {
        const finalAddress = detail.formattedAddress || item.description;
        setInputText(finalAddress);
        setSelectedAddress(finalAddress);
        setSelectedLat(detail.latitude);
        setSelectedLng(detail.longitude);
        return;
      }

      // 2. Fallback sang Geocode nếu Place Detail không khả dụng
      const geo = await mapsService.geocode(item.description);
      if (geo && geo.latitude && geo.longitude) {
        const finalAddress = geo.formattedAddress || item.description;
        setInputText(finalAddress);
        setSelectedAddress(finalAddress);
        setSelectedLat(geo.latitude);
        setSelectedLng(geo.longitude);
      } else {
        setGeoWarning('Không xác định được tọa độ điểm này. Hãy dùng chức năng Ghim trên bản đồ.');
      }
    } catch {
      setGeoWarning('Lỗi khi định vị địa điểm đã chọn.');
    } finally {
      setIsGeocoding(false);
    }
  };

  // Chọn từ địa chỉ đã đặt gần đây
  const handleSelectRecentAddress = (item: RecentAddressItem) => {
    Haptics.selectionAsync();
    setInputText(item.address);
    setSelectedAddress(item.address);
    setSelectedLat(item.latitude);
    setSelectedLng(item.longitude);
    setSuggestions([]);
    setGeoWarning(null);
  };

  // Xác nhận và áp dụng địa chỉ
  const handleConfirm = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      Alert.alert('Chưa Có Địa Chỉ', 'Vui lòng nhập hoặc chọn địa chỉ trang điểm.');
      return;
    }

    // Nếu người dùng tự gõ tay địa chỉ mới mà chưa chọn từ gợi ý/GPS
    if (trimmed !== selectedAddress || !selectedLat || !selectedLng) {
      setIsGeocoding(true);
      try {
        const geo = await mapsService.geocode(trimmed);
        if (geo && geo.latitude && geo.longitude) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onConfirm(geo.formattedAddress || trimmed, geo.latitude, geo.longitude);
          onClose();
          return;
        }
      } catch {
        // Fallback
      } finally {
        setIsGeocoding(false);
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(selectedAddress || trimmed, selectedLat || 21.028511, selectedLng || 105.854167);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          {/* 1. MODAL TOP HEADER */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#0F172A" />
            </TouchableOpacity>
            <View style={styles.headerTitleBox}>
              <Text style={styles.modalHeaderTitle}>Chỉnh Sửa Địa Chỉ Đón Thợ</Text>
              <Text style={styles.modalHeaderSub}>Chọn vị trí chính xác để chuyên viên phục vụ tận nơi</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          {/* 2. THANH NHẬP ĐỊA CHỈ TÌM KIẾM */}
          <View style={styles.searchBarWrapper}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Nhập số nhà, tên đường, tòa nhà hoặc khu vực..."
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={handleTextChange}
                autoCorrect={false}
                returnKeyType="done"
              />
              {isSearchingSuggestions || isGeocoding ? (
                <ActivityIndicator size="small" color={BrandColors.primary} style={{ marginRight: 6 }} />
              ) : null}
              {!!inputText ? (
                <TouchableOpacity
                  onPress={() => {
                    setInputText('');
                    setSuggestions([]);
                    setGeoWarning(null);
                  }}
                  style={styles.clearBtn}
                >
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* 3. BĂNG CÔNG CỤ NHANH: GPS - SỔ ĐỊA CHỈ - GHIM BẢN ĐỒ */}
          <View style={styles.quickActionsRow}>
            {/* Nút GPS */}
            <TouchableOpacity
              style={[styles.quickActionBtn, styles.gpsBtn]}
              onPress={handleGetCurrentLocation}
              disabled={isLocating}
              activeOpacity={0.75}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="navigate" size={15} color="#FFFFFF" />
              )}
              <Text style={styles.quickActionText}>GPS Hiện Tại</Text>
            </TouchableOpacity>

            {/* Nút Sổ Địa Chỉ */}
            <TouchableOpacity
              style={[styles.quickActionBtn, styles.savedBtn]}
              onPress={() => {
                Haptics.selectionAsync();
                onOpenSavedAddresses();
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="bookmarks" size={15} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Sổ Địa Chỉ</Text>
            </TouchableOpacity>

            {/* Nút Ghim Bản Đồ */}
            <TouchableOpacity
              style={[styles.quickActionBtn, styles.mapBtn]}
              onPress={() => {
                Haptics.selectionAsync();
                onOpenMapPicker();
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="map" size={15} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Ghim Bản Đồ</Text>
            </TouchableOpacity>
          </View>

          {/* CẢNH BÁO TỌA ĐỘ NẾU CÓ */}
          {!!geoWarning && (
            <View style={styles.warningBox}>
              <Ionicons name="information-circle" size={16} color="#B45309" />
              <Text style={styles.warningText}>{geoWarning}</Text>
            </View>
          )}

          {/* 4. DANH SÁCH GỢI Ý & ĐỊA CHỈ GẦN ĐÂY */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* NHÓM 1: GỢI Ý ĐỊA ĐIỂM CHÍNH XÁC (GOONG MAPS) */}
            {suggestions.length > 0 && (
              <View style={styles.listSection}>
                <View style={styles.listSectionHeader}>
                  <Ionicons name="sparkles" size={14} color="#D97706" />
                  <Text style={styles.listSectionTitle}>GỢI Ý ĐỊA ĐIỂM CHÍNH XÁC</Text>
                </View>
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item.placeId || item.description}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.suggestionIconBox}>
                      <Ionicons name="location" size={16} color="#D97706" />
                    </View>
                    <View style={styles.suggestionTextCol}>
                      <Text style={styles.suggestionMainText} numberOfLines={1}>
                        {item.mainText}
                      </Text>
                      {!!item.secondaryText && (
                        <Text style={styles.suggestionSecText} numberOfLines={1}>
                          {item.secondaryText}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* NHÓM 2: ĐỊA CHỈ ĐÃ ĐẶT GẦN ĐÂY */}
            {recentAddresses.length > 0 && (
              <View style={styles.listSection}>
                <View style={styles.listSectionHeader}>
                  <Ionicons name="time-outline" size={14} color={BrandColors.primary} />
                  <Text style={styles.listSectionTitle}>ĐỊA CHỈ ĐÃ ĐẶT GẦN ĐÂY</Text>
                </View>
                {recentAddresses.map((item, idx) => (
                  <TouchableOpacity
                    key={`recent-${idx}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectRecentAddress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.suggestionIconBox, { backgroundColor: '#FFE4E6' }]}>
                      <Ionicons name="bookmark" size={15} color={BrandColors.primary} />
                    </View>
                    <View style={styles.suggestionTextCol}>
                      <Text style={styles.suggestionMainText} numberOfLines={1}>
                        {item.address}
                      </Text>
                      <Text style={styles.suggestionSecText}>
                        {item.orderCount && item.orderCount > 1
                          ? `Đã đặt ${item.orderCount} lần trước đây`
                          : 'Đã lưu trong lịch sử'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Trạng thái trống nếu chưa có gợi ý */}
            {!isSearchingSuggestions && suggestions.length === 0 && recentAddresses.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Nhập địa chỉ của bạn</Text>
                <Text style={styles.emptySub}>
                  Bạn có thể tìm kiếm tên đường, tòa nhà hoặc bấm nút [GPS Hiện Tại] để định vị tức thì.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* 5. KHỐI XÁC NHẬN CHÂN MODAL */}
          <View style={styles.confirmBottomBar}>
            <View style={styles.selectedAddressPreview}>
              <Ionicons name="pin" size={16} color={BrandColors.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.previewLabel}>Địa chỉ đã chọn:</Text>
                <Text style={styles.previewAddressText} numberOfLines={2}>
                  {selectedAddress || inputText || 'Chưa chọn địa chỉ'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, (!inputText.trim()) && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!inputText.trim() || isGeocoding}
              activeOpacity={0.85}
            >
              {isGeocoding ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.confirmBtnText}>Xác Nhận Địa Chỉ Này</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalHeaderSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  gpsBtn: {
    backgroundColor: BrandColors.primary,
  },
  savedBtn: {
    backgroundColor: '#8B5CF6',
  },
  mapBtn: {
    backgroundColor: '#2563EB',
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  listSection: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  listSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  suggestionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTextCol: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  suggestionSecText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  confirmBottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  selectedAddressPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  previewAddressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
    lineHeight: 16,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
    height: 48,
    borderRadius: 14,
    gap: 8,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
