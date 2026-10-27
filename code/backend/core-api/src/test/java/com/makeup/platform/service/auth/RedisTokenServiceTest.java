package com.makeup.platform.service.auth;

import com.makeup.platform.common.constants.SecurityConstants;
import com.makeup.platform.service.auth.impl.RedisTokenServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RedisTokenServiceTest {
    @Mock RedisTemplate<String, Object> redis;
    @Mock ValueOperations<String, Object> values;
    @InjectMocks RedisTokenServiceImpl service;

    @Test void refreshTokenHasUserIdentityAndExpiry() {
        when(redis.opsForValue()).thenReturn(values);
        service.saveRefreshToken("refresh", 42L, 7);
        verify(values).set(SecurityConstants.REDIS_PREFIX_REFRESH_TOKEN + "refresh", "42", 7, TimeUnit.DAYS);
    }
    @Test void readsUserIdentity() {
        when(redis.opsForValue()).thenReturn(values);
        when(values.get(SecurityConstants.REDIS_PREFIX_REFRESH_TOKEN + "refresh")).thenReturn("42");
        assertEquals(42L, service.getUserIdByRefreshToken("refresh"));
    }
    @ParameterizedTest @ValueSource(strings={"broken", "", "1.5"})
    void corruptIdentityIsRejected(String value) {
        when(redis.opsForValue()).thenReturn(values);
        when(values.get(anyString())).thenReturn(value);
        assertNull(service.getUserIdByRefreshToken("refresh"));
    }
    @Test void expiredRefreshTokenHasNoIdentity() {
        when(redis.opsForValue()).thenReturn(values);
        assertNull(service.getUserIdByRefreshToken("expired"));
    }
    @Test void logoutDeletesOnlyTheSpecifiedRefreshToken() {
        service.deleteRefreshToken("refresh");
        verify(redis).delete(SecurityConstants.REDIS_PREFIX_REFRESH_TOKEN + "refresh");
    }
    @ParameterizedTest @ValueSource(longs={0, -1, -1000})
    void expiredAccessTokenDoesNotWriteToRedis(long remaining) {
        service.blacklistAccessToken("token", remaining);
        verifyNoInteractions(redis);
    }
    @Test void revocationLivesOnlyUntilAccessTokenExpiry() {
        when(redis.opsForValue()).thenReturn(values);
        service.blacklistAccessToken("token", 1500);
        verify(values).set(SecurityConstants.REDIS_PREFIX_BLACKLIST + "token", "revoked", 1500, TimeUnit.MILLISECONDS);
    }
    @Test void blacklistHandlesMissingAndPresentKeys() {
        when(redis.hasKey(SecurityConstants.REDIS_PREFIX_BLACKLIST + "token")).thenReturn(null, false, true);
        assertFalse(service.isTokenBlacklisted("token"));
        assertFalse(service.isTokenBlacklisted("token"));
        assertTrue(service.isTokenBlacklisted("token"));
    }
}
