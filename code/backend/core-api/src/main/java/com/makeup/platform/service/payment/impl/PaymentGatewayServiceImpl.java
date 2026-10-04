package com.makeup.platform.service.payment.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.payment.CreatePaymentIntentReq;
import com.makeup.platform.dto.response.payment.PaymentCheckoutRes;
import com.makeup.platform.dto.response.payment.PaymentDetailRes;
import com.makeup.platform.dto.response.payment.PaymentGatewayInfoRes;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import com.makeup.platform.mapper.payment.PaymentMapper;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.payment.PaymentTransactionRepository;
import com.makeup.platform.service.payment.PaymentGatewayService;
import com.makeup.platform.service.payment.gateway.PaymentGatewayRegistry;
import com.makeup.platform.service.payment.gateway.PaymentGatewayStrategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentGatewayServiceImpl implements PaymentGatewayService {

    private static final DateTimeFormatter DATE_CODE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final UserRepository userRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PaymentGatewayRegistry gatewayRegistry;
    private final PaymentMapper paymentMapper;

    @Override
    @Transactional(readOnly = true)
    public List<PaymentGatewayInfoRes> getAvailableGateways() {
        return gatewayRegistry.getAvailableGateways();
    }

    @Override
    @Transactional
    public PaymentCheckoutRes createPaymentIntent(Long userId, CreatePaymentIntentReq req, String clientIp) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_USER_NOT_FOUND, "ERR_USER_NOT_FOUND"));

        PaymentGatewayStrategy strategy = gatewayRegistry.getStrategy(req.getGatewayCode());

        String paymentCode = generatePaymentCode();

        PaymentTransactionEntity transaction = PaymentTransactionEntity.builder()
                .paymentCode(paymentCode)
                .user(user)
                .paymentGateway(strategy.gatewayCode())
                .amount(req.getAmount())
                .status("PENDING")
                .walletPostingStatus("NOT_POSTED")
                .build();

        transaction = paymentTransactionRepository.save(transaction);

        PaymentCheckoutRes checkoutRes = strategy.createCheckout(transaction, clientIp);

        transaction.setPaymentUrl(checkoutRes.getPaymentUrl());
        transaction.setQrCodeUrl(checkoutRes.getQrCodeUrl());
        transaction.setExpiresAt(checkoutRes.getExpiresAt());
        paymentTransactionRepository.save(transaction);

        return checkoutRes;
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentDetailRes getPaymentDetail(String paymentCode, Long userId) {
        PaymentTransactionEntity transaction = paymentTransactionRepository.findByPaymentCode(paymentCode)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_PAYMENT_TRANSACTION_NOT_FOUND, "ERR_PAYMENT_TRANSACTION_NOT_FOUND"));

        if (!transaction.getUser().getId().equals(userId)) {
            throw new CustomBusinessException(ErrorCodes.ERR_PAYMENT_UNAUTHORIZED, "ERR_PAYMENT_UNAUTHORIZED");
        }

        return paymentMapper.toPaymentDetailRes(transaction);
    }

    private String generatePaymentCode() {
        String datePart = LocalDate.now().format(DATE_CODE_FORMAT);
        String randomPart = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase(Locale.ROOT);
        return "PAY-" + datePart + "-" + randomPart;
    }
}
