import { apiClient } from './api';
import { ApiResponse } from './auth.service';

export interface MuaStyle {
  id: number;
  styleId?: number;
  styleName: string;
  isPrimary?: boolean;
}

export interface MuaCertificate {
  id: number;
  certificateName: string;
  issuingOrganization?: string;
  issueDate?: string;
  certificateImageUrl?: string;
  isVerified?: boolean;
}

export interface MuaPublicProfile {
  muaId: number;
  muaCode?: string;
  fullName: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  experienceYears?: number;
  maxServiceRadiusKm?: number;
  ratingAverage?: number;
  totalReviews?: number;
  totalCompletedJobs?: number;
  portfolioImages?: string[];
  baseAddressText?: string;
  baseAddressLat?: number;
  baseAddressLng?: number;
  isSurgeEnabled?: boolean;
  certificates?: MuaCertificate[];
  styles?: MuaStyle[];
  updatedAt?: string;
}

export interface PortfolioShowcase {
  id: number;
  muaId?: number;
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  additionalImages?: string[];
  styleId?: number;
  styleName?: string;
  packageId?: number;
  packageName?: string;
  isFeatured?: boolean;
  createdAt?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  isLast: boolean;
}

export interface UpdateMuaProfileReq {
  bio?: string;
  experienceYears: number;
  maxServiceRadiusKm: number;
  baseAddressText?: string;
}

export const muaProfileService = {
  /** Lấy thông tin công khai hồ sơ thợ MUA */
  async getPublicProfile(muaId: number): Promise<MuaPublicProfile> {
    const res = await apiClient.get<ApiResponse<MuaPublicProfile>>(`/muas/${muaId}/profile`);
    return res.data.data;
  },

  /** Lấy thông tin hồ sơ thợ MUA của tài khoản đang đăng nhập */
  async getMyProfile(): Promise<MuaPublicProfile> {
    const res = await apiClient.get<ApiResponse<MuaPublicProfile>>('/muas/my-profile');
    return res.data.data;
  },

  /** Cập nhật thông tin hồ sơ nghề nghiệp của thợ MUA */
  async updateMyProfile(req: UpdateMuaProfileReq): Promise<MuaPublicProfile> {
    const res = await apiClient.put<ApiResponse<MuaPublicProfile>>('/muas/my-profile', req);
    return res.data.data;
  },

  /** Tải lên chứng chỉ bằng cấp nghề nghiệp */
  async uploadCertificate(formData: FormData): Promise<MuaCertificate> {
    const res = await apiClient.post<ApiResponse<MuaCertificate>>('/muas/my-profile/certificates', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  /** Tải lên một lúc nhiều ảnh vào bộ sưu tập portfolio (Cloudinary) */
  async uploadPortfolioImages(formData: FormData): Promise<string[]> {
    const res = await apiClient.post<ApiResponse<string[]>>('/muas/my-profile/portfolio-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  /** Xóa một ảnh khỏi bộ sưu tập portfolio */
  async deletePortfolioImage(imageUrl: string): Promise<string[]> {
    const res = await apiClient.delete<ApiResponse<string[]>>('/muas/my-profile/portfolio-images', {
      params: { imageUrl },
    });
    return res.data.data;
  },

  /**
   * Lấy danh sách ảnh mẫu tác phẩm đã làm
   * Hỗ trợ lọc theo package_id để hiển thị đúng ảnh của dịch vụ đang chọn
   */
  async getPublicPortfolios(
    muaId: number,
    params?: {
      package_id?: number;
      style_id?: number;
      is_featured?: boolean;
      page?: number;
      size?: number;
    }
  ): Promise<PageResponse<PortfolioShowcase>> {
    const res = await apiClient.get<ApiResponse<PageResponse<PortfolioShowcase>>>(
      `/muas/${muaId}/portfolios`,
      {
        params: {
          page: 0,
          size: 12,
          ...params,
        },
      }
    );
    return res.data.data;
  },
};
