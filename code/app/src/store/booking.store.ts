import { create } from 'zustand';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { websocketService } from '@/services/websocket.service';
import { useNotificationStore } from '@/store/notification.store';
import {
  bookingService,
  CustomerBookingItem,
  BookingStatusType,
  ScheduledBookingCreatedRes,
} from '@/services/booking.service';
import {
  pricingService,
  InvoicePreviewRes,
  DistanceMatrixRes,
} from '@/services/pricing.service';
import { PreviewInvoicePayload } from '@/schemas/pricing-preview.schema';
import { CreateBookingFormValues } from '@/schemas/booking-create.schema';
import { getTodayVN } from '@/utils/date';

interface BookingStoreState {
  // Form State
  packageId: number | null;
  providerId: number | null;
  providerType: 'FREELANCER' | 'AGENCY';
  selectedDate: string; // YYYY-MM-DD
  selectedTimeSlot: string; // HH:mm
  destinationAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  selectedAddOnIds: number[];
  note: string;
  voucherCode: string;

  // Invoice & Distance State
  distanceInfo: DistanceMatrixRes | null;
  invoicePreview: InvoicePreviewRes | null;
  isCalculatingPrice: boolean;
  priceError: string | null;

  // My Bookings State
  activeTab: 'UPCOMING' | 'HISTORY';
  upcomingBookings: CustomerBookingItem[];
  historyBookings: CustomerBookingItem[];
  isLoadingBookings: boolean;
  isRefreshingBookings: boolean;

  // Actions
  setPackageAndProvider: (packageId: number, providerId: number, providerType?: 'FREELANCER' | 'AGENCY') => void;
  setDate: (date: string) => void;
  setTimeSlot: (timeSlot: string) => void;
  setDestination: (address: string, lat: number, lng: number) => void;
  toggleAddOn: (addonId: number) => void;
  setNote: (note: string) => void;
  setVoucherCode: (code: string) => void;
  setActiveTab: (tab: 'UPCOMING' | 'HISTORY') => void;

  // API Triggers
  fetchInvoicePreview: () => Promise<void>;
  submitBooking: () => Promise<ScheduledBookingCreatedRes & { id: number; bookingId: number }>;
  fetchMyBookings: (isRefresh?: boolean) => Promise<void>;
  cancelBooking: (bookingId: number, reason: string) => Promise<void>;
  resetBookingForm: () => void;
}

export const useBookingStore = create<BookingStoreState>((set, get) => ({
  packageId: null,
  providerId: null,
  providerType: 'FREELANCER',
  selectedDate: '',
  selectedTimeSlot: '',
  destinationAddress: '',
  destinationLatitude: 0,
  destinationLongitude: 0,
  selectedAddOnIds: [],
  note: '',
  voucherCode: '',

  distanceInfo: null,
  invoicePreview: null,
  isCalculatingPrice: false,
  priceError: null,

  activeTab: 'UPCOMING',
  upcomingBookings: [],
  historyBookings: [],
  isLoadingBookings: false,
  isRefreshingBookings: false,

  setPackageAndProvider: (packageId, providerId, providerType = 'FREELANCER') => {
    set({ packageId, providerId, providerType });
    get().fetchInvoicePreview();
  },

  setDate: (date) => {
    set({ selectedDate: date });
    get().fetchInvoicePreview();
  },

  setTimeSlot: (timeSlot) => {
    set({ selectedTimeSlot: timeSlot });
    get().fetchInvoicePreview();
  },

  setDestination: (address, lat, lng) => {
    set({
      destinationAddress: address,
      destinationLatitude: lat,
      destinationLongitude: lng,
    });
    get().fetchInvoicePreview();
  },

  toggleAddOn: (addonId) => {
    const current = get().selectedAddOnIds;
    const exists = current.includes(addonId);
    const updated = exists ? current.filter((id) => id !== addonId) : [...current, addonId];
    set({ selectedAddOnIds: updated });
    get().fetchInvoicePreview();
  },

  setNote: (note) => set({ note }),

  setVoucherCode: (voucherCode) => {
    set({ voucherCode });
    get().fetchInvoicePreview();
  },

  setActiveTab: (activeTab) => set({ activeTab }),

  fetchInvoicePreview: async () => {
    const {
      packageId,
      providerId,
      providerType,
      selectedDate,
      selectedTimeSlot,
      destinationLatitude,
      destinationLongitude,
      selectedAddOnIds,
      voucherCode,
    } = get();

    if (!packageId || !providerId) return;
    if (!destinationLatitude || !destinationLongitude || destinationLatitude === 0 || destinationLongitude === 0) {
      set({ distanceInfo: null, invoicePreview: null, isCalculatingPrice: false });
      return;
    }

    set({ isCalculatingPrice: true, priceError: null });

    try {
      const hasValidDateTime = Boolean(selectedDate && selectedTimeSlot);
      const bookingDateTime = hasValidDateTime ? `${selectedDate}T${selectedTimeSlot}:00` : null;

      const payload: PreviewInvoicePayload = {
        packageId,
        providerId,
        providerType,
        bookingTime: bookingDateTime,
        customerLatitude: destinationLatitude,
        customerLongitude: destinationLongitude,
        addOnItemIds: selectedAddOnIds,
        voucherCode: voucherCode || undefined,
      };

      const res = await pricingService.previewInvoice(payload);
      set({
        invoicePreview: res,
        distanceInfo: {
          distanceKm: res.distanceInfo?.distanceKm || 0,
          durationMinutes: res.distanceInfo?.estimatedTravelMinutes || 0,
          routingProvider: res.distanceInfo?.routingProvider || 'GOONG_MAPS',
        },
        isCalculatingPrice: false,
      });
    } catch (err: any) {
      set({
        isCalculatingPrice: false,
        priceError: err.response?.data?.message || 'Không thể tính giá thời gian thực',
      });
    }
  },

  submitBooking: async () => {
    const {
      packageId,
      providerId,
      providerType,
      selectedDate,
      selectedTimeSlot,
      destinationAddress,
      destinationLatitude,
      destinationLongitude,
      selectedAddOnIds,
      note,
      voucherCode,
    } = get();

    if (!packageId || !providerId) {
      throw new Error('Chưa chọn gói dịch vụ');
    }

    if (!selectedDate || !selectedTimeSlot) {
      throw new Error('Vui lòng chọn ngày và giờ đặt lịch');
    }

    const bookingDateTime = `${selectedDate}T${selectedTimeSlot}:00`;
    const payload: CreateBookingFormValues = {
      packageId,
      providerId,
      providerType,
      bookingTime: bookingDateTime,
      destinationAddress: destinationAddress || 'Vị trí hiện tại của khách hàng',
      destinationLatitude,
      destinationLongitude,
      addOnItemIds: selectedAddOnIds,
      note: note || undefined,
      voucherCode: voucherCode || undefined,
    };

    const newBooking = await bookingService.createScheduledBooking(payload);
    get().fetchMyBookings(true);
    return newBooking;
  },

  fetchMyBookings: async (isRefresh = false) => {
    set({
      isLoadingBookings: !isRefresh,
      isRefreshingBookings: isRefresh,
    });

    try {
      const all = await bookingService.getMyBookings();

      const upcoming: CustomerBookingItem[] = [];
      const history: CustomerBookingItem[] = [];

      const upcomingStatuses: BookingStatusType[] = [
        'PENDING_DEPOSIT',
        'REQUESTED',
        'PENDING_AGENCY_DISPATCH',
        'AGENCY_ASSIGNED',
        'ACCEPTED',
        'ON_THE_WAY',
        'ARRIVED',
        'IN_PROGRESS',
      ];

      for (const item of all) {
        if (upcomingStatuses.includes(item.status)) {
          upcoming.push(item);
        } else {
          history.push(item);
        }
      }

      // Sắp xếp mặc định: Đơn tạo gần nhất trong ngày lên đầu (createdAt giảm dần)
      upcoming.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.bookingTime ? new Date(a.bookingTime).getTime() : 0);
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.bookingTime ? new Date(b.bookingTime).getTime() : 0);
        return timeB - timeA;
      });

      // Sắp xếp lịch sử đơn hàng: Đơn tạo mới nhất lên đầu (createdAt giảm dần)
      history.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.bookingTime ? new Date(a.bookingTime).getTime() : 0);
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.bookingTime ? new Date(b.bookingTime).getTime() : 0);
        return timeB - timeA;
      });

      set({
        upcomingBookings: upcoming,
        historyBookings: history,
        isLoadingBookings: false,
        isRefreshingBookings: false,
      });

      // Tự động đăng ký lắng nghe cập nhật trạng thái đơn hàng realtime qua STOMP WebSocket
      upcoming.forEach((b) => {
        if (!b.id) return;
        const topic = `/topic/booking-status/${b.id}`;
        websocketService.subscribe(topic, (statusMsg: any) => {
          console.log('[BookingStore] Nhận trạng thái đơn hàng realtime:', b.id, statusMsg);
          const nextStatus = statusMsg?.currentStatus || statusMsg?.status;

          // Cập nhật lại danh sách đơn hàng
          get().fetchMyBookings(true);

          // Rung phản hồi nhẹ nhàng trên điện thoại
          if (Platform.OS !== 'web') {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
          }

          // Kích hoạt Toast thông báo chữ nổi bật toàn cục trượt từ trên xuống
          let toastTitle = 'Cập Nhật Đơn Hàng';
          let toastContent = statusMsg?.message || `Lịch hẹn #${b.bookingCode || b.id} vừa có cập nhật mới.`;
          let toastType = 'NOTIFICATION';

          if (nextStatus === 'ON_THE_WAY') {
            toastTitle = 'Chuyên Viên Đang Di Chuyển';
            toastContent = 'Chuyên viên make-up đang trên đường di chuyển đến điểm hẹn của bạn.';
            toastType = 'BOOKING_ON_THE_WAY';
          } else if (nextStatus === 'ARRIVED') {
            toastTitle = 'Chuyên Viên Đã Đến Nơi';
            toastContent = 'Chuyên viên make-up đã có mặt tại điểm hẹn của bạn. Vui lòng đón thợ!';
            toastType = 'BOOKING_ARRIVED';
          } else if (nextStatus === 'IN_PROGRESS') {
            toastTitle = 'Đang Tiến Hành Make-Up';
            toastContent = 'Chuyên viên đã chính thức bắt đầu buổi làm đẹp cho bạn.';
            toastType = 'BOOKING_IN_PROGRESS';
          } else if (nextStatus === 'COMPLETED') {
            toastTitle = 'Buổi Make-Up Hoàn Tất';
            toastContent = 'Dịch vụ trang điểm đã hoàn tất thành công. Vui lòng thanh toán phần còn lại!';
            toastType = 'BOOKING_COMPLETED';
          } else if (nextStatus === 'CANCELLED') {
            toastTitle = 'Đơn Hàng Đã Bị Hủy';
            toastContent = statusMsg?.message || 'Lịch hẹn trang điểm đã bị hủy.';
            toastType = 'BOOKING_CANCELLED';
          } else if (nextStatus === 'PAID_OUT') {
            toastTitle = 'Thanh Toán Thành Công';
            toastContent = 'Khoản thanh toán dịch vụ đã hoàn tất trọn vẹn.';
            toastType = 'PAID_OUT';
          } else if (nextStatus === 'ACCEPTED' || nextStatus === 'AGENCY_ASSIGNED') {
            toastTitle = 'Đã Tiếp Nhận Đơn Hàng';
            toastContent = statusMsg?.message || 'Chuyên viên make-up đã tiếp nhận lịch hẹn của bạn.';
            toastType = 'BOOKING_ACCEPTED';
          }

          useNotificationStore.getState().showToast({
            id: Date.now(),
            type: toastType,
            title: toastTitle,
            content: toastContent,
            bookingId: Number(b.id),
            bookingCode: b.bookingCode,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        });
      });
    } catch {
      set({
        isLoadingBookings: false,
        isRefreshingBookings: false,
      });
    }
  },

  cancelBooking: async (bookingId: number, reason: string) => {
    await bookingService.cancelBooking(bookingId, reason);
    get().fetchMyBookings(true);
  },

  resetBookingForm: () => {
    set({
      selectedDate: '',
      selectedTimeSlot: '',
      selectedAddOnIds: [],
      note: '',
      voucherCode: '',
      invoicePreview: null,
      distanceInfo: null,
      priceError: null,
    });
  },
}));
