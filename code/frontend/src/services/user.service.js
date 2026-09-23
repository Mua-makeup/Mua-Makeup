import { apiClient } from './api-client';

export const userService = {
  /**
   * Lấy thông tin tài khoản hiện tại
   * GET /api/v1/users/me
   */
  getCurrentUser: () => apiClient.get('/users/me'),

  /**
   * Cập nhật thông tin cá nhân cơ bản (Họ tên, Email, Giới tính)
   * PUT /api/v1/users/profile
   */
  updateProfile: (data) => apiClient.put('/users/profile', data),

  /**
   * Upload ảnh đại diện lên Cloudinary và lưu vào auth_schema.users
   * POST /api/v1/users/avatar
   */
  uploadAvatar: (formData) =>
    apiClient.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};
