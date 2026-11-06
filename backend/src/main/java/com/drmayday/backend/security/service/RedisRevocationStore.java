package com.drmayday.backend.security.service;
import java.time.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
@Component
public class RedisRevocationStore implements RevocationStore {
    private static final String PREFIX = "drmayday:revoked:";
    private final StringRedisTemplate redis;
    public RedisRevocationStore(StringRedisTemplate redis) { this.redis = redis; }
    @Override public boolean contains(String jti) {
        Boolean exists = redis.hasKey(PREFIX + jti);
        if (exists == null) throw new IllegalStateException("Unknown revocation status");
        return exists;
    }
    @Override public void revoke(String jti, Instant expiresAt) {
        Duration ttl = Duration.between(Instant.now(), expiresAt);
        if (!ttl.isNegative() && !ttl.isZero()) {
            // NX makes repeated logout safe without shortening an existing revocation.
            Boolean written = redis.opsForValue().setIfAbsent(PREFIX + jti, "1", ttl);
            if (written == null) throw new IllegalStateException("Unknown revocation write result");
        }
    }
}
