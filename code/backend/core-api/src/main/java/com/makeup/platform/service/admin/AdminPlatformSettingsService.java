package com.makeup.platform.service.admin;

import com.makeup.platform.dto.request.admin.UpdatePlatformFeeReq;
import com.makeup.platform.dto.response.admin.PlatformFeeRes;

public interface AdminPlatformSettingsService {

    PlatformFeeRes getPlatformFee();

    PlatformFeeRes updatePlatformFee(UpdatePlatformFeeReq req);
}

