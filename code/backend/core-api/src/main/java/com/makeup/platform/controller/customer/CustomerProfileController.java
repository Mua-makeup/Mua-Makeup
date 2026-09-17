package com.makeup.platform.controller.customer;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.auth.UpdateProfileReq;
import com.makeup.platform.dto.response.auth.UserInfoRes;
import com.makeup.platform.service.auth.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customer/profile")
@RequiredArgsConstructor
public class CustomerProfileController extends BaseController {

    private final UserService userService;

    @PutMapping
    public ResponseEntity<ApiResponse<UserInfoRes>> updateProfile(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody UpdateProfileReq req) {
        UserInfoRes res = userService.updateProfile(userId, req);
        return ok(res, "customer.profile_update_success");
    }
}
