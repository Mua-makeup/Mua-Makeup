package com.makeup.platform.integration;

import com.makeup.platform.repository.booking.BookingHistoryRepository;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.DriverManager;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

@Tag("infrastructure")
@Testcontainers
class BookingExecutionTimeQueryTest {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Test
    void historyInstantsAreIndependentOfSessionTimezoneAndLaterPaymentOrDisputeEvents() throws Exception {
        String sql = BookingHistoryRepository.class.getMethod("findExecutionTimes", Long.class)
                .getAnnotation(Query.class).value().replace(":bookingId", "?");
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA booking_schema");
            statement.execute("CREATE TABLE booking_schema.booking_history (booking_id BIGINT, to_status TEXT, created_at TIMESTAMPTZ)");
            statement.execute("""
                    INSERT INTO booking_schema.booking_history VALUES
                    (1, 'IN_PROGRESS', '2026-10-26T20:21:00+07:00'),
                    (1, 'COMPLETED', '2026-10-26T20:22:00+07:00'),
                    (1, 'PAID_OUT', '2026-10-26T20:30:00+07:00'),
                    (1, 'DISPUTED', '2026-10-27T10:00:00+07:00'),
                    (2, 'REQUESTED', '2026-10-26T10:00:00+07:00')
                    """);
            for (String zone : new String[]{"UTC", "Asia/Ho_Chi_Minh", "America/New_York"}) {
                statement.execute("SET TIME ZONE '" + zone + "'");
                try (var query = connection.prepareStatement(sql)) {
                    query.setLong(1, 1L);
                    try (var result = query.executeQuery()) {
                        assertTrue(result.next());
                        assertEquals(Instant.parse("2026-10-26T13:21:00Z").toEpochMilli(), result.getLong("startedAtMillis"));
                        assertEquals(Instant.parse("2026-10-26T13:22:00Z").toEpochMilli(), result.getLong("completedAtMillis"));
                    }
                    for (long bookingId : new long[]{2L, 3L}) {
                        query.setLong(1, bookingId);
                        try (var result = query.executeQuery()) {
                            assertTrue(result.next());
                            assertNull(result.getObject("startedAtMillis"));
                            assertNull(result.getObject("completedAtMillis"));
                        }
                    }
                }
            }
        }
    }
}
