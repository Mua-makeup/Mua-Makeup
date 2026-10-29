package com.makeup.platform.mapper.agency;

import com.makeup.platform.dto.response.agency.AgencyBookingRes;
import com.makeup.platform.dto.response.agency.StaffAssignmentDetailRes;
import com.makeup.platform.dto.response.catalog.PackageItemRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.entity.catalog.PackageItemType;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.mapper.booking.BookingStaffAssignmentMapper;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.wallet.BookingSettlementRepository;
import com.makeup.platform.service.wallet.PlatformFeeService;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.repository.payment.PaymentTransactionRepository;
import com.makeup.platform.repository.wallet.BookingCashReceiptRepository;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import com.makeup.platform.entity.wallet.BookingCashReceiptEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class AgencyBookingMapper {

    private final AgencyStaffRepository agencyStaffRepository;
    private final BookingStaffAssignmentMapper bookingStaffAssignmentMapper;
    private final BookingSettlementRepository settlementRepository;
    private final PlatformFeeService platformFeeService;
    private final BookingDepositRepository bookingDepositRepository;
    private final BookingCashReceiptRepository cashReceiptRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;

    public AgencyBookingRes toRes(BookingEntity b, AgencyProfileEntity agency) {
        return toRes(b, agency, null);
    }

    public AgencyBookingRes toRes(BookingEntity b, AgencyProfileEntity agency, Map<Long, BigDecimal> commissionRates) {
        if (b == null) {
            return null;
        }

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
        BigDecimal staffCommissionRate = (agency != null && agency.getCommissionRateInternal() != null)
                ? agency.getCommissionRateInternal()
                : BigDecimal.valueOf(30.0);

        if (b.getMua() != null) {
            staffMuaId = b.getMua().getId();
            if (b.getMua().getUser() != null) {
                staffName = b.getMua().getUser().getFullName();
                staffPhone = b.getMua().getUser().getPhoneNumber();
            }

            if (agency != null) {
                BigDecimal agreedRate;
                if (commissionRates != null) {
                    agreedRate = commissionRates.get(staffMuaId);
                } else {
                    agreedRate = agencyStaffRepository.findByAgencyIdAndMuaId(agency.getId(), staffMuaId)
                            .map(AgencyStaffEntity::getAgreedCommissionRate).orElse(null);
                }
                if (agreedRate != null) staffCommissionRate = agreedRate;
            }
        }

        BigDecimal totalAmount = b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO;
        
        BigDecimal sumStaffCommissions = BigDecimal.ZERO;
        boolean hasStaffCommissionAmounts = false;
        if (b.getStaffAssignments() != null && !b.getStaffAssignments().isEmpty()) {
            for (BookingStaffAssignmentEntity sa : b.getStaffAssignments()) {
                if (sa.getStatus() == AssignmentStatus.ACTIVE && sa.getCommissionAmount() != null && sa.getCommissionAmount().compareTo(BigDecimal.ZERO) > 0) {
                    sumStaffCommissions = sumStaffCommissions.add(sa.getCommissionAmount());
                    hasStaffCommissionAmounts = true;
                }
            }
        }

        BigDecimal estimatedStaffCommission;
        if (hasStaffCommissionAmounts) {
            estimatedStaffCommission = sumStaffCommissions;
        } else {
            BigDecimal commissionMultiplier = staffCommissionRate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            estimatedStaffCommission = totalAmount.multiply(commissionMultiplier).setScale(2, RoundingMode.HALF_UP);
        }
        var settlement = settlementRepository.findByBookingId(b.getId()).orElse(null);
        BigDecimal platformFeeRate = settlement != null ? settlement.getCommissionRate()
                : platformFeeService.rateFor(b);
        BigDecimal platformFee = settlement != null ? settlement.getCommissionAmount()
                : totalAmount.multiply(platformFeeRate).setScale(0, RoundingMode.HALF_UP);
        BigDecimal estimatedStudioNet = totalAmount.subtract(platformFee).subtract(estimatedStaffCommission).setScale(2, RoundingMode.HALF_UP);

        String servicePkgName = null;
        Long pkgId = null;
        String packageDescription = null;
        BigDecimal packagePrice = null;
        Integer packageDurationMinutes = null;
        String categoryName = null;
        List<PackageItemRes> packageItems = Collections.emptyList();

        ServicePackageEntity pkg = b.getServicePackage();
        if (pkg != null) {
            pkgId = pkg.getId();
            servicePkgName = pkg.getPackageName();
            packageDescription = pkg.getDescription();
            packagePrice = pkg.getPrice();
            packageDurationMinutes = pkg.getEstimatedDurationMinutes();
            if (pkg.getMasterCategory() != null) {
                categoryName = pkg.getMasterCategory().getCategoryName();
            }
            if (pkg.getPackageItems() != null) {
                Set<String> selectedAddonSet = new HashSet<>();
                if (b.getSelectedAddons() != null && !b.getSelectedAddons().isBlank()) {
                    String[] parts = b.getSelectedAddons().split(",,,");
                    for (String p : parts) {
                        if (p != null && !p.isBlank()) {
                            selectedAddonSet.add(p.trim().toLowerCase());
                        }
                    }
                }

                packageItems = pkg.getPackageItems().stream()
                        .filter(item -> {
                            if (item == null) return false;
                            // Chỉ hiển thị các dịch vụ khách đặt:
                            // 1. Dịch vụ bắt buộc/thành phần cốt lõi của gói (COMPONENT hoặc isRequired = true)
                            // 2. Dịch vụ đi kèm (ADD_ON) mà khách ĐÃ CHỌN ĐẶT (nằm trong selectedAddons)
                            if (item.getItemType() == PackageItemType.ADD_ON) {
                                return item.getItemName() != null && selectedAddonSet.contains(item.getItemName().trim().toLowerCase());
                            }
                            return true;
                        })
                        .map(item -> PackageItemRes.builder()
                                .id(item.getId())
                                .itemType(item.getItemType())
                                .itemName(item.getItemName())
                                .stepOrder(item.getStepOrder())
                                .itemPrice(item.getItemPrice())
                                .durationMinutes(item.getDurationMinutes())
                                .isRequired(item.getIsRequired())
                                .isActive(item.getIsActive())
                                .build())
                        .toList();
            }
        }

        LocalDateTime scheduledStartTime = (b.getBookingDate() != null && b.getStartTime() != null)
                ? b.getBookingDate().atTime(b.getStartTime()) : null;
        LocalDateTime scheduledEndTime = (scheduledStartTime != null && packageDurationMinutes != null)
                ? scheduledStartTime.plusMinutes(packageDurationMinutes) : null;

        final List<StaffAssignmentDetailRes> assignedStaff = (b.getStaffAssignments() != null && !b.getStaffAssignments().isEmpty())
                ? bookingStaffAssignmentMapper.toDetailResList(
                        b.getStaffAssignments().stream()
                                .filter(sa -> sa.getStatus() == AssignmentStatus.ACTIVE
                                        || (Boolean.TRUE.equals(b.getNeedsEmergencyReassignment()) && sa.getStatus() == AssignmentStatus.EMERGENCY_CANCELLED))
                                .toList()
                  )
                : Collections.emptyList();

        if (staffName == null && !assignedStaff.isEmpty()) {
            var primary = assignedStaff.stream()
                    .filter(s -> s.getRole() == AssignmentRole.PRIMARY_MUA && s.getStatus() == AssignmentStatus.ACTIVE)
                    .findFirst()
                    .or(() -> assignedStaff.stream()
                            .filter(s -> s.getRole() == AssignmentRole.PRIMARY_MUA)
                            .findFirst())
                    .orElse(assignedStaff.get(0));
            staffName = primary.getStaffName();
            staffPhone = primary.getStaffPhone();
            staffMuaId = primary.getStaffId();
        }

        // 1. Đợt 1: Cọc (Deposit Amount & Status)
        BigDecimal depositAmount = b.getDepositAmount();
        if (depositAmount == null || depositAmount.compareTo(BigDecimal.ZERO) <= 0) {
            depositAmount = totalAmount.multiply(new BigDecimal("0.30")).setScale(0, RoundingMode.HALF_UP);
        }
        BigDecimal remainingAmount = totalAmount.subtract(depositAmount).max(BigDecimal.ZERO);

        boolean isDepositPaid = false;
        String depositStatus = "PENDING";
        String depositPaymentMethod = "ESCROW";

        BookingStatus bStatus = b.getStatus();

        if (bookingDepositRepository != null) {
            Optional<BookingDepositEntity> depositOpt = bookingDepositRepository.findByBookingId(b.getId());
            if (depositOpt.isPresent()) {
                BookingDepositEntity dep = depositOpt.get();
                if (dep.getPaidAmount() != null && dep.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
                    depositAmount = dep.getPaidAmount();
                    remainingAmount = totalAmount.subtract(depositAmount).max(BigDecimal.ZERO);
                }
                depositStatus = dep.getStatus();
                if ("PAID".equalsIgnoreCase(depositStatus)) {
                    isDepositPaid = true;
                }
                if (dep.getAppliedPayment() != null && dep.getAppliedPayment().getPaymentGateway() != null) {
                    depositPaymentMethod = dep.getAppliedPayment().getPaymentGateway();
                }
            }
        }

        // If booking is past deposit phase, deposit was verified & held in Escrow
        if (!isDepositPaid && bStatus != null && (bStatus == BookingStatus.ON_THE_WAY
                || bStatus == BookingStatus.ARRIVED
                || bStatus == BookingStatus.IN_PROGRESS
                || bStatus == BookingStatus.COMPLETED
                || bStatus == BookingStatus.PAID_OUT
                || bStatus == BookingStatus.CONFIRMED
                || bStatus == BookingStatus.ACCEPTED
                || bStatus == BookingStatus.AGENCY_ASSIGNED
                || bStatus == BookingStatus.REQUESTED)) {
            isDepositPaid = true;
            if ("PENDING".equals(depositStatus) || "UNPAID".equals(depositStatus)) {
                depositStatus = "PAID";
            }
        }

        if (paymentTransactionRepository != null && ("ESCROW".equals(depositPaymentMethod) || depositPaymentMethod == null)) {
            List<PaymentTransactionEntity> successTxs = paymentTransactionRepository.findByBookingIdAndStatus(b.getId(), "SUCCESS");
            if (successTxs != null) {
                for (PaymentTransactionEntity tx : successTxs) {
                    if ("BOOKING_DEPOSIT".equalsIgnoreCase(tx.getPurpose()) || "DEPOSIT".equalsIgnoreCase(tx.getPurpose())) {
                        depositPaymentMethod = tx.getPaymentGateway();
                        isDepositPaid = true;
                        depositStatus = "PAID";
                        break;
                    }
                }
            }
        }

        if (bStatus == BookingStatus.REFUNDED || bStatus == BookingStatus.DISPUTE_REFUNDED) {
            depositStatus = "REFUNDED";
        } else if (bStatus == BookingStatus.CANCELLED || bStatus == BookingStatus.CANCELLED_EXPIRED) {
            if (!isDepositPaid) {
                depositStatus = "WAIVED";
            }
        }

        // 2. Đợt 2: Quyết Toán Còn Lại (70% Remaining)
        boolean isFinalPaid = false;
        String finalPaymentMethod = "CASH_OR_ONLINE";
        String finalPaymentStatus = "PENDING";

        if (bStatus == BookingStatus.CANCELLED || bStatus == BookingStatus.CANCELLED_EXPIRED || bStatus == BookingStatus.REFUNDED) {
            finalPaymentStatus = "WAIVED";
            finalPaymentMethod = "NONE";
        } else if (bStatus == BookingStatus.DISPUTED || bStatus == BookingStatus.DISPUTE_REFUNDED) {
            finalPaymentStatus = "DISPUTED";
        } else {
            // Check Settlement
            if (settlement != null && "SETTLED".equalsIgnoreCase(settlement.getStatus())) {
                isFinalPaid = true;
                finalPaymentStatus = "PAID";
                if (settlement.getCashAmount() != null && settlement.getCashAmount().compareTo(BigDecimal.ZERO) > 0) {
                    finalPaymentMethod = "CASH";
                } else {
                    finalPaymentMethod = "ONLINE";
                }
            }

            // Check Cash Receipt
            if (!isFinalPaid && cashReceiptRepository != null) {
                Optional<BookingCashReceiptEntity> receiptOpt = cashReceiptRepository.findByBookingId(b.getId());
                if (receiptOpt.isPresent()) {
                    BookingCashReceiptEntity receipt = receiptOpt.get();
                    finalPaymentMethod = "CASH";
                    if ("BOTH_CONFIRMED".equalsIgnoreCase(receipt.getStatus())) {
                        isFinalPaid = true;
                        finalPaymentStatus = "PAID";
                    } else if ("CUSTOMER_CONFIRMED".equalsIgnoreCase(receipt.getStatus())) {
                        finalPaymentStatus = "CUSTOMER_CONFIRMED";
                    } else {
                        finalPaymentStatus = "PENDING";
                    }
                }
            }

            // Check Online Final Payment
            if (!isFinalPaid && paymentTransactionRepository != null) {
                List<PaymentTransactionEntity> successTxs = paymentTransactionRepository.findByBookingIdAndStatus(b.getId(), "SUCCESS");
                if (successTxs != null) {
                    for (PaymentTransactionEntity tx : successTxs) {
                        if ("BOOKING_FINAL_PAYMENT".equalsIgnoreCase(tx.getPurpose()) || "FINAL_PAYMENT".equalsIgnoreCase(tx.getPurpose())) {
                            isFinalPaid = true;
                            finalPaymentStatus = "PAID";
                            finalPaymentMethod = tx.getPaymentGateway();
                            break;
                        }
                    }
                }
            }

            if (bStatus == BookingStatus.PAID_OUT) {
                isFinalPaid = true;
                finalPaymentStatus = "PAID";
                if ("CASH_OR_ONLINE".equals(finalPaymentMethod)) {
                    finalPaymentMethod = "CASH";
                }
            }
        }

        return AgencyBookingRes.builder()
                .id(b.getId())
                .bookingId(b.getId())
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
                .bookingStatus(b.getStatus() != null ? b.getStatus().name() : null)
                .packageId(pkgId)
                .servicePackageName(servicePkgName)
                .packageName(servicePkgName)
                .packageDescription(packageDescription)
                .packagePrice(packagePrice)
                .packageDurationMinutes(packageDurationMinutes)
                .categoryName(categoryName)
                .packageItems(packageItems)
                .selectedAddons(b.getSelectedAddons())
                .scheduledStartTime(scheduledStartTime)
                .scheduledEndTime(scheduledEndTime)
                .destinationAddress(b.getDestinationAddress())
                .bookingDate(b.getBookingDate())
                .startTime(b.getStartTime())
                .totalAmount(totalAmount)
                .platformFeeRate(platformFeeRate)
                .platformFee(platformFee)
                .settlementRecorded(settlement != null)
                .depositAmount(depositAmount)
                .remainingAmount(remainingAmount)
                .isDepositPaid(isDepositPaid)
                .depositPaymentMethod(depositPaymentMethod)
                .depositStatus(depositStatus)
                .isFinalPaid(isFinalPaid)
                .finalPaymentMethod(finalPaymentMethod)
                .finalPaymentStatus(finalPaymentStatus)
                .estimatedStaffCommission(estimatedStaffCommission)
                .estimatedStudioNet(estimatedStudioNet)
                .needsEmergencyReassignment(b.getNeedsEmergencyReassignment())
                .emergencyReason(b.getEmergencyReason())
                .emergencyReportedAt(b.getEmergencyReportedAt() != null ? b.getEmergencyReportedAt().toLocalDateTime() : null)
                .emergencyProofUrl(b.getEmergencyProofUrl())
                .assignedStaff(assignedStaff)
                .createdAt(b.getCreatedAt())
                .build();
    }
}
