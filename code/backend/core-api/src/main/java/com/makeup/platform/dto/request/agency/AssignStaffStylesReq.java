package com.makeup.platform.dto.request.agency;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignStaffStylesReq {

    @NotEmpty(message = "Danh sách phong cách make-up không được để trống")
    private List<Integer> styleIds;
}
