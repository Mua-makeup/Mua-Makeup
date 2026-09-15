package com.makeup.platform.service.agency;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.dto.request.agency.ConfigureShiftReq;
import com.makeup.platform.dto.response.agency.ShiftDetailRes;
import com.makeup.platform.dto.response.agency.WeeklyShiftMatrixRes;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffShiftEntity;
import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.mua.MuaProfileEntity;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.AgencyStaffShiftRepository;
import com.makeup.platform.service.agency.impl.AgencyShiftServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgencyShiftServiceImplTest {

    @Mock
    private AgencyProfileRepository agencyProfileRepository;

    @Mock
    private AgencyStaffRepository agencyStaffRepository;

    @Mock
    private AgencyStaffShiftRepository agencyStaffShiftRepository;

    @InjectMocks
    private AgencyShiftServiceImpl agencyShiftService;

    private AgencyProfileEntity mockAgency;
    private AgencyStaffEntity mockStaff;
    private AgencyStaffShiftEntity mockShift;

    @BeforeEach
    void setUp() {
        mockAgency = AgencyProfileEntity.builder()
                .agencyName("Glamour Bridal")
                .build();
        mockAgency.setId(1L);

        UserEntity mockUser = UserEntity.builder()
                .fullName("Trần Thanh Tâm")
                .build();
        mockUser.setId(25L);

        MuaProfileEntity mockMua = MuaProfileEntity.builder()
                .user(mockUser)
                .build();
        mockMua.setId(15L);

        mockStaff = AgencyStaffEntity.builder()
                .agency(mockAgency)
                .mua(mockMua)
                .isActive(true)
                .status("ACTIVE")
                .build();
        mockStaff.setId(101L);

        mockShift = AgencyStaffShiftEntity.builder()
                .id(55L)
                .agency(mockAgency)
                .staff(mockStaff)
                .dayOfWeek(2)
                .shiftName("Ca Sáng Make-up Tiệc")
                .startTime(LocalTime.of(7, 0))
                .endTime(LocalTime.of(12, 0))
                .isRecurring(true)
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("US-AGC-05: Xếp ca làm việc cố định cho thợ thành công")
    void createShift_Success() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));
        when(agencyStaffShiftRepository.findOverlappingShifts(101L, 2, LocalTime.of(7, 0), LocalTime.of(12, 0), null))
                .thenReturn(List.of());
        when(agencyStaffShiftRepository.save(any(AgencyStaffShiftEntity.class))).thenAnswer(invocation -> {
            AgencyStaffShiftEntity s = invocation.getArgument(0);
            s.setId(55L);
            return s;
        });

        ConfigureShiftReq req = ConfigureShiftReq.builder()
                .staffId(101L)
                .dayOfWeek(2)
                .shiftName("Ca Sáng Make-up Tiệc")
                .startTime(LocalTime.of(7, 0))
                .endTime(LocalTime.of(12, 0))
                .isRecurring(true)
                .build();

        ShiftDetailRes res = agencyShiftService.createShift(10L, req);

        assertNotNull(res);
        assertEquals(55L, res.getId());
        assertEquals(101L, res.getStaffId());
        assertEquals("Thứ Hai", res.getDayName());
        assertEquals("Trần Thanh Tâm", res.getStaffName());
        verify(agencyStaffShiftRepository).save(any(AgencyStaffShiftEntity.class));
    }

    @Test
    @DisplayName("US-AGC-05: Báo lỗi khi thời gian kết thúc trước thời gian bắt đầu")
    void createShift_WhenEndTimeBeforeStartTime_ShouldThrowException() {
        ConfigureShiftReq req = ConfigureShiftReq.builder()
                .staffId(101L)
                .dayOfWeek(2)
                .shiftName("Ca Sai Giờ")
                .startTime(LocalTime.of(14, 0))
                .endTime(LocalTime.of(10, 0))
                .build();

        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () ->
                agencyShiftService.createShift(10L, req)
        );

        assertEquals(ErrorCodes.ERR_INVALID_SHIFT_TIME, ex.getErrorCode());
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("US-AGC-05: Báo lỗi xung đột ca trùng giờ (ERR_SHIFT_OVERLAPPING)")
    void createShift_WhenShiftOverlapping_ShouldThrowConflictException() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffRepository.findById(101L)).thenReturn(Optional.of(mockStaff));
        when(agencyStaffShiftRepository.findOverlappingShifts(101L, 2, LocalTime.of(7, 0), LocalTime.of(12, 0), null))
                .thenReturn(List.of(mockShift));

        ConfigureShiftReq req = ConfigureShiftReq.builder()
                .staffId(101L)
                .dayOfWeek(2)
                .shiftName("Ca Trùng")
                .startTime(LocalTime.of(7, 0))
                .endTime(LocalTime.of(12, 0))
                .build();

        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () ->
                agencyShiftService.createShift(10L, req)
        );

        assertEquals(ErrorCodes.ERR_SHIFT_OVERLAPPING, ex.getErrorCode());
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    @DisplayName("US-AGC-05: Lấy ma trận ca làm việc tuần thành công (7 ngày)")
    void getWeeklyShiftMatrix_Success() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffShiftRepository.findAllActiveByAgencyIdWithStaff(1L)).thenReturn(List.of(mockShift));

        WeeklyShiftMatrixRes res = agencyShiftService.getWeeklyShiftMatrix(10L);

        assertNotNull(res);
        assertEquals(1L, res.getAgencyId());
        assertEquals(7, res.getDays().size());

        // Thứ Hai (dayOfWeek = 2) có 1 ca
        var monday = res.getDays().stream().filter(d -> d.getDayOfWeek() == 2).findFirst().orElseThrow();
        assertEquals("Thứ Hai", monday.getDayName());
        assertEquals(1, monday.getShifts().size());
        assertEquals("Ca Sáng Make-up Tiệc", monday.getShifts().get(0).getShiftName());
    }

    @Test
    @DisplayName("US-AGC-05: Xóa (hủy kích hoạt) ca làm việc thành công")
    void deleteShift_Success() {
        when(agencyProfileRepository.findByOwnerId(10L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffShiftRepository.findById(55L)).thenReturn(Optional.of(mockShift));

        agencyShiftService.deleteShift(10L, 55L);

        assertEquals(false, mockShift.getIsActive());
        verify(agencyStaffShiftRepository).save(mockShift);
    }
}
