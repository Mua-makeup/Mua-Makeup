package com.makeup.platform.dto.request.mua;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignMuaStylesReq {

    @NotEmpty(message = "Danh sách phong cách sở trường không được để trống")
    private Set<Integer> styleIds;
}
