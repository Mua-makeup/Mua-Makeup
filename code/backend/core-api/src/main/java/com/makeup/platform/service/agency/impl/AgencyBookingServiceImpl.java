package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.response.agency.AgencyBookingRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.service.agency.AgencyBookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyBookingServiceImpl implements AgencyBookingService {

    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyStaffRepository agencyStaffRepository;
    private final BookingRepository bookingRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AgencyBookingRes> getAgencyBookings(Long ownerUserId, String status, String keyword) {
        AgencyProfileEntity agency = agencyProfileRepository.findByOwnerId(ownerUserId)
                .orElseThrow(() -> new CustomBusinessException(ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "agency.not_found", HttpStatus.NOT_FOUND));

        List<BookingEntity> bookings = bookingRepository.findByAgencyIdOrderByCreatedAtDesc(agency.getId());

        return bookings.stream()
                .filter(b -> {
                    // Filter status
                    if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
                        try {
                            BookingStatus target = BookingStatus.valueOf(status.toUpperCase());
                            if (b.getStatus() != target) {
                                return false;
                            }
                        } catch (IllegalArgumentException e) {
                            log.warn("Invalid agency booking status filter: {}", status);
                        }
                    }

                    // Filter keyword
                    if (keyword != null && !keyword.isBlank()) {
                        String kw = keyword.toLowerCase().trim();
                        boolean matchCode = b.getBookingCode() != null && b.getBookingCode().toLowerCase().contains(kw);
                        boolean matchCustName = b.getCustomer() != null && b.getCustomer().getFullName() != null &&
                                b.getCustomer().getFullName().toLowerCase().contains(kw);
                        boolean matchCustPhone = b.getCustomer() != null && b.getCustomer().getPhoneNumber() != null &&
                                b.getCustomer().getPhoneNumber().contains(kw);
                        boolean matchAddress = b.getDestinationAddress() != null &&
                                b.getDestinationAddress().toLowerCase().contains(kw);
                        return matchCode || matchCustName || matchCustPhone || matchAddress;
                    }

                    return true;
                })
                .map(b -> mapToAgencyBookingRes(b, agency))
                .collect(Collectors.toList());
    }

    private AgencyBookingRes mapToAgencyBookingRes(BookingEntity b, AgencyProfileEntity agency) {
        String customerName = null;
        String customerPhone = null;
        Long customerId = null;
        if (b.getCustomer() != null) {
            customerId = b.getCustomer().getId();
            customerName = b.getCustomer().getFullName();
            customerPhone = b.getCustomer().getPhoneNumber();
        }

        Long staffMuaId = null;
        String staffName = null;
        String staffPhone = null;
        BigDecimal staffCommissionRate = agency.getCommissionRateInternal() != null ?
                agency.getCommissionRateInternal() : BigDecimal.valueOf(30.0);

        if (b.getMua() != null) {
            staffMuaId = b.getMua().getId();
            if (b.getMua().getUser() != null) {
                staffName = b.getMua().getUser().getFullName();
                staffPhone = b.getMua().getUser().getPhoneNumber();
            }

            // Check if staff has custom commission
            Optional<AgencyStaffEntity> staffOpt = agencyStaffRepository.findByAgencyIdAndMuaId(agency.getId(), staffMuaId);
            if (staffOpt.isPresent() && staffOpt.get().getAgreedCommissionRate() != null) {
                staffCommissionRate = staffOpt.get().getAgreedCommissionRate();
            }
        }


        BigDecimal totalAmount = b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal commissionMultiplier = staffCommissionRate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal estimatedStaffCommission = totalAmount.multiply(commissionMultiplier).setScale(2, RoundingMode.HALF_UP);
        BigDecimal estimatedStudioNet = totalAmount.subtract(estimatedStaffCommission).setScale(2, RoundingMode.HALF_UP);

        return AgencyBookingRes.builder()
                .id(b.getId())
                .bookingCode(b.getBookingCode())
                .customerId(customerId)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .staffMuaId(staffMuaId)
                .staffName(staffName)
                .staffPhone(staffPhone)
                .staffCommissionRate(staffCommissionRate)
                .bookingType(b.getBookingType() != null ? b.getBookingType().name() : null)
                .status(b.getStatus() != null ? b.getStatus().name() : null)
                .destinationAddress(b.getDestinationAddress())
                .bookingDate(b.getBookingDate())
                .startTime(b.getStartTime())
                .totalAmount(totalAmount)
                .depositAmount(b.getDepositAmount() != null ? b.getDepositAmount() : BigDecimal.ZERO)
                .estimatedStaffCommission(estimatedStaffCommission)
                .estimatedStudioNet(estimatedStudioNet)
                .createdAt(b.getCreatedAt())
                .build();
    }
}
