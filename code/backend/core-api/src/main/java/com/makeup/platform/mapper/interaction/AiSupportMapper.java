package com.makeup.platform.mapper.interaction;

import com.makeup.platform.dto.response.support.AiChatMessageDto;
import com.makeup.platform.dto.response.support.AiChatSessionHistoryResponse;
import com.makeup.platform.entity.interaction.AiChatMessageEntity;
import com.makeup.platform.entity.interaction.AiChatSessionEntity;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class AiSupportMapper {

    public AiChatMessageDto toMessageDto(AiChatMessageEntity entity) {
        if (entity == null) {
            return null;
        }

        return AiChatMessageDto.builder()
                .id(entity.getId())
                .role(entity.getRole())
                .content(entity.getContent())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    public List<AiChatMessageDto> toMessageDtoList(List<AiChatMessageEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Collections.emptyList();
        }

        return entities.stream()
                .map(this::toMessageDto)
                .collect(Collectors.toList());
    }

    public AiChatSessionHistoryResponse toSessionHistoryResponse(AiChatSessionEntity session, List<AiChatMessageEntity> messages) {
        if (session == null) {
            return null;
        }

        return AiChatSessionHistoryResponse.builder()
                .sessionCode(session.getSessionCode())
                .createdAt(session.getCreatedAt())
                .messages(toMessageDtoList(messages))
                .build();
    }
}
