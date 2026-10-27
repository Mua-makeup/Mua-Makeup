package com.makeup.platform.integration;

import com.makeup.platform.service.auth.impl.RedisTokenServiceImpl;
import com.makeup.platform.service.interaction.impl.NotificationDeduplicationServiceImpl;
import org.junit.jupiter.api.*;
import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.*;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@Tag("infrastructure") @Testcontainers
class RedisInfrastructureTest {
    @Container static final GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);
    static LettuceConnectionFactory connection;
    static StringRedisTemplate strings;
    static RedisTokenServiceImpl tokens;
    static RedissonClient redisson;
    @BeforeAll static void connect() {
        connection = new LettuceConnectionFactory(redis.getHost(), redis.getMappedPort(6379));
        connection.afterPropertiesSet(); connection.start();
        strings = new StringRedisTemplate(connection);
        var template = new RedisTemplate<String, Object>(); template.setConnectionFactory(connection); template.afterPropertiesSet();
        tokens = new RedisTokenServiceImpl(template);
        var config = new Config(); config.useSingleServer().setAddress("redis://" + redis.getHost() + ":" + redis.getMappedPort(6379));
        redisson = Redisson.create(config);
    }
    @AfterAll static void close() {
        if (redisson != null) redisson.shutdown();
        if (connection != null) connection.destroy();
    }
    @Test void refreshTokenRoundTripAndRevocation() {
        tokens.saveRefreshToken("test-refresh", 72L, 1);
        assertEquals(72L, tokens.getUserIdByRefreshToken("test-refresh"));
        tokens.deleteRefreshToken("test-refresh");
        assertNull(tokens.getUserIdByRefreshToken("test-refresh"));
    }
    @Test void accessTokenBlacklistExpires() throws Exception {
        tokens.blacklistAccessToken("short-token", 100);
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (tokens.isTokenBlacklisted("short-token") && System.nanoTime() < deadline) Thread.sleep(20);
        assertFalse(tokens.isTokenBlacklisted("short-token"));
    }
    @Test void concurrentDeliveryOfSameEventIsAcceptedExactlyOnce() throws Exception {
        var service = new NotificationDeduplicationServiceImpl(strings);
        var pool = Executors.newFixedThreadPool(8);
        try {
            var jobs = new java.util.ArrayList<Callable<Boolean>>();
            for (int i = 0; i < 20; i++) jobs.add(() -> service.tryAcquire("same-event"));
            int winners = 0;
            for (var result : pool.invokeAll(jobs)) if (result.get()) winners++;
            assertEquals(1, winners);
        } finally { pool.shutdownNow(); }
    }
    @Test void bookingLockExcludesAnotherThreadAndCanBeReacquiredAfterRelease() throws Exception {
        var lock = redisson.getLock("test:booking:1");
        var pool = Executors.newSingleThreadExecutor();
        try {
            assertTrue(lock.tryLock(0, 10, TimeUnit.SECONDS));
            assertFalse(pool.submit(() -> redisson.getLock("test:booking:1").tryLock(0, 1, TimeUnit.SECONDS)).get(5, TimeUnit.SECONDS));
            lock.unlock();
            assertTrue(pool.submit(() -> {
                var other = redisson.getLock("test:booking:1");
                boolean acquired = other.tryLock(0, 2, TimeUnit.SECONDS);
                if (acquired) other.unlock();
                return acquired;
            }).get(5, TimeUnit.SECONDS));
        } finally { if (lock.isHeldByCurrentThread()) lock.unlock(); pool.shutdownNow(); }
    }
}
