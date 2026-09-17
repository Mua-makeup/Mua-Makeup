package com.makeup.platform.common.utils;

import com.makeup.platform.common.constants.PricingConstants;
import com.uber.h3core.H3Core;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

/**
 * Tiện ích chỉ mục không gian Uber H3 (Hexagonal Hierarchical Spatial Index).
 * Sử dụng cho bài toán chia cụm Cung - Cầu (Spatial Binning) của hệ thống Giá Động.
 */
@Slf4j
public final class H3SpatialUtils {

    private static H3Core h3Instance;

    static {
        try {
            h3Instance = H3Core.newInstance();
        } catch (IOException e) {
            log.error("Failed to initialize Uber H3Core instance: {}", e.getMessage(), e);
            h3Instance = null;
        }
    }

    private H3SpatialUtils() {}

    /**
     * Băm tọa độ (lat, lng) sang mã định danh ô lục giác H3 theo độ phân giải mặc định (Resolution 7 ~1.2km).
     */
    public static String latLngToCell(double lat, double lng) {
        return latLngToCell(lat, lng, PricingConstants.H3_SURGE_RESOLUTION);
    }

    /**
     * Băm tọa độ (lat, lng) sang mã định danh ô lục giác H3 với độ phân giải tùy biến.
     */
    public static String latLngToCell(double lat, double lng, int resolution) {
        if (h3Instance == null) {
            log.warn("H3Core is not initialized, falling back to dummy cell key");
            return String.format("fallback_cell_%.2f_%.2f", lat, lng);
        }
        return h3Instance.latLngToCellAddress(lat, lng, resolution);
    }

    /**
     * Lấy danh sách ô lục giác bao gồm ô trung tâm và k vòng lân cận xung quanh (kRing / gridDisk).
     * Với k = 1: trả về 7 ô (1 ô gốc + 6 ô tiếp giáp), bao phủ bán kính ~3km.
     */
    public static List<String> getSurroundingCells(String cellAddress, int kRing) {
        if (h3Instance == null || cellAddress == null || cellAddress.startsWith("fallback_")) {
            return cellAddress != null ? List.of(cellAddress) : Collections.emptyList();
        }
        try {
            return h3Instance.gridDisk(cellAddress, kRing);
        } catch (Exception e) {
            log.warn("Failed to get surrounding H3 cells for {}: {}", cellAddress, e.getMessage());
            return List.of(cellAddress);
        }
    }
}
