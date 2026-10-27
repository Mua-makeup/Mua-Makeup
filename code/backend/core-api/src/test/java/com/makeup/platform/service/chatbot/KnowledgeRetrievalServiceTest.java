package com.makeup.platform.service.chatbot;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.entity.interaction.AiKnowledgeDocumentEntity;
import com.makeup.platform.repository.interaction.AiKnowledgeDocumentRepository;
import com.makeup.platform.service.chatbot.impl.KnowledgeRetrievalServiceImpl;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class KnowledgeRetrievalServiceTest {
    @Mock AiKnowledgeDocumentRepository documents;
    @Mock GeminiClientService gemini;
    KnowledgeRetrievalServiceImpl service;
    @BeforeEach void setup() { service = new KnowledgeRetrievalServiceImpl(documents, gemini, new ObjectMapper()); }
    @ParameterizedTest @NullAndEmptySource @ValueSource(strings="   ")
    void emptyQuestionDoesNotCallModel(String question) {
        assertTrue(service.retrieveRelevantDocuments(question, 3).isEmpty()); verifyNoInteractions(documents, gemini);
    }
    @Test void emptyKnowledgeBaseDoesNotCallModel() {
        assertTrue(service.retrieveRelevantDocuments("booking", 3).isEmpty()); verifyNoInteractions(gemini);
    }
    @Test void keywordFallbackRanksRelevantDocumentAndLimitsResults() {
        var booking = new AiKnowledgeDocumentEntity(); booking.setTitle("Đặt lịch"); booking.setContent("Hướng dẫn đặt lịch trang điểm");
        var payment = new AiKnowledgeDocumentEntity(); payment.setTitle("Thanh toán"); payment.setContent("Ví và giao dịch");
        when(documents.findByIsActiveTrue()).thenReturn(List.of(payment, booking));
        assertEquals(List.of(booking), service.retrieveRelevantDocuments("dat lich", 1));
    }
    @Test void corruptEmbeddingDoesNotLoseRelevantDocument() {
        var doc = new AiKnowledgeDocumentEntity(); doc.setTitle("booking"); doc.setEmbedding("invalid json");
        when(documents.findByIsActiveTrue()).thenReturn(List.of(doc)); when(gemini.embedContent("booking")).thenReturn(List.of(1f, 0f));
        assertEquals(List.of(doc), service.retrieveRelevantDocuments("booking", 3));
    }
    @Test void contextContainsSourceTitleAndContent() {
        var doc = new AiKnowledgeDocumentEntity(); doc.setTitle("Refund policy"); doc.setContent("Refund within seven days"); doc.setCategory("payment");
        var context = service.buildContextPrompt(List.of(doc));
        assertTrue(context.contains("Refund policy")); assertTrue(context.contains("Refund within seven days"));
        assertNotNull(service.buildContextPrompt(null));
    }
}
