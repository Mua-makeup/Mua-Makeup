package com.makeup.platform.service.mua.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.mua.AssignMuaStylesReq;
import com.makeup.platform.dto.response.mua.AssignMuaStylesRes;
import com.makeup.platform.dto.response.mua.MuaStyleRes;
import com.makeup.platform.entity.catalog.MakeupStyleEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.entity.mua.MuaStyleEntity;
import com.makeup.platform.entity.mua.MuaStyleId;
import com.makeup.platform.repository.MuaProfileRepository;
import com.makeup.platform.repository.catalog.MakeupStyleRepository;
import com.makeup.platform.repository.mua.MuaStyleRepository;
import com.makeup.platform.service.mua.MuaStyleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MuaStyleServiceImpl implements MuaStyleService {

    private final MuaProfileRepository muaProfileRepository;
    private final MakeupStyleRepository makeupStyleRepository;
    private final MuaStyleRepository muaStyleRepository;

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = "mua_portfolios", allEntries = true)
    public AssignMuaStylesRes assignStyles(Long userId, AssignMuaStylesReq req) {
        MuaProfileEntity mua = muaProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "Không tìm thấy hồ sơ thợ tương ứng với tài khoản này."
                ));

        muaStyleRepository.deleteAllByMuaId(mua.getId());

        List<MuaStyleEntity> newStyles = new ArrayList<>();
        List<MuaStyleRes> styleResList = new ArrayList<>();

        for (Integer styleId : req.getStyleIds()) {
            MakeupStyleEntity style = makeupStyleRepository.findById(styleId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCodes.ERR_STYLE_NOT_FOUND,
                            "Phong cách ID " + styleId + " không tồn tại trong danh mục hệ thống."
                    ));

            MuaStyleEntity muaStyle = MuaStyleEntity.builder()
                    .id(new MuaStyleId(mua.getId(), style.getId()))
                    .muaProfile(mua)
                    .style(style)
                    .isQualified(true)
                    .build();

            newStyles.add(muaStyle);
            styleResList.add(MuaStyleRes.builder()
                    .id(style.getId())
                    .code(style.getStyleCode())
                    .name(style.getStyleName())
                    .description(style.getDescription())
                    .build());
        }

        muaStyleRepository.saveAll(newStyles);

        return AssignMuaStylesRes.builder()
                .muaId(mua.getId())
                .totalStyles(styleResList.size())
                .styles(styleResList)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MuaStyleRes> getMyStyles(Long userId) {
        MuaProfileEntity mua = muaProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_MUA_PROFILE_NOT_FOUND,
                        "Không tìm thấy hồ sơ thợ."
                ));
        return getStylesByMuaId(mua.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MuaStyleRes> getStylesByMuaId(Long muaId) {
        List<MuaStyleEntity> styles = muaStyleRepository.findAllByMuaProfileId(muaId);
        return styles.stream()
                .map(s -> MuaStyleRes.builder()
                        .id(s.getStyle().getId())
                        .code(s.getStyle().getStyleCode())
                        .name(s.getStyle().getStyleName())
                        .description(s.getStyle().getDescription())
                        .build())
                .toList();
    }
}
