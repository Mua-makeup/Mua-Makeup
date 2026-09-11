package com.makeup.platform.service.mua;

import com.makeup.platform.dto.request.mua.AssignMuaStylesReq;
import com.makeup.platform.dto.response.mua.AssignMuaStylesRes;
import com.makeup.platform.dto.response.mua.MuaStyleRes;

import java.util.List;

public interface MuaStyleService {

    AssignMuaStylesRes assignStyles(Long userId, AssignMuaStylesReq req);

    List<MuaStyleRes> getMyStyles(Long userId);

    List<MuaStyleRes> getStylesByMuaId(Long muaId);
}
