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
import com.makeup.platform.dto.request.auth.UpdateLanguageReq;
import com.makeup.platform.dto.response.auth.AuthRes;
import com.makeup.platform.dto.response.auth.UserInfoRes;
import com.makeup.platform.dto.response.auth.UserRegisterRes;
import com.makeup.platform.service.auth.AuthService;
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
import org.springframework.web.bind.annotation.PutMapping;
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

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserRegisterRes>> register(@Valid @RequestBody RegisterReq req) {
        UserRegisterRes res = authService.register(req);
        return created(res, "auth.register_success");
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthRes>> login(
            @Valid @RequestBody LoginReq req,
            HttpServletResponse response) {
        AuthRes res = authService.login(req);
        cookieUtils.setAccessTokenCookie(response, res.getAccessToken());
        cookieUtils.setRefreshTokenCookie(response, res.getRefreshToken());
        return ok(res, "auth.login_success");
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<AuthRes>> refreshToken(
            @RequestBody(required = false) RefreshTokenReq req,
            @RequestHeader(value = SecurityConstants.HEADER_STRING, required = false) String bearerToken,
            HttpServletRequest request,
            HttpServletResponse response) {
        String tokenFromCookie = cookieUtils.getRefreshTokenFromCookie(request).orElse(null);
        String refreshToken = StringUtils.hasText(tokenFromCookie)
                ? tokenFromCookie
                : (req != null ? req.getRefreshToken() : null);

        if (!StringUtils.hasText(refreshToken)) {
            throw new CustomBusinessException(ErrorCodes.ERR_TOKEN_INVALID,
                    "ERR_TOKEN_INVALID", HttpStatus.BAD_REQUEST);
        }

        RefreshTokenReq finalReq = RefreshTokenReq.builder()
                .refreshToken(refreshToken)
                .build();

        AuthRes res = authService.refreshToken(finalReq, bearerToken);
        cookieUtils.setAccessTokenCookie(response, res.getAccessToken());
        cookieUtils.setRefreshTokenCookie(response, res.getRefreshToken());
        return ok(res, "auth.refresh_token_success");
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestBody(required = false) LogoutReq req,
            @RequestHeader(value = SecurityConstants.HEADER_STRING, required = false) String bearerToken,
            HttpServletRequest request,
            HttpServletResponse response) {
        String tokenFromCookie = cookieUtils.getRefreshTokenFromCookie(request).orElse(null);
        String refreshToken = StringUtils.hasText(tokenFromCookie)
                ? tokenFromCookie
                : (req != null ? req.getRefreshToken() : null);

        String effectiveBearerToken = StringUtils.hasText(bearerToken)
                ? bearerToken
                : cookieUtils.getAccessTokenFromCookie(request).map(t -> SecurityConstants.TOKEN_PREFIX + t).orElse(null);

        LogoutReq finalReq = LogoutReq.builder()
                .refreshToken(refreshToken)
                .build();

        authService.logout(finalReq, effectiveBearerToken);
        cookieUtils.deleteAccessTokenCookie(response);
        cookieUtils.deleteRefreshTokenCookie(response);
        return ok(null, "auth.logout_success");
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody ChangePasswordReq req) {
        authService.changePassword(userId, req);
        return ok(null, "auth.change_password_success");
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserInfoRes>> getCurrentUser(@AuthenticationPrincipal Long userId) {
        UserInfoRes res = authService.getCurrentUser(userId);
        return ok(res);
    }

    @PutMapping("/language")
    public ResponseEntity<ApiResponse<UserInfoRes>> updateLanguage(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody UpdateLanguageReq req) {
        UserInfoRes res = authService.updateLanguage(userId, req);
        return ok(res, "auth.language_updated");
    }
}
