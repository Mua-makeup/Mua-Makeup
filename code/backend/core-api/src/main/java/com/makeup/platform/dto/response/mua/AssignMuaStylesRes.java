package com.makeup.platform.dto.response.mua;

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
public class AssignMuaStylesRes {

    private Long muaId;
    private Integer totalStyles;
    private List<MuaStyleRes> styles;
}
