package com.makeup.platform.service.pricing;

import com.makeup.platform.dto.response.pricing.DistanceMatrixRes;

import java.math.BigDecimal;

public interface MapsClientService {

    /**
     * Đo khoảng cách và thời gian di chuyển giữa 2 điểm tọa độ.
     * Tự động kiểm tra Redis Cache 24h, gọi Maps API và kích hoạt Fallback Haversine nếu lỗi/timeout.
     */
    DistanceMatrixRes getDistanceAndDuration(
            BigDecimal originLat,
            BigDecimal originLng,
            BigDecimal destinationLat,
            BigDecimal destinationLng
    );
}
