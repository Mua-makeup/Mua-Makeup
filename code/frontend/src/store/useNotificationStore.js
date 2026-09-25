import { create } from 'zustand';
import { notificationSound } from '../utils/notificationSound';
import { notificationService } from '../services/notification.service';

const STORAGE_SOUND_KEY = 'agency_notification_sound';

const getSavedSoundSetting = () => {
  try {
    const raw = localStorage.getItem(STORAGE_SOUND_KEY);
    return raw !== 'false'; // default true
  } catch {
    return true;
  }
};

export const mapServerNotification = (item) => {
  const meta = item.metadata || {};
  return {
    id: item.id,
    type: item.type || 'NEW_BOOKING',
    title: item.title,
    content: item.content,
    bookingId: item.bookingId || meta.bookingId,
    bookingCode: item.bookingCode || meta.bookingCode,
    customerName: meta.customerName || meta.muaName || 'Khách hàng',
    customerPhone: meta.customerPhone || meta.muaPhone,
    servicePackageName: meta.servicePackageName || 'Gói dịch vụ',
    totalAmount: meta.totalAmount,
    bookingDate: meta.bookingDate,
    startTime: meta.startTime,
    staffId: meta.staffId,
    staffName: meta.staffName,
    role: meta.role,
    emergencyReason: meta.emergencyReason,
    emergencyTier: meta.emergencyTier,
    proofDocumentUrl: meta.proofDocumentUrl,
    muaName: meta.muaName,
    muaAvatar: meta.muaAvatar,
    inviteCode: meta.inviteCode,
    certName: meta.certName,
    imageUrl: meta.imageUrl,
    timestamp: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
    isRead: Boolean(item.isRead),
  };
};

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  isLoading: false,
  isSoundEnabled: getSavedSoundSetting(),

  get unreadCount() {
    return get().notifications.filter((n) => !n.isRead).length;
  },

  fetchNotifications: async (page = 0, size = 30) => {
    set({ isLoading: true });
    try {
      const res = await notificationService.getNotifications(page, size);
      const data = res?.data || res || {};
      const list = Array.isArray(data) ? data : data.content || [];
      const mapped = list.map(mapServerNotification);
      set({ notifications: mapped });
    } catch (err) {
      console.warn('[useNotificationStore] Failed to fetch notifications:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  addNotification: (item) => {
    const currentList = get().notifications;

    // Deduplication check: ONLY drop if exact same notification ID exists,
    // or same bookingId AND same notification type arrived within 5 seconds (prevent network duplicate packets)
    const isDuplicate = currentList.some((n) => {
      if (item.id && n.id && String(item.id) === String(n.id)) return true;
      if (
        item.bookingId &&
        n.bookingId &&
        String(item.bookingId) === String(n.bookingId) &&
        item.type === n.type
      ) {
        const timeDiff = Math.abs((item.timestamp || Date.now()) - (n.timestamp || Date.now()));
        if (timeDiff < 5000) return true;
      }
      return false;
    });

    if (isDuplicate) {
      if (get().isSoundEnabled && item.type === 'EMERGENCY_REASSIGNMENT_ALERT') {
        notificationSound.playEmergencyAlert();
      }
      return null;
    }

    const newNotif = {
      id: item.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: item.type || 'NEW_BOOKING',
      title: item.title,
      content: item.content || item.message,
      message: item.message,
      bookingId: item.bookingId,
      bookingCode: item.bookingCode,
      customerName: item.customerName || item.muaName,
      customerPhone: item.customerPhone || item.muaPhone,
      servicePackageName: item.servicePackageName,
      totalAmount: item.totalAmount,
      bookingDate: item.bookingDate,
      startTime: item.startTime,
      staffId: item.staffId,
      muaName: item.muaName,
      muaAvatar: item.muaAvatar,
      inviteCode: item.inviteCode,
      certName: item.certName,
      imageUrl: item.imageUrl,
      timestamp: item.timestamp || Date.now(),
      isRead: false,
    };

    const updated = [newNotif, ...currentList].slice(0, 50);
    set({ notifications: updated });

    if (get().isSoundEnabled) {
      if (item.type === 'EMERGENCY_REASSIGNMENT_ALERT') {
        notificationSound.playEmergencyAlert();
      } else {
        notificationSound.playBookingChime();
      }
    }

    return newNotif;
  },

  markAsRead: async (id) => {
    const updated = get().notifications.map((n) =>
      String(n.id) === String(id) ? { ...n, isRead: true } : n
    );
    set({ notifications: updated });

    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      console.warn('[useNotificationStore] Failed to mark as read on server:', err);
    }
  },

  toggleRead: async (id) => {
    const target = get().notifications.find((n) => String(n.id) === String(id));
    const nextReadState = target ? !target.isRead : true;

    const updated = get().notifications.map((n) =>
      String(n.id) === String(id) ? { ...n, isRead: nextReadState } : n
    );
    set({ notifications: updated });

    try {
      await notificationService.toggleRead(id);
    } catch (err) {
      console.warn('[useNotificationStore] Failed to toggle read on server:', err);
    }
  },

  deleteNotification: async (id) => {
    const updated = get().notifications.filter((n) => String(n.id) !== String(id));
    set({ notifications: updated });

    try {
      await notificationService.deleteNotification(id);
    } catch (err) {
      console.warn('[useNotificationStore] Failed to delete notification on server:', err);
    }
  },

  markAllAsRead: async () => {
    const updated = get().notifications.map((n) => ({ ...n, isRead: true }));
    set({ notifications: updated });

    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.warn('[useNotificationStore] Failed to mark all as read on server:', err);
    }
  },

  clearAll: async () => {
    set({ notifications: [] });

    try {
      await notificationService.clearAll();
    } catch (err) {
      console.warn('[useNotificationStore] Failed to clear all notifications on server:', err);
    }
  },

  toggleSound: () => {
    const nextState = !get().isSoundEnabled;
    try {
      localStorage.setItem(STORAGE_SOUND_KEY, String(nextState));
    } catch {}
    set({ isSoundEnabled: nextState });
    if (nextState) {
      notificationSound.playBookingChime();
    }
    return nextState;
  },
}));
