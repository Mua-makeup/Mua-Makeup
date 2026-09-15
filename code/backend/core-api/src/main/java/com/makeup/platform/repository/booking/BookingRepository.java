package com.makeup.platform.repository.booking;

import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<BookingEntity, Long> {

    Optional<BookingEntity> findByBookingCode(String bookingCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM BookingEntity b WHERE b.id = :id")
    Optional<BookingEntity> findByIdForUpdate(@Param("id") Long id);

    List<BookingEntity> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<BookingEntity> findByMuaIdOrderByCreatedAtDesc(Long muaId);

    List<BookingEntity> findByAgencyIdOrderByCreatedAtDesc(Long agencyId);

    List<BookingEntity> findByStatus(BookingStatus status);
}
