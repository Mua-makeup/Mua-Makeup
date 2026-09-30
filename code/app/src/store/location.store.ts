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

  fetchCurrentLocation: () => Promise<void>;
  setCustomLocation: (address: string, lat: number, lng: number) => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  currentAddress: 'Đang xác định vị trí...',
  shortAddress: 'Đang định vị...',
  latitude: null,
  longitude: null,
  isLoading: false,
  error: null,

  fetchCurrentLocation: async () => {
    // Tránh gọi trùng lặp
    if (get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        set({
          isLoading: false,
          currentAddress: 'Chưa cấp quyền vị trí',
          shortAddress: 'Chưa cấp quyền',
          error: 'PERMISSION_DENIED',
        });
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

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
