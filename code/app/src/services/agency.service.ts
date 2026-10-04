import { apiClient } from './api';

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
};
