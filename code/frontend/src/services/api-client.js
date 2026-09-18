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
    const default401Msg = 'Phiên làm việc đã hết hạn hoặc không tìm thấy token xác thực. Vui lòng đăng nhập lại.';
    const localizedMessage =
      backendData?.message ||
      (typeof backendData?.data === 'string' ? backendData.data : null) ||
      (is401 ? default401Msg : error.message || 'Lỗi kết nối máy chủ');

    if (is401) {
      localStorage.removeItem('mua_logged_in');

      // Luôn hiện Toast báo lỗi không có token / phiên hết hạn
      useToastStore.getState().showToast(localizedMessage, 'error');

      // Nếu đang ở ngoài màn hình login
      if (!window.location.pathname.startsWith('/login')) {
        // Lưu thông báo vào sessionStorage để hiển thị Toast sau khi trình duyệt chuyển trang tới /login
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
