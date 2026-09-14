package com.makeup.platform.common.utils;

import com.makeup.platform.common.constants.TelemetryConstants;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.LineString;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

import java.security.SecureRandom;
import java.util.List;

public final class GeoDistanceUtils {

    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double EARTH_RADIUS_METERS = 6371000.0;
    private static final int SRID_WGS84 = 4326;
    private static final GeometryFactory GEOMETRY_FACTORY = new GeometryFactory(new PrecisionModel(), SRID_WGS84);
    private static final SecureRandom RANDOM = new SecureRandom();

    private GeoDistanceUtils() {}

    public static double calculateDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }

    public static double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        return calculateDistanceMeters(lat1, lon1, lat2, lon2) / 1000.0;
    }

    /**
     * Áp dụng làm mờ tọa độ (Privacy Fuzzing / Jittering)
     * Thêm độ lệch ngẫu nhiên trong bán kính 30m - 50m để bảo vệ sự riêng tư của thợ trên radar công khai.
     */
    public static double[] applyPrivacyFuzzing(double lat, double lng) {
        double minMeters = TelemetryConstants.FUZZING_MIN_METERS;
        double maxMeters = TelemetryConstants.FUZZING_MAX_METERS;
        double distanceMeters = minMeters + (maxMeters - minMeters) * RANDOM.nextDouble();
        double angleRad = RANDOM.nextDouble() * 2 * Math.PI;

        double deltaLat = (distanceMeters * Math.cos(angleRad)) / 111320.0;
        double deltaLng = (distanceMeters * Math.sin(angleRad)) / (111320.0 * Math.cos(Math.toRadians(lat)));

        return new double[]{lat + deltaLat, lng + deltaLng};
    }

    /**
     * Tính góc xoay hướng đi (Heading Bearing) từ 0 đến 360 độ dựa trên vector di chuyển giữa 2 điểm liên tiếp.
     */
    public static double calculateHeading(double lat1, double lon1, double lat2, double lon2) {
        double φ1 = Math.toRadians(lat1);
        double φ2 = Math.toRadians(lat2);
        double Δλ = Math.toRadians(lon2 - lon1);

        double y = Math.sin(Δλ) * Math.cos(φ2);
        double x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        double θ = Math.atan2(y, x);
        return (Math.toDegrees(θ) + 360.0) % 360.0;
    }

    public static Point createPoint(double lat, double lng) {
        // Lưu ý trong GIS/JTS: Coordinate(x = longitude, y = latitude)
        return GEOMETRY_FACTORY.createPoint(new Coordinate(lng, lat));
    }

    public static LineString createLineString(List<Coordinate> coordinates) {
        if (coordinates == null || coordinates.size() < 2) {
            throw new IllegalArgumentException("LineString requires at least 2 points");
        }
        return GEOMETRY_FACTORY.createLineString(coordinates.toArray(new Coordinate[0]));
    }
}
