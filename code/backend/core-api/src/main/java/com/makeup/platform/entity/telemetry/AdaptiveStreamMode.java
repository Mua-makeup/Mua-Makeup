package com.makeup.platform.entity.telemetry;

import lombok.Getter;

@Getter
public enum AdaptiveStreamMode {
    STOPPED(20, "Dừng xe / Tốc độ thấp (v < 3 km/h), chu kỳ 20s"),
    MOVING(5, "Di chuyển bình thường, chu kỳ 5s"),
    APPROACHING(3, "Gần tới điểm hẹn (< 300m), chu kỳ 3s");

    private final int intervalSeconds;
    private final String description;

    AdaptiveStreamMode(int intervalSeconds, String description) {
        this.intervalSeconds = intervalSeconds;
        this.description = description;
    }
}
