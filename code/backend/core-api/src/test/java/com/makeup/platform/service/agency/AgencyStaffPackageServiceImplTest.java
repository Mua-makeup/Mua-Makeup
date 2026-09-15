package com.makeup.platform.service.agency;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.agency.AssignStaffPackagesReq;
import com.makeup.platform.dto.request.agency.PackageAssignmentItem;
import com.makeup.platform.dto.response.agency.StaffPackagesRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffServiceEntity;
import com.makeup.platform.entity.agency.StaffProficiencyLevel;
import com.makeup.platform.entity.catalog.MasterCategoryEntity;
import com.makeup.platform.entity.catalog.ServicePackageEntity;
import com.makeup.platform.mapper.agency.AgencyStaffPackageMapper;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.AgencyStaffServiceRepository;
import com.makeup.platform.repository.catalog.ServicePackageRepository;
import com.makeup.platform.service.agency.impl.AgencyStaffPackageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgencyStaffPackageServiceImplTest {

    @Mock
    private AgencyProfileRepository agencyProfileRepository;

    @Mock
    private AgencyStaffRepository agencyStaffRepository;

    @Mock
    private AgencyStaffServiceRepository agencyStaffServiceRepository;

    @Mock
    private ServicePackageRepository servicePackageRepository;

    @Spy
    private AgencyStaffPackageMapper agencyStaffPackageMapper = new AgencyStaffPackageMapper();

    @InjectMocks
    private AgencyStaffPackageServiceImpl agencyStaffPackageService;

    private AgencyProfileEntity mockAgency;
    private AgencyStaffEntity mockStaff;
    private ServicePackageEntity mockPkg1;
    private ServicePackageEntity mockPkg2;

    @BeforeEach
    void setUp() {
        mockAgency = AgencyProfileEntity.builder()
                .agencyName("Bella Bridal")
                .build();
        mockAgency.setId(1L);

        mockStaff = AgencyStaffEntity.builder()
                .agency(mockAgency)
                .isActive(true)
                .status("ACTIVE")
                .build();
        mockStaff.setId(101L);

        MasterCategoryEntity cat = MasterCategoryEntity.builder()
                .categoryName("Make-up Cô Dâu")
                .build();
        cat.setId(1);

        mockPkg1 = ServicePackageEntity.builder()
                .agency(mockAgency)
                .packageName("Gói Make-up Cô Dâu VIP")
                .price(BigDecimal.valueOf(2500000))
                .masterCategory(cat)
                .build();
        mockPkg1.setId(10L);

        mockPkg2 = ServicePackageEntity.builder()
                .agency(mockAgency)
                .packageName("Gói Make-up Tiệc Luxury")
                .price(BigDecimal.valueOf(1200000))
                .masterCategory(cat)
                .build();
        mockPkg2.setId(11L);
    }

    @Test
    @DisplayName("Gán gói dịch vụ cho thợ thành công (Happy Path)")
    void assignPackagesToStaff_Success() {
        AssignStaffPackagesReq req = AssignStaffPackagesReq.builder()
                .staffId(101L)
                .packageAssignments(List.of(
                        PackageAssignmentItem.builder().packageId(10L).proficiencyLevel(StaffProficiencyLevel.PRIMARY_MUA).isQualified(true).build(),
                        PackageAssignmentItem.builder().packageId(11L).proficiencyLevel(StaffProficiencyLevel.ASSISTANT_MUA).isQualified(true).build()
                ))
                .build();

        when(agencyProfileRepository.findByOwnerId(1L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));
        when(servicePackageRepository.findById(10L)).thenReturn(Optional.of(mockPkg1));
        when(servicePackageRepository.findById(11L)).thenReturn(Optional.of(mockPkg2));
        when(agencyStaffServiceRepository.saveAll(anyList())).thenAnswer(i -> i.getArgument(0));

        StaffPackagesRes res = agencyStaffPackageService.assignPackagesToStaff(1L, req);

        assertNotNull(res);
        assertEquals(101L, res.getStaffId());
        assertEquals(2, res.getAssignedPackages().size());
        verify(agencyStaffServiceRepository).deleteByStaffId(101L);
    }

    @Test
    @DisplayName("Chặn khi thợ không thuộc Studio (IDOR Protection)")
    void assignPackagesToStaff_StaffNotInAgency() {
        AgencyProfileEntity otherAgency = AgencyProfileEntity.builder().agencyName("Other Agency").build();
        otherAgency.setId(99L);
        mockStaff.setAgency(otherAgency);

        AssignStaffPackagesReq req = AssignStaffPackagesReq.builder()
                .staffId(101L)
                .packageAssignments(List.of(
                        PackageAssignmentItem.builder().packageId(10L).proficiencyLevel(StaffProficiencyLevel.PRIMARY_MUA).isQualified(true).build()
                ))
                .build();

        when(agencyProfileRepository.findByOwnerId(1L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));

        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () ->
                agencyStaffPackageService.assignPackagesToStaff(1L, req)
        );
        assertEquals(ErrorCodes.ERR_STAFF_NOT_IN_AGENCY, ex.getErrorCode());
    }

    @Test
    @DisplayName("Chặn khi gói dịch vụ không thuộc Studio")
    void assignPackagesToStaff_PackageNotOwnedByAgency() {
        AgencyProfileEntity otherAgency = AgencyProfileEntity.builder().agencyName("Other Agency").build();
        otherAgency.setId(99L);
        mockPkg1.setAgency(otherAgency);

        AssignStaffPackagesReq req = AssignStaffPackagesReq.builder()
                .staffId(101L)
                .packageAssignments(List.of(
                        PackageAssignmentItem.builder().packageId(10L).proficiencyLevel(StaffProficiencyLevel.PRIMARY_MUA).isQualified(true).build()
                ))
                .build();

        when(agencyProfileRepository.findByOwnerId(1L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));
        when(servicePackageRepository.findById(10L)).thenReturn(Optional.of(mockPkg1));

        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () ->
                agencyStaffPackageService.assignPackagesToStaff(1L, req)
        );
        assertEquals(ErrorCodes.ERR_PACKAGE_NOT_OWNED_BY_AGENCY, ex.getErrorCode());
    }

    @Test
    @DisplayName("Lấy danh sách gói của thợ thành công")
    void getStaffPackages_Success() {
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));
        AgencyStaffServiceEntity entity = AgencyStaffServiceEntity.builder()
                .staff(mockStaff)
                .servicePackage(mockPkg1)
                .proficiencyLevel(StaffProficiencyLevel.PRIMARY_MUA)
                .isQualified(true)
                .build();
        when(agencyStaffServiceRepository.findByStaffIdWithPackage(101L)).thenReturn(List.of(entity));

        StaffPackagesRes res = agencyStaffPackageService.getStaffPackages(1L, 101L);

        assertNotNull(res);
        assertEquals(101L, res.getStaffId());
        assertEquals(1, res.getAssignedPackages().size());
        assertEquals(10L, res.getAssignedPackages().get(0).getPackageId());
    }
}
