package com.makeup.platform.repository.booking;

import com.makeup.platform.entity.booking.MuaJobOfferEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public interface MuaJobOfferRepository extends JpaRepository<MuaJobOfferEntity, Long> {

    @Query("SELECT COUNT(o) FROM MuaJobOfferEntity o WHERE o.mua.id = :muaId AND o.createdAt >= :since")
    long countTotalOffersInPeriod(@Param("muaId") Long muaId, @Param("since") OffsetDateTime since);

    @Query("SELECT COUNT(o) FROM MuaJobOfferEntity o WHERE o.mua.id = :muaId AND o.responseStatus = 'ACCEPTED' AND o.createdAt >= :since")
    long countAcceptedOffersInPeriod(@Param("muaId") Long muaId, @Param("since") OffsetDateTime since);

    Optional<MuaJobOfferEntity> findFirstByMuaIdAndBookingIdOrderByIdDesc(Long muaId, Long bookingId);
}
