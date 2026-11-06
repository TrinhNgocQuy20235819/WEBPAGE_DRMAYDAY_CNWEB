package com.drmayday.backend.security.service;
import java.time.*;
import java.util.Date;
import org.springframework.stereotype.Service;
@Service
public class TokenBlacklistService {
    private final RevocationStore store;
    private final Clock clock;
    @org.springframework.beans.factory.annotation.Autowired
    public TokenBlacklistService(RevocationStore store) { this(store, Clock.systemUTC()); }
    TokenBlacklistService(RevocationStore store, Clock clock) { this.store = store; this.clock = clock; }
    public void blacklistToken(String jti, Date expiration) {
        if (jti == null || jti.isBlank() || expiration == null) throw new IllegalArgumentException("Token ID and expiry required");
        if (expiration.toInstant().isAfter(clock.instant())) {
            try { store.revoke(jti, expiration.toInstant()); }
            catch (RuntimeException ex) { throw new com.drmayday.backend.common.AppException(com.drmayday.backend.common.ErrorCode.SECURITY_UNAVAILABLE); }
        }
    }
    public boolean isBlacklisted(String jti) { if (jti == null) return false;
        try { return store.contains(jti); }
        catch (RuntimeException ex) { throw new com.drmayday.backend.common.AppException(com.drmayday.backend.common.ErrorCode.SECURITY_UNAVAILABLE); } }
}
