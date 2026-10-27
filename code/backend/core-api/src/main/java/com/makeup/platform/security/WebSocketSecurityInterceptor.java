package com.makeup.platform.security;

import com.makeup.platform.entity.auth.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class WebSocketSecurityInterceptor implements ChannelInterceptor {
    private final WebSocketAccessService accessService;
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final Map<String, WebSocketSession> connections = new ConcurrentHashMap<>();

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) throw denied();
        StompCommand command = accessor.getCommand();
        String sessionId = accessor.getSessionId();
        if (sessionId == null) throw denied();
        if (command == StompCommand.DISCONNECT) {
            sessions.remove(sessionId);
            return message;
        }
        if (command == StompCommand.CONNECT || command == StompCommand.STOMP) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null) header = accessor.getFirstNativeHeader("authorization");
            if (header == null || !header.startsWith("Bearer ") || sessions.containsKey(sessionId)) throw denied();
            String token = header.substring(7);
            UserEntity user = accessService.authenticate(token);
            accessor.setUser(new UsernamePasswordAuthenticationToken(user.getId().toString(), null, List.of()));
            sessions.put(sessionId, new Session(token));
            return message;
        }
        Session session = sessions.get(sessionId);
        if (session == null) throw denied();
        if (accessor.getMessageType() == SimpMessageType.HEARTBEAT) return message;
        UserEntity user = accessService.authenticate(session.token);
        if (command == StompCommand.SUBSCRIBE) {
            if (!accessService.canSubscribe(user, accessor.getDestination())) throw denied();
            String subscriptionId = accessor.getSubscriptionId();
            synchronized (session) {
                if (subscriptionId == null || session.subscriptions.size() >= 64
                        || session.subscriptions.putIfAbsent(subscriptionId, accessor.getDestination()) != null) throw denied();
            }
        } else if (command == StompCommand.UNSUBSCRIBE) {
            if (accessor.getSubscriptionId() != null) session.subscriptions.remove(accessor.getSubscriptionId());
        } else if (command == StompCommand.SEND) {
            if (!"/app/telemetry/location".equals(accessor.getDestination())
                    || !accessService.canSendTelemetry(user.getId(), null)) throw denied();
            synchronized (session) {
                long now = System.nanoTime();
                if (session.lastSend != 0 && now - session.lastSend < 200_000_000L) throw denied();
                session.lastSend = now;
            }
        } else {
            throw denied();
        }
        return message;
    }

    public Message<?> authorizeOutbound(Message<?> message) {
        if (SimpMessageHeaderAccessor.getMessageType(message.getHeaders()) != SimpMessageType.MESSAGE) return message;
        String sessionId = SimpMessageHeaderAccessor.getSessionId(message.getHeaders());
        if (sessionId == null) return null;
        Session session = sessions.get(sessionId);
        if (session == null) return null;
        String subscriptionId = SimpMessageHeaderAccessor.getSubscriptionId(message.getHeaders());
        String destination = subscriptionId == null ? null : session.subscriptions.get(subscriptionId);
        try {
            UserEntity user = accessService.authenticate(session.token);
            return accessService.canSubscribe(user, destination) ? message : null;
        } catch (RuntimeException exception) {
            return null;
        }
    }

    @EventListener
    public void disconnected(SessionDisconnectEvent event) {
        sessions.remove(event.getSessionId());
        connections.remove(event.getSessionId());
    }

    public void connected(WebSocketSession connection) {
        connections.put(connection.getId(), connection);
    }

    public void closed(String sessionId) {
        sessions.remove(sessionId);
        connections.remove(sessionId);
    }

    @Scheduled(fixedDelay = 15000)
    public void expireSessions() {
        sessions.forEach((sessionId, session) -> {
            try {
                accessService.authenticate(session.token);
            } catch (RuntimeException exception) {
                if (sessions.remove(sessionId, session)) {
                    WebSocketSession connection = connections.remove(sessionId);
                    if (connection != null) {
                        try {
                            connection.close(CloseStatus.POLICY_VIOLATION);
                        } catch (IOException ignored) {
                        }
                    }
                }
            }
        });
    }

    private AccessDeniedException denied() {
        return new AccessDeniedException("WebSocket access denied");
    }

    private static final class Session {
        private final String token;
        private final Map<String, String> subscriptions = new ConcurrentHashMap<>();
        private long lastSend;

        private Session(String token) {
            this.token = token;
        }
    }
}
