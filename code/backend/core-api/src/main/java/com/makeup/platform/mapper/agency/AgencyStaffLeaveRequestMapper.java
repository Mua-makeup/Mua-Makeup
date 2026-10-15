package com.makeup.platform.mapper.agency;

import com.makeup.platform.dto.request.agency.CreateLeaveRequestReq;
import com.makeup.platform.dto.response.agency.StaffLeaveRequestRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffLeaveRequestEntity;
import com.makeup.platform.entity.agency.LeaveRequestStatus;
import org.springframework.stereotype.Component;

@Component
public class AgencyStaffLeaveRequestMapper {

    public AgencyStaffLeaveRequestEntity toEntity(
            AgencyProfileEntity agency,
            AgencyStaffEntity staff,
            CreateLeaveRequestReq req
    ) {
        if (req == null) {
            return null;
        }

        return AgencyStaffLeaveRequestEntity.builder()
                .agency(agency)
                .staff(staff)
                .leaveDate(req.getLeaveDate())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .shiftName(req.getShiftName().trim())
                .reason(req.getReason().trim())
                .status(LeaveRequestStatus.PENDING)
                .build();
    }

    public StaffLeaveRequestRes toResponse(AgencyStaffLeaveRequestEntity entity) {
        if (entity == null) {
            return null;
        }

        String staffName = null;
        String staffPhone = null;
        if (entity.getStaff() != null && entity.getStaff().getMua() != null && entity.getStaff().getMua().getUser() != null) {
            staffName = entity.getStaff().getMua().getUser().getFullName();
            staffPhone = entity.getStaff().getMua().getUser().getPhoneNumber();
        }

        String agencyName = entity.getAgency() != null ? entity.getAgency().getAgencyName() : null;
        String reviewerName = entity.getReviewedByUser() != null ? entity.getReviewedByUser().getFullName() : null;

        return StaffLeaveRequestRes.builder()
                .id(entity.getId())
                .agencyId(entity.getAgency() != null ? entity.getAgency().getId() : null)
                .agencyName(agencyName)
                .staffId(entity.getStaff() != null ? entity.getStaff().getId() : null)
                .staffName(staffName)
                .staffPhone(staffPhone)
                .leaveDate(entity.getLeaveDate())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .shiftName(entity.getShiftName())
                .reason(entity.getReason())
                .status(entity.getStatus())
                .rejectionReason(entity.getRejectionReason())
                .reviewedByUserName(reviewerName)
                .reviewedAt(entity.getReviewedAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
