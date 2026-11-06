package com.drmayday.backend.security;
import java.io.IOException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import jakarta.servlet.http.*;
import com.drmayday.backend.common.ErrorCode;
@Component
public class JwtAccessDeniedHandler implements AccessDeniedHandler {
    @Override public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException ex) throws IOException {
        SecurityResponses.write(response, ErrorCode.ACCESS_DENIED);
    }
}
