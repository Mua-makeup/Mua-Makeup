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
import com.makeup.platform.entity.agency.OvertimePolicyType;
import com.makeup.platform.entity.agency.OvertimeReasonType;
import com.makeup.platform.entity.agency.OvertimeReportStatus;
import com.makeup.platform.entity.agency.OvertimeReviewAction;
import com.makeup.platform.entity.booking.AssignmentRole;
import com.makeup.platform.entity.booking.AssignmentStatus;
import com.makeup.platform.entity.booking.BookingEntity;
import com.makeup.platform.entity.booking.BookingStaffAssignmentEntity;
import com.makeup.platform.mapper.agency.AgencyOvertimeMapper;
import com.makeup.platform.repository.AgencyOvertimeRuleRepository;
import com.makeup.platform.repository.AgencyProfileRepository;
import com.makeup.platform.repository.AgencyStaffOvertimeReportRepository;
import com.makeup.platform.repository.AgencyStaffRepository;
import com.makeup.platform.repository.booking.BookingRepository;
import com.makeup.platform.repository.booking.BookingStaffAssignmentRepository;
import com.makeup.platform.service.agency.impl.AgencyOvertimeServiceImpl;
import com.makeup.platform.service.wallet.impl.OvertimeAllowancePaymentService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
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

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private BookingStaffAssignmentRepository bookingStaffAssignmentRepository;

    @Mock
    private OvertimeAllowancePaymentService overtimePaymentService;

    @InjectMocks
    private AgencyOvertimeServiceImpl agencyOvertimeService;

    private AgencyProfileEntity mockAgency;
    private AgencyStaffEntity mockStaff;
    private AgencyOvertimeRuleEntity mockRule;

    @BeforeEach
    void setUp() {
        mockAgency = AgencyProfileEntity.builder()
                .agencyName("Bella Bridal")
                .isVerified(true)
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

        BookingEntity mockBooking = BookingEntity.builder().build();
        mockBooking.setId(10025L);
        when(bookingRepository.findById(10025L)).thenReturn(Optional.of(mockBooking));
        when(agencyStaffRepository.findActiveStaffByUserId(25L)).thenReturn(Optional.of(mockStaff));
        when(agencyOvertimeRuleRepository.findByIdAndAgencyId(10L, 1L)).thenReturn(Optional.of(mockRule));

        BookingStaffAssignmentEntity primaryAssignment = BookingStaffAssignmentEntity.builder()
                .booking(mockBooking)
                .staff(mockStaff)
                .assignmentRole(AssignmentRole.PRIMARY_MUA)
                .status(AssignmentStatus.ACTIVE)
                .build();
        when(bookingStaffAssignmentRepository.findByBookingIdAndStatus(10025L, AssignmentStatus.ACTIVE))
                .thenReturn(List.of(primaryAssignment));

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
    @DisplayName("Thợ chính nộp giải trình sẽ tự động đính kèm báo cáo tăng ca cho thợ phụ")
    void submitOvertimeReport_WithAssistantStaff_AttachesAssistantReport() {
        SubmitOvertimeReportReq req = SubmitOvertimeReportReq.builder()
                .bookingId(10025L)
                .overtimeMinutes(30)
                .reasonType(OvertimeReasonType.PRESET_RULE)
                .ruleId(10L)
                .explanationText("Khách đến trễ kéo dài ca")
                .build();

        BookingEntity mockBooking = BookingEntity.builder().build();
        mockBooking.setId(10025L);
        when(bookingRepository.findById(10025L)).thenReturn(Optional.of(mockBooking));
        when(agencyStaffRepository.findActiveStaffByUserId(25L)).thenReturn(Optional.of(mockStaff));
        when(agencyOvertimeRuleRepository.findByIdAndAgencyId(10L, 1L)).thenReturn(Optional.of(mockRule));

        AgencyStaffEntity assistantStaff = AgencyStaffEntity.builder().agency(mockAgency).build();
        assistantStaff.setId(99L);

        BookingStaffAssignmentEntity primaryAssignment = BookingStaffAssignmentEntity.builder()
                .booking(mockBooking)
                .staff(mockStaff)
                .assignmentRole(AssignmentRole.PRIMARY_MUA)
                .status(AssignmentStatus.ACTIVE)
                .build();
        BookingStaffAssignmentEntity assistantAssignment = BookingStaffAssignmentEntity.builder()
                .booking(mockBooking)
                .staff(assistantStaff)
                .assignmentRole(AssignmentRole.ASSISTANT_MUA)
                .status(AssignmentStatus.ACTIVE)
                .build();

        when(bookingStaffAssignmentRepository.findByBookingIdAndStatus(10025L, AssignmentStatus.ACTIVE))
                .thenReturn(List.of(primaryAssignment, assistantAssignment));

        AgencyStaffOvertimeReportEntity primarySaved = AgencyStaffOvertimeReportEntity.builder()
                .bookingId(10025L)
                .staff(mockStaff)
                .agency(mockAgency)
                .overtimeMinutes(30)
                .status(OvertimeReportStatus.PENDING_AGENCY_REVIEW)
                .build();
        primarySaved.setId(601L);

        when(agencyStaffOvertimeReportRepository.save(any())).thenReturn(primarySaved);

        OvertimeReportRes res = agencyOvertimeService.submitOvertimeReport(25L, req);

        assertNotNull(res);
        // Verify save was called for BOTH primary staff and assistant staff (2 times)
        verify(agencyStaffOvertimeReportRepository, times(2)).save(any());
    }

    @Test
    @DisplayName("Thợ phụ tự nộp giải trình sẽ bị từ chối")
    void submitOvertimeReport_AssistantStaff_ThrowsForbidden() {
        SubmitOvertimeReportReq req = SubmitOvertimeReportReq.builder()
                .bookingId(10025L)
                .overtimeMinutes(30)
                .reasonType(OvertimeReasonType.OTHER_CUSTOM_REASON)
                .explanationText("Khách trễ")
                .build();

        BookingEntity mockBooking = BookingEntity.builder().build();
        mockBooking.setId(10025L);
        when(bookingRepository.findById(10025L)).thenReturn(Optional.of(mockBooking));
        when(agencyStaffRepository.findActiveStaffByUserId(25L)).thenReturn(Optional.of(mockStaff));

        BookingStaffAssignmentEntity assistantAssignment = BookingStaffAssignmentEntity.builder()
                .booking(mockBooking)
                .staff(mockStaff)
                .assignmentRole(AssignmentRole.ASSISTANT_MUA)
                .status(AssignmentStatus.ACTIVE)
                .build();

        when(bookingStaffAssignmentRepository.findByBookingIdAndStatus(10025L, AssignmentStatus.ACTIVE))
                .thenReturn(List.of(assistantAssignment));

        assertThrows(CustomBusinessException.class, () -> agencyOvertimeService.submitOvertimeReport(25L, req));
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
        lenient().when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdWithDetails(501L, 1L)).thenReturn(Optional.of(report));
        lenient().when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdForReview(501L, 1L)).thenReturn(Optional.of(report));
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
        lenient().when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdWithDetails(501L, 1L)).thenReturn(Optional.of(report));
        lenient().when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdForReview(501L, 1L)).thenReturn(Optional.of(report));
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
        lenient().when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdWithDetails(501L, 1L)).thenReturn(Optional.of(report));
        lenient().when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdForReview(501L, 1L)).thenReturn(Optional.of(report));
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
        lenient().when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdWithDetails(501L, 1L)).thenReturn(Optional.of(report));
        lenient().when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdForReview(501L, 1L)).thenReturn(Optional.of(report));

        ReviewOvertimeReportReq req = ReviewOvertimeReportReq.builder()
                .action(OvertimeReviewAction.WAIVE_PENALTY)
                .build();

        CustomBusinessException ex = assertThrows(CustomBusinessException.class, () ->
                agencyOvertimeService.reviewOvertimeReport(1L, 501L, req)
        );
        assertEquals(ErrorCodes.ERR_OVERTIME_ALREADY_REVIEWED, ex.getErrorCode());
    }
    @ParameterizedTest
    @CsvSource({"14,0", "15,75000", "30,150000", "60,300000", "61,0"})
    void freeTextReportUsesMatchingAllowanceForPreviewAndApproval(int minutes, long expected) {
        mockRule.setMinOvertimeMinutes(15);
        mockRule.setPenaltyType(OvertimePenaltyType.PER_MINUTE);
        mockRule.setPenaltyValue(BigDecimal.valueOf(5000));
        var report = AgencyStaffOvertimeReportEntity.builder()
                .bookingId(48L).staff(mockStaff).agency(mockAgency).overtimeMinutes(minutes)
                .explanationText("Customer arrived late")
                .status(OvertimeReportStatus.PENDING_AGENCY_REVIEW)
                .penaltyAmountApplied(BigDecimal.ZERO).build();
        report.setId(501L);
        when(agencyProfileRepository.findByOwnerId(1L)).thenReturn(Optional.of(mockAgency));
        lenient().when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdWithDetails(501L, 1L)).thenReturn(Optional.of(report));
        lenient().when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdForReview(501L, 1L)).thenReturn(Optional.of(report));
        when(agencyOvertimeRuleRepository.findByAgencyIdAndIsActiveTrue(1L)).thenReturn(List.of(mockRule));
        when(agencyStaffOvertimeReportRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        var preview = agencyOvertimeService.getOvertimeReportDetail(1L, 501L);
        assertEquals(BigDecimal.valueOf(expected), preview.getEstimatedAllowanceAmount());
        assertEquals(BigDecimal.ZERO, report.getPenaltyAmountApplied());
        assertNull(report.getRule());
        var result = agencyOvertimeService.reviewOvertimeReport(1L, 501L, ReviewOvertimeReportReq.builder()
                .action(OvertimeReviewAction.APPROVE_ALLOWANCE).build());
        assertEquals(BigDecimal.valueOf(expected), result.getPenaltyAmountApplied());
    }

    @Test
    void unlimitedAllowanceExcludesInactiveAndPenaltyRules() {
        mockRule.setMinOvertimeMinutes(15);
        mockRule.setMaxOvertimeMinutes(null);
        mockRule.setPenaltyType(OvertimePenaltyType.PER_MINUTE);
        mockRule.setPenaltyValue(BigDecimal.valueOf(5000));
        var inactive = AgencyOvertimeRuleEntity.builder().isActive(false).minOvertimeMinutes(30)
                .penaltyType(OvertimePenaltyType.PER_MINUTE).penaltyValue(BigDecimal.valueOf(99000)).build();
        var penalty = AgencyOvertimeRuleEntity.builder().isActive(true).minOvertimeMinutes(30)
                .policyType(OvertimePolicyType.PENALTY).build();
        var report = AgencyStaffOvertimeReportEntity.builder().agency(mockAgency).overtimeMinutes(90)
                .status(OvertimeReportStatus.PENDING_AGENCY_REVIEW).build();
        when(agencyProfileRepository.findByOwnerId(1L)).thenReturn(Optional.of(mockAgency));
        lenient().when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdWithDetails(501L, 1L)).thenReturn(Optional.of(report));
        lenient().when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdForReview(501L, 1L)).thenReturn(Optional.of(report));
        when(agencyOvertimeRuleRepository.findByAgencyIdAndIsActiveTrue(1L)).thenReturn(List.of(inactive, penalty, mockRule));
        assertEquals(BigDecimal.valueOf(450000), agencyOvertimeService.getOvertimeReportDetail(1L, 501L).getEstimatedAllowanceAmount());
    }

    @Test
    @DisplayName("Thợ phụ được tính phụ cấp tăng ca theo tỷ lệ hoa hồng hoặc mặc định 50%")
    void assistantStaffAllowanceCalculatedByRate() {
        mockRule.setMinOvertimeMinutes(15);
        mockRule.setPenaltyType(OvertimePenaltyType.FIXED_AMOUNT);
        mockRule.setPenaltyValue(BigDecimal.valueOf(150000));

        var report = AgencyStaffOvertimeReportEntity.builder()
                .bookingId(49L).staff(mockStaff).agency(mockAgency).overtimeMinutes(30)
                .status(OvertimeReportStatus.PENDING_AGENCY_REVIEW)
                .penaltyAmountApplied(BigDecimal.ZERO).build();
        report.setId(701L);

        when(agencyProfileRepository.findByOwnerId(1L)).thenReturn(Optional.of(mockAgency));
        lenient().when(agencyStaffOvertimeReportRepository.findByIdAndAgencyIdWithDetails(701L, 1L)).thenReturn(Optional.of(report));
        when(agencyOvertimeRuleRepository.findByAgencyIdAndIsActiveTrue(1L)).thenReturn(List.of(mockRule));

        BookingStaffAssignmentEntity astAssignment = BookingStaffAssignmentEntity.builder()
                .staff(mockStaff)
                .assignmentRole(AssignmentRole.ASSISTANT_MUA)
                .commissionRate(BigDecimal.valueOf(40))
                .status(AssignmentStatus.ACTIVE)
                .build();
        when(bookingStaffAssignmentRepository.findByBookingIdAndStaffIdAndStatus(49L, mockStaff.getId(), AssignmentStatus.ACTIVE))
                .thenReturn(Optional.of(astAssignment));

        var preview = agencyOvertimeService.getOvertimeReportDetail(1L, 701L);
        // 150.000 * 40% = 60.000
        assertEquals(BigDecimal.valueOf(60000), preview.getEstimatedAllowanceAmount());
    }

}
