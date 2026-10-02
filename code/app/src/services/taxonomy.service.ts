import { apiClient } from './api';
import { ApiResponse } from './auth.service';

export interface MasterCategory {
  id: number;
  categoryName: string;
  categoryCode?: string;
  description?: string;
  isActive?: boolean;
}

export interface MakeupStyle {
  id: number;
  styleId?: number;
  styleName: string;
  description?: string;
  isActive?: boolean;
  categoryId?: number;
  categoryName?: string;
}

export const taxonomyService = {
  /** Lấy danh mục dịch vụ gốc (Cô dâu, Dự tiệc, Kỷ yếu, Đi chơi, Concept...) */
  async getActiveCategories(): Promise<MasterCategory[]> {
    const res = await apiClient.get<ApiResponse<MasterCategory[]>>('/master-categories');
    return res.data?.data || [];
  },

  /** Lấy danh sách phong cách trang điểm sở trường (Douyin, Hàn Quốc, Tây Âu, Cổ điển...) */
  async getActiveStyles(): Promise<MakeupStyle[]> {
    const res = await apiClient.get<ApiResponse<MakeupStyle[]>>('/makeup-styles');
    return res.data?.data || [];
  },

  /**
   * Lấy phong cách trang điểm theo danh mục dịch vụ.
   * Lấy tất cả styles nếu không có categoryId, hoặc không có kết quả riêng.
   */
  async getStylesByCategory(categoryId?: number): Promise<MakeupStyle[]> {
    try {
      const res = await apiClient.get<ApiResponse<MakeupStyle[]>>('/makeup-styles', {
        params: categoryId ? { categoryId } : undefined,
      });
      return res.data?.data || [];
    } catch {
      return [];
    }
  },
};

