package com.makeup.platform.controller.support;

import com.makeup.platform.common.base.ApiResponse;
import com.makeup.platform.common.base.BaseController;
import com.makeup.platform.dto.request.support.AiChatRequest;
import com.makeup.platform.dto.response.support.AiChatResponse;
import com.makeup.platform.dto.response.support.AiChatSessionHistoryResponse;
import com.makeup.platform.service.AiSupportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/support")
@RequiredArgsConstructor
public class CustomerAiSupportController extends BaseController {

    private final AiSupportService aiSupportService;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody AiChatRequest request) {
        AiChatResponse response = aiSupportService.chat(userId, request);
        return ok(response);
    }

    @GetMapping("/history/{sessionCode}")
    public ResponseEntity<ApiResponse<AiChatSessionHistoryResponse>> getSessionHistory(
            @PathVariable String sessionCode) {
        AiChatSessionHistoryResponse response = aiSupportService.getSessionHistory(sessionCode);
        return ok(response);
    }
}
