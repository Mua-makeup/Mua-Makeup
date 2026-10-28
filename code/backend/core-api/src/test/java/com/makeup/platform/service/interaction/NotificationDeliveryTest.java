package com.makeup.platform.service.interaction;

import com.makeup.platform.entity.interaction.NotificationEntity;
import com.makeup.platform.service.interaction.impl.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.springframework.data.redis.core.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.time.Duration;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Map;

class NotificationDeliveryTest {
    @Test void duplicateNotificationIsRejectedWithBoundedRetention() {
        var redis = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked") ValueOperations<String,String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        when(values.setIfAbsent("notif:event:dedup:event-1", "PROCESSED", Duration.ofHours(24))).thenReturn(true, false);
        var service = new NotificationDeduplicationServiceImpl(redis);
        assertTrue(service.tryAcquire(" event-1 ")); assertFalse(service.tryAcquire("event-1"));
    }
    @ParameterizedTest @NullAndEmptySource void absentEventIdDoesNotTouchRedis(String id) {
        var redis = mock(StringRedisTemplate.class);
        assertTrue(new NotificationDeduplicationServiceImpl(redis).tryAcquire(id)); verifyNoInteractions(redis);
    }
    @Test void deduplicationFailureDoesNotLoseNotification() {
        var redis = mock(StringRedisTemplate.class); when(redis.opsForValue()).thenThrow(new IllegalStateException("offline"));
        assertTrue(new NotificationDeduplicationServiceImpl(redis).tryAcquire("event"));
    }
    @Test void websocketPayloadIsRoutedOnlyToRequestedUser() {
        var messaging = mock(SimpMessagingTemplate.class);
        var notification = NotificationEntity.builder().title("Test").content("Message").build(); notification.setId(3L);
        new UserWebSocketNotificationServiceImpl(messaging).sendNotificationToUser(7L, notification, 2);
        verify(messaging).convertAndSendToUser(eq("7"), eq("/queue/notifications"), argThat((Object p) ->
            p instanceof Map<?,?> map && map.get("notificationId").equals(3L) && map.get("unreadCount").equals(2L)));
        verify(messaging).convertAndSend(eq("/topic/user-notifications/7"), any(Object.class));
    }
    @Test void missingRecipientDoesNotBroadcast() {
        var messaging = mock(SimpMessagingTemplate.class);
        new UserWebSocketNotificationServiceImpl(messaging).sendNotificationToUser(null, new NotificationEntity(), 0);
        verifyNoInteractions(messaging);
    }
}
