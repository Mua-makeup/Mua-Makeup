import { apiClient } from './api';

export interface ToggleAvailabilityPayload {
  isAvailable: boolean;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

export interface LocationStreamPayload {
  bookingId: number;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

export interface LiveTrackingRes {
  bookingId: number;
  muaId: number;
  currentLat: number;
  currentLng: number;
  speed: number;
  heading: number;
  accuracy: number;
  etaMinutes: number;
  distanceRemainingMeters: number;
  updatedAt: string;
}

export interface NearbyProvidersReq {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  masterCategoryId?: number;
  minRating?: number;
}

export interface NearbyProviderRes {
  providerId: number;
  providerType: string;
  code: string;
  fullName: string;
  avatarUrl: string;
  distanceKm: number;
  ratingAvg: number;
  startingPrice: number;
  fuzzedLatitude: number;
  fuzzedLongitude: number;
  styles: string[];
}

export const telemetryService = {
  /**
   * Quét danh sách thợ thật đang online trong Redis GEO quanh vị trí khách
   */
  async getNearbyProviders(req: NearbyProvidersReq): Promise<NearbyProviderRes[]> {
    const response = await apiClient.get('/telemetry/nearby', { params: req });
    return response.data.data || [];
  },

  /**
   * Tải tọa độ thợ, ETA và lộ trình live ban đầu của đơn hàng
   */
  async getLiveTripTracking(bookingId: number): Promise<LiveTrackingRes> {
    const response = await apiClient.get(`/telemetry/bookings/${bookingId}/track`);
    return response.data.data;
  },

  /**
   * Bật / Tắt trạng thái phát sóng GPS nhận ca trực tuyến
   */
  async toggleAvailability(payload: ToggleAvailabilityPayload): Promise<void> {
    await apiClient.post('/telemetry/availability', payload);
  },

  /**
   * Phát sóng vị trí thợ định kỳ (mỗi 5-10s) khi đang di chuyển tới khách
   */
  async streamLocation(payload: LocationStreamPayload): Promise<LiveTrackingRes> {
    const response = await apiClient.post('/telemetry/stream', payload);
    return response.data.data;
  },

  /**
   * Gửi heartbeat duy trì kết nối trực tuyến
   */
  async sendHeartbeat(): Promise<void> {
    await apiClient.post('/telemetry/heartbeat');
  },
};

