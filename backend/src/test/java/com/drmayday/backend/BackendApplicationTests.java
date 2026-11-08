package com.drmayday.backend;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import com.drmayday.backend.security.SecurityWebTestBase;
/** Smoke test boots the explicit isolated web context, not production JPA/Redis auto-configuration. */
class BackendApplicationTests extends SecurityWebTestBase {
    @Test void contextLoads() {
        assertNotNull(context.getBean(com.drmayday.backend.modules.auth.AuthController.class));
        assertEquals(0,context.getBeansOfType(javax.sql.DataSource.class).size());
        assertEquals(0,context.getBeansOfType(org.springframework.data.redis.connection.RedisConnectionFactory.class).size());
    }
}
