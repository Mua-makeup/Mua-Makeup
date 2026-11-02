package com.makeup.platform.dto.response.agency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffRemovableRes {

    private Boolean canRemove;
    private Integer activeBookingsCount;
    private List<String> activeBookingCodes;
    private String reason;
}
