package com.makeup.platform.dto.response.support;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatSessionHistoryResponse {
    private String sessionCode;
    private LocalDateTime createdAt;
    private List<AiChatMessageDto> messages;
}
