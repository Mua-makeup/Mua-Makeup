import { create } from 'zustand';
import * as Location from 'expo-location';
import { mapsService } from '@/services/maps.service';

interface LocationState {
  currentAddress: string;
  shortAddress: string;
  latitude: number | null;
  longitude: number | null;
  isLoading: boolean;
  error: string | null;

  fetchCurrentLocation: (force?: boolean) => Promise<void>;
  setCustomLocation: (address: string, lat: number, lng: number) => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  currentAddress: 'Đang xác định vị trí...',
  shortAddress: 'Đang định vị...',
  latitude: null,
  longitude: null,
  isLoading: false,
  error: null,

  fetchCurrentLocation: async (force = false) => {
    // Tránh gọi trùng lặp
    if (get().isLoading) return;

    // Nếu đã có địa chỉ và tọa độ hợp lệ, không cần quét lại trừ khi người dùng chủ động yêu cầu (force = true)
    if (
      !force &&
      get().latitude !== null &&
      get().longitude !== null &&
      get().currentAddress &&
      !get().currentAddress.startsWith('Đang xác định')
    ) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
      if (!servicesEnabled) {
        set({
          isLoading: false,
          currentAddress: 'Chưa bật định vị GPS',
          shortAddress: 'GPS tắt',
          error: 'LOCATION_SERVICES_DISABLED',
        });
        return;
      }

      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }

      if (status !== 'granted') {
        set({
          isLoading: false,
          currentAddress: 'Chưa cấp quyền vị trí',
          shortAddress: 'Chưa cấp quyền',
          error: 'PERMISSION_DENIED',
        });
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
        throw new Error('Không thể thu nhận tọa độ GPS.');
      }

      const { latitude, longitude } = location.coords;

      // Gọi mapsService để reverse geocode qua Goong Maps Backend
      const geoResult = await mapsService.reverseGeocode(latitude, longitude);

      const fullAddress = geoResult.formattedAddress;
      // Tạo shortAddress gọn gàng để hiển thị Header (ví dụ: "Phường Bến Thành, Q.1" hoặc 2 phần đầu)
      const parts = fullAddress.split(',').map((s) => s.trim());
      const short = parts.length > 2 
        ? `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`
        : fullAddress;

      set({
        currentAddress: fullAddress,
        shortAddress: short,
        latitude,
        longitude,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Lỗi định vị',
      });
    }
  },

  setCustomLocation: (address: string, lat: number, lng: number) => {
    const parts = address.split(',').map((s) => s.trim());
    const short = parts.length > 2 
      ? `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`
      : address;

    set({
      currentAddress: address,
      shortAddress: short,
      latitude: lat,
      longitude: lng,
    });
  },
}));
