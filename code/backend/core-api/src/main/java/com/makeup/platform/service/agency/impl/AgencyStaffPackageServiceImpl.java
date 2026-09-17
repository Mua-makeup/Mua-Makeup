package com.makeup.platform.service.agency.impl;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.agency.AssignStaffPackagesReq;
import com.makeup.platform.dto.request.agency.PackageAssignmentItem;
import com.makeup.platform.dto.response.agency.StaffPackagesRes;
import com.makeup.platform.entity.agency.*;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.mapper.agency.AgencyStaffPackageMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.AgencyStaffServiceRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.service.agency.AgencyStaffPackageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgencyStaffPackageServiceImpl implements AgencyStaffPackageService {

    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyStaffRepository agencyStaffRepository;
    private final AgencyStaffServiceRepository agencyStaffServiceRepository;
    private final ServicePackageRepository servicePackageRepository;
    private final AgencyStaffPackageMapper agencyStaffPackageMapper;

    @Override
    @Transactional
    public StaffPackagesRes assignPackagesToStaff(Long userId, AssignStaffPackagesReq req) {
        AgencyProfileEntity agency = getAgencyByOwnerId(userId);

        AgencyStaffEntity staff = agencyStaffRepository.findById(req.getStaffId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "ERR_STAFF_NOT_FOUND"
                ));

        if (!staff.getAgency().getId().equals(agency.getId())) {
            throw new CustomBusinessException(
                    ErrorCodes.ERR_STAFF_NOT_IN_AGENCY,
                    "agency.staff_not_in_agency",
                    HttpStatus.FORBIDDEN
            );
        }

        // Xóa mapping cũ của thợ
        agencyStaffServiceRepository.deleteByStaffId(staff.getId());
        agencyStaffServiceRepository.flush();

        List<AgencyStaffServiceEntity> newAssignments = new ArrayList<>();
        List<PackageAssignmentItem> items = req.getPackageAssignments();
        if ((items == null || items.isEmpty()) && req.getPackageIds() != null) {
            items = req.getPackageIds().stream()
                    .map(pid -> PackageAssignmentItem.builder()
                            .packageId(pid)
                            .proficiencyLevel(StaffProficiencyLevel.PRIMARY_MUA)
                            .isQualified(true)
                            .build())
                    .toList();
        }

        if (items != null && !items.isEmpty()) {
            for (PackageAssignmentItem item : items) {
            ServicePackageEntity pkg = servicePackageRepository.findById(item.getPackageId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            ErrorCodes.ERR_PACKAGE_NOT_FOUND,
                            "ERR_PACKAGE_NOT_FOUND"
                    ));

            if (pkg.getAgency() == null || !pkg.getAgency().getId().equals(agency.getId())) {
                throw new CustomBusinessException(
                        ErrorCodes.ERR_PACKAGE_NOT_OWNED_BY_AGENCY,
                        "agency.package_not_owned_by_agency",
                        HttpStatus.BAD_REQUEST
                );
            }

            AgencyStaffServiceEntity assignment = AgencyStaffServiceEntity.builder()
                    .id(new AgencyStaffServiceId(staff.getId(), pkg.getId()))
                    .staff(staff)
                    .servicePackage(pkg)
                    .proficiencyLevel(item.getProficiencyLevel())
                    .isQualified(item.getIsQualified() != null ? item.getIsQualified() : true)
                    .build();

            newAssignments.add(assignment);
        }
        }

        List<AgencyStaffServiceEntity> savedList = agencyStaffServiceRepository.saveAll(newAssignments);
        log.info("Phân công thành công {} gói dịch vụ cho thợ staffId={} thuộc studio agencyId={}",
                savedList.size(), staff.getId(), agency.getId());

        return agencyStaffPackageMapper.toStaffPackagesRes(staff, savedList);
    }

    @Override
    @Transactional(readOnly = true)
    public StaffPackagesRes getStaffPackages(Long userId, Long staffId) {
        AgencyStaffEntity staff = agencyStaffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_STAFF_NOT_FOUND,
                        "ERR_STAFF_NOT_FOUND"
                ));

        List<AgencyStaffServiceEntity> assignments = agencyStaffServiceRepository.findByStaffIdWithPackage(staffId);
        return agencyStaffPackageMapper.toStaffPackagesRes(staff, assignments);
    }

    private AgencyProfileEntity getAgencyByOwnerId(Long ownerId) {
        return agencyProfileRepository.findByOwnerId(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCodes.ERR_AGENCY_NOT_FOUND,
                        "ERR_AGENCY_NOT_FOUND"
                ));
    }
}
