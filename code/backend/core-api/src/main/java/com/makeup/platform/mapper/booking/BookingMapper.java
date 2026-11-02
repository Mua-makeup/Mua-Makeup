package com.makeup.platform.mapper.booking;

import com.makeup.platform.dto.response.admin.AdminBookingRes;
import com.makeup.platform.dto.response.agency.StaffAssignmentDetailRes;
import com.makeup.platform.dto.response.booking.BookingAcceptanceRes;
import com.makeup.platform.dto.response.booking.BookingCompletionPhotoRes;
import com.makeup.platform.dto.response.booking.BookingStateTransitionRes;
import com.makeup.platform.dto.response.booking.CustomerBookingItemRes;
import com.makeup.platform.dto.response.booking.FreelancerBookingItemRes;
import com.makeup.platform.dto.response.catalog.PackageItemRes;
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingPartner;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.entity.booking.BookingStatus;
import com.makeup.platform.entity.catalog.PackageItemType;
import com.makeup.platform.service.wallet.PlatformFeeService;
import com.makeup.platform.entity.payment.BookingDepositEntity;
import com.makeup.platform.entity.payment.PaymentTransactionEntity;
import com.makeup.platform.entity.wallet.BookingCashReceiptEntity;
import com.makeup.platform.entity.wallet.BookingSettlementEntity;
import com.makeup.platform.repository.payment.BookingDepositRepository;
import com.makeup.platform.repository.payment.PaymentTransactionRepository;
import com.makeup.platform.repository.wallet.BookingCashReceiptRepository;
import com.makeup.platform.repository.wallet.BookingSettlementRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.ArrayList;
import java.util.Comparator;

@Component
@RequiredArgsConstructor
public class BookingMapper {

    private final BookingStaffAssignmentMapper bookingStaffAssignmentMapper;
    private final PlatformFeeService platformFeeService;
    private final BookingDepositRepository bookingDepositRepository;
    private final BookingCashReceiptRepository cashReceiptRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final BookingSettlementRepository settlementRepository;

    public BookingStateTransitionRes toTransitionRes(BookingEntity entity, BookingStatus previousStatus, Long updatedByUserId) {
        if (entity == null) {
            return null;
        }

        return BookingStateTransitionRes.builder()
                .bookingId(entity.getId())
                .bookingCode(entity.getBookingCode())
                .previousStatus(previousStatus != null ? previousStatus.name() : null)
                .currentStatus(entity.getStatus() != null ? entity.getStatus().name() : null)
                .updatedByUserId(updatedByUserId)
                .transitionedAt(LocalDateTime.now())
                .build();
    }

    public BookingCompletionPhotoRes toCompletionPhotoRes(BookingEntity entity, String thumbnailUrl, String publicId) {
        if (entity == null) {
            return null;
        }

        return BookingCompletionPhotoRes.builder()
                .bookingId(entity.getId())
                .bookingCode(entity.getBookingCode())
                .completionPhotoUrl(entity.getCompletionPhotoUrl())
                .thumbnailUrl(thumbnailUrl)
                .publicId(publicId)
                .uploadedAt(LocalDateTime.now())
                .build();
    }

    public BookingAcceptanceRes toAcceptanceRes(BookingEntity entity) {
        if (entity == null) {
            return null;
        }

        BookingAcceptanceRes.CustomerSummary customerSummary = null;
        if (entity.getCustomer() != null) {
            customerSummary = BookingAcceptanceRes.CustomerSummary.builder()
                    .fullName(entity.getCustomer().getFullName())
                    .phoneNumber(entity.getCustomer().getPhoneNumber())
                    .build();
        }

        Long assignedMuaId = null;
        if (entity.getMua() != null) {
            assignedMuaId = entity.getMua().getId();
        }

        return BookingAcceptanceRes.builder()
                .bookingId(entity.getId())
                .bookingCode(entity.getBookingCode())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .assignedMuaId(assignedMuaId)
                .destinationAddress(entity.getDestinationAddress())
                .serviceTotalAmount(entity.getTotalAmount())
                .escrowDepositLocked(entity.getDepositAmount())
                .customerInfo(customerSummary)
                .acceptedAt(LocalDateTime.now())
                .build();
    }

    public AdminBookingRes toAdminBookingRes(BookingEntity entity) {
        if (entity == null) {
            return null;
        }

        String customerName = null;
        String customerPhone = null;
        String customerEmail = null;
        Long customerId = null;
        if (entity.getCustomer() != null) {
            customerId = entity.getCustomer().getId();
            customerName = entity.getCustomer().getFullName();
            customerPhone = entity.getCustomer().getPhoneNumber();
            customerEmail = entity.getCustomer().getEmail();
        }

        Long muaId = null;
        String muaName = null;
        String muaPhone = null;
        if (entity.getMua() != null) {
            muaId = entity.getMua().getId();
            if (entity.getMua().getUser() != null) {
                muaName = entity.getMua().getUser().getFullName();
                muaPhone = entity.getMua().getUser().getPhoneNumber();
            }
        }

        Long agencyId = null;
        String agencyName = null;
        if (entity.getAgency() != null) {
            agencyId = entity.getAgency().getId();
            agencyName = entity.getAgency().getAgencyName();
        }

        Long packageId = null;
        String packageName = null;
        String packageDescription = null;
        BigDecimal packagePrice = null;
        Integer packageDurationMinutes = null;
        String categoryName = null;
        List<PackageItemRes> packageItems = List.of();

        if (entity.getServicePackage() != null) {
            var pkg = entity.getServicePackage();
            packageId = pkg.getId();
            packageName = pkg.getPackageName();
            packageDescription = pkg.getDescription();
            packagePrice = pkg.getPrice();
            packageDurationMinutes = pkg.getEstimatedDurationMinutes();
            if (pkg.getMasterCategory() != null) {
                categoryName = pkg.getMasterCategory().getCategoryName();
            }
            if (pkg.getPackageItems() != null) {
                Set<String> selectedAddonSet = new HashSet<>();
                if (entity.getSelectedAddons() != null && !entity.getSelectedAddons().isBlank()) {
                    String[] parts = entity.getSelectedAddons().split(",,,");
                    for (String p : parts) {
                        if (p != null && !p.isBlank()) {
                            selectedAddonSet.add(p.trim().toLowerCase());
                        }
                    }
                }

                packageItems = pkg.getPackageItems().stream()
                        .filter(item -> {
                            if (item == null) return false;
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

        final List<StaffAssignmentDetailRes> assignedStaff = (entity.getStaffAssignments() != null && !entity.getStaffAssignments().isEmpty())
                ? bookingStaffAssignmentMapper.toDetailResList(
                        entity.getStaffAssignments().stream()
                                .filter(sa -> sa.getStatus() == AssignmentStatus.ACTIVE
                                        || (Boolean.TRUE.equals(entity.getNeedsEmergencyReassignment()) && sa.getStatus() == AssignmentStatus.EMERGENCY_CANCELLED))
                                .toList()
                  )
                : List.of();

        if (muaName == null && !assignedStaff.isEmpty()) {
            var primary = assignedStaff.stream()
                    .filter(s -> s.getRole() == AssignmentRole.PRIMARY_MUA && s.getStatus() == AssignmentStatus.ACTIVE)
                    .findFirst()
                    .or(() -> assignedStaff.stream()
                            .filter(s -> s.getRole() == AssignmentRole.PRIMARY_MUA)
                            .findFirst())
                    .orElse(assignedStaff.get(0));
            muaName = primary.getStaffName();
            muaPhone = primary.getStaffPhone();
            muaId = primary.getStaffId();
        }

        // 1. Stage 1: Deposit (30%)
        BigDecimal totalAmount = entity.getTotalAmount() != null ? entity.getTotalAmount() : BigDecimal.ZERO;
        BigDecimal depositAmount = entity.getDepositAmount() != null ? entity.getDepositAmount() : BigDecimal.ZERO;
        BigDecimal remainingAmount = totalAmount.subtract(depositAmount).max(BigDecimal.ZERO);
        boolean isDepositPaid = false;
        String depositStatus = "PENDING";
        String depositPaymentMethod = null;
        BookingStatus bStatus = entity.getStatus();

        if (bookingDepositRepository != null) {
            Optional<BookingDepositEntity> depositOpt = bookingDepositRepository.findByBookingId(entity.getId());
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

        if (!isDepositPaid && bStatus != null && (bStatus == BookingStatus.ON_THE_WAY
                || bStatus == BookingStatus.ARRIVED
                || bStatus == BookingStatus.IN_PROGRESS
                || bStatus == BookingStatus.COMPLETED
                || bStatus == BookingStatus.PAID_OUT
                || bStatus == BookingStatus.ACCEPTED
                || bStatus == BookingStatus.AGENCY_ASSIGNED
                || bStatus == BookingStatus.REQUESTED)) {
            isDepositPaid = true;
            if ("PENDING".equals(depositStatus) || "UNPAID".equals(depositStatus)) {
                depositStatus = "PAID";
            }
        }

        if (paymentTransactionRepository != null && (depositPaymentMethod == null || "ESCROW".equals(depositPaymentMethod))) {
            List<PaymentTransactionEntity> successTxs = paymentTransactionRepository.findByBookingIdAndStatus(entity.getId(), "SUCCESS");
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

        if (depositPaymentMethod == null && isDepositPaid) {
            depositPaymentMethod = "ESCROW";
        }

        if (bStatus == BookingStatus.DISPUTE_REFUNDED || "REFUNDED".equalsIgnoreCase(depositStatus)) {
            depositStatus = "REFUNDED";
        } else if (bStatus == BookingStatus.CANCELLED || bStatus == BookingStatus.CANCELLED_EXPIRED) {
            if (!isDepositPaid) {
                depositStatus = "WAIVED";
            }
        }

        // 2. Stage 2: Final Settlement (70% Remaining)
        boolean isFinalPaid = false;
        String finalPaymentMethod = "CASH_OR_ONLINE";
        String finalPaymentStatus = "PENDING";
        boolean settlementRecorded = false;

        Optional<BookingSettlementEntity> settlementOpt = (settlementRepository != null)
                ? settlementRepository.findByBookingId(entity.getId())
                : Optional.empty();

        if (settlementOpt.isPresent() && "SETTLED".equalsIgnoreCase(settlementOpt.get().getStatus())) {
            settlementRecorded = true;
        }

        if (bStatus == BookingStatus.CANCELLED || bStatus == BookingStatus.CANCELLED_EXPIRED) {
            finalPaymentStatus = "WAIVED";
            finalPaymentMethod = "NONE";
        } else if (bStatus == BookingStatus.DISPUTED || bStatus == BookingStatus.DISPUTE_REFUNDED) {
            finalPaymentStatus = "DISPUTED";
        } else {
            // 1. Check Online Final Payment first (VNPAY, MOMO, etc. take precedence for exact gateway name)
            if (paymentTransactionRepository != null) {
                List<PaymentTransactionEntity> successTxs = paymentTransactionRepository.findByBookingIdAndStatus(entity.getId(), "SUCCESS");
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

            // 2. Check Cash Receipt
            if (!isFinalPaid && cashReceiptRepository != null) {
                Optional<BookingCashReceiptEntity> receiptOpt = cashReceiptRepository.findByBookingId(entity.getId());
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

            // 3. Check Settlement
            if (settlementRecorded) {
                isFinalPaid = true;
                finalPaymentStatus = "PAID";
                if ("CASH_OR_ONLINE".equals(finalPaymentMethod)) {
                    BookingSettlementEntity settlement = settlementOpt.get();
                    if (settlement.getCashAmount() != null && settlement.getCashAmount().compareTo(BigDecimal.ZERO) > 0) {
                        finalPaymentMethod = "CASH";
                    } else {
                        finalPaymentMethod = "ONLINE";
                    }
                }
            }

            // 4. Fallback for PAID_OUT
            if (bStatus == BookingStatus.PAID_OUT) {
                isFinalPaid = true;
                finalPaymentStatus = "PAID";
                if ("CASH_OR_ONLINE".equals(finalPaymentMethod)) {
                    finalPaymentMethod = "CASH";
                }
            }
        }

        return AdminBookingRes.builder()
                .id(entity.getId())
                .bookingCode(entity.getBookingCode())
                .customerId(customerId)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .customerEmail(customerEmail)
                .muaId(muaId)
                .muaName(muaName)
                .muaPhone(muaPhone)
                .assignedStaff(assignedStaff)
                .agencyId(agencyId)
                .agencyName(agencyName)
                .packageId(packageId)
                .packageName(packageName)
                .packageDescription(packageDescription)
                .packagePrice(packagePrice)
                .packageDurationMinutes(packageDurationMinutes)
                .categoryName(categoryName)
                .packageItems(packageItems)
                .bookingType(entity.getBookingType() != null ? entity.getBookingType().name() : null)
                .bookingPartner(entity.getBookingPartner() != null ? entity.getBookingPartner().name() : null)
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .destinationAddress(entity.getDestinationAddress())
                .destinationLatitude(entity.getDestinationLatitude())
                .destinationLongitude(entity.getDestinationLongitude())
                .bookingDate(entity.getBookingDate())
                .startTime(entity.getStartTime())
                .serviceSubtotal(entity.getServiceSubtotal())
                .distanceFee(entity.getDistanceFee())
                .surchargeFee(entity.getSurchargeFee())
                .totalAmount(totalAmount)
                .depositAmount(depositAmount)
                .remainingAmount(remainingAmount)
                .isDepositPaid(isDepositPaid)
                .depositPaymentMethod(depositPaymentMethod)
                .depositStatus(depositStatus)
                .isFinalPaid(isFinalPaid)
                .finalPaymentMethod(finalPaymentMethod)
                .finalPaymentStatus(finalPaymentStatus)
                .settlementRecorded(settlementRecorded)
                .completionPhotoUrl(entity.getCompletionPhotoUrl())
                .cancellationReason(entity.getCancellationReason())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    public FreelancerBookingItemRes toFreelancerBookingRes(BookingEntity entity) {
        return toFreelancerBookingRes(entity, null);
    }

    public FreelancerBookingItemRes toFreelancerBookingRes(BookingEntity entity, Long muaId) {
        if (entity == null) {
            return null;
        }

        String customerName = entity.getCustomer() != null ? entity.getCustomer().getFullName() : null;
        String customerPhone = entity.getCustomer() != null ? entity.getCustomer().getPhoneNumber() : null;
        String customerAvatar = entity.getCustomer() != null ? entity.getCustomer().getAvatarUrl() : null;

        String packageName = "Trang điểm";
        String packageCoverUrl = null;
        if (entity.getServicePackage() != null) {
            packageName = entity.getServicePackage().getPackageName();
        } else if (entity.getStyle() != null) {
            packageName = entity.getStyle().getStyleName();
        }

        BigDecimal earnings = BigDecimal.ZERO;
        BigDecimal feeRate = platformFeeService.rateFor(entity);
        if (entity.getTotalAmount() != null) {
            BigDecimal platformFee = entity.getTotalAmount().multiply(feeRate).setScale(0, RoundingMode.HALF_UP);
            earnings = entity.getTotalAmount().subtract(platformFee);
        } else if (entity.getServiceSubtotal() != null) {
            BigDecimal platformFee = entity.getServiceSubtotal().multiply(feeRate).setScale(0, RoundingMode.HALF_UP);
            earnings = entity.getServiceSubtotal().subtract(platformFee);
        }

        Boolean isConfirmedByStaff = true;
        String assignmentRole = null;
        String assignmentStatus = null;
        BigDecimal commissionRate = null;
        String commissionNote = null;
        Boolean soloPendingConfirmation = false;
        BigDecimal soloCommissionRate = null;

        if (muaId != null && entity.getStaffAssignments() != null) {
            var assignmentOpt = entity.getStaffAssignments().stream()
                    .filter(sa -> sa.getStaff() != null && sa.getStaff().getMua() != null && sa.getStaff().getMua().getId().equals(muaId))
                    .sorted(Comparator
                            .comparing((BookingStaffAssignmentEntity sa) -> sa.getStatus() != AssignmentStatus.ACTIVE)
                            .thenComparing(sa -> sa.getId(), Comparator.nullsLast(Comparator.reverseOrder())))
                    .findFirst();

            if (assignmentOpt.isPresent()) {
                var assignment = assignmentOpt.get();
                isConfirmedByStaff = Boolean.TRUE.equals(assignment.getIsConfirmedByStaff());
                assignmentRole = assignment.getAssignmentRole() != null ? assignment.getAssignmentRole().name() : null;
                assignmentStatus = assignment.getStatus() != null ? assignment.getStatus().name() : null;
                commissionRate = assignment.getCommissionRate();
                commissionNote = assignment.getCommissionNote();

                // Nếu thợ đã gửi báo bận đột xuất nhưng chưa được đổi thợ
                if (assignment.getStatus() == AssignmentStatus.EMERGENCY_CANCELLED) {
                    assignmentStatus = "REPORTED_BUSY_PENDING_APPROVAL";
                }

                // Kiểm tra xem thợ có đang chờ xác nhận làm Solo không
                boolean isSoloNote = commissionNote != null && (commissionNote.contains("Solo") || commissionNote.contains("solo") || commissionNote.contains("gộp"));
                if (assignment.getStatus() == AssignmentStatus.ACTIVE && Boolean.FALSE.equals(assignment.getIsConfirmedByStaff()) && isSoloNote) {
                    soloPendingConfirmation = true;
                    soloCommissionRate = assignment.getCommissionRate();
                }

                if (assignment.getCommissionRate() != null) {
                    earnings = assignment.getCommissionAmount() != null && assignment.getCommissionAmount().compareTo(BigDecimal.ZERO) > 0
                            ? assignment.getCommissionAmount()
                            : (entity.getTotalAmount() != null
                            ? entity.getTotalAmount().multiply(assignment.getCommissionRate()).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                            : earnings);
                }
            } else if (entity.getMua() != null && entity.getMua().getId().equals(muaId)) {
                if (entity.getBookingPartner() == BookingPartner.AGENCY_DISPATCH || entity.getAgency() != null) {
                    assignmentRole = "PRIMARY_MUA";
                } else {
                    assignmentRole = null;
                }
                isConfirmedByStaff = entity.getStatus() != BookingStatus.AGENCY_ASSIGNED;
                assignmentStatus = "ACTIVE";
            }
        } else if (entity.getStatus() == BookingStatus.AGENCY_ASSIGNED) {
            isConfirmedByStaff = false;
        }

        String bookingPartner = entity.getBookingPartner() != null ? entity.getBookingPartner().name() : null;
        Long agencyId = entity.getAgency() != null ? entity.getAgency().getId() : null;
        String agencyName = entity.getAgency() != null ? entity.getAgency().getAgencyName() : null;
        String agencyLogoUrl = entity.getAgency() != null ? entity.getAgency().getLogoUrl() : null;

        return FreelancerBookingItemRes.builder()
                .id(entity.getId())
                .bookingCode(entity.getBookingCode())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .bookingType(entity.getBookingType() != null ? entity.getBookingType().name() : null)
                .customerName(customerName)
                .customerPhone(customerPhone)
                .customerAvatar(customerAvatar)
                .packageName(packageName)
                .packageCoverUrl(packageCoverUrl)
                .destinationAddress(entity.getDestinationAddress())
                .destinationLatitude(entity.getDestinationLatitude())
                .destinationLongitude(entity.getDestinationLongitude())
                .bookingDate(entity.getBookingDate())
                .startTime(entity.getStartTime())
                .totalAmount(entity.getTotalAmount())
                .depositAmount(entity.getDepositAmount())
                .earningsAmount(earnings)
                .note(entity.getEmergencyReason())
                .completionPhotoUrl(entity.getCompletionPhotoUrl())
                .isConfirmedByStaff(isConfirmedByStaff)
                .assignmentRole(assignmentRole)
                .assignmentStatus(assignmentStatus)
                .commissionRate(commissionRate)
                .commissionNote(commissionNote)
                .soloPendingConfirmation(soloPendingConfirmation)
                .soloCommissionRate(soloCommissionRate)
                .bookingPartner(bookingPartner)
                .agencyId(agencyId)
                .agencyName(agencyName)
                .agencyLogoUrl(agencyLogoUrl)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public CustomerBookingItemRes toCustomerBookingRes(BookingEntity entity) {
        return toCustomerBookingRes(entity, false);
    }

    public CustomerBookingItemRes toCustomerBookingRes(BookingEntity entity, boolean hasPaidDeposit) {
        if (entity == null) {
            return null;
        }

        Long muaId = null;
        String muaName = null;
        String muaAvatarUrl = null;
        String muaPhoneNumber = null;

        if (entity.getMua() != null) {
            muaId = entity.getMua().getId();
            if (entity.getMua().getUser() != null) {
                muaName = entity.getMua().getUser().getFullName();
                muaAvatarUrl = entity.getMua().getUser().getAvatarUrl();
                muaPhoneNumber = entity.getMua().getUser().getPhoneNumber();
            }
        }

        String packageName = "Trang điểm";
        String packageCoverUrl = null;
        if (entity.getServicePackage() != null) {
            packageName = entity.getServicePackage().getPackageName();
        } else if (entity.getStyle() != null) {
            packageName = entity.getStyle().getStyleName();
        }

        LocalDateTime bookingTime = null;
        if (entity.getBookingDate() != null && entity.getStartTime() != null) {
            bookingTime = entity.getBookingDate().atTime(entity.getStartTime());
        }

        BigDecimal remainingAmount = BigDecimal.ZERO;
        if (entity.getTotalAmount() != null) {
            BigDecimal deposit = entity.getDepositAmount() != null ? entity.getDepositAmount() : BigDecimal.ZERO;
            remainingAmount = entity.getTotalAmount().subtract(deposit);
            if (remainingAmount.compareTo(BigDecimal.ZERO) < 0) {
                remainingAmount = BigDecimal.ZERO;
            }
        }

        boolean isDepositPaid = hasPaidDeposit;
        if (!isDepositPaid) {
            if (entity.getStatus() == BookingStatus.ON_THE_WAY
                    || entity.getStatus() == BookingStatus.ARRIVED
                    || entity.getStatus() == BookingStatus.IN_PROGRESS
                    || entity.getStatus() == BookingStatus.COMPLETED
                    || entity.getStatus() == BookingStatus.PAID_OUT) {
                isDepositPaid = true;
            }
        }

        boolean isDepositRefunded = false;
        if (entity.getStatus() == BookingStatus.CANCELLED || entity.getStatus() == BookingStatus.DISPUTE_REFUNDED) {
            String reason = entity.getCancellationReason();
            if (reason != null && (reason.toLowerCase().contains("khách hàng khác")
                    || reason.toLowerCase().contains("trùng")
                    || reason.toLowerCase().contains("hoàn trả")
                    || reason.toLowerCase().contains("hoàn cọc"))) {
                isDepositRefunded = true;
            }
        }

        Integer styleId = entity.getStyle() != null ? entity.getStyle().getId() : null;
        String styleName = entity.getStyle() != null ? entity.getStyle().getStyleName() : null;

        // Trích xuất thông tin Studio Agency & Đội ngũ nhân sự
        String bookingPartner = entity.getBookingPartner() != null ? entity.getBookingPartner().name() : null;
        Long agencyId = null;
        String agencyName = null;
        String agencyLogoUrl = null;
        if (entity.getAgency() != null) {
            agencyId = entity.getAgency().getId();
            agencyName = entity.getAgency().getAgencyName();
            agencyLogoUrl = entity.getAgency().getLogoUrl();
        }

        String staffName = muaName;
        List<String> assistantNames = new ArrayList<>();
        if (entity.getStaffAssignments() != null && !entity.getStaffAssignments().isEmpty()) {
            for (BookingStaffAssignmentEntity sa : entity.getStaffAssignments()) {
                if (sa.getStatus() == AssignmentStatus.ACTIVE && sa.getStaff() != null && sa.getStaff().getMua() != null && sa.getStaff().getMua().getUser() != null) {
                    String name = sa.getStaff().getMua().getUser().getFullName();
                    if (sa.getAssignmentRole() == AssignmentRole.PRIMARY_MUA) {
                        staffName = name;
                    } else if (sa.getAssignmentRole() == AssignmentRole.ASSISTANT_MUA) {
                        assistantNames.add(name);
                    }
                }
            }
        }

        return CustomerBookingItemRes.builder()
                .id(entity.getId())
                .bookingCode(entity.getBookingCode())
                .muaId(muaId)
                .muaName(muaName)
                .muaAvatarUrl(muaAvatarUrl)
                .muaPhoneNumber(muaPhoneNumber)
                .packageName(packageName)
                .packageCoverUrl(packageCoverUrl)
                .styleId(styleId)
                .styleName(styleName)
                .bookingTime(bookingTime)
                .destinationAddress(entity.getDestinationAddress())
                .destinationLatitude(entity.getDestinationLatitude())
                .destinationLongitude(entity.getDestinationLongitude())
                .status(entity.getStatus() != null ? entity.getStatus().name() : null)
                .totalAmount(entity.getTotalAmount())
                .depositAmount(entity.getDepositAmount())
                .remainingAmount(remainingAmount)
                .note(entity.getEmergencyReason())
                .isDepositPaid(isDepositPaid)
                .cancellationReason(entity.getCancellationReason())
                .isDepositRefunded(isDepositRefunded)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .bookingPartner(bookingPartner)
                .agencyId(agencyId)
                .agencyName(agencyName)
                .agencyLogoUrl(agencyLogoUrl)
                .staffName(staffName)
                .assistantNames(assistantNames)
                .build();
    }
}

