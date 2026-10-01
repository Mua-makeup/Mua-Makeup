package com.makeup.platform.repository.payment;

import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransactionEntity, Long> {

    Optional<PaymentTransactionEntity> findByPaymentCode(String paymentCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentTransactionEntity p WHERE p.paymentCode = :paymentCode")
    Optional<PaymentTransactionEntity> findByPaymentCodeWithLock(@Param("paymentCode") String paymentCode);

    Optional<PaymentTransactionEntity> findByPaymentGatewayAndGatewayRequestId(String paymentGateway, String gatewayRequestId);

    Optional<PaymentTransactionEntity> findByPaymentGatewayAndGatewayTransactionId(String paymentGateway, String gatewayTransactionId);

    Page<PaymentTransactionEntity> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @Query("SELECT p FROM PaymentTransactionEntity p WHERE p.booking.id = :bookingId AND p.status = :status ORDER BY p.createdAt DESC")
    List<PaymentTransactionEntity> findByBookingIdAndStatus(@Param("bookingId") Long bookingId, @Param("status") String status);

    Optional<PaymentTransactionEntity> findByUserIdAndIdempotencyKey(Long userId, String idempotencyKey);
}

