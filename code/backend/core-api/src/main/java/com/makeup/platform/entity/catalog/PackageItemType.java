package com.makeup.platform.entity.catalog;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum PackageItemType {
    COMPONENT,
    ADD_ON;

    @JsonCreator
    public static PackageItemType fromValue(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toUpperCase().replace("-", "_");
        if ("INCLUDED".equals(normalized) || "COMPONENT".equals(normalized)) {
            return COMPONENT;
        }
        if ("OPTIONAL_ADDON".equals(normalized) || "ADD_ON".equals(normalized) || "ADDON".equals(normalized)) {
            return ADD_ON;
        }
        return PackageItemType.valueOf(normalized);
    }
}
