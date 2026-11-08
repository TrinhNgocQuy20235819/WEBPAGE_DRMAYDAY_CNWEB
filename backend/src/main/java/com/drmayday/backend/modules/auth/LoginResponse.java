package com.drmayday.backend.modules.auth;
import java.util.List;
public record LoginResponse(String accessToken, String tokenType, long expiresIn,
                            UserInfo user) {
    public record UserInfo(Long accountId, String username, String role, List<String> permissions) { }
}
