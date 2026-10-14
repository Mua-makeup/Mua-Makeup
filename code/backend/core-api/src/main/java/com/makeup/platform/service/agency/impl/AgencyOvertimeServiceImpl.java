package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.agency.ConfigureOvertimeRuleReq;
import com.makeup.platform.dto.request.agency.ReviewOvertimeReportReq;
import com.makeup.platform.dto.request.agency.SubmitOvertimeReportReq;
import com.makeup.platform.dto.response.agency.OvertimeReportRes;
import com.makeup.platform.dto.response.agency.OvertimeRuleRes;
import com.makeup.platform.entity.agency.AgencyOvertimeRuleEntity;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffOvertimeReportEntity;
import com.makeup.platform.entity.agency.OvertimePenaltyType;
import com.makeup.platform.entity.agency.OvertimePolicyType;
import com.makeup.platform.entity.agency.OvertimeReasonType;
import com.makeup.platform.entity.agency.OvertimeReportStatus;
import com.makeup.platform.entity.agency.OvertimeReviewAction;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.wallet.LedgerEntryEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.mapper.agency.AgencyOvertimeMapper;
import com.makeup.platform.repository.AgencyOvertimeRuleRepository;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffOvertimeReportRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.wallet.LedgerEntryRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
import com.makeup.platform.service.agency.AgencyOvertimeService;
import com.makeup.platform.service.interaction.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyOvertimeServiceImpl implements AgencyOvertimeService {

    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyStaffRepository agencyStaffRepository;
    private final AgencyOvertimeRuleRepository agencyOvertimeRuleRepository;
    private final AgencyStaffOvertimeReportRepository agencyStaffOvertimeReportRepository;
    private final AgencyOvertimeMapper agencyOvertimeMapper;
    private final NotificationService notificationService;
    private final WalletRepository walletRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final BookingRepository bookingRepository;

    @Override
    @Transactional
    public OvertimeRuleRes createOrUpdateRule(Long userId, ConfigureOvertimeRuleReq req) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);

        AgencyOvertimeRuleEntity entity;
        if (req.getId() != null) {
            entity = agencyOvertimeRuleRepository.findByIdAndAgencyId(req.getId(), agency.getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCodes.ERR_OVERTIME_RULE_NOT_FOUND,
                            "agency.overtime_rule_not_found"
                    ));
            entity.setRuleName(req.getRuleName());
            entity.setMinOvertimeMinutes(req.getMinOvertimeMinutes());
            entity.setMaxOvertimeMinutes(req.getMaxOvertimeMinutes());
            entity.setPenaltyType(req.getPenaltyType());
            if (req.getPolicyType() != null) {
                entity.setPolicyType(req.getPolicyType());
            }
            entity.setPenaltyValue(req.getPenaltyValue());
            if (req.getIsActive() != null) {
                entity.setIsActive(req.getIsActive());
            }
        } else {
            entity = AgencyOvertimeRuleEntity.builder()
                    .agency(agency)
                    .ruleName(req.getRuleName())
                    .minOvertimeMinutes(req.getMinOvertimeMinutes())
                    .maxOvertimeMinutes(req.getMaxOvertimeMinutes())
                    .penaltyType(req.getPenaltyType())
                    .policyType(req.getPolicyType() != null ? req.getPolicyType() : OvertimePolicyType.ALLOWANCE)
                    .penaltyValue(req.getPenaltyValue() != null ? req.getPenaltyValue() : BigDecimal.ZERO)
                    .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                    .build();
        }

        AgencyOvertimeRuleEntity saved = agencyOvertimeRuleRepository.save(entity);
        log.info("Cấu hình quy chế quá giờ ruleId={} cho agencyId={}", saved.getId(), agency.getId());
        return agencyOvertimeMapper.toRuleRes(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OvertimeRuleRes> getAgencyRules(Long userId) {
        // Nếu user là chủ Agency
        AgencyProfileEntity agency = agencyProfileRepository.findByOwnerId(userId).orElse(null);
        if (agency == null) {
            // Nếu user là thợ trực thuộc Studio
            AgencyStaffEntity staff = agencyStaffRepository.findActiveStaffByUserId(userId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCodes.ERR_AGENCY_NOT_FOUND,
                            "agency.profile_not_found"
                    ));
            agency = staff.getAgency();
        }

        List<AgencyOvertimeRuleEntity> rules = agencyOvertimeRuleRepository.findByAgencyId(agency.getId());
        return rules.stream().map(agencyOvertimeMapper::toRuleRes).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteRule(Long userId, Long ruleId) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);

        AgencyOvertimeRuleEntity rule = agencyOvertimeRuleRepository.findByIdAndAgencyId(ruleId, agency.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_OVERTIME_RULE_NOT_FOUND,
                        "agency.overtime_rule_not_found"
                ));

        agencyOvertimeRuleRepository.delete(rule);
        log.info("Đã xóa quy chế quá giờ ruleId={} của agencyId={}", ruleId, agency.getId());
    }

    @Override
    @Transactional
    public OvertimeRuleRes toggleRuleStatus(Long userId, Long ruleId, boolean isActive) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);

        AgencyOvertimeRuleEntity rule = agencyOvertimeRuleRepository.findByIdAndAgencyId(ruleId, agency.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_OVERTIME_RULE_NOT_FOUND,
                        "agency.overtime_rule_not_found"
                ));

        rule.setIsActive(isActive);
        AgencyOvertimeRuleEntity saved = agencyOvertimeRuleRepository.save(rule);
        log.info("Đã cập nhật trạng thái isActive={} cho quy chế overtime ruleId={}", isActive, ruleId);
        return agencyOvertimeMapper.toRuleRes(saved);
    }

    @Override
    @Transactional
    public OvertimeReportRes submitOvertimeReport(Long userId, SubmitOvertimeReportReq req) {
        // Tìm nhân viên thợ trực thuộc theo userId
        AgencyStaffEntity staff = agencyStaffRepository.findActiveStaffByUserId(userId)
                .orElseThrow(() -> new CustomBusinessException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "agency.staff_not_found_or_inactive",
                        HttpStatus.FORBIDDEN
                ));

        AgencyProfileEntity agency = staff.getAgency();
        AgencyOvertimeRuleEntity rule = null;

        if (req.getReasonType() == OvertimeReasonType.PRESET_RULE) {
            if (req.getRuleId() == null) {
                throw new CustomBusinessException(
                        ErrorCodes.ERR_VALIDATION,
                        "agency.overtime_rule_required_for_preset",
                        HttpStatus.BAD_REQUEST
                );
            }
            rule = agencyOvertimeRuleRepository.findByIdAndAgencyId(req.getRuleId(), agency.getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCodes.ERR_OVERTIME_RULE_NOT_FOUND,
                            "agency.overtime_rule_not_found"
                    ));
        }

        AgencyStaffOvertimeReportEntity report = AgencyStaffOvertimeReportEntity.builder()
                .bookingId(req.getBookingId())
                .staff(staff)
                .agency(agency)
                .overtimeMinutes(req.getOvertimeMinutes())
                .reasonType(req.getReasonType())
                .rule(rule)
                .explanationText(req.getExplanationText())
                .proofImageUrl(req.getProofImageUrl())
                .status(OvertimeReportStatus.PENDING_AGENCY_REVIEW)
                .penaltyAmountApplied(BigDecimal.ZERO)
                .customerSurchargeAmount(BigDecimal.ZERO)
                .build();

        AgencyStaffOvertimeReportEntity saved = agencyStaffOvertimeReportRepository.save(report);
        log.info("Thợ staffId={} nộp giải trình quá giờ reportId={} cho ca bookingId={}",
                staff.getId(), saved.getId(), req.getBookingId());

        try {
            notificationService.createOvertimeReportSubmittedNotification(agency, staff, saved);
        } catch (Exception ex) {
            log.warn("Failed to create overtime report notification: {}", ex.getMessage());
        }

        return agencyOvertimeMapper.toReportRes(saved);
    }

    @Override
    @Transactional
    public OvertimeReportRes reviewOvertimeReport(Long userId, Long reportId, ReviewOvertimeReportReq req) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);

        AgencyStaffOvertimeReportEntity report = agencyStaffOvertimeReportRepository.findByIdAndAgencyIdWithDetails(reportId, agency.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_OVERTIME_REPORT_NOT_FOUND,
                        "agency.overtime_report_not_found"
                ));

        if (report.getStatus() != OvertimeReportStatus.PENDING_AGENCY_REVIEW) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_OVERTIME_ALREADY_REVIEWED,
                    "agency.overtime_already_reviewed",
                    HttpStatus.BAD_REQUEST
            );
        }

        BigDecimal allowanceAmount = BigDecimal.ZERO;
        boolean shouldCreditAllowance = false;

        switch (req.getAction()) {
            case APPROVE_ALLOWANCE:
                report.setStatus(OvertimeReportStatus.APPROVED_WAIVED);
                shouldCreditAllowance = true;
                if (req.getCustomPenaltyAmount() != null && req.getCustomPenaltyAmount().compareTo(BigDecimal.ZERO) > 0) {
                    allowanceAmount = req.getCustomPenaltyAmount();
                } else if (report.getRule() != null) {
                    AgencyOvertimeRuleEntity rule = report.getRule();
                    if (rule.getPenaltyType() == OvertimePenaltyType.FIXED_AMOUNT) {
                        allowanceAmount = rule.getPenaltyValue() != null ? rule.getPenaltyValue() : BigDecimal.ZERO;
                    } else if (rule.getPenaltyType() == OvertimePenaltyType.PERCENT_COMMISSION) {
                        BookingEntity booking = bookingRepository.findById(report.getBookingId()).orElse(null);
                        BigDecimal baseAmount = (booking != null && booking.getTotalAmount() != null) ? booking.getTotalAmount() : BigDecimal.ZERO;
                        BigDecimal pct = rule.getPenaltyValue() != null ? rule.getPenaltyValue() : BigDecimal.ZERO;
                        allowanceAmount = baseAmount.multiply(pct).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
                    } else if (rule.getPenaltyType() == OvertimePenaltyType.PER_MINUTE) {
                        BigDecimal ratePerMinute = rule.getPenaltyValue() != null ? rule.getPenaltyValue() : BigDecimal.ZERO;
                        int mins = report.getOvertimeMinutes() != null ? report.getOvertimeMinutes() : 0;
                        allowanceAmount = ratePerMinute.multiply(BigDecimal.valueOf(mins)).setScale(0, RoundingMode.HALF_UP);
                    }
                }
                report.setPenaltyAmountApplied(allowanceAmount);
                break;

            case WAIVE_PENALTY:
                report.setStatus(OvertimeReportStatus.APPROVED_WAIVED);
                if (report.getRule() != null && report.getRule().getPolicyType() == OvertimePolicyType.ALLOWANCE) {
                    shouldCreditAllowance = true;
                    AgencyOvertimeRuleEntity rule = report.getRule();
                    if (rule.getPenaltyType() == OvertimePenaltyType.FIXED_AMOUNT) {
                        allowanceAmount = rule.getPenaltyValue() != null ? rule.getPenaltyValue() : BigDecimal.ZERO;
                    } else if (rule.getPenaltyType() == OvertimePenaltyType.PERCENT_COMMISSION) {
                        BookingEntity booking = bookingRepository.findById(report.getBookingId()).orElse(null);
                        BigDecimal baseAmount = (booking != null && booking.getTotalAmount() != null) ? booking.getTotalAmount() : BigDecimal.ZERO;
                        BigDecimal pct = rule.getPenaltyValue() != null ? rule.getPenaltyValue() : BigDecimal.ZERO;
                        allowanceAmount = baseAmount.multiply(pct).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
                    }
                    report.setPenaltyAmountApplied(allowanceAmount);
                } else {
                    report.setPenaltyAmountApplied(BigDecimal.ZERO);
                }
                break;

            case DEDUCT_BY_RULE:
                report.setStatus(OvertimeReportStatus.PENALIZED);
                if (report.getRule() != null) {
                    report.setPenaltyAmountApplied(report.getRule().getPenaltyValue());
                }
                break;

            case CUSTOM_PENALTY:
                report.setStatus(OvertimeReportStatus.PENALIZED);
                BigDecimal penalty = req.getCustomPenaltyAmount() != null ? req.getCustomPenaltyAmount() : BigDecimal.ZERO;
                report.setPenaltyAmountApplied(penalty);
                break;

            case CHARGE_CUSTOMER:
                report.setStatus(OvertimeReportStatus.CHARGED_CUSTOMER);
                BigDecimal surcharge = req.getCustomerSurchargeAmount() != null ? req.getCustomerSurchargeAmount() : BigDecimal.ZERO;
                report.setCustomerSurchargeAmount(surcharge);
                report.setChargeReason(req.getChargeReason());
                break;

            default:
                throw new CustomBusinessException(
                        ErrorCodes.ERR_INVALID_OVERTIME_ACTION,
                        "agency.invalid_overtime_action",
                        HttpStatus.BAD_REQUEST
                );
        }

        report.setAdminNotes(req.getAdminNotes());
        report.setReviewedByUserId(userId);
        report.setReviewedAt(LocalDateTime.now());

        AgencyStaffOvertimeReportEntity saved = agencyStaffOvertimeReportRepository.save(report);

        // THỰC HIỆN CỘNG TIỀN VÀO VÍ THỢ & TRÍCH TỪ VÍ STUDIO THEO DOUBLE-ENTRY LEDGER
        if (shouldCreditAllowance && allowanceAmount.compareTo(BigDecimal.ZERO) > 0) {
            BookingEntity booking = bookingRepository.findById(report.getBookingId()).orElse(null);
            String bookingCode = (booking != null && booking.getBookingCode() != null) ? booking.getBookingCode() : String.valueOf(report.getBookingId());

            // 1. Trích từ ví Studio (Agency Owner Wallet - DEBIT)
            UserEntity ownerUser = agency.getOwner();
            if (ownerUser != null) {
                WalletEntity ownerWallet = walletRepository.findByUserIdWithLock(ownerUser.getId())
                        .orElseGet(() -> {
                            WalletEntity newWallet = WalletEntity.builder()
                                    .user(ownerUser)
                                    .availableBalance(BigDecimal.ZERO)
                                    .frozenBalance(BigDecimal.ZERO)
                                    .currency("VND")
                                    .build();
                            return walletRepository.save(newWallet);
                        });

                
                if (ownerWallet.getAvailableBalance() != null && ownerWallet.getAvailableBalance().compareTo(allowanceAmount) >= 0) {
                    Long staffUserIdKey = (saved.getStaff() != null && saved.getStaff().getMua() != null && saved.getStaff().getMua().getUser() != null)
                            ? saved.getStaff().getMua().getUser().getId() : (saved.getStaff() != null ? saved.getStaff().getId() : saved.getId());
                    String debitKey = "ot:debit:booking:" + report.getBookingId() + ":staff:" + staffUserIdKey;
                    if (!ledgerEntryRepository.existsByIdempotencyKey(debitKey)) {
                        ownerWallet.setAvailableBalance(ownerWallet.getAvailableBalance().subtract(allowanceAmount));
                        walletRepository.save(ownerWallet);

                        String staffName = (saved.getStaff() != null && saved.getStaff().getMua() != null && saved.getStaff().getMua().getUser() != null)
                                ? saved.getStaff().getMua().getUser().getFullName() : "nhân viên";

                        LedgerEntryEntity debitEntry = LedgerEntryEntity.builder()
                                .referenceType("OVERTIME_PAYMENT")
                                .referenceId(saved.getId())
                                .wallet(ownerWallet)
                                .entryType("DEBIT")
                                .amount(allowanceAmount)
                                .balanceAfter(ownerWallet.getAvailableBalance())
                                .description(String.format("Chi trả phụ cấp làm thêm giờ đơn #%s cho thợ %s (-%s đ)",
                                        bookingCode, staffName, String.format("%,d", allowanceAmount.longValue())))
                                .idempotencyKey(debitKey)
                                .build();
                        ledgerEntryRepository.save(debitEntry);
                        log.info("[OvertimeReview] Debited {} VND from agency owner userId={} for overtime reportId={}",
                                allowanceAmount, ownerUser.getId(), saved.getId());
                    }
                } else {
                    log.info("[OvertimeReview] Ví Studio userId={} không đủ số dư ({} < {}), tiền tăng ca sẽ được trích từ doanh thu cọc đơn #{} khi quyết toán",
                            ownerUser.getId(), ownerWallet.getAvailableBalance(), allowanceAmount, bookingCode);
                }
            }

            // 2. Ghi có vào ví Thợ (Staff Wallet - CREDIT)
            if (saved.getStaff() != null && saved.getStaff().getMua() != null && saved.getStaff().getMua().getUser() != null) {
                UserEntity staffUser = saved.getStaff().getMua().getUser();
                WalletEntity staffWallet = walletRepository.findByUserIdWithLock(staffUser.getId())
                        .orElseGet(() -> {
                            WalletEntity newWallet = WalletEntity.builder()
                                    .user(staffUser)
                                    .availableBalance(BigDecimal.ZERO)
                                    .frozenBalance(BigDecimal.ZERO)
                                    .currency("VND")
                                    .build();
                            return walletRepository.save(newWallet);
                        });

                String creditKey = "ot:credit:booking:" + report.getBookingId() + ":staff:" + staffUser.getId();
                if (!ledgerEntryRepository.existsByIdempotencyKey(creditKey)) {
                    staffWallet.setAvailableBalance(staffWallet.getAvailableBalance().add(allowanceAmount));
                    walletRepository.save(staffWallet);

                    LedgerEntryEntity creditEntry = LedgerEntryEntity.builder()
                            .referenceType("OVERTIME_ALLOWANCE")
                            .referenceId(saved.getId())
                            .wallet(staffWallet)
                            .entryType("CREDIT")
                            .amount(allowanceAmount)
                            .balanceAfter(staffWallet.getAvailableBalance())
                            .description(String.format("Nhận trợ cấp làm thêm giờ đơn #%s (+%d phút) do Studio duyệt",
                                    bookingCode, saved.getOvertimeMinutes()))
                            .idempotencyKey(creditKey)
                            .build();
                    ledgerEntryRepository.save(creditEntry);
                    log.info("[OvertimeReview] Credited {} VND to staff userId={} for overtime reportId={}",
                            allowanceAmount, staffUser.getId(), saved.getId());
                }

                // 3. Gửi thông báo realtime (In-App + WebSocket STOMP + Push) đến Thợ
                try {
                    notificationService.createOvertimeApprovedNotification(
                            staffUser,
                            agency,
                            bookingCode,
                            saved.getOvertimeMinutes(),
                            allowanceAmount
                    );
                } catch (Exception notifEx) {
                    log.warn("[OvertimeReview] Failed to notify staff of overtime approval: {}", notifEx.getMessage());
                }
            }
        }

        log.info("Admin userId={} phán quyết reportId={} với action={}, allowanceAmount={}",
                userId, reportId, req.getAction(), allowanceAmount);

        return agencyOvertimeMapper.toReportRes(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OvertimeReportRes> getOvertimeReports(Long userId, String status, Pageable pageable) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);

        Page<AgencyStaffOvertimeReportEntity> page;
        if (status != null && !status.isBlank()) {
            try {
                OvertimeReportStatus reportStatus = OvertimeReportStatus.valueOf(status.trim().toUpperCase());
                page = agencyStaffOvertimeReportRepository.findByAgencyIdAndStatus(agency.getId(), reportStatus, pageable);
            } catch (IllegalArgumentException e) {
                page = agencyStaffOvertimeReportRepository.findByAgencyId(agency.getId(), pageable);
            }
        } else {
            page = agencyStaffOvertimeReportRepository.findByAgencyId(agency.getId(), pageable);
        }

        return page.map(agencyOvertimeMapper::toReportRes);
    }

    @Override
    @Transactional(readOnly = true)
    public OvertimeReportRes getOvertimeReportDetail(Long userId, Long reportId) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);

        AgencyStaffOvertimeReportEntity report = agencyStaffOvertimeReportRepository.findByIdAndAgencyIdWithDetails(reportId, agency.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_OVERTIME_REPORT_NOT_FOUND,
                        "agency.overtime_report_not_found"
                ));

        return agencyOvertimeMapper.toReportRes(report);
    }

    private AgencyProfileEntity getAgencyByOwnerId(Long ownerId) {
        AgencyProfileEntity agency = agencyProfileRepository.findByOwnerId(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "ERR_AGENCY_NOT_FOUND"
                ));
        if (!Boolean.TRUE.equals(agency.getIsVerified())) {
            throw new CustomBusinessException(ErrorCodes.ERR_AGENCY_NOT_VERIFIED,
                    "agency.not_verified_cannot_operate", HttpStatus.FORBIDDEN);
        }
        return agency;
    }
}
