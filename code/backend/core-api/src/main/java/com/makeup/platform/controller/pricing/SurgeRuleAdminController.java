package com.makeup.platform.controller.pricing;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.pricing.ConfigureSurgeRuleReq;
import com.makeup.platform.dto.response.pricing.SurgeRuleRes;
import com.makeup.platform.service.pricing.SurgePricingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/pricing/surge-rules")
@RequiredArgsConstructor
public class SurgeRuleAdminController extends BaseController {

    private final SurgePricingService surgePricingService;

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<SurgeRuleRes>> createRule(
            @Valid @RequestBody ConfigureSurgeRuleReq req
    ) {
        SurgeRuleRes res = surgePricingService.createRule(req);
        return created(res, "pricing.surge_rule_created_success");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<SurgeRuleRes>> updateRule(
            @PathVariable Long id,
            @Valid @RequestBody ConfigureSurgeRuleReq req
    ) {
        SurgeRuleRes res = surgePricingService.updateRule(id, req);
        return ok(res, "pricing.surge_rule_updated_success");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteRule(@PathVariable Long id) {
        surgePricingService.deleteRule(id);
        return ok(null, "pricing.surge_rule_deleted_success");
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<SurgeRuleRes>>> listRules() {
        List<SurgeRuleRes> res = surgePricingService.listRules();
        return ok(res, "pricing.surge_rules_get_success");
    }

    @GetMapping("/h3-status")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Boolean>>> getH3SurgeStatus() {
        boolean enabled = surgePricingService.isH3SurgeGloballyEnabled();
        return ok(java.util.Map.of("isH3SurgeEnabled", enabled), "pricing.h3_surge_status_success");
    }

    @PostMapping("/toggle-h3")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Boolean>>> toggleH3Surge(
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "true") boolean enabled
    ) {
        boolean result = surgePricingService.toggleH3Surge(enabled);
        return ok(java.util.Map.of("isH3SurgeEnabled", result), "pricing.h3_surge_toggle_success");
    }
}
