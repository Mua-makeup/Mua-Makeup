package com.makeup.platform.integration;

import com.makeup.platform.entity.auth.UserEntity;
import com.makeup.platform.entity.wallet.WalletEntity;
import com.makeup.platform.repository.UserRepository;
import com.makeup.platform.repository.wallet.WalletRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.utility.DockerImageName;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

@Tag("infrastructure") @Testcontainers
@DataJpaTest(properties={"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create",
    "spring.jpa.properties.hibernate.hbm2ddl.create_namespaces=true", "spring.jpa.show-sql=false"})
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes=PostgresRepositoryTest.JpaConfig.class)
@ActiveProfiles("test")
class PostgresRepositoryTest {
    @Configuration
    @EntityScan("com.makeup.platform.entity")
    @EnableJpaRepositories("com.makeup.platform.repository")
    static class JpaConfig {}
    @Container static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
        DockerImageName.parse("postgis/postgis:16-3.4-alpine").asCompatibleSubstituteFor("postgres"));
    @DynamicPropertySource static void properties(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", postgres::getJdbcUrl);
        properties.add("spring.datasource.username", postgres::getUsername);
        properties.add("spring.datasource.password", postgres::getPassword);
    }
    @Autowired UserRepository users;
    @Autowired WalletRepository wallets;
    @Autowired EntityManager em;

    @Test void userAndWalletPersistWithDecimalPrecisionAndLockingQuery() {
        var user = users.saveAndFlush(UserEntity.builder().phoneNumber("0900000001")
            .passwordHash("test-only-hash").fullName("Integration User").build());
        var wallet = wallets.saveAndFlush(WalletEntity.builder().user(user)
            .availableBalance(new BigDecimal("123456.78")).build());
        em.clear();
        var loaded = wallets.findByUserIdWithLock(user.getId()).orElseThrow();
        assertEquals(0, new BigDecimal("123456.78").compareTo(loaded.getAvailableBalance()));
        assertEquals(wallet.getId(), loaded.getId());
        assertTrue(wallets.existsByUserId(user.getId()));
    }
    @Test void duplicatePhoneNumberIsRejectedByDatabase() {
        users.saveAndFlush(UserEntity.builder().phoneNumber("0900000002").passwordHash("hash").fullName("One").build());
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
            () -> users.saveAndFlush(UserEntity.builder().phoneNumber("0900000002").passwordHash("hash").fullName("Two").build()));
    }
    @Test void oneWalletPerUserIsEnforcedByDatabase() {
        var user = users.saveAndFlush(UserEntity.builder().phoneNumber("0900000003").passwordHash("hash").fullName("User").build());
        wallets.saveAndFlush(WalletEntity.builder().user(user).build());
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
            () -> wallets.saveAndFlush(WalletEntity.builder().user(user).build()));
    }
}
