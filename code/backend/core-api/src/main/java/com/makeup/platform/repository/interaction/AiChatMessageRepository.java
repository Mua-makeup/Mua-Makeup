package com.makeup.platform.repository.interaction;

import com.makeup.platform.entity.interaction.AiChatMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiChatMessageRepository extends JpaRepository<AiChatMessageEntity, Long> {

    List<AiChatMessageEntity> findBySessionIdOrderByCreatedAtAsc(Long sessionId);
}
