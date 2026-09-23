package com.makeup.platform.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import lombok.extern.slf4j.Slf4j;

import java.lang.reflect.Method;
import java.time.LocalTime;

@Slf4j
public class TimeRangeValidator implements ConstraintValidator<ValidTimeRange, Object> {

    @Override
    public boolean isValid(Object obj, ConstraintValidatorContext context) {
        if (obj == null) {
            return true;
        }

        try {
            Method getStartMethod = obj.getClass().getMethod("getStartTime");
            Method getEndMethod = obj.getClass().getMethod("getEndTime");

            Object startVal = getStartMethod.invoke(obj);
            Object endVal = getEndMethod.invoke(obj);

            if (startVal == null || endVal == null) {
                return true; // Để @NotNull xử lý riêng
            }

            LocalTime start = toLocalTime(startVal);
            LocalTime end = toLocalTime(endVal);

            if (start != null && end != null) {
                return end.isAfter(start);
            }
        } catch (NoSuchMethodException e) {
            log.warn("Class {} does not have getStartTime() and getEndTime() methods", obj.getClass().getName());
        } catch (Exception e) {
            log.error("Error during @ValidTimeRange validation", e);
        }

        return true;
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
