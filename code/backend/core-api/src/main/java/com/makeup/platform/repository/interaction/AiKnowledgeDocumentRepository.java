package com.makeup.platform.repository.interaction;

import com.makeup.platform.entity.interaction.AiKnowledgeDocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiKnowledgeDocumentRepository extends JpaRepository<AiKnowledgeDocumentEntity, Long> {

    List<AiKnowledgeDocumentEntity> findByIsActiveTrue();

    List<AiKnowledgeDocumentEntity> findByCategoryAndIsActiveTrue(String category);
}
