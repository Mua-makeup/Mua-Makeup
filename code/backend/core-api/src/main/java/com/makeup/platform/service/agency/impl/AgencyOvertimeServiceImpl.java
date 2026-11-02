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
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.mapper.agency.AgencyOvertimeMapper;
import com.makeup.platform.repository.AgencyOvertimeRuleRepository;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffOvertimeReportRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;
import com.makeup.platform.service.agency.AgencyOvertimeService;
import com.makeup.platform.service.interaction.NotificationService;
import com.makeup.platform.service.wallet.impl.OvertimeAllowancePaymentService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
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
    private final BookingRepository bookingRepository;
    private final BookingStaffAssignmentRepository bookingStaffAssignmentRepository;
    private final OvertimeAllowancePaymentService overtimePaymentService;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

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

        BookingEntity booking = bookingRepository.findById(req.getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_BOOKING_NOT_FOUND,
                        "booking.not_found"
                ));

        // Kiểm tra phân công trong đơn hàng: Chỉ Thợ chính (PRIMARY_MUA) mới có quyền gửi giải trình
        List<BookingStaffAssignmentEntity> assignments = bookingStaffAssignmentRepository
                .findByBookingIdAndStatus(booking.getId(), AssignmentStatus.ACTIVE);
        if (assignments.isEmpty()) {
            assignments = bookingStaffAssignmentRepository.findByBookingId(booking.getId());
        }

        if (!assignments.isEmpty()) {
            BookingStaffAssignmentEntity callerAssignment = assignments.stream()
                    .filter(sa -> sa.getStaff() != null && sa.getStaff().getId().equals(staff.getId()))
                    .findFirst()
                    .orElseThrow(() -> new CustomBusinessException(
                            ErrorCodes.ERR_FORBIDDEN,
                            "agency.staff_not_assigned_to_booking",
                            HttpStatus.FORBIDDEN
                    ));

            if (callerAssignment.getAssignmentRole() != AssignmentRole.PRIMARY_MUA) {
                throw new CustomBusinessException(
                        ErrorCodes.ERR_FORBIDDEN,
                        "agency.only_primary_staff_can_submit_overtime",
                        HttpStatus.FORBIDDEN
                );
            }
        }

        if (agencyStaffOvertimeReportRepository.existsByBookingIdAndStaffId(booking.getId(), staff.getId())) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_VALIDATION,
                    "agency.overtime_report_already_submitted",
                    HttpStatus.BAD_REQUEST
            );
        }

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

        AgencyStaffOvertimeReportEntity primaryReport = AgencyStaffOvertimeReportEntity.builder()
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

        AgencyStaffOvertimeReportEntity saved = agencyStaffOvertimeReportRepository.save(primaryReport);
        log.info("Thợ chính staffId={} nộp giải trình quá giờ reportId={} cho ca bookingId={}",
                staff.getId(), saved.getId(), req.getBookingId());

        // Tự động đính kèm báo cáo tăng ca cho thợ phụ (ASSISTANT_MUA) nếu ca làm có thợ phụ
        for (BookingStaffAssignmentEntity sa : assignments) {
            if (sa.getStaff() != null && !sa.getStaff().getId().equals(staff.getId())
                    && sa.getAssignmentRole() == AssignmentRole.ASSISTANT_MUA) {
                if (!agencyStaffOvertimeReportRepository.existsByBookingIdAndStaffId(booking.getId(), sa.getStaff().getId())) {
                    AgencyStaffOvertimeReportEntity assistantReport = AgencyStaffOvertimeReportEntity.builder()
                            .bookingId(req.getBookingId())
                            .staff(sa.getStaff())
                            .agency(agency)
                            .overtimeMinutes(req.getOvertimeMinutes())
                            .reasonType(req.getReasonType())
                            .rule(rule)
                            .explanationText(req.getExplanationText())
                            .proofImageUrl(req.getProofImageUrl())
                            .status(OvertimeReportStatus.PENDING_AGENCY_REVIEW)
                            .penaltyAmountApplied(BigDecimal.ZERO)
                            .customerSurchargeAmount(BigDecimal.ZERO)
                            .adminNotes("Báo cáo được đính kèm tự động từ giải trình của thợ chính")
                            .build();
                    AgencyStaffOvertimeReportEntity savedAssistant = agencyStaffOvertimeReportRepository.save(assistantReport);
                    broadcastOvertimeReport(savedAssistant);
                    log.info("Đính kèm tự động báo cáo quá giờ cho thợ phụ staffId={} theo đơn #{}",
                            sa.getStaff().getId(), booking.getId());
                }
            }
        }

        try {
            notificationService.createOvertimeReportSubmittedNotification(agency, staff, saved);
        } catch (Exception ex) {
            log.warn("Failed to create overtime report notification: {}", ex.getMessage());
        }

        broadcastOvertimeReport(saved);
        return toReportResponse(saved);
    }

    @Override
    @Transactional
    public OvertimeReportRes reviewOvertimeReport(Long userId, Long reportId, ReviewOvertimeReportReq req) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);

        AgencyStaffOvertimeReportEntity report = agencyStaffOvertimeReportRepository.findByIdAndAgencyIdForReview(reportId, agency.getId())
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
                } else {
                    AgencyOvertimeRuleEntity allowanceRule = resolveAllowanceRule(report);
                    allowanceAmount = calculateAllowance(report, allowanceRule);
                    if (allowanceRule != null) report.setRule(allowanceRule);
                }
                report.setPenaltyAmountApplied(allowanceAmount);
                break;

            case WAIVE_PENALTY:
                report.setStatus(OvertimeReportStatus.APPROVED_WAIVED);
                if (report.getRule() != null && report.getRule().getPolicyType() == OvertimePolicyType.ALLOWANCE) {
                    shouldCreditAllowance = true;
                    allowanceAmount = calculateAllowance(report, resolveAllowanceRule(report));
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

        if (shouldCreditAllowance && allowanceAmount.signum() > 0) {
            overtimePaymentService.pay(saved.getId());
        }

        log.info("Admin userId={} phán quyết reportId={} với action={}, allowanceAmount={}",
                userId, reportId, req.getAction(), allowanceAmount);

        broadcastOvertimeReport(saved);
        return toReportResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OvertimeReportRes> getOvertimeReports(Long userId, String status, Pageable pageable) {
        Optional<AgencyProfileEntity> agencyOpt = agencyProfileRepository.findByOwnerId(userId);
        if (agencyOpt.isPresent()) {
            AgencyProfileEntity agency = agencyOpt.get();
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
            return page.map(this::toReportResponse);
        }

        AgencyStaffEntity staff = agencyStaffRepository.findActiveStaffByUserId(userId)
                .or(() -> agencyStaffRepository.findActiveOrPendingStaffByUserId(userId).stream().findFirst())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCodes.ERR_AGENCY_NOT_FOUND, "ERR_AGENCY_NOT_FOUND"));

        Page<AgencyStaffOvertimeReportEntity> page;
        if (status != null && !status.isBlank()) {
            try {
                OvertimeReportStatus reportStatus = OvertimeReportStatus.valueOf(status.trim().toUpperCase());
                page = agencyStaffOvertimeReportRepository.findByStaffIdAndStatus(staff.getId(), reportStatus, pageable);
            } catch (IllegalArgumentException e) {
                page = agencyStaffOvertimeReportRepository.findByStaffId(staff.getId(), pageable);
            }
        } else {
            page = agencyStaffOvertimeReportRepository.findByStaffId(staff.getId(), pageable);
        }
        return page.map(this::toReportResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public OvertimeReportRes getOvertimeReportDetail(Long userId, Long reportId) {
        Optional<AgencyProfileEntity> agencyOpt = agencyProfileRepository.findByOwnerId(userId);
        AgencyStaffOvertimeReportEntity report;
        if (agencyOpt.isPresent()) {
            report = agencyStaffOvertimeReportRepository.findByIdAndAgencyIdWithDetails(reportId, agencyOpt.get().getId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCodes.ERR_OVERTIME_REPORT_NOT_FOUND,
                            "agency.overtime_report_not_found"
                    ));
        } else {
            report = agencyStaffOvertimeReportRepository.findById(reportId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCodes.ERR_OVERTIME_REPORT_NOT_FOUND,
                            "agency.overtime_report_not_found"
                    ));
            boolean isStaffOwner = report.getStaff() != null
                    && report.getStaff().getMua() != null
                    && report.getStaff().getMua().getUser() != null
                    && report.getStaff().getMua().getUser().getId().equals(userId);
            if (!isStaffOwner) {
                throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED, "common.unauthorized", HttpStatus.FORBIDDEN);
            }
        }
        return toReportResponse(report);
    }

    private boolean matchesAllowance(AgencyOvertimeRuleEntity rule, int minutes) {
        return rule != null && Boolean.TRUE.equals(rule.getIsActive())
                && rule.getPolicyType() == OvertimePolicyType.ALLOWANCE
                && minutes >= (rule.getMinOvertimeMinutes() != null ? rule.getMinOvertimeMinutes() : 0)
                && (rule.getMaxOvertimeMinutes() == null || minutes <= rule.getMaxOvertimeMinutes());
    }

    private AgencyOvertimeRuleEntity resolveAllowanceRule(AgencyStaffOvertimeReportEntity report) {
        int minutes = report.getOvertimeMinutes() != null ? report.getOvertimeMinutes() : 0;
        if (matchesAllowance(report.getRule(), minutes)) return report.getRule();
        if (report.getAgency() == null) return null;
        return agencyOvertimeRuleRepository.findByAgencyIdAndIsActiveTrue(report.getAgency().getId()).stream()
                .filter(rule -> matchesAllowance(rule, minutes))
                .sorted(java.util.Comparator
                        .comparing((AgencyOvertimeRuleEntity rule) -> rule.getMinOvertimeMinutes() != null ? rule.getMinOvertimeMinutes() : 0)
                        .reversed()
                        .thenComparing(AgencyOvertimeRuleEntity::getId, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())))
                .findFirst().orElse(null);
    }

    private BigDecimal calculateAllowance(AgencyStaffOvertimeReportEntity report, AgencyOvertimeRuleEntity rule) {
        if (rule == null) return BigDecimal.ZERO;
        BigDecimal base = BigDecimal.ZERO;
        BigDecimal value = rule.getPenaltyValue() != null ? rule.getPenaltyValue() : BigDecimal.ZERO;
        if (rule.getPenaltyType() == OvertimePenaltyType.PER_MINUTE) {
            base = value.multiply(BigDecimal.valueOf(report.getOvertimeMinutes())).setScale(0, RoundingMode.HALF_UP);
        } else if (rule.getPenaltyType() == OvertimePenaltyType.FIXED_AMOUNT) {
            base = value;
        } else if (rule.getPenaltyType() == OvertimePenaltyType.PERCENT_COMMISSION) {
            BookingEntity booking = bookingRepository.findById(report.getBookingId()).orElse(null);
            BigDecimal total = booking != null && booking.getTotalAmount() != null ? booking.getTotalAmount() : BigDecimal.ZERO;
            base = total.multiply(value).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        }

        // PHÂN BIỆT ROLE: Thợ phụ (Assistant MUA) nhận phụ cấp tăng ca theo tỷ lệ hoa hồng hoặc mặc định 50%
        if (report.getBookingId() != null && report.getStaff() != null && base.compareTo(BigDecimal.ZERO) > 0) {
            Optional<BookingStaffAssignmentEntity> assignmentOpt = bookingStaffAssignmentRepository
                    .findByBookingIdAndStaffIdAndStatus(report.getBookingId(), report.getStaff().getId(), AssignmentStatus.ACTIVE);
            if (assignmentOpt.isEmpty()) {
                assignmentOpt = bookingStaffAssignmentRepository.findByBookingId(report.getBookingId()).stream()
                        .filter(sa -> sa.getStaff() != null && sa.getStaff().getId().equals(report.getStaff().getId()))
                        .findFirst();
            }
            if (assignmentOpt.isPresent() && assignmentOpt.get().getAssignmentRole() == AssignmentRole.ASSISTANT_MUA) {
                BigDecimal staffCommRate = assignmentOpt.get().getCommissionRate();
                if (staffCommRate != null && staffCommRate.compareTo(BigDecimal.ZERO) > 0 && staffCommRate.compareTo(BigDecimal.valueOf(100)) < 0) {
                    return base.multiply(staffCommRate).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
                } else {
                    return base.multiply(BigDecimal.valueOf(0.5)).setScale(0, RoundingMode.HALF_UP);
                }
            }
        }

        return base;
    }

    private OvertimeReportRes toReportResponse(AgencyStaffOvertimeReportEntity report) {
        OvertimeReportRes response = agencyOvertimeMapper.toReportRes(report);
        response.setAllowancePaymentStatus(overtimePaymentService.status(report));
        if (report.getStatus() == OvertimeReportStatus.PENDING_AGENCY_REVIEW) {
            AgencyOvertimeRuleEntity rule = resolveAllowanceRule(report);
            response.setEstimatedAllowanceAmount(calculateAllowance(report, rule));
        }
        if (report.getBookingId() != null) {
            BookingEntity booking = bookingRepository.findById(report.getBookingId()).orElse(null);
            if (booking != null) {
                response.setBookingCode(booking.getBookingCode());
                if (booking.getServicePackage() != null) {
                    response.setPackageName(booking.getServicePackage().getPackageName());
                }
            }
            if (report.getStaff() != null) {
                Optional<BookingStaffAssignmentEntity> assignmentOpt = bookingStaffAssignmentRepository
                        .findByBookingIdAndStaffIdAndStatus(report.getBookingId(), report.getStaff().getId(), AssignmentStatus.ACTIVE);
                if (assignmentOpt.isEmpty()) {
                    assignmentOpt = bookingStaffAssignmentRepository.findByBookingId(report.getBookingId()).stream()
                            .filter(sa -> sa.getStaff() != null && sa.getStaff().getId().equals(report.getStaff().getId()))
                            .findFirst();
                }
                if (assignmentOpt.isPresent()) {
                    AssignmentRole role = assignmentOpt.get().getAssignmentRole();
                    response.setAssignmentRole(role != null ? role.name() : null);
                    response.setAssignmentRoleName(role == AssignmentRole.PRIMARY_MUA ? "Thợ chính" : "Thợ phụ");
                }
            }
        }
        return response;
    }

    private void broadcastOvertimeReport(AgencyStaffOvertimeReportEntity report) {
        if (messagingTemplate == null || report == null) return;
        try {
            OvertimeReportRes res = toReportResponse(report);
            if (report.getAgency() != null) {
                messagingTemplate.convertAndSend("/topic/overtime-reports/" + report.getAgency().getId(), res);
            }
            if (report.getStaff() != null && report.getStaff().getMua() != null && report.getStaff().getMua().getUser() != null) {
                Long staffUserId = report.getStaff().getMua().getUser().getId();
                messagingTemplate.convertAndSend("/topic/staff-overtime/" + staffUserId, res);
            }
            if (report.getBookingId() != null) {
                messagingTemplate.convertAndSend("/topic/booking-status/" + report.getBookingId(), res);
            }
        } catch (Exception e) {
            log.warn("Failed to broadcast overtime report event: {}", e.getMessage());
        }
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
