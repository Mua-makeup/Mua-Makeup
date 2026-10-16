import { Platform } from 'react-native';
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

export interface UpdateReviewPayload {
  rating: number; // 1 - 5
  comment?: string;
  imageUrls?: string[];
}

export interface ReviewItem {
  id: number;
  bookingId: number;
  bookingCode?: string;
  packageName?: string;
  categoryName?: string;
  styleName?: string;
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

export interface CategoryReviewCount {
  categoryId: number;
  categoryName: string;
  count: number;
}

export interface MuaRatingSummary {
  muaId: number;
  ratingAvg: number | null;
  bayesianRating: number;
  rollingRating: number;
  totalReviews: number;
  totalCompletedJobs: number;
  acceptanceRate: number;
  rankScore: number;
  badgeTier: 'STANDARD' | 'SILVER' | 'GOLD_TOP_PRO';
  isEmergencyLocked: boolean;
  countWithImages?: number;
  count5Star?: number;
  count4Star?: number;
  count3Star?: number;
  count2Star?: number;
  count1Star?: number;
  categoryBreakdown?: CategoryReviewCount[];
}

export interface ReviewFilterParams {
  rating?: number;
  hasImages?: boolean;
  categoryId?: number;
  page?: number;
  size?: number;
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
   * Khách hàng cập nhật đánh giá đã gửi
   */
  async updateReview(reviewId: number, payload: UpdateReviewPayload): Promise<ReviewItem> {
    const res = await apiClient.put<ApiResponse<ReviewItem>>(
      `/customer/reviews/${reviewId}`,
      payload
    );
    return res.data.data;
  },

  /**
   * Tải ảnh đánh giá lên Cloudinary qua Backend
   */
  async uploadReviewImages(localUris: string[]): Promise<string[]> {
    if (!localUris || localUris.length === 0) return [];

    const formData = new FormData();
    const isWeb = Platform.OS === 'web' || typeof window !== 'undefined';

    for (let i = 0; i < localUris.length; i++) {
      const uri = localUris[i];
      const filename = uri.split('/').pop()?.split('?')[0] || `review_photo_${Date.now()}_${i}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      if (isWeb || uri.startsWith('blob:') || uri.startsWith('data:')) {
        try {
          const resp = await fetch(uri);
          const blob = await resp.blob();
          formData.append('files', blob, filename);
          formData.append('file', blob, filename);
        } catch {
          const fileObj = {
            uri,
            name: filename,
            type: mimeType,
          };
          // @ts-ignore
          formData.append('files', fileObj);
          // @ts-ignore
          formData.append('file', fileObj);
        }
      } else {
        const fileObj = {
          uri,
          name: filename,
          type: mimeType,
        };
        // @ts-ignore
        formData.append('files', fileObj);
        // @ts-ignore
        formData.append('file', fileObj);
      }
    }

    const res = await apiClient.post<ApiResponse<string[]>>(
      '/customer/reviews/upload-images',
      formData
    );
    return res.data?.data || [];
  },

  /**
   * Tra cứu đánh giá đã có của đơn hàng
   */
  async getReviewByBookingId(bookingId: number): Promise<ReviewItem | null> {
    try {
      const res = await apiClient.get<ApiResponse<ReviewItem>>(
        `/customer/reviews/booking/${bookingId}`
      );
      return res.data.data || null;
    } catch {
      return null;
    }
  },

  /**
   * Lấy danh sách đánh giá của thợ (công khai, hỗ trợ lọc theo sao và hình ảnh)
   */
  async getReviewsForMua(
    muaId: number,
    paramsOrPage?: number | ReviewFilterParams,
    maybeSize?: number
  ): Promise<PaginatedReviews> {
    let params: Record<string, any> = { page: 0, size: 10 };

    if (typeof paramsOrPage === 'number') {
      params.page = paramsOrPage;
      params.size = maybeSize ?? 10;
    } else if (paramsOrPage && typeof paramsOrPage === 'object') {
      params.page = paramsOrPage.page ?? 0;
      params.size = paramsOrPage.size ?? 10;
      if (paramsOrPage.rating != null) params.rating = paramsOrPage.rating;
      if (paramsOrPage.hasImages != null) params.hasImages = paramsOrPage.hasImages;
      if (paramsOrPage.categoryId != null) params.categoryId = paramsOrPage.categoryId;
    }

    const res = await apiClient.get<ApiResponse<PaginatedReviews>>(
      `/public/reviews/mua/${muaId}`,
      { params }
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

  /**
   * Lấy danh sách đánh giá công khai của Studio / Agency
   */
  async getReviewsForAgency(
    agencyId: number,
    page: number = 0,
    size: number = 10
  ): Promise<PaginatedReviews> {
    const res = await apiClient.get<ApiResponse<PaginatedReviews>>(
      `/public/reviews/agency/${agencyId}`,
      { params: { page, size } }
    );
    return res.data?.data || { content: [], totalElements: 0, totalPages: 0, size, number: page };
  },
};
