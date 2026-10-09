package com.makeup.platform.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.makeup.platform.service.GeminiClientService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiClientServiceImpl implements GeminiClientService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final String embeddingModel;

    public GeminiClientServiceImpl(
            ObjectMapper objectMapper,
            @Value("${gemini.api-key:}") String apiKey,
            @Value("${gemini.base-url:https://generativelanguage.googleapis.com/v1beta}") String baseUrl,
            @Value("${gemini.model:gemini-3.5-flash-lite}") String model,
            @Value("${gemini.embedding-model:gemini-embedding-001}") String embeddingModel) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.embeddingModel = embeddingModel;
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    @Override
    public String generateContent(String systemInstruction, List<Map<String, String>> conversationHistory, String userMessage) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Gemini API key is not configured. Falling back to default message.");
            return "Hệ thống AI CSKH đang bảo trì kết nối API Key. Quý khách vui lòng thử lại sau ít phút hoặc liên hệ hotline để được hỗ trợ trực tiếp.";
        }

        try {
            Map<String, Object> requestPayload = new HashMap<>();

            // 1. System Instruction
            if (systemInstruction != null && !systemInstruction.trim().isEmpty()) {
                requestPayload.put("system_instruction", Map.of(
                        "parts", List.of(Map.of("text", systemInstruction))
                ));
            }

            // 2. Chat contents
            List<Map<String, Object>> contents = new ArrayList<>();
            if (conversationHistory != null) {
                for (Map<String, String> msg : conversationHistory) {
                    String role = "user".equalsIgnoreCase(msg.get("role")) ? "user" : "model";
                    String text = msg.get("content");
                    if (text != null && !text.trim().isEmpty()) {
                        contents.add(Map.of(
                                "role", role,
                                "parts", List.of(Map.of("text", text))
                        ));
                    }
                }
            }

            // Thêm tin nhắn hiện tại của user
            contents.add(Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", userMessage))
            ));
            requestPayload.put("contents", contents);

            // 3. Generation configuration
            requestPayload.put("generationConfig", Map.of(
                    "temperature", 0.3,
                    "maxOutputTokens", 1000
            ));

            String uri = String.format("/models/%s:generateContent?key=%s", model, apiKey);

            String responseBody = restClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestPayload)
                    .retrieve()
                    .body(String.class);

            if (responseBody != null) {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && !candidates.isEmpty()) {
                    JsonNode textNode = candidates.get(0).path("content").path("parts").get(0).path("text");
                    if (!textNode.isMissingNode()) {
                        return textNode.asText().trim();
                    }
                }
            }

            return "Dạ hiện tại em chưa thể xử lý yêu cầu này. Anh/chị vui lòng thử lại sau giây lát ạ.";
        } catch (Exception ex) {
            log.error("Error calling Gemini generateContent API: {}", ex.getMessage(), ex);
            return "Dạ kết nối với trợ lý AI tạm thời bị gián đoạn. Anh/chị vui lòng gửi lại câu hỏi hoặc liên hệ hỗ trợ viên qua hotline nhé!";
        }
    }

    @Override
    public List<Float> embedContent(String text) {
        if (apiKey == null || apiKey.trim().isEmpty() || text == null || text.trim().isEmpty()) {
            return null;
        }

        try {
            Map<String, Object> payload = Map.of(
                    "model", "models/" + embeddingModel,
                    "content", Map.of("parts", List.of(Map.of("text", text)))
            );

            String uri = String.format("/models/%s:embedContent?key=%s", embeddingModel, apiKey);

            String responseBody = restClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            if (responseBody != null) {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode valuesNode = root.path("embedding").path("values");
                if (valuesNode.isArray()) {
                    List<Float> embeddings = new ArrayList<>(valuesNode.size());
                    for (JsonNode val : valuesNode) {
                        embeddings.add((float) val.asDouble());
                    }
                    return embeddings;
                }
            }
        } catch (Exception ex) {
            log.debug("Notice: Unable to generate embedding via Gemini API: {}. Will use keyword relevance scoring.", ex.getMessage());
        }
        return null;
    }
}
