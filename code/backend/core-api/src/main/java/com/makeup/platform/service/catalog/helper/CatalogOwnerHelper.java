package com.makeup.platform.service.catalog.helper;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.MuaProfileRepository;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class CatalogOwnerHelper {

    private final AgencyProfileRepository agencyProfileRepository;
    private final MuaProfileRepository muaProfileRepository;

    @Getter
    public static class OwnerContext {
        private final AgencyProfileEntity agency;
        private final MuaProfileEntity mua;

        public OwnerContext(AgencyProfileEntity agency, MuaProfileEntity mua) {
            this.agency = agency;
            this.mua = mua;
        }

        public boolean isAgency() {
            return agency != null;
        }

        public boolean isMua() {
            return mua != null;
        }
    }

    public OwnerContext resolveOwner(Long userId) {
        if (userId == null) {
            throw new CustomBusinessException(ErrorCodes.ERR_UNAUTHORIZED, "ERR_UNAUTHORIZED", HttpStatus.UNAUTHORIZED);
        }

        Optional<AgencyProfileEntity> agencyOpt = agencyProfileRepository.findByOwnerId(userId);
        if (agencyOpt.isPresent()) {
            return new OwnerContext(agencyOpt.get(), null);
        }

        Optional<MuaProfileEntity> muaOpt = muaProfileRepository.findByUserId(userId);
        if (muaOpt.isPresent()) {
            return new OwnerContext(null, muaOpt.get());
        }

        throw new CustomBusinessException(
                ErrorCodes.ERR_PROFILE_NOT_FOUND,
                "ERR_PROFILE_NOT_FOUND",
                HttpStatus.FORBIDDEN
        );
    }
}
