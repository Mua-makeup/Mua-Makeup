import { apiClient } from './api';
import { PortfolioShowcase } from './mua-profile.service';

export interface AgencyPublicProfile {
  id: number;
  ownerId?: number;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  agencyCode: string;
  agencyName: string;
  logoUrl?: string;
  hotline?: string;
  addressStreet?: string;
  district?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  isVerified?: boolean;
  ratingAvg?: number;
  bayesianRating?: number;
  totalReviews?: number;
  createdAt?: string;
}

export const agencyService = {
  /**
   * Lấy danh sách các Studio / Viện Áo Cưới công khai
   */
  async getPublicAgencies(limit: number = 20): Promise<AgencyPublicProfile[]> {
    try {
      const response = await apiClient.get('/agencies', {
        params: { limit },
      });
      return response.data?.data || [];
    } catch (error) {
      console.warn('[agencyService] Lỗi lấy danh sách studio:', error);
      return [];
    }
  },

  /**
   * Lấy chi tiết hồ sơ Studio theo ID
   */
  async getAgencyProfileById(agencyId: number): Promise<AgencyPublicProfile | null> {
    try {
      const response = await apiClient.get(`/agencies/${agencyId}/profile`);
      return response.data?.data || null;
    } catch (error) {
      console.warn(`[agencyService] Lỗi lấy thông tin studio ${agencyId}:`, error);
      return null;
    }
  },

  /**
   * Lấy danh sách bộ sưu tập tác phẩm / ảnh mẫu công khai của Studio
   */
  async getPublicAgencyPortfolios(
    agencyId: number,
    params?: {
      packageId?: number;
      styleId?: number;
      isFeatured?: boolean;
      page?: number;
      size?: number;
    }
  ): Promise<PortfolioShowcase[]> {
    try {
      const response = await apiClient.get(`/agencies/${agencyId}/portfolios`, {
        params: {
          package_id: params?.packageId,
          style_id: params?.styleId,
          is_featured: params?.isFeatured,
          page: params?.page ?? 0,
          size: params?.size ?? 50,
        },
      });
      const data = response.data?.data;
      return data?.content || [];
    } catch (error) {
      console.warn(`[agencyService] Lỗi lấy portfolio studio ${agencyId}:`, error);
      return [];
    }
  },
};
