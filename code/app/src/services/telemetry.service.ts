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

export const telemetryService = {
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
