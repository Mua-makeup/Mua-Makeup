package com.makeup.platform.repository.custom.projection;

import java.math.BigDecimal;

public interface StaffMatrixProjection {

    Long getStaffId();

    Long getMuaId();

    String getStaffName();

    String getStaffPhone();

    String getStaffAvatarUrl();

    BigDecimal getRatingAvg();

    Integer getTotalReviews();

    Integer getTotalCompletedJobs();

    Boolean getHasServedThisCustomer();

    Boolean getHasShift();

    Boolean getHasPackage();

    Boolean getHasStyle();

    Boolean getHasCalendarFree();

    Boolean getHasOverlappingShift();

    Integer getShiftOvertimeMinutes();

    Boolean getHasReportedBusy();

    String getCancellationReason();

    String getCurrentRole();
}
