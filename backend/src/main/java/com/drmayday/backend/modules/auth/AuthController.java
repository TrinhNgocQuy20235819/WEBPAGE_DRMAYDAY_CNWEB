package com.drmayday.backend.modules.auth;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import com.drmayday.backend.common.ApiResponse;
import com.drmayday.backend.security.jwt.JwtTokenProvider;
import com.drmayday.backend.security.service.TokenBlacklistService;
import io.jsonwebtoken.ExpiredJwtException;
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final JwtTokenProvider jwt;
    private final TokenBlacklistService blacklist;
    private final LoginService login;
    public AuthController(JwtTokenProvider jwt, TokenBlacklistService blacklist, LoginService login) {
        this.jwt = jwt; this.blacklist = blacklist; this.login = login;
    }
    @PostMapping("/login") public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(login.login(request));
    }
    @PostMapping("/logout") public ApiResponse<Void> logout(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        try {
            var claims = jwt.parseToken(authorization.substring(7));
            blacklist.blacklistToken(claims.getId(), claims.getExpiration());
        } catch (ExpiredJwtException ignored) { /* Expired between filter and controller: already unusable. */ }
        return ApiResponse.success("Đăng xuất thành công", null);
    }
}
