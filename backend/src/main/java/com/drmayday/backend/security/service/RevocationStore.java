package com.drmayday.backend.security.service;
import java.time.Instant;
public interface RevocationStore {
    boolean contains(String jti);
    void revoke(String jti, Instant expiresAt);
}
