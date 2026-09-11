package com.makeup.platform.mapper.mua;

import com.makeup.platform.dto.response.mua.AssignMuaStylesRes;
import com.makeup.platform.dto.response.mua.MuaStyleRes;
import com.makeup.platform.entity.catalog.MakeupStyleEntity;
import com.makeup.platform.entity.mua.MuaStyleEntity;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

@Component
public class MuaStyleMapper {

    public MuaStyleRes toRes(MakeupStyleEntity style) {
        if (style == null) {
            return null;
        }
        return MuaStyleRes.builder()
                .id(style.getId())
                .code(style.getStyleCode())
                .name(style.getStyleName())
                .description(style.getDescription())
                .build();
    }

    public MuaStyleRes toRes(MuaStyleEntity muaStyle) {
        if (muaStyle == null || muaStyle.getStyle() == null) {
            return null;
        }
        return toRes(muaStyle.getStyle());
    }

    public List<MuaStyleRes> toResList(Collection<MuaStyleEntity> muaStyles) {
        if (muaStyles == null || muaStyles.isEmpty()) {
            return Collections.emptyList();
        }
        return muaStyles.stream()
                .map(this::toRes)
                .toList();
    }

    public AssignMuaStylesRes toAssignRes(Long muaId, List<MuaStyleRes> styles) {
        return AssignMuaStylesRes.builder()
                .muaId(muaId)
                .totalStyles(styles != null ? styles.size() : 0)
                .styles(styles != null ? styles : Collections.emptyList())
                .build();
    }
}
