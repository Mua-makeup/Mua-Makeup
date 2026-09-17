import { apiClient } from './api-client';

export const superAdminService = {
  // Lấy danh sách chứng chỉ MUA nộp lên
  getCertificates: (status) =>
    apiClient.get('/admin/muas/certificates', { params: { status: status || undefined } }),

  // Duyệt hoặc từ chối chứng chỉ MUA
  verifyCertificate: (muaId, payload) =>
    apiClient.put(`/admin/muas/${muaId}/certificates/verify`, payload),

  // Quản lý Studio Agency
  getAgencies: (params) => apiClient.get('/admin/agencies', { params }),
  verifyAgency: (agencyId, isVerified) =>
    apiClient.put(`/admin/agencies/${agencyId}/verify`, null, { params: { isVerified } }),

  // Master taxonomy
  getMasterCategories: () => apiClient.get('/master-categories'),
  getMakeupStyles: () => apiClient.get('/makeup-styles'),
};
