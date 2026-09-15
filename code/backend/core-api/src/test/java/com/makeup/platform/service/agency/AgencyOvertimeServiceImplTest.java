package com.makeup.platform.service.agency;

import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.exception.ResourceNotFoundException;
import com.makeup.platform.dto.request.agency.ConfigureOvertimeRuleReq;
import com.makeup.platform.dto.request.agency.ReviewOvertimeReportReq;
import com.makeup.platform.dto.request.agency.SubmitOvertimeReportReq;
import com.makeup.platform.dto.response.agency.OvertimeReportRes;
import com.makeup.platform.dto.response.agency.OvertimeRuleRes;
import com.makeup.platform.entity.agency.AgencyOvertimeRuleEntity;
import com.makeup.platform.entity.agency.AgencyProfileEntity;
import com.makeup.platform.entity.agency.AgencyStaffEntity;
import com.makeup.platform.entity.agency.AgencyStaffOvertimeReportEntity;
import com.makeup.platform.entity.agency.OvertimePenaltyType;
import com.makeup.platform.entity.agency.OvertimeReasonType;
import com.makeup.platform.entity.agency.OvertimeReportStatus;
import com.makeup.platform.entity.agency.OvertimeReviewAction;
import com.makeup.platform.mapper.agency.AgencyOvertimeMapper;
import com.makeup.platform.repository.AgencyOvertimeRuleRepository;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffOvertimeReportRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.service.agency.impl.AgencyOvertimeServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgencyOvertimeServiceImplTest {

    @Mock
    private AgencyProfileRepository agencyProfileRepository;

    @Mock
    private AgencyStaffRepository agencyStaffRepository;

    @Mock
    private AgencyOvertimeRuleRepository agencyOvertimeRuleRepository;

    @Mock
    private AgencyStaffOvertimeReportRepository agencyStaffOvertimeReportRepository;

    @Spy
    private AgencyOvertimeMapper agencyOvertimeMapper = new AgencyOvertimeMapper();

    @InjectMocks
    private AgencyOvertimeServiceImpl agencyOvertimeService;

    private AgencyProfileEntity mockAgency;
    private AgencyStaffEntity mockStaff;
    private AgencyOvertimeRuleEntity mockRule;

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

        mockRule = AgencyOvertimeRuleEntity.builder()
                .agency(mockAgency)
                .ruleName("Quá giờ đi trễ (30-60 phút)")
                .minOvertimeMinutes(30)
                .maxOvertimeMinutes(60)
                .penaltyType(OvertimePenaltyType.FIXED_AMOUNT)
                .penaltyValue(BigDecimal.valueOf(100000))
                .isActive(true)
                .build();
        mockRule.setId(10L);
    }

    @Test
    @DisplayName("Cấu hình quy chế quá giờ mới thành công")
    void createRule_Success() {
        ConfigureOvertimeRuleReq req = ConfigureOvertimeRuleReq.builder()
                .ruleName("Quá giờ 30-60 phút")
                .minOvertimeMinutes(30)
                .maxOvertimeMinutes(60)
                .penaltyType(OvertimePenaltyType.FIXED_AMOUNT)
                .penaltyValue(BigDecimal.valueOf(100000))
                .isActive(true)
                .build();

        when(agencyProfileRepository.findByOwnerId(1L)).thenReturn(Optional.of(mockAgency));
        when(agencyOvertimeRuleRepository.save(any())).thenReturn(mockRule);

        OvertimeRuleRes res = agencyOvertimeService.createOrUpdateRule(1L, req);

        assertNotNull(res);
        assertEquals(mockRule.getId(), res.getId());
        assertEquals(mockRule.getRuleName(), res.getRuleName());
    }

    @Test
    @DisplayName("Thợ nộp báo cáo giải trình quá giờ theo quy chế thành công")
    void submitOvertimeReport_Success() {
        SubmitOvertimeReportReq req = SubmitOvertimeReportReq.builder()
                .bookingId(10025L)
                .overtimeMinutes(35)
                .reasonType(OvertimeReasonType.PRESET_RULE)
                .ruleId(10L)
                .explanationText("Đường ngập do mưa to nên đến trễ")
                .build();

        when(agencyStaffRepository.findActiveStaffByUserId(25L)).thenReturn(Optional.of(mockStaff));
        when(agencyOvertimeRuleRepository.findByIdAndAgencyId(10L, 1L)).thenReturn(Optional.of(mockRule));

        AgencyStaffOvertimeReportEntity saved = AgencyStaffOvertimeReportEntity.builder()
                .bookingId(10025L)
                .staff(mockStaff)
                .agency(mockAgency)
                .overtimeMinutes(35)
                .reasonType(OvertimeReasonType.PRESET_RULE)
                .rule(mockRule)
                .explanationText(req.getExplanationText())
                .status(OvertimeReportStatus.PENDING_AGENCY_REVIEW)
                .build();
        saved.setId(501L);

        when(agencyStaffOvertimeReportRepository.save(any())).thenReturn(saved);

        OvertimeReportRes res = agencyOvertimeService.submitOvertimeReport(25L, req);

        assertNotNull(res);
        assertEquals(501L, res.getId());
        assertEquals(OvertimeReportStatus.PENDING_AGENCY_REVIEW, res.getStatus());
    }

    @Test
    @DisplayName("Admin phán quyết DEDUCT_BY_RULE thành công")
    void reviewReport_DeductByRule_Success() {
        AgencyStaffOvertimeReportEntity report = AgencyStaffOvertimeReportEntity.builder()
                .bookingId(10025L)
                .staff(mockStaff)
                .agency(mockAgency)
                .overtimeMinutes(35)
                .rule(mockRule)
                .status(OvertimeReportStatus.PENDING_AGENCY_REVIEW)
                .build();
        report.setId(501L);

        when(agencyProfileRepository.findByOwnerId(1L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdWithDetails(501L, 1L)).thenReturn(Optional.of(report));
        when(agencyStaffOvertimeReportRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ReviewOvertimeReportReq req = ReviewOvertimeReportReq.builder()
                .action(OvertimeReviewAction.DEDUCT_BY_RULE)
                .adminNotes("Xác nhận thao tác chậm, trừ tiền phạt theo quy chế")
                .build();

        OvertimeReportRes res = agencyOvertimeService.reviewOvertimeReport(1L, 501L, req);

        assertNotNull(res);
        assertEquals(OvertimeReportStatus.PENALIZED, res.getStatus());
        assertEquals(BigDecimal.valueOf(100000), res.getPenaltyAmountApplied());
    }

    @Test
    @DisplayName("Admin phán quyết WAIVE_PENALTY (Miễn phạt) thành công")
    void reviewReport_WaivePenalty_Success() {
        AgencyStaffOvertimeReportEntity report = AgencyStaffOvertimeReportEntity.builder()
                .bookingId(10025L)
                .staff(mockStaff)
                .agency(mockAgency)
                .overtimeMinutes(35)
                .status(OvertimeReportStatus.PENDING_AGENCY_REVIEW)
                .build();
        report.setId(501L);

        when(agencyProfileRepository.findByOwnerId(1L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdWithDetails(501L, 1L)).thenReturn(Optional.of(report));
        when(agencyStaffOvertimeReportRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ReviewOvertimeReportReq req = ReviewOvertimeReportReq.builder()
                .action(OvertimeReviewAction.WAIVE_PENALTY)
                .adminNotes("Lý do khách quan hợp lý, miễn phạt")
                .build();

        OvertimeReportRes res = agencyOvertimeService.reviewOvertimeReport(1L, 501L, req);

        assertNotNull(res);
        assertEquals(OvertimeReportStatus.APPROVED_WAIVED, res.getStatus());
        assertEquals(BigDecimal.ZERO, res.getPenaltyAmountApplied());
    }

    @Test
    @DisplayName("Admin phán quyết CHARGE_CUSTOMER (Phụ thu khách) thành công")
    void reviewReport_ChargeCustomer_Success() {
        AgencyStaffOvertimeReportEntity report = AgencyStaffOvertimeReportEntity.builder()
                .bookingId(10025L)
                .staff(mockStaff)
                .agency(mockAgency)
                .overtimeMinutes(45)
                .status(OvertimeReportStatus.PENDING_AGENCY_REVIEW)
                .build();
        report.setId(501L);

        when(agencyProfileRepository.findByOwnerId(1L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdWithDetails(501L, 1L)).thenReturn(Optional.of(report));
        when(agencyStaffOvertimeReportRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ReviewOvertimeReportReq req = ReviewOvertimeReportReq.builder()
                .action(OvertimeReviewAction.CHARGE_CUSTOMER)
                .customerSurchargeAmount(BigDecimal.valueOf(150000))
                .chargeReason("Khách bận tiếp họ hàng làm ca kéo dài 45 phút")
                .build();

        OvertimeReportRes res = agencyOvertimeService.reviewOvertimeReport(1L, 501L, req);

        assertNotNull(res);
        assertEquals(OvertimeReportStatus.CHARGED_CUSTOMER, res.getStatus());
        assertEquals(BigDecimal.valueOf(150000), res.getCustomerSurchargeAmount());
    }

    @Test
    @DisplayName("Chặn khi phán quyết báo cáo đã được xử lý trước đó")
    void reviewReport_AlreadyReviewed_ThrowsException() {
        AgencyStaffOvertimeReportEntity report = AgencyStaffOvertimeReportEntity.builder()
                .bookingId(10025L)
                .staff(mockStaff)
                .agency(mockAgency)
                .overtimeMinutes(45)
                .status(OvertimeReportStatus.PENALIZED) // Đã được xử lý
                .build();
        report.setId(501L);

        when(agencyProfileRepository.findByOwnerId(1L)).thenReturn(Optional.of(mockAgency));
        when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdWithDetails(501L, 1L)).thenReturn(Optional.of(report));

        ReviewOvertimeReportReq req = ReviewOvertimeReportReq.builder()
                .action(OvertimeReviewAction.WAIVE_PENALTY)
                .build();

        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () ->
                agencyOvertimeService.reviewOvertimeReport(1L, 501L, req)
        );
        assertEquals(ErrorCodes.ERR_OVERTIME_ALREADY_REVIEWED, ex.getErrorCode());
    }
}
