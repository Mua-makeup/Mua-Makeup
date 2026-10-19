package com.makeup.platform.service.agency;

import com.makeup.platform.dto.request.agency.CreateLeaveRequestReq;
import com.makeup.platform.dto.request.agency.ReviewLeaveRequestReq;
import com.makeup.platform.dto.response.agency.StaffLeaveRequestRes;
import com.makeup.platform.entity.agency.LeaveRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AgencyLeaveRequestService {

    StaffLeaveRequestRes submitLeaveRequest(Long userId, CreateLeaveRequestReq req);

    List<StaffLeaveRequestRes> getMyLeaveRequests(Long userId);

    void cancelMyLeaveRequest(Long userId, Long requestId);

    Page<StaffLeaveRequestRes> getAgencyLeaveRequests(Long userId, LeaveRequestStatus status, Pageable pageable);

    StaffLeaveRequestRes reviewLeaveRequest(Long userId, Long requestId, ReviewLeaveRequestReq req);

    long countPendingRequests(Long userId);
}
