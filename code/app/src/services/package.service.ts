import { apiClient } from './api';
import { ApiResponse } from './auth.service';
import { MakeupStyle } from './taxonomy.service';

export interface PackageItem {
  id: number;
  packageId?: number;
  itemType?: 'COMPONENT' | 'ADD_ON' | 'INCLUDED' | 'OPTIONAL_ADDON';
  itemName: string;
  description?: string;
  durationMinutes?: number;
  stepOrder?: number;
  itemPrice?: number;
  isRequired?: boolean;
  isActive?: boolean;
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

export interface CreatePackageItemReq {
  itemType: 'COMPONENT' | 'ADD_ON' | 'INCLUDED' | 'OPTIONAL_ADDON';
  itemName: string;
  stepOrder: number;
  itemPrice: number;
  durationMinutes?: number;
  isRequired?: boolean;
  isActive?: boolean;
}

export interface CreatePackageReq {
  masterCategoryId: number;
  packageName: string;
  description?: string;
  price: number;
  estimatedDurationMinutes: number;
  styleIds?: number[];
  items?: CreatePackageItemReq[];
}

export interface UpdatePackageReq {
  masterCategoryId: number;
  packageName: string;
  description?: string;
  price: number;
  estimatedDurationMinutes: number;
  isAvailable?: boolean;
  styleIds?: number[];
}

export const packageService = {
  /** Lấy danh sách gói dịch vụ có lọc theo category, muaId, agencyId (Dành cho Khám phá) */
  async listPackages(params?: PackageFilterParams): Promise<PackageSummary[]> {
    const res = await apiClient.get<ApiResponse<PackageSummary[]>>('/packages', {
      params: {
        availableOnly: true,
        ...params,
      },
    });
    return res.data?.data || [];
  },

  /** Lấy danh sách toàn bộ gói của Thợ MUA đang đăng nhập */
  async listMyPackages(): Promise<PackageSummary[]> {
    const res = await apiClient.get<ApiResponse<PackageSummary[]>>('/packages/my');
    return res.data?.data || [];
  },

  /** Lấy chi tiết gói dịch vụ bao gồm các bước items thực hiện */
  async getPackageById(id: number): Promise<PackageDetail> {
    const res = await apiClient.get<ApiResponse<PackageDetail>>(`/packages/${id}`);
    return res.data.data;
  },

  /** Tạo gói dịch vụ cá nhân mới */
  async createPackage(req: CreatePackageReq): Promise<PackageDetail> {
    const res = await apiClient.post<ApiResponse<PackageDetail>>('/packages', req);
    return res.data.data;
  },

  /** Cập nhật thông tin gói dịch vụ */
  async updatePackage(id: number, req: UpdatePackageReq): Promise<PackageDetail> {
    const res = await apiClient.put<ApiResponse<PackageDetail>>(`/packages/${id}`, req);
    return res.data.data;
  },

  /** Bật / Tắt trạng thái mở nhận ca của gói tức thời */
  async toggleAvailability(id: number, isAvailable: boolean): Promise<PackageDetail> {
    const res = await apiClient.patch<ApiResponse<PackageDetail>>(`/packages/${id}/availability`, null, {
      params: { isAvailable },
    });
    return res.data.data;
  },

  /** Xóa gói dịch vụ */
  async deletePackage(id: number): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(`/packages/${id}`);
  },

  /** Lấy danh sách bước thực hiện & addon của gói */
  async getPackageItems(packageId: number): Promise<PackageItem[]> {
    const res = await apiClient.get<ApiResponse<PackageItem[]>>(`/packages/${packageId}/items`);
    return res.data?.data || [];
  },

  /** Thêm mới 1 bước / Add-on vào gói */
  async createPackageItem(packageId: number, req: CreatePackageItemReq): Promise<PackageItem> {
    const res = await apiClient.post<ApiResponse<PackageItem>>(`/packages/${packageId}/items`, req);
    return res.data.data;
  },

  /** Cập nhật 1 bước / Add-on của gói */
  async updatePackageItem(packageId: number, itemId: number, req: CreatePackageItemReq): Promise<PackageItem> {
    const res = await apiClient.put<ApiResponse<PackageItem>>(`/packages/${packageId}/items/${itemId}`, req);
    return res.data.data;
  },

  /** Xóa 1 bước / Add-on khỏi gói */
  async deletePackageItem(packageId: number, itemId: number): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(`/packages/${packageId}/items/${itemId}`);
  },
};
