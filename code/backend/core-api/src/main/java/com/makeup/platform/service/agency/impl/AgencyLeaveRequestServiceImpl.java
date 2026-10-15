package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.agency.CreateLeaveRequestReq;
import com.makeup.platform.dto.request.agency.ReviewLeaveRequestReq;
import com.makeup.platform.dto.response.agency.StaffLeaveRequestRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffLeaveRequestEntity;
import com.makeup.platform.entity.agency.AgencyStaffShiftEntity;
import com.makeup.platform.entity.agency.LeaveRequestStatus;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.mua.CalendarSlotType;
import com.makeup.platform.entity.mua.MUACalendarEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.mapper.agency.AgencyStaffLeaveRequestMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffLeaveRequestRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.AgencyStaffShiftRepository;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.mua.MUACalendarRepository;
import com.makeup.platform.service.agency.AgencyLeaveRequestService;
import com.makeup.platform.service.interaction.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyLeaveRequestServiceImpl implements AgencyLeaveRequestService {

    private final AgencyStaffLeaveRequestRepository leaveRequestRepository;
    private final AgencyStaffRepository agencyStaffRepository;
    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyStaffShiftRepository agencyStaffShiftRepository;
    private final MUACalendarRepository muaCalendarRepository;
    private final UserRepository userRepository;
    private final AgencyStaffLeaveRequestMapper leaveRequestMapper;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);

    private void validateShiftPreset(LocalTime start, LocalTime end) {
        if (start == null || end == null) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVALID_SHIFT_TIME,
                    "agency.shift_time_must_be_fixed_preset",
                    HttpStatus.BAD_REQUEST
            );
        }
        boolean isValid = (start.getHour() == 8 && start.getMinute() == 0 && end.getHour() == 12 && end.getMinute() == 0)
                || (start.getHour() == 13 && start.getMinute() == 0 && end.getHour() == 17 && end.getMinute() == 0)
                || (start.getHour() == 18 && start.getMinute() == 0 && end.getHour() == 21 && end.getMinute() == 30)
                || (start.getHour() == 8 && start.getMinute() == 0 && end.getHour() == 17 && end.getMinute() == 0);

        if (!isValid) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVALID_SHIFT_TIME,
                    "agency.shift_time_must_be_fixed_preset",
                    HttpStatus.BAD_REQUEST
            );
        }
    }

    @Override
    @Transactional
    public StaffLeaveRequestRes submitLeaveRequest(Long userId, CreateLeaveRequestReq req) {
        validateShiftPreset(req.getStartTime(), req.getEndTime());

        AgencyStaffEntity staff = agencyStaffRepository.findActiveStaffByUserId(userId)
                .orElseThrow(() -> new CustomBusinessException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "agency.staff_not_found_or_inactive",
                        HttpStatus.BAD_REQUEST
                ));

        AgencyProfileEntity agency = staff.getAgency();
        if (agency == null) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_AGENCY_NOT_FOUND,
                    "agency.staff_not_in_agency",
                    HttpStatus.BAD_REQUEST
            );
        }

        // Kiểm tra xem đã có đơn xin nghỉ PENDING trùng lặp chưa
        List<AgencyStaffLeaveRequestEntity> overlapping = leaveRequestRepository.findOverlappingPendingRequests(
                staff.getId(),
                req.getLeaveDate(),
                req.getStartTime(),
                req.getEndTime()
        );
        if (!overlapping.isEmpty()) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_DUPLICATE_LEAVE_REQUEST,
                    "agency.leave_request_already_pending",
                    HttpStatus.CONFLICT
            );
        }

        AgencyStaffLeaveRequestEntity entity = leaveRequestMapper.toEntity(agency, staff, req);
        AgencyStaffLeaveRequestEntity saved = leaveRequestRepository.save(entity);

        log.info("Staff id={} (userId={}) submitted leave request id={} for date={} {}-{}",
                staff.getId(), userId, saved.getId(), req.getLeaveDate(), req.getStartTime(), req.getEndTime());

        // 1. Bắn thông báo In-app cho Agency Owner
        try {
            if (agency.getOwner() != null) {
                String staffName = (staff.getMua() != null && staff.getMua().getUser() != null)
                        ? staff.getMua().getUser().getFullName()
                        : "Thợ Studio";
                String content = String.format("Thợ %s đã gửi đơn xin nghỉ ca %s ngày %s. Lý do: %s",
                        staffName, req.getShiftName(), req.getLeaveDate(), req.getReason() != null ? req.getReason() : "Việc cá nhân");

                notificationService.createInAppNotification(
                        agency.getOwner().getId(),
                        agency.getId(),
                        null,
                        "STAFF_LEAVE_SUBMITTED",
                        "Đơn xin nghỉ ca mới",
                        content,
                        Map.of(
                                "targetUrl", "/agency/shifts?tab=leave-requests",
                                "requestId", saved.getId(),
                                "staffId", staff.getId(),
                                "staffName", staffName,
                                "leaveDate", saved.getLeaveDate().toString(),
                                "shiftName", saved.getShiftName(),
                                "reason", saved.getReason() != null ? saved.getReason() : ""
                        )
                );
            }
        } catch (Exception ex) {
            log.error("Failed to send leave request notification to agency owner: {}", ex.getMessage());
        }

        // 2. Broadcast STOMP WebSocket realtime cho Web Agency Admin
        try {
            String staffName = (staff.getMua() != null && staff.getMua().getUser() != null)
                    ? staff.getMua().getUser().getFullName()
                    : "Thợ Studio";
            Map<String, Object> wsPayload = Map.of(
                    "type", "STAFF_LEAVE_SUBMITTED",
                    "agencyId", agency.getId(),
                    "requestId", saved.getId(),
                    "staffId", staff.getId(),
                    "staffName", staffName,
                    "leaveDate", saved.getLeaveDate().toString(),
                    "shiftName", saved.getShiftName(),
                    "reason", saved.getReason() != null ? saved.getReason() : "",
                    "content", String.format("Thợ %s đã gửi đơn xin nghỉ ca %s ngày %s. Lý do: %s",
                            staffName, req.getShiftName(), req.getLeaveDate(), req.getReason() != null ? req.getReason() : "Việc cá nhân",
                    "targetUrl", "/agency/shifts?tab=leave-requests",
                    "timestamp", System.currentTimeMillis()
            ));
            messagingTemplate.convertAndSend("/topic/agency/" + agency.getId() + "/leave-requests", wsPayload);
            messagingTemplate.convertAndSend("/topic/agency/leave-requests", wsPayload);
            log.info("Broadcasted STAFF_LEAVE_SUBMITTED realtime to agencyId={}", agency.getId());
        } catch (Exception ex) {
            log.error("Failed to broadcast leave request STOMP message: {}", ex.getMessage());
        }

        return leaveRequestMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StaffLeaveRequestRes> getMyLeaveRequests(Long userId) {
        AgencyStaffEntity staff = agencyStaffRepository.findActiveStaffByUserId(userId)
                .orElseThrow(() -> new CustomBusinessException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "agency.staff_not_found_or_inactive",
                        HttpStatus.BAD_REQUEST
                ));

        List<AgencyStaffLeaveRequestEntity> list = leaveRequestRepository.findAllByStaffIdOrderByCreatedAtDesc(staff.getId());
        return list.stream()
                .map(leaveRequestMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public void cancelMyLeaveRequest(Long userId, Long requestId) {
        AgencyStaffEntity staff = agencyStaffRepository.findActiveStaffByUserId(userId)
                .orElseThrow(() -> new CustomBusinessException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "agency.staff_not_found_or_inactive",
                        HttpStatus.BAD_REQUEST
                ));

        AgencyStaffLeaveRequestEntity request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_LEAVE_REQUEST_NOT_FOUND,
                        "agency.leave_request_not_found"
                ));

        if (!request.getStaff().getId().equals(staff.getId())) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_FORBIDDEN,
                    "agency.leave_request_not_owner",
                    HttpStatus.FORBIDDEN
            );
        }

        if (request.getStatus() != LeaveRequestStatus.PENDING) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVALID_LEAVE_ACTION,
                    "agency.leave_request_cannot_cancel_reviewed",
                    HttpStatus.BAD_REQUEST
            );
        }

        request.setStatus(LeaveRequestStatus.CANCELLED);
        leaveRequestRepository.save(request);
        log.info("Staff id={} cancelled leave request id={}", staff.getId(), requestId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StaffLeaveRequestRes> getAgencyLeaveRequests(Long userId, LeaveRequestStatus status, Pageable pageable) {
        AgencyProfileEntity agency = resolveAgencyForManager(userId);
        Page<AgencyStaffLeaveRequestEntity> page = leaveRequestRepository.findAllByAgencyIdAndOptionalStatus(
                agency.getId(),
                status,
                pageable
        );
        return page.map(leaveRequestMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public long countPendingRequests(Long userId) {
        AgencyProfileEntity agency = resolveAgencyForManager(userId);
        return leaveRequestRepository.countByAgencyIdAndStatus(agency.getId(), LeaveRequestStatus.PENDING);
    }

    @Override
    @Transactional
    public StaffLeaveRequestRes reviewLeaveRequest(Long userId, Long requestId, ReviewLeaveRequestReq req) {
        AgencyProfileEntity agency = resolveAgencyForManager(userId);
        UserEntity reviewer = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCodes.ERR_USER_NOT_FOUND, "auth.user_not_found"));

        AgencyStaffLeaveRequestEntity request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_LEAVE_REQUEST_NOT_FOUND,
                        "agency.leave_request_not_found"
                ));

        if (!request.getAgency().getId().equals(agency.getId())) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_FORBIDDEN,
                    "agency.leave_request_not_in_agency",
                    HttpStatus.FORBIDDEN
            );
        }

        if (request.getStatus() != LeaveRequestStatus.PENDING) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVALID_LEAVE_ACTION,
                    "agency.leave_request_already_reviewed",
                    HttpStatus.BAD_REQUEST
            );
        }

        if (req.getStatus() != LeaveRequestStatus.APPROVED && req.getStatus() != LeaveRequestStatus.REJECTED) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVALID_LEAVE_ACTION,
                    "agency.invalid_decision",
                    HttpStatus.BAD_REQUEST
            );
        }

        request.setStatus(req.getStatus());
        request.setReviewedByUser(reviewer);
        request.setReviewedAt(OffsetDateTime.now(VIETNAM_OFFSET));

        AgencyStaffEntity staff = request.getStaff();
        String staffUserId = null;
        if (staff != null && staff.getMua() != null && staff.getMua().getUser() != null) {
            staffUserId = String.valueOf(staff.getMua().getUser().getId());
        }

        if (req.getStatus() == LeaveRequestStatus.APPROVED) {
            // 1. TỰ ĐỘNG XÓA / VÔ HIỆU HÓA CA TRỰC TƯƠNG ỨNG TRÊN MA TRẬN
            LocalDate leaveDate = request.getLeaveDate();
            int javaDow = leaveDate.getDayOfWeek().getValue();
            int dayOfWeek = (javaDow == 7) ? 1 : javaDow + 1;

            List<AgencyStaffShiftEntity> activeShifts = agencyStaffShiftRepository.findActiveShiftsForStaffOnDate(
                    staff.getId(),
                    leaveDate,
                    dayOfWeek
            );

            LocalTime reqStart = request.getStartTime();
            LocalTime reqEnd = request.getEndTime();

            for (AgencyStaffShiftEntity shift : activeShifts) {
                LocalTime sStart = shift.getStartTime();
                LocalTime sEnd = shift.getEndTime();

                // Kiểm tra xem ca làm việc có giao thoa với khung giờ xin nghỉ không
                if (!reqStart.isBefore(sEnd) || !reqEnd.isAfter(sStart)) {
                    continue; // Không trùng (ví dụ ca tối 18:00-21:30 khi xin nghỉ ca sáng) -> Giữ nguyên
                }

                // Kiểm tra xem ca hiện tại có phải ca cả ngày không (bắt đầu <= 08:00 và kết thúc >= 17:00)
                boolean isFullDayShift = !sStart.isAfter(LocalTime.of(8, 0)) && !sEnd.isBefore(LocalTime.of(17, 0));

                boolean isMorningLeave = reqStart.equals(LocalTime.of(8, 0)) && reqEnd.equals(LocalTime.of(12, 0));
                boolean isAfternoonLeave = reqStart.equals(LocalTime.of(13, 0)) && reqEnd.equals(LocalTime.of(17, 0));
                boolean isEveningLeave = reqStart.equals(LocalTime.of(18, 0)) && reqEnd.equals(LocalTime.of(21, 30));

                if (isFullDayShift && isMorningLeave) {
                    // Ca cả ngày nhưng chỉ xin nghỉ Ca sáng (08:00 - 12:00) -> Giữ lại Ca chiều (13:00 - 17:00)
                    shift.setStartTime(LocalTime.of(13, 0));
                    shift.setEndTime(LocalTime.of(17, 0));
                    shift.setShiftName("Chiều (13:00 - 17:00)");
                    shift.setWorkDate(leaveDate);
                    shift.setIsRecurring(false);
                    shift.setIsActive(true);
                    agencyStaffShiftRepository.save(shift);
                    log.info("Shift id={} kept as Afternoon (13:00 - 17:00) on date={} for staffId={} after morning leave approval",
                            shift.getId(), leaveDate, staff.getId());
                } else if (isFullDayShift && isAfternoonLeave) {
                    // Ca cả ngày nhưng chỉ xin nghỉ Ca chiều (13:00 - 17:00) -> Giữ lại Ca sáng (08:00 - 12:00)
                    shift.setStartTime(LocalTime.of(8, 0));
                    shift.setEndTime(LocalTime.of(12, 0));
                    shift.setShiftName("Sáng (08:00 - 12:00)");
                    shift.setWorkDate(leaveDate);
                    shift.setIsRecurring(false);
                    shift.setIsActive(true);
                    agencyStaffShiftRepository.save(shift);
                    log.info("Shift id={} kept as Morning (08:00 - 12:00) on date={} for staffId={} after afternoon leave approval",
                            shift.getId(), leaveDate, staff.getId());
                } else if (isFullDayShift && isEveningLeave && sEnd.isAfter(LocalTime.of(17, 0))) {
                    // Ca cả ngày cũ có cả tối, chỉ xin nghỉ tối -> Giữ lại ca cả ngày chuẩn (08:00 - 17:00)
                    shift.setStartTime(LocalTime.of(8, 0));
                    shift.setEndTime(LocalTime.of(17, 0));
                    shift.setShiftName("Cả ngày (08:00 - 17:00)");
                    shift.setWorkDate(leaveDate);
                    shift.setIsRecurring(false);
                    shift.setIsActive(true);
                    agencyStaffShiftRepository.save(shift);
                    log.info("Shift id={} adjusted to (08:00 - 17:00) on date={} for staffId={} after evening leave approval",
                            shift.getId(), leaveDate, staff.getId());
                } else {
                    // Ca trực khớp hoàn toàn với đơn xin nghỉ (hoặc đơn xin nghỉ cả ngày) -> Xóa / vô hiệu hóa ca
                    shift.setIsActive(false);
                    agencyStaffShiftRepository.save(shift);
                    log.info("Auto-deactivated shift id={} (staffId={}, date={}, {}-{}) due to approved leave request id={}",
                            shift.getId(), staff.getId(), leaveDate, sStart, sEnd, requestId);
                }
            }

            // 2. KHÓA LỊCH CÁ NHÂN TRONG MUA_CALENDARS ĐỂ CHẶN ĐẶT ĐƠN
            if (staff != null && staff.getMua() != null) {
                MuaProfileEntity muaProfile = staff.getMua();
                OffsetDateTime startAt = leaveDate.atTime(reqStart).atOffset(VIETNAM_OFFSET);
                OffsetDateTime endAt = leaveDate.atTime(reqEnd).atOffset(VIETNAM_OFFSET);

                // Kiểm tra xem slot đã tồn tại chưa
                if (!muaCalendarRepository.existsOverlappingSlot(muaProfile.getId(), startAt, endAt)) {
                    MUACalendarEntity calendarSlot = MUACalendarEntity.builder()
                            .mua(muaProfile)
                            .slotType(CalendarSlotType.PERSONAL_BLOCKED)
                            .bookingDate(leaveDate)
                            .startAt(startAt)
                            .endAt(endAt)
                            .isLocked(true)
                            .reason("Nghỉ phép ca đã duyệt: " + request.getReason())
                            .build();
                    muaCalendarRepository.save(calendarSlot);
                    log.info("Locked personal slot in MUA calendar for muaId={} on date={} {}-{}",
                            muaProfile.getId(), leaveDate, reqStart, reqEnd);
                }
            }

            // 3. BẮN THÔNG BÁO CHO THỢ
            if (staffUserId != null) {
                try {
                    String content = String.format("Đơn xin nghỉ ca %s ngày %s của bạn đã được Studio phê duyệt. Lịch làm việc của bạn đã được cập nhật.",
                            request.getShiftName(), leaveDate);
                    notificationService.createInAppNotification(
                            Long.parseLong(staffUserId),
                            null, // null để thông báo chỉ gửi riêng cho thợ, không hiển thị ở Agency
                            null,
                            "STAFF_LEAVE_APPROVED",
                            "Đơn xin nghỉ ca đã được phê duyệt",
                            content,
                            Map.of("targetUrl", "/staff/schedule", "requestId", requestId)
                    );
                } catch (Exception ex) {
                    log.error("Failed to notify staff of leave approval: {}", ex.getMessage());
                }
            }
        } else {
            // REJECTED: Giữ nguyên ca trực, lưu lý do từ chối
            request.setRejectionReason(req.getRejectionReason() != null ? req.getRejectionReason().trim() : null);

            // Bắn thông báo cho thợ
            if (staffUserId != null) {
                try {
                    String reasonDetail = request.getRejectionReason() != null ? request.getRejectionReason() : "Theo kế hoạch vận hành của Studio";
                    String content = String.format("Đơn xin nghỉ ca %s ngày %s của bạn bị từ chối. Lý do: %s. Ca trực của bạn vẫn được giữ nguyên.",
                            request.getShiftName(), request.getLeaveDate(), reasonDetail);
                    notificationService.createInAppNotification(
                            Long.parseLong(staffUserId),
                            null, 
                            null,
                            "STAFF_LEAVE_REJECTED",
                            "Đơn xin nghỉ ca bị từ chối",
                            content,
                            Map.of("targetUrl", "/staff/schedule", "requestId", requestId)
                    );
                } catch (Exception ex) {
                    log.error("Failed to notify staff of leave rejection: {}", ex.getMessage());
                }
            }
        }

        AgencyStaffLeaveRequestEntity saved = leaveRequestRepository.save(request);
        log.info("Agency owner userId={} reviewed leave request id={} with result={}", userId, requestId, req.getStatus());

        // Broadcast WebSocket realtime status update cho trang thợ
        try {
            Map<String, Object> wsPayload = Map.of(
                    "type", "STAFF_LEAVE_REVIEWED",
                    "notificationType", req.getStatus() == LeaveRequestStatus.APPROVED ? "STAFF_LEAVE_APPROVED" : "STAFF_LEAVE_REJECTED",
                    "requestId", requestId,
                    "status", req.getStatus().name(),
                    "leaveDate", request.getLeaveDate().toString(),
                    "shiftName", request.getShiftName(),
                    "rejectionReason", request.getRejectionReason() != null ? request.getRejectionReason() : ""
            );
            if (staffUserId != null) {
                messagingTemplate.convertAndSend("/topic/staff-leave-status/" + staffUserId, wsPayload);
                messagingTemplate.convertAndSend("/topic/user-notifications/" + staffUserId, wsPayload);
                messagingTemplate.convertAndSendToUser(staffUserId, "/queue/notifications", wsPayload);
            }
            if (staff != null && staff.getId() != null) {
                messagingTemplate.convertAndSend("/topic/staff-leave-status/" + staff.getId(), wsPayload);
            }
            log.info("[WebSocket] Dispatched realtime leave review status={} to staffUserId={} staffId={}",
                    req.getStatus(), staffUserId, staff != null ? staff.getId() : null);
        } catch (Exception wsEx) {
            log.error("Failed to broadcast leave review WebSocket event: {}", wsEx.getMessage());
        }

        return leaveRequestMapper.toResponse(saved);
    }

    private AgencyProfileEntity resolveAgencyForManager(Long userId) {
        return agencyProfileRepository.findByOwnerId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "ERR_AGENCY_NOT_FOUND"
                ));
    }
}
