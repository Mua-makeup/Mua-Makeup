import { apiClient } from './api';
import { ApiResponse } from './auth.service';

export interface AssignedStyle {
  id: number;
  styleCode: string;
  styleName: string;
  isQualified?: boolean;
}

export interface AgencyStaffProfile {
  id: number;
  agencyId: number;
  agencyName: string;
  agencyCode?: string;
  agencyPhone?: string;
  agencyAddress?: string;
  agencyLogoUrl?: string;
  muaId: number;
  fullName: string;
  avatarUrl?: string;
  phoneNumber?: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'LEFT';
  isActive: boolean;
  agreedCommissionRate?: number;
  note?: string;
  joinedAt?: string;
  assignedStyles?: AssignedStyle[];
}

export const staffProfileService = {
  /** Lấy thông tin chi tiết hồ sơ nhân sự Studio của tài khoản hiện tại */
  async getMyStaffProfile(): Promise<AgencyStaffProfile> {
    const res = await apiClient.get<ApiResponse<AgencyStaffProfile>>('/agencies/staff/me');
    return res.data.data;
  },
};
