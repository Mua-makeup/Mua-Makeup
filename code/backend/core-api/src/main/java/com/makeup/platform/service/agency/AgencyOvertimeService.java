package com.makeup.platform.service.agency;

import com.makeup.platform.dto.request.agency.ConfigureOvertimeRuleReq;
import com.makeup.platform.dto.request.agency.ReviewOvertimeReportReq;
import com.makeup.platform.dto.request.agency.SubmitOvertimeReportReq;
import com.makeup.platform.dto.response.agency.OvertimeReportRes;
import com.makeup.platform.dto.response.agency.OvertimeRuleRes;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AgencyOvertimeService {

    OvertimeRuleRes createOrUpdateRule(Long userId, ConfigureOvertimeRuleReq req);

    List<OvertimeRuleRes> getAgencyRules(Long userId);

    void deleteRule(Long userId, Long ruleId);

    OvertimeRuleRes toggleRuleStatus(Long userId, Long ruleId, boolean isActive);

    OvertimeReportRes submitOvertimeReport(Long userId, SubmitOvertimeReportReq req);

    OvertimeReportRes reviewOvertimeReport(Long userId, Long reportId, ReviewOvertimeReportReq req);

    Page<OvertimeReportRes> getOvertimeReports(Long userId, String status, Pageable pageable);

    OvertimeReportRes getOvertimeReportDetail(Long userId, Long reportId);
}
