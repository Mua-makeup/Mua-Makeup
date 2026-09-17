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
import com.makeup.platform.entity.agency.OvertimeReasonType;
import com.makeup.platform.entity.agency.OvertimeReportStatus;
import com.makeup.platform.mapper.agency.AgencyOvertimeMapper;
import com.makeup.platform.repository.AgencyOvertimeRuleRepository;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffOvertimeReportRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.service.agency.AgencyOvertimeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

        switch (req.getAction()) {
            case DEDUCT_BY_RULE:
                report.setStatus(OvertimeReportStatus.PENALIZED);
                if (report.getRule() != null) {
                    report.setPenaltyAmountApplied(report.getRule().getPenaltyValue());
                }
                break;
            case WAIVE_PENALTY:
                report.setStatus(OvertimeReportStatus.APPROVED_WAIVED);
                report.setPenaltyAmountApplied(BigDecimal.ZERO);
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
        log.info("Admin userId={} phán quyết reportId={} với action={}", userId, reportId, req.getAction());

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
