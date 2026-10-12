import { Platform } from 'react-native';
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
  | 'CANCELLED_BY_CUSTOMER'
  | 'EXPIRED'
  | 'DISPUTED'
  | 'DISPUTE_REFUNDED'
  | 'DISPUTE_COMPENSATED';

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
  styleId?: number;
  styleName?: string;
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
  cancellationReason?: string;
  isDepositRefunded?: boolean;
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
  styleId?: number;
  styleName?: string;
  packageName?: string;
  packagePrice?: number;
  bookingType?: string;
  bookingDate?: string;
  startTime?: string;
  packageId?: number;
  packageItems?: string[];
  componentItems?: string[];
  addonItems?: string[];
  availableAddons?: Array<{
    id: number;
    itemName: string;
    itemPrice?: number;
    durationMinutes?: number;
    itemType?: string;
  }>;
  estimatedDurationMinutes?: number;
  emergencyProofUrl?: string;
  emergencyReason?: string;
  emergencyReportedAt?: string;
  completionPhotoUrl?: string;
  isDepositPaid?: boolean;
  depositTimeoutSeconds?: number;
  confirmDeadline?: string;
  confirmTimeoutSeconds?: number;
  inProgressElapsedSeconds?: number;
  cancellationReason?: string;
  isCancelRequested?: boolean;
  cancelRequestedReason?: string;
  disputeOrigin?: 'CUSTOMER' | 'MUA' | 'DUAL' | string;
  isDirectBooking?: boolean;
  availablePackages?: CandidatePackageRes[];
  updatedAt: string;
}

export interface CandidatePackageRes {
  id: number;
  packageName: string;
  description?: string;
  price: number;
  estimatedDurationMinutes?: number;
  items?: string[];
  categoryName?: string;
  availableAddons?: Array<{
    id: number;
    itemName: string;
    itemPrice?: number;
    durationMinutes?: number;
    itemType?: string;
  }>;
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
    const isAgency = payload.providerType === 'AGENCY';
    const body = {
      ...payload,
      bookingPartner: isAgency ? 'AGENCY_DISPATCH' : 'FREELANCER_DIRECT',
      agencyId: isAgency ? payload.providerId : undefined,
      muaId: !isAgency ? payload.providerId : undefined,
    };
    const response = await apiClient.post('/customer/bookings', body);
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
    payload?: { packageId?: number; addOnNames?: string[]; addOnTotal?: number }
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

  /**
   * Lấy đơn hàng đang hoạt động kèm toàn bộ timeline lịch sử chi tiết (Realtime Backend PostgreSQL)
   */
  async getActiveTrackingBooking(): Promise<CustomerActiveTrackingData | null> {
    try {
      const response = await apiClient.get('/customer/bookings/active-tracking');
      return response.data?.data || null;
    } catch {
      return null;
    }
  },

  /**
   * Lấy lịch sử biến động chi tiết của một đơn hàng bất kỳ
   */
  async getBookingHistoryLogs(bookingId: number): Promise<BookingHistoryLogItem[]> {
    try {
      const response = await apiClient.get(`/bookings/${bookingId}/history`);
      return response.data?.data?.historyLogs || [];
    } catch {
      return [];
    }
  },

  /**
   * Chuyển đổi trạng thái đơn đặt lịch (CANCELLED, DISPUTED...)
   */
  async transitionBookingState(
    bookingId: number,
    targetStatus: BookingStatusType,
    reason?: string,
    emergencyProofUrl?: string
  ): Promise<any> {
    const response = await apiClient.post(`/bookings/${bookingId}/transition`, {
      targetStatus,
      reason,
      emergencyProofUrl,
    });
    return response.data?.data;
  },

  /**
   * Tải ảnh minh chứng khiếu nại (khách hàng hoặc thợ)
   */
  async uploadDisputeProof(
    bookingId: number,
    imageUri: string
  ): Promise<{ completionPhotoUrl?: string; photoUrl?: string; thumbnailUrl?: string }> {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || `dispute_proof_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    if (Platform.OS === 'web') {
      const fetchRes = await fetch(imageUri);
      const blob = await fetchRes.blob();
      formData.append('file', blob, filename);
    } else {
      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      } as any);
    }

    const response = await apiClient.post(`/bookings/${bookingId}/dispute-proof`, formData);
    const data = response.data?.data;
    const finalPhotoUrl = data?.completionPhotoUrl || data?.photoUrl;
    return {
      ...data,
      completionPhotoUrl: finalPhotoUrl,
      photoUrl: finalPhotoUrl,
    };
  },
};

export interface BookingHistoryLogItem {
  id: number;
  fromStatus?: string;
  toStatus: string;
  actionTitle?: string;
  changedByUserId?: number;
  changedBy?: string;
  artistName?: string;
  artistPhone?: string;
  originAddress?: string;
  destinationAddress?: string;
  note?: string;
  formattedTime?: string;
  createdAt: string;
}

export interface CustomerActiveTrackingData {
  bookingId: number;
  bookingCode: string;
  currentStatus: BookingStatusType;
  bookingType: string;
  destinationAddress: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  bookingDate?: string;
  startTime?: string;
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerAvatar?: string;
  muaId?: number;
  muaName?: string;
  muaPhone?: string;
  muaAvatar?: string;
  muaRating?: number;
  agencyName?: string;
  agencyAddress?: string;
  packageName?: string;
  styleName?: string;
  totalAmount?: number;
  depositAmount?: number;
  remainingAmount?: number;
  isDepositPaid?: boolean;
  historyLogs?: BookingHistoryLogItem[];
}

export interface RecentAddressItem {
  address: string;
  latitude: number;
  longitude: number;
  lastUsedAt?: string;
  orderCount?: number;
}

