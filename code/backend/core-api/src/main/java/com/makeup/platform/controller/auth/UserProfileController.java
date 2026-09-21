package com.makeup.platform.controller.auth;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.auth.UpdateProfileReq;
import com.makeup.platform.dto.response.auth.UserInfoRes;
import com.makeup.platform.service.auth.AuthService;
import com.makeup.platform.service.auth.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserProfileController extends BaseController {

    private final UserService userService;
    private final AuthService authService;

    /**
     * API chung cho TẤT CẢ các vai trò (Customer, MUA, Agency Staff, Agency Admin, Super Admin)
     * Tải ảnh đại diện lên Cloudinary và lưu vào auth_schema.users.
     */
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserInfoRes>> uploadAvatar(
            @AuthenticationPrincipal Long userId,
            @RequestParam("file") MultipartFile file) {
        UserInfoRes res = userService.uploadAvatar(userId, file);
        return ok(res, "user.avatar_upload_success");
    }

    /**
     * Cập nhật thông tin cá nhân cơ bản (Họ tên, Giới tính)
     */
    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserInfoRes>> updateProfile(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody UpdateProfileReq req) {
        UserInfoRes res = userService.updateProfile(userId, req);
        return ok(res, "user.profile_update_success");
    }

    /**
     * Lấy thông tin tài khoản hiện tại
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserInfoRes>> getCurrentUser(
            @AuthenticationPrincipal Long userId) {
        UserInfoRes res = authService.getCurrentUser(userId);
        return ok(res, "auth.me_success");
    }
}
