package com.makeup.platform.service.interaction;

public interface AutoReviewService {

    /**
     * Quét và xử lý tự động ghi nhận đánh giá 5★ cho các đơn hàng hoàn tất quá 72h
     * mà khách hàng không khiếu nại và chưa gửi đánh giá.
     *
     * @return Số lượng đơn hàng được tự động ghi nhận đánh giá.
     */
    int processAutoReviews();

    /**
     * Xử lý tự động đánh giá 5★ cho 1 đơn hàng cụ thể trong transaction độc lập.
     *
     * @param bookingId ID đơn hàng cần đánh giá tự động
     */
    void processSingleAutoReview(Long bookingId);
}
