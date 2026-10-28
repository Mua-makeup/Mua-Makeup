/**
 * Tiện ích chuẩn hóa lỗi API toàn hệ thống (Client Error Handling Standard)
 * Tuân thủ Điều 5.3 trong project-rules.md
 *
 * Lưu ý: api-client.js interceptor normalize Axios error thành { message, errorCode, data, status, response }.
 * parseApiError phải handle cả 2 dạng: raw Axios error và normalized error từ interceptor.
 */
export const parseApiError = (err) => {
  // 0. Nếu là TypeError (e.g. calling undefined function) – lỗi lập trình, không phải lỗi mạng
  if (err instanceof TypeError) {
    return {
      message: `Lỗi kỹ thuật: ${err.message}`,
      errorCode: 'ERR_CLIENT',
      fieldErrors: {},
    };
  }

  // 1. Nếu có response từ backend theo chuẩn ApiResponse<T>
  const backendData = err?.response?.data;
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

  // 2. Normalized error từ api-client.js interceptor (err.message đã localize, có .errorCode)
  if (err?.errorCode && err?.message) {
    return {
      message: err.message,
      errorCode: err.errorCode,
      fieldErrors: {},
    };
  }

  // 3. Lỗi mạng hoặc server không phản hồi (raw Axios NetworkError trước interceptor)
  if (err?.message === 'Network Error' || !err?.response) {
    return {
      message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại.',
      errorCode: 'ERR_NETWORK',
      fieldErrors: {},
    };
  }

  // 4. Fallback
  return {
    message: err?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    errorCode: 'ERR_GENERAL',
    fieldErrors: {},
  };
};
