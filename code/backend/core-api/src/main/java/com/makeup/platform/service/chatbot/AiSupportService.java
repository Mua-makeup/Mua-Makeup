package com.makeup.platform.service.chatbot;

import com.makeup.platform.dto.request.support.AiChatRequest;
import com.makeup.platform.dto.response.support.AiChatResponse;
import com.makeup.platform.dto.response.support.AiChatSessionHistoryResponse;

public interface AiSupportService {

    AiChatResponse chat(Long userId, AiChatRequest request);

    AiChatSessionHistoryResponse getSessionHistory(String sessionCode);

    AiChatSessionHistoryResponse getSessionHistory(String sessionCode, Long userId);

    void closeSession(String sessionCode, Long userId);
}
