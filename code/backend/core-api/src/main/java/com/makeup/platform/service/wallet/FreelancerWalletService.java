package com.makeup.platform.service.wallet;

import com.makeup.platform.dto.response.wallet.FreelancerWalletRes;

/**
 * Service quản lý ví thợ tự do.
 */
public interface FreelancerWalletService {

    FreelancerWalletRes getWalletInfo(Long muaUserId);
}
