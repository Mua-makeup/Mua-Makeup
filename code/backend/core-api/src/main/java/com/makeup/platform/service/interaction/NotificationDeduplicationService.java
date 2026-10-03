package com.makeup.platform.service.interaction;

public interface NotificationDeduplicationService {

    /**
     * Kiểm tra và đánh dấu eventId đã được xử lý trên Redis.
     *
     * @param eventId UUID định danh sự kiện
     * @return true nếu sự kiện lần đầu tiên xuất hiện; false nếu sự kiện bị trùng lặp
     */
    boolean tryAcquire(String eventId);
}
