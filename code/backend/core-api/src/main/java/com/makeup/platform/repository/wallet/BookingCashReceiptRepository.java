package com.makeup.platform.repository.wallet;

import com.makeup.platform.entity.wallet.BookingCashReceiptEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BookingCashReceiptRepository extends JpaRepository<BookingCashReceiptEntity, Long> {

    Optional<BookingCashReceiptEntity> findByBookingId(Long bookingId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM BookingCashReceiptEntity r WHERE r.booking.id = :bookingId")
    Optional<BookingCashReceiptEntity> findByBookingIdWithLock(@Param("bookingId") Long bookingId);

    boolean existsByBookingId(Long bookingId);
}
