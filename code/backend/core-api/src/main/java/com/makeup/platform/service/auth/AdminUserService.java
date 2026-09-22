package com.makeup.platform.service.auth;

import com.makeup.platform.common.base.PageResponse;
import com.makeup.platform.dto.request.admin.AdminCreateUserReq;
import com.makeup.platform.dto.response.admin.AdminUserRes;
import org.springframework.data.domain.Pageable;

public interface AdminUserService {

    PageResponse<AdminUserRes> getAllUsers(String role, String keyword, Pageable pageable);

    AdminUserRes updateUserStatus(Long userId, Boolean active);

    AdminUserRes createUser(AdminCreateUserReq req);
}
