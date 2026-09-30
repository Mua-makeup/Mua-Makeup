package com.makeup.platform.repository.wallet;

import com.makeup.platform.entity.wallet.BookingSettlementEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BookingSettlementRepository extends JpaRepository<BookingSettlementEntity, Long> {

    Optional<BookingSettlementEntity> findByBookingId(Long bookingId);

    boolean existsByBookingId(Long bookingId);
}
