package com.makeup.platform.config;

import com.makeup.platform.security.WebSocketSecurityInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;

import java.util.Arrays;

@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final WebSocketSecurityInterceptor securityInterceptor;

    @Value("${WEBSOCKET_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:8081,http://localhost:19006,https://mua-makeup.duckdns.org,https://mua-makeup-mobile.vercel.app,https://*.vercel.app}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins.split(",")).map(String::trim)
                .filter(origin -> !origin.isEmpty()).toArray(String[]::new);
        if (origins.length == 0) {
            origins = new String[] {
                    "http://localhost:[*]",
                    "https://mua-makeup.duckdns.org",
                    "https://mua-makeup-mobile.vercel.app",
                    "https://*.vercel.app"
            };
        }
        registry.addEndpoint("/ws-makeup").setAllowedOriginPatterns(origins);
        registry.addEndpoint("/ws-makeup").setAllowedOriginPatterns(origins).withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(securityInterceptor);
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                return securityInterceptor.authorizeOutbound(message);
            }
        });
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.addDecoratorFactory(handler -> new WebSocketHandlerDecorator(handler) {
            @Override
            public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                securityInterceptor.connected(session);
                try {
                    super.afterConnectionEstablished(session);
                } catch (Exception exception) {
                    securityInterceptor.closed(session.getId());
                    throw exception;
                }
            }

            @Override
            public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
                securityInterceptor.closed(session.getId());
                super.afterConnectionClosed(session, status);
            }
        });
        registration.setMessageSizeLimit(16 * 1024);
        registration.setSendBufferSizeLimit(256 * 1024);
        registration.setSendTimeLimit(10000);
        registration.setTimeToFirstMessage(10000);
    }
}

