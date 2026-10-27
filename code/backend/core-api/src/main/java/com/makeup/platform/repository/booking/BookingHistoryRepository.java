package com.makeup.platform.repository.booking;

import com.makeup.platform.entity.booking.BookingHistoryEntity;
import com.makeup.platform.entity.booking.BookingStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingHistoryRepository extends JpaRepository<BookingHistoryEntity, Long> {

    boolean existsByBookingIdAndToStatusIn(Long bookingId, List<BookingStatus> statuses);

    List<BookingHistoryEntity> findByBookingIdOrderByCreatedAtAsc(Long bookingId);
}
