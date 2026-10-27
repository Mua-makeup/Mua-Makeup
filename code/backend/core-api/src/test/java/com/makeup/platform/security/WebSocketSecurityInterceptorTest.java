package com.makeup.platform.security;

import com.makeup.platform.entity.auth.UserEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WebSocketSecurityInterceptorTest {
    @Mock WebSocketAccessService accessService;
    WebSocketSecurityInterceptor interceptor;
    UserEntity user;

    @BeforeEach
    void setup() {
        interceptor = new WebSocketSecurityInterceptor(accessService);
        user = new UserEntity();
        user.setId(1L);
    }

    private Message<byte[]> frame(StompCommand command, String destination, String token) {
        StompHeaderAccessor headers = StompHeaderAccessor.create(command);
        headers.setSessionId("session");
        headers.setSubscriptionId("subscription");
        if (destination != null) headers.setDestination(destination);
        if (token != null) headers.setNativeHeader("Authorization", token);
        headers.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], headers.getMessageHeaders());
    }

    private void connect() {
        when(accessService.authenticate("token")).thenReturn(user);
        interceptor.preSend(frame(StompCommand.CONNECT, null, "Bearer token"), null);
    }

    private Message<byte[]> outgoing() {
        SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
        headers.setSessionId("session");
        headers.setSubscriptionId("subscription");
        return MessageBuilder.createMessage(new byte[0], headers.getMessageHeaders());
    }

    @Test
    void anonymousConnectIsRejected() {
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(frame(StompCommand.CONNECT, null, null), null));
        verifyNoInteractions(accessService);
    }

    @Test
    void invalidTokenDoesNotCreateSession() {
        when(accessService.authenticate("bad")).thenThrow(new AccessDeniedException("invalid"));
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(frame(StompCommand.CONNECT, null, "Bearer bad"), null));
        assertNull(interceptor.authorizeOutbound(outgoing()));
    }

    @Test
    void validConnectSetsServerVerifiedPrincipal() {
        when(accessService.authenticate("token")).thenReturn(user);
        Message<byte[]> message = frame(StompCommand.CONNECT, null, "Bearer token");
        interceptor.preSend(message, null);
        assertEquals("1", SimpMessageHeaderAccessor.getUser(message.getHeaders()).getName());
    }

    @Test
    void subscribeBeforeConnectIsDenied() {
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/user/queue/offers", null), null));
    }

    @Test
    void crossUserSubscriptionIsDenied() {
        connect();
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/topic/user-notifications/2", null), null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/topic/booking-status/10", "/queue/offers", "/user/queue/offers", "/app/unknown"})
    void clientsCannotPublishServerMessages(String destination) {
        connect();
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(frame(StompCommand.SEND, destination, null), null));
    }

    @Test
    void telemetrySendRequiresMuaAndIsRateLimited() {
        connect();
        Message<byte[]> message = frame(StompCommand.SEND, "/app/telemetry/location", null);
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, null));
        when(accessService.canSendTelemetry(1L, null)).thenReturn(true);
        assertSame(message, interceptor.preSend(message, null));
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(message, null));
    }

    @Test
    void outboundRechecksSubscriptionAndToken() {
        connect();
        when(accessService.canSubscribe(user, "/user/queue/notifications")).thenReturn(true);
        interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/user/queue/notifications", null), null);
        Message<byte[]> message = outgoing();
        assertSame(message, interceptor.authorizeOutbound(message));
        when(accessService.authenticate("token")).thenThrow(new AccessDeniedException("expired or revoked"));
        assertNull(interceptor.authorizeOutbound(message));
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/user/queue/notifications", null), null));
    }

    @Test
    void outboundDropsMessagesAfterOwnershipChanges() {
        connect();
        when(accessService.canSubscribe(user, "/topic/gps-stream/10")).thenReturn(true);
        interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/topic/gps-stream/10", null), null);
        when(accessService.canSubscribe(user, "/topic/gps-stream/10")).thenReturn(false);
        assertNull(interceptor.authorizeOutbound(outgoing()));
    }

    @Test
    void unsubscribeAndDisconnectStopDelivery() {
        connect();
        when(accessService.canSubscribe(user, "/user/queue/offers")).thenReturn(true);
        interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/user/queue/offers", null), null);
        interceptor.preSend(frame(StompCommand.UNSUBSCRIBE, null, null), null);
        assertNull(interceptor.authorizeOutbound(outgoing()));
        interceptor.preSend(frame(StompCommand.DISCONNECT, null, null), null);
        assertNull(interceptor.authorizeOutbound(outgoing()));
    }
}
