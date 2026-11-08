package com.drmayday.backend.security.config;

import java.util.Arrays;
import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;

/** Validates before bean creation, so a misconfigured local profile cannot open a remote datasource. */
public final class LocalSecurityTestEnvironmentGuard implements EnvironmentPostProcessor, Ordered {
    @Override public int getOrder() { return ConfigDataEnvironmentPostProcessor.ORDER + 1; }
    @Override public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication application) {
        if (!Arrays.asList(env.getActiveProfiles()).contains("security-test")) return;
        require(env, "spring.datasource.url", "jdbc:postgresql://127.0.0.1:15432/mayday_security_test");
        require(env, "spring.datasource.username", "mayday_test");
        require(env, "spring.data.redis.host", "127.0.0.1");
        require(env, "spring.data.redis.port", "16379");
        require(env, "spring.data.redis.database", "0");
        require(env, "spring.data.redis.ssl.enabled", "false");
        for (String key : new String[]{"spring.data.redis.url", "spring.data.redis.username", "spring.data.redis.password",
                "spring.data.redis.sentinel.master", "spring.data.redis.sentinel.nodes", "spring.data.redis.cluster.nodes",
                "spring.datasource.jndi-name", "spring.config.import"}) {
            require(env, key, "");
        }
        require(env, "spring.jpa.hibernate.ddl-auto", "none");
        require(env, "spring.jpa.generate-ddl", "false");
        require(env, "spring.jpa.properties.jakarta.persistence.schema-generation.database.action", "none");
        require(env, "spring.sql.init.mode", "never");
        require(env, "spring.flyway.enabled", "false");
        require(env, "spring.liquibase.enabled", "false");
        require(env, "server.address", "127.0.0.1");
        if (env.getProperty("spring.datasource.password", "").isBlank()
                || env.getProperty("jwt.secret", "").length() < 32) {
            throw new IllegalStateException("Local security-test credentials must be supplied by the local launcher");
        }
    }
    private static void require(ConfigurableEnvironment env, String key, String expected) {
        if (!expected.equals(env.getProperty(key, ""))) {
            // Do not echo the rejected property value: it can contain a URL credential or secret.
            throw new IllegalStateException("Unsafe security-test configuration rejected before connections: " + key);
        }
    }
}
