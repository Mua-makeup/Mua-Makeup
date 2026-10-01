package com.makeup.platform.repository.wallet;

import com.makeup.platform.entity.wallet.WalletHoldEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface WalletHoldRepository extends JpaRepository<WalletHoldEntity, Long> {

    Optional<WalletHoldEntity> findByBookingIdAndStatus(Long bookingId, String status);

    List<WalletHoldEntity> findAllByWalletIdAndStatus(Long walletId, String status);

    @Query("SELECT COALESCE(SUM(h.amount), 0) FROM WalletHoldEntity h WHERE h.booking.mua.user.id = :muaUserId AND h.status = 'ACTIVE'")
    BigDecimal sumActiveHoldsByMuaUserId(@Param("muaUserId") Long muaUserId);

    @Query("SELECT h FROM WalletHoldEntity h WHERE h.booking.id = :bookingId AND h.status = 'ACTIVE'")
    Optional<WalletHoldEntity> findActiveHoldByBookingId(@Param("bookingId") Long bookingId);
}
