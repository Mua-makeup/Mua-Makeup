import { Platform } from 'react-native';
import { apiClient } from './api';
import { ApiResponse } from './auth.service';

export interface AssignedStyle {
  id: number;
  styleCode: string;
  styleName: string;
  isQualified?: boolean;
}

export interface StaffCertificate {
  certName: string;
  imageUrl: string;
  isVerified?: boolean;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  notes?: string;
  uploadedAt?: string;
  scope?: 'PLATFORM' | 'AGENCY';
  verifierType?: 'SUPER_ADMIN' | 'AGENCY_ADMIN';
  verifierName?: string;
  agencyId?: number;
  agencyName?: string;
  verifiedAt?: string;
  rejectionReason?: string;
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
  certificates?: StaffCertificate[];
}

export const staffProfileService = {
  /** Lấy thông tin chi tiết hồ sơ nhân sự Studio của tài khoản hiện tại */
  async getMyStaffProfile(): Promise<AgencyStaffProfile> {
    const res = await apiClient.get<ApiResponse<AgencyStaffProfile>>('/agencies/staff/me');
    return res.data.data;
  },

  /** Thợ Studio nộp chứng chỉ nghề nghiệp lên Studio */
  async uploadStaffCertificate(formData: FormData): Promise<StaffCertificate> {
    const config: { headers?: Record<string, string> } = {};
    if (Platform.OS !== 'web') {
      config.headers = { 'Content-Type': 'multipart/form-data' };
    }
    const res = await apiClient.post<ApiResponse<StaffCertificate>>(
      '/agencies/staff/me/certificates',
      formData,
      config
    );
    return res.data.data;
  },

  /** Thợ Studio xóa chứng chỉ nghề nghiệp */
  async deleteStaffCertificate(certName: string): Promise<void> {
    await apiClient.delete('/agencies/staff/me/certificates', {
      params: { certName },
    });
  },
};
