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
public class AiChatResponse {
    private String sessionCode;
    private String reply;
    private String role;
    private LocalDateTime timestamp;
    private List<String> relevantTopics;
}
