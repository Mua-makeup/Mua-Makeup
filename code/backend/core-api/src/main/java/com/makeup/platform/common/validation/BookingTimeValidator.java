package com.makeup.platform.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import lombok.extern.slf4j.Slf4j;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Slf4j
public class BookingTimeValidator implements ConstraintValidator<ValidBookingTime, Object> {

    private static final LocalTime WORK_DAY_START = LocalTime.of(3, 0); // Cho phép đặt ca sớm từ 03:00 sáng
    private static final LocalTime WORK_DAY_END = LocalTime.of(22, 0);
    private static final int MAX_ADVANCE_BOOKING_DAYS = 90;

    @Override
    public boolean isValid(Object obj, ConstraintValidatorContext context) {
        if (obj == null) {
            return true;
        }

        try {
            Method getDateMethod = obj.getClass().getMethod("getBookingDate");
            Method getTimeMethod = obj.getClass().getMethod("getStartTime");

            Object dateVal = getDateMethod.invoke(obj);
            Object timeVal = getTimeMethod.invoke(obj);

            if (dateVal == null || timeVal == null) {
                return true; // Để @NotNull xử lý riêng
            }

            LocalDate bookingDate = toLocalDate(dateVal);
            LocalTime startTime = toLocalTime(timeVal);

            if (bookingDate == null || startTime == null) {
                return true;
            }

            // 1. Kiểm tra khung giờ phục vụ 03:00 - 22:00
            if (startTime.isBefore(WORK_DAY_START) || startTime.isAfter(WORK_DAY_END)) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate("booking.time_out_of_service")
                        .addPropertyNode("startTime")
                        .addConstraintViolation();
                return false;
            }

            // 2. Kiểm tra thời điểm đặt phải ở tương lai tối thiểu 2 giờ
            LocalDateTime scheduledDateTime = LocalDateTime.of(bookingDate, startTime);
            LocalDateTime minAllowedDateTime = LocalDateTime.now().plusHours(2);
            if (scheduledDateTime.isBefore(minAllowedDateTime)) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate("booking.time_must_be_2h_future")
                        .addPropertyNode("startTime")
                        .addConstraintViolation();
                return false;
            }

            // 3. Kiểm tra ngày đặt không quá 90 ngày trong tương lai
            LocalDate maxAllowedDate = LocalDate.now().plusDays(MAX_ADVANCE_BOOKING_DAYS);
            if (bookingDate.isAfter(maxAllowedDate)) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate("booking.date_too_far")
                        .addPropertyNode("bookingDate")
                        .addConstraintViolation();
                return false;
            }

        } catch (NoSuchMethodException e) {
            log.warn("Class {} does not have getBookingDate() or getStartTime() methods", obj.getClass().getName());
        } catch (Exception e) {
            log.error("Error during @ValidBookingTime validation", e);
        }

        return true;
    }

    private LocalDate toLocalDate(Object val) {
        if (val instanceof LocalDate) {
            return (LocalDate) val;
        } else if (val instanceof String) {
            try {
                return LocalDate.parse((String) val);
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    private LocalTime toLocalTime(Object val) {
        if (val instanceof LocalTime) {
            return (LocalTime) val;
        } else if (val instanceof String) {
            try {
                return LocalTime.parse((String) val);
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }
}
