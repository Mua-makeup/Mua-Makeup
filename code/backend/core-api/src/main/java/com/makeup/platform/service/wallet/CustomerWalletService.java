package com.makeup.platform.service.wallet;

import com.makeup.platform.dto.response.wallet.CustomerWalletRes;

public interface CustomerWalletService {

    CustomerWalletRes getWalletInfo(Long customerUserId);
}
