import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { apiClient } from './api';

// 1. Cấu hình hành vi hiển thị khi app đang chạy hoặc ở background
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Đăng ký kênh thông báo Android độ ưu tiên cao (MAX) để đánh thức màn hình khóa
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'MUA Makeup Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E11D48',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });
  }
}

/**
 * Xin quyền thông báo, lấy Expo Push Token và gửi lên Backend Spring Boot
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Cấu hình channel trên Android trước khi xin quyền
  await setupNotificationChannels();

  if (!Device.isDevice) {
    console.log('[PushNotification] Cảnh báo: Phải chạy trên thiết bị vật lý thật để nhận Remote Push Notification.');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[PushNotification] Người dùng từ chối cấp quyền thông báo đẩy!');
      return null;
    }

    // Lấy Expo Push Token của thiết bị
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const isExpoGoOnIos = Platform.OS === 'ios' && (Constants.appOwnership === 'expo' || !Constants.executionEnvironment || Constants.executionEnvironment === 'storeClient');

    if (isExpoGoOnIos) {
      console.log(
        '[PushNotification] Ghi chú môi trường: Bạn đang chạy Expo Go trên iOS. Apple đã hạn chế APNs Remote Push trong Expo Go từ SDK 49+. Các thông báo thời gian thực khi khóa màn hình sẽ được kích hoạt tự động qua Local System Notifications.'
      );
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = tokenData?.data || null;
      console.log('[PushNotification] Expo Push Token lấy thành công:', token);

      // Gửi token lên Backend Spring Boot để lưu vào bảng auth_schema.users
      if (token) {
        await apiClient.patch('/auth/push-token', { pushToken: token });
        console.log('[PushNotification] Đã đồng bộ push token lên máy chủ thành công.');
      }
    } catch (tokenErr: any) {
      console.log(
        '[PushNotification] Không thể lấy Expo Push Token (Thường xảy ra trên Expo Go iOS do giới hạn APNs của Apple):',
        tokenErr?.message || tokenErr
      );
    }
  } catch (error: any) {
    console.warn('[PushNotification] Lỗi khi đăng ký Push Notification:', error?.message || error);
  }

  return token;
}
