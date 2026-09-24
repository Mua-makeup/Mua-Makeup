import { apiClient } from './api-client';

export const superAdminService = {
  // Lấy danh sách chứng chỉ MUA nộp lên
  getCertificates: (params) =>
    apiClient.get('/admin/muas/certificates', {
      params: typeof params === 'string' ? { status: params || undefined } : params,
    }),

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
  getAllMasterCategories: () => apiClient.get('/admin/master-categories/all'),
  createMasterCategory: (payload) => apiClient.post('/admin/master-categories', payload),
  updateMasterCategory: (id, payload) => apiClient.put(`/admin/master-categories/${id}`, payload),
  toggleCategoryStatus: (id, isActive) =>
    apiClient.patch(`/admin/master-categories/${id}/status`, null, { params: { isActive } }),
  getAllMakeupStyles: () => apiClient.get('/admin/makeup-styles/all'),
  createMakeupStyle: (payload) => apiClient.post('/admin/makeup-styles', payload),
  updateMakeupStyle: (id, payload) => apiClient.put(`/admin/makeup-styles/${id}`, payload),
  toggleStyleStatus: (id, isActive) =>
    apiClient.patch(`/admin/makeup-styles/${id}/status`, null, { params: { isActive } }),

  // Platform Bookings Monitoring
  getBookings: (params) => apiClient.get('/admin/bookings', { params }),
  getBookingStats: () => apiClient.get('/admin/bookings/stats'),
  getBookingDetail: (id) => apiClient.get(`/admin/bookings/${id}`),
  getBookingHistory: (id) => apiClient.get(`/bookings/${id}/history`),

  // Platform Users Management
  getUsers: (params) => apiClient.get('/admin/users', { params }),
  createUser: (payload) => apiClient.post('/admin/users', payload),
  updateUserStatus: (id, active) => apiClient.put(`/admin/users/${id}/status`, null, { params: { active } }),

  // Quản lý Studio Agency
  createAgency: (payload) => apiClient.post('/admin/agencies', payload),

  // Dynamic & Surge Pricing Management
  getSurgeRules: () => apiClient.get('/admin/pricing/surge-rules'),
  createSurgeRule: (data) => apiClient.post('/admin/pricing/surge-rules', data),
  updateSurgeRule: (id, data) => apiClient.put(`/admin/pricing/surge-rules/${id}`, data),
  toggleSurgeRuleStatus: (id, isActive) =>
    apiClient.patch(`/admin/pricing/surge-rules/${id}/status`, null, { params: { isActive } }),
  deleteSurgeRule: (id) => apiClient.delete(`/admin/pricing/surge-rules/${id}`),
  deleteRule: (id) => apiClient.delete(`/admin/pricing/surge-rules/${id}`),
  getH3SurgeStatus: () => apiClient.get('/admin/pricing/surge-rules/h3-status'),
  toggleH3Surge: (enabled) => apiClient.post(`/admin/pricing/surge-rules/toggle-h3?enabled=${enabled}`),
};

