import { apiClient } from './api';
import { BookingStatusType } from './booking.service';

export interface FreelancerBookingItem {
  id: number;
  bookingCode: string;
  status: BookingStatusType;
  bookingType?: string;
  customerName: string;
  customerPhone?: string;
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
  createdAt: string;
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
  photoUrl: string;
  uploadedAt: string;
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
   * Chuyển trạng thái ca làm việc tuần tự (ON_THE_WAY -> ARRIVED -> IN_PROGRESS -> COMPLETED)
   */
  async transitionBookingState(
    bookingId: number,
    targetStatus: BookingStatusType,
    reason?: string,
    completionPhotoUrl?: string
  ): Promise<BookingStateTransitionRes> {
    const response = await apiClient.post(`/bookings/${bookingId}/transition`, {
      targetStatus,
      reason,
      completionPhotoUrl,
    });
    return response.data.data;
  },

  /**
   * Tải ảnh nghiệm thu sản phẩm make-up khuôn mặt khách hàng lên hệ thống
   */
  async uploadCompletionPhoto(bookingId: number, imageUri: string): Promise<BookingCompletionPhotoRes> {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || `proof_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response = await apiClient.post(`/bookings/${bookingId}/completion-photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  },
};
