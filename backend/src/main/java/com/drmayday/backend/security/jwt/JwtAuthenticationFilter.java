package com.drmayday.backend.security.jwt;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.drmayday.backend.security.service.*;
import com.drmayday.backend.security.SecurityResponses;
import com.drmayday.backend.common.ErrorCode;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenProvider provider;
    private final CustomUserDetailsService users;
    private final TokenBlacklistService blacklist;
    public JwtAuthenticationFilter(JwtTokenProvider provider, CustomUserDetailsService users, TokenBlacklistService blacklist) {
        this.provider = provider; this.users = users; this.blacklist = blacklist;
    }
    public String getJwtFromRequest(HttpServletRequest request) {
        String value = request.getHeader("Authorization");
        return value != null && value.startsWith("Bearer ") ? value.substring(7) : null;
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = getJwtFromRequest(request);
        if (token != null) {
            try {
                var claims = provider.parseToken(token);
                if (!blacklist.isBlacklisted(claims.getId())) {
                    var user = users.loadUserById(Long.valueOf(claims.getSubject()));
                    if (user.isEnabled() && user.isAccountNonLocked() && user.isAccountNonExpired() && user.isCredentialsNonExpired()) {
                        SecurityContextHolder.getContext().setAuthentication(
                                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
                    }
                }
            } catch (JwtException | AuthenticationException | IllegalArgumentException ex) {
                SecurityContextHolder.clearContext();
            } catch (RuntimeException ex) {
                // DB/Redis failures never turn into a successful authenticated request.
                SecurityContextHolder.clearContext();
                SecurityResponses.write(response, ErrorCode.SECURITY_UNAVAILABLE);
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
