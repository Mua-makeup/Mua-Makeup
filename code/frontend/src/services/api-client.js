import axios from 'axios';
import { API_BASE_URL } from '../constants/app.constant';
import { STORAGE_KEYS } from '../constants/roles.constant';
import { useToastStore } from '../store/useToastStore';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 15000,
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const lang = localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'vi';
    config.headers['Accept-Language'] = lang;
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    // Backend trả về chuẩn ApiResponse<T> = { success, data, message, errorCode, timestamp }
    return response.data;
  },
  (error) => {
    const backendData = error.response?.data;
    const is401 = error.response?.status === 401;
    const isNetworkError =
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error' ||
      (error.request && !error.response);
    const isTimeout =
      error.code === 'ECONNABORTED' ||
      error.message?.toLowerCase().includes('timeout');
    const lang = localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'vi';

    let localizedMessage =
      backendData?.message ||
      (typeof backendData?.data === 'string' ? backendData.data : null);

    if (!localizedMessage) {
      if (isNetworkError) {
        localizedMessage =
          lang === 'en'
            ? 'Cannot connect to the Backend server. Please verify that the backend is running.'
            : 'Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra lại dịch vụ.';
      } else if (isTimeout) {
        localizedMessage =
          lang === 'en'
            ? 'Server request timed out. Please check your network connection.'
            : 'Hết thời gian chờ phản hồi từ máy chủ (Timeout). Vui lòng kiểm tra kết nối mạng.';
      } else if (is401) {
        localizedMessage =
          lang === 'en'
            ? 'Session expired or token not found. Please log in again.'
            : 'Phiên làm việc đã hết hạn hoặc không tìm thấy token xác thực. Vui lòng đăng nhập lại.';
      } else {
        localizedMessage =
          error.message ||
          (lang === 'en' ? 'Server connection error' : 'Lỗi kết nối máy chủ');
      }
    }

    const isLoggingOut = sessionStorage.getItem('is_logging_out') === 'true';

    // Hiển thị Toast thông báo lỗi nếu xảy ra lỗi kết nối mạng hoặc lỗi máy chủ
    if ((isNetworkError || isTimeout) && !isLoggingOut) {
      useToastStore.getState().showToast(localizedMessage, 'error');
    }

    if (is401) {
      localStorage.removeItem('mua_logged_in');

      // Nếu đang chủ động logout, tuyệt đối không hiển thị toast lỗi hết hạn token
      if (!isLoggingOut) {
        useToastStore.getState().showToast(localizedMessage, 'error');

        // Nếu đang ở ngoài màn hình login
        if (!window.location.pathname.startsWith('/login')) {
          sessionStorage.setItem(
            'auth_redirect_toast',
            JSON.stringify({
              message: localizedMessage,
              type: 'error',
            })
          );

          if (window.location.pathname !== '/') {
            window.location.href = '/login';
          }
        }
      }
    }

    const normalizedError = {
      message: localizedMessage,
      errorCode: backendData?.errorCode || (error.response ? 'ERR_SERVER' : 'ERR_NETWORK'),
      data: backendData?.data,
      status: error.response?.status,
      response: error.response || {
        status: error.code === 'ERR_NETWORK' ? 0 : 500,
        data: {
          message: localizedMessage,
          errorCode: 'ERR_NETWORK',
        },
      },
    };
    return Promise.reject(normalizedError);
  }
);
