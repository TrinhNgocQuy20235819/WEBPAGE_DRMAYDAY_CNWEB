package com.drmayday.backend.security;
import java.io.IOException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import jakarta.servlet.http.*;
import com.drmayday.backend.common.ErrorCode;
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {
    @Override public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException ex) throws IOException {
        SecurityResponses.write(response, ErrorCode.UNAUTHENTICATED);
    }
}
