package com.makeup.platform.repository.telemetry;

import com.makeup.platform.entity.telemetry.BookingTripEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BookingTripRepository extends JpaRepository<BookingTripEntity, Long> {

    Optional<BookingTripEntity> findByBookingId(Long bookingId);

    boolean existsByBookingId(Long bookingId);
}
