/**
 * Tiện ích chuẩn hóa & phân tích lỗi phản hồi từ Spring Boot Core API
 * Tuân thủ quy chuẩn hệ thống (project-rules.md Mục 5.2):
 * "Khi Backend trả về lỗi validation trường dữ liệu (err.response?.data?.data),
 *  Frontend map trực tiếp các thông điệp này vào form helper error."
 */

export interface ParsedApiError {
  /** Thông điệp lỗi chi tiết dùng để hiển thị Toast/Alert (ưu tiên lỗi cụ thể của trường) */
  message: string;
  /** Danh sách lỗi map theo từng trường input: { [fieldName]: 'Lỗi chi tiết...' } */
  fieldErrors?: Record<string, string>;
  /** Mã lỗi hệ thống (ERR_VALIDATION, ERR_INVALID_CREDENTIALS, etc.) */
  errorCode?: string;
}

export function parseApiError(err: any): ParsedApiError {
  if (!err) {
    return { message: 'Đã có lỗi không xác định xảy ra.' };
  }

  const resData = err?.response?.data;

  // Trường hợp không nhận được response (Mất kết nối mạng, server down, timeout)
  if (!resData) {
    if (err.message === 'Network Error' || err.code === 'ECONNABORTED') {
      return {
        message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối Wi-Fi/4G.',
        errorCode: 'ERR_NETWORK',
      };
    }
    return {
      message: err.message || 'Lỗi kết nối máy chủ. Vui lòng thử lại sau.',
    };
  }

  const baseMessage = resData.message || 'Dữ liệu không hợp lệ.';
  const errorCode = resData.errorCode;
  
  // Trích xuất map lỗi validation từ trường `data` (khi errorCode là ERR_VALIDATION)
  let fieldErrors: Record<string, string> | undefined = undefined;
  if (
    resData.data &&
    typeof resData.data === 'object' &&
    !Array.isArray(resData.data)
  ) {
    fieldErrors = resData.data as Record<string, string>;
  }

  // Xây dựng thông điệp hiển thị Alert/Toast chuẩn xác nhất:
  // Nếu có lỗi chi tiết của từng trường, trích xuất thông điệp chi tiết thay vì câu thông báo chung chung
  let detailedMessage = baseMessage;
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    const errorList = Object.values(fieldErrors);
    if (errorList.length === 1) {
      // 1 lỗi: Trả về trực tiếp lý do (Ví dụ: "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường...")
      detailedMessage = errorList[0];
    } else {
      // Nhiều lỗi: Liệt kê từng lỗi xuống dòng
      detailedMessage = errorList.map((msg, i) => `• ${msg}`).join('\n');
    }
  }

  return {
    message: detailedMessage,
    fieldErrors,
    errorCode,
  };
}
