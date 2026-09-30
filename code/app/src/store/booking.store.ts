import { create } from 'zustand';
import {
  bookingService,
  CustomerBookingItem,
  BookingStatusType,
} from '@/services/booking.service';
import {
  pricingService,
  InvoicePreviewRes,
  DistanceMatrixRes,
} from '@/services/pricing.service';
import { PreviewInvoicePayload } from '@/schemas/pricing-preview.schema';
import { CreateBookingFormValues } from '@/schemas/booking-create.schema';

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
  submitBooking: () => Promise<CustomerBookingItem>;
  fetchMyBookings: (isRefresh?: boolean) => Promise<void>;
  cancelBooking: (bookingId: number, reason: string) => Promise<void>;
  resetBookingForm: () => void;
}

export const useBookingStore = create<BookingStoreState>((set, get) => ({
  packageId: null,
  providerId: null,
  providerType: 'FREELANCER',
  selectedDate: new Date().toISOString().split('T')[0],
  selectedTimeSlot: '09:00',
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
      const bookingDateTime = `${selectedDate}T${selectedTimeSlot}:00`;
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

      set({
        upcomingBookings: upcoming,
        historyBookings: history,
        isLoadingBookings: false,
        isRefreshingBookings: false,
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
      selectedAddOnIds: [],
      note: '',
      voucherCode: '',
      invoicePreview: null,
      distanceInfo: null,
      priceError: null,
    });
  },
}));
