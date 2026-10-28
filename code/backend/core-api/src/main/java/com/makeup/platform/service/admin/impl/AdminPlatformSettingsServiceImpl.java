package com.makeup.platform.service.admin.impl;

import com.makeup.platform.dto.request.admin.UpdatePlatformFeeReq;
import com.makeup.platform.dto.response.admin.PlatformFeeRes;
import com.makeup.platform.service.admin.AdminPlatformSettingsService;
import com.makeup.platform.service.wallet.PlatformFeeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminPlatformSettingsServiceImpl implements AdminPlatformSettingsService {

    private final PlatformFeeService platformFeeService;

    @Override
    public PlatformFeeRes getPlatformFee() {
        return new PlatformFeeRes(platformFeeService.getRate());
    }

    @Override
    public PlatformFeeRes updatePlatformFee(UpdatePlatformFeeReq req) {
        platformFeeService.updateRate(req.getFeeRate());
        log.info("[AdminSettings] Platform fee rate updated to {}", req.getFeeRate());
        return new PlatformFeeRes(req.getFeeRate());
    }
}

