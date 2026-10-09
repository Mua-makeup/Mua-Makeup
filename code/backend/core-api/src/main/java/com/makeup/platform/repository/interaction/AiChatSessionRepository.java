package com.makeup.platform.repository.interaction;

import com.makeup.platform.entity.interaction.AiChatSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiChatSessionRepository extends JpaRepository<AiChatSessionEntity, Long> {

    Optional<AiChatSessionEntity> findBySessionCode(String sessionCode);

    List<AiChatSessionEntity> findTop10ByUserIdOrderByUpdatedAtDesc(Long userId);
}
