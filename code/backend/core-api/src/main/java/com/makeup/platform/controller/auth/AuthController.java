package com.makeup.platform.controller.auth;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.common.constants.ErrorCodes;
import com.makeup.platform.common.constants.SecurityConstants;
import com.makeup.platform.common.exception.CustomBusinessException;
import com.makeup.platform.common.utils.CookieUtils;
import com.makeup.platform.dto.request.auth.ChangePasswordReq;
import com.makeup.platform.dto.request.auth.LoginReq;
import com.makeup.platform.dto.request.auth.LogoutReq;
import com.makeup.platform.dto.request.auth.RefreshTokenReq;
import com.makeup.platform.dto.request.auth.RegisterReq;
import com.makeup.platform.dto.response.auth.AuthRes;
import com.makeup.platform.dto.response.auth.UserInfoRes;
import com.makeup.platform.dto.response.auth.UserRegisterRes;
import com.makeup.platform.service.AuthService;
import com.makeup.platform.service.RedisTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
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
    private final CookieUtils cookieUtils;
    private final RedisTokenService redisTokenService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserRegisterRes>> register(@Valid @RequestBody RegisterReq req) {
        UserRegisterRes res = authService.register(req);
        return created(res, "Đăng ký tài khoản thành công!");
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthRes>> login(
            @Valid @RequestBody LoginReq req,
            HttpServletResponse response) {
        AuthRes res = authService.login(req);
        cookieUtils.setRefreshTokenCookie(response, res.getRefreshToken());
        return ok(res, "Đăng nhập thành công!");
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<AuthRes>> refreshToken(
            @RequestBody(required = false) RefreshTokenReq req,
            @RequestHeader(value = SecurityConstants.HEADER_STRING, required = false) String bearerToken,
            HttpServletRequest request,
            HttpServletResponse response) {
        String tokenFromCookie = cookieUtils.getRefreshTokenFromCookie(request).orElse(null);
        String refreshToken = null;

        // 1. Lấy giá trị refresh token từ cookie và kiểm tra có tồn tại trong Redis hay không
        if (StringUtils.hasText(tokenFromCookie) && redisTokenService.getUserIdByRefreshToken(tokenFromCookie) != null) {
            refreshToken = tokenFromCookie;
        } else if (req != null && StringUtils.hasText(req.getRefreshToken())) {
            // Nếu cookie không có hoặc không có trong Redis, fallback sang Request Body
            refreshToken = req.getRefreshToken();
        } else if (StringUtils.hasText(tokenFromCookie)) {
            // Trường hợp chỉ có cookie mà không có trong Redis, vẫn truyền vào để AuthService validate và phản hồi lỗi chuẩn
            refreshToken = tokenFromCookie;
        }

        if (!StringUtils.hasText(refreshToken)) {
            throw new CustomBusinessException(ErrorCodes.ERR_TOKEN_INVALID,
                    "Refresh Token không được để trống (qua Cookie hoặc Body).", HttpStatus.BAD_REQUEST);
        }

        String oldAccessToken = (req != null && StringUtils.hasText(req.getAccessToken()))
                ? req.getAccessToken()
                : bearerToken;

        RefreshTokenReq finalReq = RefreshTokenReq.builder()
                .refreshToken(refreshToken)
                .accessToken(oldAccessToken)
                .build();

        AuthRes res = authService.refreshToken(finalReq, oldAccessToken);
        cookieUtils.setRefreshTokenCookie(response, res.getRefreshToken());
        return ok(res, "Cấp mới token thành công!");
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestBody(required = false) LogoutReq req,
            @RequestHeader(value = SecurityConstants.HEADER_STRING, required = false) String bearerToken,
            HttpServletRequest request,
            HttpServletResponse response) {
        String tokenFromCookie = cookieUtils.getRefreshTokenFromCookie(request).orElse(null);
        String refreshToken = null;

        if (StringUtils.hasText(tokenFromCookie) && redisTokenService.getUserIdByRefreshToken(tokenFromCookie) != null) {
            refreshToken = tokenFromCookie;
        } else if (req != null && StringUtils.hasText(req.getRefreshToken())) {
            refreshToken = req.getRefreshToken();
        } else if (StringUtils.hasText(tokenFromCookie)) {
            refreshToken = tokenFromCookie;
        }

        LogoutReq finalReq = LogoutReq.builder()
                .refreshToken(refreshToken)
                .build();

        authService.logout(finalReq, bearerToken);
        cookieUtils.deleteRefreshTokenCookie(response);
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
