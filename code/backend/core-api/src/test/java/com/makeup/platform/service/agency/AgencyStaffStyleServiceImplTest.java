package com.makeup.platform.service.agency;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.agency.AssignStaffStylesReq;
import com.makeup.platform.dto.response.agency.AssignedStyleRes;
import com.makeup.platform.dto.response.agency.StaffStylesRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffStyleEntity;
import com.makeup.platform.entity.catalog.MakeupStyleEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.AgencyStaffStyleRepository;
import com.makeup.platform.repository.catalog.MakeupStyleRepository;
import com.makeup.platform.service.agency.impl.AgencyStaffStyleServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgencyStaffStyleServiceImplTest {

    @Mock
    private AgencyProfileRepository agencyProfileRepository;

    @Mock
    private AgencyStaffRepository agencyStaffRepository;

    @Mock
    private AgencyStaffStyleRepository agencyStaffStyleRepository;

    @Mock
    private MakeupStyleRepository makeupStyleRepository;

    @InjectMocks
    private AgencyStaffStyleServiceImpl agencyStaffStyleService;

    private AgencyProfileEntity mockAgency;
    private AgencyStaffEntity mockStaff;
    private MakeupStyleEntity mockStyle1;
    private MakeupStyleEntity mockStyle2;

    @BeforeEach
    void setUp() {
        mockAgency = AgencyProfileEntity.builder()
                .agencyName("Glamour Bridal")
                .build();
        mockAgency.setId(1L);

        mockStaff = AgencyStaffEntity.builder()
                .agency(mockAgency)
                .isActive(true)
                .status("ACTIVE")
                .build();
        mockStaff.setId(101L);

        mockStyle1 = MakeupStyleEntity.builder()
                .id(1)
                .styleCode("STYLE_DOUYIN")
                .styleName("Tone Hàn Douyin")
                .build();

        mockStyle2 = MakeupStyleEntity.builder()
                .id(2)
                .styleCode("STYLE_THAI")
                .styleName("Tone Thái Sang Trọng")
                .build();
    }

    @Test
    @DisplayName("US-AGC-04: Gán danh sách phong cách make-up cho thợ thành công")
    void assignStylesToStaff_Success() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));
        when(makeupStyleRepository.findById(1)).thenReturn(Optional.of(mockStyle1));
        when(makeupStyleRepository.findById(2)).thenReturn(Optional.of(mockStyle2));

        AssignStaffStylesReq req = AssignStaffStylesReq.builder()
                .styleIds(List.of(1, 2))
                .build();

        StaffStylesRes res = agencyStaffStyleService.assignStylesToStaff(10L, 101L, req);

        assertNotNull(res);
        assertEquals(101L, res.getStaffId());
        assertEquals(2, res.getAssignedStyles().size());
        verify(agencyStaffStyleRepository).deleteByStaffId(101L);
        verify(agencyStaffStyleRepository).saveAll(any());
    }

    @Test
    @DisplayName("US-AGC-04: Báo lỗi khi phong cách make-up không tồn tại trong danh mục sàn")
    void assignStylesToStaff_WhenStyleNotFound_ShouldThrowException() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));
        when(makeupStyleRepository.findById(99)).thenReturn(Optional.empty());

        AssignStaffStylesReq req = AssignStaffStylesReq.builder()
                .styleIds(List.of(99))
                .build();

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () ->
                agencyStaffStyleService.assignStylesToStaff(10L, 101L, req)
        );

        assertEquals(ErrorCodes.ERR_STYLE_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("US-AGC-04: Lấy danh sách phong cách của thợ thành công")
    void getStaffStyles_Success() {
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));
        AgencyStaffStyleEntity entity1 = AgencyStaffStyleEntity.builder()
                .staff(mockStaff)
                .style(mockStyle1)
                .isQualified(true)
                .build();
        when(agencyStaffStyleRepository.findByStaffIdWithStyle(101L)).thenReturn(List.of(entity1));

        List<AssignedStyleRes> res = agencyStaffStyleService.getStaffStyles(10L, 101L);

        assertNotNull(res);
        assertEquals(1, res.size());
        assertEquals("Tone Hàn Douyin", res.get(0).getStyleName());
    }
}
