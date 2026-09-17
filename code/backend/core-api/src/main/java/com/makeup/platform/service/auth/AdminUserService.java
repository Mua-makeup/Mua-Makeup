package com.makeup.platform.service.auth;

import com.makeup.platform.dto.response.admin.AdminUserRes;

import java.util.List;

public interface AdminUserService {

    List<AdminUserRes> getAllUsers(String role, String keyword);

    AdminUserRes updateUserStatus(Long userId, Boolean active);
}
