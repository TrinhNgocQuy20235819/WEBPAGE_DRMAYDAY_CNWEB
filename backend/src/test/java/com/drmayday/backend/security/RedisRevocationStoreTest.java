package com.drmayday.backend.security;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.time.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.*;
import com.drmayday.backend.security.service.RedisRevocationStore;
class RedisRevocationStoreTest {
    @Test void writesJtiOnlyWithRemainingTtlAndNx() {
        var redis=mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked") ValueOperations<String,String> values=mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values); when(values.setIfAbsent(anyString(),anyString(),any(Duration.class))).thenReturn(true); var store=new RedisRevocationStore(redis);
        store.revoke("unique-jti",Instant.now().plusSeconds(60));
        var ttl=ArgumentCaptor.forClass(Duration.class);
        verify(values).setIfAbsent(eq("drmayday:revoked:unique-jti"),eq("1"),ttl.capture());
        assertTrue(ttl.getValue().toMillis()>58000); assertTrue(ttl.getValue().toMillis()<=60000);
    }
    @Test void expiredTokenNeverWritesAndErrorsPropagate() {
        var redis=mock(StringRedisTemplate.class); var store=new RedisRevocationStore(redis);
        store.revoke("expired",Instant.now().minusSeconds(1)); verifyNoInteractions(redis);
        when(redis.hasKey(anyString())).thenThrow(new IllegalStateException("offline"));
        assertThrows(IllegalStateException.class,()->store.contains("jti"));
    }
    @Test void indeterminateRedisResultFailsClosed() {
        var redis=mock(StringRedisTemplate.class); when(redis.hasKey(anyString())).thenReturn(null);
        assertThrows(IllegalStateException.class,()->new RedisRevocationStore(redis).contains("jti"));
    }
    @Test void twoAdapterInstancesUseTheSameRedisKey() {
        var redis=mock(StringRedisTemplate.class); when(redis.hasKey("drmayday:revoked:session")).thenReturn(true);
        assertTrue(new RedisRevocationStore(redis).contains("session")); assertTrue(new RedisRevocationStore(redis).contains("session"));
    }
}
