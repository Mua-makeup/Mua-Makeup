package com.makeup.platform.repository.wallet;

import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.List;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntryEntity, Long> {
    List<LedgerEntryEntity> findByReferenceIdAndReferenceTypeAndEntryType(Long referenceId, String referenceType, String entryType);

    Optional<LedgerEntryEntity> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);

    Page<LedgerEntryEntity> findAllByWalletIdOrderByCreatedAtDesc(Long walletId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntryEntity l WHERE l.wallet.id = :walletId AND l.entryType = 'CREDIT' AND l.referenceType = 'BOOKING_SETTLEMENT'")
    BigDecimal sumSettledRevenueByWalletId(@Param("walletId") Long walletId);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntryEntity l WHERE l.wallet.id = :walletId AND l.referenceType = 'BOOKING_CLAWBACK'")
    BigDecimal sumClawbackByWalletId(@Param("walletId") Long walletId);

    @Query("SELECT COALESCE(SUM(l.amount), 0) FROM LedgerEntryEntity l WHERE l.wallet.id = :walletId AND l.referenceType = 'OVERTIME_PAYMENT'")
    BigDecimal sumOvertimePaidByWalletId(@Param("walletId") Long walletId);
}
