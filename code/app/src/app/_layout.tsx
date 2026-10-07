import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme, AppState, AppStateStatus } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useAuthStore } from '@/store/auth.store';

SplashScreen.preventAutoHideAsync();

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GlobalPopupModal } from '@/components/common/GlobalPopupModal';
import { AccountModal } from '@/components/common/AccountModal';
import { CountdownAcceptModal } from '@/components/mua/CountdownAcceptModal';
import { DepositConfirmedModal } from '@/components/mua/DepositConfirmedModal';
import { setupAlertPolyfill } from '@/store/popup.store';
import { useWorkstationStore } from '@/store/workstation.store';
import { useBookingStore } from '@/store/booking.store';

// Kích hoạt hệ thống Luxury Popup tự động cho toàn bộ Alert.alert trong app
setupAlertPolyfill();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

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

    // Lắng nghe khi app quay lại từ nền (Background -> Active Foreground)
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const state = useAuthStore.getState();
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
    };
  }, [initializeAuth]);

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
        </Stack>
        {/* Modal Popup toàn cục hiển thị đẹp mắt trên cả Web Laptop & Điện thoại */}
        <GlobalPopupModal />
        {/* Modal Tài Khoản toàn cục mở tức thì trên mọi màn hình */}
        <AccountModal />
        {/* Modal Ca Khẩn Cấp 30s Toàn Cục (Hiện ngay trên mọi màn hình khi mở app) */}
        <CountdownAcceptModal />
        {/* Modal Thông Báo Nhận Cọc Khách Toàn Cục Cho Thợ */}
        <DepositConfirmedModal />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

