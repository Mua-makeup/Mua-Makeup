package com.makeup.platform.controller.auth;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.constants.SecurityConstants;
import com.makeup.platform.dto.request.auth.ChangePasswordReq;
import com.makeup.platform.dto.request.auth.LoginReq;
import com.makeup.platform.dto.request.auth.LogoutReq;
import com.makeup.platform.dto.request.auth.RefreshTokenReq;
import com.makeup.platform.dto.request.auth.RegisterReq;
import com.makeup.platform.dto.response.auth.AuthRes;
import com.makeup.platform.dto.response.auth.UserInfoRes;
import com.makeup.platform.dto.response.auth.UserRegisterRes;
import com.makeup.platform.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController extends BaseController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserRegisterRes>> register(@Valid @RequestBody RegisterReq req) {
        UserRegisterRes res = authService.register(req);
        return created(res, "Đăng ký tài khoản thành công!");
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthRes>> login(@Valid @RequestBody LoginReq req) {
        AuthRes res = authService.login(req);
        return ok(res, "Đăng nhập thành công!");
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<AuthRes>> refreshToken(@Valid @RequestBody RefreshTokenReq req) {
        AuthRes res = authService.refreshToken(req);
        return ok(res, "Cấp mới token thành công!");
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @Valid @RequestBody LogoutReq req,
            @RequestHeader(value = SecurityConstants.HEADER_STRING, required = false) String bearerToken) {
        authService.logout(req, bearerToken);
        return ok(null, "Đăng xuất thành công! Token đã được thu hồi an toàn.");
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody ChangePasswordReq req) {
        authService.changePassword(userId, req);
        return ok(null, "Đổi mật khẩu thành công. Vui lòng sử dụng mật khẩu mới cho các lần đăng nhập tiếp theo.");
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserInfoRes>> getCurrentUser(@AuthenticationPrincipal Long userId) {
        UserInfoRes res = authService.getCurrentUser(userId);
        return ok(res);
    }
}
