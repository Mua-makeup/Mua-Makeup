import axios from 'axios';
import { API_BASE_URL } from '../constants/app.constant';
import { STORAGE_KEYS } from '../constants/roles.constant';

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
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_INFO);
      localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
      if (!window.location.pathname.startsWith('/login') && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    const backendData = error.response?.data;
    const localizedMessage =
      backendData?.message ||
      (typeof backendData?.data === 'string' ? backendData.data : null) ||
      error.message ||
      'Lỗi kết nối máy chủ';

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
