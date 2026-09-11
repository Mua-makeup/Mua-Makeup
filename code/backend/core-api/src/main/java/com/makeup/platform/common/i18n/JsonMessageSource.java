package com.makeup.platform.common.i18n;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.support.AbstractMessageSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.text.MessageFormat;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component("messageSource")
public class JsonMessageSource extends AbstractMessageSource {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, Map<String, String>> localizedMessages = new ConcurrentHashMap<>();

    private static final String DEFAULT_LANG = "en";
    private static final String VI_LANG = "vi";

    @PostConstruct
    public void init() {
        loadMessages(DEFAULT_LANG, "i18n/messages_en.json");
        loadMessages(VI_LANG, "i18n/messages_vi.json");
    }

    private void loadMessages(String lang, String path) {
        try {
            Resource resource = new ClassPathResource(path);
            if (!resource.exists()) {
                log.warn("i18n file not found: {}", path);
                return;
            }
            try (InputStream is = resource.getInputStream()) {
                JsonNode root = objectMapper.readTree(is);
                Map<String, String> map = new HashMap<>();
                flattenJson("", root, map);
                localizedMessages.put(lang, map);
                log.info("Loaded {} i18n messages for language '{}'", map.size(), lang);
            }
        } catch (IOException e) {
            log.error("Failed to load i18n messages from {}: {}", path, e.getMessage(), e);
        }
    }

    private void flattenJson(String prefix, JsonNode node, Map<String, String> outMap) {
        if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                String key = prefix.isEmpty() ? field.getKey() : prefix + "." + field.getKey();
                flattenJson(key, field.getValue(), outMap);
            }
        } else if (node.isValueNode()) {
            outMap.put(prefix, node.asText());
        }
    }

    @Override
    protected MessageFormat resolveCode(String code, Locale locale) {
        String msg = getMessageString(code, locale);
        if (msg == null) {
            return null;
        }
        return new MessageFormat(msg, locale != null ? locale : Locale.ENGLISH);
    }

    public String getMessageString(String code, Locale locale) {
        String lang = (locale != null && locale.getLanguage().equalsIgnoreCase(VI_LANG)) ? VI_LANG : DEFAULT_LANG;
        Map<String, String> messages = localizedMessages.get(lang);

        if (messages != null && messages.containsKey(code)) {
            return messages.get(code);
        }

        // Fallback to English
        Map<String, String> fallbackMessages = localizedMessages.get(DEFAULT_LANG);
        if (fallbackMessages != null && fallbackMessages.containsKey(code)) {
            return fallbackMessages.get(code);
        }

        return null;
    }

    public String getLocalizedMessage(String code, Object[] args, String defaultMessage, Locale locale) {
        String msg = getMessageString(code, locale);
        if (msg == null) {
            msg = defaultMessage != null ? defaultMessage : code;
        }
        if (args != null && args.length > 0 && msg != null && msg.contains("{")) {
            try {
                return MessageFormat.format(msg, args);
            } catch (Exception e) {
                log.debug("Message formatting failed for pattern '{}': {}", msg, e.getMessage());
            }
        }
        return msg;
    }
}
