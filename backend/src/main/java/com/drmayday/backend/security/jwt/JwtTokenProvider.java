package com.drmayday.backend.security.jwt;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtTokenProvider {
    @Value("${jwt.secret}") private String jwtSecret;
    @Value("${jwt.expiration}") private long jwtExpirationMs;
    @jakarta.annotation.PostConstruct
    public void validateConfiguration() {
        getSigningKey();
        if (jwtExpirationMs < 1000) throw new IllegalArgumentException("JWT expiration must be at least one second");
    }
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }
    public String generateToken(Long accountId, String username, String role) {
        if (accountId == null || accountId <= 0) throw new IllegalArgumentException("Invalid account ID");
        Date now = new Date();
        return Jwts.builder().subject(accountId.toString()).id(UUID.randomUUID().toString())
                .claim("username", username).issuedAt(now)
                .expiration(new Date(now.getTime() + jwtExpirationMs))
                .signWith(getSigningKey(), Jwts.SIG.HS256).compact();
    }
    public Claims parseToken(String token) {
        Claims claims = Jwts.parser().verifyWith(getSigningKey())
                .sig().clear().add(Jwts.SIG.HS256).and().build().parseSignedClaims(token).getPayload();
        try {
            if (claims.getSubject() == null || !claims.getSubject().matches("[1-9][0-9]*")
                    || Long.parseLong(claims.getSubject()) <= 0
                    || claims.getId() == null || claims.getId().isBlank()
                    || claims.getExpiration() == null || claims.getIssuedAt() == null
                    || claims.getIssuedAt().after(new Date())
                    || !claims.getExpiration().after(claims.getIssuedAt())) {
                throw new IllegalArgumentException();
            }
        } catch (IllegalArgumentException ex) {
            throw new MalformedJwtException("Invalid token claims");
        }
        return claims;
    }
    public Long getAccountIdFromToken(String token) { return Long.valueOf(parseToken(token).getSubject()); }
    public String getUsernameFromToken(String token) { return parseToken(token).get("username", String.class); }
    public Date getExpirationDateFromToken(String token) { return parseToken(token).getExpiration(); }
    public boolean validateToken(String token) {
        try { parseToken(token); return true; } catch (JwtException | IllegalArgumentException ex) { return false; }
    }
}
