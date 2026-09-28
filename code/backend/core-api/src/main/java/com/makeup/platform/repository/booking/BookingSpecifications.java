package com.makeup.platform.repository.booking;

import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Locale;

/** Keeps admin and agency status aliases distinct while filtering in SQL. */
public final class BookingSpecifications {
    private BookingSpecifications() {}

    public static Specification<BookingEntity> agency(Long agencyId) {
        return (root, query, cb) -> cb.equal(root.get("agency").get("id"), agencyId);
    }

    public static Specification<BookingEntity> keyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.isBlank()) return cb.conjunction();
            String value = keyword.toLowerCase(Locale.ROOT).trim()
                    .replace("!", "!!").replace("%", "!%").replace("_", "!_");
            String pattern = "%" + value + "%";
            var customer = root.join("customer", JoinType.LEFT);
            return cb.or(cb.like(cb.lower(root.get("bookingCode")), pattern, '!'),
                    cb.like(cb.lower(customer.get("fullName")), pattern, '!'),
                    cb.like(customer.get("phoneNumber"), pattern, '!'),
                    cb.like(cb.lower(root.get("destinationAddress")), pattern, '!'));
        };
    }

    public static Specification<BookingEntity> adminStatus(String status) {
        if (status == null || status.isBlank() || status.equalsIgnoreCase("ALL")) return all();
        String normalized = status.toUpperCase(Locale.ROOT).trim();
        return switch (normalized) {
            case "PENDING_AGENCY_DISPATCH" -> statuses(BookingStatus.PENDING_AGENCY_DISPATCH, BookingStatus.REQUESTED);
            case "CONFIRMED", "AGENCY_ASSIGNED" -> statuses(BookingStatus.AGENCY_ASSIGNED, BookingStatus.ACCEPTED);
            case "IN_PROGRESS" -> statuses(BookingStatus.IN_PROGRESS, BookingStatus.ON_THE_WAY, BookingStatus.ARRIVED);
            case "COMPLETED" -> statuses(BookingStatus.COMPLETED, BookingStatus.PAID_OUT);
            case "CANCELLED" -> statuses(BookingStatus.CANCELLED, BookingStatus.CANCELLED_EXPIRED);
            default -> {
                try {
                    yield statuses(BookingStatus.valueOf(normalized));
                } catch (IllegalArgumentException ex) {
                    yield (root, query, cb) -> cb.disjunction();
                }
            }
        };
    }

    public static Specification<BookingEntity> agencyStatus(String status) {
        if (status == null || status.isBlank() || status.equalsIgnoreCase("ALL")) return all();
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "EMERGENCY_REASSIGNMENT" -> (root, query, cb) -> cb.and(
                    cb.isTrue(root.get("needsEmergencyReassignment")),
                    cb.not(root.get("status").in(BookingStatus.CANCELLED, BookingStatus.CANCELLED_EXPIRED,
                            BookingStatus.COMPLETED, BookingStatus.PAID_OUT)));
            case "CONFIRMED" -> statuses(BookingStatus.ACCEPTED, BookingStatus.AGENCY_ASSIGNED,
                    BookingStatus.ARRIVED, BookingStatus.ON_THE_WAY);
            case "CANCELLED" -> statuses(BookingStatus.CANCELLED, BookingStatus.CANCELLED_EXPIRED);
            default -> {
                try {
                    yield statuses(BookingStatus.valueOf(status.toUpperCase(Locale.ROOT)));
                } catch (IllegalArgumentException ex) {
                    // Retain the existing agency behavior for an unknown filter.
                    yield all();
                }
            }
        };
    }

    private static Specification<BookingEntity> statuses(BookingStatus... statuses) {
        return (root, query, cb) -> root.get("status").in(List.of(statuses));
    }

    private static Specification<BookingEntity> all() {
        return (root, query, cb) -> cb.conjunction();
    }
}
