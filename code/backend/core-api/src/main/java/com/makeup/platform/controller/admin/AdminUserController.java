package com.makeup.platform.controller.admin;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.response.admin.AdminUserRes;
import com.makeup.platform.service.auth.AdminUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminUserController extends BaseController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminUserRes>>> getAllUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String keyword
    ) {
        List<AdminUserRes> users = adminUserService.getAllUsers(role, keyword);
        return ok(users, "admin.users_fetch_success");
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<AdminUserRes>> updateUserStatus(
            @PathVariable Long id,
            @RequestParam Boolean active
    ) {

        AdminUserRes updated = adminUserService.updateUserStatus(id, active);
        return ok(updated, "admin.user_status_update_success");
    }
}
