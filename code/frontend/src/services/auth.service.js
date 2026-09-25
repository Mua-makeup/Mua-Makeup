import { apiClient } from './api-client';

export const authService = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (payload) => apiClient.post('/auth/register', payload),
  logout: (refreshToken) => apiClient.post('/auth/logout', refreshToken ? { refreshToken } : {}),
  getCurrentUser: () => apiClient.get('/auth/me'),
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh-token', { refreshToken }),
  changePassword: (data) => apiClient.post('/auth/change-password', data),
  updateLanguage: (language) => apiClient.put('/auth/language', { language }),
  verify2Fa: (payload) => apiClient.post('/auth/verify-2fa', payload),
  resend2Fa: (payload) => apiClient.post('/auth/resend-2fa', payload),
};
