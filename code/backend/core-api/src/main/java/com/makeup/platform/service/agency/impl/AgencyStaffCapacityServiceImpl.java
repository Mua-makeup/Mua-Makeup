package com.makeup.platform.service.agency.impl;

import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.service.agency.AgencyStaffCapacityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyStaffCapacityServiceImpl implements AgencyStaffCapacityService {

    private final AgencyStaffRepository agencyStaffRepository;

    @Override
    @Transactional(readOnly = true)
    public boolean hasAvailableStaffForAgency(Long agencyId, LocalDate date, LocalTime startTime, LocalTime endTime) {
        var activeStaffList = agencyStaffRepository.findByAgencyIdAndIsActiveTrue(agencyId);
        log.info("Checking capacity for agency ID: {} on date: {}, active staff count: {}",
                agencyId, date, activeStaffList.size());

        return !activeStaffList.isEmpty();
    }
}
