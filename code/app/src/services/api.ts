import Constants from 'expo-constants';
import { Platform, NativeModules } from 'react-native';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '@/utils/storage';


const DEFAULT_DEV_HOST = '192.168.1.235';

const getDevApiBaseUrl = () => {
  // 1. Trình duyệt Web (laptop hoặc mobile browser)
  if (Platform.OS === 'web') {
    const webHost = typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : 'localhost';
    if (webHost !== 'localhost' && webHost !== '127.0.0.1') {
      return PROD_BASE_URL;
    }
    return `http://${webHost}:8080/api/v1`;
  }

  // 2. Thiết bị chạy qua Expo Metro Bundler (tự động cập nhật theo Wi-Fi hiện tại)
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:8080/api/v1`;
    }
  }

  // 3. React Native NativeModules bundle scriptURL
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^/:]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      return `http://${match[1]}:8080/api/v1`;
    }
  }

  // 4. Máy ảo Android Emulator hoặc điện thoại thật iOS/Android
  return `http://${DEFAULT_DEV_HOST}:8080/api/v1`;
};

export const PROD_BASE_URL = 'https://mua-makeup.duckdns.org/api/v1';

let cachedActiveBaseUrl: string | null = null;
let probePromise: Promise<string> | null = null;

/**
 * Tự động kiểm tra xem Spring Boot Local có đang chạy không:
 * - Nếu Spring Boot Local đang chạy -> Dùng Local IP
 * - Nếu Spring Boot Local KHÔNG chạy -> Tự động Fallback về VPS DuckDNS
 */
export const getActiveBaseUrl = async (): Promise<string> => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (!__DEV__) {
    return PROD_BASE_URL;
  }

  if (cachedActiveBaseUrl) {
    return cachedActiveBaseUrl;
  }

  if (probePromise) {
    return probePromise;
  }

  probePromise = (async () => {
    const localUrl = getDevApiBaseUrl();
    const probeUrl = `${localUrl.replace(/\/api\/v1\/?$/, '')}/actuator/health`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(probeUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.status >= 200 && res.status < 500) {
        console.log(`Spring Boot LOCAL đang hoạt động: ${localUrl}`);
        cachedActiveBaseUrl = localUrl;
        BASE_URL = localUrl;
        apiClient.defaults.baseURL = localUrl;
        return localUrl;
      }
    } catch {
      // Local server không phản hồi
    }

    console.log(`Không thấy Spring Boot Local. Tự động chuyển kết nối tới VPS: ${PROD_BASE_URL}`);
    cachedActiveBaseUrl = PROD_BASE_URL;
    BASE_URL = PROD_BASE_URL;
    apiClient.defaults.baseURL = PROD_BASE_URL;
    return PROD_BASE_URL;
  })();

  try {
    return await probePromise;
  } finally {
    probePromise = null;
  }
};

// Cấu hình URL kết nối máy tính qua Wi-Fi khi dev hoặc domain production
export let BASE_URL = process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? getDevApiBaseUrl() : PROD_BASE_URL);

// Tự động kiểm tra ngay khi nạp ứng dụng
if (__DEV__) {
  getActiveBaseUrl().catch(() => {});
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Language': 'vi',
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
 * Request Interceptor: Tự động đính kèm Bearer Token và đồng bộ dynamic baseURL
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Đảm bảo trước khi gửi request, baseURL được đồng bộ với backend còn sống
    const activeUrl = await getActiveBaseUrl();
    config.baseURL = activeUrl;
    BASE_URL = activeUrl;

    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Nếu payload là FormData, xóa Content-Type để Axios / Browser / React Native tự sinh boundary
    const isFormData = config.data && (
      (typeof FormData !== 'undefined' && config.data instanceof FormData) ||
      config.data?.constructor?.name === 'FormData' ||
      typeof config.data?.append === 'function'
    );
    if (isFormData && config.headers) {
      if (typeof (config.headers as any).delete === 'function') {
        (config.headers as any).delete('Content-Type');
        (config.headers as any).delete('content-type');
      }
      delete (config.headers as any)['Content-Type'];
      delete (config.headers as any)['content-type'];
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

        if (
          typeof newAccessToken === 'string' &&
          newAccessToken.length > 0 &&
          typeof newRefreshToken === 'string' &&
          newRefreshToken.length > 0
        ) {
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
