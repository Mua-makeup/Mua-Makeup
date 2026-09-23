import { create } from 'zustand';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { FreelancerBookingItem, freelancerBookingService } from '@/services/freelancer-booking.service';
import { telemetryService } from '@/services/telemetry.service';
import { muaProfileService, MuaPublicProfile } from '@/services/mua-profile.service';

export interface InstantBookingOffer {
  bookingId: number;
  bookingCode: string;
  customerName: string;
  customerPhone?: string;
  customerAddress: string;
  latitude: number;
  longitude: number;
  serviceName?: string;
  distanceKm?: number;
  earningsAmount: number;
  totalAmount: number;
  countdownSeconds: number;
}

export interface WorkstationStats {
  completedToday: number;
  ratingAverage: number;
  totalReviews: number;
  dailyEarnings: number;
}

interface WorkstationState {
  isOnline: boolean;
  isLoading: boolean;
  currentCoords: { latitude: number; longitude: number } | null;
  profile: MuaPublicProfile | null;
  todayBookings: FreelancerBookingItem[];
  stats: WorkstationStats;
  selectedFilter: 'ALL' | 'UPCOMING' | 'COMPLETED';

  // 30s Countdown Modal state
  activeOffer: InstantBookingOffer | null;
  isAcceptModalVisible: boolean;

  // Actions
  fetchWorkstationData: () => Promise<void>;
  toggleOnline: (enable: boolean) => Promise<boolean>;
  setFilter: (filter: 'ALL' | 'UPCOMING' | 'COMPLETED') => void;
  triggerInstantOffer: (offer: InstantBookingOffer) => void;
  dismissOffer: (shouldSkipBackend?: boolean) => Promise<void>;
  acceptActiveOffer: () => Promise<number | null>;
}

export const useWorkstationStore = create<WorkstationState>((set, get) => ({
  isOnline: false,
  isLoading: false,
  currentCoords: null,
  profile: null,
  todayBookings: [],
  selectedFilter: 'ALL',
  stats: {
    completedToday: 0,
    ratingAverage: 5.0,
    totalReviews: 0,
    dailyEarnings: 0,
  },
  activeOffer: null,
  isAcceptModalVisible: false,

  fetchWorkstationData: async () => {
    try {
      set({ isLoading: true });
      const todayStr = new Date().toISOString().split('T')[0];

      const [profile, bookings] = await Promise.all([
        muaProfileService.getMyProfile().catch(() => null),
        freelancerBookingService.getMyAssignedBookings(todayStr, get().selectedFilter),
      ]);

      // Tính toán thống kê trong ngày
      const completed = bookings.filter((b) => b.status === 'COMPLETED' || b.status === 'PAID_OUT');
      const earnings = completed.reduce((acc, b) => acc + (b.earningsAmount || 0), 0);

      set({
        profile,
        todayBookings: bookings,
        stats: {
          completedToday: completed.length,
          ratingAverage: profile?.ratingAverage || 5.0,
          totalReviews: profile?.totalReviews || 0,
          dailyEarnings: earnings,
        },
      });
    } catch (e) {
      console.error('Lỗi nạp dữ liệu Bàn làm việc:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  toggleOnline: async (enable: boolean) => {
    try {
      if (enable) {
        // Xin quyền vị trí và lấy tọa độ GPS thực tế
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Vui lòng cấp quyền truy cập vị trí để bật trạng thái nhận ca.');
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };

        await telemetryService.toggleAvailability({
          isAvailable: true,
          latitude: coords.latitude,
          longitude: coords.longitude,
          heading: loc.coords.heading || 0,
          speed: loc.coords.speed || 0,
        });

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        set({ isOnline: true, currentCoords: coords });
        return true;
      } else {
        const lastCoords = get().currentCoords || { latitude: 21.0285, longitude: 105.8542 };
        await telemetryService.toggleAvailability({
          isAvailable: false,
          latitude: lastCoords.latitude,
          longitude: lastCoords.longitude,
        });

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        set({ isOnline: false });
        return true;
      }
    } catch (err: any) {
      console.warn('Lỗi bật/tắt trực tuyến:', err.message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw err;
    }
  },

  setFilter: (filter) => {
    set({ selectedFilter: filter });
    get().fetchWorkstationData();
  },

  triggerInstantOffer: (offer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    set({ activeOffer: offer, isAcceptModalVisible: true });
  },

  dismissOffer: async (shouldSkipBackend = true) => {
    const offer = get().activeOffer;
    set({ isAcceptModalVisible: false, activeOffer: null });
    if (shouldSkipBackend && offer?.bookingId) {
      try {
        await freelancerBookingService.skipInstantBooking(offer.bookingId);
      } catch (e) {
        console.warn('Lỗi skip booking:', e);
      }
    }
  },

  acceptActiveOffer: async () => {
    const offer = get().activeOffer;
    if (!offer?.bookingId) return null;

    try {
      await freelancerBookingService.acceptInstantBooking(offer.bookingId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const acceptedId = offer.bookingId;
      set({ isAcceptModalVisible: false, activeOffer: null });
      get().fetchWorkstationData();
      return acceptedId;
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw err;
    }
  },
}));
