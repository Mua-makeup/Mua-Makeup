package com.makeup.platform.service;

import java.util.List;
import java.util.Map;

public interface GeminiClientService {

    String generateContent(String systemInstruction, List<Map<String, String>> conversationHistory, String userMessage);

    List<Float> embedContent(String text);
}
