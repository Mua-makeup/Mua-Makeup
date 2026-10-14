import { apiClient } from './api';
import { ApiResponse } from './auth.service';

export interface CreateReviewPayload {
  bookingId: number;
  rating: number; // 1 - 5
  comment?: string;
  imageUrls?: string[];
  deviceId?: string;
  bankHash?: string;
}

export interface ReviewItem {
  id: number;
  bookingId: number;
  bookingCode?: string;
  customerId: number;
  customerName?: string;
  customerAvatar?: string;
  muaId: number;
  muaName?: string;
  rating: number;
  comment?: string;
  imageUrls?: string[];
  status: string;
  createdAt: string;
}

export interface MuaRatingSummary {
  muaId: number;
  ratingAvg: number;
  bayesianRating: number;
  rollingRating: number;
  totalReviews: number;
  totalCompletedJobs: number;
  acceptanceRate: number;
  rankScore: number;
  badgeTier: 'STANDARD' | 'SILVER' | 'GOLD_TOP_PRO';
  isEmergencyLocked: boolean;
}

export interface PaginatedReviews {
  content: ReviewItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const reviewService = {
  /**
   * Khách hàng gửi đánh giá cho đơn hàng đã hoàn tất
   */
  async submitReview(payload: CreateReviewPayload): Promise<ReviewItem> {
    const res = await apiClient.post<ApiResponse<ReviewItem>>(
      '/customer/reviews',
      payload
    );
    return res.data.data;
  },

  /**
   * Tra cứu đánh giá đã có của đơn hàng
   */
  async getReviewByBookingId(bookingId: number): Promise<ReviewItem | null> {
    const res = await apiClient.get<ApiResponse<ReviewItem>>(
      `/customer/reviews/booking/${bookingId}`
    );
    return res.data.data || null;
  },

  /**
   * Lấy danh sách đánh giá của thợ (công khai)
   */
  async getReviewsForMua(
    muaId: number,
    page = 0,
    size = 10
  ): Promise<PaginatedReviews> {
    const res = await apiClient.get<ApiResponse<PaginatedReviews>>(
      `/public/reviews/mua/${muaId}`,
      { params: { page, size } }
    );
    return res.data.data;
  },

  /**
   * Lấy tóm tắt điểm số Bayes và huy hiệu của thợ
   */
  async getMuaRatingSummary(muaId: number): Promise<MuaRatingSummary> {
    const res = await apiClient.get<ApiResponse<MuaRatingSummary>>(
      `/public/reviews/mua/${muaId}/summary`
    );
    return res.data.data;
  },
};
