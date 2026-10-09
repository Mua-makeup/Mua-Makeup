package com.makeup.platform.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.entity.interaction.AiKnowledgeDocumentEntity;
import com.makeup.platform.repository.interaction.AiKnowledgeDocumentRepository;
import com.makeup.platform.service.GeminiClientService;
import com.makeup.platform.service.KnowledgeRetrievalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class KnowledgeRetrievalServiceImpl implements KnowledgeRetrievalService {

    private final AiKnowledgeDocumentRepository knowledgeDocumentRepository;
    private final GeminiClientService geminiClientService;
    private final ObjectMapper objectMapper;

    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^a-z0-9\\s]");

    @Override
    @Transactional(readOnly = true)
    public List<AiKnowledgeDocumentEntity> retrieveRelevantDocuments(String query, int topK) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }

        List<AiKnowledgeDocumentEntity> allDocs = knowledgeDocumentRepository.findByIsActiveTrue();
        if (allDocs.isEmpty()) {
            return List.of();
        }

        List<Float> queryVector = geminiClientService.embedContent(query);
        String normalizedQuery = normalizeText(query);
        List<String> queryTokens = Arrays.stream(normalizedQuery.split("\\s+"))
                .filter(token -> token.length() > 1)
                .collect(Collectors.toList());

        List<ScoredDocument> scoredDocs = new ArrayList<>();

        for (AiKnowledgeDocumentEntity doc : allDocs) {
            double vectorScore = 0.0;
            if (queryVector != null && doc.getEmbedding() != null) {
                try {
                    List<Float> docVector = objectMapper.readValue(doc.getEmbedding(), new TypeReference<List<Float>>() {});
                    vectorScore = cosineSimilarity(queryVector, docVector);
                } catch (Exception ex) {
                    log.debug("Failed to parse embedding for doc id {}: {}", doc.getId(), ex.getMessage());
                }
            }

            double keywordScore = calculateKeywordScore(doc, queryTokens);

            // Kết hợp vector score (nếu có) và keyword score
            double totalScore = (vectorScore > 0) ? (vectorScore * 0.7 + keywordScore * 0.3) : keywordScore;
            scoredDocs.add(new ScoredDocument(doc, totalScore));
        }

        return scoredDocs.stream()
                .sorted(Comparator.comparingDouble(ScoredDocument::score).reversed())
                .limit(topK)
                .map(ScoredDocument::document)
                .collect(Collectors.toList());
    }

    @Override
    public String buildContextPrompt(List<AiKnowledgeDocumentEntity> documents) {
        if (documents == null || documents.isEmpty()) {
            return "Không có tài liệu tham khảo bổ sung.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("TÀI LIỆU CHÍNH THỨC NỀN TẢNG MUA-MAKEUP:\n\n");
        for (int i = 0; i < documents.size(); i++) {
            AiKnowledgeDocumentEntity doc = documents.get(i);
            sb.append("=== [MỤC ").append(i + 1).append("] ")
              .append(doc.getTitle()).append(" (")
              .append(doc.getCategory()).append(") ===\n");
            sb.append(doc.getContent()).append("\n\n");
        }
        return sb.toString();
    }

    private double calculateKeywordScore(AiKnowledgeDocumentEntity doc, List<String> queryTokens) {
        if (queryTokens.isEmpty()) {
            return 0.0;
        }

        String targetText = normalizeText((doc.getTitle() != null ? doc.getTitle() : "") + " "
                + (doc.getKeywords() != null ? doc.getKeywords() : "") + " "
                + (doc.getContent() != null ? doc.getContent() : ""));

        long matchedCount = queryTokens.stream()
                .filter(targetText::contains)
                .count();

        return (double) matchedCount / queryTokens.size();
    }

    private double cosineSimilarity(List<Float> v1, List<Float> v2) {
        if (v1 == null || v2 == null || v1.size() != v2.size() || v1.isEmpty()) {
            return 0.0;
        }

        double dotProduct = 0.0;
        double norm1 = 0.0;
        double norm2 = 0.0;

        for (int i = 0; i < v1.size(); i++) {
            float a = v1.get(i);
            float b = v2.get(i);
            dotProduct += a * b;
            norm1 += a * a;
            norm2 += b * b;
        }

        if (norm1 == 0.0 || norm2 == 0.0) {
            return 0.0;
        }

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    private String normalizeText(String input) {
        if (input == null) {
            return "";
        }
        String decomposed = Normalizer.normalize(input.toLowerCase(Locale.ROOT), Normalizer.Form.NFD);
        String stripped = decomposed.replaceAll("\\p{M}", "");
        return NON_ALPHANUMERIC.matcher(stripped).replaceAll(" ").trim();
    }

    private record ScoredDocument(AiKnowledgeDocumentEntity document, double score) {}
}
