package com.makeup.platform.service.interaction.impl;

import com.makeup.platform.service.interaction.ExpoPushNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExpoPushNotificationServiceImpl implements ExpoPushNotificationService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
    private final RestTemplate restTemplate = new RestTemplateBuilder()
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(5))
            .build();

    @Async
    @Override
    public void sendPushNotification(String pushToken, String title, String body, Map<String, Object> data) {
        if (!StringUtils.hasText(pushToken)) {
            return;
        }

        // Kiểm tra định dạng hợp lệ của Expo Push Token
        String trimmedToken = pushToken.trim();
        if (!trimmedToken.startsWith("ExponentPushToken[") && !trimmedToken.startsWith("ExpoPushToken[")) {
            log.warn("[ExpoPush] Skip sending push notification: Invalid token prefix '{}'", trimmedToken);
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Accept", "application/json");

            Map<String, Object> payload = new HashMap<>();
            payload.put("to", trimmedToken);
            payload.put("title", title);
            payload.put("body", body);
            payload.put("sound", "default");
            payload.put("priority", "high");
            payload.put("channelId", "default");
            if (data != null && !data.isEmpty()) {
                payload.put("data", data);
            }

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(EXPO_PUSH_URL, request, String.class);

            log.info("[ExpoPush] Sent remote push notification to token '{}'. Title: '{}', Status: {}",
                    trimmedToken, title, response.getStatusCode());
        } catch (Exception ex) {
            log.error("[ExpoPush] Failed to send remote push notification to token '{}': {}",
                    trimmedToken, ex.getMessage(), ex);
        }
    }
}
