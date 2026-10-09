package com.makeup.platform.service;

import com.makeup.platform.dto.request.support.AiChatRequest;
import com.makeup.platform.dto.response.support.AiChatResponse;
import com.makeup.platform.dto.response.support.AiChatSessionHistoryResponse;

public interface AiSupportService {

    AiChatResponse chat(Long userId, AiChatRequest request);

    AiChatSessionHistoryResponse getSessionHistory(String sessionCode);
}
