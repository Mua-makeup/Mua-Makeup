package com.makeup.platform.mapper.booking;

import com.makeup.platform.dto.response.agency.StaffAssignmentDetailRes;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.auth.UserEntity;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class BookingStaffAssignmentMapper {

    public StaffAssignmentDetailRes toDetailRes(BookingStaffAssignmentEntity entity) {
        if (entity == null) {
            return null;
        }

        AgencyStaffEntity staff = entity.getStaff();
        Long staffId = null;
        String staffName = null;
        String staffPhone = null;
        String staffAvatarUrl = null;

        if (staff != null) {
            staffId = staff.getId();
            MuaProfileEntity mua = staff.getMua();
            if (mua != null) {
                UserEntity user = mua.getUser();
                if (user != null) {
                    staffName = user.getFullName();
                    staffPhone = user.getPhoneNumber();
                    staffAvatarUrl = user.getAvatarUrl();
                }
            }
        }

        return StaffAssignmentDetailRes.builder()
                .id(entity.getId())
                .staffId(staffId)
                .staffName(staffName)
                .staffPhone(staffPhone)
                .role(entity.getAssignmentRole())
                .status(entity.getStatus())
                .assignedAt(entity.getAssignedAt() != null ? entity.getAssignedAt().toLocalDateTime() : null)
                .confirmedAt(entity.getConfirmedAt() != null ? entity.getConfirmedAt().toLocalDateTime() : null)
                .cancellationReason(entity.getCancellationReason())
                .proofDocumentUrl(entity.getProofDocumentUrl())
                .build();
    }

    public List<StaffAssignmentDetailRes> toDetailResList(List<BookingStaffAssignmentEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }
        return entities.stream()
                .map(this::toDetailRes)
                .collect(Collectors.toList());
    }
}
