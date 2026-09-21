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

import com.makeup.platform.common.base.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;

import com.makeup.platform.dto.request.admin.AdminCreateUserReq;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminUserController extends BaseController {

    private final AdminUserService adminUserService;

    @PostMapping
    public ResponseEntity<ApiResponse<AdminUserRes>> createUser(
            @Valid @RequestBody AdminCreateUserReq req
    ) {
        AdminUserRes created = adminUserService.createUser(req);
        return created(created, "admin.user_create_success");
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdminUserRes>>> getAllUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PageResponse<AdminUserRes> users = adminUserService.getAllUsers(role, keyword, pageable);
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
