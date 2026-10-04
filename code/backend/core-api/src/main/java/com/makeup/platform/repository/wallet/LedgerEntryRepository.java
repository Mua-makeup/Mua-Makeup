package com.makeup.platform.repository.wallet;

import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntryEntity, Long> {

    Optional<LedgerEntryEntity> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);

    Page<LedgerEntryEntity> findAllByWalletIdOrderByCreatedAtDesc(Long walletId, Pageable pageable);
}
