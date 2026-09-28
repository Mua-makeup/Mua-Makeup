package com.makeup.platform.service.agency;

import com.makeup.platform.dto.request.agency.ApproveEmergencyReportReq;
import com.makeup.platform.dto.request.agency.AssignStaffToBookingReq;
import com.makeup.platform.dto.request.agency.ProceedSoloReq;
import com.makeup.platform.dto.request.agency.ReassignStaffReq;
import com.makeup.platform.dto.request.agency.RejectDispatchBookingReq;
import com.makeup.platform.dto.request.agency.ReportEmergencyBusyReq;
import com.makeup.platform.dto.response.agency.AgencyBookingRes;
import com.makeup.platform.dto.response.agency.DispatchAssignmentRes;
import com.makeup.platform.dto.response.agency.EmergencyApprovalRes;
import com.makeup.platform.dto.response.agency.EmergencyReassignmentRes;
import com.makeup.platform.dto.response.agency.StaffAvailabilityMatrixRes;

import java.util.List;

public interface AgencyDispatchService {

    List<AgencyBookingRes> getPendingDispatchBookings(Long ownerUserId);

    StaffAvailabilityMatrixRes getStaffMatrix(Long ownerUserId, Long bookingId);

    DispatchAssignmentRes assignStaff(Long ownerUserId, Long bookingId, AssignStaffToBookingReq req);

    EmergencyReassignmentRes reassignStaff(Long ownerUserId, Long bookingId, ReassignStaffReq req);

    void proceedSolo(Long ownerUserId, Long bookingId, ProceedSoloReq req);

    void rejectBooking(Long ownerUserId, Long bookingId, RejectDispatchBookingReq req);

    void reportEmergencyBusy(Long muaUserId, Long bookingId, ReportEmergencyBusyReq req);

    EmergencyApprovalRes reviewEmergencyReport(Long ownerUserId, Long bookingId, Long staffId, ApproveEmergencyReportReq req);

    void confirmAssignment(Long muaUserId, Long assignmentId);
}
