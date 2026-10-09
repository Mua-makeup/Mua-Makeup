package com.makeup.platform.service;

import com.makeup.platform.entity.interaction.AiKnowledgeDocumentEntity;

import java.util.List;

public interface KnowledgeRetrievalService {

    List<AiKnowledgeDocumentEntity> retrieveRelevantDocuments(String query, int topK);

    String buildContextPrompt(List<AiKnowledgeDocumentEntity> documents);
}
