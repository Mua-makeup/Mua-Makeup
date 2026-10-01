package com.makeup.platform.service.wallet;

/**
 * Service quyết toán đơn booking sau khi cả hai bên xác nhận tiền mặt.
 * Áp dụng snapshot T/D/C/F/E/N và ghi có ví thợ.
 */
public interface BookingSettlementService {

    /**
     * Khởi động quyết toán đơn booking.
     * Điều kiện: booking status COMPLETED, BookingCashReceipt = BOTH_CONFIRMED,
     * chưa có settlement record.
     * Ghi có ví thợ freelancer = N = D - F (trong trường hợp N > 0).
     * Nếu N < 0 -> trạng thái PENDING_FEE_COLLECTION, không block.
     * @param bookingId ID booking cần quyết toán
     * @param commissionRate Tỷ lệ phí nền tảng (snapshot từ config lúc booking)
     */
    void settleBooking(Long bookingId, java.math.BigDecimal commissionRate);

    /**
     * Retry quyết toán cho các đơn ở trạng thái PENDING.
     * Dùng bởi @Scheduled job.
     */
    void retryPendingSettlements();
}
