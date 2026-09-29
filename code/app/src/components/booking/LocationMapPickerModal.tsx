import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { mapsService } from '@/services/maps.service';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  initialLat?: number;
  initialLng?: number;
  onClose: () => void;
  onConfirm: (address: string, lat: number, lng: number) => void;
}

const GOONG_KEY = 'NDdGHjR87yAkm1ana5TUw0bH2FtJ4dC61cueMuPc';

export const LocationMapPickerModal: React.FC<Props> = ({
  visible,
  initialLat = 21.028511,
  initialLng = 105.854167,
  onClose,
  onConfirm,
}) => {
  const [currentLat, setCurrentLat] = useState(initialLat);
  const [currentLng, setCurrentLng] = useState(initialLng);
  const [zoom, setZoom] = useState(16);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState('Đang tải địa chỉ vị trí...');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentLat(initialLat);
      setCurrentLng(initialLng);
      resolveAddress(initialLat, initialLng);
    }
  }, [visible, initialLat, initialLng]);

  const resolveAddress = async (lat: number, lng: number) => {
    setIsResolving(true);
    try {
      const res = await mapsService.reverseGeocode(lat, lng);
      setResolvedAddress(res.formattedAddress);
    } catch {
      setResolvedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setIsResolving(false);
    }
  };

  const handlePan = (dLat: number, dLng: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newLat = currentLat + dLat;
    const newLng = currentLng + dLng;
    setCurrentLat(newLat);
    setCurrentLng(newLng);
    resolveAddress(newLat, newLng);
  };

  const handleGpsCenter = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;
        setCurrentLat(latitude);
        setCurrentLng(longitude);
        resolveAddress(latitude, longitude);
      }
    } catch {
      // Ignore
    }
  };

  const handleSearchAddress = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const geo = await mapsService.geocode(searchQuery.trim());
      if (geo && geo.latitude && geo.longitude) {
        setCurrentLat(geo.latitude);
        setCurrentLng(geo.longitude);
        setResolvedAddress(geo.formattedAddress || searchQuery);
      }
    } catch {
      // Ignore
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(resolvedAddress, currentLat, currentLng);
    onClose();
  };

  const [mapImageError, setMapImageError] = useState(false);

  // URL Bản đồ tĩnh Goong Maps siêu nét, hỗ trợ 100% tất cả nền tảng
  const goongMapUrl = `https://rsapi.goong.io/staticmap/route?origin=${currentLat},${currentLng}&destination=${currentLat},${currentLng}&width=600&height=450&zoom=${zoom}&api_key=${GOONG_KEY}`;
  const fallbackMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${currentLat},${currentLng}&zoom=${zoom}&size=600x450&markers=${currentLat},${currentLng},red-pushpin`;
  const mapImageUrl = mapImageError ? fallbackMapUrl : goongMapUrl;

  // Bước di chuyển tinh chỉnh (~30-50m trên thực tế)
  const step = 0.00045;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bản Đồ Chọn Điểm Đến</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* THANH TÌM KIẾM ĐỊA CHỈ TRÊN BẢN ĐỒ */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên đường, tòa nhà hoặc địa danh..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchAddress}
            returnKeyType="search"
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={BrandColors.primary} />
          ) : (
            <TouchableOpacity onPress={handleSearchAddress} style={styles.searchActionBtn}>
              <Text style={styles.searchActionText}>Tìm</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* KHU VỰC BẢN ĐỒ GOONG MAPS TƯƠNG TÁC */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <iframe
              src={`https://www.google.com/maps?q=${currentLat},${currentLng}&z=${zoom}&output=embed`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Interactive Map"
            />
          ) : (
            <Image
              source={{ uri: mapImageUrl }}
              style={styles.mapImage}
              resizeMode="cover"
              onError={() => {
                if (!mapImageError) setMapImageError(true);
              }}
            />
          )}

          {/* GHIM TRUNG TÂM NỔI BẬT */}
          <View style={styles.centerPinContainer} pointerEvents="none">
            <Ionicons name="location" size={44} color="#E11D48" />
            <View style={styles.pinShadow} />
          </View>

          {/* BỘ PHÍM ĐIỀU HƯỚNG TINH CHỈNH TỌA ĐỘ (D-PAD) */}
          <View style={styles.dpadContainer}>
            <TouchableOpacity style={styles.dpadBtn} onPress={() => handlePan(step, 0)}>
              <Ionicons name="chevron-up" size={18} color="#0F172A" />
            </TouchableOpacity>
            <View style={styles.dpadRow}>
              <TouchableOpacity style={styles.dpadBtn} onPress={() => handlePan(0, -step)}>
                <Ionicons name="chevron-back" size={18} color="#0F172A" />
              </TouchableOpacity>
              <View style={styles.dpadCenter} />
              <TouchableOpacity style={styles.dpadBtn} onPress={() => handlePan(0, step)}>
                <Ionicons name="chevron-forward" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.dpadBtn} onPress={() => handlePan(-step, 0)}>
              <Ionicons name="chevron-down" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* CÁC NÚT ĐIỀU KHIỂN PHỤ (ZOOM & GPS) */}
          <View style={styles.mapControls}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => setZoom((z) => Math.min(18, z + 1))}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#0F172A" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => setZoom((z) => Math.max(12, z - 1))}
              activeOpacity={0.8}
            >
              <Ionicons name="remove" size={20} color="#0F172A" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlBtn, styles.gpsBtn]}
              onPress={handleGpsCenter}
              activeOpacity={0.8}
            >
              <Ionicons name="locate" size={20} color={BrandColors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* PANEL ĐỊA CHỈ PHÍA DƯỚI */}
        <View style={styles.bottomCard}>
          <View style={styles.addressHeaderRow}>
            <Ionicons name="location-sharp" size={18} color={BrandColors.primary} />
            <Text style={styles.addressLabel}>Vị trí ghim trang điểm:</Text>
          </View>

          <View style={styles.addressBox}>
            {isResolving ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={BrandColors.primary} />
                <Text style={styles.loadingText}>Đang dịch địa chỉ qua Goong Maps...</Text>
              </View>
            ) : (
              <Text style={styles.addressText} numberOfLines={3}>
                {resolvedAddress}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirm}
            disabled={isResolving}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmBtnText}>Xác Nhận Địa Chỉ Này</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  searchActionBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  searchActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -22 }, { translateY: -44 }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinShadow: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: -4,
  },
  dpadContainer: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  dpadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  dpadBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dpadCenter: {
    width: 22,
    height: 22,
  },
  mapControls: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    gap: 8,
  },
  controlBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  gpsBtn: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 5,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  addressBox: {
    minHeight: 52,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    justifyContent: 'center',
  },
  addressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  confirmBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
