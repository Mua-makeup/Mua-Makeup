package com.makeup.platform.repository.booking;

import com.makeup.platform.entity.booking.BookingHistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingHistoryRepository extends JpaRepository<BookingHistoryEntity, Long> {

    List<BookingHistoryEntity> findByBookingIdOrderByCreatedAtAsc(Long bookingId);
}
