package com.makeup.platform.integration;

import com.makeup.platform.common.base.BaseEntity;
import jakarta.persistence.*;
import org.hibernate.cfg.Configuration;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.assertTrue;

@Tag("infrastructure")
@Testcontainers
class AuditTimestampPersistenceTest {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Entity(name = "AuditProbe")
    @Table(name = "audit_probe")
    @AttributeOverrides({
        @AttributeOverride(name = "createdAt", column = @Column(name = "created_at", columnDefinition = "timestamptz")),
        @AttributeOverride(name = "updatedAt", column = @Column(name = "updated_at", columnDefinition = "timestamptz"))
    })
    public static class AuditProbe extends BaseEntity {
        public String label;
    }

    @Test
    void databaseAuditInstantsSurviveJvmTimezoneChangeAfterHibernateBootstrap() {
        TimeZone original = TimeZone.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
            var config = new Configuration().addAnnotatedClass(AuditProbe.class)
                    .setProperty("hibernate.connection.url", postgres.getJdbcUrl())
                    .setProperty("hibernate.connection.username", postgres.getUsername())
                    .setProperty("hibernate.connection.password", postgres.getPassword())
                    .setProperty("hibernate.jdbc.time_zone", "Asia/Ho_Chi_Minh")
                    .setProperty("hibernate.hbm2ddl.auto", "create-drop");
            try (var factory = config.buildSessionFactory()) {
                // Reproduce the former @PostConstruct timezone switch.
                TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
                long before = Instant.now().getEpochSecond();
                Long id;
                try (var session = factory.openSession()) {
                    var tx = session.beginTransaction();
                    var row = new AuditProbe();
                    row.label = "created";
                    session.persist(row);
                    tx.commit();
                    id = row.getId();
                }
                try (var session = factory.openSession()) {
                    var tx = session.beginTransaction();
                    session.find(AuditProbe.class, id).label = "updated";
                    tx.commit();
                    Object[] epochs = session.createNativeQuery(
                            "select extract(epoch from created_at), extract(epoch from updated_at) from audit_probe where id = :id",
                            Object[].class).setParameter("id", id).getSingleResult();
                    long after = Instant.now().getEpochSecond() + 1;
                    for (Object epoch : epochs) {
                        long seconds = ((Number) epoch).longValue();
                        assertTrue(seconds >= before && seconds <= after,
                                "Stored instant must match real time, without a seven-hour shift");
                    }
                }
            }
        } finally {
            TimeZone.setDefault(original);
        }
    }
}
