package com.makeup.platform.common.utils;

import java.time.LocalDate;
import java.time.Month;
import java.time.MonthDay;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public final class HolidayUtils {

    private HolidayUtils() {}

    // Fixed Solar Holidays
    private static final Set<MonthDay> FIXED_HOLIDAYS = new HashSet<>();
    private static final Map<MonthDay, String> FIXED_HOLIDAY_NAMES = new HashMap<>();

    // Lunar & specific date holiday overrides (Tết Âm Lịch & Giỗ Tổ)
    private static final Map<LocalDate, String> SPECIFIC_HOLIDAYS = new HashMap<>();

    static {
        // Tết Dương Lịch (01/01)
        MonthDay newYear = MonthDay.of(Month.JANUARY, 1);
        FIXED_HOLIDAYS.add(newYear);
        FIXED_HOLIDAY_NAMES.put(newYear, "Tết Dương Lịch");

        // Ngày Chiến thắng (30/04)
        MonthDay liberation = MonthDay.of(Month.APRIL, 30);
        FIXED_HOLIDAYS.add(liberation);
        FIXED_HOLIDAY_NAMES.put(liberation, "Ngày Giải phóng miền Nam (30/4)");

        // Quốc tế Lao động (01/05)
        MonthDay labor = MonthDay.of(Month.MAY, 1);
        FIXED_HOLIDAYS.add(labor);
        FIXED_HOLIDAY_NAMES.put(labor, "Quốc tế Lao động (1/5)");

        // Quốc khánh (02/09 & 03/09)
        MonthDay nationalDay1 = MonthDay.of(Month.SEPTEMBER, 2);
        MonthDay nationalDay2 = MonthDay.of(Month.SEPTEMBER, 3);
        FIXED_HOLIDAYS.add(nationalDay1);
        FIXED_HOLIDAYS.add(nationalDay2);
        FIXED_HOLIDAY_NAMES.put(nationalDay1, "Quốc khánh (2/9)");
        FIXED_HOLIDAY_NAMES.put(nationalDay2, "Nghỉ lễ Quốc khánh (3/9)");

        // Seed Lunar Holidays for 2025 - 2027
        // 2025 Tết Nguyên Đán
        addSpecificRange(LocalDate.of(2025, 1, 27), LocalDate.of(2025, 2, 2), "Tết Nguyên Đán 2025");
        SPECIFIC_HOLIDAYS.put(LocalDate.of(2025, 4, 7), "Giỗ Tổ Hùng Vương 2025");

        // 2026 Tết Nguyên Đán
        addSpecificRange(LocalDate.of(2026, 2, 15), LocalDate.of(2026, 2, 22), "Tết Nguyên Đán 2026");
        SPECIFIC_HOLIDAYS.put(LocalDate.of(2026, 4, 26), "Giỗ Tổ Hùng Vương 2026");

        // 2027 Tết Nguyên Đán
        addSpecificRange(LocalDate.of(2027, 2, 5), LocalDate.of(2027, 2, 12), "Tết Nguyên Đán 2027");
        SPECIFIC_HOLIDAYS.put(LocalDate.of(2027, 4, 16), "Giỗ Tổ Hùng Vương 2027");
    }

    private static void addSpecificRange(LocalDate start, LocalDate end, String name) {
        LocalDate current = start;
        while (!current.isAfter(end)) {
            SPECIFIC_HOLIDAYS.put(current, name);
            current = current.plusDays(1);
        }
    }

    public static boolean isHoliday(LocalDate date) {
        if (date == null) return false;
        MonthDay monthDay = MonthDay.of(date.getMonth(), date.getDayOfMonth());
        return FIXED_HOLIDAYS.contains(monthDay) || SPECIFIC_HOLIDAYS.containsKey(date);
    }

    public static String getHolidayName(LocalDate date) {
        if (date == null) return null;
        if (SPECIFIC_HOLIDAYS.containsKey(date)) {
            return SPECIFIC_HOLIDAYS.get(date);
        }
        MonthDay monthDay = MonthDay.of(date.getMonth(), date.getDayOfMonth());
        return FIXED_HOLIDAY_NAMES.get(monthDay);
    }
}
