import { apiClient } from './api';
import { ApiResponse } from './auth.service';
import { MakeupStyle } from './taxonomy.service';

export interface PackageItem {
  id: number;
  packageId?: number;
  itemName: string;
  description?: string;
  durationMinutes?: number;
  stepOrder?: number;
}

export interface PackageSummary {
  id: number;
  masterCategoryId?: number;
  categoryName?: string;
  agencyId?: number | null;
  agencyName?: string | null;
  muaId?: number | null;
  muaName?: string | null;
  packageName: string;
  price: number;
  estimatedDurationMinutes?: number;
  durationMinutes?: number;
  isAvailable?: boolean;
  styles?: MakeupStyle[];
  coverImageUrl?: string;
}

export interface PackageDetail extends PackageSummary {
  description?: string;
  items?: PackageItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageFilterParams {
  agencyId?: number;
  muaId?: number;
  categoryId?: number;
  availableOnly?: boolean;
}

export const packageService = {
  /** Lấy danh sách gói dịch vụ có lọc theo category, muaId, agencyId */
  async listPackages(params?: PackageFilterParams): Promise<PackageSummary[]> {
    const res = await apiClient.get<ApiResponse<PackageSummary[]>>('/packages', {
      params: {
        availableOnly: true,
        ...params,
      },
    });
    return res.data?.data || [];
  },

  /** Lấy chi tiết gói dịch vụ bao gồm các bước items thực hiện */
  async getPackageById(id: number): Promise<PackageDetail> {
    const res = await apiClient.get<ApiResponse<PackageDetail>>(`/packages/${id}`);
    return res.data.data;
  },
};
