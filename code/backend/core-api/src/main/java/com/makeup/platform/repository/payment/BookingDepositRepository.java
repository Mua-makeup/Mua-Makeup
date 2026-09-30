package com.makeup.platform.repository.payment;

import com.makeup.platform.entity.payment.BookingDepositEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingDepositRepository extends JpaRepository<BookingDepositEntity, Long> {

    Optional<BookingDepositEntity> findByBookingId(Long bookingId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM BookingDepositEntity d WHERE d.booking.id = :bookingId")
    Optional<BookingDepositEntity> findByBookingIdWithLock(@Param("bookingId") Long bookingId);

    @Query("SELECT d FROM BookingDepositEntity d WHERE d.status IN ('UNPAID','PENDING') AND d.expiresAt <= :now")
    List<BookingDepositEntity> findExpiredDeposits(@Param("now") OffsetDateTime now);

    boolean existsByBookingId(Long bookingId);
}
