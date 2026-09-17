package com.makeup.platform.mapper.agency;

import com.makeup.platform.dto.response.agency.AssignedPackageRes;
import com.makeup.platform.dto.response.agency.StaffPackagesRes;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffServiceEntity;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class AgencyStaffPackageMapper {

    public AssignedPackageRes toAssignedPackageRes(AgencyStaffServiceEntity entity) {
        if (entity == null) {
            return null;
        }

        ServicePackageEntity pkg = entity.getServicePackage();
        Long packageId = null;
        String packageName = null;
        String categoryName = null;
        java.math.BigDecimal price = null;

        if (pkg != null) {
            packageId = pkg.getId();
            packageName = pkg.getPackageName();
            price = pkg.getPrice();
            if (pkg.getMasterCategory() != null) {
                categoryName = pkg.getMasterCategory().getCategoryName();
            }
        } else if (entity.getId() != null) {
            packageId = entity.getId().getPackageId();
        }

        return AssignedPackageRes.builder()
                .packageId(packageId)
                .packageName(packageName)
                .categoryName(categoryName)
                .price(price)
                .proficiencyLevel(entity.getProficiencyLevel())
                .isQualified(entity.getIsQualified())
                .build();
    }

    public StaffPackagesRes toStaffPackagesRes(AgencyStaffEntity staff, List<AgencyStaffServiceEntity> assignments) {
        if (staff == null) {
            return null;
        }

        String staffName = null;
        if (staff.getMua() != null && staff.getMua().getUser() != null) {
            staffName = staff.getMua().getUser().getFullName();
        }

        List<AssignedPackageRes> packageList = assignments != null
                ? assignments.stream().map(this::toAssignedPackageRes).collect(Collectors.toList())
                : Collections.emptyList();

        return StaffPackagesRes.builder()
                .staffId(staff.getId())
                .staffName(staffName)
                .assignedPackages(packageList)
                .build();
    }
}
