import { apiClient } from './api-client';

const isNumericId = (id) => id != null && /^\d+$/.test(String(id).trim());

export const notificationService = {
  getNotifications: (page = 0, size = 20) =>
    apiClient.get(`/notifications?page=${page}&size=${size}`),

  getUnreadCount: () => apiClient.get('/notifications/unread-count'),

  markAsRead: (id) => {
    if (!isNumericId(id)) {
      return Promise.resolve({ data: null, message: 'Local notification marked as read' });
    }
    return apiClient.patch(`/notifications/${id}/read`);
  },

  toggleRead: (id) => {
    if (!isNumericId(id)) {
      return Promise.resolve({ data: null, message: 'Local notification toggled' });
    }
    return apiClient.patch(`/notifications/${id}/toggle-read`);
  },

  markAllAsRead: () => apiClient.patch('/notifications/read-all'),

  deleteNotification: (id) => {
    if (!isNumericId(id)) {
      return Promise.resolve({ data: null, message: 'Local notification deleted' });
    }
    return apiClient.delete(`/notifications/${id}`);
  },

  clearAll: () => apiClient.delete('/notifications/clear-all'),
};
