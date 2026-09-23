import { apiClient } from './api-client';

/**
 * Service tích hợp API Đặt lịch hẹn trước (Scheduled Booking) & Quản lý Lịch MUA
 * Kết nối tập trung về Spring Boot Core API (Port 8080)
 */
export const bookingService = {
  /**
   * Khách hàng: Tạo đơn đặt lịch hẹn trước (Giữ chỗ 15 phút)
   * POST /api/v1/customer/bookings/scheduled
   * @param {Object} payload Dữ liệu đặt lịch (packageId, bookingPartner, muaId/agencyId, bookingDate, startTime, ...)
   */
  createScheduledBooking: (payload) =>
    apiClient.post('/customer/bookings/scheduled', payload),

  /**
   * Khách hàng: Xác nhận đã hoàn tất thanh toán tiền cọc 30%
   * POST /api/v1/customer/bookings/{bookingId}/confirm-deposit
   * @param {number|string} bookingId ID của đơn đặt lịch
   */
  confirmDepositPayment: (bookingId) =>
    apiClient.post(`/customer/bookings/${bookingId}/confirm-deposit`),

  /**
   * Public: Lấy danh sách khung giờ khả dụng và trạng thái đệm di chuyển trong ngày của Thợ
   * GET /api/v1/public/mua/{muaId}/available-slots?date=YYYY-MM-DD
   * @param {number|string} muaId ID của Thợ trang điểm
   * @param {string} date Ngày cần tra cứu (YYYY-MM-DD)
   */
  getAvailableTimeSlots: (muaId, date) =>
    apiClient.get(`/public/mua/${muaId}/available-slots`, {
      params: { date },
    }),

  /**
   * Thợ tự do (MUA): Khóa khung giờ bận cá nhân
   * POST /api/v1/freelancer/calendar/block
   * @param {Object} payload (bookingDate, startTime, endTime, reason)
   */
  blockCalendarSlot: (payload) =>
    apiClient.post('/freelancer/calendar/block', payload),

  /**
   * Thợ tự do (MUA): Mở lại khung giờ bận cá nhân
   * DELETE /api/v1/freelancer/calendar/slots/{slotId}
   * @param {number|string} slotId ID bản ghi trong mua_calendars
   */
  unblockCalendarSlot: (slotId) =>
    apiClient.delete(`/freelancer/calendar/slots/${slotId}`),
};
