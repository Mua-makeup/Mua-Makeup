/**
 * Tiện ích chuẩn hóa lỗi API toàn hệ thống (Client Error Handling Standard)
 * Tuân thủ Điều 5.3 trong project-rules.md
 */
export const parseApiError = (err) => {
  const backendData = err?.response?.data;

  // 1. Nếu có response từ backend theo chuẩn ApiResponse<T>
  if (backendData) {
    const message =
      backendData.message || (typeof backendData.data === 'string' ? backendData.data : 'Đã có lỗi xảy ra');
    const errorCode = backendData.errorCode || 'ERR_UNKNOWN';
    let fieldErrors = {};

    // Nếu là lỗi validation (ERR_VALIDATION), backendData.data chứa map { fieldName: errorMessage }
    if (backendData.data && typeof backendData.data === 'object' && !Array.isArray(backendData.data)) {
      fieldErrors = backendData.data;
    }

    return {
      message,
      errorCode,
      fieldErrors,
      timestamp: backendData.timestamp,
    };
  }

  // 2. Lỗi mạng hoặc server không phản hồi
  if (err?.message === 'Network Error' || !err?.response) {
    return {
      message: 'Không thể kết nối đến máy chủ Backend (Port 8080). Vui lòng kiểm tra lại.',
      errorCode: 'ERR_NETWORK',
      fieldErrors: {},
    };
  }

  // 3. Fallback
  return {
    message: err?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    errorCode: 'ERR_GENERAL',
    fieldErrors: {},
  };
};
