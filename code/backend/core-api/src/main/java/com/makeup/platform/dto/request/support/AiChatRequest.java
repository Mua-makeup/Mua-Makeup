package com.makeup.platform.dto.request.support;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRequest {

    @NotBlank(message = "{support.message_not_blank}")
    @Size(max = 1000, message = "{support.message_too_long}")
    private String message;

    private String sessionCode;
}
