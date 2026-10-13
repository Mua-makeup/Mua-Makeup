import { apiClient } from './api';
import { BookingStatusType } from './booking.service';
import { createImageFormData } from '@/utils/form-data';

export interface FreelancerBookingItem {
  id: number;
  bookingCode: string;
  status: BookingStatusType;
  bookingType?: string;
  customerName: string;
  customerPhone?: string;
  customerAvatar?: string;
  packageName: string;
  packageCoverUrl?: string;
  destinationAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  bookingDate: string;
  startTime: string;
  totalAmount: number;
  depositAmount: number;
  earningsAmount: number;
  note?: string;
  completionPhotoUrl?: string;
  isConfirmedByStaff?: boolean;
  assignmentRole?: string;
  assignmentStatus?: string;
  commissionRate?: number;
  commissionNote?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BookingAcceptanceRes {
  bookingId: number;
  bookingCode: string;
  status: string;
  assignedMuaId: number;
  destinationAddress: string;
  serviceTotalAmount: number;
  escrowDepositLocked: number;
  customerInfo?: {
    fullName: string;
    phoneNumber: string;
  };
  acceptedAt?: string;
}

export interface TransitionBookingStatePayload {
  targetStatus: BookingStatusType;
  reason?: string;
  completionPhotoUrl?: string;
  emergencyProofUrl?: string;
}

export interface BookingStateTransitionRes {
  bookingId: number;
  bookingCode: string;
  previousStatus: BookingStatusType;
  currentStatus: BookingStatusType;
  actorUserId: number;
  transitionedAt: string;
}

export interface BookingCompletionPhotoRes {
  bookingId: number;
  bookingCode?: string;
  completionPhotoUrl: string;
  photoUrl?: string;
  thumbnailUrl?: string;
  publicId?: string;
  uploadedAt: string;
}

export interface ScheduledOfferItem {
  bookingId: number;
  bookingCode: string;
  customerName: string;
  customerPhone?: string;
  customerAvatar?: string;
  packageName?: string;
  styleName?: string;
  bookingDate: string;
  startTime: string;
  destinationAddress: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  totalAmount: number;
  depositAmount: number;
  earningsAmount: number;
  confirmDeadline?: string;
  confirmTimeoutSeconds?: number;
  createdAt?: number;
}

export const freelancerBookingService = {
  /**
   * Lấy danh sách ca hẹn được chỉ định hoặc tiếp nhận của Thợ MUA
   */
  async getMyAssignedBookings(date?: string, statusGroup?: string): Promise<FreelancerBookingItem[]> {
    try {
      const response = await apiClient.get('/freelancer/bookings', {
        params: { date, statusGroup },
      });
      return response.data?.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Chấp nhận đơn khẩn cấp 30s (kèm Redlock backend)
   */
  async acceptInstantBooking(bookingId: number): Promise<BookingAcceptanceRes> {
    const response = await apiClient.post(`/freelancer/bookings/${bookingId}/accept`);
    return response.data.data;
  },

  /**
   * Bỏ qua đơn khẩn cấp (chuyển sang candidate thợ tiếp theo)
   */
  async skipInstantBooking(bookingId: number): Promise<void> {
    await apiClient.post(`/freelancer/bookings/${bookingId}/skip`);
  },

  /**
   * Kiểm tra xem thợ hiện tại có ca khẩn cấp nào đang chờ xác nhận không (0ms Redis)
   */
  async getPendingInstantOffer(): Promise<any | null> {
    try {
      const response = await apiClient.get('/freelancer/bookings/instant/pending-offer');
      return response.data?.data || null;
    } catch {
      return null;
    }
  },

  /**
   * Lấy danh sách ca đặt lịch hẹn trước đang chờ thợ xác nhận tiếp nhận
   */
  async getPendingScheduledOffers(): Promise<ScheduledOfferItem[]> {
    try {
      const response = await apiClient.get('/freelancer/bookings/scheduled/pending-offers');
      return response.data?.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Thợ xác nhận tiếp nhận đơn đặt trước
   */
  async confirmScheduledBooking(bookingId: number): Promise<void> {
    await apiClient.post(`/freelancer/bookings/${bookingId}/confirm-scheduled`);
  },

  /**
   * Thợ từ chối đơn đặt trước (hoàn cọc tự động về ví khách)
   */
  async rejectScheduledBooking(bookingId: number, reason?: string): Promise<void> {
    await apiClient.post(`/freelancer/bookings/${bookingId}/reject-scheduled`, { reason });
  },

  /**
   * Chuyển trạng thái ca làm việc tuần tự (hỗ trợ cả dạng object payload lẫn positional params)
   */
  async transitionBookingState(
    bookingId: number,
    targetOrPayload: BookingStatusType | TransitionBookingStatePayload,
    reason?: string,
    completionPhotoUrl?: string,
    emergencyProofUrl?: string
  ): Promise<BookingStateTransitionRes> {
    const payload: TransitionBookingStatePayload = typeof targetOrPayload === 'string'
      ? { targetStatus: targetOrPayload, reason, completionPhotoUrl, emergencyProofUrl }
      : targetOrPayload;

    const response = await apiClient.post(`/bookings/${bookingId}/transition`, payload);
    return response.data?.data;
  },

  /**
   * Tải ảnh minh chứng hoặc nghiệm thu cho đơn đặt lịch
   */
  async uploadBookingProof(
    bookingId: number,
    imageUri: string,
    proofType: 'completion-photo' | 'dispute-proof' = 'completion-photo'
  ): Promise<BookingCompletionPhotoRes> {
    const formData = await createImageFormData(
      imageUri,
      'file',
      proofType === 'completion-photo' ? `proof_${Date.now()}.jpg` : `dispute_proof_${Date.now()}.jpg`
    );

    const response = await apiClient.post(`/bookings/${bookingId}/${proofType}`, formData);
    const data = response.data?.data;
    const finalPhotoUrl = data?.completionPhotoUrl || data?.photoUrl;
    return {
      ...data,
      completionPhotoUrl: finalPhotoUrl,
      photoUrl: finalPhotoUrl,
    };
  },

  /**
   * Tải ảnh nghiệm thu sản phẩm make-up khuôn mặt khách hàng lên hệ thống
   */
  async uploadCompletionPhoto(bookingId: number, imageUri: string): Promise<BookingCompletionPhotoRes> {
    return this.uploadBookingProof(bookingId, imageUri, 'completion-photo');
  },

  /**
   * Tải ảnh minh chứng sự cố / khách vắng mặt lên hệ thống
   */
  async uploadDisputeProof(bookingId: number, imageUri: string): Promise<BookingCompletionPhotoRes> {
    return this.uploadBookingProof(bookingId, imageUri, 'dispute-proof');
  },
};
