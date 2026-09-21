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
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.AgencyStaffShiftRepository;
import com.makeup.platform.service.agency.AgencyShiftService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private static final List<Integer> ORDERED_DAYS_OF_WEEK = List.of(2, 3, 4, 5, 6, 7, 1);

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

        List<AgencyStaffShiftEntity> overlapping = agencyStaffShiftRepository.findOverlappingShifts(
                req.getStaffId(),
                req.getDayOfWeek(),
                req.getStartTime(),
                req.getEndTime(),
                null
        );

        if (!overlapping.isEmpty()) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_SHIFT_OVERLAPPING,
                    "agency.shift_time_overlapped",
                    HttpStatus.CONFLICT
            );
        }

        AgencyStaffShiftEntity shift = AgencyStaffShiftEntity.builder()
                .agency(agency)
                .staff(staff)
                .dayOfWeek(req.getDayOfWeek())
                .shiftName(req.getShiftName().trim())
                .startTime(req.getStartTime())
                .endTime(req.getEndTime())
                .isRecurring(req.getIsRecurring() != null ? req.getIsRecurring() : true)
                .isActive(true)
                .build();

        AgencyStaffShiftEntity saved = agencyStaffShiftRepository.save(shift);
        log.info("Successfully created shift id={} for staffId={} on dayOfWeek={} in agencyId={}",
                saved.getId(), staff.getId(), saved.getDayOfWeek(), agency.getId());

        return mapToDetailRes(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public WeeklyShiftMatrixRes getWeeklyShiftMatrix(Long userId) {
        AgencyProfileEntity agency = resolveAgencyForUser(userId);

        List<AgencyStaffShiftEntity> allShifts = agencyStaffShiftRepository.findAllActiveByAgencyIdWithStaff(agency.getId());

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
    public List<ShiftDetailRes> getStaffShifts(Long userId, Long staffId) {
        AgencyStaffEntity staff = agencyStaffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "ERR_STAFF_NOT_FOUND"
                ));

        List<AgencyStaffShiftEntity> shifts = agencyStaffShiftRepository.findAllActiveByStaffIdWithStaff(staffId);
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

        AgencyProfileEntity agency = getAgencyForManager(userId);

        AgencyStaffShiftEntity shift = agencyStaffShiftRepository.findById(shiftId)
                .filter(s -> s.getAgency().getId().equals(agency.getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_SHIFT_NOT_FOUND,
                        "ERR_SHIFT_NOT_FOUND"
                ));

        AgencyStaffEntity staff = shift.getStaff();
        if (req.getStaffId() != null && !req.getStaffId().equals(staff.getId())) {
            staff = agencyStaffRepository.findById(req.getStaffId())
                    .filter(s -> s.getAgency().getId().equals(agency.getId()))
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCodes.ERR_STAFF_NOT_FOUND,
                            "agency.staff_not_in_agency"
                    ));
        }

        List<AgencyStaffShiftEntity> overlapping = agencyStaffShiftRepository.findOverlappingShifts(
                staff.getId(),
                req.getDayOfWeek(),
                req.getStartTime(),
                req.getEndTime(),
                shiftId
        );

        if (!overlapping.isEmpty()) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_SHIFT_OVERLAPPING,
                    "agency.shift_time_overlapped",
                    HttpStatus.CONFLICT
            );
        }

        shift.setStaff(staff);
        shift.setDayOfWeek(req.getDayOfWeek());
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
        log.info("Successfully updated shift id={} for staffId={} to dayOfWeek={} {}-{} in agencyId={}",
                saved.getId(), staff.getId(), saved.getDayOfWeek(), saved.getStartTime(), saved.getEndTime(), agency.getId());

        return mapToDetailRes(saved);
    }

    @Override
    @Transactional
    public void deleteShift(Long userId, Long shiftId) {
        AgencyProfileEntity agency = getAgencyForManager(userId);

        AgencyStaffShiftEntity shift = agencyStaffShiftRepository.findById(shiftId)
                .filter(s -> s.getAgency().getId().equals(agency.getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_SHIFT_NOT_FOUND,
                        "ERR_SHIFT_NOT_FOUND"
                ));

        shift.setIsActive(false);
        agencyStaffShiftRepository.save(shift);
        log.info("Deactivated shift id={} by agency owner userId={}", shiftId, userId);
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
                .dayOfWeek(entity.getDayOfWeek())
                .dayName(ShiftDetailRes.getVietnameseDayName(entity.getDayOfWeek()))
                .shiftName(entity.getShiftName())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .isRecurring(entity.getIsRecurring())
                .isActive(entity.getIsActive())
                .build();
    }
}
