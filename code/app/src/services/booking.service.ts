import { apiClient } from './api';
import { CreateBookingFormValues } from '@/schemas/booking-create.schema';
import { CreateInstantBookingPayload } from '@/schemas/instant-booking.schema';

export type BookingStatusType =
  | 'REQUESTED'
  | 'PENDING_AGENCY_DISPATCH'
  | 'AGENCY_ASSIGNED'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PAID_OUT'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DISPUTED';

export interface InstantBookingCreatedRes {
  bookingId: number;
  bookingCode: string;
  status: BookingStatusType;
  bookingType: string;
  destinationAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  totalAmount: number;
  depositAmount: number;
  surchargeFee: number;
  potentialProvidersFound: number;
  searchTimeoutSeconds: number;
  createdAt: string;
}

export interface CustomerBookingItem {
  id: number;
  bookingCode: string;
  muaId?: number;
  muaName?: string;
  muaAvatarUrl?: string;
  muaPhoneNumber?: string;
  packageName: string;
  packageCoverUrl?: string;
  bookingTime: string;
  destinationAddress: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  status: BookingStatusType;
  totalAmount: number;
  depositAmount: number;
  remainingAmount: number;
  addOnNames?: string[];
  note?: string;
  createdAt: string;
}

export interface BookingStatusDetailRes {
  bookingId: number;
  bookingCode: string;
  status: BookingStatusType;
  currentStatus?: BookingStatusType;
  destinationAddress?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  muaId?: number;
  muaName?: string;
  muaPhone?: string;
  muaPhoneNumber?: string;
  muaAvatar?: string;
  customerName?: string;
  customerPhone?: string;
  customerAvatar?: string;
  rating?: number;
  totalAmount?: number;
  serviceSubtotal?: number;
  surchargeFee?: number;
  distanceFee?: number;
  depositAmount?: number;
  platformFee?: number;
  earningsAmount?: number;
  styleName?: string;
  packageName?: string;
  packageItems?: string[];
  estimatedDurationMinutes?: number;
  emergencyProofUrl?: string;
  completionPhotoUrl?: string;
  isDepositPaid?: boolean;
  depositTimeoutSeconds?: number;
  cancellationReason?: string;
  updatedAt: string;
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

export const bookingService = {
  /**
   * Tạo đơn đặt lịch theo hẹn thông thường
   */
  async createScheduledBooking(payload: CreateBookingFormValues): Promise<CustomerBookingItem> {
    const response = await apiClient.post('/customer/bookings', payload);
    return response.data.data;
  },

  /**
   * Tạo đơn tìm thợ khẩn cấp 30s
   */
  async createInstantBooking(payload: CreateInstantBookingPayload): Promise<InstantBookingCreatedRes> {
    const response = await apiClient.post('/customer/bookings/instant', payload);
    return response.data.data;
  },

  /**
   * Hủy tìm kiếm thợ khẩn cấp
   */
  async cancelInstantBooking(bookingId: number, reason?: string): Promise<void> {
    await apiClient.post(`/customer/bookings/${bookingId}/cancel`, { reason });
  },

  /**
   * Lấy danh sách lịch hẹn của khách hàng
   */
  async getMyBookings(statusGroup?: 'UPCOMING' | 'HISTORY'): Promise<CustomerBookingItem[]> {
    try {
      const response = await apiClient.get('/customer/bookings', {
        params: { statusGroup },
      });
      return response.data.data || [];
    } catch {
      // Fallback nếu endpoint chưa có dữ liệu hoặc mock offline
      return [];
    }
  },

  /**
   * Lấy chi tiết trạng thái đơn hẹn
   */
  async getBookingStatus(bookingId: number): Promise<BookingStatusDetailRes> {
    const response = await apiClient.get(`/bookings/${bookingId}/status`);
    return response.data.data;
  },

  /**
   * Chuyển trạng thái đơn hoặc khách hàng hủy ca hẹn
   */
  async cancelBooking(bookingId: number, reasonText: string): Promise<void> {
    const finalReason = reasonText?.trim() || 'Hủy đơn theo yêu cầu';
    await apiClient.post(`/bookings/${bookingId}/transition`, {
      targetStatus: 'CANCELLED',
      reason: finalReason,
      reasonText: finalReason,
    });
  },

  /**
   * Theo dõi vị trí thợ di chuyển trực tiếp (Live Tracking)
   */
  async trackBookingLive(bookingId: number): Promise<LiveTrackingRes> {
    const response = await apiClient.get(`/telemetry/bookings/${bookingId}/track`);
    return response.data.data;
  },

  /**
   * Lấy danh sách sổ địa chỉ thân quen từ các đơn hàng gần nhất của khách
   */
  async getRecentAddresses(): Promise<RecentAddressItem[]> {
    try {
      const response = await apiClient.get('/customer/bookings/recent-addresses');
      return response.data?.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Khách hàng từ chối thợ đã khớp để tìm thợ khác (có gửi kèm lý do)
   */
  async rejectMatchedProvider(bookingId: number, reason?: string): Promise<void> {
    await apiClient.post(`/customer/bookings/${bookingId}/reject-provider`, { reason });
  },

  /**
   * Khách hàng đồng ý thợ và đặt cọc 30% (có thể kèm các dịch vụ mua thêm)
   */
  async confirmDeposit(
    bookingId: number,
    payload?: { addOnNames?: string[]; addOnTotal?: number }
  ): Promise<void> {
    await apiClient.post(`/customer/bookings/${bookingId}/confirm-deposit`, payload || {});
  },

  /**
   * Báo cáo sự cố khẩn cấp (chuyển sang DISPUTED kèm ảnh và lý do)
   */
  async reportDispute(bookingId: number, reason: string, emergencyProofUrl?: string): Promise<void> {
    await apiClient.post(`/bookings/${bookingId}/transition`, {
      targetStatus: 'DISPUTED',
      reason,
      emergencyProofUrl,
    });
  },
};

export interface RecentAddressItem {
  address: string;
  latitude: number;
  longitude: number;
  lastUsedAt?: string;
  orderCount?: number;
}
