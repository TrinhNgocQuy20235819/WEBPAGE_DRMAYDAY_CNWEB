package com.drmayday.backend.security;
import java.io.IOException;
import com.drmayday.backend.common.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
public final class SecurityResponses {
    private static final ObjectMapper JSON = new ObjectMapper();
    private SecurityResponses() { }
    public static void write(HttpServletResponse response, ErrorCode code) throws IOException {
        response.setStatus(code.getStatusCode().value());
        response.setContentType("application/json"); response.setCharacterEncoding("UTF-8");
        response.getWriter().write(JSON.writeValueAsString(ApiResponse.error(code)));
    }
}
