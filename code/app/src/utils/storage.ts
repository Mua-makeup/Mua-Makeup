import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'makeup_access_token';
const REFRESH_TOKEN_KEY = 'makeup_refresh_token';

/**
 * Lưu cặp Access Token & Refresh Token an toàn vào phần cứng thiết bị
 * (iOS Keychain & Android Keystore; Fallback localStorage trên Web).
 */
export const saveTokens = async (accessToken: string, refreshToken: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      return;
    }
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('Lỗi khi lưu token vào SecureStore:', error);
  }
};

/**
 * Lấy Access Token từ SecureStore
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
      }
      return null;
    }
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Lỗi khi đọc Access Token từ SecureStore:', error);
    return null;
  }
};

/**
 * Lấy Refresh Token từ SecureStore
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
      }
      return null;
    }
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Lỗi khi đọc Refresh Token từ SecureStore:', error);
    return null;
  }
};

/**
 * Xóa sạch toàn bộ Tokens khi Đăng xuất
 */
export const clearTokens = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Lỗi khi xóa token trong SecureStore:', error);
  }
};

const ONBOARDING_KEY = 'makeup_has_seen_onboarding';

/**
 * Kiểm tra xem người dùng đã từng xem qua hướng dẫn Onboarding lần đầu chưa
 */
export const hasSeenOnboarding = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(ONBOARDING_KEY) === 'true';
      }
      return false;
    }
    const val = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return val === 'true';
  } catch (error) {
    return false;
  }
};

/**
 * Đánh dấu đã hoàn thành/bỏ qua xem hướng dẫn lần đầu
 */
export const markOnboardingSeen = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ONBOARDING_KEY, 'true');
      }
      return;
    }
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
  } catch (error) {
    console.error('Lỗi khi lưu trạng thái onboarding:', error);
  }
};

