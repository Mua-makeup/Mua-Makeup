package com.makeup.platform.mapper.agency;

import com.makeup.platform.dto.response.agency.OvertimeReportRes;
import com.makeup.platform.dto.response.agency.OvertimeRuleRes;
import com.makeup.platform.entity.agency.AgencyOvertimeRuleEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffOvertimeReportEntity;
import org.springframework.stereotype.Component;

@Component
public class AgencyOvertimeMapper {

    public OvertimeRuleRes toRuleRes(AgencyOvertimeRuleEntity entity) {
        if (entity == null) {
            return null;
        }

        return OvertimeRuleRes.builder()
                .id(entity.getId())
                .agencyId(entity.getAgency() != null ? entity.getAgency().getId() : null)
                .ruleName(entity.getRuleName())
                .minOvertimeMinutes(entity.getMinOvertimeMinutes())
                .maxOvertimeMinutes(entity.getMaxOvertimeMinutes())
                .penaltyType(entity.getPenaltyType())
                .penaltyValue(entity.getPenaltyValue())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    public OvertimeReportRes toReportRes(AgencyStaffOvertimeReportEntity entity) {
        if (entity == null) {
            return null;
        }

        Long staffId = null;
        String staffName = null;
        if (entity.getStaff() != null) {
            AgencyStaffEntity staff = entity.getStaff();
            staffId = staff.getId();
            if (staff.getMua() != null && staff.getMua().getUser() != null) {
                staffName = staff.getMua().getUser().getFullName();
            }
        }

        Long agencyId = null;
        String agencyName = null;
        if (entity.getAgency() != null) {
            agencyId = entity.getAgency().getId();
            agencyName = entity.getAgency().getAgencyName();
        }

        Long ruleId = null;
        String ruleName = null;
        if (entity.getRule() != null) {
            ruleId = entity.getRule().getId();
            ruleName = entity.getRule().getRuleName();
        }

        return OvertimeReportRes.builder()
                .id(entity.getId())
                .bookingId(entity.getBookingId())
                .staffId(staffId)
                .staffName(staffName)
                .agencyId(agencyId)
                .agencyName(agencyName)
                .overtimeMinutes(entity.getOvertimeMinutes())
                .reasonType(entity.getReasonType())
                .ruleId(ruleId)
                .ruleName(ruleName)
                .explanationText(entity.getExplanationText())
                .proofImageUrl(entity.getProofImageUrl())
                .status(entity.getStatus())
                .penaltyAmountApplied(entity.getPenaltyAmountApplied())
                .customerSurchargeAmount(entity.getCustomerSurchargeAmount())
                .chargeReason(entity.getChargeReason())
                .adminNotes(entity.getAdminNotes())
                .reviewedByUserId(entity.getReviewedByUserId())
                .reviewedAt(entity.getReviewedAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
