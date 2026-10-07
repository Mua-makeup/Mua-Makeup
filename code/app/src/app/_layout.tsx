import { DarkTheme, DefaultTheme, ThemeProvider, Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { useColorScheme, AppState, AppStateStatus } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useAuthStore } from '@/store/auth.store';

SplashScreen.preventAutoHideAsync();

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GlobalPopupModal } from '@/components/common/GlobalPopupModal';
import { AccountModal } from '@/components/common/AccountModal';
import { CountdownAcceptModal } from '@/components/mua/CountdownAcceptModal';
import { ScheduledOfferModal } from '@/components/mua/ScheduledOfferModal';
import { DepositConfirmedModal } from '@/components/mua/DepositConfirmedModal';
import { NotificationToast } from '@/components/notification/NotificationToast';
import { setupAlertPolyfill } from '@/store/popup.store';
import { useWorkstationStore } from '@/store/workstation.store';
import { useBookingStore } from '@/store/booking.store';
import { useNotificationStore } from '@/store/notification.store';
import { registerForPushNotificationsAsync } from '@/services/push-notification.service';

// Kích hoạt hệ thống Luxury Popup tự động cho toàn bộ Alert.alert trong app
setupAlertPolyfill();

export default function RootLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userInfo = useAuthStore((s) => s.userInfo);

  // Luôn đảm bảo lắng nghe thông báo WebSocket khi user đăng nhập (kể cả sau khi login từ form)
  useEffect(() => {
    if (isAuthenticated && userInfo?.id) {
      console.log('[_layout] Kích hoạt notification listener cho userId:', userInfo.id);
      useNotificationStore.getState().fetchUnreadCount();
      useNotificationStore.getState().initWebSocketListener();
      useBookingStore.getState().fetchMyBookings(true);
      registerForPushNotificationsAsync();
    }
  }, [isAuthenticated, userInfo?.id]);

  useEffect(() => {
    initializeAuth()
      .then(() => {
        const state = useAuthStore.getState();
        const isMuaOrStaff =
          state.userInfo?.roles?.some((r) => r === 'ROLE_FREELANCE_MUA' || r === 'ROLE_AGENCY_STAFF') ||
          Boolean(state.userInfo?.muaId);

        if (state.isAuthenticated && isMuaOrStaff) {
          useWorkstationStore.getState().fetchWorkstationData();
        }
      })
      .finally(() => {
        SplashScreen.hideAsync();
      });

    // Lắng nghe khi người dùng nhấn vào thông báo trên Màn hình khóa (Lock screen) hoặc System tray
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      console.log('[_layout] Người dùng nhấn vào Push Notification:', data);

      const bookingId = data?.bookingId;
      if (bookingId) {
        const isMuaOrStaff =
          useAuthStore.getState().userInfo?.roles?.some(
            (r) => r === 'ROLE_FREELANCE_MUA' || r === 'ROLE_AGENCY_STAFF'
          ) || Boolean(useAuthStore.getState().userInfo?.muaId);

        if (isMuaOrStaff) {
          router.push(`/job-execution/${bookingId}` as any);
        } else {
          router.push(`/booking/detail/${bookingId}` as any);
        }
        return;
      }

      if (
        data?.type === 'CERTIFICATE_APPROVED' ||
        data?.type === 'CERTIFICATE_REJECTED' ||
        data?.type === 'STAFF_APPLICATION_APPROVED' ||
        data?.type === 'STAFF_APPLICATION_REJECTED' ||
        data?.certName
      ) {
        router.push('/profile/mua-profile' as any);
        return;
      }

      router.push('/notifications' as any);
    });

    // Lắng nghe khi app quay lại từ nền (Background -> Active Foreground)
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const state = useAuthStore.getState();
        if (state.isAuthenticated) {
          useNotificationStore.getState().fetchUnreadCount();
          useNotificationStore.getState().initWebSocketListener();
          registerForPushNotificationsAsync();
        }

        const isMuaOrStaff =
          state.userInfo?.roles?.some((r) => r === 'ROLE_FREELANCE_MUA' || r === 'ROLE_AGENCY_STAFF') ||
          Boolean(state.userInfo?.muaId);

        if (state.isAuthenticated && isMuaOrStaff) {
          console.log('[_layout] App đã active, kiểm tra ca hẹn trước đang chờ...');
          useWorkstationStore.getState().checkPendingScheduledOffers(true);
        } else if (state.isAuthenticated) {
          console.log('[_layout] App đã active, làm mới danh sách đơn của khách hàng...');
          useBookingStore.getState().fetchMyBookings(true);
        }
      }
    });

    return () => {
      appStateSub.remove();
      responseSub.remove();
    };
  }, [initializeAuth, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="explore" options={{ animation: 'none' }} />
          <Stack.Screen name="bookings" options={{ animation: 'none' }} />
          <Stack.Screen name="mua/packages/index" options={{ animation: 'none' }} />
          <Stack.Screen name="mua-detail/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="profile/edit" options={{ presentation: 'card' }} />
          <Stack.Screen name="profile/customer-wallet" options={{ presentation: 'card' }} />
          <Stack.Screen name="profile/freelancer-wallet" options={{ presentation: 'card' }} />
          <Stack.Screen name="profile/mua-profile" options={{ presentation: 'card' }} />
          <Stack.Screen name="profile/staff-profile" options={{ presentation: 'card' }} />
          <Stack.Screen name="mua/packages/create" options={{ presentation: 'card' }} />
          <Stack.Screen name="mua/packages/[id]/edit" options={{ presentation: 'card' }} />
          <Stack.Screen name="mua/packages/[id]/items" options={{ presentation: 'card' }} />
          <Stack.Screen name="mua/packages/[id]/showcase" options={{ presentation: 'card' }} />
          <Stack.Screen name="mua/packages/[id]/add-showcase" options={{ presentation: 'card' }} />
          <Stack.Screen name="mua/workstation" options={{ presentation: 'card' }} />
          <Stack.Screen name="job-execution/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="booking/detail/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="booking/deposit/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="booking/tracking/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="booking/instant-matched/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="notifications" options={{ presentation: 'card', headerShown: false }} />
        </Stack>
        {/* Modal Popup toàn cục hiển thị đẹp mắt trên cả Web Laptop & Điện thoại */}
        <GlobalPopupModal />
        {/* Modal Tài Khoản toàn cục mở tức thì trên mọi màn hình */}
        <AccountModal />
        {/* Modal Ca Khẩn Cấp 30s Toàn Cục (Hiện ngay trên mọi màn hình khi mở app) */}
        <CountdownAcceptModal />
        {/* Modal Lịch Hẹn Đặt Trước Toàn Cục (Hiện ngay khi khách cọc hoặc mở app) */}
        <ScheduledOfferModal />
        {/* Modal Thông Báo Nhận Cọc Khách Toàn Cục Cho Thợ */}
        <DepositConfirmedModal />
        {/* Banner Toast Thông Báo Trượt Mép Trên Toàn Cục */}
        <NotificationToast />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

