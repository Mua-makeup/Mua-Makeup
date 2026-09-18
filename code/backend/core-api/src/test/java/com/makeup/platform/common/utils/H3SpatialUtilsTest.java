
package com.makeup.platform.common.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("H3SpatialUtils Unit Tests")
class H3SpatialUtilsTest {

    @Test
    @DisplayName("Should convert Ho Chi Minh City coordinates to valid H3 Cell Address")
    void testLatLngToCell() {
        // Tọa độ Bến Thành, Quận 1: 10.7721, 106.6983
        double lat = 10.7721;
        double lng = 106.6983;

        String cellAddress = H3SpatialUtils.latLngToCell(lat, lng);

        assertNotNull(cellAddress);
        assertFalse(cellAddress.isBlank());
        // Cell ID H3 hex string thường có độ dài 15 ký tự (ví dụ: 872830828ffffff)
        assertTrue(cellAddress.length() >= 15);
    }

    @Test
    @DisplayName("Should return 7 cells for kRing=1 (center + 6 neighbors)")
    void testGetSurroundingCells() {
        double lat = 10.7721;
        double lng = 106.6983;
        String centerCell = H3SpatialUtils.latLngToCell(lat, lng);

        List<String> surrounding = H3SpatialUtils.getSurroundingCells(centerCell, 1);

        assertNotNull(surrounding);
        assertEquals(7, surrounding.size());
        assertTrue(surrounding.contains(centerCell));
    }

    @Test
    @DisplayName("Nearby locations (~100m) should map to the same H3 Res 7 cell")
    void testNearbyLocationsSameCell() {
        // 2 điểm cách nhau ~100 mét ở Quận 1
        String cell1 = H3SpatialUtils.latLngToCell(10.7721, 106.6983);
        String cell2 = H3SpatialUtils.latLngToCell(10.7728, 106.6987);

        assertEquals(cell1, cell2, "Nearby locations within ~100m should map to the same H3 resolution 7 cell");
    }
}
