package com.makeup.platform.service.mua;

public interface MuaReputationService {

    /**
     * Ghi nhận phản hồi của MUA đối với một lời mời nhận đơn (Nhận, Từ chối, Bỏ qua, Hết hạn)
     * và tự động tính toán lại acceptance_rate, rank_score, badge_tier.
     *
     * @param muaId ID hồ sơ chuyên viên MUA
     * @param bookingId ID đơn đặt lịch
     * @param offerType Loại ca (INSTANT, SCHEDULED, AGENCY_DISPATCH)
     * @param responseStatus Trạng thái phản hồi (ACCEPTED, REJECTED, SKIPPED, EXPIRED, CANCELLED_BY_MUA)
     * @param reason Lý do phản hồi / ghi chú
     */
    void recordOfferAndRecalculate(Long muaId, Long bookingId, String offerType, String responseStatus, String reason);

    /**
     * Tính toán lại tỷ lệ nhận ca (acceptance_rate) trong cửa sổ 30 ngày gần nhất
     * và đồng bộ cập nhật badge_tier, commission_rate, rank_score.
     *
     * @param muaId ID hồ sơ chuyên viên MUA
     */
    void recalculateAcceptanceRate(Long muaId);
}
