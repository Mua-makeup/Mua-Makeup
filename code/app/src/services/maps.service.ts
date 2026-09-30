import { apiClient } from './api';
import * as Location from 'expo-location';

export interface GeocodeResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  district?: string;
  city?: string;
  provider?: string;
}

class MapsService {
  /**
   * Dịch tọa độ GPS (latitude, longitude) sang địa chỉ tiếng Việt rõ ràng
   * Ưu tiên Backend Goong Maps API -> Fallback sang expo-location trên thiết bị
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult> {
    // 1. Thử gọi qua Backend Goong Maps
    try {
      const res = await apiClient.get<any>('/maps/reverse-geocode', {
        params: { lat: latitude, lng: longitude },
      });

      if (res.data?.success && res.data?.data?.formattedAddress) {
        const data = res.data.data;
        // Nếu địa chỉ trả về là địa chỉ hợp lệ (không phải fallback dạng số thô 20.97, 105.76)
        if (data.formattedAddress && !/^\d+\.\d+,\s*\d+\.\d+$/.test(data.formattedAddress.trim())) {
          return {
            formattedAddress: data.formattedAddress,
            latitude: Number(data.latitude || latitude),
            longitude: Number(data.longitude || longitude),
            district: data.district,
            city: data.city,
            provider: data.provider || 'GOONG_MAPS',
          };
        }
      }
    } catch {
      // Backend Goong API lỗi hoặc dùng dummy key, chuyển sang fallback thiết bị
    }

    // 2. Fallback sang Geocoding của thiết bị (expo-location)
    try {
      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo) {
        const parts = [
          geo.streetNumber,
          geo.street,
          geo.subregion || geo.district,
          geo.city || geo.region,
        ].filter(Boolean);

        if (parts.length > 0) {
          return {
            formattedAddress: parts.join(', '),
            latitude,
            longitude,
            district: geo.district || geo.subregion || undefined,
            city: geo.city || geo.region || undefined,
            provider: 'DEVICE_GPS',
          };
        }
      }
    } catch {
      // Fallback cuối cùng
    }

    return {
      formattedAddress: `Vị trí (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      latitude,
      longitude,
      provider: 'COORDINATES_FALLBACK',
    };
  }

  /**
   * Chuyển địa chỉ chữ sang tọa độ GPS
   */
  async geocode(address: string): Promise<GeocodeResult | null> {
    try {
      const res = await apiClient.get<any>('/maps/geocode', {
        params: { address },
      });
      if (res.data?.success && res.data?.data?.latitude) {
        const data = res.data.data;
        return {
          formattedAddress: data.formattedAddress || address,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          provider: data.provider || 'GOONG_MAPS',
        };
      }
    } catch {
      // Fallback
    }

    try {
      const [geo] = await Location.geocodeAsync(address);
      if (geo) {
        return {
          formattedAddress: address,
          latitude: geo.latitude,
          longitude: geo.longitude,
          provider: 'DEVICE_GPS',
        };
      }
    } catch {
      // Ignore
    }

    return null;
  }

  /**
   * Gợi ý địa điểm tự động khi người dùng gõ tìm kiếm,
   * hỗ trợ location bias (ưu tiên khu vực lân cận nếu có)
   */
  async getPlaceSuggestions(
    input: string,
    latitude?: number | null,
    longitude?: number | null
  ): Promise<PlaceSuggestion[]> {
    if (!input || input.trim().length < 2) return [];
    try {
      const params: any = { input: input.trim() };
      if (latitude && longitude && latitude > 0 && longitude > 0) {
        params.lat = latitude;
        params.lng = longitude;
      }
      const res = await apiClient.get<any>('/maps/places/autocomplete', { params });
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch {
      // Ignore
    }
    return [];
  }

  /**
   * Lấy tọa độ và địa chỉ chi tiết chính xác 100% từ place_id
   */
  async getPlaceDetail(placeId: string): Promise<GeocodeResult | null> {
    if (!placeId) return null;
    try {
      const res = await apiClient.get<any>('/maps/places/detail', {
        params: { placeId },
      });
      if (res.data?.success && res.data?.data?.latitude) {
        const d = res.data.data;
        return {
          formattedAddress: d.formattedAddress,
          latitude: Number(d.latitude),
          longitude: Number(d.longitude),
          provider: d.provider || 'GOONG_MAPS',
        };
      }
    } catch {
      // Ignore
    }
    return null;
  }
}

export interface PlaceSuggestion {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText?: string;
}

export const mapsService = new MapsService();
