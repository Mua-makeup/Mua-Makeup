package com.makeup.platform.repository.custom.projection;

public interface StaffMatrixProjection {

    Long getStaffId();

    Long getMuaId();

    String getStaffName();

    String getStaffPhone();

    String getStaffAvatarUrl();

    Boolean getHasShift();

    Boolean getHasPackage();

    Boolean getHasStyle();

    Boolean getHasCalendarFree();

    String getCurrentRole();
}
