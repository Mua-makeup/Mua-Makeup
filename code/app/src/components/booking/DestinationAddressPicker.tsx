import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/theme';
import { DistanceMatrixRes } from '@/services/pricing.service';
import { mapsService } from '@/services/maps.service';
import { useLocationStore } from '@/store/location.store';
import { LocationMapPickerModal } from './LocationMapPickerModal';
import { SavedAddressModal } from '@/components/customer/SavedAddressModal';
import { AddressEditModal } from './AddressEditModal';

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
  const [isLocating, setIsLocating] = useState(false);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [isSavedAddressModalVisible, setIsSavedAddressModalVisible] = useState(false);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<number | undefined>(undefined);
  const [isMapImageLoading, setIsMapImageLoading] = useState(false);
  const [mapImageError, setMapImageError] = useState(false);

  // Lấy vị trí GPS thực tế chính xác cao
  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
      if (!servicesEnabled) {
        Alert.alert('GPS Chưa Bật', 'Vui lòng bật dịch vụ định vị GPS trong cài đặt thiết bị để tiếp tục.');
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

      // Gọi Goong Maps Reverse Geocoding qua Backend (hoặc fallback chính xác)
      const geoResult = await mapsService.reverseGeocode(lat, lng);

      onChangeAddress(geoResult.formattedAddress, lat, lng);
      useLocationStore.getState().setCustomLocation(geoResult.formattedAddress, lat, lng);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Định Vị Thất Bại', err.message || 'Không thể lấy tọa độ hiện tại.');
    } finally {
      setIsLocating(false);
    }
  };

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
        <View style={styles.headerLeft}>
          <Ionicons name="location" size={18} color={BrandColors.primary} />
          <Text style={styles.sectionTitle}>Địa Điểm Trang Điểm Tận Nơi</Text>
        </View>
        {!!address && (
          <TouchableOpacity
            style={styles.headerEditBtn}
            onPress={() => {
              Haptics.selectionAsync();
              setIsAddressModalVisible(true);
            }}
            activeOpacity={0.75}
          >
            <Ionicons name="pencil" size={13} color={BrandColors.primary} />
            <Text style={styles.headerEditBtnText}>Chỉnh sửa</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 2. KHỐI HIỂN THỊ ĐỊA CHỈ (BẤM VÀO MỞ MODAL CHỈNH SỬA) */}
      <TouchableOpacity
        style={[styles.addressCard, !!error && styles.addressCardError]}
        onPress={() => {
          Haptics.selectionAsync();
          setIsAddressModalVisible(true);
        }}
        activeOpacity={0.85}
      >
        <View style={styles.addressIconCircle}>
          <Ionicons
            name={hasValidCoordinates ? 'pin' : 'location-outline'}
            size={20}
            color={hasValidCoordinates ? BrandColors.primary : '#94A3B8'}
          />
        </View>

        <View style={styles.addressContent}>
          {address ? (
            <>
              <Text style={styles.addressText} numberOfLines={2}>
                {address}
              </Text>
              <View style={styles.addressStatusRow}>
                <View style={[styles.statusDot, hasValidCoordinates && styles.statusDotActive]} />
                <Text style={styles.statusText}>
                  {hasValidCoordinates ? 'Đã xác thực tọa độ đón thợ' : 'Chưa xác định tọa độ GPS'}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.addressPlaceholder}>Chạm để nhập hoặc chọn địa chỉ đón thợ</Text>
              <Text style={styles.addressSubPlaceholder}>Số nhà, tên đường, tòa nhà hoặc định vị GPS</Text>
            </>
          )}
        </View>

        <View style={styles.changeActionBadge}>
          <Text style={styles.changeActionText}>Thay đổi</Text>
          <Ionicons name="chevron-forward" size={14} color={BrandColors.primary} />
        </View>
      </TouchableOpacity>

      {/* CẢNH BÁO LỖI / VALIDATION NẾU CÓ */}
      {!!error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* 3. BĂNG 3 NÚT THAO TÁC NHANH: GPS - SỔ ĐỊA CHỈ - GHIM BẢN ĐỒ */}
      <View style={styles.actionButtonGroup}>
        {/* Nút 1: Lấy GPS hiện tại */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.gpsActionBtn]}
          onPress={handleGetCurrentLocation}
          disabled={isLocating}
          activeOpacity={0.75}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="navigate" size={14} color="#FFFFFF" />
          )}
          <Text style={styles.actionBtnTitle}>GPS Hiện Tại</Text>
        </TouchableOpacity>

        {/* Nút 2: Sổ địa chỉ hồ sơ */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.savedActionBtn]}
          onPress={() => {
            Haptics.selectionAsync();
            setIsSavedAddressModalVisible(true);
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="bookmarks" size={14} color="#FFFFFF" />
          <Text style={styles.actionBtnTitle}>Sổ Địa Chỉ</Text>
        </TouchableOpacity>

        {/* Nút 3: Ghim bản đồ tương tác */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.mapActionBtn]}
          onPress={() => {
            Haptics.selectionAsync();
            setIsMapModalVisible(true);
          }}
          activeOpacity={0.75}
        >
          <Ionicons name="map" size={14} color="#FFFFFF" />
          <Text style={styles.actionBtnTitle}>Ghim Bản Đồ</Text>
        </TouchableOpacity>
      </View>

      {/* 4. MINI MAP PREVIEW CÓ GHIM ĐỎ */}
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

      {/* 5. THÔNG BÁO CỰ LY & THỜI GIAN DI CHUYỂN */}
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

      {/* MODAL 1: CHỈNH SỬA ĐỊA CHỈ TOÀN MÀN HÌNH (YÊU CẦU NGƯỜI DÙNG) */}
      <AddressEditModal
        visible={isAddressModalVisible}
        initialAddress={address}
        initialLat={latitude}
        initialLng={longitude}
        onClose={() => setIsAddressModalVisible(false)}
        onConfirm={(newAddress, newLat, newLng) => {
          onChangeAddress(newAddress, newLat, newLng);
        }}
        onOpenSavedAddresses={() => {
          setIsAddressModalVisible(false);
          setIsSavedAddressModalVisible(true);
        }}
        onOpenMapPicker={() => {
          setIsAddressModalVisible(false);
          setIsMapModalVisible(true);
        }}
      />

      {/* MODAL 2: BẢN ĐỒ KÉO THẢ TƯƠNG TÁC */}
      <LocationMapPickerModal
        visible={isMapModalVisible}
        initialLat={latitude || 21.028511}
        initialLng={longitude || 105.854167}
        onClose={() => setIsMapModalVisible(false)}
        onConfirm={(newAddress, newLat, newLng) => {
          onChangeAddress(newAddress, newLat, newLng);
        }}
      />

      {/* MODAL 3: SỔ ĐỊA CHỈ KHÁCH HÀNG */}
      <SavedAddressModal
        visible={isSavedAddressModalVisible}
        selectedAddressId={selectedSavedAddressId}
        onClose={() => setIsSavedAddressModalVisible(false)}
        onSelectAddress={(selected) => {
          setSelectedSavedAddressId(selected.id);
          onChangeAddress(selected.addressLine, selected.latitude, selected.longitude);
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  addressCardError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  addressIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressContent: {
    flex: 1,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 18,
  },
  addressPlaceholder: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  addressSubPlaceholder: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  addressStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  statusDotActive: {
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 11,
    color: '#64748B',
  },
  changeActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  changeActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 11,
    gap: 6,
  },
  gpsActionBtn: {
    backgroundColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  savedActionBtn: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  mapActionBtn: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 2,
  },
  actionBtnTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
  mapPreviewCard: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    height: 120,
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
    fontWeight: '700',
    color: '#1D4ED8',
  },
});
