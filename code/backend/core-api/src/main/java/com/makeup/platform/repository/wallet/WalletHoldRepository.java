package com.makeup.platform.repository.wallet;

import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.wallet.WalletHoldEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface WalletHoldRepository extends JpaRepository<WalletHoldEntity, Long> {

    List<BookingStatus> ACTIVE_HOLD_STATUSES = List.of(
            BookingStatus.ACCEPTED,
            BookingStatus.AGENCY_ASSIGNED,
            BookingStatus.ON_THE_WAY,
            BookingStatus.ARRIVED,
            BookingStatus.IN_PROGRESS
    );

    Optional<WalletHoldEntity> findByBookingIdAndStatus(Long bookingId, String status);

    @Query("SELECT h FROM WalletHoldEntity h WHERE h.booking.id = :bookingId ORDER BY h.id DESC")
    List<WalletHoldEntity> findByBookingIdOrderByIdDesc(@Param("bookingId") Long bookingId);

    default Optional<WalletHoldEntity> findTopByBookingIdOrderByIdDesc(Long bookingId) {
        List<WalletHoldEntity> list = findByBookingIdOrderByIdDesc(bookingId);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    List<WalletHoldEntity> findAllByWalletIdAndStatus(Long walletId, String status);

    @Query("SELECT h FROM WalletHoldEntity h WHERE h.booking.mua.user.id = :muaUserId AND h.status = :status")
    List<WalletHoldEntity> findAllByMuaUserIdAndStatus(@Param("muaUserId") Long muaUserId, @Param("status") String status);

    @Query("SELECT COALESCE(SUM(h.amount), 0) FROM WalletHoldEntity h WHERE h.booking.mua.user.id = :muaUserId AND h.status = 'ACTIVE' AND h.booking.status IN :activeStatuses")
    BigDecimal sumActiveHoldsByMuaUserId(@Param("muaUserId") Long muaUserId, @Param("activeStatuses") Collection<BookingStatus> activeStatuses);

    default BigDecimal sumActiveHoldsByMuaUserId(Long muaUserId) {
        return sumActiveHoldsByMuaUserId(muaUserId, ACTIVE_HOLD_STATUSES);
    }

    @Query("SELECT h FROM WalletHoldEntity h LEFT JOIN FETCH h.booking b LEFT JOIN FETCH b.customer LEFT JOIN FETCH h.deposit WHERE b.mua.user.id = :muaUserId AND h.status = 'ACTIVE' AND b.status IN :activeStatuses ORDER BY h.createdAt DESC")
    List<WalletHoldEntity> findActiveHoldsByMuaUserId(@Param("muaUserId") Long muaUserId, @Param("activeStatuses") Collection<BookingStatus> activeStatuses);

    default List<WalletHoldEntity> findActiveHoldsByMuaUserId(Long muaUserId) {
        return findActiveHoldsByMuaUserId(muaUserId, ACTIVE_HOLD_STATUSES);
    }

    @Query("SELECT h FROM WalletHoldEntity h WHERE h.booking.id = :bookingId AND h.status = :status")
    List<WalletHoldEntity> findAllByBookingIdAndStatus(@Param("bookingId") Long bookingId, @Param("status") String status);

    @Query("SELECT h FROM WalletHoldEntity h WHERE h.booking.id = :bookingId AND h.status = 'ACTIVE'")
    Optional<WalletHoldEntity> findActiveHoldByBookingId(@Param("bookingId") Long bookingId);

    @Query("SELECT COALESCE(SUM(h.amount), 0) FROM WalletHoldEntity h WHERE h.wallet.id = :walletId AND h.status = 'ACTIVE' AND h.booking.status IN :activeStatuses")
    BigDecimal sumActiveHoldsByWalletId(@Param("walletId") Long walletId, @Param("activeStatuses") Collection<BookingStatus> activeStatuses);

    default BigDecimal sumActiveHoldsByWalletId(Long walletId) {
        return sumActiveHoldsByWalletId(walletId, ACTIVE_HOLD_STATUSES);
    }
}
