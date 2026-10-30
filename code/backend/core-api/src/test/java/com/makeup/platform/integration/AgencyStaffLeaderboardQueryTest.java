package com.makeup.platform.integration;

import com.makeup.platform.repository.AgencyStaffRepository;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.sql.DriverManager;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;

@Tag("infrastructure")
@Testcontainers(disabledWithoutDocker = true)
class AgencyStaffLeaderboardQueryTest {
    @Container static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
    @Test void creditsAssistantsOnceAndKeepsStudioAverageUnduplicated() throws Exception {
        String sql = AgencyStaffRepository.class.getMethod("findStaffLeaderboard", Long.class, LocalDateTime.class, LocalDateTime.class)
                .getAnnotation(Query.class).value().replace(":agencyId", "1").replace(":startDate", "NULL").replace(":endDate", "NULL");
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var s = connection.createStatement()) {
            for (String schema : new String[]{"interaction_schema", "booking_schema", "agency_schema", "mua_schema", "auth_schema"}) s.execute("CREATE SCHEMA " + schema);
            s.execute("CREATE TABLE interaction_schema.reviews (id BIGINT, booking_id BIGINT, agency_id BIGINT, mua_id BIGINT, rating INT, status TEXT, is_deleted BOOLEAN, created_at TIMESTAMP)");
            s.execute("CREATE TABLE booking_schema.bookings (id BIGINT, agency_id BIGINT, status TEXT, booking_date DATE)");
            s.execute("CREATE TABLE booking_schema.booking_staff_assignments (booking_id BIGINT, staff_id BIGINT, status TEXT, assignment_role TEXT)");
            s.execute("CREATE TABLE agency_schema.agency_staff (id BIGINT, mua_id BIGINT, agency_id BIGINT, is_active BOOLEAN, status TEXT, joined_at TIMESTAMP)");
            s.execute("CREATE TABLE mua_schema.mua_profiles (id BIGINT, user_id BIGINT, mua_code TEXT)");
            s.execute("CREATE TABLE auth_schema.users (id BIGINT, full_name TEXT, phone_number TEXT, avatar_url TEXT)");
            s.execute("INSERT INTO agency_schema.agency_staff VALUES (1,1,1,true,'ACTIVE',now()),(2,2,1,true,'ACTIVE',now()),(3,3,1,true,'ACTIVE',now())");
            s.execute("INSERT INTO mua_schema.mua_profiles VALUES (1,1,'A'),(2,2,'B'),(3,3,'C')");
            s.execute("INSERT INTO auth_schema.users VALUES (1,'Main',null,null),(2,'Assistant',null,null),(3,'Cancelled',null,null)");
            s.execute("INSERT INTO booking_schema.bookings VALUES (1,1,'COMPLETED','2026-10-01'),(2,1,'PAID_OUT','2026-10-02'),(3,1,'COMPLETED','2026-10-03')");
            s.execute("INSERT INTO booking_schema.booking_staff_assignments VALUES (1,1,'ACTIVE','PRIMARY_MUA'),(1,2,'ACTIVE','ASSISTANT_MUA'),(1,2,'ACTIVE','ASSISTANT_MUA'),(1,3,'CANCELLED','ASSISTANT_MUA')");
            s.execute("INSERT INTO interaction_schema.reviews VALUES (1,1,1,1,5,'APPROVED',false,'2026-10-01'),(2,2,1,1,3,'APPROVED',false,'2026-10-02'),(3,3,1,1,1,'APPROVED',true,'2026-10-03')");
            try (var r = s.executeQuery(sql)) {
                assertTrue(r.next()); assertEquals(2, r.getInt("totalReviews")); assertEquals(4, r.getDouble("ratingAvg")); assertEquals(4, r.getDouble("agencyRating"));
                assertTrue(r.next()); assertEquals(1, r.getInt("totalReviews")); assertEquals(5, r.getDouble("ratingAvg")); assertEquals(1, r.getInt("assistantJobs")); assertEquals(4, r.getDouble("agencyRating"));
                assertTrue(r.next()); assertEquals(0, r.getInt("totalReviews")); assertNull(r.getObject("ratingAvg")); assertEquals(0, r.getInt("totalCompletedJobs"));
                assertFalse(r.next());
            }
            String periodSql = sql.replace("CAST(NULL AS TIMESTAMP)", "CAST('2026-11-01' AS TIMESTAMP)");
            try (var r = s.executeQuery(periodSql)) {
                while (r.next()) { assertEquals(0, r.getInt("totalReviews")); assertEquals(0, r.getInt("totalCompletedJobs")); assertNull(r.getObject("agencyRating")); }
            }
        }
    }
}
