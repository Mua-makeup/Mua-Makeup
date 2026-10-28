package com.makeup.platform.service.interaction.impl;

import com.makeup.platform.service.interaction.DiscordAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DiscordAlertServiceImpl implements DiscordAlertService {

    @Value("${discord.webhook.error-url:}")
    private String errorWebhookUrl;

    @Value("${discord.webhook.enabled:true}")
    private boolean enabled;

    private final RestTemplate restTemplate = new RestTemplateBuilder()
            .setConnectTimeout(Duration.ofSeconds(3))
            .setReadTimeout(Duration.ofSeconds(3))
            .build();

    @Async
    @Override
    public void sendExceptionAlert(String uri, String method, String userPrincipal, Exception ex) {
        if (!enabled || !StringUtils.hasText(errorWebhookUrl)) {
            return;
        }

        try {
            String exceptionName = ex != null ? ex.getClass().getSimpleName() : "UnknownException";
            String rawMessage = ex != null && ex.getMessage() != null ? ex.getMessage() : "No message provided";
            String message = rawMessage.length() > 500 ? rawMessage.substring(0, 500) + "..." : rawMessage;

            String stackTraceSnippet = extractShortStackTrace(ex);

            Map<String, Object> payload = new HashMap<>();
            payload.put("username", "Core-API Error Monitor");
            payload.put("avatar_url", "https://cdn-icons-png.flaticon.com/512/564/564619.png");

            Map<String, Object> embed = new HashMap<>();
            embed.put("title", "🔥 Backend 500: " + exceptionName);
            embed.put("color", 15158332);
            embed.put("timestamp", Instant.now().toString());

            List<Map<String, Object>> fields = new ArrayList<>();

            Map<String, Object> endpointField = new HashMap<>();
            endpointField.put("name", "🌐 Endpoint");
            endpointField.put("value", "`" + (method != null ? method : "UNKNOWN") + " " + (uri != null ? uri : "/") + "`");
            endpointField.put("inline", true);
            fields.add(endpointField);

            Map<String, Object> userField = new HashMap<>();
            userField.put("name", "👤 User");
            userField.put("value", StringUtils.hasText(userPrincipal) ? userPrincipal : "Anonymous / Guest");
            userField.put("inline", true);
            fields.add(userField);

            Map<String, Object> msgField = new HashMap<>();
            msgField.put("name", "💬 Message");
            msgField.put("value", message);
            msgField.put("inline", false);
            fields.add(msgField);

            Map<String, Object> traceField = new HashMap<>();
            traceField.put("name", "📜 Stack Trace Snippet");
            traceField.put("value", "```java\n" + stackTraceSnippet + "\n```");
            traceField.put("inline", false);
            fields.add(traceField);

            embed.put("fields", fields);

            List<Map<String, Object>> embeds = new ArrayList<>();
            embeds.add(embed);
            payload.put("embeds", embeds);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            restTemplate.postForEntity(errorWebhookUrl, request, String.class);
            log.info("[DiscordAlert] Dispatched error alert to Discord successfully for {}", uri);
        } catch (Exception sendEx) {
            log.warn("[DiscordAlert] Failed to dispatch Discord alert: {}", sendEx.getMessage());
        }
    }

    private String extractShortStackTrace(Exception ex) {
        if (ex == null) {
            return "No stack trace available.";
        }
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        ex.printStackTrace(pw);
        String fullTrace = sw.toString();

        String[] lines = fullTrace.split("\n");
        StringBuilder sb = new StringBuilder();
        int maxLines = Math.min(lines.length, 6);
        for (int i = 0; i < maxLines; i++) {
            sb.append(lines[i].trim()).append("\n");
        }
        String result = sb.toString();
        if (result.length() > 900) {
            result = result.substring(0, 900) + "...";
        }
        return result;
    }
}
