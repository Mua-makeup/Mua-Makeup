package com.makeup.platform.service.admin.impl;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.response.admin.AdminRevenueOverviewRes;
import com.makeup.platform.dto.response.admin.AdminRevenueSettlementItemRes;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingPartner;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.wallet.BookingSettlementEntity;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.booking.BookingSpecifications;
import com.makeup.platform.repository.wallet.BookingSettlementRepository;
import com.makeup.platform.service.admin.AdminRevenueService;
import com.makeup.platform.service.wallet.PlatformFeeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminRevenueServiceImpl implements AdminRevenueService {

    private final BookingRepository bookingRepository;
    private final BookingSettlementRepository bookingSettlementRepository;
    private final PlatformFeeService platformFeeService;

    @Override
    @Transactional(readOnly = true)
    public AdminRevenueOverviewRes getRevenueOverview() {
        BigDecimal liveRate = platformFeeService.getRate();

        List<BookingEntity> revenueBookings = bookingRepository.findAll(BookingSpecifications.revenueEligible());

        BigDecimal totalGrossVolume = BigDecimal.ZERO;
        BigDecimal totalPlatformFee = BigDecimal.ZERO;
        BigDecimal totalNetPartnerEarnings = BigDecimal.ZERO;

        long completedBookingsCount = 0;
        long paidOutBookingsCount = 0;

        BigDecimal agencyGrossVolume = BigDecimal.ZERO;
        BigDecimal agencyPlatformFee = BigDecimal.ZERO;
        BigDecimal agencyNetEarnings = BigDecimal.ZERO;
        long agencyBookingCount = 0;

        BigDecimal freelanceGrossVolume = BigDecimal.ZERO;
        BigDecimal freelancePlatformFee = BigDecimal.ZERO;
        BigDecimal freelanceNetEarnings = BigDecimal.ZERO;
        long freelanceBookingCount = 0;

        for (BookingEntity booking : revenueBookings) {
            BigDecimal bookingTotal = booking.getTotalAmount() != null ? booking.getTotalAmount() : BigDecimal.ZERO;
            if (booking.getStatus() == BookingStatus.COMPLETED) {
                completedBookingsCount++;
            } else if (booking.getStatus() == BookingStatus.PAID_OUT) {
                paidOutBookingsCount++;
            }

            Optional<BookingSettlementEntity> settlementOpt = bookingSettlementRepository.findByBookingId(booking.getId());

            BigDecimal bookingFee;
            BigDecimal bookingNet;

            if (settlementOpt.isPresent()) {
                BookingSettlementEntity settlement = settlementOpt.get();
                bookingFee = settlement.getCommissionAmount() != null ? settlement.getCommissionAmount() : BigDecimal.ZERO;
                bookingNet = settlement.getFreelancerEarnings() != null ? settlement.getFreelancerEarnings()
                        : bookingTotal.subtract(bookingFee);
            } else {
                bookingFee = bookingTotal.multiply(liveRate).setScale(0, RoundingMode.HALF_UP);
                bookingNet = bookingTotal.subtract(bookingFee);
            }

            totalGrossVolume = totalGrossVolume.add(bookingTotal);
            totalPlatformFee = totalPlatformFee.add(bookingFee);
            totalNetPartnerEarnings = totalNetPartnerEarnings.add(bookingNet);

            if (booking.getBookingPartner() == BookingPartner.AGENCY_DISPATCH) {
                agencyGrossVolume = agencyGrossVolume.add(bookingTotal);
                agencyPlatformFee = agencyPlatformFee.add(bookingFee);
                agencyNetEarnings = agencyNetEarnings.add(bookingNet);
                agencyBookingCount++;
            } else {
                freelanceGrossVolume = freelanceGrossVolume.add(bookingTotal);
                freelancePlatformFee = freelancePlatformFee.add(bookingFee);
                freelanceNetEarnings = freelanceNetEarnings.add(bookingNet);
                freelanceBookingCount++;
            }
        }

        return AdminRevenueOverviewRes.builder()
                .totalGrossVolume(totalGrossVolume)
                .totalPlatformFee(totalPlatformFee)
                .totalNetPartnerEarnings(totalNetPartnerEarnings)
                .platformFeeRate(liveRate)
                .totalSettledCount((long) revenueBookings.size())
                .completedBookingsCount(completedBookingsCount)
                .paidOutBookingsCount(paidOutBookingsCount)
                .agencyGrossVolume(agencyGrossVolume)
                .agencyPlatformFee(agencyPlatformFee)
                .agencyNetEarnings(agencyNetEarnings)
                .agencyBookingCount(agencyBookingCount)
                .freelanceGrossVolume(freelanceGrossVolume)
                .freelancePlatformFee(freelancePlatformFee)
                .freelanceNetEarnings(freelanceNetEarnings)
                .freelanceBookingCount(freelanceBookingCount)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AdminRevenueSettlementItemRes> getRevenueSettlements(
            String partner,
            String status,
            String keyword,
            Pageable pageable
    ) {
        BigDecimal liveRate = platformFeeService.getRate();

        var spec = BookingSpecifications.revenueStatus(status)
                .and(BookingSpecifications.partner(partner))
                .and(BookingSpecifications.keyword(keyword));

        Sort order = Sort.by(Sort.Direction.DESC, "createdAt", "id");
        Pageable queryPage = pageable == null || pageable.isUnpaged()
                ? Pageable.unpaged(order)
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), order);

        Page<BookingEntity> bookingPage = bookingRepository.findAll(spec, queryPage);

        Page<AdminRevenueSettlementItemRes> mappedPage = bookingPage.map(booking -> {
            BigDecimal totalAmount = booking.getTotalAmount() != null ? booking.getTotalAmount() : BigDecimal.ZERO;
            Optional<BookingSettlementEntity> settlementOpt = bookingSettlementRepository.findByBookingId(booking.getId());

            BigDecimal feeRate = liveRate;
            BigDecimal feeAmount;
            BigDecimal netEarnings;
            String payoutStatus = "PENDING";
            OffsetDateTime settledAt = null;

            if (settlementOpt.isPresent()) {
                BookingSettlementEntity settlement = settlementOpt.get();
                if (settlement.getCommissionRate() != null) {
                    feeRate = settlement.getCommissionRate();
                }
                feeAmount = settlement.getCommissionAmount() != null
                        ? settlement.getCommissionAmount()
                        : totalAmount.multiply(feeRate).setScale(0, RoundingMode.HALF_UP);
                netEarnings = settlement.getFreelancerEarnings() != null
                        ? settlement.getFreelancerEarnings()
                        : totalAmount.subtract(feeAmount);

                if ("SETTLED".equalsIgnoreCase(settlement.getStatus())) {
                    payoutStatus = "SETTLED";
                }
                settledAt = settlement.getSettledAt();
            } else {
                feeAmount = totalAmount.multiply(feeRate).setScale(0, RoundingMode.HALF_UP);
                netEarnings = totalAmount.subtract(feeAmount);
                if (booking.getStatus() == BookingStatus.PAID_OUT) {
                    payoutStatus = "SETTLED";
                }
            }

            String providerName = "N/A";
            Long agencyId = null;
            String agencyName = null;
            Long muaId = null;
            String muaName = null;

            if (booking.getAgency() != null) {
                agencyId = booking.getAgency().getId();
                agencyName = booking.getAgency().getAgencyName();
                providerName = agencyName != null ? agencyName : "Studio";
            } else if (booking.getMua() != null) {
                muaId = booking.getMua().getId();
                if (booking.getMua().getUser() != null) {
                    muaName = booking.getMua().getUser().getFullName();
                }
                providerName = muaName != null ? muaName : "Thợ tự do";
            }

            String customerName = booking.getCustomer() != null ? booking.getCustomer().getFullName() : "N/A";
            String customerPhone = booking.getCustomer() != null ? booking.getCustomer().getPhoneNumber() : "N/A";
            String packageName = booking.getServicePackage() != null ? booking.getServicePackage().getPackageName() : "Dịch vụ trang điểm";
            String bookingPartner = booking.getBookingPartner() != null ? booking.getBookingPartner().name() : "FREELANCER_DIRECT";
            String bookingType = booking.getBookingType() != null ? booking.getBookingType().name() : "SCHEDULED";
            String bookingStatus = booking.getStatus() != null ? booking.getStatus().name() : "COMPLETED";

            LocalDate bookingDate = booking.getBookingDate();
            LocalDateTime createdAt = booking.getCreatedAt();

            return AdminRevenueSettlementItemRes.builder()
                    .bookingId(booking.getId())
                    .bookingCode(booking.getBookingCode())
                    .bookingType(bookingType)
                    .bookingPartner(bookingPartner)
                    .providerName(providerName)
                    .agencyId(agencyId)
                    .agencyName(agencyName)
                    .muaId(muaId)
                    .muaName(muaName)
                    .customerName(customerName)
                    .customerPhone(customerPhone)
                    .packageName(packageName)
                    .totalAmount(totalAmount)
                    .platformFeeRate(feeRate)
                    .platformFeeAmount(feeAmount)
                    .netPartnerEarnings(netEarnings)
                    .status(bookingStatus)
                    .payoutStatus(payoutStatus)
                    .bookingDate(bookingDate)
                    .createdAt(createdAt)
                    .settledAt(settledAt)
                    .build();
        });

        if (queryPage.isUnpaged()) {
            return PageResponse.<AdminRevenueSettlementItemRes>builder()
                    .content(mappedPage.getContent())
                    .page(0)
                    .size(mappedPage.getNumberOfElements())
                    .totalElements(mappedPage.getTotalElements())
                    .totalPages(mappedPage.isEmpty() ? 0 : 1)
                    .last(true)
                    .build();
        }

        return PageResponse.from(mappedPage);
    }
}

