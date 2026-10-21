package com.makeup.platform.service.agency;

import com.makeup.platform.dto.response.wallet.AgencyWalletRes;

public interface AgencyWalletService {

    AgencyWalletRes getAgencyWalletInfo(Long agencyOwnerUserId);
}
