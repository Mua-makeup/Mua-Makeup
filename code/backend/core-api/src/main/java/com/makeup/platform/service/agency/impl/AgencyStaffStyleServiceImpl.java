package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.agency.AssignStaffStylesReq;
import com.makeup.platform.dto.response.agency.AssignedStyleRes;
import com.makeup.platform.dto.response.agency.StaffStylesRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffStyleEntity;
import com.makeup.platform.entity.agency.AgencyStaffStyleId;
import com.makeup.platform.entity.catalog.MakeupStyleEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.AgencyStaffStyleRepository;
import com.makeup.platform.repository.catalog.MakeupStyleRepository;
import com.makeup.platform.service.agency.AgencyStaffStyleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyStaffStyleServiceImpl implements AgencyStaffStyleService {

    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyStaffRepository agencyStaffRepository;
    private final AgencyStaffStyleRepository agencyStaffStyleRepository;
    private final MakeupStyleRepository makeupStyleRepository;

    @Override
    @Transactional
    public StaffStylesRes assignStylesToStaff(Long userId, Long staffId, AssignStaffStylesReq req) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);

        AgencyStaffEntity staff = agencyStaffRepository.findById(staffId)
                .filter(s -> s.getAgency().getId().equals(agency.getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "ERR_STAFF_NOT_FOUND"
                ));

        List<Integer> styleIds = req.getStyleIds();
        List<MakeupStyleEntity> validStyles = new ArrayList<>();

        if (styleIds != null && !styleIds.isEmpty()) {
            for (Integer styleId : styleIds) {
                MakeupStyleEntity style = makeupStyleRepository.findById(styleId)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                ErrorCodes.ERR_STYLE_NOT_FOUND,
                                "catalog.style_not_found",
                                styleId
                        ));
                validStyles.add(style);
            }
        }

        // Xóa mapping cũ và cập nhật danh sách phong cách mới
        agencyStaffStyleRepository.deleteByStaffId(staffId);
        agencyStaffStyleRepository.flush();

        List<AgencyStaffStyleEntity> entities = validStyles.stream()
                .map(style -> AgencyStaffStyleEntity.builder()
                        .id(new AgencyStaffStyleId(staffId, style.getId()))
                        .staff(staff)
                        .style(style)
                        .isQualified(true)
                        .build())
                .collect(Collectors.toList());

        if (!entities.isEmpty()) {
            agencyStaffStyleRepository.saveAll(entities);
        }

        log.info("Successfully assigned {} styles to staffId={} in agencyId={}",
                validStyles.size(), staffId, agency.getId());

        List<AssignedStyleRes> assignedStyleResList = validStyles.stream()
                .map(s -> AssignedStyleRes.builder()
                        .id(s.getId())
                        .styleCode(s.getStyleCode())
                        .styleName(s.getStyleName())
                        .isQualified(true)
                        .build())
                .collect(Collectors.toList());

        return StaffStylesRes.builder()
                .staffId(staffId)
                .assignedStyles(assignedStyleResList)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignedStyleRes> getStaffStyles(Long userId, Long staffId) {
        agencyStaffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "ERR_STAFF_NOT_FOUND"
                ));

        List<AgencyStaffStyleEntity> list = agencyStaffStyleRepository.findByStaffIdWithStyle(staffId);
        return list.stream()
                .map(e -> AssignedStyleRes.builder()
                        .id(e.getStyle().getId())
                        .styleCode(e.getStyle().getStyleCode())
                        .styleName(e.getStyle().getStyleName())
                        .isQualified(e.getIsQualified())
                        .build())
                .collect(Collectors.toList());
    }

    private AgencyProfileEntity getAgencyByOwnerId(Long userId) {
        return agencyProfileRepository.findByOwnerId(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "ERR_AGENCY_NOT_FOUND"
                ));
    }
}
