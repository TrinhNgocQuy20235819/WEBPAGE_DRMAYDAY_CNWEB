package com.drmayday.backend.security;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.file.*;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import com.drmayday.backend.security.config.LocalSecurityTestEnvironmentGuard;

class LocalSecurityTestEnvironmentGuardTest {
    private MockEnvironment safe() throws Exception {
        var properties = new Properties();
        try (var stream = Files.newInputStream(Path.of("src/main/resources/application-security-test.properties"))) { properties.load(stream); }
        var env = new MockEnvironment();
        properties.forEach((key,value) -> env.setProperty(key.toString(),value.toString()));
        env.setActiveProfiles("security-test");
        env.setProperty("spring.datasource.password", "isolated-test-placeholder");
        env.setProperty("jwt.secret", "isolated-test-placeholder-more-than-32-characters");
        return env;
    }
    @Test void approvedLocalConfigurationPassesWithoutOpeningConnections() throws Exception {
        assertDoesNotThrow(() -> new LocalSecurityTestEnvironmentGuard().postProcessEnvironment(safe(), null));
    }
    @Test void unapprovedDatabaseTargetRejectedBeforeBeanCreation() throws Exception {
        for (String url : new String[]{"jdbc:postgresql://localhost:5432/other", "jdbc:postgresql://127.0.0.1:15432/other", "jdbc:postgresql://example.invalid:5432/mayday", "jdbc:postgresql://127.0.0.1:15432/mayday_security_test?socketFactory=other"}) {
            var env=safe(); env.setProperty("spring.datasource.url",url);
            var error=assertThrows(IllegalStateException.class,()->new LocalSecurityTestEnvironmentGuard().postProcessEnvironment(env,null));
            assertFalse(error.getMessage().contains(url));
        }
    }
    @Test void redisUrlAndAlternateHostOrDatabaseCannotOverrideLocalEndpoint() throws Exception {
        for (String[] property : new String[][]{{"spring.data.redis.url","redis://example.invalid"},{"spring.data.redis.host","example.invalid"},{"spring.data.redis.database","1"},{"spring.data.redis.ssl.enabled","true"},{"spring.data.redis.sentinel.nodes","example.invalid:26379"}}) {
            var env=safe();env.setProperty(property[0],property[1]);
            assertThrows(IllegalStateException.class,()->new LocalSecurityTestEnvironmentGuard().postProcessEnvironment(env,null));
        }
    }
    @Test void schemaWritersAndImportsAreRejected() throws Exception {
        for (String[] property : new String[][]{{"spring.jpa.hibernate.ddl-auto","update"},{"spring.flyway.enabled","true"},{"spring.liquibase.enabled","true"},{"spring.sql.init.mode","always"},{"spring.config.import","optional:file:other.properties"}}) {
            var env=safe();env.setProperty(property[0],property[1]);
            assertThrows(IllegalStateException.class,()->new LocalSecurityTestEnvironmentGuard().postProcessEnvironment(env,null));
        }
    }
    @Test void otherProfilesAreNotChanged() {
        var env=new MockEnvironment().withProperty("spring.datasource.url","not-loaded-or-connected");
        new LocalSecurityTestEnvironmentGuard().postProcessEnvironment(env,null);
        assertEquals("not-loaded-or-connected",env.getProperty("spring.datasource.url"));
    }
}
