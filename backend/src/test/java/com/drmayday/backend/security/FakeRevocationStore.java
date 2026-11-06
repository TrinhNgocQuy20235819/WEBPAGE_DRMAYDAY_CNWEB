package com.drmayday.backend.security;
import java.time.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;
import com.drmayday.backend.security.service.RevocationStore;
/** Isolated test double: never instantiated by application component scanning. */
public class FakeRevocationStore implements RevocationStore {
    public final Map<String, Instant> entries = new ConcurrentHashMap<>();
    public Instant now = Instant.now();
    public boolean unavailable;
    @Override public boolean contains(String id) {
        if (unavailable) throw new IllegalStateException("fake store offline");
        entries.entrySet().removeIf(e -> !e.getValue().isAfter(now));
        return entries.containsKey(id);
    }
    @Override public void revoke(String id, Instant expiry) {
        if (unavailable) throw new IllegalStateException("fake store offline");
        entries.merge(id, expiry, (a,b) -> a.isAfter(b) ? a : b);
    }
}
