import { apiClient } from './api-client';

export const agencyService = {
  // Hồ sơ Studio
  getMyProfile: () => apiClient.get('/agencies/profile'),
  updateProfile: (data) => apiClient.put('/agencies/profile', data),
  updateDefaultCommission: (commissionRate) =>
    apiClient.put('/agencies/commission', { commissionRate }),

  // Gói dịch vụ
  getMyPackages: () => apiClient.get('/packages/my'),
  createPackage: (data) => apiClient.post('/packages', data),
  updatePackage: (id, data) => apiClient.put(`/packages/${id}`, data),
  deletePackage: (id) => apiClient.delete(`/packages/${id}`),
  togglePackageAvailability: (id, isAvailable) =>
    apiClient.patch(`/packages/${id}/availability?isAvailable=${isAvailable}`),

  // Quy trình & Add-ons
  getPackageItems: (packageId) => apiClient.get(`/packages/${packageId}/items`),
  addPackageItem: (packageId, data) => apiClient.post(`/packages/${packageId}/items`, data),
  updatePackageItem: (packageId, itemId, data) =>
    apiClient.put(`/packages/${packageId}/items/${itemId}`, data),
  deletePackageItem: (packageId, itemId) =>
    apiClient.delete(`/packages/${packageId}/items/${itemId}`),

  // Phụ phí
  getMySurcharges: () => apiClient.get('/surcharges/my-surcharges'),
  createSurcharge: (data) => apiClient.post('/surcharges', data),
  updateSurcharge: (id, data) => apiClient.put(`/surcharges/${id}`, data),
  deleteSurcharge: (id) => apiClient.delete(`/surcharges/${id}`),

  // Quy tắc & Báo cáo Tăng ca (Overtime)
  getOvertimeRules: () => apiClient.get('/agency/overtime-rules'),
  createOrUpdateOvertimeRule: (data) => apiClient.post('/agency/overtime-rules', data),
  deleteOvertimeRule: (ruleId) => apiClient.delete(`/agency/overtime-rules/${ruleId}`),
  getOvertimeReports: (status, page = 0, size = 20) =>
    apiClient.get('/agency/overtime-reports', { params: { status, page, size } }),
  reviewOvertimeReport: (reportId, data) =>
    apiClient.post(`/agency/overtime-reports/${reportId}/review`, data),

  // Tuyển dụng & Mã mời QR 72h
  createInvitation: (data) => apiClient.post('/agencies/invitations', data),
  getInvitations: () => apiClient.get('/agencies/invitations'),
  cancelInvitation: (inviteCode) => apiClient.delete(`/agencies/invitations/${inviteCode}`),

  // Quản lý Nhân viên Studio
  getStaffList: (status, page = 0, size = 20) =>
    apiClient.get('/agencies/staff', { params: { status, page, size } }),
  getStaffDetail: (staffId) => apiClient.get(`/agencies/staff/${staffId}`),
  reviewStaffApplication: (staffId, data) =>
    apiClient.put(`/agencies/staff/${staffId}/review`, data),
  updateStaffStatus: (staffId, data) =>
    apiClient.put(`/agencies/staff/${staffId}/status`, data),
  updateStaffCommission: (staffId, data) =>
    apiClient.put(`/agencies/staff/${staffId}/commission`, data),
  removeStaff: (staffId) => apiClient.delete(`/agencies/staff/${staffId}`),

  // Phân quyền Style & Gói dịch vụ cho thợ
  getStaffStyles: (staffId) => apiClient.get(`/agencies/staff/${staffId}/styles`),
  assignStaffStyles: (staffId, data) =>
    apiClient.put(`/agencies/staff/${staffId}/styles`, data),
  getStaffPackages: (staffId) => apiClient.get(`/agencies/staff/${staffId}/packages`),
  assignStaffPackages: (staffId, data) =>
    apiClient.put(`/agencies/staff/${staffId}/packages`, data),

  // Ma trận Xếp Ca Tuần
  createShift: (data) => apiClient.post('/agencies/shifts', data),
  getWeeklyShiftMatrix: () => apiClient.get('/agencies/shifts/matrix'),
  deleteShift: (shiftId) => apiClient.delete(`/agencies/shifts/${shiftId}`),
};
