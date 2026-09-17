import { apiClient } from './api-client';

export const superAdminService = {
  // Duyệt chứng chỉ MUA
  verifyCertificate: (muaId, payload) =>
    apiClient.put(`/admin/muas/${muaId}/certificates/verify`, payload),

  // Master taxonomy
  getMasterCategories: () => apiClient.get('/master-categories'),
  getMakeupStyles: () => apiClient.get('/makeup-styles'),
};
