package com.makeup.platform.common.utils;

import java.time.Duration;
import java.time.OffsetDateTime;

public final class BookingConfirmationTimeoutHelper {

    private static final int BUFFER_MINUTES = 45; // Đệm an toàn tối thiểu trước giờ hẹn

    private BookingConfirmationTimeoutHelper() {
        // Utility class
    }

    /**
     * Tính toán mốc thời gian hạn chót để Thợ MUA xác nhận tiếp nhận ca hẹn trước (confirm_deadline)
     * dựa trên Ma trận Lead Time động (Khoảng cách thời gian từ lúc cọc đến lúc làm).
     *
     * @param now Thời điểm thanh toán cọc thành công
     * @param bookingTime Thời điểm bắt đầu ca make-up
     * @return Mốc thời gian hạn chót (confirm_deadline)
     */
    public static OffsetDateTime calculateConfirmDeadline(OffsetDateTime now, OffsetDateTime bookingTime) {
        long leadTimeMinutes = Duration.between(now, bookingTime).toMinutes();

        // 1. Phân bậc thời hạn đếm ngược theo khoảng cách Lead Time
        int timeoutMinutes;
        if (leadTimeMinutes <= 180) {          // 1h - 3h (Ca gấp trong ngày)
            timeoutMinutes = 15;
        } else if (leadTimeMinutes <= 720) {   // 3h - 12h (Ca trong ngày cách xa)
            timeoutMinutes = 30;
        } else if (leadTimeMinutes <= 2880) {  // 12h - 48h (Đặt trước 1-2 ngày)
            timeoutMinutes = 120;              // 2 tiếng
        } else {                               // Trên 2 ngày / 1 tuần (Đặt trước dài hạn)
            timeoutMinutes = 240;              // 4 tiếng
        }

        // 2. Chặn biên an toàn: không được lấn vào 45 phút trước giờ hẹn
        long maxAllowedTimeout = Math.max(10, leadTimeMinutes - BUFFER_MINUTES);
        long effectiveMinutes = Math.min(timeoutMinutes, maxAllowedTimeout);

        OffsetDateTime deadline = now.plusMinutes(effectiveMinutes);

        // 3. Quy tắc đóng băng ban đêm (Night Pause: 22:00 - 07:00) cho ca hẹn dài hạn (>12h)
        if (leadTimeMinutes > 720) {
            int hour = deadline.getHour();
            if (hour >= 22 || hour < 7) {
                // Dời sang mốc 07:00 sáng hôm sau cộng thêm 50% thời hạn hiệu lực
                OffsetDateTime adjusted = deadline.toLocalDate()
                        .atTime(7, 0)
                        .atOffset(deadline.getOffset());
                if (hour >= 22) {
                    adjusted = adjusted.plusDays(1);
                }
                deadline = adjusted.plusMinutes(effectiveMinutes / 2);
            }
        }

        return deadline;
    }
}
