import { create } from 'zustand';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { FreelancerBookingItem, freelancerBookingService } from '@/services/freelancer-booking.service';
import { telemetryService } from '@/services/telemetry.service';
import { muaProfileService, MuaPublicProfile } from '@/services/mua-profile.service';
import { websocketService } from '@/services/websocket.service';
import { soundManager } from '@/utils/sound';
import { getTodayVN } from '@/utils/date';
import { useLocationStore } from '@/store/location.store';

export interface InstantBookingOffer {
  bookingId: number;
  bookingCode: string;
  customerName: string;
  customerPhone?: string;
  customerAddress: string;
  latitude: number;
  longitude: number;
  serviceName?: string;
  categoryName?: string;
  styleNames?: string[];
  packageItems?: string[];
  estimatedDurationMinutes?: number;
  customerRating?: number;
  customerNote?: string;
  distanceKm?: number;
  estimatedTravelMinutes?: number;
  targetArrivalTime?: string;
  minutesUntilDeadline?: number;
  basePrice?: number;
  emergencySurchargeFee?: number;
  surgeAmount?: number;
  totalAmount: number;
  platformFee?: number;
  earningsAmount: number;
  depositAmount?: number;
  isDepositSecured?: boolean;
  countdownSeconds: number;
  candidateIndex?: number;
  totalCandidates?: number;
  timestamp?: number;
}


export interface DepositConfirmedNotice {
  type?: 'CUSTOMER_CONFIRMED_DEPOSIT' | 'PAYMENT_COMPLETED' | string;
  status?: string;
  bookingId: number;
  bookingCode: string;
  customerName?: string;
  customerPhone?: string;
  destinationAddress?: string;
  totalAmount?: number;
  depositAmount: number;
  finalAmount?: number;
  earningsAmount: number;
  paymentMethod?: string;
  addOnNames?: string[];
  addOnTotal?: number;
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

  // Modal thông báo khách đã cọc tiền vào Escrow
  depositNotice: DepositConfirmedNotice | null;
  isDepositModalVisible: boolean;

  // Actions
  fetchWorkstationData: () => Promise<void>;
  toggleOnline: (enable: boolean) => Promise<boolean>;
  setFilter: (filter: 'ALL' | 'UPCOMING' | 'COMPLETED') => void;
  triggerInstantOffer: (offer: InstantBookingOffer) => void;
  dismissOffer: (shouldSkipBackend?: boolean) => Promise<void>;
  acceptActiveOffer: () => Promise<number | null>;
  checkPendingOffer: () => Promise<void>;
  showDepositNotice: (notice: DepositConfirmedNotice) => void;
  dismissDepositNotice: () => void;
}

let heartbeatTimer: any = null;

const startHeartbeat = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  // Gửi ngay 1 lần lập tức để tái đồng bộ vị trí vào Redis GEO
  telemetryService.sendHeartbeat().catch(() => {});
  heartbeatTimer = setInterval(async () => {
    try {
      await telemetryService.sendHeartbeat();
      console.log('[WorkstationStore] Đã gửi heartbeat duy trì trực tuyến');
    } catch (e: any) {
      console.warn('[WorkstationStore] Lỗi gửi heartbeat:', e.message);
    }
  }, 45000);
};

const stopHeartbeat = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

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
  depositNotice: null,
  isDepositModalVisible: false,

  fetchWorkstationData: async () => {
    try {
      set({ isLoading: true });
      const todayStr = getTodayVN();

      const [profile, bookings] = await Promise.all([
        muaProfileService.getMyProfile().catch(() => null),
        freelancerBookingService.getMyAssignedBookings(todayStr, get().selectedFilter),
      ]);

      // Tính toán thống kê trong ngày:
      // Ca đã hoàn tất tay nghề: COMPLETED hoặc PAID_OUT
      const completed = bookings.filter((b) => b.status === 'COMPLETED' || b.status === 'PAID_OUT');
      // Tiền thực nhận vào ví: CHỈ tính những ca khách ĐÃ THANH TOÁN (PAID_OUT)
      const paidOut = bookings.filter((b) => b.status === 'PAID_OUT');
      const earnings = paidOut.reduce((acc, b) => acc + (b.earningsAmount || 0), 0);

      const currentOnline = get().isOnline;

      const effectiveMuaId = profile?.muaId || (profile as any)?.id;

      set({
        profile,
        // Giữ nguyên giá trị isOnline trong store, không đọc từ backend để thợ
        // luôn bắt đầu ở trạng thái "Đang Tạm Nghỉ" khi vừa đăng nhập vào
        isOnline: currentOnline,
        todayBookings: bookings,
        stats: {
          completedToday: completed.length,
          ratingAverage: profile?.ratingAverage || 5.0,
          totalReviews: profile?.totalReviews || 0,
          dailyEarnings: earnings,
        },
      });

      // Kết nối WebSocket để nhận đơn khẩn cấp (kể cả khi đang Offline vì thợ có thể bật Online bất kỳ lúc)
      if (effectiveMuaId) {
        if (currentOnline) {
          // Lấy tọa độ GPS mới nhất từ thiết bị và đồng bộ ngay lên Backend
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            .then(async (loc) => {
              const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
              set({ currentCoords: coords });
              await telemetryService.toggleAvailability({
                isAvailable: true,
                latitude: coords.latitude,
                longitude: coords.longitude,
                heading: loc.coords.heading || 0,
                speed: loc.coords.speed || 0,
              });
              startHeartbeat();
            })
            .catch(() => {
              startHeartbeat();
            });
        }
        console.log('[WorkstationStore] Tự động kích hoạt WebSocket cho MUA id =', effectiveMuaId);
        await websocketService.connect();
        websocketService.subscribe(`/topic/mua-offer/${effectiveMuaId}`, (offerPayload) => {
          console.log('[WorkstationStore] Nhận đơn khẩn cấp từ WebSocket:', offerPayload);
          get().triggerInstantOffer(offerPayload);
        });

        websocketService.subscribe(`/topic/mua-offer-revoked/${effectiveMuaId}`, (revokePayload) => {
          console.log('[WorkstationStore] Đơn khẩn cấp đã bị thu hồi/chuyển tiếp:', revokePayload);
          const currentOffer = get().activeOffer;
          if (currentOffer && revokePayload?.bookingId && currentOffer.bookingId !== revokePayload.bookingId) {
            console.warn(`[WorkstationStore] Bỏ qua tin thu hồi của đơn cũ #${revokePayload.bookingId} vì đang xử lý đơn #${currentOffer.bookingId}`);
            return;
          }
          get().dismissOffer(false);
        });

        websocketService.subscribe('/topic/instant-dismiss', (dismissPayload) => {
          const currentOffer = get().activeOffer;
          if (currentOffer && (!dismissPayload?.bookingId || dismissPayload.bookingId === currentOffer.bookingId)) {
            get().dismissOffer(false);
          }
        });

        // Lắng nghe realtime khi khách đặt cọc thành công vào Quỹ Escrow hoặc thanh toán hoàn tất
        websocketService.subscribe(`/topic/booking-customer-confirmed/${effectiveMuaId}`, (depositPayload) => {
          console.log('[WorkstationStore] Realtime nhận cọc / thanh toán hoàn tất:', depositPayload);
          if (depositPayload?.bookingId) {
            get().showDepositNotice({
              type: depositPayload.type || (depositPayload.status === 'PAID_OUT' ? 'PAYMENT_COMPLETED' : 'CUSTOMER_CONFIRMED_DEPOSIT'),
              status: depositPayload.status,
              bookingId: depositPayload.bookingId,
              bookingCode: depositPayload.bookingCode,
              customerName: depositPayload.customerName,
              customerPhone: depositPayload.customerPhone,
              destinationAddress: depositPayload.destinationAddress,
              totalAmount: depositPayload.totalAmount,
              depositAmount: depositPayload.depositAmount || 0,
              finalAmount: depositPayload.finalAmount || depositPayload.paidAmount,
              earningsAmount: depositPayload.earningsAmount || 0,
              paymentMethod: depositPayload.paymentMethod,
              addOnNames: depositPayload.addOnNames,
              addOnTotal: depositPayload.addOnTotal,
            });
            get().fetchWorkstationData();
          }
        });

        // Kiểm tra ngay nếu có ca khẩn cấp đang chờ thợ phản hồi (kể cả khi vừa mở app hoặc từ nền vào)
        if (currentOnline) {
          await get().checkPendingOffer();
        }
      }
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

        let loc = null;
        try {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        } catch {
          loc = await Location.getLastKnownPositionAsync().catch(() => null);
        }

        const storeLoc = useLocationStore.getState();
        const coords = loc?.coords
          ? {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            }
          : storeLoc.latitude && storeLoc.longitude
          ? {
              latitude: storeLoc.latitude,
              longitude: storeLoc.longitude,
            }
          : {
              latitude: 21.0285,
              longitude: 105.8542,
            };

        await telemetryService.toggleAvailability({
          isAvailable: true,
          latitude: coords.latitude,
          longitude: coords.longitude,
          heading: loc?.coords?.heading || 0,
          speed: loc?.coords?.speed || 0,
        });

        // Đăng ký nhận tin phân phối đơn khẩn cấp qua WebSocket STOMP
        let profile = get().profile;
        if (!profile) {
          profile = await muaProfileService.getMyProfile().catch(() => null);
        }

        const effectiveMuaId = profile?.muaId || (profile as any)?.id;
        if (effectiveMuaId) {
          await websocketService.connect();
          websocketService.subscribe(`/topic/mua-offer/${effectiveMuaId}`, (offerPayload) => {
            console.log('[WorkstationStore] Nhận đơn khẩn cấp từ WebSocket:', offerPayload);
            get().triggerInstantOffer(offerPayload);
          });

          websocketService.subscribe(`/topic/mua-offer-revoked/${effectiveMuaId}`, (revokePayload) => {
            console.log('[WorkstationStore] Đơn khẩn cấp đã bị thu hồi/chuyển tiếp:', revokePayload);
            const currentOffer = get().activeOffer;
            if (currentOffer && revokePayload?.bookingId && currentOffer.bookingId !== revokePayload.bookingId) {
              console.warn(`[WorkstationStore] Bỏ qua tin thu hồi của đơn cũ #${revokePayload.bookingId} vì đang xử lý đơn #${currentOffer.bookingId}`);
              return;
            }
            get().dismissOffer(false);
          });

          websocketService.subscribe('/topic/instant-dismiss', (dismissPayload) => {
            const currentOffer = get().activeOffer;
            if (currentOffer && (!dismissPayload?.bookingId || dismissPayload.bookingId === currentOffer.bookingId)) {
              get().dismissOffer(false);
            }
          });

          websocketService.subscribe(`/topic/booking-customer-confirmed/${effectiveMuaId}`, (depositPayload) => {
            console.log('[WorkstationStore] Online nhận cọc / thanh toán hoàn tất:', depositPayload);
            if (depositPayload?.bookingId) {
              get().showDepositNotice({
                type: depositPayload.type || (depositPayload.status === 'PAID_OUT' ? 'PAYMENT_COMPLETED' : 'CUSTOMER_CONFIRMED_DEPOSIT'),
                status: depositPayload.status,
                bookingId: depositPayload.bookingId,
                bookingCode: depositPayload.bookingCode,
                customerName: depositPayload.customerName,
                customerPhone: depositPayload.customerPhone,
                destinationAddress: depositPayload.destinationAddress,
                totalAmount: depositPayload.totalAmount,
                depositAmount: depositPayload.depositAmount || 0,
                finalAmount: depositPayload.finalAmount || depositPayload.paidAmount,
                earningsAmount: depositPayload.earningsAmount || 0,
                paymentMethod: depositPayload.paymentMethod,
                addOnNames: depositPayload.addOnNames,
                addOnTotal: depositPayload.addOnTotal,
              });
              get().fetchWorkstationData();
            }
          });
        }

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        startHeartbeat();
        set({ isOnline: true, currentCoords: coords });
        return true;
      } else {
        stopHeartbeat();
        const lastCoords = get().currentCoords || { latitude: 21.0285, longitude: 105.8542 };
        await telemetryService.toggleAvailability({
          isAvailable: false,
          latitude: lastCoords.latitude,
          longitude: lastCoords.longitude,
        });

        // Hủy đăng ký lắng nghe khi Offline và ngắt chuông/rung
        const profile = get().profile;
        const effectiveMuaId = profile?.muaId || (profile as any)?.id;
        if (effectiveMuaId) {
          websocketService.unsubscribe(`/topic/mua-offer/${effectiveMuaId}`);
        }
        websocketService.unsubscribe('/topic/instant-dismiss');
        soundManager.stopJobAlertSound();

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
    soundManager.playJobAlertSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    set({ activeOffer: offer, isAcceptModalVisible: true });
  },

  dismissOffer: async (shouldSkipBackend = true) => {
    const offer = get().activeOffer;
    console.warn(`[WorkstationStore] dismissOffer ĐƯỢC GỌI! shouldSkipBackend=${shouldSkipBackend}, bookingId=${offer?.bookingId}`);
    soundManager.stopJobAlertSound();
    set({ isAcceptModalVisible: false, activeOffer: null });
    if (shouldSkipBackend && offer?.bookingId) {
      try {
        console.warn(`[WorkstationStore] Gửi request POST /skip cho bookingId=${offer.bookingId}`);
        await freelancerBookingService.skipInstantBooking(offer.bookingId);
      } catch (e) {
        console.warn('Lỗi skip booking:', e);
      }
    }
  },

  acceptActiveOffer: async () => {
    soundManager.stopJobAlertSound();
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

  checkPendingOffer: async () => {
    // Nếu modal đang hiển thị với đơn này rồi thì không ghi đè
    if (get().isAcceptModalVisible && get().activeOffer) {
      return;
    }
    try {
      const pendingOffer = await freelancerBookingService.getPendingInstantOffer();
      if (pendingOffer && pendingOffer.bookingId) {
        console.log('[WorkstationStore] Phát hiện ca khẩn cấp đang chờ duyệt:', pendingOffer);
        get().triggerInstantOffer(pendingOffer);
      }
    } catch (e) {
      console.warn('[WorkstationStore] Lỗi kiểm tra ca khẩn cấp đang chờ:', e);
    }
  },

  showDepositNotice: (notice) => {
    soundManager.playJobAlertSound();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    set({ depositNotice: notice, isDepositModalVisible: true });
  },

  dismissDepositNotice: () => {
    set({ isDepositModalVisible: false, depositNotice: null });
  },
}));
