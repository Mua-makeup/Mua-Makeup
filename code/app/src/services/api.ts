import Constants from 'expo-constants';
import { Platform, NativeModules } from 'react-native';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '@/utils/storage';

/**
 * Tự động trích xuất động địa chỉ IP của máy tính host đang chạy Backend / Metro:
 * 1. Trên Web Browser (Laptop): Dùng đúng hostname của trình duyệt (localhost hoặc IP Wi-Fi hiện tại)
 * 2. Trên Điện thoại thật (Expo Go): Đọc hostUri từ Metro bundler đang kết nối Wi-Fi
 * 3. Trên React Native Native Client: Đọc scriptURL của bundle đang tải
 * 4. Tránh hoàn toàn việc hardcode IP tĩnh khi đổi mạng Wi-Fi
 */
const getDevApiBaseUrl = () => {
  // 1. Trình duyệt Web (laptop hoặc mobile browser)
  if (Platform.OS === 'web') {
    const webHost = typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : 'localhost';
    return `http://${webHost}:8080/api/v1`;
  }

  // 2. Thiết bị chạy qua Expo Metro Bundler (tự động cập nhật theo Wi-Fi hiện tại)
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp) {
      return `http://${hostIp}:8080/api/v1`;
    }
  }

  // 3. React Native NativeModules bundle scriptURL
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^/:]+)/);
    if (match && match[1]) {
      return `http://${match[1]}:8080/api/v1`;
    }
  }

  // 4. Máy ảo Android Emulator kết nối ngược lại máy tính host
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api/v1';
  }

  // 5. Fallback mặc định cho iOS Simulator hoặc local
  return 'http://localhost:8080/api/v1';
};

// Cấu hình URL kết nối máy tính qua Wi-Fi khi dev hoặc domain production
export const BASE_URL = __DEV__
  ? getDevApiBaseUrl()
  : 'https://api.makeup-platform.com/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Biến quản lý trạng thái Refresh Token chống race-condition
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Request Interceptor: Tự động đính kèm Bearer Token từ SecureStore
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor: Tự động bắt lỗi 401 và làm mới Token (Silent Auto-Refresh)
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Nếu lỗi 401 và request chưa từng được retry
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Nếu là request login/refresh/register thì không retry
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh-token') ||
        originalRequest.url?.includes('/auth/register')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Đưa request vào hàng đợi chờ refresh hoàn tất
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const currentRefreshToken = await getRefreshToken();
        const currentAccessToken = await getAccessToken();

        if (!currentRefreshToken) {
          throw new Error('Không tìm thấy Refresh Token');
        }

        // Gọi API refresh token
        const refreshResponse = await axios.post(
          `${BASE_URL}/auth/refresh-token`,
          { refreshToken: currentRefreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: currentAccessToken ? `Bearer ${currentAccessToken}` : undefined,
            },
          }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;
        const newRefreshToken = refreshResponse.data?.data?.refreshToken || currentRefreshToken;

        if (newAccessToken) {
          await saveTokens(newAccessToken, newRefreshToken);
          processQueue(null, newAccessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        } else {
          throw new Error('Cấp lại token không hợp lệ');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await clearTokens();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
