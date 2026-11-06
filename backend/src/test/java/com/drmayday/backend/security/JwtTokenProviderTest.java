package com.drmayday.backend.security;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.*;
import org.springframework.test.util.ReflectionTestUtils;
import com.drmayday.backend.security.jwt.JwtTokenProvider;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import java.nio.charset.StandardCharsets;
class JwtTokenProviderTest {
    static final String KEY="isolated-unit-test-only-signing-key-at-least-32-bytes";
    JwtTokenProvider provider;
    @BeforeEach void setup() { provider=new JwtTokenProvider(); ReflectionTestUtils.setField(provider,"jwtSecret",KEY); ReflectionTestUtils.setField(provider,"jwtExpirationMs",60000L); }
    @Test void stableSubjectAndUniqueJti() {
        String a=provider.generateToken(123L,"alice","ADMIN"), b=provider.generateToken(123L,"alice","ADMIN");
        assertEquals(123L,provider.getAccountIdFromToken(a)); assertNotEquals(provider.parseToken(a).getId(),provider.parseToken(b).getId());
        assertNotNull(provider.parseToken(a).getIssuedAt()); assertNotNull(provider.getExpirationDateFromToken(a));
        assertNull(provider.parseToken(a).get("role"));
    }
    @Test void validatesAndRejectsTamperingAndEmptyToken() {
        String token=provider.generateToken(1L,"x",null); assertTrue(provider.validateToken(token));
        assertFalse(provider.validateToken(token+"tampered")); assertFalse(provider.validateToken(""));
    }
    @Test void expiredTokenRejected() {
        ReflectionTestUtils.setField(provider,"jwtExpirationMs",-1000L); assertFalse(provider.validateToken(provider.generateToken(1L,"x",null)));
    }
    @Test void legacyUsernameSubjectAndMissingClaimsRejected() {
        var key=Keys.hmacShaKeyFor(KEY.getBytes(StandardCharsets.UTF_8));
        String legacy=Jwts.builder().subject("alice").id("jti").issuedAt(new Date()).expiration(new Date(System.currentTimeMillis()+60000)).signWith(key,Jwts.SIG.HS256).compact();
        assertFalse(provider.validateToken(legacy));
        String missing=Jwts.builder().subject("1").expiration(new Date(System.currentTimeMillis()+60000)).signWith(key,Jwts.SIG.HS256).compact();
        assertFalse(provider.validateToken(missing));
    }
    @Test void otherAlgorithmRejectedEvenWithCorrectKey() {
        var key=Keys.hmacShaKeyFor(KEY.getBytes(StandardCharsets.UTF_8));
        String other=Jwts.builder().subject("1").id("jti").issuedAt(new Date()).expiration(new Date(System.currentTimeMillis()+60000)).signWith(key,Jwts.SIG.HS384).compact();
        assertFalse(provider.validateToken(other));
    }
    @Test void missingOrShortSecretFailsStartupValidation() throws Exception {
        var props = org.springframework.core.io.support.PropertiesLoaderUtils.loadProperties(
                new org.springframework.core.io.ClassPathResource("application.properties"));
        assertEquals("${JWT_SECRET:}", props.getProperty("jwt.secret"));
        JwtTokenProvider blankSecretProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(blankSecretProvider, "jwtSecret", "");
        ReflectionTestUtils.setField(blankSecretProvider, "jwtExpirationMs", 60000L);
        assertThrows(RuntimeException.class, blankSecretProvider::validateConfiguration);

        JwtTokenProvider shortSecretProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(shortSecretProvider, "jwtSecret", "too-short-secret");
        ReflectionTestUtils.setField(shortSecretProvider, "jwtExpirationMs", 60000L);
        assertThrows(RuntimeException.class, shortSecretProvider::validateConfiguration);
    }
}
