package com.makeup.platform.dto.response.agency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffLeaderboardRes {

    private String period;
    private Integer totalStaff;
    private Double agencyAverageRating;
    private List<StaffLeaderboardItemRes> items;
}
