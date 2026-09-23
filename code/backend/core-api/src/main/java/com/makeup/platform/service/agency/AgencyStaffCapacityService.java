package com.makeup.platform.service.agency;

import java.time.LocalDate;
import java.time.LocalTime;

public interface AgencyStaffCapacityService {

    boolean hasAvailableStaffForAgency(Long agencyId, LocalDate date, LocalTime startTime, LocalTime endTime);
}
