package com.drmayday.backend.security.service;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.*;
import java.util.Date;
import org.junit.jupiter.api.Test;
import com.drmayday.backend.security.FakeRevocationStore;
class TokenBlacklistServiceTest {
    @Test void blocksOnlyRevokedJtiUntilExpiration() {
        var store=new FakeRevocationStore(); store.now=Instant.ofEpochMilli(1000);
        var clock=Clock.fixed(store.now,ZoneOffset.UTC); var service=new TokenBlacklistService(store,clock);
        service.blacklistToken("a",new Date(2000)); assertTrue(service.isBlacklisted("a")); assertFalse(service.isBlacklisted("b"));
        store.now=Instant.ofEpochMilli(2000); assertFalse(service.isBlacklisted("a")); assertTrue(store.entries.isEmpty());
    }
    @Test void ignoresExpiredAndRejectsMissingInput() {
        var store=mock(RevocationStore.class); var service=new TokenBlacklistService(store,Clock.fixed(Instant.ofEpochMilli(1000),ZoneOffset.UTC));
        service.blacklistToken("expired",new Date(1000)); verifyNoInteractions(store);
        assertThrows(IllegalArgumentException.class,()->service.blacklistToken("x",null));
        assertThrows(IllegalArgumentException.class,()->service.blacklistToken(" ",new Date()));
        assertFalse(service.isBlacklisted(null));
    }
    @Test void duplicateRevocationCannotShortenExpiryAndCopiesDate() {
        var store=new FakeRevocationStore(); store.now=Instant.ofEpochMilli(1000);
        var service=new TokenBlacklistService(store,Clock.fixed(store.now,ZoneOffset.UTC));
        var expiry=new Date(3000); service.blacklistToken("a",expiry); expiry.setTime(0);
        service.blacklistToken("a",new Date(2000)); store.now=Instant.ofEpochMilli(2500); assertTrue(service.isBlacklisted("a"));
    }
    @Test void serviceRestartAndSecondInstanceUseSameStore() {
        var store=new FakeRevocationStore(); var a=new TokenBlacklistService(store); var b=new TokenBlacklistService(store);
        a.blacklistToken("session",Date.from(Instant.now().plusSeconds(60)));
        assertTrue(b.isBlacklisted("session")); assertTrue(new TokenBlacklistService(store).isBlacklisted("session"));
    }
}
