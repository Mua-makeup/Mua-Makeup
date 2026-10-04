import { apiClient } from './api';
import { CreateBookingFormValues } from '@/schemas/booking-create.schema';
import { CreateInstantBookingPayload } from '@/schemas/instant-booking.schema';

export type BookingStatusType =
  | 'PENDING_DEPOSIT'
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
  | 'CANCELLED_EXPIRED'
  | 'EXPIRED'
  | 'DISPUTED';

export interface ScheduledBookingCreatedRes {
  bookingId?: number;
  booking_id?: number;
  id?: number;
  bookingCode?: string;
  booking_code?: string;
  status: BookingStatusType;
  depositExpiredAt?: string;
  deposit_expired_at?: string;
  bookingType?: string;
  booking_type?: string;
  bookingPartner?: string;
  booking_partner?: string;
  bookingDate?: string;
  booking_date?: string;
  startTime?: string;
  start_time?: string;
  estimatedEndTime?: string;
  estimated_end_time?: string;
  packageName?: string;
  package_name?: string;
  scheduleSummary?: string;
  schedule_summary?: string;
  totalAmount?: number;
  total_amount?: number;
  depositAmount?: number;
  deposit_amount?: number;
  assignedMua?: {
    muaId?: number;
    mua_id?: number;
    fullName?: string;
    full_name?: string;
    phoneNumber?: string;
    phone_number?: string;
    avatarUrl?: string;
    avatar_url?: string;
  };
  financialSummary?: {
    serviceSubtotal?: number;
    service_subtotal?: number;
    distanceFee?: number;
    distance_fee?: number;
    surchargeFee?: number;
    surcharge_fee?: number;
    discountAmount?: number;
    discount_amount?: number;
    totalAmount?: number;
    total_amount?: number;
    depositAmount?: number;
    deposit_amount?: number;
    remainingAmount?: number;
    remaining_amount?: number;
  };
}

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
  isDepositPaid?: boolean;
  createdAt: string;
  updatedAt?: string;
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
  bookingType?: string;
  bookingDate?: string;
  startTime?: string;
  packageItems?: string[];
  estimatedDurationMinutes?: number;
  emergencyProofUrl?: string;
  completionPhotoUrl?: string;
  isDepositPaid?: boolean;
  depositTimeoutSeconds?: number;
  confirmDeadline?: string;
  confirmTimeoutSeconds?: number;
  inProgressElapsedSeconds?: number;
  cancellationReason?: string;
  isCancelRequested?: boolean;
  cancelRequestedReason?: string;
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
  async createScheduledBooking(payload: CreateBookingFormValues): Promise<ScheduledBookingCreatedRes & { id: number; bookingId: number }> {
    const response = await apiClient.post('/customer/bookings', payload);
    const data = response.data?.data || {};
    const bookingId = Number(data.booking_id || data.bookingId || data.id || 0);
    return {
      ...data,
      id: bookingId,
      bookingId,
    };
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
   * Khách hàng hủy đơn hẹn đang chờ chuyên viên xác nhận & hoàn cọc tự động về ví
   */
  async cancelRequestedBooking(bookingId: number, reason?: string): Promise<void> {
    await apiClient.post(`/customer/bookings/${bookingId}/cancel-requested`, {
      reason: reason?.trim() || 'Khách hàng hủy ca khi chuyên viên chưa xác nhận',
    });
  },

  /**
   * Khách hàng gửi yêu cầu hủy ca khi thợ đang di chuyển (chấp nhận mất cọc 30% bồi thường thợ, cần thợ xác nhận)
   */
  async requestCancelTrip(bookingId: number, reason: string): Promise<void> {
    await apiClient.post(`/bookings/${bookingId}/request-cancel-trip`, { reason });
  },

  /**
   * Thợ xác nhận đồng ý hủy ca và nhận bồi thường 100% tiền cọc 30% vào Ví Thợ
   */
  async confirmCancelCompensation(bookingId: number): Promise<void> {
    await apiClient.post(`/bookings/${bookingId}/confirm-cancel-compensation`);
  },

  /**
   * Thợ từ chối yêu cầu hủy ca và tiếp tục di chuyển tới khách
   */
  async rejectCancelCompensation(bookingId: number, reason?: string): Promise<void> {
    await apiClient.post(`/bookings/${bookingId}/reject-cancel-compensation`, { reason });
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
