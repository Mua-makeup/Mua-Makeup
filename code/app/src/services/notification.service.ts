import { apiClient } from './api';

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  content: string;
  bookingId?: number | null;
  bookingCode?: string | null;
  agencyId?: number | null;
  userId?: number | null;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any> | null;
}

export interface NotificationPageResponse {
  content: NotificationItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  last: boolean;
  size: number;
}

export const notificationService = {
  /**
   * Lấy danh sách thông báo phân trang từ CSDL
   */
  async getNotifications(
    page: number = 0,
    size: number = 20,
    isRead?: boolean,
    type?: string
  ): Promise<NotificationPageResponse> {
    const params: Record<string, any> = { page, size };
    if (typeof isRead === 'boolean') {
      params.isRead = isRead;
    }
    if (type) {
      params.type = type;
    }
    const res = await apiClient.get('/notifications', { params });
    return res.data?.data || { content: [], totalElements: 0, totalPages: 0, number: 0, last: true, size };
  },

  /**
   * Lấy số lượng thông báo chưa đọc thực tế để gán vào badge đỏ
   */
  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get('/notifications/unread-count');
    return res.data?.data?.unreadCount || 0;
  },

  /**
   * Đánh dấu 1 thông báo là đã đọc
   */
  async markAsRead(id: number): Promise<NotificationItem> {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data?.data;
  },

  /**
   * Bật/tắt trạng thái đã đọc của 1 thông báo
   */
  async toggleRead(id: number): Promise<NotificationItem> {
    const res = await apiClient.patch(`/notifications/${id}/toggle-read`);
    return res.data?.data;
  },

  /**
   * Đánh dấu toàn bộ thông báo của người dùng là đã đọc
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },

  /**
   * Xóa 1 thông báo khỏi lịch sử
   */
  async deleteNotification(id: number): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  },

  /**
   * Xóa toàn bộ thông báo trong lịch sử
   */
  async clearAll(): Promise<void> {
    await apiClient.delete('/notifications/clear-all');
  },
};
