import { apiClient } from './api-client';

export const notificationService = {
  getNotifications: (page = 0, size = 20) =>
    apiClient.get(`/notifications?page=${page}&size=${size}`),

  getUnreadCount: () => apiClient.get('/notifications/unread-count'),

  markAsRead: (id) => apiClient.patch(`/notifications/${id}/read`),

  toggleRead: (id) => apiClient.patch(`/notifications/${id}/toggle-read`),

  markAllAsRead: () => apiClient.patch('/notifications/read-all'),

  deleteNotification: (id) => apiClient.delete(`/notifications/${id}`),

  clearAll: () => apiClient.delete('/notifications/clear-all'),
};
