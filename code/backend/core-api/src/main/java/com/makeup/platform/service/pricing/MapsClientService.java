package com.makeup.platform.service.pricing;

import com.makeup.platform.dto.response.pricing.DistanceMatrixRes;
import com.makeup.platform.dto.response.maps.GeocodeRes;
import com.makeup.platform.dto.response.maps.PlaceSuggestionRes;

import java.math.BigDecimal;
import java.util.List;

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

    /**
     * Dịch tọa độ GPS thành địa chỉ hành chính chi tiết (Goong Maps Reverse Geocoding).
     */
    GeocodeRes reverseGeocode(BigDecimal latitude, BigDecimal longitude);

    /**
     * Chuyển địa chỉ văn bản thành tọa độ GPS (Goong Maps Geocoding).
     */
    GeocodeRes geocode(String address);

    /**
     * Gợi ý địa điểm tự động khi người dùng gõ tìm kiếm (Goong Maps Place AutoComplete),
     * hỗ trợ location bias (ưu tiên khu vực lân cận nếu có tọa độ).
     */
    List<PlaceSuggestionRes> getPlaceAutoComplete(String input, BigDecimal latitude, BigDecimal longitude);

    /**
     * Lấy chi tiết tọa độ và địa chỉ chuẩn xác từ place_id (Goong Maps Place Detail).
     */
    GeocodeRes getPlaceDetail(String placeId);
}
