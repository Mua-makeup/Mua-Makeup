package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.agency.ConfigureShiftReq;
import com.makeup.platform.dto.response.agency.DayShiftGroupRes;
import com.makeup.platform.dto.response.agency.ShiftDetailRes;
import com.makeup.platform.dto.response.agency.WeeklyShiftMatrixRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffShiftEntity;
import com.makeup.platform.entity.mua.MUACalendarEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.AgencyStaffShiftRepository;
import com.makeup.platform.repository.mua.MUACalendarRepository;
import com.makeup.platform.service.agency.AgencyShiftService;
import com.makeup.platform.entity.agency.AgencyStaffLeaveRequestEntity;
import com.makeup.platform.repository.AgencyStaffLeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyShiftServiceImpl implements AgencyShiftService {

    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyStaffRepository agencyStaffRepository;
    private final AgencyStaffShiftRepository agencyStaffShiftRepository;
    private final MUACalendarRepository muaCalendarRepository;
    private final AgencyStaffLeaveRequestRepository leaveRequestRepository;

    private static final List<Integer> ORDERED_DAYS_OF_WEEK = List.of(2, 3, 4, 5, 6, 7, 1);

    private static final List<LocalTime[]> VALID_SHIFT_WINDOWS = List.of(
            new LocalTime[]{LocalTime.of(8, 0), LocalTime.of(12, 0)},
            new LocalTime[]{LocalTime.of(13, 0), LocalTime.of(17, 0)},
            new LocalTime[]{LocalTime.of(18, 0), LocalTime.of(21, 30)},
            new LocalTime[]{LocalTime.of(8, 0), LocalTime.of(17, 0)}
    );

    private void validateShiftTimePreset(LocalTime startTime, LocalTime endTime) {
        if (startTime == null || endTime == null) {
            return;
        }
        boolean isValidSlot = VALID_SHIFT_WINDOWS.stream()
                .anyMatch(w -> w[0].equals(startTime) && w[1].equals(endTime));
        if (!isValidSlot) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVALID_SHIFT_TIME,
                    "agency.shift_time_must_be_fixed_preset",
                    HttpStatus.BAD_REQUEST
            );
        }
    }

    @Override
    @Transactional
    public ShiftDetailRes createShift(Long userId, ConfigureShiftReq req) {
        if (!req.getEndTime().isAfter(req.getStartTime())) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVALID_SHIFT_TIME,
                    "agency.shift_time_invalid",
                    HttpStatus.BAD_REQUEST
            );
        }
        validateShiftTimePreset(req.getStartTime(), req.getEndTime());

        AgencyProfileEntity agency = getAgencyForManager(userId);

        AgencyStaffEntity staff = agencyStaffRepository.findById(req.getStaffId())
                .filter(s -> s.getAgency().getId().equals(agency.getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "agency.staff_not_in_agency"
                ));

        if (!Boolean.TRUE.equals(staff.getIsActive()) || !"ACTIVE".equalsIgnoreCase(staff.getStatus())) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_STAFF_NOT_FOUND,
                    "agency.staff_not_active",
                    HttpStatus.BAD_REQUEST
            );
        }

        Integer dayOfWeek = req.getDayOfWeek();
        if (req.getWorkDate() != null) {
            int javaDow = req.getWorkDate().getDayOfWeek().getValue();
            dayOfWeek = (javaDow == 7) ? 1 : javaDow + 1;
        }
        if (dayOfWeek == null) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_VALIDATION,
                    "validation.day_of_week_required",
                    HttpStatus.BAD_REQUEST
            );
        }

        List<AgencyStaffShiftEntity> overlapping;
        if (req.getWorkDate() != null) {
            overlapping = agencyStaffShiftRepository.findOverlappingShiftsForWorkDate(
                    req.getStaffId(),
                    dayOfWeek,
                    req.getWorkDate(),
                    req.getStartTime(),
                    req.getEndTime()
            );
        } else {
            overlapping = agencyStaffShiftRepository.findOverlappingRecurringShifts(
                    req.getStaffId(),
                    dayOfWeek,
                    req.getStartTime(),
                    req.getEndTime()
            );
        }

        validateNoOverlappingShifts(overlapping);
        validateNoStaffBusySlotConflict(staff, req.getWorkDate(), req.getStartTime(), req.getEndTime());

        AgencyStaffShiftEntity shift = AgencyStaffShiftEntity.builder()
                .agency(agency)
                .staff(staff)
                .workDate(req.getWorkDate())
                .dayOfWeek(dayOfWeek)
                .shiftName(req.getShiftName().trim())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .isRecurring(req.getIsRecurring() != null ? req.getIsRecurring() : (req.getWorkDate() == null))
                .isActive(true)
                .build();

        AgencyStaffShiftEntity saved = agencyStaffShiftRepository.save(shift);
        log.info("Successfully created shift id={} for staffId={} on workDate={} dayOfWeek={} in agencyId={}",
                saved.getId(), staff.getId(), saved.getWorkDate(), saved.getDayOfWeek(), agency.getId());

        return mapToDetailRes(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public WeeklyShiftMatrixRes getWeeklyShiftMatrix(Long userId) {
        return getWeeklyShiftMatrix(userId, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public WeeklyShiftMatrixRes getWeeklyShiftMatrix(Long userId, LocalDate startDate, LocalDate endDate) {
        AgencyProfileEntity agency = resolveAgencyForUser(userId);

        List<AgencyStaffShiftEntity> allShifts;
        if (startDate != null && endDate != null) {
            allShifts = agencyStaffShiftRepository.findAllActiveByAgencyIdAndWeekRange(agency.getId(), startDate, endDate);
        } else {
            allShifts = agencyStaffShiftRepository.findAllActiveByAgencyIdWithStaff(agency.getId());
        }

        Map<Integer, List<AgencyStaffShiftEntity>> shiftsByDay = allShifts.stream()
                .collect(Collectors.groupingBy(AgencyStaffShiftEntity::getDayOfWeek));

        List<DayShiftGroupRes> days = new ArrayList<>();
        for (Integer dow : ORDERED_DAYS_OF_WEEK) {
            List<AgencyStaffShiftEntity> dayShifts = shiftsByDay.getOrDefault(dow, Collections.emptyList());
            List<ShiftDetailRes> shiftResList = dayShifts.stream()
                    .map(this::mapToDetailRes)
                    .collect(Collectors.toList());

            days.add(DayShiftGroupRes.builder()
                    .dayOfWeek(dow)
                    .dayName(ShiftDetailRes.getVietnameseDayName(dow))
                    .shifts(shiftResList)
                    .build());
        }

        return WeeklyShiftMatrixRes.builder()
                .agencyId(agency.getId())
                .days(days)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ShiftDetailRes getShiftById(Long userId, Long shiftId) {
        AgencyProfileEntity agency = resolveAgencyForUser(userId);

        AgencyStaffShiftEntity shift = agencyStaffShiftRepository.findById(shiftId)
                .filter(s -> s.getAgency().getId().equals(agency.getId()) && Boolean.TRUE.equals(s.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_SHIFT_NOT_FOUND,
                        "ERR_SHIFT_NOT_FOUND"
                ));

        return mapToDetailRes(shift);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShiftDetailRes> getStaffShifts(Long userId, Long staffId, LocalDate startDate, LocalDate endDate) {
        AgencyStaffEntity staff = agencyStaffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "ERR_STAFF_NOT_FOUND"
                ));

        List<AgencyStaffShiftEntity> shifts;
        if (startDate != null && endDate != null) {
            shifts = agencyStaffShiftRepository.findAllActiveByStaffIdAndWeekRange(staffId, startDate, endDate);
        } else {
            shifts = agencyStaffShiftRepository.findAllActiveByStaffIdWithStaff(staffId);
        }

        return shifts.stream()
                .map(this::mapToDetailRes)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ShiftDetailRes updateShift(Long userId, Long shiftId, ConfigureShiftReq req) {
        if (!req.getEndTime().isAfter(req.getStartTime())) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_INVALID_SHIFT_TIME,
                    "agency.shift_time_invalid",
                    HttpStatus.BAD_REQUEST
            );
        }
        validateShiftTimePreset(req.getStartTime(), req.getEndTime());

        AgencyProfileEntity agency = getAgencyForManager(userId);

        AgencyStaffShiftEntity shift = getShiftForAgency(shiftId, agency);

        AgencyStaffEntity staff = shift.getStaff();
        if (req.getStaffId() != null && !req.getStaffId().equals(staff.getId())) {
            staff = agencyStaffRepository.findById(req.getStaffId())
                    .filter(s -> s.getAgency().getId().equals(agency.getId()))
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCodes.ERR_STAFF_NOT_FOUND,
                            "agency.staff_not_in_agency"
                    ));
        }

        Integer dayOfWeek = req.getDayOfWeek();
        if (req.getWorkDate() != null) {
            int javaDow = req.getWorkDate().getDayOfWeek().getValue();
            dayOfWeek = (javaDow == 7) ? 1 : javaDow + 1;
        } else if (dayOfWeek == null) {
            dayOfWeek = shift.getDayOfWeek();
        }

        LocalDate targetWorkDate = req.getWorkDate() != null ? req.getWorkDate() : shift.getWorkDate();

        List<AgencyStaffShiftEntity> overlapping;
        if (targetWorkDate != null) {
            overlapping = agencyStaffShiftRepository.findOverlappingShiftsForWorkDateExcluding(
                    staff.getId(),
                    dayOfWeek,
                    targetWorkDate,
                    req.getStartTime(),
                    req.getEndTime(),
                    shiftId
            );
        } else {
            overlapping = agencyStaffShiftRepository.findOverlappingRecurringShiftsExcluding(
                    staff.getId(),
                    dayOfWeek,
                    req.getStartTime(),
                    req.getEndTime(),
                    shiftId
            );
        }

        validateNoOverlappingShifts(overlapping);
        validateNoStaffBusySlotConflict(staff, targetWorkDate, req.getStartTime(), req.getEndTime());

        shift.setStaff(staff);
        shift.setDayOfWeek(dayOfWeek);
        shift.setWorkDate(targetWorkDate);
        if (req.getShiftName() != null && !req.getShiftName().isBlank()) {
            shift.setShiftName(req.getShiftName().trim());
        }
        shift.setStartTime(req.getStartTime());
        shift.setEndTime(req.getEndTime());
        if (req.getIsRecurring() != null) {
            shift.setIsRecurring(req.getIsRecurring());
        }
        shift.setIsActive(true);

        AgencyStaffShiftEntity saved = agencyStaffShiftRepository.save(shift);
        log.info("Successfully updated shift id={} for staffId={} on workDate={} dayOfWeek={} {}-{} in agencyId={}",
                saved.getId(), staff.getId(), saved.getWorkDate(), saved.getDayOfWeek(), saved.getStartTime(), saved.getEndTime(), agency.getId());

        return mapToDetailRes(saved);
    }

    @Override
    @Transactional
    public void deleteShift(Long userId, Long shiftId) {
        AgencyProfileEntity agency = getAgencyForManager(userId);

        AgencyStaffShiftEntity shift = getShiftForAgency(shiftId, agency);

        shift.setIsActive(false);
        agencyStaffShiftRepository.save(shift);
        log.info("Deactivated shift id={} by agency owner userId={}", shiftId, userId);
    }

    private void validateNoOverlappingShifts(List<AgencyStaffShiftEntity> overlapping) {
        if (!overlapping.isEmpty()) {
            AgencyStaffShiftEntity first = overlapping.get(0);
            String dayInfo = "";
            if (first.getWorkDate() != null) {
                dayInfo = ShiftDetailRes.getVietnameseDayName(first.getDayOfWeek()) + " (" + first.getWorkDate().format(DateTimeFormatter.ofPattern("dd/MM")) + ")";
            } else if (first.getDayOfWeek() != null) {
                dayInfo = ShiftDetailRes.getVietnameseDayName(first.getDayOfWeek());
            }
            throw new CustomBusinessException(
                    ErrorCodes.ERR_SHIFT_OVERLAPPING,
                    "agency.shift_time_overlapped",
                    new Object[]{dayInfo},
                    HttpStatus.CONFLICT
            );
        }
    }

    private AgencyStaffShiftEntity getShiftForAgency(Long shiftId, AgencyProfileEntity agency) {
        return agencyStaffShiftRepository.findById(shiftId)
                .filter(s -> s.getAgency().getId().equals(agency.getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_SHIFT_NOT_FOUND,
                        "ERR_SHIFT_NOT_FOUND"
                ));
    }

    private AgencyProfileEntity getAgencyForManager(Long userId) {
        AgencyProfileEntity agency = agencyProfileRepository.findByOwnerId(userId)
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

    private AgencyProfileEntity resolveAgencyForUser(Long userId) {
        return agencyProfileRepository.findByOwnerId(userId)
                .or(() -> agencyStaffRepository.findActiveStaffByUserId(userId).map(AgencyStaffEntity::getAgency))
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "ERR_AGENCY_NOT_FOUND"
                ));
    }

    private ShiftDetailRes mapToDetailRes(AgencyStaffShiftEntity entity) {
        String staffName = null;
        if (entity.getStaff() != null && entity.getStaff().getMua() != null && entity.getStaff().getMua().getUser() != null) {
            staffName = entity.getStaff().getMua().getUser().getFullName();
        }

        return ShiftDetailRes.builder()
                .id(entity.getId())
                .shiftId(entity.getId())
                .staffId(entity.getStaff() != null ? entity.getStaff().getId() : null)
                .staffName(staffName)
                .workDate(entity.getWorkDate())
                .dayOfWeek(entity.getDayOfWeek())
                .dayName(ShiftDetailRes.getVietnameseDayName(entity.getDayOfWeek()))
                .shiftName(entity.getShiftName())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .isRecurring(entity.getIsRecurring())
                .isActive(entity.getIsActive())
                .build();
    }

    private static final ZoneOffset VIETNAM_OFFSET = ZoneOffset.ofHours(7);

    private void validateNoStaffBusySlotConflict(AgencyStaffEntity staff, LocalDate workDate, LocalTime startTime, LocalTime endTime) {
        if (workDate == null || staff == null) {
            return;
        }

        String staffName = (staff.getMua() != null && staff.getMua().getUser() != null && staff.getMua().getUser().getFullName() != null)
                ? staff.getMua().getUser().getFullName()
                : "nhân viên";

        // 1. Kiểm tra đơn xin nghỉ ca đã được duyệt (APPROVED)
        List<AgencyStaffLeaveRequestEntity> approvedLeaves = leaveRequestRepository.findOverlappingApprovedRequests(
                staff.getId(),
                workDate,
                startTime,
                endTime
        );
        if (!approvedLeaves.isEmpty()) {
            AgencyStaffLeaveRequestEntity leave = approvedLeaves.get(0);
            String startStr = leave.getStartTime().toString().substring(0, 5);
            String endStr = leave.getEndTime().toString().substring(0, 5);
            throw new CustomBusinessException(
                    ErrorCodes.ERR_STAFF_BUSY_SLOT,
                    "agency.staff_busy_slot_conflict",
                    staffName,
                    startStr,
                    endStr,
                    "Đã duyệt nghỉ ca: " + (leave.getReason() != null ? leave.getReason() : "Bận việc cá nhân")
            );
        }

        // 2. Kiểm tra slot lịch bận cá nhân trong MUA Calendar
        if (staff.getMua() == null) {
            return;
        }

        List<MUACalendarEntity> busySlots = muaCalendarRepository.findActiveSlotsByMuaIdAndDate(
                staff.getMua().getId(),
                workDate
        );

        if (busySlots.isEmpty()) {
            return;
        }

        OffsetDateTime shiftStartAt = workDate.atTime(startTime).atOffset(VIETNAM_OFFSET);
        OffsetDateTime shiftEndAt = workDate.atTime(endTime).atOffset(VIETNAM_OFFSET);

        for (MUACalendarEntity busy : busySlots) {
            OffsetDateTime busyStartAt = busy.getStartAt();
            OffsetDateTime busyEndAt = busy.getEndAt();

            // So sánh giao thoa tuyệt đối giữa ca trực và slot bận
            OffsetDateTime maxStart = shiftStartAt.isAfter(busyStartAt) ? shiftStartAt : busyStartAt;
            OffsetDateTime minEnd = shiftEndAt.isBefore(busyEndAt) ? shiftEndAt : busyEndAt;

            if (maxStart.isBefore(minEnd)) {
                LocalTime busyStartLocal = busyStartAt.withOffsetSameInstant(VIETNAM_OFFSET).toLocalTime();
                LocalTime busyEndLocal = busyEndAt.withOffsetSameInstant(VIETNAM_OFFSET).toLocalTime();
                String startStr = busyStartLocal.toString().substring(0, 5);
                String endStr = busyEndLocal.toString().substring(0, 5);
                throw new CustomBusinessException(
                        ErrorCodes.ERR_STAFF_BUSY_SLOT,
                        "agency.staff_busy_slot_conflict",
                        staffName,
                        startStr,
                        endStr,
                        busy.getReason() != null ? busy.getReason() : "Bận việc cá nhân"
                );
            }
        }
    }
}
